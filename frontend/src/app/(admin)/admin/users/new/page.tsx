import { redirect } from "next/navigation";

export default function NewUserRedirectPage() {
  redirect("/admin/users/create");
}
