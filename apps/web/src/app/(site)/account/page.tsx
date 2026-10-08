import Link from "next/link";
import { getAccount } from "@propertyx/core";
import { verificationInfo } from "@propertyx/shared";
import { requireUser, db } from "@/lib/server";
import { allCities } from "@/lib/queries";
import { ProfileForm, PhoneVerify, PasswordForm, RolesForm } from "@/components/account/account-forms";
import { Panel } from "@/components/dashboard/ui";

export const metadata = { title: "Account settings", robots: { index: false } };

export default async function AccountPage() {
  const user = await requireUser("/account");
  const [acc, cities] = await Promise.all([getAccount(db, user), allCities()]);
  const v = verificationInfo(user.verificationLevel);
  return (
    <div className="container-px max-w-4xl space-y-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Account settings</h1>
          <p className="mt-1 text-slate-500">
            Verification: <b>Level {user.verificationLevel} — {v.label}</b> ·{" "}
            <Link href="/dashboard/verification" className="font-semibold text-brand-700">
              Improve
            </Link>
          </p>
        </div>
        <Link href="/account/notifications" className="btn-outline">
          Notification settings
        </Link>
      </div>
      <Panel title="Profile">
        <ProfileForm cities={cities} initial={{ name: acc.user.name, bio: acc.user.bio ?? "", cityId: acc.user.cityId, email: acc.user.email }} />
      </Panel>
      <div id="security" className="scroll-mt-24 space-y-6">
        <Panel title="Phone verification">
          <p className="mb-3 text-sm text-slate-600">A verified phone earns the phone-verified badge on your listings and lets you receive SMS and WhatsApp alerts.</p>
          <PhoneVerify phone={(acc.user.phone ?? "").replace("+92", "0")} verified={!!acc.user.phoneVerifiedAt} />
        </Panel>
        <Panel title="Password">
          <PasswordForm />
        </Panel>
        <Panel title="Active sessions">
          <ul className="divide-y divide-slate-100 text-sm">
            {acc.sessions.map((s) => (
              <li key={s.id} className="flex justify-between gap-3 py-2">
                <span className="truncate text-slate-600">
                  {s.client} · {s.userAgent?.slice(0, 70) ?? "Unknown device"}
                  {s.id === user.sessionId && <span className="ml-2 badge bg-brand-50 text-brand-700">This device</span>}
                </span>
                <span className="shrink-0 text-slate-400">{s.createdAt.toLocaleDateString("en-PK")}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">Changing your password signs out all sessions.</p>
        </Panel>
      </div>
      <Panel title="How you use PropertyX">
        <p className="mb-3 text-sm text-slate-600">Add roles to unlock features — for example become a landlord to manage rentals. Staff roles are assigned by administrators.</p>
        <RolesForm roles={user.roles} />
      </Panel>
    </div>
  );
}
