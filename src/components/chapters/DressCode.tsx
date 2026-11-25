"use client";

import Image from "next/image";
import { DRESS_CODE } from "@/lib/wedding";
import { ChapterHeader } from "../ui";

export default function DressCode() {
  const BRIDE_AVOID = [
    { name: "Branco", hex: "#FFFFFF", border: "#E5E0D8" },
    { name: "Off-white & Marfim", hex: "#FAF7F0", border: "#E5E0D8" },
    { name: "Champagne claro & Nude", hex: "#F5E6D3", border: "#DFCBB5" },
  ];

  const GROOM_AVOID = [
    { name: "Terno & Colete Azul-marinho", hex: "#232B3E", border: "#161C29" },
    { name: "Azul escuro similar", hex: "#1C2D42", border: "#102030" },
    { name: "Sapato marrom (cognac)", hex: "#8D5B4C", border: "#6E4438" },
  ];

  return (
    <div className="space-y-6">
      <ChapterHeader
        num="04"
        title="Dress Code"
        intro={`“${DRESS_CODE.summary}”`}
      />

      {/* Cartões dos Noivos apenas com as informações e cores exclusivas que pedimos evitar */}
      <div className="grid gap-3.5 sm:grid-cols-2">
        {/* Noiva */}
        <div className="flex flex-col justify-between gap-3.5 rounded-3xl border border-[#E8CBC3] bg-white p-5 shadow-2xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C17767]">
              Traje Exclusivo
            </span>
            <h3 className="font-serif text-xl font-semibold text-[#3E2723] mt-0.5">
              Noiva — Anita
            </h3>
            <p className="mt-1 text-xs text-[#6E5F57] leading-relaxed">
              Vestido de noiva com destaque exclusivo em tonalidades nupciais.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E8CBC3]/70 bg-[#FAF7F0] p-3">
            <span className="block text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#C17767] mb-2">
              Pedimos gentilmente evitar (tons da noiva)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {BRIDE_AVOID.map((c) => (
                <span
                  key={c.name}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#E8CBC3]/80 bg-white px-2.5 py-1 text-[10.5px] font-medium text-[#3E2723] shadow-2xs"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full border"
                    style={{ backgroundColor: c.hex, borderColor: c.border }}
                  />
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Noivo */}
        <div className="flex flex-col justify-between gap-3.5 rounded-3xl border border-[#C8D4C0] bg-white p-5 shadow-2xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#5F6F52]">
              Traje Exclusivo
            </span>
            <h3 className="font-serif text-xl font-semibold text-[#3E2723] mt-0.5">
              Noivo — Giuseppe
            </h3>
            <p className="mt-1 text-xs text-[#6E5F57] leading-relaxed">
              Terno completo (com colete) em azul-marinho e sapato marrom (cognac).
            </p>
          </div>

          <div className="rounded-2xl border border-[#C8D4C0]/80 bg-[#F0F4ED]/70 p-3">
            <span className="block text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#5F6F52] mb-2">
              Pedimos gentilmente evitar (tons do noivo)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {GROOM_AVOID.map((c) => (
                <span
                  key={c.name}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#C8D4C0] bg-white px-2.5 py-1 text-[10.5px] font-medium text-[#3E2723] shadow-2xs"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full border"
                    style={{ backgroundColor: c.hex, borderColor: c.border }}
                  />
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Ilustração e Orientações para Convidados */}
      <div className="rounded-3xl border border-[#E8CBC3] bg-white p-5 shadow-xs">
        <div className="relative mb-4 h-48 sm:h-56 w-full overflow-hidden rounded-2xl border border-[#E8CBC3] shadow-xs">
          <Image
            src="/assets/dresscode-convidados-salao-noite.jpg"
            alt="Convidados em Geral - Inspirações de Traje no Salão à Noite"
            fill
            className="object-cover object-center"
            sizes="(max-width: 640px) 100vw, 560px"
          />
        </div>

        <h3 className="font-serif text-2xl font-semibold text-[#3E2723] text-center mb-1">Convidados em Geral</h3>
        <p className="text-xs text-[#6E5F57] text-center max-w-sm mx-auto mb-4 leading-relaxed">
          Sugerimos trajes sociais elegantes e atemporais, em harmonia com uma celebração clássica na serra.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 text-left">
          <div className="rounded-2xl bg-[#FBF2EF] border border-[#E8CBC3] p-4">
            <p className="text-xs font-bold text-[#C17767] uppercase tracking-wider mb-2">
              Para Elas
            </p>
            <ul className="space-y-1.5 text-xs text-[#3E2723]/90">
              {DRESS_CODE.women.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-[#C17767] font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-[#F0F4ED] border border-[#C8D4C0] p-4">
            <p className="text-xs font-bold text-[#5F6F52] uppercase tracking-wider mb-2">
              Para Eles
            </p>
            <ul className="space-y-1.5 text-xs text-[#3E2723]/90">
              {DRESS_CODE.men.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-[#5F6F52] font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
