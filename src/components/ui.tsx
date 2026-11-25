"use client";

import { useEffect, type ComponentProps, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { PAGE_VERSES } from "@/lib/wedding";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ------------------------------------------------------------------ */
/* Botões                                                              */
/* ------------------------------------------------------------------ */

type Variant = "primary" | "sage" | "outline" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-[13px] font-semibold tracking-wide transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-98";

const variants: Record<Variant, string> = {
  primary: "bg-[#C17767] text-white shadow-md shadow-[#C17767]/25 hover:bg-[#B36858] hover:shadow-lg",
  sage: "bg-[#5F6F52] text-white shadow-md shadow-[#5F6F52]/25 hover:bg-[#526046] hover:shadow-lg",
  outline: "border border-[#E8CBC3] bg-white text-[#3E2723] hover:border-[#C17767] hover:bg-[#FAF7F0]",
  ghost: "text-[#6E5F57] hover:text-[#C17767]",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type="button" className={cx(base, variants[variant], className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  className,
  external = true,
  ...props
}: ComponentProps<"a"> & { variant?: Variant; external?: boolean }) {
  return (
    <a
      className={cx(base, variants[variant], className)}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Tipografia & Cabeçalhos                                            */
/* ------------------------------------------------------------------ */

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cx("text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C17767]", className)}>
      {children}
    </p>
  );
}

export function ChapterHeader({ num, title, intro }: { num: string; title: string; intro?: ReactNode }) {
  const pageIdx = parseInt(num, 10);
  const pageVerse = !isNaN(pageIdx) ? PAGE_VERSES[pageIdx] : undefined;
  const introStr = typeof intro === "string" ? intro : "";
  const showIntroSubtitle =
    intro &&
    (!pageVerse || (!introStr.includes(pageVerse.ref) && !introStr.includes(pageVerse.text.slice(0, 15))));

  return (
    <header className="mb-7 text-center">
      <span className="inline-block rounded-full bg-[#C17767]/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-[#C17767]">
        — Capítulo {num} —
      </span>
      <h1 className="mt-2.5 font-serif text-3xl sm:text-4xl font-semibold text-[#3E2723] leading-tight">
        {title}
      </h1>
      <div className="mx-auto mt-3 flex items-center justify-center gap-2">
        <span className="h-px w-8 bg-[#C17767]/40" />
        <span className="text-xs text-[#5F6F52]">🌿</span>
        <span className="h-px w-8 bg-[#C17767]/40" />
      </div>
      {pageVerse && (
        <blockquote className="mx-auto mt-3.5 max-w-md text-center">
          <p className="font-antique text-xl sm:text-2xl text-[#2C1A14] leading-snug">
            “{pageVerse.text}”
          </p>
          <cite className="mt-1.5 block font-antique text-lg sm:text-xl text-[#C17767] not-italic tracking-wide">
            — {pageVerse.ref}
          </cite>
        </blockquote>
      )}
      {showIntroSubtitle && (
        <p className="mx-auto mt-3 max-w-lg font-sans text-xs sm:text-[13px] font-medium not-italic text-[#4A3B32] leading-relaxed">
          {intro}
        </p>
      )}
    </header>
  );
}

export function Section({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cx("mt-8 first:mt-0", className)}>
      {title && <Eyebrow className="mb-3">{title}</Eyebrow>}
      {children}
    </section>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-[#E8E2D8] bg-white p-5 shadow-xs transition-all hover:border-[#D28C81]/60",
        className
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Formulários                                                         */
/* ------------------------------------------------------------------ */

const field =
  "w-full rounded-xl border border-[#E8E2D8] bg-[#FAF9F6] px-4 text-sm text-[#3E2723] placeholder:text-[#6E5F57]/60 transition-colors focus:border-[#C17767] focus:bg-white focus:outline-none";

export function Input({ label, className, ...props }: ComponentProps<"input"> & { label?: string }) {
  return (
    <label className="block text-left">
      {label && <span className="mb-1.5 block text-xs font-semibold text-[#3E2723]">{label}</span>}
      <input className={cx(field, "h-11", className)} {...props} />
    </label>
  );
}

export function Textarea({ label, className, ...props }: ComponentProps<"textarea"> & { label?: string }) {
  return (
    <label className="block text-left">
      {label && <span className="mb-1.5 block text-xs font-semibold text-[#3E2723]">{label}</span>}
      <textarea className={cx(field, "resize-none py-2.5", className)} {...props} />
    </label>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[#C8D4C0] bg-[#EFF3EC] px-4 py-2.5 text-center text-xs font-semibold text-[#5F6F52] shadow-2xs"
    >
      {children}
    </motion.p>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly { value: T; label: string; icon?: string }[];
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cx(
        "grid auto-cols-fr grid-flow-col gap-1 rounded-full border border-[#E8E2D8] bg-white p-1 shadow-2xs",
        className
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cx(
              "flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full px-4 text-xs font-semibold transition-all",
              active
                ? "bg-[#C17767] text-white shadow-xs"
                : "text-[#6E5F57] hover:text-[#3E2723]"
            )}
          >
            {o.icon && <span>{o.icon}</span>}
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

export function Modal({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // Trava a rolagem da página ao fundo quando o modal estiver aberto
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cx(
              "relative w-full max-w-sm sm:max-w-md max-h-[92dvh] overflow-y-auto rounded-3xl border border-[#E8CBC3] bg-[#FAF9F6] p-4 sm:p-6 shadow-2xl overscroll-contain",
              className
            )}
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="absolute top-3.5 right-3.5 z-20 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-white/90 text-[#3E2723] shadow-xs hover:bg-white hover:text-black transition-colors"
            >
              <X size={18} strokeWidth={2} />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
