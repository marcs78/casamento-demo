"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  BookOpen,
  Camera,
  Gift,
  QrCode,
  ExternalLink,
  Sparkles,
  ArrowLeft,
  Share2,
  Check,
} from "lucide-react";
import Monogram from "@/components/Monogram";
import Historia from "@/components/chapters/Historia";
import AlbumRecados from "@/components/chapters/AlbumRecados";
import Presentes from "@/components/chapters/Presentes";
import { COUPLE, VENUE } from "@/lib/wedding";
import { Modal } from "@/components/ui";
import PageCoverIntro from "@/components/PageCoverIntro";

type MesaTab = "historia" | "fotos" | "presentes";

function MesaContent() {
  const searchParams = useSearchParams();
  const mesaParam = searchParams.get("mesa") || searchParams.get("id") || "";
  const tabParam = searchParams.get("aba") || searchParams.get("tab") || "";

  const [hasEntered, setHasEntered] = useState(false);
  const [activeTab, setActiveTab] = useState<MesaTab>(() => {
    if (tabParam === "fotos" || tabParam === "recados") return "fotos";
    if (tabParam === "presentes" || tabParam === "pix") return "presentes";
    return "historia";
  });

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  const currentUrl = typeof window !== "undefined" ? window.location.href : "https://casamento-anita-giuseppe-demo.vercel.app/mesa";

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  if (!hasEntered) {
    return (
      <PageCoverIntro
        imageSrc="/assets/og-mesa-convidados.jpg"
        imageAlt="Bem-vindos à Nossa Mesa · Anita & Giuseppe"
        badgeText={mesaParam ? `Especial · Mesa ${mesaParam}` : "Especial do Grande Dia"}
        title="Bem-vindos à Nossa Mesa"
        subtitle="Nossa História de Amor · Fotos & Recados em Tempo Real · Lista de Presentes"
        buttonText="Entrar na Mesa"
        helperText="Toque no card ou no botão para acessar"
        onEnter={() => setHasEntered(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#3E2723] antialiased">
      {/* Barra Superior com Monograma e Boas-Vindas */}
      <header className="relative border-b border-[#E8CBC3]/70 bg-gradient-to-b from-[#FDFBF7] to-[#FAF7F0] pt-7 pb-6 px-4 text-center shadow-xs">
        <div className="mx-auto max-w-xl space-y-3">
          {/* Monograma dos Noivos */}
          <div className="mx-auto flex justify-center">
            <Monogram size={72} />
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#C17767]">
              Especial para as Mesas · {COUPLE.dateLabel}
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#3E2723] tracking-wide">
              {COUPLE.bride} &amp; {COUPLE.groom}
            </h1>
            <p className="text-xs text-[#6E5F57]">
              Sejam muito bem-vindos à nossa celebração de casamento! ✨
            </p>
          </div>

          {/* Badge Indicador de Mesa */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {mesaParam ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C17767] bg-[#FDF0EE] px-3.5 py-1 text-xs font-bold text-[#C17767] shadow-2xs">
                <Sparkles size={13} />
                <span>Mesa {mesaParam}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C8D4C0] bg-[#F0F4ED] px-3.5 py-1 text-xs font-semibold text-[#5F6F52] shadow-2xs">
                <span>{VENUE.name}</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => setQrModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E8CBC3] bg-white px-3 py-1 text-xs font-semibold text-[#6E5F57] hover:border-[#C17767] hover:text-[#C17767] transition-all cursor-pointer shadow-2xs"
              title="Gerar e imprimir QR Code desta mesa"
            >
              <QrCode size={13} />
              <span>Ver QR Code da Mesa</span>
            </button>

            <button
              type="button"
              onClick={() => setHasEntered(false)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E8CBC3] bg-white px-3 py-1 text-xs font-semibold text-[#6E5F57] hover:border-[#C17767] hover:text-[#C17767] transition-all cursor-pointer shadow-2xs"
              title="Voltar à capa inicial de boas-vindas"
            >
              <span>Ver Capa</span>
            </button>
          </div>
        </div>
      </header>

      {/* Barra de Abas Fixa (Sticky) para Navegação Fácil no Celular */}
      <nav className="sticky top-0 z-30 border-b border-[#E8CBC3]/80 bg-[#FAF7F0]/95 backdrop-blur-md px-3 py-2.5 shadow-xs">
        <div className="mx-auto flex max-w-lg items-center justify-center gap-1.5 sm:gap-2">
          {/* Aba 1: Nossa História */}
          <button
            type="button"
            onClick={() => setActiveTab("historia")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-2 px-2 text-xs font-bold tracking-wide transition-all cursor-pointer ${
              activeTab === "historia"
                ? "bg-[#C17767] text-white shadow-xs"
                : "border border-[#E8CBC3]/70 bg-white text-[#6E5F57] hover:bg-[#FDF0EE] hover:text-[#C17767]"
            }`}
          >
            <BookOpen size={14} strokeWidth={2.2} />
            <span>Nossa História</span>
          </button>

          {/* Aba 2: Fotos & Recados */}
          <button
            type="button"
            onClick={() => setActiveTab("fotos")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-2 px-2 text-xs font-bold tracking-wide transition-all cursor-pointer ${
              activeTab === "fotos"
                ? "bg-[#5F6F52] text-white shadow-xs"
                : "border border-[#E8CBC3]/70 bg-white text-[#6E5F57] hover:bg-[#F0F4ED] hover:text-[#5F6F52]"
            }`}
          >
            <Camera size={14} strokeWidth={2.2} />
            <span>Fotos & Recados</span>
          </button>

          {/* Aba 3: Presentes & Pix */}
          <button
            type="button"
            onClick={() => setActiveTab("presentes")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-2 px-2 text-xs font-bold tracking-wide transition-all cursor-pointer ${
              activeTab === "presentes"
                ? "bg-[#C17767] text-white shadow-xs"
                : "border border-[#E8CBC3]/70 bg-white text-[#6E5F57] hover:bg-[#FDF0EE] hover:text-[#C17767]"
            }`}
          >
            <Gift size={14} strokeWidth={2.2} />
            <span>Presentes</span>
          </button>
        </div>
      </nav>

      {/* Conteúdo Dinâmico da Aba Selecionada */}
      <main className="mx-auto max-w-xl px-4 py-6 sm:py-8">
        {activeTab === "historia" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Historia />
          </div>
        )}

        {activeTab === "fotos" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AlbumRecados />
          </div>
        )}

        {activeTab === "presentes" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Presentes />
          </div>
        )}
      </main>

      {/* Rodapé Elegante com Versículo e Link para Convite Oficial */}
      <footer className="mt-12 border-t border-[#E8CBC3]/80 bg-gradient-to-b from-[#FAF7F0] to-[#F5ECE5] px-4 py-8 text-center space-y-4">
        <div className="mx-auto max-w-md space-y-2">
          <p className="font-antique text-lg text-[#3E2723]">
            “{COUPLE.verse.text}” — <span className="text-[#C17767]">{COUPLE.verse.ref}</span>
          </p>
          <p className="text-xs text-[#6E5F57]">
            Com todo carinho, <strong className="text-[#3E2723]">{COUPLE.bride} &amp; {COUPLE.groom}</strong> · {COUPLE.dateLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#C17767] bg-white px-5 py-2 text-xs font-bold text-[#C17767] hover:bg-[#FDF0EE] transition-colors shadow-2xs"
          >
            <ArrowLeft size={14} />
            <span>Ver Convite Oficial Completo</span>
          </Link>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E8CBC3] bg-white px-4 py-2 text-xs font-semibold text-[#6E5F57] hover:border-[#C17767] hover:text-[#C17767] transition-colors shadow-2xs cursor-pointer"
          >
            {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
            <span>{copiedLink ? "Link Copiado!" : "Compartilhar Link"}</span>
          </button>
        </div>
      </footer>

      {/* Modal do QR Code da Mesa para Impressão */}
      <Modal open={qrModalOpen} onClose={() => setQrModalOpen(false)}>
        <div className="text-center space-y-4">
          <div className="space-y-1">
            <h3 className="font-serif text-xl font-bold text-[#3E2723]">
              QR Code para as Mesas
            </h3>
            <p className="text-xs text-[#6E5F57]">
              Aponte a câmera do celular para abrir esta página especial direto na mesa dos convidados.
            </p>
          </div>

          <div className="mx-auto inline-block rounded-2xl border-2 border-[#E8CBC3] bg-white p-4 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(
                currentUrl
              )}`}
              alt="QR Code da Mesa"
              className="h-48 w-48 sm:h-56 sm:w-56 mx-auto object-contain"
            />
          </div>

          <div className="rounded-xl bg-[#FAF7F0] p-3 text-left text-xs text-[#6E5F57] space-y-1 border border-[#E8CBC3]/60">
            <p>
              💡 <strong>Como usar:</strong> Imprima este QR Code em plaquinhas ou porta-retratos no centro de cada mesa no dia do casamento.
            </p>
            <p className="truncate text-[11px] text-[#3E2723]">
              <strong>Link direto:</strong> {currentUrl}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex-1 rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] py-2.5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
            >
              Imprimir QR Code
            </button>
            <button
              type="button"
              onClick={() => setQrModalOpen(false)}
              className="flex-1 rounded-full border border-[#E8CBC3] bg-white py-2.5 text-xs font-semibold text-[#3E2723] hover:bg-[#FAF7F0] transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function MesaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center bg-[#FAF7F0] text-[#C17767]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#C17767] border-t-transparent" />
            <span className="font-serif text-sm">Carregando página da mesa...</span>
          </div>
        </div>
      }
    >
      <MesaContent />
    </Suspense>
  );
}
