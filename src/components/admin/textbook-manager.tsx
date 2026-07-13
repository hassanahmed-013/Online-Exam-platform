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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Textbook } from "@/lib/types";
import {
  createTextbook,
  deleteTextbook,
  setTextbookActive,
  updateTextbook,
} from "@/lib/actions/textbooks";
import { BookOpen, Eye, EyeOff, FileUp, Pencil, Plus, Trash2 } from "lucide-react";

const ACCEPT =
  ".pdf,.doc,.docx,.ppt,.pptx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_BYTES = 25 * 1024 * 1024;

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

interface FormState {
  id?: string;
  title: string;
  description: string;
  tag: string;
  file?: File;
  existingName?: string;
}

export function TextbookManager({
  textbooks,
  enabled,
}: {
  textbooks: Textbook[];
  enabled: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [pending, startTransition] = useTransition();

  const openNew = () =>
    setForm({ title: "", description: "", tag: "High-yield" });
  const openEdit = (t: Textbook) =>
    setForm({
      id: t.id,
      title: t.title,
      description: t.description,
      tag: t.tag,
      existingName: t.file_name,
    });
  const close = () => setForm(null);

  const pickFile = (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error("File must be ≤ 25MB.");
      return;
    }
    setForm((f) => (f ? { ...f, file } : f));
  };

  const submit = () => {
    if (!form) return;
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    if (!form.id && !form.file) {
      toast.error("Choose a document to upload.");
      return;
    }

    const fd = new FormData();
    fd.set("title", form.title);
    fd.set("description", form.description);
    fd.set("tag", form.tag);
    if (form.file) fd.set("file", form.file);

    startTransition(async () => {
      const res = form.id
        ? await updateTextbook(form.id, fd)
        : await createTextbook(fd);
      if (res.ok) {
        toast.success(form.id ? "Textbook updated" : "Textbook uploaded");
        close();
        router.refresh();
      } else {
        toast.error(res.error ?? "Something went wrong");
      }
    });
  };

  const remove = (t: Textbook) => {
    if (!confirm(`Delete "${t.title}"?`)) return;
    startTransition(async () => {
      const res = await deleteTextbook(t.id);
      if (res.ok) {
        toast.success("Deleted");
        router.refresh();
      } else {
        toast.error(res.error ?? "Delete failed");
      }
    });
  };

  const toggle = (t: Textbook) => {
    startTransition(async () => {
      const res = await setTextbookActive(t.id, !t.is_active);
      if (res.ok) {
        toast.success(t.is_active ? "Hidden from students" : "Visible to students");
        router.refresh();
      } else {
        toast.error(res.error ?? "Update failed");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="gap-1.5" onClick={openNew} disabled={!enabled}>
          <Plus className="size-4" />
          Upload document
        </Button>
      </div>

      {textbooks.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <BookOpen className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No textbooks yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload PDFs or notes — they appear on the student Textbooks page.
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {textbooks.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{t.title}</span>
                  <Badge variant={t.tag === "High-yield" ? "default" : "secondary"}>
                    {t.tag}
                  </Badge>
                  {!t.is_active ? (
                    <Badge variant="outline">Hidden</Badge>
                  ) : null}
                </div>
                {t.description ? (
                  <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                    {t.description}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.file_name} · {formatBytes(t.file_size)}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => toggle(t)}
                  disabled={!enabled || pending}
                  title={t.is_active ? "Hide" : "Show"}
                >
                  {t.is_active ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => openEdit(t)}
                  disabled={!enabled || pending}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => remove(t)}
                  disabled={!enabled || pending}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={!!form} onOpenChange={(o) => !o && close()}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{form?.id ? "Edit textbook" : "Upload textbook"}</SheetTitle>
            <SheetDescription>
              Students see active documents under Dashboard → Textbooks.
            </SheetDescription>
          </SheetHeader>

          {form ? (
            <div className="space-y-4 px-4">
              <div className="space-y-1.5">
                <Label htmlFor="tb-title">Title</Label>
                <Input
                  id="tb-title"
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  placeholder="High-Yield Biology"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tb-desc">Description</Label>
                <Textarea
                  id="tb-desc"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Short note for students"
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tag</Label>
                <Select
                  value={form.tag}
                  onValueChange={(v) =>
                    setForm({ ...form, tag: v ?? "High-yield" })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High-yield">High-yield</SelectItem>
                    <SelectItem value="Extended">Extended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Document</Label>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center gap-1.5 rounded-lg border-2 border-dashed p-6 text-center transition-colors hover:border-primary/40"
                >
                  <FileUp className="size-6 text-muted-foreground" />
                  <span className="text-sm">
                    {form.file?.name ||
                      form.existingName ||
                      "Drop a file, or click to browse"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    PDF, Word, PowerPoint, TXT · max 25MB
                    {form.id ? " · leave empty to keep current file" : ""}
                  </span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) pickFile(file);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          ) : null}

          <SheetFooter>
            <Button variant="outline" onClick={close} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending || !enabled}>
              {pending ? "Saving…" : form?.id ? "Save changes" : "Upload"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
