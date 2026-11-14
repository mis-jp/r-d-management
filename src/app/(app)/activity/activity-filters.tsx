"use client";

import { Select } from "@/components/ui/form-controls";
import { useSetParams } from "@/components/shared/url-controls";

export function ActivityFilters({ people }: { people: { id: string; name: string }[] }) {
  const { params, setParams } = useSetParams();
  return (
    <div className="flex flex-wrap gap-2 border-b p-4">
      <Select aria-label="Event type" value={params.get("type") ?? ""} onChange={(e) => setParams({ type: e.target.value })} className="w-48">
        <option value="">All events</option>
        <option value="tasks">Task edits</option>
        <option value="assignment">Assignment & claims</option>
        <option value="status">Status & progress</option>
        <option value="discussion">Comments & files</option>
        <option value="users">User accounts</option>
      </Select>
      <Select aria-label="Actor" value={params.get("actor") ?? ""} onChange={(e) => setParams({ actor: e.target.value })} className="w-48">
        <option value="">Anyone</option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
