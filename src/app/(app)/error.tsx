"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-xl border bg-surface">
      <EmptyState
        icon={<AlertTriangle />}
        title="Something went wrong loading this page"
        description={
          <>
            Please try again. If the problem continues, contact your administrator
            {error.digest ? (
              <>
                {" "}
                and mention reference <code className="text-xs">{error.digest}</code>
              </>
            ) : null}
            .
          </>
        }
        action={<Button onClick={reset}>Try again</Button>}
      />
    </div>
  );
}
