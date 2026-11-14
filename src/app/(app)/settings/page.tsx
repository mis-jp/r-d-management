import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { listTags } from "@/server/repositories/task-repository";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { TagManager } from "./tag-manager";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdmin();
  const tags = await listTags();
  return (
    <>
      <PageHeader title="Settings" description="Workspace configuration for the R&D department." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TagManager tags={tags.map((t) => ({ id: t.id, name: t.name, color: t.color, count: t._count.tasks }))} />
        </div>
        <Card>
          <CardHeader title="Other settings" />
          <CardBody className="space-y-3 text-sm text-slate-600">
            <p>
              Manage accounts on the{" "}
              <Link href="/employees" className="font-medium text-brand-700 hover:underline">
                Employees
              </Link>{" "}
              page.
            </p>
            <p>
              Update your own name, contact details and password from{" "}
              <Link href="/profile" className="font-medium text-brand-700 hover:underline">
                My Profile
              </Link>
              .
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
