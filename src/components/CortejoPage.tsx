import Link from "next/link";
import Monogram from "./Monogram";

type Props = {
  title: string;
  quote: string;
  paletteTitle: string;
  palette: { name: string; hex: string }[];
  notesTitle: string;
  notes: string[];
};

/** Página especial para o cortejo (amigas / amigos dos noivos). */
export default function CortejoPage({ title, quote, paletteTitle, palette, notesTitle, notes }: Props) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <div className="w-full rounded-3xl border border-rose-border/60 bg-surface/95 p-8 shadow-xl shadow-rose/5">
        <div className="mx-auto mb-4 flex justify-center">
          <Monogram size={84} />
        </div>

        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-rose">Convite Especial</p>
        <h1 className="mt-2 font-serif text-4xl sm:text-5xl font-light text-ink">{title}</h1>
        <p className="mt-4 font-serif text-base italic leading-relaxed text-muted max-w-sm mx-auto">“{quote}”</p>

        <div className="mt-8 w-full border-t border-line/80 pt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose">{paletteTitle}</p>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {palette.map((c) => (
              <div key={c.name} className="flex flex-col items-center rounded-2xl border border-line/70 bg-paper/60 p-3">
                <span
                  className="block h-12 w-12 rounded-full border border-black/10 shadow-2xs"
                  style={{ backgroundColor: c.hex }}
                />
                <span className="mt-2 block text-xs font-medium text-ink">{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 w-full border-t border-line/80 pt-6 text-left">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-sage">{notesTitle}</p>
          <ul className="mt-4 space-y-2 rounded-2xl bg-sage-light/40 border border-sage-border/50 p-4">
            {notes.map((n) => (
              <li key={n} className="flex gap-2.5 text-xs text-ink/85">
                <span className="text-sage font-bold">•</span>
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>

        <Link
          href="/"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-rose px-8 text-[12px] font-semibold uppercase tracking-[0.2em] text-white shadow-md shadow-rose/25 hover:bg-rose/90 transition-all active:scale-98"
        >
          Acessar o Livro Completo
        </Link>
      </div>
    </main>
  );
}
