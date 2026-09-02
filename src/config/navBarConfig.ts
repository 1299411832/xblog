import {
	LinkPreset,
	type NavBarConfig,
	type NavBarLink,
	type NavBarSearchConfig,
	NavBarSearchMethod,
} from "../types/config";
import { siteConfig } from "./siteConfig";

// 根据页面开关动态生成导航栏配置
const getDynamicNavBarConfig = (): NavBarConfig => {
	// 基础导航栏链接
	const links: (NavBarLink | LinkPreset)[] = [
		// 主页
		LinkPreset.Home,

		// 网站导航
		{
			name: "星际航站",
			url: "/projects/",
			icon: "material-symbols:public",
		},

		// 文章（带下拉子菜单）
		{
			name: "星文",
			url: "/posts/",
			icon: "material-symbols:article",
			children: [
				// 文章列表
				LinkPreset.Posts,

				// 文章分类
				{
					name: "分类",
					url: "/categories/",
					icon: "material-symbols:folder-open",
				},

				// 归档
				LinkPreset.Archive,
			],
		},
	];

	// 动态（带下拉子菜单）
	links.push({
		name: "衍态",
		url: "/moments/",
		icon: "material-symbols:local-cafe",
		children: [
			{
				name: "衍说",
				url: "/moments/",
				icon: "material-symbols:chat-bubble-outline",
			},
			{
				name: "缝隙",
				url: "/album/",
				icon: "material-symbols:photo-album-outline",
			},
			{
				name: "树洞星球",
				url: "/guestbook/",
				icon: "material-symbols:edit-outline",
			},
			{
				name: "迷·纪元",
				url: "/life/notebooks/",
				icon: "material-symbols:menu-book-outline",
			},
			// 朋友圈
			LinkPreset.Circle,
		],
	});

	// 记录入口 - 书架、影视与游戏、音乐、规划、足迹
	const recordChildren: (NavBarLink | LinkPreset)[] = [];
	if (siteConfig.pages.books) {
		recordChildren.push(LinkPreset.Books);
	}
	if (siteConfig.pages.moviesGames) {
		recordChildren.push(LinkPreset.MoviesGames);
	}
	// 音乐已移入「我的」分组，此处不再重复
	if (siteConfig.pages.changelog) {
		recordChildren.push(LinkPreset.Changelog);
	}
	// 足迹
	recordChildren.push({
		name: "星迹",
		url: "/life/places/",
		icon: "material-symbols:location-on",
	});
	if (recordChildren.length > 0) {
		const defaultUrl = siteConfig.pages.books
			? "/books/"
			: siteConfig.pages.moviesGames
				? "/movies-games/"
				: "/music/";

		links.push({
			name: "智录",
			url: defaultUrl,
			icon: "material-symbols:camera-outdoor",
			children: recordChildren,
		});
	}

	// 我的 - 日历、账单、应用展示、音乐
	links.push({
		name: "星目",
		url: "/schedules/",
		icon: "material-symbols:person",
		children: [
			{
				name: "日历",
				url: "/schedules/",
				icon: "material-symbols:calendar-today-outline",
			},
			{
				name: "账单",
				url: "/bills/",
				icon: "material-symbols:account-balance-wallet-outline",
			},
			{
				name: "生态模拟",
				url: "/apps/",
				icon: "material-symbols:apps",
			},
			...(siteConfig.pages.musicPage
				? [
						{
							name: "迷·PLAYER音乐",
							url: "/music/",
							icon: "material-symbols:music-note",
							external: true,
						} as NavBarLink,
					]
				: []),
		],
	});

	// 关于及其子菜单
	links.push({
		name: "关于",
		url: "/about/",
		icon: "material-symbols:info",
		children: [
			// 关于页面
			// LinkPreset.About,
			{
				name: "折扣星球",
				url: "https://ficp.fun/s/iZJdfm/?cid=P8GqhZF#/",
				icon: "material-symbols:group",
				external: true,
			},
						
			// QQ群

			{
				name: "微店",
				url: "https://k.youshop10.com/rYmlXkLT",
				icon: "material-symbols:group",
				external: true,
			},
			{
				name: "淘宝店",
				url: "https://shop.m.taobao.com/shop/shop_index.htm?shop_id=112853800",
				icon: "material-symbols:group",
				external: true,
			},

			// 友链
			LinkPreset.Friends,

			// 赞助
			...(siteConfig.pages.sponsor ? [LinkPreset.Sponsor] : []),
		],
	});

	// 仅返回链接，其它导航搜索相关配置在模块顶层常量中独立导出
	return { links } as NavBarConfig;
};

// 导航搜索配置
export const navBarSearchConfig: NavBarSearchConfig = {
	method: NavBarSearchMethod.PageFind,
};

export const navBarConfig: NavBarConfig = getDynamicNavBarConfig();
