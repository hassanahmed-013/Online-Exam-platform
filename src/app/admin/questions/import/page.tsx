import { redirect } from "next/navigation";

/** Legacy path — canonical route is /admin/bulk-import. */
export default async function ImportRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ section_id?: string }>;
}) {
  const { section_id } = await searchParams;
  const qs = section_id ? `?section_id=${encodeURIComponent(section_id)}` : "";
  redirect(`/admin/bulk-import${qs}`);
}
