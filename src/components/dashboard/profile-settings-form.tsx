"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadAvatar, updateProfileName } from "@/lib/actions/profile";
import { Camera, Loader2 } from "lucide-react";

export function ProfileSettingsForm({
  name,
  email,
  avatarUrl,
}: {
  name: string;
  email: string;
  avatarUrl?: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(avatarUrl ?? null);
  const [fullName, setFullName] = useState(name);
  const [pendingAvatar, startAvatar] = useTransition();
  const [pendingName, startName] = useTransition();

  const initials = (fullName || email || "U")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const onPick = (file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    const fd = new FormData();
    fd.set("avatar", file);
    startAvatar(async () => {
      const res = await uploadAvatar(fd);
      if (res.ok && res.avatar_url) {
        setPreview(res.avatar_url);
        toast.success("Avatar updated");
        router.refresh();
      } else {
        toast.error(res.error ?? "Upload failed");
        setPreview(avatarUrl ?? null);
      }
    });
  };

  const saveName = () => {
    const fd = new FormData();
    fd.set("full_name", fullName);
    startName(async () => {
      const res = await updateProfileName(fd);
      if (res.ok) {
        toast.success("Profile saved");
        router.refresh();
      } else toast.error(res.error ?? "Could not save");
    });
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Profile
        </h2>
        <p className="text-sm text-muted-foreground">
          Your photo appears in the dashboard header.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Photo</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-5">
          <div className="relative">
            <Avatar className="size-20">
              {preview ? <AvatarImage src={preview} alt="" /> : null}
              <AvatarFallback className="bg-primary/10 text-lg font-medium text-primary">
                {initials || "U"}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={pendingAvatar}
              className="absolute -right-1 -bottom-1 inline-flex size-8 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-muted"
              aria-label="Upload photo"
            >
              {pendingAvatar ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Camera className="size-3.5" />
              )}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                onPick(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            <p>JPG, PNG or WebP · max 2MB</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => inputRef.current?.click()}
              disabled={pendingAvatar}
            >
              Choose photo
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Display name</Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled />
          </div>
          <Button onClick={saveName} disabled={pendingName} className="gap-1.5">
            {pendingName && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
