"use client";

import Image from "next/image";
import { COUPLE } from "@/lib/wedding";

export default function Intro({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="relative flex min-h-dvh w-full flex-col items-center justify-center px-4 py-6">
      {/* Card Envelope com Arte Oficial */}
      <div className="relative mx-auto flex w-full max-w-[365px] sm:max-w-[400px] flex-col items-center overflow-hidden rounded-3xl border border-[#E8CBC3] bg-[#FAF9F6] shadow-2xl">
        <div
          onClick={onOpen}
          className="relative aspect-[9/14] w-full cursor-pointer overflow-hidden group select-none"
          title="Toque para abrir seu convite"
        >
          <Image
            src="/assets/envelope-closed.png"
            alt={`Convite de Casamento ${COUPLE.bride} & ${COUPLE.groom}`}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-102"
            priority
            sizes="(max-width: 640px) 100vw, 400px"
          />

          {/* Área de Toque com Pulso no Lacre de Cera Central */}
          <div
            className="absolute left-1/2 top-[53%] -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full cursor-pointer flex items-center justify-center"
            onClick={onOpen}
          >
            <span className="absolute inset-0 rounded-full bg-[#C17767]/30 animate-ping opacity-75" />
          </div>

          {/* Rodapé com Botão de Destaque */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#FAF9F6] via-[#FAF9F6]/85 to-transparent pt-14 pb-5 px-5 text-center">
            <button
              type="button"
              onClick={onOpen}
              className="inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-full bg-[#C17767] px-6 text-xs font-bold uppercase tracking-[0.25em] text-white shadow-lg shadow-[#C17767]/35 transition-all hover:bg-[#B36858] active:scale-98"
            >
              Abrir o Convite ›
            </button>
            <p className="mt-2.5 font-serif text-xs italic text-[#6E5F57]">
              {COUPLE.bride} & {COUPLE.groom} · {COUPLE.dateLabel}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
