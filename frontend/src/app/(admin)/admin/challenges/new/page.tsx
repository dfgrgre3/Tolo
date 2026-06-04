import { redirect } from "next/navigation";

export default function NewChallengeRedirectPage() {
  redirect("/admin/challenges?create=1");
}
