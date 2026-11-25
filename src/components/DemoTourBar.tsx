"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  X,
  BookOpen,
  Heart,
  ClipboardCheck,
  QrCode,
  Users,
  Sparkles,
  KeyRound,
} from "lucide-react";

const DEMO_ROUTES = [
  {
    href: "/",
    title: "Convite Digital (Convidados)",
    desc: "Envelope interativo, livro, RSVP, Pix e playlist",
    icon: BookOpen,
    badge: "Público",
  },
  {
    href: "/mesa?mesa=1",
    title: "Modo Mesa (QR Code do Dia)",
    desc: "História, álbum ao vivo, recados e presentes na recepção",
    icon: QrCode,
    badge: "Festa",
  },
  {
    href: "/amigas-da-noiva",
    title: "Cortejo · Madrinhas & Padrinhos",
    desc: "Páginas exclusivas com paleta de cores e traje",
    icon: Users,
    badge: "Cortejo",
    altHref: "/amigos-do-noivo",
  },
  {
    href: "/admin/noivos",
    title: "Painel dos Noivos",
    desc: "RSVP, gestão de lista, financeiro Pix e backup · PIN: 1234",
    icon: Heart,
    badge: "PIN 1234",
  },
  {
    href: "/admin/cerimonialista",
    title: "Portal da Cerimonialista",
    desc: "Check-in, mapa de mesas, roteiro e PDFs · PIN: 4321",
    icon: ClipboardCheck,
    badge: "PIN 4321",
  },
];

export default function DemoTourBar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="fixed bottom-4 right-4 z-50 print:hidden">
      {open && (
        <div className="mb-3 w-[320px] sm:w-[355px] overflow-hidden rounded-3xl border border-[#E8CBC3] bg-[#FAF9F6] shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center justify-between border-b border-[#E8CBC3]/80 bg-gradient-to-r from-[#FBF2EF] to-[#FAF7F0] px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-[#C17767]" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C17767]">
                  Versão Demo Comercial
                </p>
                <p className="font-serif text-sm font-semibold text-[#3E2723]">
                  Tour por Todas as Visões
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-7 w-7 place-items-center rounded-full border border-[#E8CBC3] bg-white text-[#6E5F57] hover:text-[#C17767] cursor-pointer"
              aria-label="Fechar Tour da Demo"
            >
              <X size={14} />
            </button>
          </div>

          <div className="p-3 space-y-2 max-h-[68vh] overflow-y-auto">
            {DEMO_ROUTES.map((item) => {
              const Icon = item.icon;
              const baseHref = item.href.split("?")[0];
              const isActive = pathname === baseHref || (item.altHref && pathname === item.altHref);

              return (
                <div
                  key={item.href}
                  className={`rounded-2xl border p-2.5 transition-all ${
                    isActive
                      ? "border-[#C17767] bg-[#FBF2EF]/70"
                      : "border-[#E8CBC3]/70 bg-white hover:border-[#C17767]"
                  }`}
                >
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-2.5"
                  >
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#FAF7F0] border border-[#E8CBC3]/70 text-[#C17767]">
                      <Icon size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#3E2723] truncate">
                          {item.title}
                        </span>
                        <span className="shrink-0 rounded-full bg-[#F0F4ED] border border-[#C8D4C0] px-2 py-0.5 text-[9.5px] font-bold text-[#5F6F52]">
                          {item.badge}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-[#6E5F57] leading-snug">
                        {item.desc}
                      </p>
                    </div>
                  </Link>
                  {item.altHref && (
                    <div className="mt-2 flex gap-1.5 pl-10">
                      <Link
                        href="/amigas-da-noiva"
                        onClick={() => setOpen(false)}
                        className="rounded-full border border-[#E8CBC3] bg-[#FAF7F0] px-2.5 py-0.5 text-[10px] font-semibold text-[#3E2723] hover:border-[#C17767]"
                      >
                        Madrinhas
                      </Link>
                      <Link
                        href="/amigos-do-noivo"
                        onClick={() => setOpen(false)}
                        className="rounded-full border border-[#E8CBC3] bg-[#FAF7F0] px-2.5 py-0.5 text-[10px] font-semibold text-[#3E2723] hover:border-[#C17767]"
                      >
                        Padrinhos
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="rounded-2xl border border-[#C8D4C0] bg-[#F0F4ED]/80 p-3 text-[11px] text-[#3E2723] space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[#5F6F52]">
                <KeyRound size={12} />
                <span>Dica para testar o RSVP ao vivo</span>
              </div>
              <p className="text-[#4B5842] leading-relaxed">
                No Capítulo 02 (<strong>Confirmar Presença</strong>), pesquise pelos sobrenomes pendentes:{" "}
                <strong>Borges</strong>, <strong>Menezes</strong>, <strong>D&apos;Ávila</strong>,{" "}
                <strong>Fonseca</strong> ou <strong>Nogueira</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-[#E8CBC3] bg-[#3E2723] px-4 text-xs font-semibold text-[#FAF7F0] shadow-xl hover:bg-[#523530] transition-all cursor-pointer"
        title="Navegar entre Convidado, Mesa, Noivos e Cerimonialista"
      >
        <Compass size={15} className="text-[#E8CBC3]" />
        <span>{open ? "Fechar Tour" : "Tour da Demo"}</span>
      </button>
    </div>
  );
}
