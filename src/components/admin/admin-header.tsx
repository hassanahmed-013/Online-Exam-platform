"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AdminUserMenu } from "@/components/admin/admin-user-menu";

const TITLES: Record<string, string> = {
  "/admin": "Overview",
  "/admin/sections": "Sections",
  "/admin/exams": "Exams",
  "/admin/questions": "Questions",
  "/admin/bulk-import": "Bulk import",
  "/admin/questions/import": "Bulk import",
  "/admin/textbooks": "Textbooks",
  "/admin/mock-exams": "Mock exams",
  "/admin/users": "Users",
  "/admin/subscriptions": "Subscriptions",
  "/admin/analytics": "Analytics",
};

export function AdminHeader({
  name,
  email,
}: {
  name?: string;
  email?: string;
}) {
  const pathname = usePathname();
  const title =
    TITLES[pathname] ??
    Object.entries(TITLES).find(
      ([k]) => k !== "/admin" && pathname.startsWith(k)
    )?.[1] ??
    "Admin";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />
      <h1 className="font-heading text-sm font-medium">{title}</h1>
      <div className="ml-auto">
        <AdminUserMenu name={name ?? "Admin"} email={email} />
      </div>
    </header>
  );
}
