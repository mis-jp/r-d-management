"use client";

import { loginAction } from "@/server/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Field, FormAlert, Input } from "@/components/ui/form-controls";
import { fieldError } from "@/components/shared/use-action-toast";
import { useFormAction } from "@/components/shared/use-form-action";

export function LoginForm({ next }: { next?: string }) {
  const { state, onSubmit, pending } = useFormAction(loginAction);
  const emailError = fieldError(state, "email");
  const passwordError = fieldError(state, "password");

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      {state && !state.ok && !state.fieldErrors && <FormAlert message={state.error} />}
      <Field label="Email" htmlFor="email" error={emailError}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          aria-invalid={!!emailError}
          aria-describedby={emailError ? "email-error" : undefined}
        />
      </Field>
      <Field label="Password" htmlFor="password" error={passwordError}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={!!passwordError}
          aria-describedby={passwordError ? "password-error" : undefined}
        />
      </Field>
      <Button type="submit" className="w-full" loading={pending}>
        Sign in
      </Button>
    </form>
  );
}
