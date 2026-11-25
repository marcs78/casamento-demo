"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Users, Check, AlertCircle, Phone, User, Sparkles } from "lucide-react";
import {
  GUEST_CATEGORIES,
  GuestCategory,
  GuestRecord,
  GuestMember,
  normalizeGuestCategory,
  cleanString,
} from "@/lib/guestList";
import { formatPhoneBR, normalizeRecordPhones } from "@/lib/phone";

interface GuestCrudModalProps {
  isOpen: boolean;
  onClose: () => void;
  guestToEdit: GuestRecord | null;
  onSaved: (guest: GuestRecord) => void;
}

interface MemberFormState {
  name: string;
  type: GuestCategory;
  phone?: string;
  firstConfirmation?: string;
}

const CATEGORY_OPTIONS: { key: GuestCategory; label: string; desc: string }[] = [
  { key: "idoso", label: "👵 Idoso (60+)", desc: "Acomodação prioritária e mesas de fácil acesso" },
  { key: "adulto", label: "👤 Adulto", desc: "Assento individual e buffet completo" },
  { key: "adolescente", label: "🎒 Adolescente", desc: "Assento individual e buffet completo" },
  { key: "crianca", label: "🧒 Criança", desc: "Buffet infantil / meia porção e assento" },
  { key: "bebe", label: "🍼 Bebê", desc: "Bebê de colo / cadeirão de alimentação" },
];

export default function GuestCrudModal({
  isOpen,
  onClose,
  guestToEdit,
  onSaved,
}: GuestCrudModalProps) {
  const [primaryName, setPrimaryName] = useState("");
  const [familySurname, setFamilySurname] = useState("");
  const [phone, setPhone] = useState("");
  const [group, setGroup] = useState("Amigos");
  const [firstConfirmation, setFirstConfirmation] = useState("OK");
  const [plannerNotes, setPlannerNotes] = useState("");
  const [members, setMembers] = useState<MemberFormState[]>([
    { name: "", type: "adulto" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializar quando abre ou quando guestToEdit muda
  useEffect(() => {
    if (isOpen) {
      if (guestToEdit) {
        setPrimaryName(guestToEdit.primaryName || "");
        setFamilySurname(guestToEdit.familySurname || "");
        setPhone(formatPhoneBR(guestToEdit.phone) || "");
        setGroup(guestToEdit.group || "Amigos");
        setFirstConfirmation(guestToEdit.firstConfirmation || "OK");
        setPlannerNotes(guestToEdit.plannerNotes || "");

        const parsedMembers: MemberFormState[] = guestToEdit.familyMembers.map((m) => {
          if (typeof m === "string") {
            return { name: m, type: "adulto" };
          }
          return {
            name: m.name,
            type: normalizeGuestCategory(m.type),
            phone: formatPhoneBR(m.phone),
            firstConfirmation: m.firstConfirmation,
          };
        });

        setMembers(parsedMembers.length > 0 ? parsedMembers : [{ name: guestToEdit.primaryName, type: "adulto" }]);
      } else {
        // Novo Convidado
        setPrimaryName("");
        setFamilySurname("");
        setPhone("");
        setGroup("Amigos");
        setFirstConfirmation("OK");
        setPlannerNotes("");
        setMembers([{ name: "", type: "adulto" }]);
      }
      setError(null);
    }
  }, [isOpen, guestToEdit]);

  if (!isOpen) return null;

  const handleAddMember = () => {
    setMembers((prev) => [...prev, { name: "", type: "adulto" }]);
  };

  const handleRemoveMember = (idx: number) => {
    if (members.length <= 1) {
      setError("A família precisa ter ao menos 1 integrante.");
      return;
    }
    setMembers((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMemberChange = (idx: number, field: keyof MemberFormState, value: string) => {
    setMembers((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedPrimary = primaryName.trim();
    if (!trimmedPrimary) {
      setError("Por favor, preencha o Nome do Titular do convite.");
      return;
    }

    // Valida se os integrantes têm nome
    const validMembers = members
      .map((m) => ({ ...m, name: m.name.trim() }))
      .filter((m) => m.name.length > 0);

    if (validMembers.length === 0) {
      setError("Adicione ao menos um integrante com nome preenchido.");
      return;
    }

    setIsSubmitting(true);

    try {
      const generatedId =
        guestToEdit?.id ||
        `fam-custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      const formattedMembers: GuestMember[] = validMembers.map((m) => ({
        name: m.name,
        familia: familySurname.trim() || trimmedPrimary,
        chefeFamilia: trimmedPrimary,
        type: normalizeGuestCategory(m.type),
        phone: m.phone || phone.trim(),
        firstConfirmation: (firstConfirmation === "NAO" ? "NAO" : m.firstConfirmation || firstConfirmation) as any,
      }));

      const newRecord: GuestRecord = normalizeRecordPhones({
        id: generatedId,
        primaryName: trimmedPrimary,
        familySurname: familySurname.trim() || trimmedPrimary,
        phone: phone.trim(),
        familyMembers: formattedMembers,
        maxGuests: formattedMembers.length,
        group: group || "Amigos",
        firstConfirmation: firstConfirmation as any,
        plannerNotes: plannerNotes.trim(),
      } as GuestRecord);

      // 1. Salva no banco de dados na nuvem (Upstash Redis)
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "upsert", guest: newRecord }),
      });

      if (!res.ok) {
        throw new Error("Erro na resposta do servidor.");
      }

      onSaved(newRecord);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Ocorreu um erro ao salvar o convidado na nuvem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl border border-[#E8CBC3] bg-[#FAF7F0] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-[#E8CBC3]/70 px-5 sm:px-6 py-4 bg-white/90">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#C17767]/15 text-[#C17767]">
              <Users size={20} />
            </span>
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-semibold text-[#3E2723]">
                {guestToEdit ? "Editar Convidado & Família" : "Cadastrar Novo Convidado"}
              </h2>
              <p className="text-xs text-[#6E5F57]">
                {guestToEdit
                  ? `Altere dados, adicione ou ajuste integrantes e faixas etárias de ${guestToEdit.primaryName}`
                  : "Adicione um convite individual ou familiar com suas faixas etárias"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-[#FAF7F0] hover:text-[#3E2723] transition-colors cursor-pointer"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulário com Scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {error && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Dados Principais do Convite */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#3E2723] mb-1">
                Titular do Convite *
              </label>
              <input
                type="text"
                required
                value={primaryName}
                onChange={(e) => setPrimaryName(e.target.value)}
                placeholder="Ex: Maicon Tomazi"
                className="w-full rounded-2xl border border-[#E8CBC3] bg-white px-3.5 py-2.5 text-xs text-[#3E2723] focus:border-[#C17767] focus:outline-none"
              />
              <p className="text-[10px] text-muted mt-0.5">Nome principal usado na busca do site</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3E2723] mb-1">
                Família / Sobrenome
              </label>
              <input
                type="text"
                value={familySurname}
                onChange={(e) => setFamilySurname(e.target.value)}
                placeholder="Ex: TOMAZI"
                className="w-full rounded-2xl border border-[#E8CBC3] bg-white px-3.5 py-2.5 text-xs text-[#3E2723] focus:border-[#C17767] focus:outline-none"
              />
              <p className="text-[10px] text-muted mt-0.5">Sobrenome comum da família</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3E2723] mb-1 flex items-center gap-1">
                <Phone size={12} /> WhatsApp / Telefone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => setPhone((p) => formatPhoneBR(p))}
                placeholder="Ex: (47) 99999-9999"
                className="w-full rounded-2xl border border-[#E8CBC3] bg-white px-3.5 py-2.5 text-xs text-[#3E2723] focus:border-[#C17767] focus:outline-none"
              />
              <p className="text-[10px] text-muted mt-0.5">Permite ao convidado buscar digitando o número</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3E2723] mb-1">
                Grupo / Vínculo
              </label>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="w-full rounded-2xl border border-[#E8CBC3] bg-white px-3.5 py-2.5 text-xs text-[#3E2723] focus:border-[#C17767] focus:outline-none cursor-pointer"
              >
                <option value="Família do Noivo">Família do Noivo</option>
                <option value="Família da Noiva">Família da Noiva</option>
                <option value="Amigos">Amigos</option>
                <option value="Padrinhos">Padrinhos</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3E2723] mb-1">
                1ª Confirmação Prévia
              </label>
              <select
                value={firstConfirmation}
                onChange={(e) => setFirstConfirmation(e.target.value)}
                className="w-full rounded-2xl border border-[#E8CBC3] bg-white px-3.5 py-2.5 text-xs text-[#3E2723] focus:border-[#C17767] focus:outline-none cursor-pointer"
              >
                <option value="OK">OK (Confirmado verbalmente)</option>
                <option value="PENDENTE">PENDENTE (Aguardando contato)</option>
                <option value="NAO">NÃO (Já avisou que não vai)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3E2723] mb-1">
                Observações / Notas Internas
              </label>
              <input
                type="text"
                value={plannerNotes}
                onChange={(e) => setPlannerNotes(e.target.value)}
                placeholder="Ex: Restrição alimentar, mesa preferencial..."
                className="w-full rounded-2xl border border-[#E8CBC3] bg-white px-3.5 py-2.5 text-xs text-[#3E2723] focus:border-[#C17767] focus:outline-none"
              />
            </div>
          </div>

          {/* Seção de Integrantes da Família & Faixas Etárias */}
          <div className="pt-2 border-t border-[#E8CBC3]/60">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <h3 className="font-serif text-base font-semibold text-[#3E2723] flex items-center gap-1.5">
                  <User size={16} className="text-[#C17767]" />
                  <span>Integrantes da Família & Faixas Etárias</span>
                </h3>
                <p className="text-[11px] text-[#6E5F57]">
                  Defina o nome de cada familiar e selecione a categoria correspondente:
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddMember}
                className="rounded-full bg-[#FAF7F0] border border-[#C17767] text-[#C17767] hover:bg-[#C17767] hover:text-white px-3 py-1 text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-1 shadow-2xs"
              >
                <Plus size={13} /> Integrante
              </button>
            </div>

            <div className="space-y-2.5">
              {members.map((m, idx) => {
                const catCfg = GUEST_CATEGORIES[normalizeGuestCategory(m.type)];
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl border border-[#E8CBC3] bg-white shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                  >
                    <div className="flex-1">
                      <input
                        type="text"
                        value={m.name}
                        onChange={(e) => handleMemberChange(idx, "name", e.target.value)}
                        placeholder={`Nome do familiar ${idx + 1} (Ex: ${idx === 0 ? primaryName || "Nome Completo" : "Beatriz Tomazi"})`}
                        className="w-full rounded-xl border border-line bg-[#FAF7F0]/60 px-3 py-1.5 text-xs text-[#3E2723] focus:border-[#C17767] focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div className="sm:w-56 shrink-0">
                      <select
                        value={m.type}
                        onChange={(e) => handleMemberChange(idx, "type", e.target.value as GuestCategory)}
                        className={`w-full rounded-xl border px-2.5 py-1.5 text-xs font-semibold cursor-pointer focus:outline-none ${catCfg.badgeBg} ${catCfg.badgeText} ${catCfg.badgeBorder}`}
                        title={catCfg.description}
                      >
                        {CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt.key} value={opt.key}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {members.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(idx)}
                        className="grid h-8 w-8 place-items-center rounded-xl text-muted hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0 self-end sm:self-auto"
                        title="Remover este integrante"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </form>

        {/* Rodapé com Botões de Ação */}
        <div className="border-t border-[#E8CBC3]/70 px-5 sm:px-6 py-3.5 bg-white/95 flex items-center justify-between gap-3">
          <p className="text-xs text-muted">
            Total: <strong>{members.filter((m) => m.name.trim()).length}</strong> pessoa(s) nesta família
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-full border border-line bg-white hover:bg-[#FAF7F0] px-4 py-2 text-xs font-semibold text-[#3E2723] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] px-5 py-2 text-xs font-bold text-white shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check size={14} />
              <span>{isSubmitting ? "Salvando na Nuvem..." : guestToEdit ? "Salvar Alterações" : "Cadastrar Família"}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
