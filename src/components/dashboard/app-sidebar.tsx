"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  FileStack,
  Grid3x3,
  Home,
  Layers,
  RotateCcw,
  ShieldCheck,
  Target,
} from "lucide-react";

const mainNav = [{ href: "/dashboard", label: "Home", icon: Home }];

const questionsNav = [
  { href: "/categories", label: "Browse subjects", icon: Grid3x3 },
  { href: "/dashboard/question-bank", label: "Question bank", icon: Layers },
  { href: "/dashboard/exams", label: "Exams", icon: Target },
  { href: "/dashboard/timed", label: "Fixed sets & timed tests", icon: ClipboardList },
  { href: "/dashboard/mock-exams", label: "Mock exams", icon: FileStack },
  { href: "/dashboard/review", label: "Review questions", icon: RotateCcw },
];

const insightsNav = [
  { href: "/dashboard/performance", label: "Performance", icon: BarChart3 },
  { href: "/dashboard/textbooks", label: "Textbooks", icon: BookOpen },
];

export function AppSidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  const renderItems = (items: typeof questionsNav) =>
    items.map((item) => (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton
          isActive={isActive(item.href)}
          tooltip={item.label}
          render={<Link href={item.href} />}
        >
          <item.icon />
          <span>{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex h-10 items-center px-2 group-data-[collapsible=icon]:justify-center">
          <Logo />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(mainNav)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Questions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(questionsNav)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Insights</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(insightsNav)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {isAdmin ? (
        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Admin panel"
                render={<Link href="/admin" />}
              >
                <ShieldCheck />
                <span>Admin panel</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      ) : null}
    </Sidebar>
  );
}
