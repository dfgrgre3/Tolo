import { cookies } from "next/headers";
import HomePage from "@/app/components/home/HomePage";

export default async function Home() {
	// تلميح وجود جلسة يُقرأ على السيرفر، ليعرض العميل الواجهة الصحيحة من أول رسم.
	const cookieStore = await cookies();
	const hasSession = Boolean(
		cookieStore.get("access_token")?.value || cookieStore.get("refresh_token")?.value
	);

	return <HomePage hasSession={hasSession} />;
}
