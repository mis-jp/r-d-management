import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { BrandLogo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { next } = await searchParams;
  const showDemo = process.env.NODE_ENV !== "production";

  return (
    <div className="login-page relative min-h-dvh overflow-hidden bg-[#07101f]">
      {/* Full-bleed atmosphere */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_10%_-10%,rgba(99,102,241,0.55),transparent_55%),radial-gradient(ellipse_70%_50%_at_90%_110%,rgba(14,165,233,0.28),transparent_50%),radial-gradient(circle_at_50%_40%,rgba(15,23,42,0.2),transparent_70%)]" />
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)",
          }}
        />
        <div className="login-orb login-orb-a absolute -left-24 top-16 size-72 rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="login-orb login-orb-b absolute -right-16 bottom-10 size-80 rounded-full bg-sky-400/20 blur-3xl" />
      </div>

      <ThemeToggle className="absolute right-4 top-4 z-20 text-white/80 hover:text-white sm:right-6 sm:top-6" />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col justify-center gap-10 px-5 py-12 sm:px-8 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:px-10">
        {/* Brand hero */}
        <section className="login-fade-up text-white">
          <BrandLogo className="h-14 w-auto max-w-[16rem] sm:h-16 sm:max-w-[18rem]" priority />
          <p className="sr-only">R&amp;D Management</p>

          <h1 className="mt-8 max-w-xl font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.35rem]">
            R&amp;D Management
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-indigo-100/90 sm:text-lg">
            Plan research work, claim open tasks, and ship progress — in one calm workspace for the department.
          </p>

          <p className="mt-10 text-xs text-indigo-200/70">Internal use · Research &amp; Development Department</p>
        </section>

        {/* Sign-in panel */}
        <main className="login-fade-up login-fade-up-delay w-full">
          <div className="rounded-[1.75rem] border border-white/10 bg-[color-mix(in_oklab,var(--color-surface)_92%,transparent)] p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:p-8">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Welcome back</p>
              <h2 className="mt-2 font-display text-3xl tracking-tight text-slate-900">Sign in</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Use your department email and password. Admins and employees share this page.
              </p>
            </div>

            <LoginForm next={next} />

            {showDemo && (
              <section aria-label="Demo accounts" className="mt-7 border-t border-border pt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Local demo</p>
                <div className="mt-3 grid gap-2 text-[13px]">
                  <p className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">
                    <span className="font-medium text-slate-900">Admin</span>
                    <span className="mx-2 text-slate-400">·</span>
                    <code>admin@rnd.local</code>
                  </p>
                  <p className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">
                    <span className="font-medium text-slate-900">Employee</span>
                    <span className="mx-2 text-slate-400">·</span>
                    <code>maria.santos@rnd.local</code>
                  </p>
                  <p className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">
                    <span className="font-medium text-slate-900">Password</span>
                    <span className="mx-2 text-slate-400">·</span>
                    <code>Password123!</code>
                  </p>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
