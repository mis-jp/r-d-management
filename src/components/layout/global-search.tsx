"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { ArrowRight, Loader2, Search } from "lucide-react";
import type { QuickSearchResult } from "@/server/services/search-service";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/misc";
import { StatusBadge } from "@/components/tasks/badges";

const DEBOUNCE_MS = 200;

type Option =
  | { kind: "task"; href: string; task: QuickSearchResult["tasks"][number] }
  | { kind: "person"; href: string; person: QuickSearchResult["people"][number] }
  | { kind: "all"; href: string };

function Highlight({ text, query }: { text: string; query: string }) {
  const index = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-amber-100 text-inherit">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}

export function GlobalSearch({ role }: { role: Role }) {
  const router = useRouter();
  const listId = useId();
  const containerRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<QuickSearchResult | null>(null);
  const [resultsFor, setResultsFor] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const isAdmin = role === "ADMIN";
  const listPage = isAdmin ? "/tasks" : "/my-tasks";
  const query = q.trim();

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        setResults((await res.json()) as QuickSearchResult);
        setResultsFor(query);
        setActive(-1);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setResults({ tasks: [], people: [] });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      const typing = target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if ((event.key === "k" && (event.ctrlKey || event.metaKey)) || (event.key === "/" && !typing)) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const shown = query && results ? results : null;
  const options: Option[] = shown
    ? [
        ...shown.tasks.map((task) => ({ kind: "task" as const, href: `/tasks/${task.taskKey}`, task })),
        ...shown.people.map((person) => ({ kind: "person" as const, href: `/employees/${person.id}`, person })),
        { kind: "all" as const, href: `${listPage}?q=${encodeURIComponent(query)}` },
      ]
    : [];
  const showPanel = open && query.length > 0;
  const stale = loading || resultsFor !== query;

  function go(href: string) {
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
    router.push(href);
  }

  function submit() {
    const chosen = options[active];
    go(chosen ? chosen.href : query ? `${listPage}?q=${encodeURIComponent(query)}` : listPage);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    } else if (event.key === "ArrowDown" && options.length) {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % options.length);
    } else if (event.key === "ArrowUp" && options.length) {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (event.key === "Escape") {
      if (open) setOpen(false);
      else inputRef.current?.blur();
    }
  }

  const optionId = (i: number) => `${listId}-opt-${i}`;
  const peopleOffset = shown?.tasks.length ?? 0;
  const allIndex = options.length - 1;

  return (
    <form
      ref={containerRef}
      role="search"
      className="relative hidden md:block"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <label htmlFor="global-search" className="sr-only">
        Search
      </label>
      <input
        ref={inputRef}
        id="global-search"
        type="search"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showPanel && active >= 0 ? optionId(active) : undefined}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={isAdmin ? "Search tasks, keys, people…" : "Search tasks…"}
        className="h-9 w-64 rounded-lg border bg-slate-50 pl-8 pr-8 text-sm placeholder:text-slate-400 focus:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/25 lg:w-80 [&::-webkit-search-cancel-button]:hidden"
      />
      {loading ? (
        <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-slate-400" aria-hidden />
      ) : (
        !q && (
          <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border bg-surface px-1.5 text-[10px] font-medium text-slate-400 lg:block">
            Ctrl K
          </kbd>
        )
      )}

      {showPanel && (
        <div
          id={listId}
          role="listbox"
          aria-label="Search suggestions"
          className="absolute right-0 top-full z-50 mt-1.5 w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-surface shadow-lg"
        >
          <div className={cn("max-h-[70vh] overflow-y-auto p-1.5 transition-opacity", stale && shown && "opacity-60")}>
            {!shown ? (
              <p className="px-3 py-6 text-center text-sm text-slate-500">Searching…</p>
            ) : (
              <>
                {shown.tasks.length === 0 && shown.people.length === 0 && !stale && (
                  <p className="px-3 py-6 text-center text-sm text-slate-500">
                    No matches for “<span className="font-medium text-slate-700">{query}</span>”
                  </p>
                )}

                {shown.tasks.length > 0 && (
                  <div role="group" aria-label="Tasks">
                    <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tasks</p>
                    {shown.tasks.map((task, index) => {
                      return (
                        <SuggestionRow key={task.id} id={optionId(index)} active={active === index} onHover={() => setActive(index)} onPick={() => go(options[index]!.href)}>
                          <span className="w-16 shrink-0 font-mono text-xs font-semibold text-brand-700">
                            <Highlight text={task.taskKey} query={resultsFor} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-slate-900">
                              <Highlight text={task.title} query={resultsFor} />
                            </span>
                            <span className="block truncate text-xs text-slate-500">
                              {task.assignee ? task.assignee.name : "Open · unassigned"}
                            </span>
                          </span>
                          <StatusBadge status={task.status} className="shrink-0" />
                        </SuggestionRow>
                      );
                    })}
                  </div>
                )}

                {shown.people.length > 0 && (
                  <div role="group" aria-label="People" className="mt-1">
                    <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">People</p>
                    {shown.people.map((person, i) => {
                      const index = peopleOffset + i;
                      return (
                        <SuggestionRow key={person.id} id={optionId(index)} active={active === index} onHover={() => setActive(index)} onPick={() => go(options[index]!.href)}>
                          <Avatar name={person.name} color={person.avatarColor} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-slate-900">
                              <Highlight text={person.name} query={resultsFor} />
                              {!person.isActive && <span className="ml-1.5 text-xs text-slate-400">(inactive)</span>}
                            </span>
                            <span className="block truncate text-xs text-slate-500">
                              <Highlight text={person.jobTitle ?? person.email} query={resultsFor} />
                            </span>
                          </span>
                        </SuggestionRow>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
          {shown && (
            <div className="border-t p-1.5">
              <SuggestionRow id={optionId(allIndex)} active={active === allIndex} onHover={() => setActive(allIndex)} onPick={() => go(options[allIndex]!.href)}>
                <Search className="size-4 text-slate-400" aria-hidden />
                <span className="flex-1 truncate text-sm text-slate-700">
                  See all task results for “<span className="font-medium">{query}</span>”
                </span>
                <ArrowRight className="size-4 text-slate-400" aria-hidden />
              </SuggestionRow>
            </div>
          )}
        </div>
      )}
    </form>
  );
}

function SuggestionRow({
  id,
  active,
  onHover,
  onPick,
  children,
}: {
  id: string;
  active: boolean;
  onHover: () => void;
  onPick: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <div
      ref={ref}
      id={id}
      role="option"
      aria-selected={active}
      onMouseEnter={onHover}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPick}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2",
        active ? "bg-brand-50 ring-1 ring-brand-200 ring-inset" : "hover:bg-slate-50",
      )}
    >
      {children}
    </div>
  );
}
