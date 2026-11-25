"use client";

import { useState } from "react";
import Image from "next/image";
import { ZoomIn, X, Heart } from "lucide-react";
import { TIMELINE, type Milestone } from "@/lib/wedding";
import { ChapterHeader, Modal } from "../ui";

export default function Historia() {
  const [selectedPhoto, setSelectedPhoto] = useState<{
    src: string;
    alt: string;
    caption?: string;
  } | null>(null);

  return (
    <div className="space-y-6">
      <ChapterHeader
        num="01"
        title="Nossa História"
        intro="“O amor é paciente, o amor é bondoso; tudo crê, tudo espera, tudo suporta.” — 1 Coríntios 13:4-7"
      />

      {/* Introdução suave */}
      <div className="rounded-3xl border border-[#E8CBC3] bg-gradient-to-br from-white via-[#FAF7F0] to-[#FAF7F0] p-5 text-center shadow-xs">
        <div className="mx-auto mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#FDF0EE] px-3 py-1 text-xs font-semibold text-[#C17767]">
          <Heart size={13} className="fill-[#C17767]" />
          <span>História &amp; Propósito</span>
        </div>
        <p className="font-serif text-lg text-[#3E2723]">
          “O amor que atravessa o tempo transforma cada capítulo em eternidade.” — <span className="text-[#C17767]">Anita &amp; Giuseppe</span>
        </p>
      </div>

      {/* Linha do Tempo com Fotos Reais em Cada Marco */}
      <div className="space-y-5">
        {TIMELINE.map((m: Milestone) => (
          <div
            key={m.id}
            className="overflow-hidden rounded-3xl border border-[#E8CBC3] bg-white shadow-xs transition-all hover:shadow-md"
          >
            {/* Foto do Marco com Zoom */}
            {m.image && (
              <div
                className="relative h-64 sm:h-72 w-full cursor-pointer overflow-hidden bg-[#F2ECE4] group"
                onClick={() =>
                  setSelectedPhoto({
                    src: m.image,
                    alt: m.title,
                    caption: m.caption,
                  })
                }
              >
                <Image
                  src={m.image}
                  alt={m.title}
                  fill
                  style={{ objectPosition: m.objectPosition || "center 40%" }}
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, 560px"
                />
                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="flex items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-[#3E2723] shadow-md backdrop-blur-xs">
                    <ZoomIn size={14} /> Ver foto ampliada
                  </span>
                </div>
                <span className="absolute top-3 left-3 rounded-full bg-[#3E2723]/75 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-xs">
                  {m.label}
                </span>
              </div>
            )}

            <div className="p-5">
              <h4 className="font-serif text-xl font-semibold text-[#3E2723]">
                {m.title}
              </h4>
              <p className="mt-2 text-xs leading-relaxed text-[#3E2723]/85">
                {m.text}
              </p>
              <p className="mt-3 font-antique text-lg sm:text-xl text-[#2C1A14] border-l-2 border-[#C17767]/50 pl-3 leading-snug">
                “{m.verse}”
              </p>
              {m.caption && (
                <p className="mt-2 text-[11px] text-[#6E5F57] italic">
                  📍 {m.caption}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Lightbox para Ampliação de Fotos */}
      {selectedPhoto && (
        <Modal open={!!selectedPhoto} onClose={() => setSelectedPhoto(null)}>
          <div className="space-y-3">
            <div className="relative h-80 sm:h-96 w-full overflow-hidden rounded-2xl bg-black/5">
              <Image
                src={selectedPhoto.src}
                alt={selectedPhoto.alt}
                fill
                className="object-contain"
                sizes="(max-width: 640px) 100vw, 500px"
              />
            </div>
            {selectedPhoto.caption && (
              <p className="text-center font-serif text-xs text-[#3E2723]">
                {selectedPhoto.caption}
              </p>
            )}
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="w-full rounded-full border border-[#E8CBC3] bg-[#FAF7F0] py-2 text-xs font-semibold text-[#3E2723] hover:bg-[#F2ECE4] transition-colors cursor-pointer"
            >
              Fechar Visualização
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
