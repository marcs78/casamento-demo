"use client";

import React, { useState, useMemo } from "react";
import { X, Search, Check, Users, Sparkles } from "lucide-react";
import {
  GUEST_CATEGORIES,
  GuestCategory,
  normalizeGuestCategory,
  getOfficialGuestList,
  updatePersonCategory,
  cleanString,
} from "@/lib/guestList";

interface GuestCategoryEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryChanged?: (guestName: string, newCat: GuestCategory) => void;
}

const ALL_CATEGORIES: GuestCategory[] = ["idoso", "adulto", "adolescente", "crianca", "bebe"];

export default function GuestCategoryEditorModal({
  isOpen,
  onClose,
  onCategoryChanged,
}: GuestCategoryEditorModalProps) {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<"todas" | GuestCategory>("todas");
  const [lastUpdated, setLastUpdated] = useState<{ name: string; cat: GuestCategory } | null>(null);
  const [localOverrides, setLocalOverrides] = useState<Record<string, GuestCategory>>({});

  // Carrega todos os integrantes únicos da lista oficial
  const allMembers = useMemo(() => {
    if (!isOpen) return [];
    const list = getOfficialGuestList();
    const members: {
      invitationId: string;
      primaryName: string;
      familySurname: string;
      name: string;
      type: GuestCategory;
      phone?: string;
    }[] = [];

    list.forEach((fam) => {
      fam.familyMembers.forEach((m) => {
        const memName = typeof m === "string" ? m : m.name;
        const baseType = typeof m === "string" ? "adulto" : normalizeGuestCategory(m.type);
        const memType = localOverrides[cleanString(memName)] ?? baseType;
        const memPhone = typeof m === "string" ? fam.phone : (m.phone || fam.phone);
        members.push({
          invitationId: fam.id,
          primaryName: fam.primaryName,
          familySurname: fam.familySurname || fam.primaryName,
          name: memName,
          type: memType,
          phone: memPhone,
        });
      });
    });

    return members;
  }, [isOpen, lastUpdated, localOverrides]);

  // Contagem por categoria
  const counts = useMemo(() => {
    const c = { idoso: 0, adulto: 0, adolescente: 0, crianca: 0, bebe: 0 };
    allMembers.forEach((m) => {
      c[m.type]++;
    });
    return c;
  }, [allMembers]);

  // Filtro de pesquisa e categoria
  const filtered = useMemo(() => {
    const q = cleanString(search);
    return allMembers.filter((m) => {
      if (filterCat !== "todas" && m.type !== filterCat) return false;
      if (!q) return true;
      const matchName = cleanString(m.name).includes(q);
      const matchFam = cleanString(m.familySurname).includes(q);
      const matchPrimary = cleanString(m.primaryName).includes(q);
      const matchPhone = m.phone ? m.phone.includes(q) : false;
      return matchName || matchFam || matchPrimary || matchPhone;
    });
  }, [allMembers, search, filterCat]);

  const handleSelectCategory = (guestName: string, invitationId: string, newCat: GuestCategory) => {
    setLocalOverrides((prev) => ({
      ...prev,
      [cleanString(guestName)]: newCat,
    }));

    updatePersonCategory({
      guestName,
      invitationId,
      newCategory: newCat,
    });
    setLastUpdated({ name: guestName, cat: newCat });
    if (onCategoryChanged) {
      onCategoryChanged(guestName, newCat);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border border-[#E8CBC3] bg-[#FAF7F0] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-[#E8CBC3]/70 px-5 sm:px-6 py-4 bg-white/80">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#C17767]/15 text-[#C17767]">
              <Sparkles size={20} />
            </span>
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-semibold text-[#3E2723]">
                Editar Categorias das Pessoas
              </h2>
              <p className="text-xs text-[#6E5F57]">
                Selecione a faixa etária de cada convidado (Idoso 60+, Adulto, Adolescente, Criança, Bebê)
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

        {/* Barra de Filtros & Contadores */}
        <div className="p-4 sm:p-5 border-b border-[#E8CBC3]/60 bg-white/50 space-y-3">
          {/* Campo de Busca */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome do convidado, família ou telefone..."
              className="w-full rounded-2xl border border-[#E8CBC3] bg-white pl-10 pr-4 py-2.5 text-xs text-[#3E2723] focus:border-[#C17767] focus:outline-none shadow-2xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-[#3E2723]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtros em Pílulas com contagens */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setFilterCat("todas")}
              className={`rounded-full px-3 py-1 font-semibold transition-all cursor-pointer ${
                filterCat === "todas"
                  ? "bg-[#3E2723] text-white shadow-2xs"
                  : "bg-white border border-[#E8CBC3] text-[#3E2723] hover:bg-[#FAF7F0]"
              }`}
            >
              Todos ({allMembers.length})
            </button>
            {ALL_CATEGORIES.map((catKey) => {
              const cfg = GUEST_CATEGORIES[catKey];
              const isSelected = filterCat === catKey;
              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => setFilterCat(catKey)}
                  className={`rounded-full px-3 py-1 font-semibold transition-all cursor-pointer border ${
                    isSelected
                      ? `${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder} ring-2 ring-offset-1 ring-[#C17767]/40 shadow-2xs`
                      : `bg-white border-[#E8CBC3] text-[#3E2723]/80 hover:bg-[#FAF7F0]`
                  }`}
                >
                  {cfg.shortLabel} ({counts[catKey]})
                </button>
              );
            })}
          </div>

          {/* Toast feedback temporário */}
          {lastUpdated && (
            <div className="rounded-xl bg-[#F0F4ED] border border-[#C8D4C0] px-3 py-1.5 text-xs font-semibold text-[#5F6F52] flex items-center gap-1.5 animate-in fade-in">
              <Check size={14} />
              <span>
                Categoria de <strong>{lastUpdated.name}</strong> atualizada para{" "}
                <strong>{GUEST_CATEGORIES[lastUpdated.cat].label}</strong>!
              </span>
            </div>
          )}
        </div>

        {/* Lista de Convidados */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 divide-y divide-[#E8CBC3]/40">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted">
              Nenhum convidado encontrado com os filtros atuais.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const currentCat = item.type;
              return (
                <div
                  key={`${item.invitationId}-${item.name}-${idx}`}
                  className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-[#3E2723] break-words">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-muted flex items-center gap-1.5 flex-wrap">
                      <span>Família: {item.familySurname}</span>
                      <span>·</span>
                      <span>Titular: {item.primaryName}</span>
                      {item.phone && (
                        <>
                          <span>·</span>
                          <span>{item.phone}</span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* 5 Botões de Categoria com 1 Clique */}
                  <div className="flex items-center gap-1 flex-wrap shrink-0">
                    {ALL_CATEGORIES.map((catKey) => {
                      const cfg = GUEST_CATEGORIES[catKey];
                      const isCurrent = currentCat === catKey;
                      return (
                        <button
                          key={catKey}
                          type="button"
                          onClick={() => handleSelectCategory(item.name, item.invitationId, catKey)}
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                            isCurrent
                              ? `${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder} ring-2 ring-offset-1 ring-[#5F6F52] shadow-2xs font-bold scale-102`
                              : "bg-white border-[#E8CBC3]/80 text-[#3E2723]/60 hover:text-[#3E2723] hover:border-[#C17767] hover:bg-[#FAF7F0]"
                          }`}
                          title={`Definir como ${cfg.label}: ${cfg.description}`}
                        >
                          {isCurrent ? `✓ ${cfg.shortLabel}` : cfg.shortLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé */}
        <div className="border-t border-[#E8CBC3]/70 px-5 sm:px-6 py-3.5 bg-white/90 flex items-center justify-between gap-3">
          <p className="text-xs text-muted">
            Mostrando <strong>{filtered.length}</strong> de <strong>{allMembers.length}</strong> convidados
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] px-5 py-2 text-xs font-bold text-white shadow-2xs transition-colors cursor-pointer"
          >
            Concluir
          </button>
        </div>

      </div>
    </div>
  );
}
