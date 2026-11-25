"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import Monogram from "./Monogram";

export function AdminShell<T extends string>({
  role,
  title,
  tabs,
  active,
  onTab,
  actions,
  wide = false,
  children,
}: {
  role: string;
  title: string;
  tabs: readonly { key: T; label: string }[];
  active: T;
  onTab: (k: T) => void;
  actions?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  const containerClass = wide ? "max-w-[1780px] w-full px-4 sm:px-8" : "max-w-6xl px-6";

  return (
    <div className="min-h-dvh" suppressHydrationWarning>
      <header className="border-b border-line/80 bg-surface/95 backdrop-blur-xs" suppressHydrationWarning>
        <div className={`mx-auto flex ${containerClass} flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between`}>
          <div className="flex items-center gap-4">
            <Monogram size={48} />
            <div>
              <span className="inline-block rounded-md bg-rose/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose">
                {role}
              </span>
              <h1 className="font-serif text-2xl text-ink font-normal mt-0.5">{title}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">{actions}</div>
        </div>
        <nav className={`no-scrollbar mx-auto flex ${containerClass} gap-6 overflow-x-auto`}>
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              suppressHydrationWarning
              onClick={() => onTab(t.key)}
              className={`cursor-pointer border-b-2 py-3 text-[13px] whitespace-nowrap transition-colors ${
                active === t.key
                  ? "border-rose text-rose font-semibold"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main className={`mx-auto ${containerClass} space-y-6 py-8`}>{children}</main>
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-line/80 bg-surface/95 p-6 shadow-2xs">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-light text-ink">{title}</h2>
          {description && <p className="mt-1 text-xs text-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border border-rose-border/50 bg-surface/90 p-5 shadow-2xs">
      <p className="text-[10.5px] uppercase tracking-[0.2em] font-semibold text-rose">{label}</p>
      <p className="mt-2 font-serif text-4xl font-light text-ink">{value}</p>
      {hint && <p className="mt-1.5 text-[11.5px] text-muted">{hint}</p>}
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-[10.5px] uppercase tracking-[0.15em] font-semibold text-muted">
            {head.map((h) => (
              <th key={h} className="py-3 pr-4 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export const adminBtn =
  "inline-flex h-9 items-center rounded-full border border-line bg-surface px-4 text-[12px] font-medium text-ink transition-colors hover:border-rose-border hover:bg-rose-light/40 cursor-pointer shadow-2xs";
export const adminBtnPrimary =
  "inline-flex h-9 items-center rounded-full bg-rose px-4 text-[12px] font-semibold text-white shadow-xs shadow-rose/20 transition-all hover:bg-rose/90 cursor-pointer";

export function AdminLink({ href, children, primary }: { href: string; children: ReactNode; primary?: boolean }) {
  return (
    <Link href={href} className={primary ? adminBtnPrimary : adminBtn}>
      {children}
    </Link>
  );
}
