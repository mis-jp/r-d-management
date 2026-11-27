import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/constants";
import { getOwnProfile } from "@/server/services/user-service";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, Badge, PageHeader } from "@/components/ui/misc";
import { LocalTime } from "@/components/shared/local-time";
import { ChangePasswordForm, ProfileForm } from "./profile-forms";

export const metadata: Metadata = { title: "My Profile" };

export default async function ProfilePage() {
  const session = await requireUser();
  const user = await getOwnProfile(session.id);

  return (
    <>
      <PageHeader title="My profile" description="Update your personal information, contact details, and password." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ProfileForm
            user={{
              id: user.id,
              name: user.name,
              email: user.email,
              employeeId: user.employeeId,
              role: user.role,
              jobTitle: user.jobTitle,
              department: user.department,
              phone: user.phone,
              bio: user.bio,
              avatarColor: user.avatarColor,
            }}
          />
          <ChangePasswordForm />
        </div>
        <div className="space-y-6">
          <Card>
            <CardBody className="flex flex-col items-center text-center">
              <Avatar name={user.name} color={user.avatarColor} size="xl" />
              <p className="mt-3 text-lg font-semibold">{user.name}</p>
              <p className="text-sm text-slate-500">{user.jobTitle ?? "No job title set"}</p>
              <Badge className="mt-2 border-brand-200 bg-brand-50 text-brand-700">{ROLE_LABELS[user.role]}</Badge>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Account" />
            <CardBody>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Employee ID</dt>
                  <dd className="font-mono">{user.employeeId ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Email</dt>
                  <dd className="truncate">{user.email}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Role</dt>
                  <dd>{ROLE_LABELS[user.role]}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Last sign-in</dt>
                  <dd>{user.lastLoginAt ? <LocalTime value={user.lastLoginAt} /> : "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Member since</dt>
                  <dd>
                    <LocalTime value={user.createdAt} />
                  </dd>
                </div>
              </dl>
              <p className="mt-3 border-t pt-3 text-xs text-slate-500">
                Your role can only be changed by another administrator.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
