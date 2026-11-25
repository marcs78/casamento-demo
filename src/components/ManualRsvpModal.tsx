"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Check,
  X,
  Clock,
  Search,
  MessageCircle,
  CheckCircle2,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  getInvitationMembers,
  saveRsvpSubmission,
  updatePersonCategory,
  getWhatsAppRsvpReminderLink,
  getWhatsAppSaveTheDateLink,
  getWhatsAppInvitationLink,
  normalizeGuestCategory,
  getBreakdownFromMembers,
  getEffectiveMemberStatus,
  isPreDeclinedConfirmation,
  cleanString,
  type GuestCategory,
  type GuestRecord,
  type MemberAttendanceStatus,
  type RsvpSubmission,
} from "@/lib/guestList";
import { formatPhoneBR, phoneMatchesQuery } from "@/lib/phone";

interface ManualRsvpModalProps {
  isOpen: boolean;
  onClose: () => void;
  officialGuests: GuestRecord[];
  submissions: RsvpSubmission[];
  initialGuest?: GuestRecord | null;
  initialMode?: "confirm" | "decline";
  roleLabel?: string; // "Painel dos Noivos" ou "Painel da Cerimonialista"
  onSaved: (submission: RsvpSubmission) => void;
}

export default function ManualRsvpModal({
  isOpen,
  onClose,
  officialGuests,
  submissions,
  initialGuest,
  initialMode = "confirm",
  roleLabel = "Painel Administrativo",
  onSaved,
}: ManualRsvpModalProps) {
  const [selectedGuest, setSelectedGuest] = useState<GuestRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"pendentes" | "ausencias" | "todas">("pendentes");
  const [members, setMembers] = useState<
    { name: string; type: GuestCategory; status: MemberAttendanceStatus; phone?: string }[]
  >([]);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const subById = useMemo(() => {
    const map = new Map<string, RsvpSubmission>();
    submissions.forEach((s) => map.set(s.invitationId, s));
    return map;
  }, [submissions]);

  const getFamilyStatusCounts = (guest: GuestRecord) => {
    const existingSub = subById.get(guest.id);
    if (existingSub && existingSub.familyMembers?.length > 0) {
      let goingCount = 0;
      let absentCount = 0;
      let pendingCount = 0;
      existingSub.familyMembers.forEach((m) => {
        const st = getEffectiveMemberStatus(m);
        if (st === "confirmado") goingCount++;
        else if (st === "ausente") absentCount++;
        else pendingCount++;
      });
      return { goingCount, absentCount, pendingCount, hasSub: true };
    }

    const famPreDeclined = isPreDeclinedConfirmation(guest.firstConfirmation);
    let absentCount = 0;
    let pendingCount = 0;
    guest.familyMembers.forEach((m) => {
      const memObj = typeof m !== "string" ? m : undefined;
      if (famPreDeclined || isPreDeclinedConfirmation(memObj?.firstConfirmation)) {
        absentCount++;
      } else {
        pendingCount++;
      }
    });
    return { goingCount: 0, absentCount, pendingCount, hasSub: false };
  };

  const loadFamilyIntoForm = (guest: GuestRecord, mode: "confirm" | "decline" = "confirm") => {
    setSelectedGuest(guest);
    const existingSub = subById.get(guest.id);
    if (existingSub && existingSub.familyMembers?.length > 0) {
      setMembers(
        existingSub.familyMembers.map((m) => ({
          name: m.name,
          type: normalizeGuestCategory(m.type),
          status: mode === "decline" && existingSub.familyMembers.every((x) => getEffectiveMemberStatus(x) === "aguardando")
            ? "ausente"
            : getEffectiveMemberStatus(m),
          phone: m.phone,
        }))
      );
      setMessage(existingSub.message || guest.plannerNotes || "");
    } else {
      const baseMembers = getInvitationMembers(guest);
      const famPreDeclined = isPreDeclinedConfirmation(guest.firstConfirmation);
      setMembers(
        baseMembers.map((m, idx) => {
          const orig = guest.familyMembers[idx];
          const origObj = orig && typeof orig !== "string" ? orig : undefined;
          const memPreDeclined = famPreDeclined || isPreDeclinedConfirmation(origObj?.firstConfirmation);
          const defaultStatus: MemberAttendanceStatus =
            mode === "decline" || memPreDeclined ? "ausente" : "confirmado";
          return {
            name: m.name,
            type: normalizeGuestCategory(m.type),
            status: defaultStatus,
            phone: m.phone,
          };
        })
      );
      setMessage(guest.plannerNotes || "");
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialGuest) {
        loadFamilyIntoForm(initialGuest, initialMode);
      } else {
        setSelectedGuest(null);
        if (initialMode === "decline") {
          setFilterMode("todas");
        } else {
          setFilterMode("pendentes");
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialGuest, initialMode]);

  const { pendingFamiliesCount, absentFamiliesCount } = useMemo(() => {
    let pending = 0;
    let absent = 0;
    officialGuests.forEach((g) => {
      const counts = getFamilyStatusCounts(g);
      if (counts.pendingCount > 0) pending++;
      if (counts.absentCount > 0) absent++;
    });
    return { pendingFamiliesCount: pending, absentFamiliesCount: absent };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [officialGuests, subById]);

  const filteredFamilies = useMemo(() => {
    const q = cleanString(searchQuery);
    return officialGuests.filter((g) => {
      const counts = getFamilyStatusCounts(g);
      if (filterMode === "pendentes" && counts.pendingCount === 0) return false;
      if (filterMode === "ausencias" && counts.absentCount === 0) return false;
      if (!q) return true;
      const matchPrimary = cleanString(g.primaryName).includes(q);
      const matchSurname = cleanString(g.familySurname || "").includes(q);
      const matchPhone = phoneMatchesQuery(g.phone, q);
      const matchMember = g.familyMembers.some((m) =>
        cleanString(typeof m === "string" ? m : m.name).includes(q)
      );
      return matchPrimary || matchSurname || matchPhone || matchMember;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [officialGuests, subById, filterMode, searchQuery]);

  if (!isOpen) return null;

  const modalGoingCount = members.filter((m) => m.status === "confirmado").length;
  const modalAbsentCount = members.filter((m) => m.status === "ausente").length;
  const modalPendingCount = members.filter((m) => m.status === "aguardando").length;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuest) return;
    setIsSaving(true);

    try {
      // Propaga eventuais trocas de categoria para o mapa global
      members.forEach((m) => {
        updatePersonCategory({
          guestName: m.name,
          newCategory: m.type,
          invitationId: selectedGuest.id,
        });
      });

      const going = members.filter((m) => m.status === "confirmado");
      const notGoing = members.filter((m) => m.status === "ausente");
      const bk = getBreakdownFromMembers(
        going.map((m) => ({ type: m.type, confirmed: true }))
      );
      const nowStr =
        new Date().toLocaleDateString("pt-BR") +
        " " +
        new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

      const existingSub = subById.get(selectedGuest.id);

      const submission: RsvpSubmission = {
        invitationId: selectedGuest.id,
        primaryName: selectedGuest.primaryName,
        phone: existingSub?.phone || selectedGuest.phone || "",
        answer: going.length > 0 ? "sim" : "nao",
        familyMembers: members.map((m) => ({
          name: m.name,
          type: m.type,
          confirmed: m.status === "confirmado",
          memberStatus: m.status,
          phone: m.phone,
        })),
        idososCount: bk.idosos,
        adultsCount: bk.adultos,
        adolescentesCount: bk.adolescentes,
        kidsCount: bk.criancas,
        bebesCount: bk.bebes,
        declinedCount: notGoing.length,
        diet: existingSub?.diet || "",
        message: message.trim(),
        status: "confirmado_lista",
        timestamp: nowStr,
      };

      saveRsvpSubmission(submission, { isAdminAction: true });
      onSaved(submission);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-3xl rounded-3xl border border-[#E8CBC3] bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line bg-[#FAF7F0] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#5F6F52] text-white">
              <UserCheck size={18} />
            </span>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#3E2723]">
                Registrar Presença, Ausência ou Lembrete
              </h3>
              <p className="text-xs text-[#6E5F57]">
                {roleLabel} · Confirme presença ou registre o não comparecimento de uma pessoa ou da família inteira
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted hover:bg-stone-200/60 hover:text-ink cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {!selectedGuest ? (
            <div className="space-y-4">
              {/* Barra de busca e filtros */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFilterMode("pendentes")}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold cursor-pointer transition-colors ${
                      filterMode === "pendentes"
                        ? "bg-amber-600 text-white"
                        : "bg-[#FAF7F0] text-[#3E2723] border border-[#E8CBC3]"
                    }`}
                  >
                    ⏳ Pendentes ({pendingFamiliesCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode("ausencias")}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold cursor-pointer transition-colors ${
                      filterMode === "ausencias"
                        ? "bg-[#C17767] text-white"
                        : "bg-[#FAF7F0] text-[#3E2723] border border-[#E8CBC3]"
                    }`}
                  >
                    ✕ Com Ausências ({absentFamiliesCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode("todas")}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold cursor-pointer transition-colors ${
                      filterMode === "todas"
                        ? "bg-[#5F6F52] text-white"
                        : "bg-[#FAF7F0] text-[#3E2723] border border-[#E8CBC3]"
                    }`}
                  >
                    👨‍👩‍👧‍👦 Todas as Famílias ({officialGuests.length})
                  </button>
                </div>

                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar pessoa, família ou telefone..."
                    className="w-full rounded-full border border-line bg-[#FAF9F6] pl-8 pr-4 py-1.5 text-xs focus:border-[#C17767] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Lista de famílias */}
              <div className="divide-y divide-line rounded-2xl border border-line max-h-[52vh] overflow-y-auto">
                {filteredFamilies.length === 0 ? (
                  <p className="p-6 text-center text-xs text-muted">
                    Nenhuma família encontrada para este filtro.
                  </p>
                ) : (
                  filteredFamilies.map((g) => {
                    const counts = getFamilyStatusCounts(g);
                    const waLink = getWhatsAppRsvpReminderLink(g);
                    const saveTheDateLink = getWhatsAppSaveTheDateLink(g);
                    const inviteLink = getWhatsAppInvitationLink(g);
                    const memNames = g.familyMembers
                      .map((m) => (typeof m === "string" ? m : m.name))
                      .join(", ");

                    return (
                      <div
                        key={g.id}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF7F0]/60 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-serif text-sm font-bold text-[#3E2723]">
                              {g.primaryName}
                            </span>
                            <span className="text-[10px] rounded-md bg-stone-100 px-1.5 py-0.5 text-muted font-medium">
                              {g.group}
                            </span>

                            {counts.goingCount > 0 && counts.absentCount > 0 ? (
                              <span className="rounded-full bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 text-[10px] font-bold">
                                ✓ {counts.goingCount} vão · ✕ {counts.absentCount} não vão
                              </span>
                            ) : counts.goingCount > 0 ? (
                              <span className="rounded-full bg-[#F0F4ED] text-[#5F6F52] border border-[#C8D4C0] px-2 py-0.5 text-[10px] font-bold">
                                ✓ Confirmada ({counts.goingCount} vão)
                              </span>
                            ) : counts.absentCount > 0 && counts.pendingCount === 0 ? (
                              <span className="rounded-full bg-[#FDF0EE] text-[#C17767] border border-[#E8CBC3] px-2 py-0.5 text-[10px] font-bold">
                                ✕ Família ausente ({counts.absentCount} não vão)
                              </span>
                            ) : counts.absentCount > 0 ? (
                              <span className="rounded-full bg-[#FDF0EE] text-[#C17767] border border-[#E8CBC3] px-2 py-0.5 text-[10px] font-bold">
                                ✕ {counts.absentCount} não vão · ⏳ {counts.pendingCount} pendentes
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 text-[10px] font-bold">
                                ⏳ Pendente ({counts.pendingCount})
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted">{memNames}</p>
                          {g.phone && <p className="text-[11px] text-[#5F6F52] tabular-nums font-mono">{formatPhoneBR(g.phone)}</p>}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          {waLink && counts.pendingCount > 0 && counts.goingCount === 0 && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-full border border-[#5F6F52] bg-white hover:bg-[#F0F4ED] text-[#5F6F52] px-2.5 py-1.5 text-xs font-bold transition-colors"
                              title="Enviar mensagem carinhosa de lembrete com link direto do convite no WhatsApp"
                            >
                              <MessageCircle size={13} />
                              <span>💌 Lembrete</span>
                            </a>
                          )}
                          {saveTheDateLink && counts.goingCount === 0 && counts.pendingCount > 0 && (
                            <a
                              href={saveTheDateLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-2.5 py-1.5 text-xs font-bold transition-colors"
                              title="Cobrar a primeira confirmação (Save the Date) no WhatsApp com o link do site"
                            >
                              <span>📅 Save the Date</span>
                            </a>
                          )}
                          {inviteLink && !(counts.absentCount > 0 && counts.pendingCount === 0 && counts.goingCount === 0) && (
                            <a
                              href={inviteLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-full border border-[#E8CBC3] bg-[#FDF0EE] hover:bg-[#F9E0DC] text-[#C17767] px-2.5 py-1.5 text-xs font-bold transition-colors"
                              title="Enviar o convite oficial no WhatsApp com o link do site"
                            >
                              <span>💍 Convite</span>
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => loadFamilyIntoForm(g, "confirm")}
                            className="inline-flex items-center gap-1 rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] text-white px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                          >
                            <CheckCircle2 size={13} />
                            <span>
                              {counts.goingCount > 0 || counts.absentCount > 0
                                ? "Editar"
                                : "Confirmar"}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => loadFamilyIntoForm(g, "decline")}
                            className="inline-flex items-center gap-1 rounded-full border border-[#E8CBC3] bg-[#FDF0EE] hover:bg-[#F9E0DC] text-[#C17767] px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors"
                            title="Registrar não comparecimento da família ou de um integrante"
                          >
                            <UserX size={13} />
                            <span>Não vai</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <form id="manual-rsvp-form" onSubmit={handleSave} className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-[#E8CBC3] bg-[#FAF7F0] p-3.5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#C17767]">
                    Família Selecionada ({selectedGuest.id})
                  </p>
                  <h4 className="font-serif text-base font-bold text-[#3E2723]">
                    {selectedGuest.primaryName} ({selectedGuest.group})
                  </h4>
                  <p className="text-xs text-muted font-mono">{formatPhoneBR(selectedGuest.phone) || "Sem telefone"}</p>
                </div>
                {!initialGuest && (
                  <button
                    type="button"
                    onClick={() => setSelectedGuest(null)}
                    className="rounded-full border border-line bg-white hover:bg-stone-100 px-3 py-1.5 text-xs font-semibold text-[#3E2723] cursor-pointer"
                  >
                    ← Trocar Família
                  </button>
                )}
              </div>

              {/* Ações rápidas em lote */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-bold text-[#3E2723] flex flex-wrap items-center gap-1.5">
                  <span>Defina por pessoa ou família inteira:</span>
                  <span className="rounded-full bg-[#F0F4ED] text-[#5F6F52] px-2 py-0.5 text-[11px]">
                    ✓ {modalGoingCount} vão
                  </span>
                  <span className="rounded-full bg-[#FDF0EE] text-[#C17767] px-2 py-0.5 text-[11px]">
                    ✕ {modalAbsentCount} não vão
                  </span>
                  {modalPendingCount > 0 && (
                    <span className="rounded-full bg-amber-50 text-amber-800 px-2 py-0.5 text-[11px]">
                      ⏳ {modalPendingCount} pendentes
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setMembers((prev) => prev.map((m) => ({ ...m, status: "confirmado" })))
                    }
                    className="rounded-full bg-[#F0F4ED] hover:bg-[#E1EAD9] text-[#5F6F52] border border-[#C8D4C0] px-3 py-1 text-[11px] font-bold cursor-pointer"
                  >
                    ✓ Todos Vão
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setMembers((prev) => prev.map((m) => ({ ...m, status: "ausente" })))
                    }
                    className="rounded-full bg-[#FDF0EE] hover:bg-[#F9E0DC] text-[#C17767] border border-[#E8CBC3] px-3 py-1 text-[11px] font-bold cursor-pointer"
                  >
                    ✕ Família Não Vai
                  </button>
                  {members.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setMembers((prev) => prev.map((m) => ({ ...m, status: "aguardando" })))
                      }
                      className="rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-3 py-1 text-[11px] font-bold cursor-pointer"
                      title="Útil quando apenas 1 pessoa avisou que não vai e os demais ainda não confirmaram"
                    >
                      ⏳ Todos Pendentes
                    </button>
                  )}
                </div>
              </div>

              {/* Lista de integrantes */}
              <div className="space-y-2">
                {members.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-2xl border p-3 transition-colors ${
                      m.status === "confirmado"
                        ? "border-[#C8D4C0] bg-[#F0F4ED]/50"
                        : m.status === "ausente"
                        ? "border-[#E8CBC3] bg-[#FDF0EE]/50"
                        : "border-amber-200 bg-amber-50/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span
                        className={`font-semibold text-sm ${
                          m.status === "ausente" ? "text-[#8D5B50] line-through" : "text-[#3E2723]"
                        }`}
                      >
                        {m.name}
                      </span>
                      <select
                        value={m.type}
                        onChange={(e) => {
                          const newCat = e.target.value as GuestCategory;
                          setMembers((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, type: newCat } : item))
                          );
                        }}
                        className="rounded-full border border-line bg-white px-2.5 py-0.5 text-[11px] font-semibold text-ink focus:outline-none cursor-pointer"
                      >
                        <option value="idoso">👵 Idoso (60+)</option>
                        <option value="adulto">👤 Adulto</option>
                        <option value="adolescente">🎒 Adolescente</option>
                        <option value="crianca">🧒 Criança</option>
                        <option value="bebe">🍼 Bebê</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() =>
                          setMembers((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, status: "confirmado" } : item
                            )
                          )
                        }
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold cursor-pointer transition-all ${
                          m.status === "confirmado"
                            ? "bg-[#5F6F52] text-white shadow-2xs"
                            : "bg-white text-muted border border-line hover:border-[#5F6F52]"
                        }`}
                      >
                        <Check size={12} />
                        <span>Vai</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setMembers((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, status: "ausente" } : item
                            )
                          )
                        }
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold cursor-pointer transition-all ${
                          m.status === "ausente"
                            ? "bg-[#C17767] text-white shadow-2xs"
                            : "bg-white text-muted border border-line hover:border-[#C17767]"
                        }`}
                      >
                        <X size={12} />
                        <span>Não vai</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setMembers((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, status: "aguardando" } : item
                            )
                          )
                        }
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold cursor-pointer transition-all ${
                          m.status === "aguardando"
                            ? "bg-amber-600 text-white shadow-2xs"
                            : "bg-white text-muted border border-line hover:border-amber-400"
                        }`}
                        title="Deixar esta pessoa como pendente (aguardando resposta)"
                      >
                        <Clock size={12} />
                        <span>Pendente</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recado / Motivo / Observação */}
              <div>
                <label className="block text-xs font-bold text-[#3E2723] mb-1">
                  Observação, Motivo da Ausência ou Recado (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ex.: Avisou pelo WhatsApp que estará em viagem / Ou recado carinhoso enviado..."
                  className="w-full rounded-xl border border-line bg-[#FAF9F6] p-3 text-xs text-ink focus:border-[#C17767] focus:bg-white focus:outline-none"
                />
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-line bg-[#FAF7F0] px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line bg-white hover:bg-stone-100 px-4 py-2 text-xs font-semibold text-muted cursor-pointer"
          >
            Fechar
          </button>
          {selectedGuest && (
            <button
              type="submit"
              form="manual-rsvp-form"
              disabled={isSaving}
              className={`rounded-full px-5 py-2 text-xs font-bold cursor-pointer shadow-xs text-white transition-colors ${
                modalGoingCount === 0 && modalAbsentCount > 0
                  ? "bg-[#C17767] hover:bg-[#A86051]"
                  : "bg-[#5F6F52] hover:bg-[#4E5C43]"
              }`}
            >
              {isSaving
                ? "Salvando..."
                : modalGoingCount === 0 && modalAbsentCount > 0
                ? `✕ Registrar Ausência (${modalAbsentCount}) na Nuvem`
                : modalAbsentCount > 0
                ? `✓ Salvar (${modalGoingCount} vão · ${modalAbsentCount} ausentes)`
                : "✓ Salvar Confirmação na Nuvem"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
