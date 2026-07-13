"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AdminUserListItem } from "@/lib/admin-data";
import { grantAccess, revokeAccess } from "@/lib/actions/users";
import { shortDate } from "@/lib/format";
import { MoreHorizontal, Search } from "lucide-react";

const statusVariant = (s: string) =>
  s === "active" ? "default" : s === "expired" ? "destructive" : "secondary";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function UserManager({
  users,
  enabled,
}: {
  users: AdminUserListItem[];
  enabled: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [users, query]);

  const grant = (userId: string, plan: "monthly" | "annual" | "lifetime") => {
    startTransition(async () => {
      const res = await grantAccess(userId, plan);
      if (res.ok) {
        toast.success(`Granted ${plan} access`);
        router.refresh();
      } else toast.error(res.error ?? "Grant failed");
    });
  };

  const revoke = (userId: string) => {
    if (!confirm("Revoke this user's active subscription?")) return;
    startTransition(async () => {
      const res = await revokeAccess(userId);
      if (res.ok) {
        toast.success("Access revoked");
        router.refresh();
      } else toast.error(res.error ?? "Revoke failed");
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {filtered.length} of {users.length} users
          {query ? " matching search" : ""}.
        </p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email…"
            className="h-9 w-64 pl-8"
          />
        </div>
      </div>

      {users.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No users yet. New sign-ups appear here automatically.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-primary/10 text-xs text-primary">
                          {initials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {u.email || "—"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{u.plan}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(u.status)} className="capitalize">
                      {u.status === "free" ? "Free" : u.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {shortDate(u.joined)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={!enabled || pending}
                          />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => grant(u.id, "monthly")}>
                          Grant Monthly
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => grant(u.id, "annual")}>
                          Grant Annual
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => grant(u.id, "lifetime")}>
                          Grant Lifetime
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => revoke(u.id)}
                          disabled={u.status !== "active"}
                        >
                          Revoke access
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No users match “{query}”.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
