"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Disc3, Music2, Play, Square, Link as LinkIcon, Volume2, SkipForward, Shuffle, Star, ChevronDown, ChevronUp } from "lucide-react";
import { PLAYLIST } from "@/lib/wedding";
import { saveSongSuggestion, getSongSuggestions } from "@/lib/guestList";
import { hardStopAllYoutubeAudio } from "../Book";
import { ChapterHeader, Notice, Section } from "../ui";

export default function Playlist() {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [link, setLink] = useState("");
  const [thanks, setThanks] = useState<string | null>(null);
  const [activeSongIndex, setActiveSongIndex] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      const st = (window as unknown as { __weddingMusicState?: { playing: boolean; index: number } }).__weddingMusicState;
      if (st?.playing) return st.index;
    }
    return null;
  });
  const [showAllSongs, setShowAllSongs] = useState(false);
  const [customSuggestions, setCustomSuggestions] = useState(() => getSongSuggestions());

  const pagePlaylist = PLAYLIST.filter((s) => !("playerOnly" in s && s.playerOnly));
  const currentSong = activeSongIndex !== null ? PLAYLIST[activeSongIndex] : null;
  const visibleSongs = showAllSongs
    ? pagePlaylist.map((song, idx) => ({ song, idx }))
    : pagePlaylist.map((song, idx) => ({ song, idx })).filter((item) => item.song.featured);

  // Sincroniza com o player único do topo (Book.tsx) e carrega sugestões em nuvem
  useEffect(() => {
    fetch("/api/sync")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.ok && Array.isArray(data.songs) && data.songs.length > 0) {
          setCustomSuggestions(data.songs);
          try {
            localStorage.setItem("anita_giuseppe_demo_song_suggestions_v1", JSON.stringify(data.songs));
          } catch {}
        }
      })
      .catch(() => {});

    const onState = (e: Event) => {
      const detail = (e as CustomEvent<{ playing: boolean; index: number }>).detail;
      if (!detail) return;
      setActiveSongIndex(detail.playing ? detail.index : null);
    };
    window.addEventListener("wedding-music-state", onState);
    return () => window.removeEventListener("wedding-music-state", onState);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    saveSongSuggestion({
      title: title.trim(),
      artist: artist.trim() || undefined,
      link: link.trim() || undefined,
    });

    setCustomSuggestions(getSongSuggestions());
    setThanks(`Obrigado pela sugestão de “${title.trim()}”! Ela já foi enviada para os noivos.`);
    setTitle("");
    setArtist("");
    setLink("");
    setTimeout(() => setThanks(null), 4000);
  };

  const selectSong = (idx: number | null) => {
    if (typeof window === "undefined") return;
    if (idx === null) {
      hardStopAllYoutubeAudio();
      setActiveSongIndex(null);
      window.dispatchEvent(
        new CustomEvent("wedding-music-control", { detail: { action: "pause" } })
      );
    } else {
      setActiveSongIndex(idx);
      window.dispatchEvent(
        new CustomEvent("wedding-music-control", { detail: { index: idx, action: "play" } })
      );
    }
  };

  const playRandomTrack = () => {
    if (pagePlaylist.length <= 1) {
      selectSong(0);
      return;
    }
    let nextIdx = Math.floor(Math.random() * pagePlaylist.length);
    if (nextIdx === activeSongIndex) {
      nextIdx = (nextIdx + 1) % pagePlaylist.length;
    }
    selectSong(nextIdx);
  };

  return (
    <div className="space-y-6">
      <ChapterHeader
        num="05"
        title="Trilha Sonora & Playlist"
        intro="“A música guarda o compasso das lembranças que permanecem para sempre no coração.”"
      />

      {/* Player Integrado para Tocar a Playlist Direto no Site */}
      <div className="rounded-3xl border border-[#C8D4C0] bg-gradient-to-br from-[#F0F4ED] via-white to-[#FAF7F0] p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#5F6F52] text-white shadow-xs">
              <Volume2 size={20} strokeWidth={2} />
            </span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#5F6F52]">
                Rádio &amp; Trilha no Site · {pagePlaylist.length} Músicas
              </span>
              <h3 className="font-serif text-lg font-semibold text-[#3E2723] leading-tight">
                {currentSong ? `Tocando: ${currentSong.title}` : "Ouça Nossa Trilha Sonora Aqui no Site"}
              </h3>
              <p className="text-xs text-[#6E5F57]">
                {currentSong
                  ? `${currentSong.artist} · ${currentSong.tag}`
                  : "O player do topo já inicia em ordem aleatória. Você também pode escolher uma música abaixo!"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeSongIndex === null ? (
              <button
                type="button"
                onClick={playRandomTrack}
                className="inline-flex items-center gap-2 rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all cursor-pointer"
              >
                <Shuffle size={14} />
                Sortear Música
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={playRandomTrack}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#5F6F52] bg-white hover:bg-[#F0F4ED] px-3.5 py-2 text-xs font-semibold text-[#5F6F52] transition-colors cursor-pointer"
                  title="Próxima música aleatória"
                >
                  <SkipForward size={14} />
                  Próxima (Aleatória)
                </button>
                <button
                  type="button"
                  onClick={() => selectSong(null)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#E8CBC3] bg-white hover:bg-[#FDF0EE] px-3.5 py-2 text-xs font-semibold text-[#C17767] transition-colors cursor-pointer"
                >
                  <Square size={13} fill="currentColor" />
                  Parar
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Lista de Músicas da Playlist Oficial (Top 1: Deus da Provisão + Destaques) */}
      <div className="space-y-3">
        {visibleSongs.map(({ song: s, idx: index }) => {
          const isPlaying = activeSongIndex === index;
          const isTop1 = index === 0;
          return (
            <div
              key={s.title}
              className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-3.5 shadow-2xs transition-all ${
                isPlaying
                  ? "border-[#5F6F52] bg-[#F0F4ED]/70"
                  : isTop1
                    ? "border-[#C17767] bg-gradient-to-r from-[#FBF2EF]/80 via-white to-[#FAF7F0] shadow-xs"
                    : "border-[#E8CBC3] bg-white hover:border-[#C17767] hover:shadow-xs"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => selectSong(isPlaying ? null : index)}
                  title={isPlaying ? "Pausar no site" : "Ouvir aqui no site"}
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-all cursor-pointer ${
                    isPlaying
                      ? "bg-[#5F6F52] text-white shadow-xs"
                      : isTop1
                        ? "bg-[#C17767] text-white shadow-xs hover:bg-[#B36858]"
                        : "bg-[#FBF2EF] text-[#C17767] hover:bg-[#C17767] hover:text-white"
                  }`}
                >
                  {isPlaying ? (
                    <Disc3 size={20} strokeWidth={1.75} className="animate-spin" />
                  ) : (
                    <Play size={17} fill="currentColor" className="ml-0.5" />
                  )}
                </button>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {isTop1 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#C17767] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-white">
                        <Star size={10} fill="currentColor" /> Top 1
                      </span>
                    )}
                    <p className="truncate font-serif text-base font-semibold text-[#3E2723] leading-tight">
                      {s.title}
                    </p>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-[#6E5F57]">
                    {s.artist} · <span className="text-[#C17767] font-medium">{s.tag}</span>
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => selectSong(isPlaying ? null : index)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
                    isPlaying
                      ? "bg-[#5F6F52] text-white"
                      : "border border-[#5F6F52]/40 bg-[#F0F4ED] text-[#5F6F52] hover:bg-[#5F6F52] hover:text-white"
                  }`}
                >
                  {isPlaying ? "Tocando..." : "▶ Ouvir no Site"}
                </button>
                <a
                  href={s.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-emerald-600/30 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800 transition-colors hover:bg-emerald-600 hover:text-white"
                >
                  Spotify
                </a>
                <a
                  href={s.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-red-500/30 bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-700 transition-colors hover:bg-red-600 hover:text-white"
                >
                  YouTube
                </a>
              </div>
            </div>
          );
        })}

        {pagePlaylist.some((s) => !s.featured) && (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setShowAllSongs((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E8CBC3] bg-white hover:bg-[#FAF7F0] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#5F6F52] shadow-2xs transition-all cursor-pointer"
            >
              {showAllSongs ? (
                <>
                  <ChevronUp size={15} /> Mostrar apenas os destaques
                </>
              ) : (
                <>
                  <ChevronDown size={15} /> Ver todas as {pagePlaylist.length} músicas
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Formulário para Sugerir Música (com Link Opcional) */}
      <Section title="Sugerir uma Música para a Cerimônia ou Festa" className="mt-8">
        <form onSubmit={submit} className="space-y-3.5 rounded-3xl border border-[#C8D4C0] bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 text-[#5F6F52] mb-1">
            <Music2 size={18} strokeWidth={2} />
            <h4 className="font-serif text-base font-semibold text-[#3E2723]">
              Qual música você gostaria de ouvir no grande dia?
            </h4>
          </div>

          {thanks && <Notice>{thanks}</Notice>}

          <div>
            <label className="block text-xs font-semibold text-[#3E2723] mb-1">Nome da Música *</label>
            <input
              required
              placeholder="Ex: A Thousand Years, La Vie en Rose, Evidências…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 rounded-xl border border-[#C8D4C0] bg-[#FAF9F6] px-3.5 text-xs text-[#3E2723] focus:border-[#5F6F52] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#3E2723] mb-1">
              Artista ou Banda (opcional)
            </label>
            <input
              placeholder="Ex: Christina Perri, Tom Jobim…"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="w-full h-10 rounded-xl border border-[#C8D4C0] bg-[#FAF9F6] px-3.5 text-xs text-[#3E2723] focus:border-[#5F6F52] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#3E2723] mb-1">
              Link da Música — YouTube ou Spotify (opcional)
            </label>
            <div className="relative">
              <LinkIcon
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E5F57]"
              />
              <input
                type="url"
                placeholder="https://open.spotify.com/... ou https://youtube.com/..."
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="w-full h-10 rounded-xl border border-[#C8D4C0] bg-[#FAF9F6] pl-9 pr-3.5 text-xs text-[#3E2723] focus:border-[#5F6F52] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-11 rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] text-white text-xs font-bold uppercase tracking-wider shadow-md transition-all cursor-pointer"
          >
            Enviar Sugestão de Música
          </button>
        </form>

        {/* Sugestões enviadas recentemente */}
        {customSuggestions.length > 0 && (
          <div className="mt-4 rounded-2xl border border-[#E8CBC3]/70 bg-[#FAF7F0] p-4 space-y-2">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#5F6F52]">
              Sugestões enviadas pelos convidados ({customSuggestions.length})
            </span>
            <ul className="space-y-1.5 text-xs">
              {customSuggestions.slice(0, 5).map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 border border-[#E8CBC3]/50"
                >
                  <div className="min-w-0">
                    <span className="font-serif font-semibold text-[#3E2723]">{item.title}</span>
                    {item.artist && <span className="text-[#6E5F57]"> — {item.artist}</span>}
                  </div>
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-[11px] font-semibold text-[#C17767] hover:underline"
                    >
                      Ouvir link ↗
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>
    </div>
  );
}
