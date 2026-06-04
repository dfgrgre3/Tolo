import { redirect } from "next/navigation";

export default function NewAnnouncementRedirectPage() {
  redirect("/admin/announcements?create=1");
}
