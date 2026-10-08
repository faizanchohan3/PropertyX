import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth-forms";
import { getUser } from "@/lib/server";
import { LogoMark } from "@/components/logo";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default async function RegisterPage() {
  if (await getUser()) redirect("/dashboard");
  return (
    <div className="container-px flex min-h-[70vh] items-center justify-center py-12">
      <div className="card w-full max-w-md p-8">
        <LogoMark className="h-11 w-11" />
        <h1 className="mt-5 text-2xl font-extrabold">Create your account</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">Free for buyers, tenants and owners. Agents and developers can upgrade later.</p>
        <Suspense>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
