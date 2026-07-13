"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Category, ReviewItem } from "@/lib/types";
import { shortDate } from "@/lib/format";
import { ArrowDown, ArrowUp, Search, X } from "lucide-react";

type Sort = "date" | "alpha";

export function ReviewList({
  items,
  categories,
}: {
  items: ReviewItem[];
  categories: Category[];
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("date");
  const [activeCats, setActiveCats] = useState<Set<string>>(new Set());
  const [votes, setVotes] = useState<Record<string, "up" | "down" | undefined>>(
    Object.fromEntries(items.map((i) => [i.id, i.vote]))
  );
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  const toggleCat = (name: string) =>
    setActiveCats((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const filtered = useMemo(() => {
    let list = items.filter((i) => !removed.has(i.id));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.snippet.toLowerCase().includes(q)
      );
    }
    if (activeCats.size) {
      list = list.filter((i) => activeCats.has(i.categoryName));
    }
    list = [...list].sort((a, b) =>
      sort === "alpha"
        ? a.title.localeCompare(b.title)
        : +new Date(b.answeredAt) - +new Date(a.answeredAt)
    );
    return list;
  }, [items, query, activeCats, sort, removed]);

  const setVote = (id: string, v: "up" | "down") =>
    setVotes((prev) => ({ ...prev, [id]: prev[id] === v ? undefined : v }));

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
      {/* Filters */}
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-sm">Filter by category</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {categories.map((c) => (
            <label
              key={c.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-accent/40"
              onClick={(e) => {
                e.preventDefault();
                toggleCat(c.name);
              }}
            >
              <Checkbox checked={activeCats.has(c.name)} />
              <span className="text-sm">{c.name}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* List */}
      <div className="space-y-4">
        <Tabs defaultValue="questions">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="questions">Questions</TabsTrigger>
              <TabsTrigger value="concepts">Key concepts</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="h-8 w-40 pl-8"
                />
              </div>
              <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
                <SelectTrigger className="h-8 w-32" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Newest first</SelectItem>
                  <SelectItem value="alpha">Alphabetical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="questions" className="mt-4 space-y-2">
            {filtered.length === 0 && (
              <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No questions match your filters.
              </p>
            )}
            {filtered.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-xl border p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {item.categoryName}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {shortDate(item.answeredAt)}
                    </span>
                    <Badge
                      variant={item.isCorrect ? "secondary" : "destructive"}
                      className="text-xs"
                    >
                      {item.isCorrect ? "Correct" : "Missed"}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {item.snippet}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant={votes[item.id] === "up" ? "default" : "outline"}
                    size="icon-sm"
                    onClick={() => setVote(item.id, "up")}
                    aria-label="Too easy"
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    variant={votes[item.id] === "down" ? "default" : "outline"}
                    size="icon-sm"
                    onClick={() => setVote(item.id, "down")}
                    aria-label="Too hard"
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Link
                    href="/exam/run?mode=practice"
                    className={cn(buttonVariants({ size: "sm" }), "ml-1")}
                  >
                    Review
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      setRemoved((prev) => new Set(prev).add(item.id))
                    }
                    aria-label="Remove"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="concepts" className="mt-4 space-y-2">
            {filtered.map((item) => (
              <div key={item.id} className="rounded-xl border p-4">
                <Badge variant="outline" className="mb-2 text-xs">
                  {item.categoryName}
                </Badge>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.snippet}
                </p>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
