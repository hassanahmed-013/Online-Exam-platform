"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
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
  ArrowLeft,
  BarChart3,
  BookMarked,
  BookOpen,
  CreditCard,
  FileStack,
  Layers,
  LayoutDashboard,
  ListChecks,
  Upload,
  Users,
} from "lucide-react";

const overview = [{ href: "/admin", label: "Overview", icon: LayoutDashboard }];

const content = [
  { href: "/admin/sections", label: "Sections", icon: Layers },
  { href: "/admin/exams", label: "Exams", icon: BookMarked },
  { href: "/admin/textbooks", label: "Textbooks", icon: BookOpen },
  { href: "/admin/questions", label: "Questions", icon: ListChecks },
  { href: "/admin/bulk-import", label: "Bulk import", icon: Upload },
  { href: "/admin/mock-exams", label: "Mock exams", icon: FileStack },
];

const people = [
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
];

const insights = [{ href: "/admin/analytics", label: "Analytics", icon: BarChart3 }];

export function AdminSidebar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admin"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  const renderItems = (items: typeof content) =>
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
        <div className="flex h-10 items-center gap-2 px-2 group-data-[collapsible=icon]:justify-center">
          <Logo />
          <Badge variant="secondary" className="group-data-[collapsible=icon]:hidden">
            Admin
          </Badge>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(overview)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Content</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(content)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>People</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(people)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Insights</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(insights)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Back to app" render={<Link href="/dashboard" />}>
              <ArrowLeft />
              <span>Back to app</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
