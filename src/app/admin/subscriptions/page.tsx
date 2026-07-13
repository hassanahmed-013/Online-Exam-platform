import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { getAdminSubscriptions, hasServiceRole } from "@/lib/admin-data";
import { CreditCard, RefreshCw, XCircle } from "lucide-react";

export const metadata = { title: "Admin · Subscriptions" };

const statusVariant = (s: string) =>
  s === "active" ? "default" : s === "expired" ? "destructive" : "secondary";

export default async function AdminSubscriptionsPage() {
  const rows = hasServiceRole ? await getAdminSubscriptions() : [];
  const active = rows.filter((s) => s.status === "active").length;
  const expired = rows.filter((s) => s.status === "expired").length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Subscriptions
        </h2>
        <p className="text-sm text-muted-foreground">
          Live plans from Supabase. Grant or revoke access from the Users page.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={CreditCard} label="Active" value={active} />
        <StatCard icon={XCircle} label="Expired" value={expired} />
        <StatCard icon={RefreshCw} label="Total records" value={rows.length} />
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Renews</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No subscriptions yet. Grant a plan from Admin → Users.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.user}</TableCell>
                  <TableCell className="capitalize">{s.plan}</TableCell>
                  <TableCell>{s.amount}</TableCell>
                  <TableCell>
                    <Badge
                      variant={statusVariant(s.status)}
                      className="capitalize"
                    >
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.renews}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
