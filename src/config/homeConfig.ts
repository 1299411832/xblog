import type { HomeConfig } from "../types/config";
import { profileConfig } from "./profileConfig";
import { siteConfig } from "./siteConfig";
import { skillsConfig } from "./skillsConfig";

// 构建时自动扫描背景图文件夹
const _deskGlob = import.meta.glob(
	"../assets/images/backgrounds/desktop/*.{webp,png,jpg,jpeg,avif}",
	{ eager: true, query: "?url", import: "default" },
) as Record<string, string>;
const _mobGlob = import.meta.glob(
	"../assets/images/backgrounds/mobile/*.{webp,png,jpg,jpeg,avif}",
	{ eager: true, query: "?url", import: "default" },
) as Record<string, string>;
const _deskImgs = Object.values(_deskGlob);
const _mobImgs = Object.values(_mobGlob);

const replicaRoot = "/assets/images/home";
const bioLines = Array.isArray(profileConfig.bio)
	? profileConfig.bio
	: profileConfig.bio
		? [profileConfig.bio]
		: [];
const primaryBio = bioLines[0] || siteConfig.description || "";
const displayName = profileConfig.displayName || profileConfig.name;

export const homeConfig = {
	avatar: "assets/images/avatar.webp",
	avatarOnWork: "assets/images/avatar.webp",
	avatarOffWork: "assets/images/avatar2.webp",
	name: profileConfig.name,
	displayName,
	nameBadge: siteConfig.title,
	occupation: profileConfig.occupation,
	bio: profileConfig.bio,

	hero: {
		backgroundImage:
			_deskImgs.length > 0 ? _deskImgs[0] : `${replicaRoot}/main/083205Yfgeq.jpg`,
		backgroundImageMobile:
			_mobImgs.length > 0
				? _mobImgs[0]
				: `${replicaRoot}/main/6.jpg`,
		backgroundImagePool: _deskImgs.length > 0 ? _deskImgs : [],
		backgroundImageMobilePool: _mobImgs.length > 0 ? _mobImgs : [],
		speechAccentImage: `${replicaRoot}/main/home2-1.webp`,
		dialogue: {
			enabled: true,
			speakers: {
				host: "迷体星球",
				visitor: "访客",
			},
			menuTitle: "探索点什么？",
			typingSpeed: 45,
			autoDelay: 1600,
			intro: [
				{ speaker: "host", text: "欸，是骇入的天外来客。欢迎来到【迷体星球】。" },
				{
					speaker: "host",
					text: `这里是 ${profileConfig.name} 的航站空间，音乐、生活和喜欢的东西都会慢慢收进来。`,
				},
				{ speaker: "host", text: primaryBio },
				{ speaker: "host", text: "骇入其他节点？点下面的话题，我们慢慢叹镜。" },
			],
			topics: [
				{
					title: "关于迷体",
					lines: [
						{ speaker: "visitor", text: "这是哪里呀？" },
						{
							speaker: "host",
							text: `${profileConfig.name}，也可以叫 ${displayName}。`,
						},
						{
							speaker: "host",
							text:
								profileConfig.occupation || "音乐、工具、导航星球的中转站，也认真记录地球online生活。",
						},
						{
							speaker: "host",
							text: bioLines[1] || "总之，欢迎来到迷体世界。",
						},
					],
				},
				{
					title: "星球特色",
					lines: [
						{ speaker: "visitor", text: "这个星球主要干什么？" },
						{
							speaker: "host",
							text: "这里会分享音乐、实用工具、手工造物相关内容，也会留下日常生活的碎片。",
						},
						{
							speaker: "host",
							text: "迷体星球首页也放了站点数据、文章导航和作品展示，慢慢滚动会有完整的视觉演出。",
						},
						{
							speaker: "host",
							text: "别急着走，下面还有很多值得翻一翻的地方。",
						},
					],
				},
			],
		},
		rightPanel: {
			pill: "BLOG",
			title: "星球骇客",
			diamond: "✦",
			microText: "システム起動完了",
		},
		rain: {
			enabled: true,
			intensity: 0.6,
			color: "255, 255, 255",
		},
	},

	dataLayer: {
		visitImage: `${replicaRoot}/main/home-data-1.webp`,
		archiveImage: `${replicaRoot}/main/home-data-2.webp`,
		contactImage: `${replicaRoot}/main/home-data-3.webp`,
		skillsImage: `${replicaRoot}/main/home-data-4.webp`,
	},

	displayLayer: {
		enabled: true,
		kicker: "虫洞穿梭",
		title: "TRAVEL THROUGH TIME",
		description:
			"Where fleeting visions crystallize into permanence — each frame a frozen breath of time, each work a memory hardened into light.",
		scrollDistance: 4000,
		pillarFinalWidth: "18vw",
		emitterImage: `${replicaRoot}/portrait/td.webp`,
	},

	portfolioShutter: {
		enabled: true,
		kicker: "The End",
		title: "迷体 · 叹镜世界",
		description: "如果你能在浪费时间中获得乐趣，就不算浪费时间。",
		scrollDistance: 3000,
		finalImage: {
			midgroundImage: `${replicaRoot}/portrait/utl-back1.webp`,
			backgroundVideo: `${replicaRoot}/portrait/utl-back2.webm`,
			foregroundImage: `${replicaRoot}/portrait/utl-1.webp`,
			alt: "因为不可能，所以才值得相信。",
		},
		interlude: {
			foreground: `${replicaRoot}/portrait/b-1.webp`,
			stripLeft: `${replicaRoot}/portrait/b-2.webp`,
			stripRight: `${replicaRoot}/portrait/b-3.webp`,
			copyLeft: "迷体",
			copyRight: "星球",
		},
		panels: [
			{
				title: "星球纪元",
				english: "PROJECTS",
				description: "博客 · 工具 · 创意实验",
				image: `${replicaRoot}/portrait/1.webp`,
				alt: "星球纪元",
			},
			{
				title: "手工造物",
				english: "LEARNING",
				description: "手工万物 · 品牌随笔 · 策划记录",
				image: `${replicaRoot}/portrait/2.webp`,
				alt: "手工造物",
			},
			{
				title: "音乐星球",
				english: "BLOG FEATURES",
				description: "音乐索引 · 学琴记录 · 音乐衍生",
				image: `${replicaRoot}/portrait/3.webp`,
				alt: "音乐星球",
			},
			{
				title: "品牌策划",
				english: "STACK",
				description: "爱 · 支柱 · 创意协作",
				image: `${replicaRoot}/portrait/4.webp`,
				alt: "品牌策划",
			},
			{
				title: "星球缝隙",
				english: "PHOTO ALBUM",
				description: "日常照片 · 旅游定制 · 灵感片段",
				image: `${replicaRoot}/portrait/5.webp`,
				alt: "星球缝隙",
			},
		],
	},

	skills: skillsConfig.items,
	links: profileConfig.links,
} satisfies HomeConfig;
