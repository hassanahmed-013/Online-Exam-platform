"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { UserMenu } from "@/components/dashboard/user-menu";

const TITLES: Record<string, string> = {
  "/dashboard": "Home",
  "/dashboard/question-bank": "Question bank",
  "/dashboard/exams": "Exams",
  "/dashboard/timed": "Fixed sets & timed tests",
  "/dashboard/mock-exams": "Mock exams",
  "/dashboard/review": "Review questions",
  "/dashboard/performance": "Performance",
  "/dashboard/textbooks": "Textbooks",
  "/dashboard/settings": "Profile",
};

export function DashboardHeader({
  name,
  email,
  avatarUrl,
}: {
  name?: string;
  email?: string;
  avatarUrl?: string | null;
}) {
  const pathname = usePathname();
  const title =
    TITLES[pathname] ??
    Object.entries(TITLES).find(
      ([k]) => k !== "/dashboard" && pathname.startsWith(k)
    )?.[1] ??
    "Dashboard";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />
      <h1 className="font-heading text-sm font-medium">{title}</h1>
      <div className="ml-auto flex items-center gap-2">
        <UserMenu name={name} email={email} avatarUrl={avatarUrl} />
      </div>
    </header>
  );
}
