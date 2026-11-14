import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/misc";
import { CreateUserForm } from "@/components/employees/user-forms";

export const metadata: Metadata = { title: "Add User" };

export default async function NewEmployeePage() {
  await requireAdmin();
  return (
    <>
      <PageHeader
        title="Add a user"
        description="Create an account for an employee or another administrator. Share the temporary password securely and ask them to change it from My Profile."
      />
      <CreateUserForm />
    </>
  );
}
