"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Section } from "@/lib/types";
import {
  createSection,
  deleteSection,
  updateSection,
} from "@/lib/actions/sections";
import { ImageIcon, Layers, Pencil, Plus, Trash2, Upload } from "lucide-react";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

interface FormState {
  id?: string;
  name: string;
  short_description: string;
  file?: File;
  preview?: string;
  existingCover?: string;
}

export function SectionManager({
  sections,
  enabled,
}: {
  sections: Section[];
  enabled: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [pending, startTransition] = useTransition();

  const openNew = () => setForm({ name: "", short_description: "" });
  const openEdit = (s: Section) =>
    setForm({
      id: s.id,
      name: s.name,
      short_description: s.short_description,
      existingCover: s.cover_image_url,
    });
  const close = () => setForm(null);

  const pickFile = (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Use a JPG, PNG or WEBP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image must be ≤ 2MB.");
      return;
    }
    setForm((f) => (f ? { ...f, file, preview: URL.createObjectURL(file) } : f));
  };

  const submit = () => {
    if (!form) return;
    if (!form.name.trim() || !form.short_description.trim()) {
      toast.error("Name and description are required.");
      return;
    }
    if (!form.id && !form.file) {
      toast.error("A cover image is required.");
      return;
    }
    const fd = new FormData();
    fd.set("name", form.name);
    fd.set("short_description", form.short_description);
    if (form.file) fd.set("cover", form.file);

    startTransition(async () => {
      const res = form.id
        ? await updateSection(form.id, fd)
        : await createSection(fd);
      if (res.ok) {
        toast.success(form.id ? "Section updated" : "Section created");
        close();
        router.refresh();
      } else {
        toast.error(res.error ?? "Something went wrong");
      }
    });
  };

  const remove = (s: Section) => {
    if (!confirm(`Delete "${s.name}"?`)) return;
    startTransition(async () => {
      const res = await deleteSection(s.id);
      if (res.ok) {
        toast.success(res.error ?? "Section deleted");
        router.refresh();
      } else {
        toast.error(res.error ?? "Delete failed");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          className="gap-1.5"
          onClick={() => {
            if (!enabled) {
              toast.error(
                "Add SUPABASE_SERVICE_ROLE_KEY to .env.local to create sections."
              );
              return;
            }
            openNew();
          }}
        >
          <Plus className="size-4" />
          New section
        </Button>
      </div>

      {sections.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No sections yet. Create one to see it appear on the live site.
          </p>
          <Button
            type="button"
            className="gap-1.5"
            onClick={() => {
              if (!enabled) {
                toast.error(
                  "Add SUPABASE_SERVICE_ROLE_KEY to .env.local to create sections."
                );
                return;
              }
              openNew();
            }}
          >
            <Plus className="size-4" />
            Create your first section
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {sections.map((s) => (
            <div
              key={s.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3",
                !s.is_active && "opacity-60"
              )}
            >
              {s.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.cover_image_url}
                  alt=""
                  className="size-11 shrink-0 rounded-md object-cover"
                />
              ) : (
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Layers className="size-4" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{s.name}</span>
                  {!s.is_active && <Badge variant="outline">Hidden</Badge>}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {s.short_description}
                </p>
              </div>
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {s.question_count ?? 0}{" "}
                {(s.question_count ?? 0) === 1 ? "question" : "questions"}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => router.push(`/admin/bulk-import?section_id=${s.id}`)}
              >
                <Upload className="size-3.5" />
                Import questions
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => openEdit(s)}>
                <Pencil className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => remove(s)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Sheet open={form !== null} onOpenChange={(o) => (!o ? close() : undefined)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{form?.id ? "Edit section" : "New section"}</SheetTitle>
            <SheetDescription>
              Name, a one-line description and a cover image (JPG/PNG/WEBP, ≤2MB).
            </SheetDescription>
          </SheetHeader>

          {form && (
            <div className="space-y-4 px-4">
              <div className="space-y-1.5">
                <Label htmlFor="s-name">Name</Label>
                <Input
                  id="s-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Biology"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-desc">Short description</Label>
                <Textarea
                  id="s-desc"
                  value={form.short_description}
                  onChange={(e) =>
                    setForm({ ...form, short_description: e.target.value })
                  }
                  placeholder="One or two sentences shown on the card."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cover image {form.id && "(leave blank to keep current)"}</Label>
                {(form.preview || form.existingCover) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.preview || form.existingCover}
                    alt="Cover preview"
                    className="max-h-40 w-full rounded-lg border bg-muted/30 object-contain"
                  />
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-1.5"
                  onClick={() => fileRef.current?.click()}
                >
                  <ImageIcon className="size-4" />
                  {form.file ? form.file.name : "Choose image"}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept={ACCEPTED.join(",")}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) pickFile(f);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          )}

          <SheetFooter>
            <Button onClick={submit} disabled={pending}>
              {pending ? "Saving…" : form?.id ? "Save changes" : "Create section"}
            </Button>
            <Button variant="outline" onClick={close} disabled={pending}>
              Cancel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
