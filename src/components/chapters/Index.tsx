"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, Calendar, CheckCircle2, Shirt, Gift, Camera, Music, HelpCircle, Heart } from "lucide-react";
import { CHAPTERS, COUPLE, pad } from "@/lib/wedding";
import type { ChapterProps } from "../Book";
import Monogram from "../Monogram";
import { Eyebrow } from "../ui";

function useCountdown(target: string) {
  const [mounted, setMounted] = useState(false);
  const [diff, setDiff] = useState(0);

  useEffect(() => {
    setMounted(true);
    const update = () => {
      const ms = Math.max(0, new Date(target).getTime() - Date.now());
      setDiff(ms);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [target]);

  // Valores padrão estáveis para SSR / Prerender
  if (!mounted) {
    return { days: 87, hours: 18, minutes: 17, seconds: 0 };
  }

  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

const CHAPTER_ICONS: Record<number, any> = {
  1: Calendar,
  2: CheckCircle2,
  3: Gift,
  4: Shirt,
  5: Music,
  6: HelpCircle,
};

const CHAPTER_COLORS: Record<number, { badge: string; border: string }> = {
  1: { badge: "bg-[#FBF2EF] text-[#C17767]", border: "border-[#E8CBC3]" },
  2: { badge: "bg-[#F0F4ED] text-[#5F6F52]", border: "border-[#C8D4C0]" },
  3: { badge: "bg-[#FBF2EF] text-[#C17767]", border: "border-[#E8CBC3]" },
  4: { badge: "bg-[#FFF9EE] text-[#B38F4D]", border: "border-[#EADBB8]" },
  5: { badge: "bg-[#FFF9EE] text-[#B38F4D]", border: "border-[#EADBB8]" },
  6: { badge: "bg-[#F0F4ED] text-[#5F6F52]", border: "border-[#C8D4C0]" },
};

export default function Index({ goTo }: ChapterProps) {
  const { days, hours, minutes, seconds } = useCountdown(COUPLE.dateISO);

  return (
    <div className="space-y-8">
      {/* Cabeçalho da Capa com Lacre de Cera e Astromélias */}
      <header className="text-center">
        <div className="mx-auto mb-3 flex justify-center">
          <Monogram width={280} variant="astromelias" />
        </div>

        <Eyebrow>{COUPLE.motto}</Eyebrow>

        <h1 className="mt-3 font-serif text-4xl sm:text-5xl font-normal text-[#3E2723] leading-none tracking-tight">
          {COUPLE.bride} <span className="font-serif italic text-[#C17767] font-light">&</span> {COUPLE.groom}
        </h1>

        <div className="mx-auto mt-3 flex items-center justify-center gap-2">
          <span className="h-px w-8 bg-[#C17767]/40" />
          <Heart size={12} className="text-[#C17767]" fill="#C17767" />
          <span className="h-px w-8 bg-[#C17767]/40" />
        </div>

        <p className="mt-3 text-xs font-bold uppercase tracking-[0.35em] text-[#3E2723]/80">
          {COUPLE.dateLabel} · {COUPLE.weekday}
        </p>

        {/* Contador Regressivo com Cartões Acolhedores */}
        <div className="mx-auto mt-6 grid max-w-sm grid-cols-4 gap-2">
          {[
            [days, "Dias"],
            [hours, "Horas"],
            [minutes, "Min"],
            [seconds, "Seg"],
          ].map(([val, label]) => (
            <div
              key={label}
              className="rounded-2xl border border-[#E8CBC3] bg-white p-3 text-center shadow-2xs"
            >
              <span className="font-serif text-2xl sm:text-3xl font-semibold text-[#C17767] tabular-nums block leading-tight">
                {val}
              </span>
              <span className="mt-0.5 text-[9px] uppercase tracking-wider font-bold text-[#6E5F57] block">
                {label}
              </span>
            </div>
          ))}
        </div>

        <blockquote className="mx-auto mt-7 max-w-md text-center">
          <p className="font-antique text-2xl sm:text-[26px] leading-snug text-[#2C1A14]">
            “{COUPLE.verse.text}”
          </p>
          <cite className="mt-1.5 block font-antique text-lg sm:text-xl not-italic tracking-[0.06em] text-[#C17767]">
            — {COUPLE.verse.ref}
          </cite>
        </blockquote>
      </header>

      {/* Sumário / Índice dos Capítulos com Cores e Ícones */}
      <nav
        className="rounded-3xl border border-[#E8CBC3] bg-white p-3.5 shadow-sm space-y-1.5"
        aria-label="Índice dos capítulos"
      >
        <div className="px-3 py-2 border-b border-[#E8CBC3]/40 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#C17767]">
            Índice do Livro
          </span>
          <span className="text-[10px] text-[#6E5F57] uppercase tracking-wider">
            6 Capítulos
          </span>
        </div>

        {CHAPTERS.map((c) => {
          const Icon = CHAPTER_ICONS[c.id] || Calendar;
          const styling = CHAPTER_COLORS[c.id] || { badge: "bg-[#FBF2EF] text-[#C17767]", border: "border-[#E8CBC3]" };

          return (
            <button
              key={c.id}
              type="button"
              onClick={() => goTo(c.id)}
              className="group flex w-full cursor-pointer items-center gap-3.5 rounded-2xl p-3 text-left transition-all hover:bg-[#FBF2EF]/60 active:scale-99 border border-transparent hover:border-[#E8CBC3]/60"
            >
              {/* Badge com número e ícone */}
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-bold ${styling.badge}`}
              >
                <span>{pad(c.id)}</span>
              </span>

              <div className="flex-1 min-w-0">
                <span className="block font-serif text-base font-semibold text-[#3E2723] group-hover:text-[#C17767] transition-colors truncate">
                  {c.title}
                </span>
              </div>

              <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#FAF7F0] text-[#6E5F57] group-hover:text-[#C17767] group-hover:bg-[#FBF2EF] transition-colors">
                <Icon size={15} strokeWidth={2} />
              </span>

              <ArrowRight
                size={16}
                strokeWidth={2}
                className="text-[#6E5F57]/60 group-hover:text-[#C17767] group-hover:translate-x-1 transition-all"
              />
            </button>
          );
        })}
      </nav>

      {/* Banner Fotográfico do Local em Alta Definição */}
      <div className="relative h-48 sm:h-56 w-full overflow-hidden rounded-3xl border border-[#E8CBC3] shadow-md">
        <Image
          src="/assets/venue-villa-imperial.jpg"
          alt="Villa Imperial das Hortênsias ao entardecer"
          fill
          className="object-cover object-center"
          sizes="(max-width: 640px) 100vw, 560px"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#3E2723]/80 via-[#3E2723]/25 to-transparent flex items-end justify-center p-3.5 text-center">
          <p className="text-xs text-white drop-shadow-sm font-serif italic tracking-wide">
            Villa Imperial das Hortênsias · Petrópolis - RJ
          </p>
        </div>
      </div>
    </div>
  );
}
