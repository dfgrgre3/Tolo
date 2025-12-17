import type { Metadata } from "next";

export const metadata: Metadata = {
	title: {
		template: '%s | ثانوية بذكاء',
		default: "ثانوية بذكاء - تنظيم وقت ونصائح"
	},
	description: "منصة شاملة لتنظيم الوقت، تتبع التقدم، الموارد، والامتحانات لثالثة ثانوي.",
	applicationName: "ThanaWy Smart",
	authors: [{ name: "ThanaWy Team" }],
	keywords: ["تعليم", "ثانوية", "تنظيم الوقت", "امتحانات", "مصر"],
	creator: "ThanaWy Team",
	publisher: "ThanaWy",
	formatDetection: {
		email: false,
		address: false,
		telephone: false,
	},
};
