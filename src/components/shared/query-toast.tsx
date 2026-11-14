"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

/** Shows a one-time toast for `?flag=1` after a redirect, then removes the flag from the URL. */
export function QueryToast({ messages }: { messages: Record<string, string> }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const shown = useRef<string | null>(null);

  useEffect(() => {
    const hit = Object.keys(messages).find((k) => params.get(k));
    if (!hit) {
      shown.current = null;
      return;
    }
    if (shown.current === hit) return;
    shown.current = hit;
    toast.success(messages[hit]);
    const next = new URLSearchParams(params.toString());
    next.delete(hit);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, messages, router, pathname]);

  return null;
}
