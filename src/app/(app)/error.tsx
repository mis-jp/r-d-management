"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";

function isConnectivityMessage(message: string) {
  return /Can't reach database server|P1001|P1002|P1017|ETIMEDOUT|ECONNRESET|ECONNREFUSED/i.test(message);
}

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const dbDown = isConnectivityMessage(error.message);
  return (
    <div className="rounded-xl border bg-surface">
      <EmptyState
        icon={<AlertTriangle />}
        title={dbDown ? "Database temporarily unreachable" : "Something went wrong loading this page"}
        description={
          dbDown ? (
            "The database connection dropped. Wait a moment and try again."
          ) : (
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
          )
        }
        action={<Button onClick={reset}>Try again</Button>}
      />
    </div>
  );
}
