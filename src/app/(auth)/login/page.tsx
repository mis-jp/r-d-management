import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, FlaskConical } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { next } = await searchParams;
  const showDemo = process.env.NODE_ENV !== "production";

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-brand-900 p-10 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-white/10">
            <FlaskConical className="size-5" aria-hidden />
          </span>
          <span className="font-semibold">R&amp;D Tasks</span>
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">Plan, claim, and ship research work — together.</h2>
          <ul className="mt-6 space-y-3 text-sm text-indigo-100">
            {[
              "Assign tasks or publish them as OPEN for the team to claim",
              "Track status, progress, and deadlines in one place",
              "See workload and completion trends across the department",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-indigo-200" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-indigo-200">Internal use only · Research &amp; Development Department</p>
      </div>

      <div className="relative flex items-center justify-center p-6">
        <ThemeToggle className="absolute right-4 top-4" />
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-lg bg-brand-600 text-white">
              <FlaskConical className="size-5" aria-hidden />
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">
            Admins and employees sign in here with the work email and password from their administrator.
          </p>
          <LoginForm next={next} />
          {showDemo && (
            <div className="mt-8 rounded-lg border border-dashed bg-surface p-4 text-xs text-slate-600">
              <p className="font-semibold text-slate-800">Local demo accounts</p>
              <p className="mt-1">
                Admin: <code>admin@rnd.local</code> · Employee: <code>maria.santos@rnd.local</code>
              </p>
              <p className="mt-1">
                Password for all: <code>Password123!</code>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
