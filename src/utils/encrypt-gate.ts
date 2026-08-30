/**
 * EncryptGate 客户端解密工具
 *
 * 与 EncryptGate.astro（构建时加密）配套：
 * - PBKDF2(SHA-256) 从密码派生 AES-256-GCM 密钥 → 解密 payload 得到敏感 HTML
 * - 解锁记忆：rememberDays > 0 时把派生密钥（raw bytes）存 localStorage，
 *   会话内另有内存缓存（Swup 导航不销毁 JS 上下文，跨页零成本复用）
 * - 输错计数与冷却：连续 maxAttempts 次失败后冷却 cooldownSeconds 秒
 */
import { securityConfig } from "@/config";

export interface GatePayload {
	v: number;
	salt: string;
	iv: string;
	ct: string;
	iterations: number;
}

interface StoredGateKey {
	k: string;
	salt: string;
	iterations: number;
	exp: number;
}

interface GateFailureState {
	attempts: number;
	cooldownUntil: number;
}

const GATE_KEY_STORAGE = "firefly-gate-key";
const GATE_FAILURE_STORAGE = "firefly-gate-failure";

/** 会话内密钥缓存：Swup 是 SPA 导航，模块级变量全程有效 */
const keyMemoryCache = new Map<string, CryptoKey>();

function toB64(bytes: Uint8Array): string {
	let binary = "";
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary);
}

function fromB64(b64: string): Uint8Array {
	const binary = atob(b64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

/** 缓存键只含 salt+iterations：统一密码模式下跨 gate 共享同一密钥 */
function cacheKeyFor(payload: GatePayload): string {
	return `${payload.salt}:${payload.iterations}`;
}

async function importRawKey(raw: Uint8Array): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		"raw",
		raw as BufferSource,
		{ name: "AES-GCM" },
		true,
		["encrypt", "decrypt"],
	);
}

async function deriveKeyFromPassword(
	password: string,
	payload: GatePayload,
): Promise<CryptoKey> {
	const baseKey = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(password) as BufferSource,
		"PBKDF2",
		false,
		["deriveKey"],
	);
	return crypto.subtle.deriveKey(
		{
			name: "PBKDF2",
			salt: fromB64(payload.salt) as BufferSource,
			iterations: payload.iterations,
			hash: "SHA-256",
		},
		baseKey,
		{ name: "AES-GCM", length: 256 },
		true,
		["encrypt", "decrypt"],
	);
}

async function decryptPayload(
	payload: GatePayload,
	key: CryptoKey,
): Promise<string> {
	const plain = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv: fromB64(payload.iv) as BufferSource },
		key,
		fromB64(payload.ct) as BufferSource,
	);
	return new TextDecoder().decode(plain);
}

/** 从 localStorage 读未过期的持久化密钥 */
function readStoredKey(): StoredGateKey | null {
	try {
		const raw = localStorage.getItem(GATE_KEY_STORAGE);
		if (!raw) return null;
		const stored = JSON.parse(raw) as StoredGateKey;
		if (
			typeof stored.k !== "string" ||
			typeof stored.salt !== "string" ||
			typeof stored.iterations !== "number" ||
			typeof stored.exp !== "number" ||
			stored.exp < Date.now()
		) {
			return null;
		}
		return stored;
	} catch {
		return null;
	}
}

function writeStoredKey(
	key: CryptoKey,
	payload: GatePayload,
	persist: boolean,
) {
	if (!persist || securityConfig.rememberDays <= 0) return;
	crypto.subtle
		.exportKey("raw", key)
		.then((raw) => {
			const stored: StoredGateKey = {
				k: toB64(new Uint8Array(raw)),
				salt: payload.salt,
				iterations: payload.iterations,
				exp: Date.now() + securityConfig.rememberDays * 86_400_000,
			};
			localStorage.setItem(GATE_KEY_STORAGE, JSON.stringify(stored));
		})
		.catch(() => {
			// 导出失败仅影响"免输入记忆"，不影响本次解锁
		});
}

export function clearStoredGateKey() {
	try {
		localStorage.removeItem(GATE_KEY_STORAGE);
	} catch {
		// private browsing
	}
}

/** 会话内是否已有可复用的密钥（同步检查，命中则不渲染门，Swup 导航零闪烁） */
export function hasCachedGateKey(payload: GatePayload): boolean {
	return keyMemoryCache.has(cacheKeyFor(payload));
}

/** 尝试直接解密（不输密码）：优先内存缓存，其次 localStorage 持久密钥 */
export async function tryUnlockWithStoredKey(
	payload: GatePayload,
): Promise<string | null> {
	const cacheKey = cacheKeyFor(payload);
	let key = keyMemoryCache.get(cacheKey);
	if (!key) {
		const stored = readStoredKey();
		if (!stored || stored.salt !== payload.salt) return null;
		key = await importRawKey(fromB64(stored.k));
	}
	try {
		const html = await decryptPayload(payload, key);
		keyMemoryCache.set(cacheKey, key);
		return html;
	} catch {
		// 密钥失效（如密码已更换）：清除持久记忆，回退手动输入
		clearStoredGateKey();
		keyMemoryCache.delete(cacheKey);
		return null;
	}
}

/** 用密码解锁：派生密钥 → 解密；成功后写入会话缓存，remember 为 true 时再持久化 */
export async function unlockGateWithPassword(
	payload: GatePayload,
	password: string,
	remember: boolean,
): Promise<string> {
	const key = await deriveKeyFromPassword(password, payload);
	const html = await decryptPayload(payload, key);
	keyMemoryCache.set(cacheKeyFor(payload), key);
	writeStoredKey(key, payload, remember);
	return html;
}

/* ===== 失败计数与冷却 ===== */

export function getGateFailureState(): GateFailureState {
	try {
		const raw = localStorage.getItem(GATE_FAILURE_STORAGE);
		if (!raw) return { attempts: 0, cooldownUntil: 0 };
		const parsed = JSON.parse(raw) as Partial<GateFailureState>;
		return {
			attempts: typeof parsed.attempts === "number" ? parsed.attempts : 0,
			cooldownUntil:
				typeof parsed.cooldownUntil === "number" ? parsed.cooldownUntil : 0,
		};
	} catch {
		return { attempts: 0, cooldownUntil: 0 };
	}
}

export function recordGateFailure(): GateFailureState {
	const state = getGateFailureState();
	if (state.cooldownUntil > Date.now()) return state;
	state.attempts += 1;
	if (state.attempts >= securityConfig.maxAttempts) {
		state.cooldownUntil = Date.now() + securityConfig.cooldownSeconds * 1000;
		state.attempts = 0;
	}
	try {
		localStorage.setItem(GATE_FAILURE_STORAGE, JSON.stringify(state));
	} catch {
		// private browsing
	}
	return state;
}

export function clearGateFailures() {
	try {
		localStorage.removeItem(GATE_FAILURE_STORAGE);
	} catch {
		// private browsing
	}
}
