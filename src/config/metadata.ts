import type { Metadata } from "next";

export const metadata: Metadata = {
	title: {
		template: '%s | Tolo',
		default: "Tolo - ثورة في عالم التعلم"
	},
	description: "منصة شاملة لتحديد الأهداف، تتبع التقدم، والارتقاء بمستواك التعليمي.",
	applicationName: "Tolo",
	authors: [{ name: "Tolo Team" }],
	keywords: ["Tolo", "تعليم", "تطوير", "نجاح"],
	creator: "Tolo Team",
	publisher: "Tolo",
	formatDetection: {
		email: false,
		address: false,
		telephone: false,
	},
};
