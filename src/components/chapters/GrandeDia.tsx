"use client";

import Image from "next/image";
import { Calendar, CalendarPlus, MapPin, Navigation, Clock } from "lucide-react";
import { COUPLE, VENUE } from "@/lib/wedding";
import { downloadWeddingIcs, getGoogleCalendarUrl } from "@/lib/calendar";
import { ChapterHeader, LinkButton } from "../ui";

export default function GrandeDia() {
  return (
    <div className="space-y-6">
      <ChapterHeader
        num="01"
        title="O Grande Dia"
        intro="“O amor não se vê com os olhos, mas com o coração — celebrando um novo capítulo para sempre.”"
      />

      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Foto oficial da Villa Imperial das Hortênsias ao entardecer */}
        <div className="relative h-60 sm:h-72 w-full overflow-hidden rounded-3xl border border-[#E8CBC3] shadow-md">
          <Image
            src="/assets/venue-villa-imperial.jpg"
            alt="Villa Imperial das Hortênsias ao entardecer"
            fill
            className="object-cover object-center"
            priority
            sizes="(max-width: 640px) 100vw, 560px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#3E2723]/80 via-[#3E2723]/25 to-transparent flex flex-col justify-end p-5">
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#FAF7F0]">
              Local da Cerimônia & Recepção
            </span>
            <h3 className="font-serif text-2xl font-semibold text-white drop-shadow-sm">
              {VENUE.name}
            </h3>
          </div>
        </div>

        {/* Cartões com Data, Horário e Endereço */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#E8CBC3] bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2.5 text-[#C17767] mb-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#FBF2EF] text-[#C17767]">
                <Calendar size={16} strokeWidth={2} />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Data & Horário</span>
            </div>
            <p className="font-serif text-2xl font-semibold text-[#3E2723]">{COUPLE.dateLabel}</p>
            <p className="flex items-center gap-1 text-xs text-[#6E5F57] mt-1">
              <Clock size={12} strokeWidth={2} />
              {COUPLE.weekday} às {COUPLE.time} (Pontualmente)
            </p>
          </div>

          <div className="rounded-2xl border border-[#C8D4C0] bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2.5 text-[#5F6F52] mb-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#F0F4ED] text-[#5F6F52]">
                <MapPin size={16} strokeWidth={2} />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Endereço</span>
            </div>
            <p className="font-serif text-lg font-semibold text-[#3E2723] leading-snug">{VENUE.address}</p>
            <p className="text-xs text-[#6E5F57] mt-1">{VENUE.city}</p>
          </div>
        </div>

        {/* Mapa do Google */}
        <div className="overflow-hidden rounded-2xl border border-[#E8CBC3] shadow-sm">
          <iframe
            title={`Mapa — ${VENUE.name}`}
            src={VENUE.embedUrl}
            className="block aspect-[16/10] w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        <LinkButton href={VENUE.mapsUrl} variant="sage" className="w-full h-12 text-sm shadow-md">
          <Navigation size={16} strokeWidth={2} />
          Traçar Rota no Google Maps
        </LinkButton>

        {/* Salvar na Agenda do Celular (Google Calendar & iPhone / Apple / Samsung .ics) */}
        <div className="rounded-2xl border border-[#E8CBC3] bg-[#FAF9F6] p-4 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-center gap-2 text-[#C17767]">
            <CalendarPlus size={16} strokeWidth={2} />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em]">
              Lembrete Automático na Sua Agenda
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <a
              href={getGoogleCalendarUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#E8CBC3] bg-white hover:bg-[#FDF0EE] px-4 text-xs font-semibold text-[#3E2723] transition-colors shadow-2xs"
            >
              <Calendar size={14} className="text-[#C17767]" />
              <span>Salvar no Google Agenda</span>
            </a>
            <button
              type="button"
              onClick={downloadWeddingIcs}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#C8D4C0] bg-white hover:bg-[#F0F4ED] px-4 text-xs font-semibold text-[#3E2723] transition-colors cursor-pointer shadow-2xs"
            >
              <CalendarPlus size={14} className="text-[#5F6F52]" />
              <span>Agenda iPhone / Celular (.ics)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
