"use client";

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import {
  ImagePlus,
  MessageSquareHeart,
  Trash2,
  CheckCircle2,
  ZoomIn,
  Upload,
  Plus,
  FolderHeart,
  FolderUp,
  ExternalLink,
} from "lucide-react";
import { INITIAL_MESSAGES, GOOGLE_DRIVE_PHOTOS_URL, type GuestMessage } from "@/lib/wedding";
import { ChapterHeader, Modal, Notice, Segmented } from "../ui";

type Tab = "album" | "recados";

interface PhotoItem {
  id: string;
  url: string;
  title: string;
  author: string;
}

interface PendingFile {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
}

const INITIAL_PHOTOS: PhotoItem[] = [
  {
    id: "1",
    url: "/assets/venue-villa-imperial.jpg",
    title: "O cenário do nosso grande dia",
    author: "Villa Imperial das Hortênsias",
  },
  {
    id: "2",
    url: "/assets/cota-paris-hd.jpg",
    title: "Jantar & Pedido de Noivado",
    author: "Anita & Giuseppe",
  },
  {
    id: "3",
    url: "/assets/cota-cafe-hd.jpg",
    title: "Manhã de Celebração",
    author: "14.02.2026",
  },
  {
    id: "4",
    url: "/assets/dresscode-convidados-ia.jpg",
    title: "Jardins ao Entardecer",
    author: "Ensaio Editorial",
  },
  {
    id: "5",
    url: "/assets/dresscode-convidados-salao-noite.jpg",
    title: "Salão Iluminado para a Festa",
    author: "Preparativos",
  },
  {
    id: "6",
    url: "/assets/seal-with-astromelias.png",
    title: "Lacre de Cera Oficial A / G",
    author: "Identidade Visual",
  },
];

const RELATION_COLORS: Record<string, string> = {
  "Família da noiva": "bg-[#FBF2EF] text-[#C17767] border-[#E8CBC3]",
  "Família do noivo": "bg-[#FBF2EF] text-[#C17767] border-[#E8CBC3]",
  Madrinha: "bg-[#F0F4ED] text-[#5F6F52] border-[#C8D4C0]",
  Padrinho: "bg-[#F0F4ED] text-[#5F6F52] border-[#C8D4C0]",
  Amigos: "bg-[#FFF9EE] text-[#B38F4D] border-[#EADBB8]",
  Convidado: "bg-[#FAF7F0] text-[#3E2723] border-[#E8E2D8]",
};

const PHOTOS_STORAGE_KEY = "anita_giuseppe_demo_photos_v1";

export default function AlbumRecados() {
  const [tab, setTab] = useState<Tab>("album");
  const [notice, setNotice] = useState<string | null>(null);

  const flash = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(null), 4000);
  };

  return (
    <div className="space-y-6">
      <ChapterHeader
        num="05"
        title="Álbum & Recados"
        intro="Compartilhe memórias com o casal e deixe uma palavra de carinho e bênção."
      />

      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        className="mx-auto mb-6 max-w-xs"
        options={[
          { value: "album", label: "Fotos & Memórias", icon: "📷" },
          { value: "recados", label: "Mural de Recados", icon: "💌" },
        ]}
      />

      {notice && (
        <div className="mb-4">
          <Notice>{notice}</Notice>
        </div>
      )}

      {tab === "album" ? <Album onUpload={flash} /> : <Mural onPost={flash} />}
    </div>
  );
}

// Converte um arquivo de imagem em Data URL (base64 comprimido) para que não suma ao recarregar a página
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        reject(new Error("Falha ao ler imagem"));
        return;
      }
      // Redimensiona em canvas para caber com folga no armazenamento local sem perder qualidade visual
      const img = new window.Image();
      img.onload = () => {
        try {
          const maxDim = 1280;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width >= height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.84));
            return;
          }
        } catch {
          // fallback para o dataUrl original
        }
        resolve(result);
      };
      img.onerror = () => resolve(result);
      img.src = result;
    };
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

function Album({ onUpload }: { onUpload: (msg: string) => void }) {
  const [customPhotos, setCustomPhotos] = useState<PhotoItem[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<PendingFile[]>([]);
  const [authorName, setAuthorName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePhoto, setActivePhoto] = useState<PhotoItem | null>(null);

  const initialIds = new Set(INITIAL_PHOTOS.map((p) => p.id));
  const photos = [...customPhotos, ...INITIAL_PHOTOS];

  // Carregar fotos persistidas localmente (limpando URLs temporárias blob: expiradas de testes antigos)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PHOTOS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PhotoItem[];
        const validCustom = parsed.filter(
          (p) =>
            p &&
            typeof p.url === "string" &&
            !p.url.startsWith("blob:") &&
            !initialIds.has(p.id)
        );
        setCustomPhotos(validCustom);
        localStorage.setItem(PHOTOS_STORAGE_KEY, JSON.stringify(validCustom));
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Selecionar fotos (múltiplas permitidas) e gerar Data URLs permanentes antes de enviar
  const handleSelectFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;

    const newPending: PendingFile[] = await Promise.all(
      files.map(async (file, idx) => {
        const dataUrl = await fileToDataUrl(file);
        return {
          id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          previewUrl: dataUrl,
          name: file.name.replace(/\.[^/.]+$/, ""),
        };
      })
    );

    setPendingPhotos((prev) => [...prev, ...newPending]);
  };

  // Remover foto individual da prévia antes de enviar
  const removePending = (id: string) => {
    setPendingPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // Remover foto enviada da galeria (ex: foto de teste)
  const removeUploadedPhoto = (id: string) => {
    setCustomPhotos((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      try {
        localStorage.setItem(PHOTOS_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Confirmar envio das fotos da prévia para o álbum
  const handleConfirmUpload = () => {
    if (!pendingPhotos.length) return;
    setIsSubmitting(true);

    setTimeout(() => {
      const uploaded: PhotoItem[] = pendingPhotos.map((p) => ({
        id: p.id,
        url: p.previewUrl,
        title: p.name,
        author: authorName.trim() ? `Enviado por ${authorName.trim()}` : "Enviado por um convidado",
      }));

      const updatedCustom = [...uploaded, ...customPhotos];
      setCustomPhotos(updatedCustom);

      try {
        localStorage.setItem(PHOTOS_STORAGE_KEY, JSON.stringify(updatedCustom));
      } catch {
        // ignore
      }

      onUpload(
        pendingPhotos.length === 1
          ? "Foto adicionada com sucesso ao álbum!"
          : `${pendingPhotos.length} fotos adicionadas com sucesso!`
      );

      setPendingPhotos([]);
      setAuthorName("");
      setIsSubmitting(false);
    }, 350);
  };

  return (
    <div className="space-y-6">
      {/* Opções de Envio: Pelo Site ou Google Drive dos Noivos */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Opção 1: Enviar Fotos pelo Site */}
        <label className="flex cursor-pointer flex-col items-center justify-between rounded-3xl border-2 border-dashed border-[#E8CBC3] bg-white p-6 text-center transition-all hover:border-[#C17767] hover:bg-[#FBF2EF]/40 shadow-xs group">
          <div className="flex flex-col items-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#FBF2EF] text-[#C17767] mb-3 group-hover:scale-105 transition-transform">
              <ImagePlus size={24} strokeWidth={1.75} />
            </span>
            <span className="font-serif text-lg font-semibold text-[#3E2723]">
              Enviar Fotos pelo Site
            </span>
            <span className="mt-1 text-xs text-[#6E5F57] leading-relaxed">
              Adicione fotos direto do seu celular para aparecerem no mural de memórias do casamento.
            </span>
          </div>
          <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#C17767] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md group-hover:bg-[#B36858] transition-all">
            <Upload size={14} /> Selecionar Fotos
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleSelectFiles}
            className="sr-only"
          />
        </label>

        {/* Opção 2: Pasta do Google Drive dos Noivos */}
        <div className="flex flex-col items-center justify-between rounded-3xl border border-[#C8D4C0] bg-[#F0F4ED]/70 p-6 text-center transition-all hover:border-[#5F6F52] hover:bg-[#F0F4ED] shadow-xs group">
          <div className="flex flex-col items-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#5F6F52] mb-3 shadow-xs border border-[#C8D4C0] group-hover:scale-105 transition-transform">
              <FolderHeart size={24} strokeWidth={1.75} />
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-serif text-lg font-semibold text-[#3E2723]">
                Pasta do Google Drive
              </span>
              <span className="rounded-full bg-[#5F6F52] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                Alta Resolução
              </span>
            </div>
            <span className="mt-1 text-xs text-[#6E5F57] leading-relaxed">
              Prefere subir vídeos ou fotos na resolução original máxima? Envie diretamente para a pasta na nuvem dos noivos.
            </span>
          </div>
          <a
            href={GOOGLE_DRIVE_PHOTOS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#5F6F52] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-[#4E5C43] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <FolderUp size={14} />
            <span>Abrir Pasta do Drive</span>
            <ExternalLink size={13} className="opacity-80" />
          </a>
        </div>
      </div>

      {/* ÁREA DE PRÉVIA ANTES DE ENVIAR (Conforme solicitado pelo usuário) */}
      {pendingPhotos.length > 0 && (
        <div className="rounded-3xl border-2 border-[#5F6F52] bg-[#FAF7F0] p-5 shadow-md animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-3 border-b border-[#C8D4C0] pb-2.5">
            <div className="flex items-center gap-2 text-[#5F6F52]">
              <CheckCircle2 size={18} strokeWidth={2} />
              <h4 className="font-serif text-base font-semibold text-[#3E2723]">
                Prévia antes de Enviar ({pendingPhotos.length} {pendingPhotos.length === 1 ? "foto selecionada" : "fotos selecionadas"})
              </h4>
            </div>
            <label className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#C17767] hover:underline">
              <Plus size={13} /> Mais fotos
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleSelectFiles}
                className="sr-only"
              />
            </label>
          </div>

          <p className="text-xs text-[#6E5F57] mb-4">
            Confira as fotos abaixo antes de confirmar o envio. Você pode remover qualquer foto indesejada clicando no ícone da lixeira.
          </p>

          {/* Grid de miniaturas da prévia */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {pendingPhotos.map((item) => (
              <div
                key={item.id}
                className="relative group rounded-2xl overflow-hidden border border-[#E8CBC3] bg-white aspect-square shadow-2xs"
              >
                <Image
                  src={item.previewUrl}
                  alt={item.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  title="Remover foto da seleção"
                  onClick={() => removePending(item.id)}
                  className="absolute top-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-red-600/90 text-white shadow-md hover:bg-red-700 transition-all cursor-pointer"
                >
                  <Trash2 size={13} strokeWidth={2} />
                </button>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-[10px] text-white truncate font-medium">
                    {item.name}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Identificação de quem está enviando */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-[#3E2723] mb-1">
              Seu nome (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Carlos & Família"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="w-full h-10 rounded-xl border border-[#C8D4C0] bg-white px-3 text-xs text-[#3E2723] placeholder:text-[#6E5F57]/60 focus:border-[#5F6F52] focus:outline-none"
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => {
                pendingPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
                setPendingPhotos([]);
              }}
              className="flex-1 h-11 rounded-full border border-[#E8CBC3] bg-white text-xs font-semibold text-[#6E5F57] hover:bg-[#FBF2EF] cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmUpload}
              className="flex-1 h-11 rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] text-white text-xs font-bold uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting
                ? "Enviando..."
                : `Confirmar e Enviar (${pendingPhotos.length})`}
            </button>
          </div>
        </div>
      )}

      {/* Grid Oficial do Álbum de Fotos */}
      <div>
        <h4 className="font-serif text-lg font-semibold text-[#3E2723] mb-3">
          Galeria de Fotos ({photos.length} registros)
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((p) => {
            const isCustom = !initialIds.has(p.id);
            return (
              <div
                key={p.id}
                onClick={() => setActivePhoto(p)}
                className="group relative overflow-hidden rounded-2xl border border-[#E8CBC3] bg-white shadow-2xs transition-all hover:shadow-md cursor-pointer"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-[#FAF7F0]">
                  <Image
                    src={p.url}
                    alt={p.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    unoptimized={p.url.startsWith("data:") || p.url.startsWith("blob:")}
                    sizes="(max-width: 640px) 50vw, 200px"
                  />
                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-[#3E2723] shadow-xs">
                      <ZoomIn size={16} />
                    </span>
                  </div>
                  {isCustom && (
                    <button
                      type="button"
                      title="Remover foto enviada"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeUploadedPhoto(p.id);
                      }}
                      className="absolute top-2 right-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-red-600/90 text-white opacity-0 group-hover:opacity-100 shadow-md hover:bg-red-700 transition-all cursor-pointer"
                    >
                      <Trash2 size={13} strokeWidth={2} />
                    </button>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="font-serif text-xs font-medium text-[#3E2723] leading-tight truncate">
                    {p.title}
                  </p>
                  <p className="text-[10px] text-[#6E5F57] truncate mt-0.5">{p.author}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lightbox / Modal de Foto Ampliada */}
      <Modal open={activePhoto !== null} onClose={() => setActivePhoto(null)}>
        {activePhoto && (
          <div className="text-center space-y-3">
            <div className="relative aspect-square sm:aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[#E8CBC3] shadow-md bg-black">
              <Image
                src={activePhoto.url}
                alt={activePhoto.title}
                fill
                className="object-contain"
                unoptimized={activePhoto.url.startsWith("data:") || activePhoto.url.startsWith("blob:")}
                sizes="(max-width: 640px) 100vw, 500px"
              />
            </div>
            <h4 className="font-serif text-lg font-semibold text-[#3E2723]">
              {activePhoto.title}
            </h4>
            <p className="text-xs text-[#6E5F57]">{activePhoto.author}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

const MURAL_STORAGE_KEY = "anita_giuseppe_demo_guest_mural_v1";

function Mural({ onPost }: { onPost: (msg: string) => void }) {
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [author, setAuthor] = useState("");
  const [relation, setRelation] = useState("Convidado");
  const [text, setText] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(MURAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as GuestMessage[];
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      } else {
        setMessages(INITIAL_MESSAGES);
      }
    } catch {
      setMessages(INITIAL_MESSAGES);
    }

    fetch("/api/sync")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.ok && Array.isArray(data.mural) && data.mural.length > 0) {
          setMessages(data.mural);
          try {
            localStorage.setItem(MURAL_STORAGE_KEY, JSON.stringify(data.mural));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !text.trim()) return;

    const newMsg: GuestMessage = {
      name: author.trim(),
      relation,
      message: text.trim(),
      date: new Date().toLocaleDateString("pt-BR"),
    };

    setMessages((prev) => {
      const updated = [newMsg, ...prev];
      try {
        localStorage.setItem(MURAL_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mural: updated,
          logEntry: {
            action: "rsvp_confirmado",
            actor: `${newMsg.name} (${newMsg.relation || "Convidado"})`,
            summary: "Publicou um recado no Mural do Capítulo 05",
            details: `Recado: “${newMsg.message}”`,
            payload: newMsg,
          },
        }),
      }).catch(() => {});
      return updated;
    });

    setAuthor("");
    setText("");
    onPost("Recado publicado no mural! Obrigado por abençoar os noivos.");
  };

  return (
    <div className="space-y-6">
      {/* Formulário de Recado */}
      <form onSubmit={submit} className="space-y-3.5 rounded-3xl border border-[#E8CBC3] bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2 text-[#C17767] mb-1">
          <MessageSquareHeart size={20} strokeWidth={1.75} />
          <h3 className="font-serif text-lg font-semibold text-[#3E2723]">Deixe seus Votos de Felicidades</h3>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#3E2723] mb-1">Seu Nome *</label>
          <input
            type="text"
            required
            placeholder="Ex: Tio Roberto ou Camila e Família"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="w-full h-10 rounded-xl border border-[#E8CBC3] bg-[#FAF9F6] px-3.5 text-xs text-[#3E2723] focus:border-[#C17767] focus:bg-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#3E2723] mb-1">Você é...</label>
          <select
            value={relation}
            onChange={(e) => setRelation(e.target.value)}
            className="w-full h-10 rounded-xl border border-[#E8CBC3] bg-[#FAF9F6] px-3 text-xs text-[#3E2723] focus:border-[#C17767] focus:bg-white focus:outline-none"
          >
            <option value="Convidado">Convidado(a)</option>
            <option value="Família da noiva">Família da Noiva</option>
            <option value="Família do noivo">Família do Noivo</option>
            <option value="Amigos">Amigo(a) dos Noivos</option>
            <option value="Pastores">Pastor / Líder</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#3E2723] mb-1">Mensagem ou Oração *</label>
          <textarea
            required
            rows={3}
            placeholder="Escreva sua mensagem com carinho e bênçãos para o novo lar dos noivos…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-xl border border-[#E8CBC3] bg-[#FAF9F6] p-3 text-xs text-[#3E2723] focus:border-[#C17767] focus:bg-white focus:outline-none resize-none"
          />
        </div>

        <button
          type="submit"
          className="w-full h-11 rounded-full bg-[#C17767] hover:bg-[#B36858] text-white text-xs font-bold uppercase tracking-wider shadow-md transition-all cursor-pointer"
        >
          Publicar no Mural
        </button>
      </form>

      {/* Cartões de Mensagens */}
      <div className="space-y-3">
        {messages.length === 0 ? (
          <div className="rounded-3xl border border-[#E8CBC3]/70 bg-white p-6 text-center space-y-2 shadow-2xs">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#FAF7F0] text-[#C17767] mb-1">
              <MessageSquareHeart size={24} />
            </div>
            <p className="font-serif text-lg font-semibold text-[#3E2723]">
              Mural pronto para receber suas mensagens! 💌
            </p>
            <p className="text-xs text-[#6E5F57] max-w-sm mx-auto leading-relaxed">
              Seja o primeiro a deixar uma palavra de carinho para celebrar o novo lar de Anita e Giuseppe.
            </p>
          </div>
        ) : (
          messages.map((m, i) => {
            const badgeClass = m.relation ? RELATION_COLORS[m.relation] || "bg-[#FAF7F0] text-[#3E2723]" : "";
            return (
              <div
                key={`${m.name}-${i}`}
                className="rounded-2xl border border-[#E8CBC3]/70 bg-white p-4 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-base font-semibold text-[#3E2723]">{m.name}</span>
                    {m.relation && (
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}
                      >
                        {m.relation}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#6E5F57] tabular-nums">{m.date}</span>
                </div>
                <p className="font-serif text-sm italic leading-relaxed text-[#3E2723]/90">
                  “{m.message}”
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
