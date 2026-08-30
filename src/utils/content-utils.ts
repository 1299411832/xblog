import { type CollectionEntry, getCollection } from "astro:content";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import {
	buildCategoryTree,
	type CategoryNode,
	getCategoryFromId,
} from "@utils/category-tree";
import { getCategoryUrl, getTagUrl } from "@utils/url-utils";
import { securityConfig } from "@/config";

// // Retrieve posts and sort them by publication date
async function getRawSortedPosts() {
	const allBlogPosts = await getCollection("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const sorted = allBlogPosts.sort((a, b) => {
		// 首先按置顶状态排序，置顶文章在前
		if (a.data.pinned && !b.data.pinned) return -1;
		if (!a.data.pinned && b.data.pinned) return 1;

		// 如果置顶状态相同，则按发布日期排序
		const dateA = new Date(a.data.published);
		const dateB = new Date(b.data.published);
		// 日期相同，按 order 排序（越小越靠前）
		if (dateA.getTime() === dateB.getTime()) {
			return (a.data.order ?? 0) - (b.data.order ?? 0);
		}
		return dateA > dateB ? -1 : 1;
	});
	return sorted;
}

export async function getSortedPosts() {
	const sorted = await getRawSortedPosts();

	for (let i = 1; i < sorted.length; i++) {
		sorted[i].data.nextSlug = sorted[i - 1].id;
		sorted[i].data.nextTitle = sorted[i - 1].data.title;
	}
	for (let i = 0; i < sorted.length - 1; i++) {
		sorted[i].data.prevSlug = sorted[i + 1].id;
		sorted[i].data.prevTitle = sorted[i + 1].data.title;
	}

	return sorted;
}
export type PostForList = {
	id: string;
	data: CollectionEntry<"posts">["data"];
};
export async function getSortedPostsList(): Promise<PostForList[]> {
	const sortedFullPosts = await getRawSortedPosts();

	// delete post.body
	const sortedPostsList = sortedFullPosts.map((post) => ({
		id: post.id,
		data: post.data,
	}));

	return sortedPostsList;
}

export type ArchiveItem = {
	id: string;
	type: "post" | "moment" | "bangumi" | "life";
	data: {
		title: string;
		published: Date;
		tags: string[];
		category?: string | null;
		image?: string;
		link?: string;
		order?: number;
	};
};

// 辅助函数
const isIn = (entryId: string, folder: string) =>
	entryId.replace(/\\/g, "/").startsWith(`${folder}/`);

export async function getArchiveList(): Promise<ArchiveItem[]> {
	const posts = await getCollection("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});
	const moments = await getCollection("moments");
	const bangumi = await getCollection("bangumi");
	const lifeEntries = await getCollection("life");
	const notebooksEntries = await getCollection("notebooks");
	const postItems: ArchiveItem[] = posts.map((post) => ({
		id: post.id,
		type: "post",
		data: {
			title: post.data.title,
			published: post.data.published,
			tags: post.data.tags,
			category: getCategoryFromId(post.id) || null,
			order: post.data.order,
		},
	}));

	const momentItems: ArchiveItem[] = moments.map((moment) => {
		// 提取摘要作为标题
		let title = moment.body || "";
		title = title.replace(/[#*`]/g, "").trim(); // 移除 markdown 符号
		if (title.length > 50) title = `${title.substring(0, 50)}...`;
		if (!title) title = i18n(I18nKey.moments) || "日常动态";

		return {
			id: moment.id,
			type: "moment",
			data: {
				title: title,
				published: moment.data.published,
				tags: moment.data.tags,
				category: null,
			},
		};
	});

	const bangumiItems: ArchiveItem[] = bangumi.map((b) => {
		let link = b.data.link || "";
		if (!link) {
			const slug = b.id
				.replace(/\\/g, "/")
				.replace(/\.(md|mdx|markdown)$/i, "");
			if (b.data.category === "book") {
				link = `/books/${slug}/`;
			} else if (b.data.category === "music") {
				link = "/music/";
			} else {
				link = "/movies-games/";
			}
		}
		return {
			id: b.id,
			type: "bangumi",
			data: {
				title: b.data.title,
				published: b.data.published || new Date(0),
				tags: [],
				category: null,
				image:
					typeof b.data.image === "string" ? b.data.image : b.data.image.src,
				link,
			},
		};
	});

	// 生活动态归档
	const lifeItems: ArchiveItem[] = [];

	// 足迹记录
	lifeEntries
		.filter((entry) => isIn(entry.id, "places"))
		.forEach((p) => {
			const parts = [p.data.province, p.data.city].filter(Boolean);
			lifeItems.push({
				id: p.id,
				type: "life",
				data: {
					title: parts.length > 0 ? parts.join(" ") : "足迹记录",
					published: p.data.date || new Date(),
					tags: ["足迹"],
					link: "/life/places/",
				},
			});
		});

	// 笔记本记录（排除 _index 元数据条目）
	// 页面加密启用时跳过：防止笔记本标题/日期经归档时间线泄露
	if (!securityConfig.enabled) {
		notebooksEntries
			.filter((n) => !n.id.includes("_index"))
			.forEach((n) => {
				lifeItems.push({
					id: n.id,
					type: "life",
					data: {
						title: n.data.name || "笔记本",
						published: n.data.date || new Date(),
						tags: ["笔记本"],
						link: "/life/notebooks/",
					},
				});
			});
	}

	return [...postItems, ...momentItems, ...bangumiItems, ...lifeItems].sort(
		(a, b) => {
			const timeA = a.data.published.getTime();
			const timeB = b.data.published.getTime();
			if (timeA === timeB) {
				return (a.data.order ?? 0) - (b.data.order ?? 0);
			}
			return timeB - timeA;
		},
	);
}
export type Tag = {
	name: string;
	count: number;
};

export async function getTagList(): Promise<Tag[]> {
	const allBlogPosts = await getCollection<"posts">("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const allMoments = await getCollection("moments");

	const countMap: { [key: string]: number } = {};
	allBlogPosts.forEach((post: { data: { tags: string[] } }) => {
		post.data.tags.forEach((tag: string) => {
			if (!countMap[tag]) countMap[tag] = 0;
			countMap[tag]++;
		});
	});

	allMoments.forEach((moment: { data: { tags: string[] } }) => {
		if (Array.isArray(moment.data.tags)) {
			moment.data.tags.forEach((tag: string) => {
				if (!countMap[tag]) countMap[tag] = 0;
				countMap[tag]++;
			});
		}
	});

	// sort tags
	const keys: string[] = Object.keys(countMap).sort((a, b) => {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	return keys.map((key) => ({ name: key, count: countMap[key] }));
}

export type Category = {
	name: string;
	count: number;
	url: string;
};

export async function getCategoryList(): Promise<Category[]> {
	const allBlogPosts = await getCollection<"posts">("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});
	const count: { [key: string]: number } = {};
	const uncategorized = i18n(I18nKey.uncategorized);
	for (const post of allBlogPosts as unknown as { id: string }[]) {
		const full = getCategoryFromId((post as { id: string }).id);
		if (!full) {
			count[uncategorized] = (count[uncategorized] ?? 0) + 1;
			continue;
		}
		const parts = full.split("/");
		for (let i = 1; i <= parts.length; i++) {
			const pref = parts.slice(0, i).join("/");
			count[pref] = (count[pref] ?? 0) + 1;
		}
	}

	const lst = Object.keys(count).sort((a, b) => {
		return (
			count[b] - count[a] || a.toLowerCase().localeCompare(b.toLowerCase())
		);
	});

	const ret: Category[] = [];
	for (const c of lst) {
		ret.push({
			name: c,
			count: count[c],
			url: getCategoryUrl(c),
		});
	}
	return ret;
}

export async function getCategoryTree(): Promise<CategoryNode[]> {
	const allBlogPosts = await getCollection("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});
	const postsForTree = (
		allBlogPosts as unknown as { id: string; data: { tags: string[] } }[]
	).map((p) => ({
		id: p.id,
		tags: p.data.tags ?? [],
	}));
	return buildCategoryTree(postsForTree);
}

export type CategoryTag = {
	name: string;
	count: number;
	url: string;
};

export type CategoryTagGroup = Category & {
	tags: CategoryTag[];
};

export async function getCategoryTagGroups(): Promise<CategoryTagGroup[]> {
	const allBlogPosts = await getCollection<"posts">("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});
	const groupMap = new Map<
		string,
		{ count: number; tagCounts: Map<string, number> }
	>();
	const uncategorized = i18n(I18nKey.uncategorized);

	for (const post of allBlogPosts as unknown as {
		id: string;
		data: { tags: string[] };
	}[]) {
		const categoryName = getCategoryFromId(post.id) || uncategorized;
		const group = groupMap.get(categoryName) ?? {
			count: 0,
			tagCounts: new Map<string, number>(),
		};

		group.count++;
		const postTags = new Set(
			(post.data.tags ?? []).map((tag: string) => tag.trim()).filter(Boolean),
		);
		for (const tag of postTags) {
			group.tagCounts.set(tag, (group.tagCounts.get(tag) ?? 0) + 1);
		}
		groupMap.set(categoryName, group);
	}

	return [...groupMap.entries()]
		.map(([name, group]) => ({
			name,
			count: group.count,
			url: getCategoryUrl(name),
			tags: [...group.tagCounts.entries()]
				.map(([tagName, count]) => ({
					name: tagName,
					count,
					url: getTagUrl(tagName),
				}))
				.sort(
					(a, b) =>
						b.count - a.count ||
						a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
				),
		}))
		.sort(
			(a, b) =>
				b.count - a.count ||
				a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
		);
}
