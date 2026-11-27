"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/form-controls";
import { useSetParams } from "@/components/shared/url-controls";

export function EmployeeFilters() {
  const { params, setParams } = useSetParams();
  const urlQuery = params.get("q") ?? "";
  const [q, setQ] = useState(urlQuery);

  useEffect(() => {
    if (q === urlQuery) return;
    const id = setTimeout(() => setParams({ q: q.trim() || null }), 300);
    return () => clearTimeout(id);
  }, [q, urlQuery, setParams]);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b p-4">
      <div className="relative min-w-52 flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, or employee ID…" className="pl-8" aria-label="Search employees" />
      </div>
      <Select aria-label="Role" value={params.get("role") ?? ""} onChange={(e) => setParams({ role: e.target.value })} className="w-40">
        <option value="">All roles</option>
        <option value="EMPLOYEE">Employees</option>
        <option value="ADMIN">Admins</option>
      </Select>
      <Select aria-label="Account status" value={params.get("status") ?? ""} onChange={(e) => setParams({ status: e.target.value })} className="w-40">
        <option value="">Any status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </Select>
    </div>
  );
}
