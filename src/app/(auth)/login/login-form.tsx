"use client";

import { loginAction } from "@/server/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Field, FormAlert, Input } from "@/components/ui/form-controls";
import { PasswordInput } from "@/components/ui/password-input";
import { fieldError } from "@/components/shared/use-action-toast";
import { useFormAction } from "@/components/shared/use-form-action";

export function LoginForm({ next }: { next?: string }) {
  const { state, onSubmit, pending } = useFormAction(loginAction);
  const emailError = fieldError(state, "email");
  const passwordError = fieldError(state, "password");

  return (
    <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      {state && !state.ok && !state.fieldErrors && <FormAlert message={state.error} />}
      <Field label="Email" htmlFor="email" error={emailError}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          placeholder="you@rnd.local"
          aria-invalid={!!emailError}
          aria-describedby={emailError ? "email-error" : undefined}
        />
      </Field>
      <Field label="Password" htmlFor="password" error={passwordError}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          placeholder="Enter your password"
          aria-invalid={!!passwordError}
          aria-describedby={passwordError ? "password-error" : undefined}
        />
      </Field>
      <Button type="submit" className="mt-1 w-full" size="lg" loading={pending}>
        Sign in
      </Button>
    </form>
  );
}
