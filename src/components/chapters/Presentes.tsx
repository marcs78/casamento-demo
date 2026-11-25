"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { ArrowUpRight, Check, Copy, ExternalLink, Gift, QrCode, ShoppingBag, Sparkles, Heart } from "lucide-react";
import { AMAZON_WISHLIST_URL, COTAS, GIFTS, PIX_KEY, type Cota } from "@/lib/wedding";
import { generatePixPayload } from "@/lib/pix";
import {
  addGiftContribution,
  getGiftContributions,
  getOfficialGuestList,
  subscribeToWeddingSync,
  type GiftContribution,
  type GiftType,
  type GuestRecord,
} from "@/lib/guestList";
import { playNotificationChime } from "@/app/admin/cerimonialista/page";
import { ChapterHeader, Modal, Segmented } from "../ui";

type View = "cotas" | "itens";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function Presentes() {
  const [view, setView] = useState<View>("cotas");
  const [cota, setCota] = useState<Cota | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("Todos");
  const [cardQrCodes, setCardQrCodes] = useState<Record<string, string>>({});
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [gifts, setGifts] = useState<GiftContribution[]>([]);
  const [selectedGiftForNotify, setSelectedGiftForNotify] = useState<{
    title: string;
    amount?: number;
    type?: GiftType;
    cotaId?: string;
  } | null>(null);

  const categories = ["Todos", ...Array.from(new Set(GIFTS.map((g) => g.category)))];
  const filteredGifts =
    activeCategory === "Todos" ? GIFTS : GIFTS.filter((g) => g.category === activeCategory);

  // Carrega e sincroniza presentes em tempo real
  useEffect(() => {
    setGifts(getGiftContributions());
    fetch("/api/gifts")
      .then((r) => r.json())
      .then((data) => {
        if (data?.gifts && Array.isArray(data.gifts)) {
          setGifts(data.gifts);
          try {
            localStorage.setItem("anita_giuseppe_demo_gifts_v1", JSON.stringify(data.gifts));
          } catch {}
        }
      })
      .catch(() => {});

    const unsubscribe = subscribeToWeddingSync((evt) => {
      if (
        evt.type === "gift_submitted" ||
        evt.type === "gift_updated" ||
        evt.type === "storage_change"
      ) {
        setGifts(getGiftContributions());
      }
    });
    return () => unsubscribe();
  }, []);

  // Gera o QR Code Pix individual para cada uma das 6 cotas
  useEffect(() => {
    let active = true;
    const generateAll = async () => {
      const entries: Record<string, string> = {};
      for (const item of COTAS) {
        try {
          const payload = generatePixPayload({
            key: PIX_KEY,
            name: "Anita e Giuseppe",
            city: "Petropolis",
            amount: item.value,
            description: `Cota ${item.title}`,
          });
          const dataUrl = await QRCode.toDataURL(payload, {
            width: 180,
            margin: 1,
            color: {
              dark: "#3E2723",
              light: "#FFFFFF",
            },
          });
          entries[item.id] = dataUrl;
        } catch {
          // ignore
        }
      }
      if (active) setCardQrCodes(entries);
    };
    generateAll();
    return () => {
      active = false;
    };
  }, []);

  const copySingleCotaPix = async (item: Cota) => {
    try {
      const payload = generatePixPayload({
        key: PIX_KEY,
        name: "Anita e Giuseppe",
        city: "Petropolis",
        amount: item.value,
        description: `Cota ${item.title}`,
      });
      await navigator.clipboard.writeText(payload);
      setCopiedCardId(item.id);
      setTimeout(() => setCopiedCardId(null), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      <ChapterHeader
        num="03"
        title="Lista de Presentes"
        intro="Escolha uma forma especial de contribuir com o início do nosso novo lar."
      />

      {/* Alternador Cotas via Pix / Itens na Loja (como abas separadas) */}
      <Segmented<View>
        value={view}
        onChange={setView}
        className="mx-auto mb-6 max-w-sm"
        options={[
          { value: "cotas", label: `Cotas via Pix (${COTAS.length})`, icon: "✨" },
          { value: "itens", label: `Itens na Loja (${GIFTS.length})`, icon: "🎁" },
        ]}
      />

      {view === "cotas" ? (
        <div className="space-y-6">
          {/* Grid das 6 Cotas Simbólicas com QR Code Pix individual e opção direta de confirmação */}
          <div className="grid gap-4 sm:grid-cols-2">
            {COTAS.map((c) => {
              const cotaContribs = gifts.filter(
                (g) =>
                  g.cotaId === c.id ||
                  (g.type === "pix_cota" && g.giftTitle.toLowerCase().includes(c.title.toLowerCase()))
              );

              return (
                <div
                  key={c.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-[#E8CBC3] bg-white shadow-2xs transition-all hover:border-[#C17767] hover:shadow-md"
                >
                  {/* Imagem Temática da Cota */}
                  <div className="relative h-36 w-full overflow-hidden bg-[#FAF7F0]">
                    <Image
                      src={c.image}
                      alt={c.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, 300px"
                    />
                    <span className="absolute top-2.5 right-2.5 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-[#C17767] shadow-xs">
                      {brl(c.value)}
                    </span>
                    {cotaContribs.length > 0 && (
                      <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-bold text-[#5F6F52] shadow-xs">
                        <Heart size={11} className="fill-[#5F6F52]" />
                        {cotaContribs.length} {cotaContribs.length === 1 ? "presente recebido" : "presentes recebidos"}
                      </span>
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="font-serif text-lg font-semibold text-[#3E2723] leading-snug">
                        {c.title}
                      </h3>
                      <p className="mt-1 text-xs text-[#6E5F57] leading-relaxed">{c.text}</p>
                      {cotaContribs.length > 0 && (
                        <p className="mt-1.5 text-[11px] text-[#5F6F52] font-medium leading-tight">
                          Contribuição de: {cotaContribs.map((cg) => cg.guestName).join(", ")}
                        </p>
                      )}
                    </div>

                    {/* QR Code Pix Individual da Cota (CPF 090.096.099-01) */}
                    <div className="flex items-center gap-3 rounded-2xl border border-[#E8CBC3]/70 bg-[#FAF7F0] p-2.5">
                      <button
                        type="button"
                        onClick={() => setCota(c)}
                        title="Clique para ampliar o QR Code ou escolher mais cotas"
                        className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#E8CBC3] bg-white p-1 shadow-2xs cursor-pointer hover:scale-105 transition-transform"
                      >
                        {cardQrCodes[c.id] ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={cardQrCodes[c.id]}
                            alt={`QR Code Pix ${c.title}`}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-[#C17767]">
                            <QrCode size={22} />
                          </div>
                        )}
                      </button>

                      <div className="min-w-0 flex-1 text-left">
                        <span className="block text-[9.5px] font-bold uppercase tracking-wider text-[#5F6F52]">
                          Pix Fechado · Valor Fixo
                        </span>
                        <span className="block text-xs font-serif font-bold text-[#3E2723]">
                          {brl(c.value)}
                        </span>
                        <button
                          type="button"
                          onClick={() => copySingleCotaPix(c)}
                          className="mt-1 inline-flex items-center gap-1 text-[10.5px] font-bold text-[#C17767] hover:underline cursor-pointer"
                        >
                          {copiedCardId === c.id ? (
                            <>
                              <Check size={11} /> Pix Copia e Cola ({brl(c.value)}) copiado!
                            </>
                          ) : (
                            <>
                              <Copy size={11} /> Copiar Pix Copia e Cola ({brl(c.value)})
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Opções: Contribuir via Pix E Opção Direta "Já enviei o Pix" */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setCota(c)}
                        className="h-10 rounded-full bg-[#C17767] hover:bg-[#B36858] text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                      >
                        <Gift size={14} strokeWidth={2} />
                        Contribuir Pix
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGiftForNotify({
                            title: `Cota: ${c.title}`,
                            amount: c.value,
                            type: "pix_cota",
                            cotaId: c.id,
                          });
                          setNotifyModalOpen(true);
                        }}
                        className="h-10 rounded-full border border-[#5F6F52] bg-[#F0F4ED] hover:bg-[#E3EBDD] text-[#5F6F52] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                      >
                        <Check size={14} strokeWidth={2.5} />
                        Já fiz o Pix
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mensagem convidativa indicando a aba separada para quem preferir um item específico */}
          <div className="rounded-3xl border border-[#E8CBC3] bg-[#FAF7F0] p-6 text-center shadow-2xs space-y-3">
            <span className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] text-[#C17767]">
              Prefere um presente físico?
            </span>
            <h3 className="font-serif text-xl font-semibold text-[#3E2723]">
              Caso prefira nos presentear com um item específico
            </h3>
            <p className="text-xs text-[#6E5F57] max-w-md mx-auto leading-relaxed">
              Preparamos um espaço à parte com os itens específicos para o nosso novo lar e o link direto da nossa Lista Oficial na Amazon.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setView("itens");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all cursor-pointer"
              >
                <ShoppingBag size={14} />
                Ver Itens na Loja ({GIFTS.length})
              </button>

              <a
                href={AMAZON_WISHLIST_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#C17767] bg-white hover:bg-[#FDF0EE] px-4 py-2.5 text-xs font-semibold text-[#C17767] transition-colors"
              >
                Abrir Lista na Amazon <ExternalLink size={13} />
              </a>
            </div>
          </div>

          {/* Banner Simples e Direto */}
          <div className="rounded-3xl border border-[#E8CBC3] bg-[#FAF7F0] p-6 text-center shadow-2xs space-y-3">
            <h3 className="font-serif text-xl font-semibold text-[#3E2723]">
              Já nos presenteou?
            </h3>
            <div>
              <button
                type="button"
                onClick={() => {
                  setSelectedGiftForNotify(null);
                  setNotifyModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#C17767] hover:bg-[#B36858] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all cursor-pointer"
              >
                <Gift size={15} />
                Avise os noivos
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ABA SEPARADA: ITENS NA LOJA + LINK DA LISTA AMAZON */
        <div className="space-y-5">
          {/* Card Destaque com Link Oficial da Lista Completa na Amazon */}
          <div className="rounded-3xl border border-[#C8D4C0] bg-gradient-to-br from-[#F0F4ED] via-white to-[#FAF7F0] p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#5F6F52]">
                Lista Oficial na Amazon · Endereço Configurado
              </span>
              <h3 className="font-serif text-lg font-semibold text-[#3E2723]">
                Itens Específicos para o Nosso Lar
              </h3>
              <p className="text-xs text-[#6E5F57] leading-relaxed">
                Todos os {GIFTS.length} itens abaixo já estão vinculados à nossa Lista de Casamento na Amazon com o nosso endereço de entrega configurado automaticamente no checkout.
              </p>
            </div>
            <a
              href={AMAZON_WISHLIST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-2 rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all"
            >
              Ver Lista na Amazon <ExternalLink size={14} />
            </a>
          </div>

          {/* Filtro rápido por categoria */}
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {categories.map((cat) => {
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? "bg-[#5F6F52] text-white shadow-2xs"
                      : "border border-[#E8CBC3] bg-white text-[#6E5F57] hover:border-[#C17767] hover:text-[#3E2723]"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Grid de Produtos com Fotos, Link da Amazon e Botão Direto "Já comprei este item" */}
          <div className="grid gap-3.5 sm:grid-cols-2">
            {filteredGifts.map((g) => {
              const boughtContribs = gifts.filter(
                (contrib) =>
                  (contrib.type === "lista_amazon" || contrib.type === "presente_fisico") &&
                  (contrib.giftTitle.toLowerCase().trim() === g.title.toLowerCase().trim() ||
                    contrib.giftTitle.toLowerCase().includes(g.title.toLowerCase().slice(0, 25)) ||
                    g.title.toLowerCase().includes(contrib.giftTitle.toLowerCase().slice(0, 25)))
              );
              const isBought = boughtContribs.length > 0;

              return (
                <div
                  key={g.title}
                  className={`group flex flex-col sm:flex-row gap-3.5 items-start sm:items-center overflow-hidden rounded-3xl border bg-white p-3.5 shadow-2xs transition-all ${
                    isBought
                      ? "border-[#A4C2A5] bg-gradient-to-r from-[#F6FAF5] to-white hover:border-[#5F6F52]"
                      : "border-[#E8CBC3] hover:border-[#5F6F52] hover:shadow-md"
                  }`}
                >
                  {/* Thumbnail do Produto */}
                  <div className="relative h-22 w-22 shrink-0 overflow-hidden rounded-2xl border border-[#E8CBC3]/60 bg-white mx-auto sm:mx-0">
                    <Image
                      src={g.image}
                      alt={g.title}
                      fill
                      className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                      sizes="88px"
                    />
                  </div>

                  <div className="min-w-0 flex-1 w-full space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#C17767]">
                        {g.category}
                      </span>
                      {isBought && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF3E8] border border-[#A4C2A5] px-2 py-0.5 text-[10px] font-bold text-[#2E5A2D]">
                          <Check size={10} strokeWidth={3} />
                          Já comprado por {boughtContribs.map((b) => b.guestName).join(", ")}
                        </span>
                      )}
                    </div>

                    <h4 className="font-serif text-sm font-semibold text-[#3E2723] leading-snug">
                      {g.title}
                    </h4>

                    {/* Botões de Ação para o Item: Ver na Amazon + Já comprei este item */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <a
                        href={g.url || AMAZON_WISHLIST_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-[#5F6F52] bg-white hover:bg-[#F0F4ED] px-3 py-1.5 text-xs font-semibold text-[#5F6F52] transition-colors shadow-2xs"
                      >
                        <span>Ver na Amazon</span>
                        <ExternalLink size={12} />
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGiftForNotify({
                            title: g.title,
                            type: "lista_amazon",
                          });
                          setNotifyModalOpen(true);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                          isBought
                            ? "border border-[#C8D4C0] bg-[#FAF7F0] text-[#5F6F52] hover:bg-[#E3EBDD]"
                            : "bg-[#C17767] hover:bg-[#B36858] text-white shadow-xs"
                        }`}
                      >
                        <Check size={12} strokeWidth={2.5} />
                        <span>{isBought ? "Já comprou também? Avisar" : "Já comprei este item"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Banner Simples e Direto */}
          <div className="rounded-3xl border border-[#E8CBC3] bg-[#FAF7F0] p-6 text-center shadow-2xs space-y-3">
            <h3 className="font-serif text-xl font-semibold text-[#3E2723]">
              Já nos presenteou?
            </h3>
            <div>
              <button
                type="button"
                onClick={() => {
                  setSelectedGiftForNotify(null);
                  setNotifyModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#C17767] hover:bg-[#B36858] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all cursor-pointer"
              >
                <Gift size={15} />
                Avise os noivos
              </button>
            </div>
          </div>
        </div>
      )}

      <CotaModal
        cota={cota}
        onClose={() => setCota(null)}
        onNotify={(item, qty) => {
          setSelectedGiftForNotify({
            title: `Cota: ${item.title}`,
            amount: item.value * qty,
            type: "pix_cota",
            cotaId: item.id,
          });
          setCota(null);
          setNotifyModalOpen(true);
        }}
      />

      <NotifyGiftModal
        open={notifyModalOpen}
        onClose={() => setNotifyModalOpen(false)}
        defaultGift={selectedGiftForNotify}
        onSaved={() => setGifts(getGiftContributions())}
      />
    </div>
  );
}

function CotaModal({
  cota,
  onClose,
  onNotify,
}: {
  cota: Cota | null;
  onClose: () => void;
  onNotify: (cota: Cota, qty: number) => void;
}) {
  const [qty, setQty] = useState(1);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [copiedType, setCopiedType] = useState<"emv" | "key" | null>(null);

  useEffect(() => {
    if (!cota) return;
    let active = true;
    const payload = generatePixPayload({
      key: PIX_KEY,
      name: "Anita e Giuseppe",
      city: "Petropolis",
      amount: cota.value * qty,
      description: `Cota ${cota.title}`,
    });

    QRCode.toDataURL(payload, {
      width: 240,
      margin: 1,
      color: {
        dark: "#3E2723",
        light: "#FFFFFF",
      },
    })
      .then((url) => {
        if (active) setQrCodeUrl(url);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [cota, qty]);

  const close = () => {
    onClose();
    setQty(1);
    setCopiedType(null);
  };

  const copyPixCode = async () => {
    if (!cota) return;
    try {
      const payload = generatePixPayload({
        key: PIX_KEY,
        name: "Anita e Giuseppe",
        city: "Petropolis",
        amount: cota.value * qty,
        description: `Cota ${cota.title}`,
      });
      await navigator.clipboard.writeText(payload);
      setCopiedType("emv");
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <Modal open={!!cota} onClose={close}>
      {cota && (
        <div className="space-y-3.5">
          {/* Foto Temática da Cota 100% Responsiva */}
          <div className="relative h-36 sm:h-44 w-full overflow-hidden rounded-2xl border border-[#E8CBC3]/70 bg-[#FAF7F0] shadow-xs">
            <Image
              src={cota.image}
              alt={cota.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 400px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#3E2723]/80 via-[#3E2723]/20 to-transparent flex items-end justify-between p-3">
              <span className="text-[10px] uppercase tracking-widest text-white font-bold drop-shadow-sm">
                Cota Simbólica via Pix
              </span>
              <span className="rounded-full bg-white/95 px-2.5 py-0.5 text-xs font-bold text-[#C17767] shadow-xs">
                {brl(cota.value)}
              </span>
            </div>
          </div>

          <div className="text-center">
            <h3 className="font-serif text-xl sm:text-2xl font-semibold text-[#3E2723] leading-snug">
              {cota.title}
            </h3>
            <p className="text-xs text-[#6E5F57] mt-0.5 leading-relaxed">{cota.text}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#3E2723] mb-1.5 text-center">
              Selecione a quantidade de cotas:
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setQty(n)}
                  className={`cursor-pointer rounded-2xl border py-1.5 px-1 text-center transition-all ${
                    qty === n
                      ? "border-[#C17767] bg-[#C17767] text-white shadow-xs"
                      : "border-[#E8CBC3] bg-white text-[#3E2723] hover:border-[#C17767]"
                  }`}
                >
                  <span className="block text-[10px] opacity-80">{n}×</span>
                  <span className="block text-[11px] font-bold mt-0.5">{brl(cota.value * n)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* QR Code Pix Dinâmico com Valor Fixo e Travado */}
          <div className="rounded-2xl border border-[#E8CBC3] bg-[#FAF7F0] p-3.5 text-center space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#5F6F52]">
              Aponte a câmera do seu banco para o QR Code Pix
            </p>

            <div className="mx-auto inline-flex items-center justify-center min-h-[144px] min-w-[144px] rounded-2xl border border-[#E8CBC3] bg-white p-2 shadow-xs">
              {qrCodeUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={qrCodeUrl}
                  alt={`QR Code Pix ${cota.title}`}
                  className="h-36 w-36 sm:h-40 sm:w-40 object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-[#C17767] py-6 px-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#C17767] border-t-transparent" />
                  <span className="text-[11px] text-[#6E5F57]">Gerando Pix...</span>
                </div>
              )}
            </div>

            <div>
              <span className="inline-block rounded-full bg-[#EBF3E8] border border-[#A4C2A5] px-2.5 py-0.5 text-[10px] font-bold text-[#2E5A2D] mb-0.5">
                🔒 Pix Fechado · Valor Travado na Cota
              </span>
              <p className="font-serif text-2xl font-bold text-[#C17767]">
                Valor: {brl(cota.value * qty)}
              </p>
              <p className="text-[11px] text-[#6E5F57] mt-0.5 leading-snug">
                O valor é configurado diretamente no QR Code e no Pix Copia e Cola para garantir o valor exato da cota.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={copyPixCode}
              className="w-full h-11 rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] text-white text-xs font-bold uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              {copiedType === "emv" ? <Check size={16} strokeWidth={2.5} /> : <Copy size={16} strokeWidth={2} />}
              {copiedType === "emv"
                ? `Pix Copia e Cola (${brl(cota.value * qty)}) copiado!`
                : `Copiar Pix Copia e Cola (${brl(cota.value * qty)})`}
            </button>

            <button
              type="button"
              onClick={() => onNotify(cota, qty)}
              className="w-full h-10 rounded-full border border-[#C17767] bg-[#FAF7F0] hover:bg-[#FBE4E0] text-[#C17767] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
            >
              <Sparkles size={14} />
              Já fez o Pix desta cota? Avise os noivos com carinho
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function NotifyGiftModal({
  open,
  onClose,
  defaultGift,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  defaultGift?: { title: string; amount?: number; type?: GiftType; cotaId?: string } | null;
  onSaved?: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedType, setSelectedType] = useState<GiftType>(defaultGift?.type || "pix_cota");
  const [giftTitle, setGiftTitle] = useState(defaultGift?.title || "");
  const [amount, setAmount] = useState(defaultGift?.amount ? String(defaultGift.amount) : "");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [officialGuests, setOfficialGuests] = useState<GuestRecord[]>([]);

  useEffect(() => {
    if (open) {
      setOfficialGuests(getOfficialGuestList());
    }
  }, [open]);

  useEffect(() => {
    if (defaultGift) {
      setSelectedType(defaultGift.type || "pix_cota");
      setGiftTitle(defaultGift.title || "");
      if (defaultGift.amount) setAmount(String(defaultGift.amount));
    } else {
      setSelectedType("pix_cota");
      setGiftTitle(`Cota: ${COTAS[0].title}`);
      setAmount(String(COTAS[0].value));
    }
  }, [defaultGift, open]);

  // Sugestões inteligentes de nomes da lista oficial para agilizar o preenchimento
  const matchingGuests = useMemo(() => {
    if (!name.trim() || name.trim().length < 2) return [];
    const q = name.trim().toLowerCase();
    const matches: { name: string; phone?: string }[] = [];

    for (const g of officialGuests) {
      if (g.primaryName.toLowerCase().includes(q)) {
        matches.push({ name: g.primaryName, phone: g.phone });
      }
      for (const m of g.familyMembers) {
        const mName = typeof m === "string" ? m : m.name;
        const mPhone = typeof m === "string" ? undefined : m.phone || g.phone;
        if (
          mName.toLowerCase().includes(q) &&
          !matches.some((x) => x.name.toLowerCase() === mName.toLowerCase())
        ) {
          matches.push({ name: mName, phone: mPhone });
        }
      }
      if (matches.length >= 4) break;
    }
    return matches.slice(0, 4);
  }, [name, officialGuests]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const numAmount = parseFloat(amount.replace(/[^\d.,]/g, "").replace(",", ".")) || undefined;

    addGiftContribution({
      guestName: name.trim(),
      phone: phone.trim() || undefined,
      type: selectedType,
      giftTitle: giftTitle.trim() || (selectedType === "pix_avulso" ? "Contribuição Pix" : "Presente especial"),
      cotaId: defaultGift?.cotaId,
      amount: numAmount,
      message: message.trim() || undefined,
      confirmedAtBank: false,
      thanked: false,
    });

    playNotificationChime(true);
    setSubmitted(true);
    onSaved?.();
  };

  const handleClose = () => {
    setSubmitted(false);
    setName("");
    setPhone("");
    setAmount("");
    setMessage("");
    setGiftTitle("");
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose}>
      {submitted ? (
        <div className="py-6 text-center space-y-3">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#F0F4ED] text-[#5F6F52] border border-[#C8D4C0]">
            <Heart size={28} className="fill-[#5F6F52]" />
          </div>
          <h3 className="font-serif text-2xl font-semibold text-[#3E2723]">Muito Obrigado!</h3>
          <p className="text-xs text-[#6E5F57] max-w-sm mx-auto leading-relaxed">
            Anita &amp; Giuseppe receberam sua notificação e recado com imensa gratidão e carinho! O seu presente foi registrado com sucesso.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] px-6 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-xs cursor-pointer"
            >
              Concluir
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-center">
            <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-[#FAF7F0] text-[#C17767] border border-[#E8CBC3] mb-2">
              <Gift size={20} />
            </div>
            <h3 className="font-serif text-2xl font-semibold text-[#3E2723]">
              {defaultGift?.type === "pix_cota"
                ? "Confirmar Pix da Cota"
                : defaultGift?.type === "lista_amazon"
                ? "Confirmar Presente da Lista"
                : "Avisar Presente aos Noivos"}
            </h3>
            <p className="text-xs text-[#6E5F57] mt-0.5">
              Conte-nos o que você escolheu para podermos registrar no nosso painel e agradecer com muito amor!
            </p>
          </div>

          {/* Destaque do Item ou Cota Pré-selecionada */}
          {defaultGift ? (
            <div className={`rounded-2xl border p-3 flex items-start gap-2.5 ${
              selectedType === "pix_cota"
                ? "border-[#E8CBC3] bg-[#FAF7F0]"
                : "border-[#C8D4C0] bg-[#F0F4ED]/60"
            }`}>
              <div className={`mt-0.5 rounded-full text-white p-1 shrink-0 ${
                selectedType === "pix_cota" ? "bg-[#C17767]" : "bg-[#5F6F52]"
              }`}>
                {selectedType === "pix_cota" ? <Gift size={13} strokeWidth={2.5} /> : <Check size={13} strokeWidth={3} />}
              </div>
              <div className="min-w-0 flex-1">
                <span className={`block text-[10px] font-bold uppercase tracking-wider ${
                  selectedType === "pix_cota" ? "text-[#C17767]" : "text-[#5F6F52]"
                }`}>
                  {selectedType === "pix_cota"
                    ? "Cota Pix Selecionada"
                    : selectedType === "lista_amazon"
                    ? "Item da Lista na Amazon"
                    : "Presente"}
                </span>
                <p className="font-serif text-xs font-semibold text-[#3E2723] leading-snug mt-0.5">
                  {giftTitle}
                </p>
                {selectedType === "pix_cota" && amount && (
                  <span className="inline-block mt-0.5 text-xs font-bold text-[#5F6F52]">
                    Valor da Cota: {brl(Number(amount))}
                  </span>
                )}
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#3E2723] mb-1">
                Seu Nome Completo (ou da Família) *
              </label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Roberto Almeida & Cláudia"
                className="w-full h-10 rounded-xl border border-[#E8CBC3] bg-[#FAF7F0] px-3.5 text-xs text-[#3E2723] focus:border-[#C17767] focus:bg-white focus:outline-none"
              />
              {matchingGuests.length > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-[#6E5F57]">Sugestão:</span>
                  {matchingGuests.map((mg, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setName(mg.name);
                        if (mg.phone) setPhone(mg.phone);
                      }}
                      className="rounded-full bg-white border border-[#5F6F52]/40 px-2.5 py-0.5 text-[10.5px] font-semibold text-[#5F6F52] hover:bg-[#F0F4ED] cursor-pointer"
                    >
                      + {mg.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3E2723] mb-1">
                Seu WhatsApp / Telefone (para podermos agradecer)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(47) 99999-9999"
                className="w-full h-10 rounded-xl border border-[#E8CBC3] bg-[#FAF7F0] px-3.5 text-xs text-[#3E2723] focus:border-[#C17767] focus:bg-white focus:outline-none"
              />
            </div>

            {!defaultGift && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#3E2723] mb-1">
                    Tipo de Presente
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => {
                      const t = e.target.value as GiftType;
                      setSelectedType(t);
                      if (t === "pix_cota") {
                        setGiftTitle(`Cota: ${COTAS[0].title}`);
                        setAmount(String(COTAS[0].value));
                      } else if (t === "lista_amazon") {
                        setGiftTitle(GIFTS[0].title);
                        setAmount("");
                      } else {
                        setGiftTitle("");
                        setAmount("");
                      }
                    }}
                    className="w-full h-10 rounded-xl border border-[#E8CBC3] bg-[#FAF7F0] px-3 text-xs text-[#3E2723] focus:border-[#C17767] focus:bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="pix_cota">Cota via Pix (Valor Fixo)</option>
                    <option value="lista_amazon">Item da Lista Amazon</option>
                    <option value="presente_fisico">Presente Físico (Entregue em mãos)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#3E2723] mb-1">
                    {selectedType === "pix_cota" ? "Valor Fechado" : "Valor Estimado (opcional)"}
                  </label>
                  {selectedType === "pix_cota" ? (
                    <div className="w-full h-10 rounded-xl border border-[#A4C2A5] bg-[#EBF3E8] px-3.5 text-xs text-[#2E5A2D] flex items-center font-bold">
                      {amount ? `${brl(Number(amount))} (Valor Fixo)` : "—"}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Ex: 200"
                      className="w-full h-10 rounded-xl border border-[#E8CBC3] bg-[#FAF7F0] px-3.5 text-xs text-[#3E2723] focus:border-[#C17767] focus:bg-white focus:outline-none"
                    />
                  )}
                </div>
              </div>
            )}

            {!defaultGift && (
              <div>
                <label className="block text-xs font-semibold text-[#3E2723] mb-1">
                  Qual Presente ou Cota?
                </label>
                {selectedType === "pix_cota" ? (
                  <select
                    value={giftTitle}
                    onChange={(e) => {
                      setGiftTitle(e.target.value);
                      const chosen = COTAS.find((c) => `Cota: ${c.title}` === e.target.value);
                      if (chosen) setAmount(String(chosen.value));
                    }}
                    className="w-full h-10 rounded-xl border border-[#E8CBC3] bg-[#FAF7F0] px-3 text-xs text-[#3E2723] focus:border-[#C17767] focus:bg-white focus:outline-none cursor-pointer font-medium"
                  >
                    {COTAS.map((c) => (
                      <option key={c.id} value={`Cota: ${c.title}`}>
                        {c.title} — {brl(c.value)} (Valor Fixo)
                      </option>
                    ))}
                  </select>
                ) : selectedType === "lista_amazon" ? (
                  <select
                    value={giftTitle}
                    onChange={(e) => setGiftTitle(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E8CBC3] bg-[#FAF7F0] px-3 text-xs text-[#3E2723] focus:border-[#C17767] focus:bg-white focus:outline-none cursor-pointer"
                  >
                    {GIFTS.map((g, idx) => (
                      <option key={idx} value={g.title}>
                        {g.title.slice(0, 50)}...
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={giftTitle}
                    onChange={(e) => setGiftTitle(e.target.value)}
                    placeholder="Ex: Jogo de toalhas / Faqueiro..."
                    className="w-full h-10 rounded-xl border border-[#E8CBC3] bg-[#FAF7F0] px-3.5 text-xs text-[#3E2723] focus:border-[#C17767] focus:bg-white focus:outline-none"
                  />
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#3E2723] mb-1">
                Recado de Carinho para os Noivos (opcional)
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Deixe seus votos de amor e bênçãos para a nova família..."
                className="w-full rounded-xl border border-[#E8CBC3] bg-[#FAF7F0] p-3 text-xs text-[#3E2723] focus:border-[#C17767] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full border border-[#E8CBC3] bg-white px-4 py-2 text-xs font-semibold text-[#6E5F57] hover:text-[#3E2723] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-full bg-[#C17767] hover:bg-[#B36858] px-6 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm cursor-pointer"
            >
              Confirmar Presente
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
