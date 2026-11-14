"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Role } from "@prisma/client";
import { KeyRound, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { AVATAR_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  createUserAction,
  resetPasswordAction,
  setUserActiveAction,
  updateUserAction,
} from "@/server/actions/user-actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, FormAlert, Input, Select, Textarea } from "@/components/ui/form-controls";
import { fieldError, useActionToast } from "@/components/shared/use-action-toast";
import { useFormAction } from "@/components/shared/use-form-action";

export type EditableUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  jobTitle: string | null;
  department: string | null;
  phone: string | null;
  bio: string | null;
  avatarColor: string | null;
};

export function AvatarColorPicker({ name, defaultValue }: { name: string; defaultValue?: string | null }) {
  const [value, setValue] = useState(defaultValue ?? AVATAR_COLORS[0]!);
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-700">Avatar color</legend>
      <input type="hidden" name={name} value={value} />
      <div className="mt-1.5 flex flex-wrap gap-2">
        {AVATAR_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setValue(c)}
            aria-label={`Color ${c}`}
            aria-pressed={value === c}
            className={cn("size-7 rounded-full ring-offset-2 transition", value === c && "ring-2 ring-slate-900")}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </fieldset>
  );
}

/** Shared profile fields used by both admin user forms and the self-service profile form. */
export function ProfileFields({
  user,
  errors,
}: {
  user?: Partial<EditableUser>;
  errors: (name: string) => string[] | undefined;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="name" required error={errors("name")}>
          <Input id="name" name="name" defaultValue={user?.name ?? ""} autoComplete="name" aria-invalid={!!errors("name")} />
        </Field>
        <Field label="Job title" htmlFor="jobTitle" error={errors("jobTitle")}>
          <Input id="jobTitle" name="jobTitle" defaultValue={user?.jobTitle ?? ""} placeholder="e.g. Research Engineer" />
        </Field>
        <Field label="Department" htmlFor="department" error={errors("department")}>
          <Input id="department" name="department" defaultValue={user?.department ?? "Research & Development"} />
        </Field>
        <Field label="Phone" htmlFor="phone" error={errors("phone")}>
          <Input id="phone" name="phone" type="tel" defaultValue={user?.phone ?? ""} autoComplete="tel" />
        </Field>
      </div>
      <Field label="Bio" htmlFor="bio" error={errors("bio")} hint="Areas of expertise, current focus, etc.">
        <Textarea id="bio" name="bio" rows={3} maxLength={1000} defaultValue={user?.bio ?? ""} />
      </Field>
      <AvatarColorPicker name="avatarColor" defaultValue={user?.avatarColor} />
    </>
  );
}

export function CreateUserForm() {
  const { state, onSubmit, pending } = useFormAction(createUserAction);
  useActionToast(state);
  const err = (n: string) => fieldError(state, n);
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {state && !state.ok && <FormAlert message={state.error} />}
        <Card>
          <CardHeader title="Profile" />
          <CardBody className="space-y-4">
            <ProfileFields errors={err} />
          </CardBody>
        </Card>
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader title="Account" />
          <CardBody className="space-y-4">
            <Field label="Email" htmlFor="email" required error={err("email")}>
              <Input id="email" name="email" type="email" autoComplete="off" aria-invalid={!!err("email")} />
            </Field>
            <Field label="Role" htmlFor="role" error={err("role")} hint="Admins manage tasks and users; employees work on tasks.">
              <Select id="role" name="role" defaultValue="EMPLOYEE">
                <option value="EMPLOYEE">Employee</option>
                <option value="ADMIN">Admin</option>
              </Select>
            </Field>
            <Field label="Temporary password" htmlFor="password" required error={err("password")} hint="At least 10 characters with a letter and a number.">
              <Input id="password" name="password" type="password" autoComplete="new-password" aria-invalid={!!err("password")} />
            </Field>
            <Field label="Confirm password" htmlFor="confirmPassword" required error={err("confirmPassword")}>
              <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" />
            </Field>
          </CardBody>
        </Card>
        <div className="flex gap-2">
          <Button type="submit" loading={pending} className="flex-1">
            Create account
          </Button>
          <Button asChild variant="outline">
            <Link href="/employees">Cancel</Link>
          </Button>
        </div>
      </div>
    </form>
  );
}

export function EditUserForm({ user, isSelf }: { user: EditableUser; isSelf: boolean }) {
  const { state, onSubmit, pending } = useFormAction(updateUserAction);
  useActionToast(state);
  const err = (n: string) => fieldError(state, n);
  return (
    <Card>
      <CardHeader title="Edit account" description="Changing the role signs the user out so new permissions apply immediately." />
      <CardBody>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <input type="hidden" name="userId" value={user.id} />
          {state && !state.ok && state.fieldErrors && <FormAlert message={state.error} />}
          <ProfileFields user={user} errors={err} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="email" required error={err("email")}>
              <Input id="email" name="email" type="email" defaultValue={user.email} />
            </Field>
            <Field label="Role" htmlFor="role" error={err("role")} hint={isSelf ? "You cannot change your own role." : undefined}>
              {isSelf && <input type="hidden" name="role" value={user.role} />}
              <Select id="role" name={isSelf ? undefined : "role"} defaultValue={user.role} disabled={isSelf}>
                <option value="EMPLOYEE">Employee</option>
                <option value="ADMIN">Admin</option>
              </Select>
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={pending}>
              Save changes
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

export function AccountControls({
  user,
  isActive,
  isSelf,
}: {
  user: { id: string; name: string };
  isActive: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const reset = useFormAction(resetPasswordAction);
  useActionToast(reset.state, () => setResetOpen(false));

  return (
    <Card>
      <CardHeader title="Access" />
      <CardBody className="space-y-2">
        {!isSelf && (
          <Button variant="outline" className="w-full justify-start" onClick={() => setResetOpen(true)}>
            <KeyRound /> Reset password
          </Button>
        )}
        {isSelf ? (
          <p className="text-xs text-slate-500">
            Manage your own password from{" "}
            <Link href="/profile" className="text-brand-700 underline">
              My Profile
            </Link>
            .
          </p>
        ) : isActive ? (
          <Button variant="outline" className="w-full justify-start text-red-700" onClick={() => setConfirm(true)}>
            <UserX /> Deactivate account
          </Button>
        ) : (
          <Button
            variant="outline"
            className="w-full justify-start text-emerald-700"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await setUserActiveAction(user.id, true);
                if (res.ok) toast.success(res.message ?? "Activated.");
                else toast.error(res.error);
                router.refresh();
              })
            }
          >
            <UserCheck /> Activate account
          </Button>
        )}
      </CardBody>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent
          title={`Deactivate ${user.name}?`}
          description="They will be signed out immediately and won't be able to sign in. Their tasks and history are kept; reassign their active tasks if needed."
        >
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await setUserActiveAction(user.id, false);
                  setConfirm(false);
                  if (res.ok) toast.success(res.message ?? "Deactivated.");
                  else toast.error(res.error);
                })
              }
            >
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent title={`Reset password for ${user.name}`} description="They will be signed out of all sessions. Share the new password securely.">
          <form onSubmit={reset.onSubmit} noValidate className="space-y-3">
            <input type="hidden" name="userId" value={user.id} />
            <Field label="New password" htmlFor="reset-password" error={fieldError(reset.state, "password")} hint="At least 10 characters with a letter and a number.">
              <Input id="reset-password" name="password" type="password" autoComplete="new-password" />
            </Field>
            <Field label="Confirm password" htmlFor="reset-confirm" error={fieldError(reset.state, "confirmPassword")}>
              <Input id="reset-confirm" name="confirmPassword" type="password" autoComplete="new-password" />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={reset.pending}>
                Reset password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
