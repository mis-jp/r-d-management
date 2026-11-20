import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Compact mark for the collapsed sidebar; wide banner everywhere else. */
  mark?: boolean;
  priority?: boolean;
};

/**
 * Brand logo. Ships as AVIF + WebP under `/public/brand`. The UI uses WebP for
 * broad browser support; the AVIF copy is kept for the smallest asset size.
 * Transparent variants knock out the original black matte so the mark sits
 * cleanly on colored panels.
 */
export function BrandLogo({ className, mark = false, priority = false }: Props) {
  const base = mark ? "/brand/rd-management-mark-transparent" : "/brand/rd-management-logo-transparent";
  const size = mark
    ? { width: 40, height: 40, className: cn("size-8 object-contain", className) }
    : { width: 320, height: 180, className: cn("h-9 w-auto max-w-full object-contain", className) };

  return (
    // eslint-disable-next-line @next/next/no-img-element -- static brand asset
    <img
      src={`${base}.webp`}
      alt="R&D Management"
      width={size.width}
      height={size.height}
      className={size.className}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
    />
  );
}
