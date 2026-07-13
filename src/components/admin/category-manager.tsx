"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import type { Category, Exam } from "@/lib/types";
import { FolderTree, Pencil, Plus } from "lucide-react";

const NO_PARENT = "__none__";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface TreeNode {
  subject: Category;
  children: Category[];
}

interface FormState {
  id?: string;
  name: string;
  short_description: string;
  cover_image_url?: string;
  parent_id: string;
  exam_id: string;
}

export function CategoryManager({
  tree,
  subjects,
  exams,
}: {
  tree: TreeNode[];
  subjects: Category[];
  exams: Exam[];
}) {
  const [nodes, setNodes] = useState<TreeNode[]>(tree);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);

  const openNew = () =>
    setForm({
      name: "",
      short_description: "",
      cover_image_url: undefined,
      parent_id: NO_PARENT,
      exam_id: exams[0]?.id ?? "",
    });

  const openEdit = (c: Category) =>
    setForm({
      id: c.id,
      name: c.name,
      short_description: c.short_description ?? "",
      cover_image_url: c.cover_image_url,
      parent_id: c.parent_id ?? NO_PARENT,
      exam_id: c.exam_id,
    });

  // Opening the sheet whenever a form is set.
  const isOpen = open || form !== null;

  const close = () => {
    setOpen(false);
    setForm(null);
  };

  const save = () => {
    if (!form) return;
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const parentId = form.parent_id === NO_PARENT ? null : form.parent_id;

    setNodes((prev) => {
      // Editing an existing category.
      if (form.id) {
        return prev.map((node) => {
          const patch = (c: Category): Category =>
            c.id === form.id
              ? {
                  ...c,
                  name: form.name.trim(),
                  short_description: form.short_description.trim() || undefined,
                  cover_image_url: form.cover_image_url,
                  parent_id: parentId,
                }
              : c;
          return { subject: patch(node.subject), children: node.children.map(patch) };
        });
      }
      // Creating a new category.
      const newCat: Category = {
        id: `cat-${slugify(form.name)}-${Date.now().toString(36)}`,
        exam_id: form.exam_id,
        parent_id: parentId,
        slug: slugify(form.name),
        name: form.name.trim(),
        short_description: form.short_description.trim() || undefined,
        cover_image_url: form.cover_image_url,
        sort_order: 99,
        total: 0,
        attempted: 0,
      };
      if (!parentId) {
        return [...prev, { subject: newCat, children: [] }];
      }
      return prev.map((node) =>
        node.subject.id === parentId
          ? { ...node, children: [...node.children, newCat] }
          : node
      );
    });

    toast.success(form.id ? "Category updated" : "Category created", {
      description: "In production this would upsert the row via Supabase.",
    });
    close();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="gap-1.5" onClick={openNew}>
          <Plus className="size-4" />
          New category
        </Button>
      </div>

      <div className="space-y-3">
        {nodes.map((node) => (
          <div key={node.subject.id} className="overflow-hidden rounded-xl border">
            {/* Subject row */}
            <div className="flex items-center gap-3 bg-muted/40 p-3">
              <CoverThumb category={node.subject} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{node.subject.name}</span>
                  <Badge variant="secondary">Subject</Badge>
                </div>
                {node.subject.short_description && (
                  <p className="truncate text-xs text-muted-foreground">
                    {node.subject.short_description}
                  </p>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {node.subject.total.toLocaleString()} Q · {node.children.length} topics
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => openEdit(node.subject)}
              >
                <Pencil className="size-4" />
              </Button>
            </div>

            {/* Children */}
            {node.children.length > 0 && (
              <div className="divide-y">
                {node.children.map((child) => (
                  <div key={child.id} className="flex items-center gap-3 p-3 pl-8">
                    <CoverThumb category={child} />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium">{child.name}</span>
                      {child.short_description && (
                        <p className="truncate text-xs text-muted-foreground">
                          {child.short_description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {child.total.toLocaleString()} Q
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEdit(child)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create / edit sheet */}
      <Sheet open={isOpen} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{form?.id ? "Edit category" : "New category"}</SheetTitle>
            <SheetDescription>
              Leave the parent blank for a top-level subject, or pick one to nest
              a topic underneath it.
            </SheetDescription>
          </SheetHeader>

          {form && (
            <div className="space-y-4 px-4">
              <div className="space-y-1.5">
                <Label htmlFor="cat-name">Name</Label>
                <Input
                  id="cat-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Cell Biology"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cat-desc">Short description</Label>
                <Textarea
                  id="cat-desc"
                  value={form.short_description}
                  onChange={(e) =>
                    setForm({ ...form, short_description: e.target.value })
                  }
                  placeholder="One line shown on the category card."
                />
              </div>

              <div className="space-y-1.5">
                <Label>Parent category</Label>
                <Select
                  value={form.parent_id}
                  onValueChange={(v) => setForm({ ...form, parent_id: v ?? NO_PARENT })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PARENT}>None (top-level subject)</SelectItem>
                    {subjects
                      .filter((s) => s.id !== form.id)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Exam</Label>
                <Select
                  value={form.exam_id}
                  onValueChange={(v) => setForm({ ...form, exam_id: v ?? "" })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {exams.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <ImageUploadField
                label="Cover picture"
                value={form.cover_image_url}
                onChange={(url) => setForm({ ...form, cover_image_url: url })}
              />
            </div>
          )}

          <SheetFooter>
            <Button onClick={save}>
              {form?.id ? "Save changes" : "Create category"}
            </Button>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CoverThumb({ category }: { category: Category }) {
  if (category.cover_image_url) {
    // eslint-disable-next-line @next/next/no-img-element -- data-URI / storage URL
    return (
      <img
        src={category.cover_image_url}
        alt=""
        className="size-10 shrink-0 rounded-md object-cover"
      />
    );
  }
  return (
    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
      <FolderTree className="size-4" />
    </span>
  );
}
