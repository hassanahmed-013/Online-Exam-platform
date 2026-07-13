import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ProfileSettingsForm } from "@/components/dashboard/profile-settings-form";

export const metadata = { title: "Profile settings" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <ProfileSettingsForm
      name={user.full_name}
      email={user.email}
      avatarUrl={user.avatar_url}
    />
  );
}
