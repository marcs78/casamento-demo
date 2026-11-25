"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowUpRight, BedDouble, ChevronDown, HelpCircle, MessageCircle, MapPin } from "lucide-react";
import { FAQ, HOTELS, PLANNER_PHONE, PLANNER_WHATSAPP } from "@/lib/wedding";
import { ChapterHeader, LinkButton, Section } from "../ui";
import type { ChapterProps } from "../Book";

export default function Informacoes({ goTo }: Partial<ChapterProps>) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-6">
      <ChapterHeader
        num="06"
        title="Informações & Dúvidas"
        intro="Tudo o que você precisa saber para viver este dia com alegria e tranquilidade."
      />

      {/* Accordion de Perguntas Frequentes */}
      <div className="space-y-3">
        {FAQ.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={item.q}
              className="rounded-2xl border border-[#E8CBC3] bg-white overflow-hidden shadow-2xs transition-all hover:border-[#C17767]"
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full cursor-pointer items-center justify-between gap-3 p-4 text-left transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#FBF2EF] text-[#C17767] text-xs font-semibold">
                    <HelpCircle size={17} strokeWidth={2} />
                  </span>
                  <span className="font-serif text-base font-semibold text-[#3E2723] leading-snug">
                    {item.q}
                  </span>
                </div>
                <ChevronDown
                  size={18}
                  strokeWidth={2}
                  className={`shrink-0 text-[#6E5F57] transition-transform duration-300 ${
                    isOpen ? "rotate-180 text-[#C17767]" : ""
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 animate-in fade-in duration-200">
                  <div className="rounded-xl bg-[#FAF7F0] p-3.5 text-xs leading-relaxed text-[#3E2723]/90 border border-[#E8CBC3]/40 space-y-2.5">
                    <p>{item.a}</p>
                    {item.action && (
                      <div className="pt-2 border-t border-[#E8CBC3]/50 flex flex-wrap items-center gap-2">
                        {item.action.url ? (
                          <a
                            href={item.action.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#C17767] hover:bg-[#a66152] px-4 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
                          >
                            <MapPin size={13} />
                            <span>{item.action.label}</span>
                            <ArrowUpRight size={13} />
                          </a>
                        ) : typeof item.action.chapter === "number" && goTo ? (
                          <button
                            type="button"
                            onClick={() => goTo(item.action!.chapter!)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] px-4 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
                          >
                            <span>{item.action.label}</span>
                            <ArrowUpRight size={13} />
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hotéis e Pousadas Próximas */}
      <Section title="Hotéis e Pousadas em Petrópolis" className="mt-8">
        <div className="grid gap-2.5 sm:grid-cols-2">
          {HOTELS.map((h) => (
            <a
              key={h.name}
              href={h.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-2.5 rounded-2xl border border-[#E8CBC3] bg-white p-3.5 shadow-2xs transition-all hover:border-[#5F6F52] hover:shadow-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#F0F4ED] text-[#5F6F52]">
                  <BedDouble size={16} strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <span className="block text-xs font-semibold text-[#3E2723] leading-snug group-hover:text-[#5F6F52] transition-colors">
                    {h.name}
                  </span>
                  {h.area && (
                    <span className="block text-[10.5px] text-[#6E5F57] truncate">
                      {h.area}
                    </span>
                  )}
                </div>
              </div>
              <ArrowUpRight
                size={14}
                strokeWidth={2}
                className="shrink-0 text-[#6E5F57] group-hover:text-[#5F6F52] transition-colors"
              />
            </a>
          ))}
        </div>
      </Section>

      {/* Card da Cerimonialista */}
      <div className="mt-8 rounded-3xl border border-[#E8CBC3] bg-[#FAF9F6] p-6 text-center shadow-sm">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#FBF2EF] text-[#C17767] mb-3">
          <MessageCircle size={22} strokeWidth={2} />
        </span>
        <h3 className="font-serif text-2xl font-semibold text-[#3E2723]">Ainda com dúvidas?</h3>
        <p className="mt-1 text-xs text-[#6E5F57] max-w-xs mx-auto leading-relaxed">
          Nossa cerimonialista, <strong className="font-semibold text-[#3E2723]">Camila Vasconcelos</strong>, está à disposição para auxiliar você com informações de hospedagem, trajes ou acesso.
        </p>
        <p className="mt-2 text-xs font-mono font-semibold text-[#3E2723]">
          WhatsApp: {PLANNER_PHONE}
        </p>
        <LinkButton href={PLANNER_WHATSAPP} variant="primary" className="mt-4 shadow-md">
          <MessageCircle size={15} strokeWidth={2} />
          Falar com Camila Vasconcelos no WhatsApp
        </LinkButton>
      </div>

      {/* Banner do Local */}
      <div className="relative mt-8 h-40 sm:h-44 w-full overflow-hidden rounded-3xl border border-[#E8CBC3] shadow-md">
        <Image
          src="/assets/venue-villa-imperial.jpg"
          alt="Villa Imperial das Hortênsias"
          fill
          className="object-cover object-center"
          sizes="(max-width: 640px) 100vw, 560px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#3E2723]/70 via-transparent to-transparent flex items-end justify-center p-4 text-center">
          <p className="text-xs text-white drop-shadow-sm font-serif italic tracking-wide">
            Esperamos você com muito amor · 18.09.2027
          </p>
        </div>
      </div>
    </div>
  );
}
