import { redirect } from "next/navigation";

/** Categories (legacy) retired — Sections is the single content system. */
export default function AdminCategoriesRedirect() {
  redirect("/admin/sections");
}
