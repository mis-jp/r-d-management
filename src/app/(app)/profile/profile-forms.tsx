"use client";

import { useRef, useState } from "react";
import { changePasswordAction, updateProfileAction } from "@/server/actions/user-actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, FormAlert, Input } from "@/components/ui/form-controls";
import { PasswordInput } from "@/components/ui/password-input";
import { fieldError, useActionToast } from "@/components/shared/use-action-toast";
import { useFormAction } from "@/components/shared/use-form-action";
import { ProfileFields, type EditableUser } from "@/components/employees/user-forms";

export function ProfileForm({ user }: { user: EditableUser }) {
  const { state, onSubmit, pending } = useFormAction(updateProfileAction);
  const [email, setEmail] = useState(user.email);
  useActionToast(state);
  const err = (n: string) => fieldError(state, n);
  const emailChanged = email.trim().toLowerCase() !== user.email;

  return (
    <Card>
      <CardHeader title="Personal information" />
      <CardBody>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {state && !state.ok && !state.fieldErrors && <FormAlert message={state.error} />}
          <ProfileFields user={user} errors={err} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="profile-email" required error={err("email")}>
              <Input id="profile-email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </Field>
            {emailChanged && (
              <Field
                label="Current password"
                htmlFor="profile-current-password"
                required
                hint="Required to change your email address."
                error={err("currentPassword")}
              >
                <PasswordInput id="profile-current-password" name="currentPassword" autoComplete="current-password" />
              </Field>
            )}
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={pending}>
              Save profile
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

export function ChangePasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const { state, onSubmit, pending } = useFormAction(changePasswordAction);
  useActionToast(state, () => formRef.current?.reset());
  const err = (n: string) => fieldError(state, n);

  return (
    <Card>
      <CardHeader title="Change password" description="You'll stay signed in here; other sessions will be signed out." />
      <CardBody>
        <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4">
          {state && !state.ok && !state.fieldErrors && <FormAlert message={state.error} />}
          <Field label="Current password" htmlFor="currentPassword" required error={err("currentPassword")}>
            <PasswordInput id="currentPassword" name="currentPassword" autoComplete="current-password" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="New password" htmlFor="newPassword" required error={err("newPassword")} hint="At least 10 characters with a letter and a number.">
              <PasswordInput id="newPassword" name="newPassword" autoComplete="new-password" />
            </Field>
            <Field label="Confirm new password" htmlFor="confirmPassword" required error={err("confirmPassword")}>
              <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={pending}>
              Update password
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
