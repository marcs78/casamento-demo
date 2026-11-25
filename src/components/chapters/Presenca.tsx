"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Check,
  X,
  User,
  Phone,
  Users,
  MessageSquare,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  HeartHandshake,
  Baby,
  Search,
  CheckCheck,
  MessageCircle,
  CalendarPlus,
} from "lucide-react";
import { COUPLE, PLANNER_WHATSAPP } from "@/lib/wedding";
import { downloadWeddingIcs, getGoogleCalendarUrl } from "@/lib/calendar";
import {
  findGuestInList,
  getInvitationMembers,
  saveRsvpSubmission,
  STORAGE_SINGLE_RSVP_KEY,
  extractSurname,
  GUEST_CATEGORIES,
  normalizeGuestCategory,
  formatCategoryBreakdown,
  getBreakdownFromMembers,
  type GuestCategory,
  type GuestRecord,
  type RsvpSubmission,
} from "@/lib/guestList";
import { ChapterHeader, Modal } from "../ui";

interface FamilyMemberState {
  id: string;
  name: string;
  type: GuestCategory;
  confirmed: boolean; // true = vai, false = não vai
  isCustom?: boolean;
}

export default function Presenca() {
  const [searchInput, setSearchInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [matchedGuest, setMatchedGuest] = useState<GuestRecord | null>(null);
  const [multipleMatches, setMultipleMatches] = useState<GuestRecord[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Membros da família carregados do convite
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberState[]>([]);
  const [message, setMessage] = useState("");

  const [savedRsvp, setSavedRsvp] = useState<RsvpSubmission | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectInvitation = (invitation: GuestRecord) => {
    setMatchedGuest(invitation);
    setMultipleMatches([]);
    setSearchError(null);

    const initialMembers: FamilyMemberState[] = getInvitationMembers(invitation).map(
      (m, idx) => ({
        id: `m-${idx}-${Date.now()}`,
        name: m.name,
        type: m.type,
        confirmed: true, // "Vai" por padrão
      })
    );
    setFamilyMembers(initialMembers);
    if (!phoneInput && invitation.phone) {
      setPhoneInput(invitation.phone);
    }
  };

  // Formatação amigável de telefone brasileiro
  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  // Executa a busca na lista oficial (por Nome Completo, Titular da Família ou Telefone)
  const handleSearch = (name: string, phone: string) => {
    const result = findGuestInList(name, phone);

    if (result.found && result.matches.length > 1) {
      setMatchedGuest(null);
      setFamilyMembers([]);
      setMultipleMatches(result.matches);
      setSearchError(null);
    } else if (result.found && result.invitation) {
      selectInvitation(result.invitation);
    } else {
      setMatchedGuest(null);
      setMultipleMatches([]);
      setFamilyMembers([]);
      if (name.trim().length >= 2 || phone.replace(/\D/g, "").length >= 8) {
        setSearchError(
          "Ainda não localizamos o seu convite com esses dados. Tente buscar pelo seu nome e sobrenome completos ou pelo seu WhatsApp com DDD. Se precisar de qualquer ajuda, fale com a nossa cerimonialista abaixo!"
        );
      } else {
        setSearchError(
          "Digite o seu nome e sobrenome ou o seu WhatsApp com DDD para localizarmos seu convite."
        );
      }
    }
  };

  // Carregar confirmação prévia do localStorage ou parâmetros de URL
  useEffect(() => {
    const urlParams =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const urlName = urlParams ? urlParams.get("nome") || urlParams.get("name") || "" : "";
    const urlPhone = urlParams ? urlParams.get("tel") || urlParams.get("phone") || "" : "";

    // Sincroniza a Lista Oficial de Convidados da nuvem para refletir novas famílias ou edições em tempo real
    fetch("/api/guests")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.guests && Array.isArray(data.guests) && data.guests.length > 0) {
          try {
            localStorage.setItem("anita_giuseppe_demo_official_guests_v1", JSON.stringify(data.guests));
          } catch {}
          if (urlName || urlPhone) {
            handleSearch(urlName, urlPhone);
          }
        }
      })
      .catch(() => {});

    try {
      const candidateSingleKeys = [
        STORAGE_SINGLE_RSVP_KEY,
      ];
      for (const k of candidateSingleKeys) {
        const stored = localStorage.getItem(k);
        if (stored) {
          const parsed = JSON.parse(stored) as RsvpSubmission;
          if (parsed && parsed.invitationId && Array.isArray(parsed.familyMembers)) {
            setSavedRsvp(parsed);
            setSearchInput(parsed.primaryName || "");
            setPhoneInput(parsed.phone || "");
            setMessage(parsed.message || "");

            // Se o convidado confirmou quando o banco anterior estava offline, re-sincroniza silenciosamente com a nuvem quando ele abrir o convite
            fetch("/api/rsvp")
              .then((r) => (r.ok ? r.json() : null))
              .then((data) => {
                if (data?.submissions && Array.isArray(data.submissions)) {
                  const alreadyInCloud = data.submissions.some(
                    (s: RsvpSubmission) => s.invitationId === parsed.invitationId
                  );
                  if (!alreadyInCloud) {
                    fetch("/api/rsvp", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ submission: parsed }),
                    }).catch(() => {});
                  }
                }
              })
              .catch(() => {});
            return;
          }
        }
      }
    } catch {
      // Ignorar erros de leitura de storage
    }

    if (urlName || urlPhone) {
      setSearchInput(urlName);
      setPhoneInput(urlPhone);
      handleSearch(urlName, urlPhone);
    }
  }, []);

  // Monitora alterações nos campos de busca
  const handleNameChange = (val: string) => {
    setSearchInput(val);
    if (val.trim().length >= 3) {
      const res = findGuestInList(val, phoneInput);
      if (res.found && res.matches.length > 1) {
        setMatchedGuest(null);
        setFamilyMembers([]);
        setMultipleMatches(res.matches);
        setSearchError(null);
      } else if (res.found && res.invitation) {
        selectInvitation(res.invitation);
      } else {
        setMultipleMatches([]);
        if (matchedGuest) {
          setMatchedGuest(null);
          setFamilyMembers([]);
        }
      }
    } else {
      setMultipleMatches([]);
    }
  };

  const handlePhoneChange = (val: string) => {
    const formatted = formatPhone(val);
    setPhoneInput(formatted);
    const digits = formatted.replace(/\D/g, "");
    if (digits.length >= 8) {
      const res = findGuestInList(searchInput, formatted);
      if (res.found && res.invitation) {
        selectInvitation(res.invitation);
      }
    }
  };

  // Alternar entre "Vai" e "Não vai" para cada membro da família
  const toggleMemberAttendance = (id: string, willAttend: boolean) => {
    setFamilyMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, confirmed: willAttend } : m))
    );
  };

  // Alterar categoria de membro (idoso 60+ / adulto / adolescente / criança / bebê)
  const updateMemberType = (id: string, type: GuestCategory) => {
    setFamilyMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, type } : m))
    );
  };

  // Adicionar membro extra (se a família tiver vaga no convite)
  const addExtraMember = () => {
    if (!matchedGuest) return;
    if (familyMembers.length >= matchedGuest.maxGuests) {
      alert(`O convite da sua família possui capacidade para até ${matchedGuest.maxGuests} pessoas.`);
      return;
    }
    setFamilyMembers((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: "",
        type: "adulto",
        confirmed: true,
        isCustom: true,
      },
    ]);
  };

  // Remover membro extra
  const removeMember = (id: string) => {
    setFamilyMembers((prev) => prev.filter((m) => m.id !== id));
  };

  // Atualizar nome de membro extra
  const updateCustomMemberName = (id: string, name: string) => {
    setFamilyMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, name } : m))
    );
  };

  // Contadores dinâmicos
  const confirmedList = familyMembers.filter((m) => m.confirmed && m.name.trim().length > 0);
  const declinedList = familyMembers.filter((m) => !m.confirmed && m.name.trim().length > 0);
  const breakdown = getBreakdownFromMembers(confirmedList);
  const adultsCount = breakdown.adultos;
  const kidsCount = breakdown.criancas;
  const idososCount = breakdown.idosos;
  const adolescentesCount = breakdown.adolescentes;
  const bebesCount = breakdown.bebes;

  // Submissão oficial (dispara notificação e atualiza Painel dos Noivos e da Cerimonialista!)
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!matchedGuest) {
      setSearchError(
        "Por gentileza, localize o convite da sua família acima antes de enviar. Se tiver dúvidas, fale com a nossa cerimonialista!"
      );
      return;
    }

    if (familyMembers.length === 0) {
      setSearchError("Selecione os membros da família para confirmar presença.");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const willAttendAny = confirmedList.length > 0;

      const submission: RsvpSubmission = {
        invitationId: matchedGuest.id,
        primaryName: matchedGuest.primaryName,
        phone: phoneInput.trim() || matchedGuest.phone,
        answer: willAttendAny ? "sim" : "nao",
        familyMembers: familyMembers.map((m) => ({
          name: m.name.trim() || "Familiar",
          type: m.type,
          confirmed: m.confirmed,
        })),
        adultsCount,
        kidsCount,
        idososCount,
        adolescentesCount,
        bebesCount,
        declinedCount: declinedList.length,
        diet: "",
        message: message.trim(),
        status: "confirmado_lista",
        timestamp:
          new Date().toLocaleDateString("pt-BR") +
          " " +
          new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      };

      // Salva e envia notificação imediata para o Painel dos Noivos e da Cerimonialista
      saveRsvpSubmission(submission);

      setSavedRsvp(submission);
      setIsSubmitting(false);
      setIsEditing(false);
      setModalOpen(true);
    }, 400);
  };

  return (
    <div className="space-y-6">
      <ChapterHeader
        num="02"
        title="Confirmar Presença"
        intro={`A sua presença é muito especial para nós! Confirme a sua presença abaixo até ${COUPLE.rsvpDeadline}. Caso tenha alguma dúvida ou precise de ajuda, entre em contato com a nossa cerimonialista.`}
      />

      {/* Resposta já salva e confirmada */}
      {savedRsvp && !isEditing ? (
        <div className="rounded-3xl border border-[#C8D4C0] bg-white p-6 shadow-sm text-center space-y-5">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#F0F4ED] text-[#5F6F52] shadow-xs">
            <Check size={32} strokeWidth={2.5} />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#5F6F52]/10 px-4 py-1 text-xs font-bold uppercase tracking-wider text-[#5F6F52]">
              <ShieldCheck size={14} />
              Enviado para os Noivos e Cerimonialista
            </div>
            <h3 className="mt-2 font-serif text-2xl font-semibold text-[#3E2723]">
              {savedRsvp.answer === "sim" ? "Presença Confirmada com Carinho!" : "Resposta Recebida com Carinho"}
            </h3>
            <p className="mt-1 text-xs text-[#6E5F57]">
              Família de <strong>{savedRsvp.primaryName}</strong> • WhatsApp: {savedRsvp.phone}
            </p>
          </div>

          {/* Lista de Membros da Família */}
          <div className="rounded-2xl border border-[#E8CBC3]/60 bg-[#FAF7F0] p-4 text-left space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#E8CBC3]/60 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#3E2723]">
                Membros da Família
              </span>
              <span className="text-[11px] font-semibold text-[#5F6F52]">
                {formatCategoryBreakdown(getBreakdownFromMembers(savedRsvp.familyMembers.filter((m) => m.confirmed)))}
              </span>
            </div>

            <ul className="space-y-2 text-xs">
              {savedRsvp.familyMembers.map((m, idx) => {
                const cat = GUEST_CATEGORIES[normalizeGuestCategory(m.type)];
                return (
                  <li
                    key={idx}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                      m.confirmed
                        ? "bg-white border border-[#C8D4C0] text-[#3E2723]"
                        : "bg-[#FDF0EE] border border-[#E8CBC3] text-[#8A3D2F]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {m.confirmed ? (
                        <CheckCircle2 size={16} className="text-[#5F6F52]" />
                      ) : (
                        <X size={16} className="text-[#C17767]" />
                      )}
                      <span className="font-medium">{m.name}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cat.badgeBg} ${cat.badgeText} ${cat.badgeBorder}`}>
                        {cat.label}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        m.confirmed
                          ? "bg-[#F0F4ED] text-[#5F6F52]"
                          : "bg-[#FBEBE8] text-[#C17767]"
                      }`}
                    >
                      {m.confirmed ? "Vai" : "Não vai"}
                    </span>
                  </li>
                );
              })}
            </ul>

            {savedRsvp.message && (
              <p className="pt-2 text-xs text-[#6E5F57] italic border-t border-[#E8CBC3]/40">
                💬 “{savedRsvp.message}”
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2.5 pt-2">
            {(() => {
              const confirmedGoing = savedRsvp.familyMembers.filter((m) => m.confirmed);
              const confirmedList = confirmedGoing
                .map((m) => `• ${m.name} (${GUEST_CATEGORIES[normalizeGuestCategory(m.type)].label})`)
                .join("\n");
              const declinedList = savedRsvp.familyMembers
                .filter((m) => !m.confirmed)
                .map((m) => `• ${m.name}`)
                .join("\n");
              const breakdownText = formatCategoryBreakdown(getBreakdownFromMembers(confirmedGoing));

              const waText = encodeURIComponent(
                `*Confirmação de Presença · Casamento Anita & Giuseppe* 💍✨\n\n` +
                  `*Família*: ${savedRsvp.primaryName}\n` +
                  `*Presença*: ${
                    savedRsvp.answer === "sim" ? "Confirmada com alegria! ✅" : "Comunicação de Ausência ❌"
                  }\n` +
                  (savedRsvp.answer === "sim"
                    ? `*Total*: ${confirmedGoing.length} pessoa(s)${breakdownText ? ` (${breakdownText})` : ""}\n\n` +
                      (confirmedList ? `*Confirmados*:\n${confirmedList}\n\n` : "") +
                      (declinedList ? `*Não poderão ir*:\n${declinedList}\n\n` : "") +
                      (savedRsvp.message ? `*Recado*: “${savedRsvp.message}”\n` : "")
                    : `Infelizmente não poderemos comparecer.\n`) +
                  `\nData: 18/09/2027 às 19h30\nLocal: Villa Imperial das Hortênsias`
              );

              return (
                <>
                  <a
                    href={`https://wa.me/5524999002027?text=${waText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1EBE5D] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all cursor-pointer"
                  >
                    <MessageCircle size={15} />
                    Enviar Confirmação no WhatsApp
                  </a>
                  {savedRsvp.answer === "sim" && (
                    <>
                      <a
                        href={getGoogleCalendarUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#C8D4C0] bg-[#F0F4ED] hover:bg-[#E2ECDC] px-4 py-2.5 text-xs font-semibold text-[#2D3D22] transition-colors"
                      >
                        <CalendarPlus size={14} />
                        <span>Google Agenda</span>
                      </a>
                      <button
                        type="button"
                        onClick={downloadWeddingIcs}
                        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#E8CBC3] bg-[#FAF7F0] hover:bg-[#F3ECE1] px-4 py-2.5 text-xs font-semibold text-[#3E2723] transition-colors cursor-pointer"
                      >
                        <CalendarPlus size={14} className="text-[#C17767]" />
                        <span>Agenda iPhone</span>
                      </button>
                    </>
                  )}
                </>
              );
            })()}

            <button
              type="button"
              onClick={() => {
                setIsEditing(true);
                handleSearch(savedRsvp.primaryName, savedRsvp.phone);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-[#C17767] bg-white px-5 py-2.5 text-xs font-semibold text-[#C17767] hover:bg-[#FDF0EE] transition-colors cursor-pointer"
            >
              <RefreshCw size={13} />
              Atualizar Resposta
            </button>

            <a
              href={PLANNER_WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#C8D4C0] bg-[#F0F4ED] px-5 py-2.5 text-xs font-semibold text-[#5F6F52] hover:bg-[#e3ecde] transition-colors"
            >
              <MessageCircle size={14} />
              Falar com a Cerimonialista
            </a>
          </div>
        </div>
      ) : (
        /* Formulário de Busca e Confirmação */
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card de Busca & Verificação de Convite */}
          <div className="rounded-3xl border border-[#E8CBC3] bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-[#C17767]">
              <Search size={18} strokeWidth={2.2} />
              <h3 className="font-serif text-lg font-semibold text-[#3E2723]">
                1. Localizar o Convite da Sua Família
              </h3>
            </div>
            <p className="text-xs text-[#6E5F57] leading-relaxed">
              Preparar cada detalhe para receber você e sua família é uma grande alegria! Para localizar seu convite com privacidade, digite o <strong>seu nome e sobrenome</strong> ou informe o seu <strong>WhatsApp</strong>.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#3E2723]">
                  Seu Nome e Sobrenome *
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C7A6B]"
                  />
                  <input
                    type="text"
                    required
                    value={searchInput}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Ex: Nome e Sobrenome..."
                    className="w-full rounded-2xl border border-[#E8CBC3] bg-[#FAF7F0] pl-10 pr-4 py-2.5 text-xs text-[#3E2723] focus:border-[#C17767] focus:bg-white focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#3E2723]">
                  WhatsApp / Telefone para Contato
                </label>
                <div className="relative">
                  <Phone
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C7A6B]"
                  />
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="(47) 99999-9999"
                    className="w-full rounded-2xl border border-[#E8CBC3] bg-[#FAF7F0] pl-10 pr-4 py-2.5 text-xs text-[#3E2723] focus:border-[#C17767] focus:bg-white focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <a
                href={PLANNER_WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-[#5F6F52] bg-[#F0F4ED] px-3.5 py-2 text-xs font-semibold text-[#5F6F52] hover:bg-[#5F6F52] hover:text-white transition-all shadow-xs cursor-pointer active:scale-98"
              >
                <MessageCircle size={15} />
                <span>Dúvidas? Fale com a Cerimonialista</span>
              </a>

              <button
                type="button"
                onClick={() => handleSearch(searchInput, phoneInput)}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#C17767] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#a66152] transition-colors cursor-pointer"
              >
                <Search size={13} />
                Localizar Convite
              </button>
            </div>

            {/* Quando mais de uma família tem o mesmo sobrenome/nome: não exibe a lista de famílias por privacidade */}
            {multipleMatches.length > 1 && !matchedGuest && (
              <div className="rounded-2xl border border-[#C8D4C0] bg-[#FAF7F0] p-4 space-y-2 animate-in fade-in">
                <p className="text-xs font-semibold text-[#3E2723]">
                  Encontramos mais de um convite com esse sobrenome ou primeiro nome.
                </p>
                <p className="text-xs text-[#6E5F57] leading-relaxed">
                  Para sua privacidade, digite o <strong>seu nome e sobrenome completos</strong> (ex: <em>Nome e Sobrenome</em>) no campo acima ou preencha o seu <strong>WhatsApp</strong> ao lado para abrir diretamente o seu convite.
                </p>
              </div>
            )}

            {/* Mensagem Acolhedora quando não encontrado + Botão direto para a Cerimonialista */}
            {searchError && !matchedGuest && multipleMatches.length === 0 && (
              <div className="rounded-2xl border border-[#E8CBC3] bg-[#FAF7F0] p-4 text-xs text-[#3E2723] space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 font-serif text-sm font-semibold text-[#C17767]">
                  <HeartHandshake size={18} />
                  <span>Precisa de ajuda para localizar o seu convite?</span>
                </div>
                <p className="leading-relaxed text-[#6E5F57]">{searchError}</p>
                <div className="pt-1">
                  <a
                    href={PLANNER_WHATSAPP}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-[#5F6F52] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#4E5C43] transition-colors"
                  >
                    <MessageCircle size={14} />
                    Falar com a Cerimonialista no WhatsApp
                  </a>
                </div>
              </div>
            )}

            {/* Sucesso: Convite Localizado! */}
            {matchedGuest && (
              <div className="rounded-2xl border border-[#C8D4C0] bg-[#F0F4ED] p-4 text-xs text-[#2D3D22] space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-[#5F6F52]">
                    <ShieldCheck size={18} />
                    <span className="text-sm">
                      Convite da Família {matchedGuest.familySurname || extractSurname(matchedGuest.primaryName)} Localizado!
                    </span>
                  </div>
                  <span className="rounded-full bg-[#5F6F52] px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                    {matchedGuest.group}
                  </span>
                </div>
                <p className="text-xs text-[#3E2723]">
                  Olá! Localizamos o convite em nome de{" "}
                  <strong className="font-semibold">{matchedGuest.primaryName}</strong>. Confira abaixo os integrantes do convite para confirmar presença:
                </p>
              </div>
            )}
          </div>

          {/* 2. Membros da Família com Opção "Vai" ou "Não vai" */}
          {matchedGuest && (
            <div className="rounded-3xl border border-[#E8CBC3] bg-white p-5 shadow-xs space-y-4 animate-in fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8CBC3]/60 pb-3">
                <div className="flex items-center gap-2 text-[#C17767]">
                  <Users size={18} strokeWidth={2.2} />
                  <h3 className="font-serif text-lg font-semibold text-[#3E2723]">
                    2. Integrantes da Família
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F0F4ED] border border-[#C8D4C0] px-2.5 py-0.5 text-xs font-semibold text-[#5F6F52]">
                    <CheckCircle2 size={13} /> {confirmedList.length} Confirmado(s)
                  </span>
                  {idososCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F5F0E6] border border-[#D9CDB8] px-2 py-0.5 text-[11px] font-semibold text-[#8C6D3B]">
                      {idososCount} Idoso{idososCount > 1 ? "s" : ""}
                    </span>
                  )}
                  {adultsCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF3FA] border border-[#BFD5E8] px-2 py-0.5 text-[11px] font-semibold text-[#35628D]">
                      {adultsCount} Adulto{adultsCount > 1 ? "s" : ""}
                    </span>
                  )}
                  {adolescentesCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F3EBF6] border border-[#D8BFDF] px-2 py-0.5 text-[11px] font-semibold text-[#74457F]">
                      {adolescentesCount} Adol.
                    </span>
                  )}
                  {kidsCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FAF7F0] border border-[#E8CBC3] px-2 py-0.5 text-[11px] font-semibold text-[#C17767]">
                      <Baby size={12} /> {kidsCount} Criança{kidsCount > 1 ? "s" : ""}
                    </span>
                  )}
                  {bebesCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF5E6] border border-[#FCD8A5] px-2 py-0.5 text-[11px] font-semibold text-[#B86B14]">
                      {bebesCount} Bebê{bebesCount > 1 ? "s" : ""}
                    </span>
                  )}
                  {declinedList.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FDF0EE] border border-[#E8CBC3] px-2 py-0.5 text-[11px] font-semibold text-[#8A3D2F]">
                      <X size={12} /> {declinedList.length} Ausente(s)
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-[#6E5F57] leading-relaxed">
                Indique ao lado de cada familiar se ele <strong>Vai</strong> ou <strong>Não vai</strong> poder comparecer:
              </p>

              {/* Lista dos Membros da Família com Botão Vai / Não Vai */}
              <div className="space-y-3">
                {familyMembers.map((member, index) => (
                  <div
                    key={member.id}
                    className={`rounded-2xl border p-3.5 transition-all ${
                      member.confirmed
                        ? "border-[#C8D4C0] bg-[#FBFDF9] shadow-2xs"
                        : "border-[#E8CBC3]/80 bg-[#FCF8F7] opacity-80"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      {/* Nome e Categoria */}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8CBC3]/40 text-[10px] font-bold text-[#3E2723]">
                            {index + 1}
                          </span>

                          {member.isCustom ? (
                            <input
                              type="text"
                              value={member.name}
                              onChange={(e) => updateCustomMemberName(member.id, e.target.value)}
                              placeholder="Nome do familiar"
                              className="w-full rounded-xl border border-[#E8CBC3] bg-white px-3 py-1.5 text-xs text-[#3E2723] focus:border-[#C17767] focus:outline-none"
                            />
                          ) : (
                            <span className="font-serif text-sm font-semibold text-[#3E2723]">
                              {member.name}
                            </span>
                          )}

                          {member.isCustom && (
                            <button
                              type="button"
                              onClick={() => removeMember(member.id)}
                              className="text-[#8C7A6B] hover:text-[#C17767] transition-colors p-1"
                              title="Remover"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        {/* Seletor Categoria (5 Faixas Etárias com Descrição Clara) */}
                        <div className="ml-7 flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C7A6B]">
                            Categoria:
                          </span>
                          <select
                            value={normalizeGuestCategory(member.type)}
                            onChange={(e) =>
                              updateMemberType(member.id, e.target.value as GuestCategory)
                            }
                            className="rounded-lg border border-[#E8CBC3] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#3E2723] focus:border-[#C17767] focus:outline-none cursor-pointer shadow-2xs"
                          >
                            <option value="idoso">👵 Idoso (60+)</option>
                            <option value="adulto">👤 Adulto</option>
                            <option value="adolescente">🎒 Adolescente</option>
                            <option value="crianca">🧒 Criança</option>
                            <option value="bebe">🍼 Bebê</option>
                          </select>
                          <span className="text-[10px] text-[#7D6E66] italic">
                            ({GUEST_CATEGORIES[normalizeGuestCategory(member.type)].description})
                          </span>
                        </div>
                      </div>

                      {/* Opção "Vai" ou "Não vai" */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => toggleMemberAttendance(member.id, true)}
                          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                            member.confirmed
                              ? "bg-[#5F6F52] text-white shadow-xs"
                              : "bg-white border border-[#C8D4C0] text-[#5F6F52] hover:bg-[#F0F4ED]"
                          }`}
                        >
                          <Check size={14} strokeWidth={2.5} />
                          <span>Vai</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleMemberAttendance(member.id, false)}
                          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                            !member.confirmed
                              ? "bg-[#C17767] text-white shadow-xs"
                              : "bg-white border border-[#E8CBC3] text-[#C17767] hover:bg-[#FDF0EE]"
                          }`}
                        >
                          <X size={14} strokeWidth={2.5} />
                          <span>Não vai</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botão Adicionar Membro Extra */}
              {familyMembers.length < matchedGuest.maxGuests && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={addExtraMember}
                    className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#C17767] bg-[#FAF7F0] px-4 py-2 text-xs font-semibold text-[#C17767] hover:bg-[#FDF0EE] transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    Adicionar familiar previsto no convite
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 3. Mensagem para os Noivos */}
          {matchedGuest && (
            <div className="rounded-3xl border border-[#E8CBC3] bg-white p-5 shadow-xs space-y-4 animate-in fade-in">
              <h3 className="font-serif text-lg font-semibold text-[#3E2723]">
                3. Mensagem para os Noivos (Opcional)
              </h3>

              {/* Mensagem / Observação aos noivos */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#3E2723] leading-relaxed">
                  Deixe uma mensagem de carinho ou observação para os noivos:
                </label>
                <div className="relative">
                  <MessageSquare
                    size={16}
                    className="absolute left-3.5 top-3 text-[#8C7A6B]"
                  />
                  <textarea
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Deixe aqui sua mensagem de carinho ou observação para os noivos..."
                    className="w-full rounded-2xl border border-[#E8CBC3] bg-[#FAF7F0] pl-10 pr-4 py-2.5 text-xs text-[#3E2723] focus:border-[#C17767] focus:bg-white focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Botão de Envio Principal ou Card Agradável de Apoio da Cerimonialista */}
          {matchedGuest ? (
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full h-14 rounded-full font-serif text-sm font-semibold tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 ${
                confirmedList.length > 0
                  ? "bg-[#5F6F52] hover:bg-[#4E5C43] text-white"
                  : "bg-[#C17767] hover:bg-[#a66152] text-white"
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Enviando resposta aos noivos e cerimonialista...</span>
                </>
              ) : confirmedList.length > 0 ? (
                <>
                  <CheckCheck size={18} />
                  <span>
                    Confirmar Presença da Família ({confirmedList.length} Confirmado
                    {confirmedList.length > 1 ? "s" : ""})
                  </span>
                </>
              ) : (
                <>
                  <X size={18} />
                  <span>Enviar Comunicado de Ausência</span>
                </>
              )}
            </button>
          ) : (
            <div className="rounded-3xl border border-[#E8CBC3]/80 bg-[#FAF7F0] p-5 text-center space-y-3">
              <p className="font-serif text-base font-semibold text-[#3E2723]">
                A sua presença é muito especial para nós! 🤍
              </p>
              <p className="text-xs text-[#6E5F57] max-w-md mx-auto leading-relaxed">
                Digite acima o <strong>seu nome e sobrenome</strong> ou o seu <strong>WhatsApp</strong> para confirmar a presença. Caso tenha qualquer dúvida ou precise de ajuda, nossa cerimonialista terá o maior prazer em atender você!
              </p>
              <div className="pt-1">
                <a
                  href={PLANNER_WHATSAPP}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-[#C17767] bg-white px-5 py-2 text-xs font-semibold text-[#C17767] hover:bg-[#FDF0EE] transition-colors shadow-2xs"
                >
                  <MessageCircle size={14} />
                  Falar com a Cerimonialista
                </a>
              </div>
            </div>
          )}
        </form>
      )}

      {/* Modal de Conclusão / Comprovante */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        {savedRsvp && (
          <div className="space-y-4 text-center">
            <div
              className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${
                savedRsvp.answer === "sim"
                  ? "bg-[#F0F4ED] text-[#5F6F52]"
                  : "bg-[#FDF0EE] text-[#C17767]"
              }`}
            >
              {savedRsvp.answer === "sim" ? (
                <Check size={32} strokeWidth={2.5} />
              ) : (
                <X size={32} strokeWidth={2.5} />
              )}
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#5F6F52]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#5F6F52]">
              <ShieldCheck size={13} /> Notificação enviada aos Noivos e Cerimonialista
            </div>

            <h3 className="font-serif text-2xl font-semibold text-[#3E2723]">
              {savedRsvp.answer === "sim" ? "Presença Confirmada!" : "Resposta Recebida com Carinho!"}
            </h3>

            <p className="text-xs leading-relaxed text-[#3E2723]/80">
              {savedRsvp.answer === "sim" ? (
                <>
                  Muito obrigado, família de <strong className="font-semibold">{savedRsvp.primaryName}</strong>! Os noivos e a cerimonialista já receberam a sua confirmação para o dia{" "}
                  <strong>{COUPLE.dateLabel} às {COUPLE.time}</strong> na Villa Imperial das Hortênsias.
                </>
              ) : (
                <>
                  Obrigado por nos avisar, família de <strong className="font-semibold">{savedRsvp.primaryName}</strong>. Os noivos e a cerimonialista já foram notificados. Sentiremos sua falta, mas agradecemos de coração pelo carinho!
                </>
              )}
            </p>

            {/* Membros Confirmados no Modal */}
            <div className="rounded-2xl border border-[#E8CBC3]/60 bg-[#FAF7F0] p-4 text-left space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C17767]">
                Resumo da Família:
              </span>
              <ul className="space-y-1.5 text-xs text-[#3E2723]">
                {savedRsvp.familyMembers.map((m, i) => (
                  <li key={i} className="flex items-center justify-between border-b border-[#E8CBC3]/30 pb-1">
                    <span className="flex items-center gap-1.5">
                      {m.confirmed ? (
                        <Check size={13} className="text-[#5F6F52]" />
                      ) : (
                        <X size={13} className="text-[#C17767]" />
                      )}
                      <span>{m.name}</span>
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        m.confirmed
                          ? "bg-[#F0F4ED] text-[#5F6F52]"
                          : "bg-[#FDF0EE] text-[#C17767]"
                      }`}
                    >
                      {m.confirmed ? `Vai (${GUEST_CATEGORIES[normalizeGuestCategory(m.type)].label})` : "Não vai"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="w-full rounded-full bg-[#C17767] py-3 text-xs font-semibold text-white transition-colors hover:bg-[#a66152] cursor-pointer"
            >
              Concluir
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
