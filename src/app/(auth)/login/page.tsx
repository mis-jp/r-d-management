import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { BrandLogo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const HIGHLIGHTS = [
  "Assign tasks or publish them as OPEN for the team to claim",
  "Track status, progress, and deadlines in one place",
  "Upload accomplishment photos — stored as AVIF to stay fast",
  "See workload and completion trends across the department",
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { next } = await searchParams;
  const showDemo = process.env.NODE_ENV !== "production";

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel — full-bleed indigo, logo floats without a black header bar */}
      <aside className="relative hidden overflow-hidden bg-brand-900 text-white lg:flex lg:flex-col">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 55% at 15% 0%, rgba(99,102,241,0.55), transparent 55%), radial-gradient(ellipse 70% 45% at 100% 100%, rgba(14,165,233,0.28), transparent 50%)",
          }}
          aria-hidden
        />

        <div className="relative flex flex-1 flex-col justify-between p-10 xl:p-12">
          <div>
            <BrandLogo className="h-16 w-auto max-w-[18rem]" priority />
            <p className="sr-only">R&amp;D Management</p>
          </div>

          <div className="max-w-lg py-10">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-200">R&amp;D Management</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
              Plan, claim, and ship research work — together.
            </h2>
            <ul className="mt-8 space-y-3.5 text-sm leading-relaxed text-indigo-100">
              {HIGHLIGHTS.map((item) => (
                <li key={item} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-indigo-300" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-indigo-300">Internal use only · Research &amp; Development Department</p>
        </div>
      </aside>

      {/* Sign-in panel */}
      <main className="relative flex items-center justify-center bg-canvas px-6 py-12">
        <ThemeToggle className="absolute right-4 top-4 sm:right-6 sm:top-6" />

        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <BrandLogo className="h-12 w-auto max-w-[14rem]" priority />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
              Use your R&amp;D department email and password. Admins and employees share this page.
            </p>
          </div>

          <LoginForm next={next} />

          {showDemo && (
            <section
              aria-label="Demo accounts"
              className="mt-8 rounded-xl border border-brand-200 bg-brand-50 p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Local demo accounts</p>
              <ul className="mt-3 space-y-2.5 text-sm">
                <li className="space-y-1">
                  <p className="text-xs font-medium text-slate-500">Admin</p>
                  <code className="block break-all rounded-md border bg-surface px-2.5 py-1.5 text-[13px] font-medium text-slate-900">
                    admin@rnd.local
                  </code>
                </li>
                <li className="space-y-1">
                  <p className="text-xs font-medium text-slate-500">Employee</p>
                  <code className="block break-all rounded-md border bg-surface px-2.5 py-1.5 text-[13px] font-medium text-slate-900">
                    maria.santos@rnd.local
                  </code>
                </li>
                <li className="space-y-1 border-t border-brand-200/80 pt-2.5">
                  <p className="text-xs font-medium text-slate-500">Password (both)</p>
                  <code className="block break-all rounded-md border bg-surface px-2.5 py-1.5 text-[13px] font-medium text-slate-900">
                    Password123!
                  </code>
                </li>
              </ul>
              <p className="mt-3 text-xs leading-relaxed text-slate-600">
                Demo accounts are for local testing. Your department admin account also works on this page.
              </p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
