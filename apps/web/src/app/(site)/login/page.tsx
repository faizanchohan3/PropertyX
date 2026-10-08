import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { getUser, isDemoMode } from "@/lib/server";
import { LogoMark } from "@/components/logo";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage() {
  if (await getUser()) redirect("/dashboard");
  const demo = await isDemoMode();
  return (
    <div className="container-px flex min-h-[70vh] items-center justify-center py-12">
      <div className="card w-full max-w-md p-8">
        <LogoMark className="h-11 w-11" />
        <h1 className="mt-5 text-2xl font-extrabold">Welcome back</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">Sign in to save properties, message sellers and manage listings.</p>
        <Suspense>
          <LoginForm showDemo={demo && process.env.NODE_ENV !== "production"} />
        </Suspense>
      </div>
    </div>
  );
}
