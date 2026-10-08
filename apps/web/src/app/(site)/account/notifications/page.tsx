import Link from "next/link";
import { getNotificationPreferences } from "@propertyx/core";
import { requireUser, db } from "@/lib/server";
import { NotificationPrefs } from "@/components/account/account-forms";

export const metadata = { title: "Notification settings", robots: { index: false } };

export default async function NotificationSettings() {
  const user = await requireUser("/account/notifications");
  const items = await getNotificationPreferences(db, user);
  return (
    <div className="container-px max-w-4xl py-8">
      <Link href="/account" className="text-sm font-semibold text-brand-700">
        ← Account settings
      </Link>
      <h1 className="mt-2 text-3xl font-extrabold">Notification settings</h1>
      <p className="mb-6 mt-1 text-slate-500">Choose how we reach you for each type of update.</p>
      <div className="card p-6">
        <NotificationPrefs items={items.map((i) => ({ type: i.type, label: i.label, channels: i.channels }))} />
      </div>
    </div>
  );
}
