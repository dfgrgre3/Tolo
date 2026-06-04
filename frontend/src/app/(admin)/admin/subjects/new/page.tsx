import { redirect } from "next/navigation";

export default function NewSubjectRedirectPage() {
  redirect("/admin/subjects?create=1");
}
