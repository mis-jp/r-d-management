import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";

export default function NotFound() {
  return (
    <div className="rounded-xl border bg-surface">
      <EmptyState
        icon={<SearchX />}
        title="We couldn't find that"
        description="It may have been moved, archived, or you may not have access to it."
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to overview</Link>
          </Button>
        }
      />
    </div>
  );
}
