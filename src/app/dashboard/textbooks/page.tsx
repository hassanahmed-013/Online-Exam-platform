import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getTextbooks } from "@/lib/textbooks";
import { BookOpen, Download, ExternalLink, FileText } from "lucide-react";

export const metadata = { title: "Textbooks" };

function formatBytes(n: number) {
  if (!n) return "";
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function TextbooksPage() {
  const books = await getTextbooks();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Textbooks
        </h2>
        <p className="text-sm text-muted-foreground">
          High-yield notes and extended reading uploaded by your admins.
        </p>
      </div>

      {books.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <BookOpen className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium">No textbooks yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                When an admin uploads documents, they will show up here.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {books.map((b) => (
            <Card key={b.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="size-4 shrink-0 text-primary" />
                    {b.title}
                  </CardTitle>
                  <Badge
                    variant={b.tag === "High-yield" ? "default" : "secondary"}
                  >
                    {b.tag}
                  </Badge>
                </div>
                {b.description ? (
                  <p className="text-sm text-muted-foreground">{b.description}</p>
                ) : null}
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {b.file_name}
                  {b.file_size ? ` · ${formatBytes(b.file_size)}` : ""}
                </p>
                <div className="flex gap-2">
                  <Link
                    href={b.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "gap-1.5"
                    )}
                  >
                    <ExternalLink className="size-3.5" />
                    Open
                  </Link>
                  <a
                    href={b.file_url}
                    download={b.file_name}
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      "gap-1.5"
                    )}
                  >
                    <Download className="size-3.5" />
                    Download
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
