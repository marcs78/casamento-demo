"use client";

import { useEffect, useRef, useState, type ComponentType, type TouchEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Gift,
  HelpCircle,
  Menu,
  Music,
  Shirt,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { CHAPTERS, COUPLE, PAGE_VERSES, PLAYLIST, pad } from "@/lib/wedding";
import Monogram from "./Monogram";
import Index from "./chapters/Index";
import GrandeDia from "./chapters/GrandeDia";
import Presenca from "./chapters/Presenca";
import DressCode from "./chapters/DressCode";
import Presentes from "./chapters/Presentes";
import AlbumRecados from "./chapters/AlbumRecados";
import Playlist from "./chapters/Playlist";
import Informacoes from "./chapters/Informacoes";

export type ChapterProps = { goTo: (page: number) => void };

const PAGES: ComponentType<ChapterProps>[] = [
  Index,        // 0 · Capa & Índice
  GrandeDia,    // 1 · O Grande Dia & Nossa História
  Presenca,     // 2 · Confirmar Presença
  Presentes,    // 3 · Lista de Presentes
  DressCode,    // 4 · Dress Code & Trajes
  Playlist,     // 5 · Playlist de Louvor
  Informacoes,  // 6 · Informações & Dúvidas
];

const LAST = PAGES.length - 1; // 6
const SWIPE_THRESHOLD = 80;

const MENU_ITEMS = [
  {
    id: 0,
    num: "00",
    title: "Capa & Início",
    desc: "Abertura oficial, contagem regressiva e monograma",
    icon: BookOpen,
    badgeColor: "bg-[#FBF2EF] text-[#C17767] border-[#E8CBC3]",
  },
  {
    id: 1,
    num: "01",
    title: "O Grande Dia",
    desc: `Local, horário da cerimônia às ${COUPLE.time} e rota no Google Maps`,
    icon: Calendar,
    badgeColor: "bg-[#F0F4ED] text-[#5F6F52] border-[#C8D4C0]",
  },
  {
    id: 2,
    num: "02",
    title: "Confirmar Presença",
    desc: "Confirmação nominal de famílias e WhatsApp da cerimonialista",
    icon: CheckCircle2,
    badgeColor: "bg-[#FBF2EF] text-[#C17767] border-[#E8CBC3]",
  },
  {
    id: 3,
    num: "03",
    title: "Lista de Presentes",
    desc: "Cotas via Pix com QR Code dinâmico e lista de itens na Amazon",
    icon: Gift,
    badgeColor: "bg-[#FBF2EF] text-[#C17767] border-[#E8CBC3]",
  },
  {
    id: 4,
    num: "04",
    title: "Dress Code & Trajes",
    desc: "Guia de vestimentas elegantes e paleta de cores para convidados",
    icon: Shirt,
    badgeColor: "bg-[#FFF9EE] text-[#B38F4D] border-[#EADBB8]",
  },
  {
    id: 5,
    num: "05",
    title: "Trilha Sonora & Playlist",
    desc: "Músicas especiais da cerimônia e trilha oficial do casal",
    icon: Music,
    badgeColor: "bg-[#FFF9EE] text-[#B38F4D] border-[#EADBB8]",
  },
  {
    id: 6,
    num: "06",
    title: "Informações Úteis & Dúvidas",
    desc: "Hotéis na serra, rotas no Maps e contato de apoio",
    icon: HelpCircle,
    badgeColor: "bg-[#F0F4ED] text-[#5F6F52] border-[#C8D4C0]",
  },
];

// Embaralha os índices da playlist (Fisher-Yates) para sempre iniciar e tocar em ordem aleatória
function createShuffledIndices(length: number): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Encerra imediatamente qualquer áudio/iframe do YouTube ativo no navegador (evita músicas duplicadas ou que não param)
export function hardStopAllYoutubeAudio(exceptIframe?: HTMLIFrameElement | null) {
  if (typeof document === "undefined") return;
  const iframes = document.querySelectorAll<HTMLIFrameElement>("iframe");
  iframes.forEach((iframe) => {
    if (exceptIframe && iframe === exceptIframe) return;
    const src = iframe.getAttribute("src") || "";
    if (src.includes("youtube.com") || iframe.dataset.musicPlayer === "true") {
      try {
        iframe.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "stopVideo", args: [] }),
          "*"
        );
        iframe.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
          "*"
        );
      } catch {
        // ignore
      }
      try {
        iframe.src = "about:blank";
      } catch {
        // ignore
      }
    }
  });
}

export default function Book({ initialPage = 0 }: { initialPage?: number }) {
  const [page, setPage] = useState(initialPage);
  const [mounted, setMounted] = useState(false);
  const [bgMusicPlaying, setBgMusicPlaying] = useState(true);
  const [shuffledOrder, setShuffledOrder] = useState<number[]>(() =>
    Array.from({ length: PLAYLIST.length }, (_, i) => i)
  );
  // embedStartPos controla o iframe montado (só muda em ação manual: Próxima ou clique na Playlist)
  // permitindo que o YouTube avance sozinho em segundo plano (outra aba) sem recriar o iframe
  const [embedStartPos, setEmbedStartPos] = useState(0);
  // displayTrackIdx controla o nome do louvor exibido na barra e sincronizado em tempo real com o vídeo atual
  const [displayTrackIdx, setDisplayTrackIdx] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const bgIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Ao montar no cliente, limpa qualquer iframe órfão e sorteia uma ordem aleatória
  useEffect(() => {
    hardStopAllYoutubeAudio();
    const initialShuffle = createShuffledIndices(PLAYLIST.length);
    setShuffledOrder(initialShuffle);
    setEmbedStartPos(0);
    setDisplayTrackIdx(initialShuffle[0] ?? 0);
    setMounted(true);
    return () => {
      hardStopAllYoutubeAudio();
    };
  }, []);

  const embedTrackIdx = shuffledOrder[embedStartPos] ?? 0;
  const embedTrack = PLAYLIST[embedTrackIdx] ?? PLAYLIST[0];
  const currentTrack = PLAYLIST[displayTrackIdx] ?? PLAYLIST[0];
  const pageVerse = PAGE_VERSES[page] ?? COUPLE.verse;

  // Lista rotacionada de IDs após a faixa inicial para que o YouTube avance automaticamente mesmo em outra aba
  const rotatedPlaylistIds = [
    ...shuffledOrder.slice(embedStartPos + 1),
    ...shuffledOrder.slice(0, embedStartPos),
    shuffledOrder[embedStartPos],
  ]
    .filter((idx): idx is number => typeof idx === "number" && Boolean(PLAYLIST[idx]))
    .map((idx) => PLAYLIST[idx].youtubeId)
    .join(",");

  // Notifica a página da Playlist sempre que a faixa exibida ou o estado de reprodução mudar
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as unknown as { __weddingMusicState?: { playing: boolean; index: number } }).__weddingMusicState = {
        playing: bgMusicPlaying,
        index: displayTrackIdx,
      };
      window.dispatchEvent(
        new CustomEvent("wedding-music-state", {
          detail: { playing: bgMusicPlaying, index: displayTrackIdx },
        })
      );
    }
  }, [bgMusicPlaying, displayTrackIdx]);

  const stopBgMusic = () => {
    hardStopAllYoutubeAudio();
    setBgMusicPlaying(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("wedding-bg-stopped"));
    }
  };

  const toggleBgMusic = () => {
    if (bgMusicPlaying) {
      stopBgMusic();
    } else {
      hardStopAllYoutubeAudio();
      const pos = shuffledOrder.indexOf(displayTrackIdx);
      if (pos !== -1) {
        setEmbedStartPos(pos);
      }
      setBgMusicPlaying(true);
    }
  };

  const nextRandomTrack = () => {
    hardStopAllYoutubeAudio();
    const currentPos = shuffledOrder.indexOf(displayTrackIdx);
    const basePos = currentPos !== -1 ? currentPos : embedStartPos;
    if (basePos + 1 < shuffledOrder.length) {
      const nextPos = basePos + 1;
      setEmbedStartPos(nextPos);
      setDisplayTrackIdx(shuffledOrder[nextPos] ?? 0);
    } else {
      const newShuffle = createShuffledIndices(PLAYLIST.length);
      setShuffledOrder(newShuffle);
      setEmbedStartPos(0);
      setDisplayTrackIdx(newShuffle[0] ?? 0);
    }
    setBgMusicPlaying(true);
  };

  // Sempre que bgMusicPlaying ficar false, garante que nenhum iframe continue tocando em segundo plano
  useEffect(() => {
    if (!bgMusicPlaying) {
      hardStopAllYoutubeAudio();
    }
  }, [bgMusicPlaying]);

  // Escuta os eventos do YouTube IFrame API (infoDelivery.videoData.video_id) para manter
  // o título exibido na barra 100% sincronizado mesmo quando a música avança em segundo plano (outra aba)
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!e.origin.includes("youtube.com")) return;
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (!data) return;
        const videoId: string | undefined =
          data.info?.videoData?.video_id ||
          (typeof data.info?.videoUrl === "string"
            ? data.info.videoUrl.match(/[?&]v=([^&]+)/)?.[1]
            : undefined);

        if (videoId) {
          const matchedIdx = PLAYLIST.findIndex((s) => s.youtubeId === videoId);
          if (matchedIdx !== -1) {
            setDisplayTrackIdx((prev) => (prev === matchedIdx ? prev : matchedIdx));
          }
        }
      } catch {
        // ignore
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && bgIframeRef.current?.contentWindow) {
        try {
          bgIframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: "listening", id: 1, channel: "widget" }),
            "*"
          );
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener("message", onMessage);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  // Garante que o player comece a tocar imediatamente (inclusive após refresh, no primeiro toque/clique)
  useEffect(() => {
    if (!mounted || !bgMusicPlaying) return;

    const initAndPlay = () => {
      const win = bgIframeRef.current?.contentWindow;
      if (!win) return;
      try {
        win.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*");
        win.postMessage(
          JSON.stringify({ event: "command", func: "addEventListener", args: ["onStateChange"] }),
          "*"
        );
        win.postMessage(
          JSON.stringify({ event: "command", func: "playVideo", args: [] }),
          "*"
        );
      } catch {
        // ignore
      }
    };

    const timer = setTimeout(initAndPlay, 700);
    window.addEventListener("pointerdown", initAndPlay, { once: true });
    window.addEventListener("keydown", initAndPlay, { once: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", initAndPlay);
      window.removeEventListener("keydown", initAndPlay);
    };
  }, [mounted, bgMusicPlaying, embedTrackIdx]);

  // Sincroniza quando o convidado escolhe uma música específica na aba Playlist
  useEffect(() => {
    const onMusicSelect = (e: Event) => {
      const detail = (e as CustomEvent<{ index?: number; action?: "play" | "pause" }>).detail;
      if (!detail) return;
      if (detail.action === "pause") {
        hardStopAllYoutubeAudio();
        setBgMusicPlaying(false);
      } else if (typeof detail.index === "number") {
        hardStopAllYoutubeAudio();
        const pos = shuffledOrder.indexOf(detail.index);
        if (pos !== -1) {
          setEmbedStartPos(pos);
        }
        setDisplayTrackIdx(detail.index);
        setBgMusicPlaying(true);
      }
    };
    window.addEventListener("wedding-music-control", onMusicSelect);
    return () => window.removeEventListener("wedding-music-control", onMusicSelect);
  }, [shuffledOrder]);

  const goTo = (next: number) => {
    // Se passar 8 (antigo índice de dúvidas), mapear para LAST (7)
    const target = Math.max(0, Math.min(LAST, next === 8 ? LAST : next));
    setMenuOpen(false);
    if (target === page) return;
    setPage(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Fecha o menu suspenso de capítulos ao pressionar a tecla ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // Navegação por teclado (← →) no desktop
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowRight") goTo(page + 1);
      if (e.key === "ArrowLeft") goTo(page - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Swipe horizontal no mobile
  const onTouchStart = (e: TouchEvent) => {
    const el = e.target as HTMLElement;
    if (el.closest("input, textarea, select, iframe, [data-no-swipe]")) return;
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    goTo(page + (dx < 0 ? 1 : -1));
  };

  const Page = PAGES[page] || Index;
  const prev = page > 0 ? page - 1 : null;
  const next = page < LAST ? page + 1 : null;

  return (
    <div
      className="min-h-dvh w-full flex flex-col items-center select-none"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Barra superior fixa de navegação e player de louvor */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-[#E8CBC3]/80 bg-[#FAF7F0]/95 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex h-14 w-full max-w-xl items-center justify-between px-3 sm:px-5 gap-2">
          {/* Lado Esquerdo: Lacre de cera / Capa */}
          <button
            type="button"
            onClick={() => goTo(0)}
            title="Ir para o Início / Capa"
            aria-label="Ir para o Início"
            className="group flex items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95 shrink-0"
          >
            <Monogram size={34} />
          </button>

          {/* Centro: Menu Sugestivo do Capítulo com Navegação Rápida (< Cap. 02 · Presença >) */}
          <div className="flex items-center gap-1 min-w-0">
            {/* Seta Anterior */}
            <button
              type="button"
              disabled={page === 0}
              onClick={() => goTo(page - 1)}
              title="Capítulo Anterior"
              aria-label="Capítulo Anterior"
              className={`grid h-8 w-8 place-items-center rounded-full border transition-all cursor-pointer shrink-0 ${
                page === 0
                  ? "opacity-30 border-transparent cursor-not-allowed"
                  : "border-[#E8CBC3] bg-white text-[#3E2723] hover:border-[#C17767] hover:bg-[#FBF2EF] shadow-2xs active:scale-90"
              }`}
            >
              <ChevronLeft size={16} strokeWidth={2.2} />
            </button>

            {/* Botão Central: Exibe o Capítulo Atual e Abre o Menu com 1 Clique */}
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-expanded={menuOpen}
              aria-label="Abrir menu de capítulos"
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-[0.98] min-w-0 ${
                menuOpen
                  ? "border-[#C17767] bg-[#C17767] text-white"
                  : "border-[#E8CBC3] bg-white text-[#3E2723] hover:border-[#C17767] hover:bg-[#FAF9F6]"
              }`}
            >
              <BookOpen size={14} className={menuOpen ? "text-white" : "text-[#C17767]"} />
              <span className="font-serif text-[13px] tracking-tight truncate max-w-[115px] xs:max-w-[150px] sm:max-w-[190px]">
                {page === 0 ? "Índice de Capítulos" : `${pad(page)} · ${CHAPTERS[page - 1]?.shortTitle}`}
              </span>
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 shrink-0 ${
                  menuOpen ? "rotate-180 text-white" : "text-[#6E5F57]"
                }`}
              />
            </button>

            {/* Seta Próximo */}
            <button
              type="button"
              disabled={page === LAST}
              onClick={() => goTo(page + 1)}
              title="Próximo Capítulo"
              aria-label="Próximo Capítulo"
              className={`grid h-8 w-8 place-items-center rounded-full border transition-all cursor-pointer shrink-0 ${
                page === LAST
                  ? "opacity-30 border-transparent cursor-not-allowed"
                  : "border-[#E8CBC3] bg-white text-[#3E2723] hover:border-[#C17767] hover:bg-[#FBF2EF] shadow-2xs active:scale-90"
              }`}
            >
              <ChevronRight size={16} strokeWidth={2.2} />
            </button>
          </div>

          {/* Lado Direito: Música & Botão Capítulos */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Botão de Música */}
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={toggleBgMusic}
              title={bgMusicPlaying ? "Parar música" : "Tocar playlist"}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer shadow-2xs ${
                bgMusicPlaying
                  ? "border-[#5F6F52] bg-[#5F6F52] text-white"
                  : "border-[#E8CBC3] bg-white text-[#3E2723] hover:border-[#C17767]"
              }`}
            >
              {bgMusicPlaying ? (
                <Volume2 size={12} className="animate-pulse" />
              ) : (
                <Music size={12} className="text-[#C17767]" />
              )}
              <span className="hidden sm:inline">{bgMusicPlaying ? "Tocando" : "Música"}</span>
            </button>

            {/* Botão Menu / Capítulos */}
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              title="Ver todos os capítulos"
              aria-label="Abrir menu de capítulos"
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer shadow-2xs ${
                menuOpen
                  ? "border-[#C17767] bg-[#C17767] text-white"
                  : "border-[#E8CBC3] bg-white text-[#3E2723] hover:border-[#C17767]"
              }`}
            >
              {menuOpen ? <X size={13} /> : <Menu size={13} className="text-[#C17767]" />}
              <span className="hidden xs:inline">Capítulos</span>
            </button>
          </div>
        </div>

        {/* Faixa Inferior com Pílulas Numeradas e Sugestivas (01 a 07) — Substitui os traços cinzas por números e títulos claros */}
        <nav
          aria-label="Navegação rápida de capítulos"
          className="border-t border-[#E8CBC3]/50 bg-white/60 px-2 sm:px-4 py-1 flex items-center justify-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none"
        >
          {CHAPTERS.map((c) => {
            const active = page === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => goTo(c.id)}
                title={`Capítulo ${pad(c.id)}: ${c.title}`}
                className={`group flex items-center gap-1 rounded-full transition-all cursor-pointer shrink-0 ${
                  active
                    ? "bg-[#C17767] text-white px-2.5 py-0.5 shadow-2xs font-bold scale-102"
                    : "bg-white/80 border border-[#E8CBC3]/80 text-[#6E5F57] hover:border-[#C17767] hover:text-[#3E2723] px-2 py-0.5"
                }`}
              >
                <span className="text-[10px] font-bold tabular-nums">
                  {pad(c.id)}
                </span>
                <span
                  className={`text-[10px] font-medium transition-all ${
                    active ? "inline" : "hidden sm:inline group-hover:inline"
                  }`}
                >
                  {c.shortTitle}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Faixa Explícita de Instrução de Navegação (Deslize para a esquerda / direita no celular) */}
        <div className="border-t border-[#E8CBC3]/70 bg-gradient-to-r from-[#FDFBF7] via-[#FAF7F0] to-[#FDFBF7] px-2.5 py-1 text-center select-none shadow-2xs">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-1 text-[11px] font-semibold text-[#6E5F57]">
            {prev !== null ? (
              <button
                type="button"
                onClick={() => goTo(prev)}
                className="inline-flex items-center gap-1 text-[#C17767] hover:text-[#9A4F40] active:scale-95 transition-transform font-bold cursor-pointer"
                title="Deslize para a direita ou toque aqui para voltar"
              >
                <span>👈 Deslize à direita para voltar</span>
              </button>
            ) : (
              <span className="text-[#8C7A6B] text-[10.5px]">📖 Capa do Convite</span>
            )}

            <span className="rounded-full bg-white/90 border border-[#E8CBC3] px-2 py-0.5 text-[10px] text-[#3E2723] font-bold tabular-nums shadow-2xs">
              Página {page + 1} de {LAST + 1}
            </span>

            {next !== null ? (
              <button
                type="button"
                onClick={() => goTo(next)}
                className="inline-flex items-center gap-1 text-[#C17767] hover:text-[#9A4F40] active:scale-95 transition-transform font-bold cursor-pointer"
                title="Deslize para a esquerda ou toque aqui para avançar"
              >
                <span>Deslize à esquerda para avançar 👉</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => goTo(0)}
                className="inline-flex items-center gap-1 text-[#5F6F52] hover:text-[#3E2723] active:scale-95 transition-transform font-bold cursor-pointer text-[10.5px]"
              >
                <span>Voltar ao início ↻</span>
              </button>
            )}
          </div>
        </div>

        {/* Mini-barra da Playlist quando ativa fora da aba Playlist */}
        {mounted && bgMusicPlaying && (
          <div className="border-t border-[#E8CBC3]/60 bg-[#F0F4ED]/95 px-4 py-1.5">
            <div className="mx-auto flex max-w-xl items-center justify-between gap-2 text-[11px] text-[#2D3D22]">
              <div className="flex items-center gap-2 truncate">
                <Volume2 size={13} className="shrink-0 text-[#5F6F52] animate-pulse" />
                <span className="truncate">
                  <strong>{currentTrack.title}</strong> — {currentTrack.artist}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={nextRandomTrack}
                  className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold text-[#5F6F52] border border-[#C8D4C0] hover:bg-[#5F6F52] hover:text-white transition-colors cursor-pointer"
                >
                  Próxima ⏭
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={stopBgMusic}
                  className="text-[#8A3D2F] hover:underline text-[10px] font-semibold cursor-pointer flex items-center gap-0.5"
                >
                  <VolumeX size={12} /> Parar
                </button>
              </div>
            </div>
            {/* Player de áudio/vídeo com fila embaralhada que avança sozinho em segundo plano (outra aba) e sincroniza o título */}
            <iframe
              ref={bgIframeRef}
              data-music-player="true"
              key={`${embedStartPos}-${embedTrack.youtubeId}`}
              src={`https://www.youtube.com/embed/${embedTrack.youtubeId}?autoplay=1&enablejsapi=1&rel=0&loop=1&playlist=${rotatedPlaylistIds}`}
              title={currentTrack.title}
              allow="autoplay; encrypted-media"
              onLoad={() => {
                // Garante que apenas este iframe esteja ativo no documento
                hardStopAllYoutubeAudio(bgIframeRef.current);
                const win = bgIframeRef.current?.contentWindow;
                if (!win) return;
                try {
                  win.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*");
                  win.postMessage(
                    JSON.stringify({ event: "command", func: "addEventListener", args: ["onStateChange"] }),
                    "*"
                  );
                  win.postMessage(
                    JSON.stringify({ event: "command", func: "playVideo", args: [] }),
                    "*"
                  );
                } catch {
                  // ignore
                }
              }}
              className="pointer-events-none fixed bottom-0 right-0 h-1 w-1 opacity-0"
            />
          </div>
        )}
      </header>

      {/* Espaçador para compensar o header fixo no topo com a nova barra sugestiva */}
      <div
        className={
          mounted && bgMusicPlaying
            ? "h-[118px] sm:h-[116px] shrink-0"
            : "h-[88px] sm:h-[86px] shrink-0"
        }
        aria-hidden="true"
      />

      {/* Modal / Menu Suspenso Ilustrado de Capítulos */}
      {menuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu de Capítulos do Casamento"
          className="fixed inset-0 z-60 flex items-start justify-center p-3 pt-16 sm:pt-20 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-[#E8CBC3] bg-[#FAF7F0] p-4 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do Menu */}
            <div className="flex items-center justify-between border-b border-[#E8CBC3] pb-3 mb-3">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-2xl bg-[#FBF2EF] text-[#C17767] border border-[#E8CBC3]">
                  <BookOpen size={18} strokeWidth={2} />
                </span>
                <div>
                  <h3 className="font-serif text-lg font-semibold text-[#3E2723]">
                    Capítulos do Casamento
                  </h3>
                  <p className="text-[11px] text-[#6E5F57]">
                    {COUPLE.bride} &amp; {COUPLE.groom} · {COUPLE.dateLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                title="Fechar menu"
                aria-label="Fechar menu"
                className="grid h-8 w-8 place-items-center rounded-full border border-[#E8CBC3] bg-white text-[#6E5F57] hover:text-[#3E2723] hover:border-[#C17767] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Lista com os 8 Capítulos */}
            <div className="grid gap-2 max-h-[65vh] overflow-y-auto pr-1">
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                const isCurrent = page === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goTo(item.id)}
                    className={`w-full flex items-center justify-between gap-3 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isCurrent
                        ? "border-[#C17767] bg-[#FBF2EF] shadow-2xs scale-[1.01]"
                        : "border-[#E8CBC3]/70 bg-white hover:border-[#C17767] hover:bg-[#FAF9F6]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border text-base font-semibold ${item.badgeColor}`}
                      >
                        <Icon size={18} strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-serif text-sm font-semibold text-[#3E2723] truncate">
                            {item.title}
                          </span>
                          {isCurrent && (
                            <span className="rounded-full bg-[#C17767] px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider shrink-0">
                              Capítulo Atual
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#6E5F57] truncate mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold tabular-nums text-[#C17767] shrink-0 font-serif">
                      {item.num}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Central do Livro */}
      <main className="w-full max-w-xl mx-auto px-4 py-8 sm:px-6 sm:py-10 flex-1 flex flex-col justify-between">
        <article key={page} className="w-full animate-in fade-in duration-200">
          <Page goTo={goTo} />
        </article>

        {/* Rodapé com Navegação Entre Capítulos e Instrução Clara para Celular e Idosos */}
        {page > 0 ? (
          <div className="mt-12 pt-6 border-t-2 border-[#E8CBC3]/70 space-y-3.5">
            {/* Card de Dica de Navegação Acessível */}
            <div className="rounded-2xl border border-[#E8CBC3] bg-[#FAF7F0] p-3 text-center shadow-2xs">
              <p className="text-xs font-bold text-[#3E2723] flex items-center justify-center gap-1.5">
                <span>📱 Como navegar no convite:</span>
              </p>
              <p className="text-[11.5px] text-[#6E5F57] mt-0.5 leading-snug">
                Deslize o dedo na tela para o lado ou toque nos botões grandes abaixo para mudar de página.
              </p>
            </div>

            {/* Botões Grandes e Claros de Navegação */}
            <nav className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {prev !== null ? (
                <button
                  type="button"
                  onClick={() => goTo(prev)}
                  className="w-full flex items-center justify-between gap-3 rounded-2xl border-2 border-[#E8CBC3] bg-white hover:bg-[#FDF0EE] hover:border-[#C17767] p-3.5 shadow-xs transition-all cursor-pointer active:scale-98 text-left"
                  title="Deslize para a direita ou toque aqui para voltar"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FDF0EE] text-[#C17767]">
                      <ArrowLeft size={18} strokeWidth={2.5} />
                    </span>
                    <div className="min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-[#C17767]">
                        ← Deslize à direita para voltar
                      </span>
                      <span className="block font-serif text-sm font-semibold text-[#3E2723] truncate">
                        {prev === 0 ? "Índice / Início" : `Cap. ${pad(prev)} · ${CHAPTERS[prev - 1].shortTitle}`}
                      </span>
                    </div>
                  </div>
                </button>
              ) : <div />}

              {next !== null ? (
                <button
                  type="button"
                  onClick={() => goTo(next)}
                  className="w-full flex items-center justify-between gap-3 rounded-2xl border-2 border-[#C17767] bg-[#C17767] hover:bg-[#a66152] text-white p-3.5 shadow-md transition-all cursor-pointer active:scale-98 text-right"
                  title="Deslize para a esquerda ou toque aqui para avançar"
                >
                  <div className="flex items-center justify-between w-full min-w-0">
                    <div className="text-left min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-[#FAF7F0] opacity-90">
                        Deslize à esquerda para avançar →
                      </span>
                      <span className="block font-serif text-sm font-semibold text-white truncate">
                        {`Cap. ${pad(next)} · ${CHAPTERS[next - 1].shortTitle}`}
                      </span>
                    </div>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/20 text-white ml-2">
                      <ArrowRight size={18} strokeWidth={2.5} />
                    </span>
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => goTo(0)}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-[#5F6F52] bg-[#5F6F52] hover:bg-[#4E5C43] text-white p-3.5 font-serif text-sm font-semibold transition-all cursor-pointer shadow-md active:scale-98"
                >
                  <BookOpen size={16} />
                  <span>Voltar ao Início do Livro</span>
                </button>
              )}
            </nav>
          </div>
        ) : (
          /* Botão e Instrução na Capa / Índice (Página 0) */
          <div className="mt-8 pt-6 border-t border-[#E8CBC3] space-y-3">
            <div className="rounded-2xl border border-[#E8CBC3] bg-[#FAF7F0] p-3 text-center">
              <p className="text-xs font-bold text-[#3E2723]">
                👉 Deslize para a esquerda ou toque no botão abaixo para começar a leitura:
              </p>
            </div>
            <button
              type="button"
              onClick={() => goTo(1)}
              className="w-full flex items-center justify-center gap-2.5 rounded-full bg-[#C17767] hover:bg-[#a66152] text-white py-3.5 px-6 font-serif text-sm font-semibold tracking-wider transition-all shadow-md cursor-pointer active:scale-98"
            >
              <span>Abrir Capítulo 01 · O Grande Dia</span>
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* Rodapé Elegante, Centralizado e Bem Diagramado — exibe o mesmo versículo do cabeçalho da página atual */}
        <footer className="mt-14 mb-4 flex flex-col items-center justify-center text-center space-y-2.5 select-none">
          <div className="flex items-center justify-center gap-2.5">
            <span className="h-px w-14 sm:w-18 bg-[#C17767]/45" />
            <span className="text-sm sm:text-base text-[#5F6F52]">🌿</span>
            <span className="h-px w-14 sm:w-18 bg-[#C17767]/45" />
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-semibold text-[#3E2723] tracking-wide">
            {COUPLE.bride} <span className="italic text-[#C17767] font-normal text-xl sm:text-2xl">&</span> {COUPLE.groom}
          </p>
          <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.28em] text-[#C17767]">
            {COUPLE.dateLabel} · {COUPLE.weekday}
          </p>
          <blockquote className="mt-2.5 max-w-md mx-auto text-center">
            <p className="font-antique text-xl sm:text-2xl text-[#2C1A14] leading-snug">
              “{pageVerse.text}”
            </p>
            <cite className="mt-1.5 block font-antique text-lg sm:text-xl text-[#C17767] not-italic tracking-wide">
              — {pageVerse.ref}
            </cite>
          </blockquote>
        </footer>
      </main>
    </div>
  );
}
