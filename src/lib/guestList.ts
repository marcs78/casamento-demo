// Base de dados Demo Comercial — Anita & Giuseppe (18.09.2027)
// Contém 14 famílias fictícias (~37 convidados) em todas as faixas etárias para demonstrar RSVP, Mesas e Relatórios.

import type { SongSuggestion } from "./wedding";
import {
  formatPhoneBR,
  normalizeRecordPhones,
  normalizeItemPhone,
  toWhatsAppNumber,
  phoneMatchesQuery,
} from "./phone";

export type GuestCategory = "idoso" | "adulto" | "adolescente" | "crianca" | "bebe";

export interface GuestCategoryInfo {
  key: GuestCategory;
  label: string;
  shortLabel: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  colorHex: string;
}

export const GUEST_CATEGORIES: Record<GuestCategory, GuestCategoryInfo> = {
  idoso: {
    key: "idoso",
    label: "Idoso (60+)",
    shortLabel: "60+",
    description: "60 anos ou mais · Assento prioritário",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-900",
    badgeBorder: "border-amber-300",
    colorHex: "#B45309",
  },
  adulto: {
    key: "adulto",
    label: "Adulto",
    shortLabel: "Adulto",
    description: "Adulto · Buffet completo",
    badgeBg: "bg-stone-100",
    badgeText: "text-stone-800",
    badgeBorder: "border-stone-300",
    colorHex: "#44403C",
  },
  adolescente: {
    key: "adolescente",
    label: "Adolescente",
    shortLabel: "Adolescente",
    description: "Adolescente / Jovem",
    badgeBg: "bg-sky-100",
    badgeText: "text-sky-900",
    badgeBorder: "border-sky-300",
    colorHex: "#0369A1",
  },
  crianca: {
    key: "crianca",
    label: "Criança",
    shortLabel: "Criança",
    description: "Criança · Buffet infantil",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-900",
    badgeBorder: "border-emerald-300",
    colorHex: "#047857",
  },
  bebe: {
    key: "bebe",
    label: "Bebê",
    shortLabel: "Bebê",
    description: "Bebê de colo (não ocupa assento à mesa)",
    badgeBg: "bg-pink-100",
    badgeText: "text-pink-900",
    badgeBorder: "border-pink-300",
    colorHex: "#BE185D",
  },
};

export const GUEST_CATEGORY_LIST = Object.values(GUEST_CATEGORIES);

export function normalizeGuestCategory(type?: string): GuestCategory {
  if (!type) return "adulto";
  const t = type.toLowerCase().trim();
  if (t === "idoso" || t.includes("60") || t.includes("idos")) return "idoso";
  if (t === "adolescente" || t.includes("adolec") || t.includes("adolesc") || t === "jovem") return "adolescente";
  if (t === "crianca" || t.includes("crian") || t.includes("infantil") || t === "kid") return "crianca";
  if (t === "bebe" || t.includes("beb") || t === "baby" || t.includes("colo")) return "bebe";
  return "adulto";
}

export function formatCategoryBreakdown(counts: {
  idosos?: number;
  adultos?: number;
  adolescentes?: number;
  criancas?: number;
  bebes?: number;
}): string {
  const parts: string[] = [];
  if (counts.idosos) parts.push(`${counts.idosos} ${counts.idosos === 1 ? "Idoso (60+)" : "Idosos (60+)"}`);
  if (counts.adultos) parts.push(`${counts.adultos} ${counts.adultos === 1 ? "Adulto" : "Adultos"}`);
  if (counts.adolescentes) parts.push(`${counts.adolescentes} ${counts.adolescentes === 1 ? "Adolescente" : "Adolescentes"}`);
  if (counts.criancas) parts.push(`${counts.criancas} ${counts.criancas === 1 ? "Criança" : "Crianças"}`);
  if (counts.bebes) parts.push(`${counts.bebes} ${counts.bebes === 1 ? "Bebê" : "Bebês"}`);
  return parts.length > 0 ? parts.join(" · ") : "Nenhum";
}

export function getBreakdownFromMembers(members: { type?: string; confirmed?: boolean }[]) {
  let idosos = 0;
  let adultos = 0;
  let adolescentes = 0;
  let criancas = 0;
  let bebes = 0;
  let totalConfirmed = 0;
  let totalDeclined = 0;

  for (const m of members) {
    if (m.confirmed !== false) {
      totalConfirmed++;
      const cat = normalizeGuestCategory(m.type);
      if (cat === "idoso") idosos++;
      else if (cat === "adolescente") adolescentes++;
      else if (cat === "crianca") criancas++;
      else if (cat === "bebe") bebes++;
      else adultos++;
    } else {
      totalDeclined++;
    }
  }

  return { idosos, adultos, adolescentes, criancas, bebes, totalConfirmed, totalDeclined };
}

export interface GuestMember {
  name: string;
  familia?: string;
  chefeFamilia?: string;
  type: GuestCategory;
  phone?: string;
  firstConfirmation?: "OK" | "PENDENTE" | "?" | "" | string;
  plannerNotes?: string;
}

export interface GuestRecord {
  id: string;
  primaryName: string;
  familySurname?: string;
  phone: string;
  familyMembers: (string | GuestMember)[];
  maxGuests: number;
  group: "Família da Noiva" | "Família do Noivo" | "Amigos" | string;
  mesaId?: number | null;
  firstConfirmation?: "OK" | "PENDENTE" | "?" | "" | string;
  plannerNotes?: string;
}

export type MemberAttendanceStatus = "confirmado" | "ausente" | "aguardando";

export interface ConfirmedFamilyMember {
  name: string;
  type: GuestCategory;
  phone?: string;
  confirmed: boolean;
  memberStatus?: MemberAttendanceStatus;
}

export interface RsvpSubmission {
  invitationId: string;
  primaryName: string;
  phone: string;
  answer: "sim" | "nao";
  familyMembers: ConfirmedFamilyMember[];
  adultsCount: number;
  kidsCount: number;
  idososCount?: number;
  adolescentesCount?: number;
  bebesCount?: number;
  declinedCount: number;
  diet: string;
  message: string;
  status: "confirmado_lista";
  timestamp: string;
}

export interface RsvpNotification {
  id: string;
  invitationId: string;
  primaryName: string;
  phone: string;
  answer: "sim" | "nao";
  adultsCount: number;
  kidsCount: number;
  idososCount?: number;
  adolescentesCount?: number;
  bebesCount?: number;
  declinedCount: number;
  confirmedNames: string[];
  declinedNames: string[];
  diet: string;
  message: string;
  timestamp: string;
  readByNoivos: boolean;
  readByCerimonialista: boolean;
}

// Chaves isoladas para a Demo (sem colisão com o projeto principal)
export const STORAGE_SINGLE_RSVP_KEY = "anita_giuseppe_demo_rsvp_v1";
export const STORAGE_ALL_RSVPS_KEY = "anita_giuseppe_demo_all_rsvps_v1";
export const STORAGE_NOTIFICATIONS_KEY = "anita_giuseppe_demo_rsvp_notifications_v1";
export const STORAGE_CUSTOM_GUESTS_KEY = "anita_giuseppe_demo_official_guests_v1";
export const STORAGE_CATEGORY_OVERRIDES_KEY = "anita_giuseppe_demo_category_overrides_v1";
export const STORAGE_SONG_SUGGESTIONS_KEY = "anita_giuseppe_demo_song_suggestions_v1";
export const STORAGE_GIFTS_KEY = "anita_giuseppe_demo_gifts_v1";
export const SYNC_CHANNEL_NAME = "anita_giuseppe_demo_wedding_sync";

// Lista oficial fictícia de demonstração (14 famílias · 36 convidados)
export const DEFAULT_OFFICIAL_GUEST_LIST: GuestRecord[] = [
  {
    id: "fam-01",
    primaryName: "Giuseppe Garibaldi",
    familySurname: "Noivos",
    phone: "(24) 99801-1001",
    familyMembers: [
      { name: "Giuseppe Garibaldi", familia: "NOIVOS", chefeFamilia: "GIUSEPPE GARIBALDI", type: "adulto", phone: "(24) 99801-1001", firstConfirmation: "OK" },
      { name: "Anita Ribeiro", familia: "NOIVOS", chefeFamilia: "GIUSEPPE GARIBALDI", type: "adulto", phone: "(24) 99801-1002", firstConfirmation: "OK" },
    ],
    maxGuests: 2,
    group: "Família do Noivo",
    mesaId: 1,
    firstConfirmation: "OK",
  },
  {
    id: "fam-02",
    primaryName: "Bento Ribeiro",
    familySurname: "Ribeiro",
    phone: "(48) 99912-2001",
    familyMembers: [
      { name: "Bento Ribeiro", familia: "RIBEIRO", chefeFamilia: "BENTO RIBEIRO", type: "idoso", phone: "(48) 99912-2001", firstConfirmation: "OK" },
      { name: "Antônia Ribeiro", familia: "RIBEIRO", chefeFamilia: "BENTO RIBEIRO", type: "idoso", phone: "(48) 99912-2002", firstConfirmation: "OK" },
      { name: "Clara Ribeiro", familia: "RIBEIRO", chefeFamilia: "BENTO RIBEIRO", type: "adulto", phone: "(48) 99912-2003", firstConfirmation: "OK" },
    ],
    maxGuests: 3,
    group: "Família da Noiva",
    mesaId: 1,
    firstConfirmation: "OK",
    plannerNotes: "Pais e irmã da noiva · Assento prioritário próximo ao altar",
  },
  {
    id: "fam-03",
    primaryName: "Domenico Garibaldi",
    familySurname: "Garibaldi",
    phone: "(21) 99822-3001",
    familyMembers: [
      { name: "Domenico Garibaldi", familia: "GARIBALDI", chefeFamilia: "DOMENICO GARIBALDI", type: "idoso", phone: "(21) 99822-3001", firstConfirmation: "OK" },
      { name: "Rosa Garibaldi", familia: "GARIBALDI", chefeFamilia: "DOMENICO GARIBALDI", type: "idoso", phone: "(21) 99822-3002", firstConfirmation: "OK" },
      { name: "Angelo Garibaldi", familia: "GARIBALDI", chefeFamilia: "DOMENICO GARIBALDI", type: "adulto", phone: "(21) 99822-3003", firstConfirmation: "OK" },
    ],
    maxGuests: 3,
    group: "Família do Noivo",
    mesaId: 2,
    firstConfirmation: "OK",
    plannerNotes: "Pais e irmão do noivo",
  },
  {
    id: "fam-04",
    primaryName: "Mariana Vasconcelos",
    familySurname: "Vasconcelos",
    phone: "(24) 99733-4001",
    familyMembers: [
      { name: "Mariana Vasconcelos", familia: "VASCONCELOS", chefeFamilia: "MARIANA VASCONCELOS", type: "adulto", phone: "(24) 99733-4001", firstConfirmation: "OK" },
      { name: "Henrique Vasconcelos", familia: "VASCONCELOS", chefeFamilia: "MARIANA VASCONCELOS", type: "adulto", phone: "(24) 99733-4002", firstConfirmation: "OK" },
      { name: "Laura Vasconcelos", familia: "VASCONCELOS", chefeFamilia: "MARIANA VASCONCELOS", type: "crianca", firstConfirmation: "OK" },
      { name: "Lucas Vasconcelos", familia: "VASCONCELOS", chefeFamilia: "MARIANA VASCONCELOS", type: "bebe", firstConfirmation: "OK" },
    ],
    maxGuests: 4,
    group: "Amigos",
    mesaId: 3,
    firstConfirmation: "OK",
    plannerNotes: "Madrinha e Padrinho · Bebê de colo (cadeirão opcional)",
  },
  {
    id: "fam-05",
    primaryName: "Bento Alencar",
    familySurname: "Alencar",
    phone: "(21) 99644-5001",
    familyMembers: [
      { name: "Bento Alencar", familia: "ALENCAR", chefeFamilia: "BENTO ALENCAR", type: "adulto", phone: "(21) 99644-5001", firstConfirmation: "OK" },
      { name: "Beatriz Alencar", familia: "ALENCAR", chefeFamilia: "BENTO ALENCAR", type: "adulto", phone: "(21) 99644-5002", firstConfirmation: "OK" },
      { name: "Pedro Alencar", familia: "ALENCAR", chefeFamilia: "BENTO ALENCAR", type: "adolescente", firstConfirmation: "OK" },
    ],
    maxGuests: 3,
    group: "Amigos",
    mesaId: 3,
    firstConfirmation: "OK",
  },
  {
    id: "fam-06",
    primaryName: "Heitor Montenegro",
    familySurname: "Montenegro",
    phone: "(11) 99555-6001",
    familyMembers: [
      { name: "Heitor Montenegro", familia: "MONTENEGRO", chefeFamilia: "HEITOR MONTENEGRO", type: "adulto", phone: "(11) 99555-6001", firstConfirmation: "OK" },
      { name: "Sofia Montenegro", familia: "MONTENEGRO", chefeFamilia: "HEITOR MONTENEGRO", type: "adulto", phone: "(11) 99555-6002", firstConfirmation: "OK" },
    ],
    maxGuests: 2,
    group: "Amigos",
    mesaId: null, // Propositalmente sem mesa para demonstração de alocação ao vivo!
    firstConfirmation: "OK",
    plannerNotes: "Confirmados — aguardando alocação na Mesa 03 ou 04",
  },
  {
    id: "fam-07",
    primaryName: "Eduardo Cavalcanti",
    familySurname: "Cavalcanti",
    phone: "(21) 99466-7001",
    familyMembers: [
      { name: "Eduardo Cavalcanti", familia: "CAVALCANTI", chefeFamilia: "EDUARDO CAVALCANTI", type: "adulto", phone: "(21) 99466-7001", firstConfirmation: "OK" },
      { name: "Camila Cavalcanti", familia: "CAVALCANTI", chefeFamilia: "EDUARDO CAVALCANTI", type: "adulto", phone: "(21) 99466-7002", firstConfirmation: "OK" },
      { name: "Júlia Cavalcanti", familia: "CAVALCANTI", chefeFamilia: "EDUARDO CAVALCANTI", type: "crianca", firstConfirmation: "OK" },
    ],
    maxGuests: 3,
    group: "Família da Noiva",
    mesaId: 4,
    firstConfirmation: "OK",
  },
  {
    id: "fam-08",
    primaryName: "Lorenzo Bettencourt",
    familySurname: "Bettencourt",
    phone: "(51) 99377-8001",
    familyMembers: [
      { name: "Lorenzo Bettencourt", familia: "BETTENCOURT", chefeFamilia: "LORENZO BETTENCOURT", type: "adulto", phone: "(51) 99377-8001" },
      { name: "Helena Bettencourt", familia: "BETTENCOURT", chefeFamilia: "LORENZO BETTENCOURT", type: "adulto", phone: "(51) 99377-8002" },
    ],
    maxGuests: 2,
    group: "Família do Noivo",
    mesaId: null,
    firstConfirmation: "NAO",
    plannerNotes: "Em viagem internacional na data do evento",
  },
  {
    id: "fam-09",
    primaryName: "Arthur Santana",
    familySurname: "Santana",
    phone: "(24) 99288-9001",
    familyMembers: [
      { name: "Arthur Santana", familia: "SANTANA", chefeFamilia: "ARTHUR SANTANA", type: "adulto", phone: "(24) 99288-9001", firstConfirmation: "OK" },
      { name: "Cecília Santana", familia: "SANTANA", chefeFamilia: "ARTHUR SANTANA", type: "adulto", phone: "(24) 99288-9002", firstConfirmation: "OK" },
      { name: "Matheus Santana", familia: "SANTANA", chefeFamilia: "ARTHUR SANTANA", type: "adolescente" },
    ],
    maxGuests: 3,
    group: "Amigos",
    mesaId: 4,
    firstConfirmation: "OK",
    plannerNotes: "Restrição alimentar: Cecília é vegetariana",
  },
  // 5 Famílias em "Aguardando RSVP" para o cliente testar a busca nominal no Capítulo 02!
  {
    id: "fam-10",
    primaryName: "Joaquim Borges",
    familySurname: "Borges",
    phone: "(24) 99100-1010",
    familyMembers: [
      { name: "Joaquim Borges", familia: "BORGES", chefeFamilia: "JOAQUIM BORGES", type: "adulto", phone: "(24) 99100-1010" },
      { name: "Teresa Borges", familia: "BORGES", chefeFamilia: "JOAQUIM BORGES", type: "adulto", phone: "(24) 99100-1011" },
      { name: "Miguel Borges", familia: "BORGES", chefeFamilia: "JOAQUIM BORGES", type: "crianca" },
    ],
    maxGuests: 3,
    group: "Amigos",
    mesaId: null,
    firstConfirmation: "PENDENTE",
  },
  {
    id: "fam-11",
    primaryName: "Rafael D'Ávila",
    familySurname: "D'Ávila",
    phone: "(21) 99100-1111",
    familyMembers: [
      { name: "Rafael D'Ávila", familia: "D'ÁVILA", chefeFamilia: "RAFAEL D'ÁVILA", type: "adulto", phone: "(21) 99100-1111" },
      { name: "Larissa D'Ávila", familia: "D'ÁVILA", chefeFamilia: "RAFAEL D'ÁVILA", type: "adulto", phone: "(21) 99100-1112" },
    ],
    maxGuests: 2,
    group: "Família da Noiva",
    mesaId: null,
    firstConfirmation: "PENDENTE",
  },
  {
    id: "fam-12",
    primaryName: "Gustavo Menezes",
    familySurname: "Menezes",
    phone: "(11) 99100-1212",
    familyMembers: [
      { name: "Gustavo Menezes", familia: "MENEZES", chefeFamilia: "GUSTAVO MENEZES", type: "adulto", phone: "(11) 99100-1212" },
      { name: "Carolina Menezes", familia: "MENEZES", chefeFamilia: "GUSTAVO MENEZES", type: "adulto", phone: "(11) 99100-1213" },
      { name: "Alice Menezes", familia: "MENEZES", chefeFamilia: "GUSTAVO MENEZES", type: "bebe" },
    ],
    maxGuests: 3,
    group: "Amigos",
    mesaId: null,
    firstConfirmation: "PENDENTE",
  },
  {
    id: "fam-13",
    primaryName: "Augusto Fonseca",
    familySurname: "Fonseca",
    phone: "(48) 99100-1313",
    familyMembers: [
      { name: "Augusto Fonseca", familia: "FONSECA", chefeFamilia: "AUGUSTO FONSECA", type: "idoso", phone: "(48) 99100-1313" },
      { name: "Lúcia Fonseca", familia: "FONSECA", chefeFamilia: "AUGUSTO FONSECA", type: "idoso", phone: "(48) 99100-1314" },
    ],
    maxGuests: 2,
    group: "Família do Noivo",
    mesaId: null,
    firstConfirmation: "?",
  },
  {
    id: "fam-14",
    primaryName: "Luiza Nogueira",
    familySurname: "Nogueira",
    phone: "(24) 99100-1414",
    familyMembers: [
      { name: "Luiza Nogueira", familia: "NOGUEIRA", chefeFamilia: "LUIZA NOGUEIRA", type: "adulto", phone: "(24) 99100-1414" },
      { name: "Gabriel Nogueira", familia: "NOGUEIRA", chefeFamilia: "LUIZA NOGUEIRA", type: "adulto", phone: "(24) 99100-1415" },
    ],
    maxGuests: 2,
    group: "Amigos",
    mesaId: null,
    firstConfirmation: "PENDENTE",
  },
];

export const OFFICIAL_GUEST_LIST = DEFAULT_OFFICIAL_GUEST_LIST;

export function cleanString(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(familia|sr|sra|casal|chefe)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const DEFAULT_CATEGORY_OVERRIDES: Record<string, GuestCategory> = {};

export function getCategoryOverrides(): Record<string, GuestCategory> {
  if (typeof window === "undefined") return { ...DEFAULT_CATEGORY_OVERRIDES };
  try {
    const raw = localStorage.getItem(STORAGE_CATEGORY_OVERRIDES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_CATEGORY_OVERRIDES, ...parsed };
  } catch {
    return { ...DEFAULT_CATEGORY_OVERRIDES };
  }
}

export function saveCategoryOverrides(overrides: Record<string, GuestCategory>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_CATEGORY_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {}
}

export function applyCategoryOverridesToRecords(records: GuestRecord[]): GuestRecord[] {
  const overrides = getCategoryOverrides();
  if (!overrides || Object.keys(overrides).length === 0) return records;

  return records.map((record) => ({
    ...record,
    familyMembers: record.familyMembers.map((m) => {
      const memName = typeof m === "string" ? m : m.name;
      const ovr = overrides[cleanString(memName)];
      if (!ovr) return m;
      if (typeof m === "string") {
        return {
          name: m,
          familia: record.familySurname,
          chefeFamilia: record.primaryName,
          type: ovr,
          firstConfirmation: record.firstConfirmation,
        };
      }
      return { ...m, type: ovr };
    }),
  }));
}

export function getOfficialGuestList(): GuestRecord[] {
  if (typeof window === "undefined") {
    return DEFAULT_OFFICIAL_GUEST_LIST.map((g) => normalizeRecordPhones(g));
  }
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_GUESTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GuestRecord[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return applyCategoryOverridesToRecords(parsed.map((g) => normalizeRecordPhones(g)));
      }
    }
  } catch {}
  return applyCategoryOverridesToRecords(
    DEFAULT_OFFICIAL_GUEST_LIST.map((g) => normalizeRecordPhones(g))
  );
}

export function saveOfficialGuestList(list: GuestRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    const normalized = list.map((g) => normalizeRecordPhones(g));
    localStorage.setItem(STORAGE_CUSTOM_GUESTS_KEY, JSON.stringify(normalized));
    notifySyncListeners("guests_updated");
    fetch("/api/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save_all", guests: normalized }),
    }).catch(() => {});
  } catch {}
}

export function updatePersonCategory(params: {
  guestName: string;
  newCategory: GuestCategory;
  invitationId?: string;
}): { success: boolean; message: string; category: GuestCategory } {
  const normalizedNewCat = normalizeGuestCategory(params.newCategory);
  if (typeof window === "undefined") {
    return { success: false, message: "Client-side only", category: normalizedNewCat };
  }

  const targetClean = cleanString(params.guestName);

  try {
    const overrides = getCategoryOverrides();
    overrides[targetClean] = normalizedNewCat;
    saveCategoryOverrides(overrides);
  } catch {}

  try {
    const currentList = getOfficialGuestList();
    let officialChanged = false;
    const updatedList = currentList.map((record) => {
      const isTargetRecord = !params.invitationId || record.id === params.invitationId;
      if (!isTargetRecord) return record;

      let memberChanged = false;
      const updatedMembers = record.familyMembers.map((m) => {
        const memName = typeof m === "string" ? m : m.name;
        if (cleanString(memName) === targetClean) {
          memberChanged = true;
          officialChanged = true;
          if (typeof m === "string") {
            return {
              name: m,
              familia: record.familySurname,
              chefeFamilia: record.primaryName,
              type: normalizedNewCat,
              firstConfirmation: record.firstConfirmation,
            };
          }
          return { ...m, type: normalizedNewCat };
        }
        return m;
      });

      return memberChanged ? { ...record, familyMembers: updatedMembers } : record;
    });

    if (officialChanged) {
      localStorage.setItem(STORAGE_CUSTOM_GUESTS_KEY, JSON.stringify(updatedList));
    }
  } catch {}

  try {
    const allRsvps = getAllRsvpSubmissions();
    let rsvpChanged = false;
    const updatedRsvps = allRsvps.map((sub) => {
      const isTargetSub = !params.invitationId || sub.invitationId === params.invitationId;
      if (!isTargetSub) return sub;

      let subChanged = false;
      const updatedMembers = sub.familyMembers.map((m) => {
        if (cleanString(m.name) === targetClean) {
          subChanged = true;
          rsvpChanged = true;
          return { ...m, type: normalizedNewCat };
        }
        return m;
      });

      if (subChanged) {
        const going = updatedMembers.filter((m) => m.confirmed);
        const bk = getBreakdownFromMembers(going);
        const updatedSub: RsvpSubmission = {
          ...sub,
          familyMembers: updatedMembers,
          adultsCount: bk.adultos,
          kidsCount: bk.criancas,
          idososCount: bk.idosos,
          adolescentesCount: bk.adolescentes,
          bebesCount: bk.bebes,
        };

        fetch("/api/rsvp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submission: updatedSub }),
        }).catch(() => {});

        return updatedSub;
      }
      return sub;
    });

    if (rsvpChanged) {
      localStorage.setItem(STORAGE_ALL_RSVPS_KEY, JSON.stringify(updatedRsvps));
      notifySyncListeners("rsvp_submitted");
    }
  } catch {}

  fetch("/api/guests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "update_category",
      guestName: params.guestName,
      newCategory: normalizedNewCat,
      invitationId: params.invitationId,
    }),
  }).catch(() => {});

  notifySyncListeners("guests_updated");
  notifySyncListeners("guest_category_updated", {
    guestName: params.guestName,
    newCategory: normalizedNewCat,
  });

  return {
    success: true,
    message: `Categoria de ${params.guestName} alterada para ${GUEST_CATEGORIES[normalizedNewCat].label}!`,
    category: normalizedNewCat,
  };
}

export function extractSurname(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] || "";
  return parts[parts.length - 1];
}

export function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export interface SearchResult {
  found: boolean;
  matchType: "exact_phone" | "exact_name" | "surname_or_head" | "multiple" | "none";
  invitation: GuestRecord | null;
  matches: GuestRecord[];
  message: string;
}

export function getInvitationMembers(invitation: GuestRecord): ConfirmedFamilyMember[] {
  return invitation.familyMembers.map((m) => {
    if (typeof m === "string") {
      const cat = normalizeGuestCategory(m);
      return {
        name: m
          .replace(/\((idoso|60\+|adolescente|jovem|crian[cç]a|beb[eê])\)/gi, "")
          .trim(),
        type: cat,
        confirmed: true,
      };
    }
    return {
      name: m.name,
      type: normalizeGuestCategory(m.type),
      phone: m.phone,
      confirmed: true,
    };
  });
}

const STOP_WORDS = new Set(["de", "da", "do", "das", "dos", "e"]);

export function findGuestInList(name: string, phone: string): SearchResult {
  const guestList = getOfficialGuestList();
  const normName = cleanString(name);
  const normPhone = cleanPhone(phone);

  if (!normName && normPhone.length < 8) {
    return { found: false, matchType: "none", invitation: null, matches: [], message: "" };
  }

  if (normPhone.length >= 8) {
    const targetEnd = normPhone.slice(-8);
    const byPhone = guestList.find((g) => {
      const candidatePhones = [
        g.phone,
        ...g.familyMembers.map((m) => (typeof m === "string" ? "" : m.phone || "")),
      ];
      return candidatePhones.some((p) => {
        const gPhone = cleanPhone(p);
        if (gPhone.length < 8) return false;
        const guestEnd = gPhone.slice(-8);
        return gPhone === normPhone || targetEnd === guestEnd;
      });
    });
    if (byPhone) {
      return {
        found: true,
        matchType: "exact_phone",
        invitation: byPhone,
        matches: [byPhone],
        message: `Convite localizado para a família de ${byPhone.primaryName}`,
      };
    }
  }

  if (normName.length >= 2) {
    const inputWords = normName
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

    if (inputWords.length >= 2) {
      const exactMemberMatches = guestList.filter((g) => {
        const surname = g.familySurname || extractSurname(g.primaryName);
        const primaryWithSurname = cleanString(`${g.primaryName} ${surname}`);
        if (cleanString(g.primaryName) === normName || primaryWithSurname === normName) {
          return true;
        }
        return g.familyMembers.some((m) => {
          const mName = typeof m === "string" ? m : m.name;
          return cleanString(mName) === normName;
        });
      });

      if (exactMemberMatches.length === 1) {
        return {
          found: true,
          matchType: "exact_name",
          invitation: exactMemberMatches[0],
          matches: exactMemberMatches,
          message: `Convite localizado para a família de ${exactMemberMatches[0].primaryName}`,
        };
      }
    }

    if (inputWords.length > 0) {
      const getFamilyWords = (g: GuestRecord): string[] => {
        const surname = g.familySurname || extractSurname(g.primaryName);
        const candidateNames = [
          cleanString(g.primaryName),
          cleanString(surname),
          ...g.familyMembers.flatMap((m) =>
            typeof m === "string"
              ? [cleanString(m)]
              : [
                  cleanString(m.name),
                  m.familia && m.familia !== "*" ? cleanString(m.familia) : "",
                  m.chefeFamilia ? cleanString(m.chefeFamilia) : "",
                ].filter(Boolean)
          ),
        ];
        return candidateNames.join(" ").split(/\s+/).filter(Boolean);
      };

      const exactWordMatches = guestList.filter((g) => {
        const words = getFamilyWords(g);
        return inputWords.every((iw) => words.some((cw) => cw === iw));
      });

      if (exactWordMatches.length === 1) {
        return {
          found: true,
          matchType: "exact_name",
          invitation: exactWordMatches[0],
          matches: exactWordMatches,
          message: `Convite localizado para a família de ${exactWordMatches[0].primaryName}`,
        };
      }

      if (exactWordMatches.length > 1) {
        return {
          found: true,
          matchType: "multiple",
          invitation: null,
          matches: exactWordMatches,
          message: `Encontramos mais de um convite com "${name.trim()}". Digite seu nome e sobrenome completos ou seu WhatsApp.`,
        };
      }

      const prefixMatches = guestList.filter((g) => {
        const words = getFamilyWords(g);
        return inputWords.every((iw) =>
          words.some((cw) => cw === iw || (iw.length >= 4 && cw.startsWith(iw)))
        );
      });

      if (prefixMatches.length === 1) {
        return {
          found: true,
          matchType: "surname_or_head",
          invitation: prefixMatches[0],
          matches: prefixMatches,
          message: `Convite localizado para a família de ${prefixMatches[0].primaryName}`,
        };
      }

      if (prefixMatches.length > 1) {
        return {
          found: true,
          matchType: "multiple",
          invitation: null,
          matches: prefixMatches,
          message: `Encontramos mais de um convite com "${name.trim()}". Digite seu nome e sobrenome completos ou seu WhatsApp.`,
        };
      }
    }
  }

  return {
    found: false,
    matchType: "none",
    invitation: null,
    matches: [],
    message: "Ainda não localizamos seu convite com esses dados.",
  };
}

// ============================================================================
// RSVPs PRÉ-POPULADOS DA DEMO (9 famílias respondidas, 5 aguardando RSVP)
// ============================================================================

export const INITIAL_DEMO_RSVPS: RsvpSubmission[] = [
  {
    invitationId: "fam-01",
    primaryName: "Giuseppe Garibaldi",
    phone: "(24) 99801-1001",
    answer: "sim",
    familyMembers: [
      { name: "Giuseppe Garibaldi", type: "adulto", confirmed: true, memberStatus: "confirmado" },
      { name: "Anita Ribeiro", type: "adulto", confirmed: true, memberStatus: "confirmado" },
    ],
    adultsCount: 2,
    kidsCount: 0,
    idososCount: 0,
    adolescentesCount: 0,
    bebesCount: 0,
    declinedCount: 0,
    diet: "",
    message: "Sejam muito bem-vindos ao nosso grande dia!",
    status: "confirmado_lista",
    timestamp: "10/08/2027 10:15",
  },
  {
    invitationId: "fam-02",
    primaryName: "Bento Ribeiro",
    phone: "(48) 99912-2001",
    answer: "sim",
    familyMembers: [
      { name: "Bento Ribeiro", type: "idoso", confirmed: true, memberStatus: "confirmado" },
      { name: "Antônia Ribeiro", type: "idoso", confirmed: true, memberStatus: "confirmado" },
      { name: "Clara Ribeiro", type: "adulto", confirmed: true, memberStatus: "confirmado" },
    ],
    adultsCount: 1,
    kidsCount: 0,
    idososCount: 2,
    adolescentesCount: 0,
    bebesCount: 0,
    declinedCount: 0,
    diet: "",
    message: "Estaremos todos juntos celebrando essa união abençoada!",
    status: "confirmado_lista",
    timestamp: "11/08/2027 14:20",
  },
  {
    invitationId: "fam-03",
    primaryName: "Domenico Garibaldi",
    phone: "(21) 99822-3001",
    answer: "sim",
    familyMembers: [
      { name: "Domenico Garibaldi", type: "idoso", confirmed: true, memberStatus: "confirmado" },
      { name: "Rosa Garibaldi", type: "idoso", confirmed: true, memberStatus: "confirmado" },
      { name: "Angelo Garibaldi", type: "adulto", confirmed: true, memberStatus: "confirmado" },
    ],
    adultsCount: 1,
    kidsCount: 0,
    idososCount: 2,
    adolescentesCount: 0,
    bebesCount: 0,
    declinedCount: 0,
    diet: "",
    message: "Com imensa alegria estaremos na primeira fila!",
    status: "confirmado_lista",
    timestamp: "11/08/2027 19:05",
  },
  {
    invitationId: "fam-04",
    primaryName: "Mariana Vasconcelos",
    phone: "(24) 99733-4001",
    answer: "sim",
    familyMembers: [
      { name: "Mariana Vasconcelos", type: "adulto", confirmed: true, memberStatus: "confirmado" },
      { name: "Henrique Vasconcelos", type: "adulto", confirmed: true, memberStatus: "confirmado" },
      { name: "Laura Vasconcelos", type: "crianca", confirmed: true, memberStatus: "confirmado" },
      { name: "Lucas Vasconcelos", type: "bebe", confirmed: true, memberStatus: "confirmado" },
    ],
    adultsCount: 2,
    kidsCount: 1,
    idososCount: 0,
    adolescentesCount: 0,
    bebesCount: 1,
    declinedCount: 0,
    diet: "",
    message: "Contando os dias! O Lucas vai no colo.",
    status: "confirmado_lista",
    timestamp: "12/08/2027 09:42",
  },
  {
    invitationId: "fam-05",
    primaryName: "Bento Alencar",
    phone: "(21) 99644-5001",
    answer: "sim",
    familyMembers: [
      { name: "Bento Alencar", type: "adulto", confirmed: true, memberStatus: "confirmado" },
      { name: "Beatriz Alencar", type: "adulto", confirmed: true, memberStatus: "confirmado" },
      { name: "Pedro Alencar", type: "adolescente", confirmed: true, memberStatus: "confirmado" },
    ],
    adultsCount: 2,
    kidsCount: 0,
    idososCount: 0,
    adolescentesCount: 1,
    bebesCount: 0,
    declinedCount: 0,
    diet: "",
    message: "Presença confirmadíssima!",
    status: "confirmado_lista",
    timestamp: "13/08/2027 16:30",
  },
  {
    invitationId: "fam-06",
    primaryName: "Heitor Montenegro",
    phone: "(11) 99555-6001",
    answer: "sim",
    familyMembers: [
      { name: "Heitor Montenegro", type: "adulto", confirmed: true, memberStatus: "confirmado" },
      { name: "Sofia Montenegro", type: "adulto", confirmed: true, memberStatus: "confirmado" },
    ],
    adultsCount: 2,
    kidsCount: 0,
    idososCount: 0,
    adolescentesCount: 0,
    bebesCount: 0,
    declinedCount: 0,
    diet: "",
    message: "Já reservamos o hotel na serra!",
    status: "confirmado_lista",
    timestamp: "14/08/2027 11:18",
  },
  {
    invitationId: "fam-07",
    primaryName: "Eduardo Cavalcanti",
    phone: "(21) 99466-7001",
    answer: "sim",
    familyMembers: [
      { name: "Eduardo Cavalcanti", type: "adulto", confirmed: true, memberStatus: "confirmado" },
      { name: "Camila Cavalcanti", type: "adulto", confirmed: true, memberStatus: "confirmado" },
      { name: "Júlia Cavalcanti", type: "crianca", confirmed: true, memberStatus: "confirmado" },
    ],
    adultsCount: 2,
    kidsCount: 1,
    idososCount: 0,
    adolescentesCount: 0,
    bebesCount: 0,
    declinedCount: 0,
    diet: "",
    message: "Será uma noite memorável!",
    status: "confirmado_lista",
    timestamp: "14/08/2027 18:45",
  },
  {
    invitationId: "fam-08",
    primaryName: "Lorenzo Bettencourt",
    phone: "(51) 99377-8001",
    answer: "nao",
    familyMembers: [
      { name: "Lorenzo Bettencourt", type: "adulto", confirmed: false, memberStatus: "ausente" },
      { name: "Helena Bettencourt", type: "adulto", confirmed: false, memberStatus: "ausente" },
    ],
    adultsCount: 0,
    kidsCount: 0,
    idososCount: 0,
    adolescentesCount: 0,
    bebesCount: 0,
    declinedCount: 2,
    diet: "",
    message: "Infelizmente estaremos em viagem na data, mas desejamos toda felicidade!",
    status: "confirmado_lista",
    timestamp: "15/08/2027 08:12",
  },
  {
    invitationId: "fam-09",
    primaryName: "Arthur Santana",
    phone: "(24) 99288-9001",
    answer: "sim",
    familyMembers: [
      { name: "Arthur Santana", type: "adulto", confirmed: true, memberStatus: "confirmado" },
      { name: "Cecília Santana", type: "adulto", confirmed: true, memberStatus: "confirmado" },
      { name: "Matheus Santana", type: "adolescente", confirmed: false, memberStatus: "ausente" },
    ],
    adultsCount: 2,
    kidsCount: 0,
    idososCount: 0,
    adolescentesCount: 0,
    bebesCount: 0,
    declinedCount: 1,
    diet: "Cecília: opção vegetariana",
    message: "Arthur e Cecília confirmados; Matheus terá prova no sábado.",
    status: "confirmado_lista",
    timestamp: "15/08/2027 20:10",
  },
];

export const INITIAL_NOTIFICATIONS: RsvpNotification[] = [
  {
    id: "notif-demo-09",
    invitationId: "fam-09",
    primaryName: "Arthur Santana",
    phone: "(24) 99288-9001",
    answer: "sim",
    adultsCount: 2,
    kidsCount: 0,
    declinedCount: 1,
    confirmedNames: ["Arthur Santana", "Cecília Santana"],
    declinedNames: ["Matheus Santana"],
    diet: "Cecília: opção vegetariana",
    message: "Arthur e Cecília confirmados; Matheus terá prova no sábado.",
    timestamp: "15/08/2027 20:10",
    readByNoivos: false,
    readByCerimonialista: false,
  },
  {
    id: "notif-demo-08",
    invitationId: "fam-08",
    primaryName: "Lorenzo Bettencourt",
    phone: "(51) 99377-8001",
    answer: "nao",
    adultsCount: 0,
    kidsCount: 0,
    declinedCount: 2,
    confirmedNames: [],
    declinedNames: ["Lorenzo Bettencourt", "Helena Bettencourt"],
    diet: "",
    message: "Infelizmente estaremos em viagem na data, mas desejamos toda felicidade!",
    timestamp: "15/08/2027 08:12",
    readByNoivos: false,
    readByCerimonialista: false,
  },
  {
    id: "notif-demo-04",
    invitationId: "fam-04",
    primaryName: "Mariana Vasconcelos",
    phone: "(24) 99733-4001",
    answer: "sim",
    adultsCount: 2,
    kidsCount: 1,
    bebesCount: 1,
    declinedCount: 0,
    confirmedNames: ["Mariana Vasconcelos", "Henrique Vasconcelos", "Laura Vasconcelos", "Lucas Vasconcelos"],
    declinedNames: [],
    diet: "",
    message: "Contando os dias! O Lucas vai no colo.",
    timestamp: "12/08/2027 09:42",
    readByNoivos: true,
    readByCerimonialista: true,
  },
];

export function isPreDeclinedConfirmation(val?: string | null): boolean {
  if (!val) return false;
  const norm = val
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return norm === "NAO" || norm === "AUSENTE" || norm.startsWith("NAO ");
}

export function getEffectiveMemberStatus(m: {
  confirmed: boolean;
  memberStatus?: MemberAttendanceStatus;
}): MemberAttendanceStatus {
  if (m.memberStatus === "confirmado" || m.memberStatus === "ausente" || m.memberStatus === "aguardando") {
    return m.memberStatus;
  }
  return m.confirmed ? "confirmado" : "ausente";
}

export function buildPreDeclinedSubmissionFromGuest(guest: GuestRecord): RsvpSubmission {
  const baseMembers = getInvitationMembers(guest);
  return {
    invitationId: guest.id,
    primaryName: guest.primaryName,
    phone: guest.phone || "",
    answer: "nao",
    familyMembers: baseMembers.map((m) => ({
      name: m.name,
      type: normalizeGuestCategory(m.type),
      phone: m.phone,
      confirmed: false,
      memberStatus: "ausente",
    })),
    idososCount: 0,
    adultsCount: 0,
    adolescentesCount: 0,
    kidsCount: 0,
    bebesCount: 0,
    declinedCount: baseMembers.length,
    diet: "",
    message: guest.plannerNotes || "",
    status: "confirmado_lista",
    timestamp: "Lista Oficial (1ª Confirmação)",
  };
}

export function computeUnifiedRsvpStats(
  officialGuests: GuestRecord[],
  submissions: RsvpSubmission[]
) {
  const subById = new Map<string, RsvpSubmission>();
  submissions.forEach((s) => subById.set(s.invitationId, s));

  let confirmedPeople = 0;
  let declinedPeople = 0;
  let pendingPeople = 0;
  let totalPeople = 0;

  let confirmedFamilies = 0;
  let fullyDeclinedFamilies = 0;
  let partialDeclinedFamilies = 0;
  let pendingFamilies = 0;

  officialGuests.forEach((fam) => {
    const sub = subById.get(fam.id);
    if (sub && Array.isArray(sub.familyMembers) && sub.familyMembers.length > 0) {
      let famGoing = 0;
      let famDeclined = 0;
      let famPending = 0;

      sub.familyMembers.forEach((m) => {
        totalPeople++;
        const st = getEffectiveMemberStatus(m);
        if (st === "confirmado") {
          confirmedPeople++;
          famGoing++;
        } else if (st === "ausente") {
          declinedPeople++;
          famDeclined++;
        } else {
          pendingPeople++;
          famPending++;
        }
      });

      if (famGoing > 0) {
        confirmedFamilies++;
        if (famDeclined > 0) partialDeclinedFamilies++;
      } else if (famDeclined > 0 && famPending === 0) {
        fullyDeclinedFamilies++;
      } else if (famDeclined > 0 && famPending > 0) {
        partialDeclinedFamilies++;
        pendingFamilies++;
      } else {
        pendingFamilies++;
      }
    } else {
      const famPreDeclined = isPreDeclinedConfirmation(fam.firstConfirmation);
      let famDeclined = 0;
      let famPending = 0;

      fam.familyMembers.forEach((m) => {
        totalPeople++;
        const memObj = typeof m !== "string" ? m : undefined;
        const memPreDeclined = famPreDeclined || isPreDeclinedConfirmation(memObj?.firstConfirmation);
        if (memPreDeclined) {
          declinedPeople++;
          famDeclined++;
        } else {
          pendingPeople++;
          famPending++;
        }
      });

      if (famDeclined > 0 && famPending === 0) {
        fullyDeclinedFamilies++;
      } else if (famDeclined > 0) {
        partialDeclinedFamilies++;
        pendingFamilies++;
      } else {
        pendingFamilies++;
      }
    }
  });

  const officialIds = new Set(officialGuests.map((g) => g.id));
  submissions.forEach((s) => {
    if (officialIds.has(s.invitationId)) return;
    let famGoing = 0;
    let famDeclined = 0;
    (s.familyMembers || []).forEach((m) => {
      totalPeople++;
      const st = getEffectiveMemberStatus(m);
      if (st === "confirmado") {
        confirmedPeople++;
        famGoing++;
      } else if (st === "ausente") {
        declinedPeople++;
        famDeclined++;
      } else {
        pendingPeople++;
      }
    });
    if (famGoing > 0) {
      confirmedFamilies++;
      if (famDeclined > 0) partialDeclinedFamilies++;
    } else if (famDeclined > 0) {
      fullyDeclinedFamilies++;
    }
  });

  return {
    confirmedPeople,
    declinedPeople,
    pendingPeople,
    totalPeople,
    confirmedFamilies,
    fullyDeclinedFamilies,
    partialDeclinedFamilies,
    familiesWithAnyAbsence: fullyDeclinedFamilies + partialDeclinedFamilies,
    pendingFamilies,
  };
}

export function applyCategoryOverridesToSubmissions(subs: RsvpSubmission[]): RsvpSubmission[] {
  const overrides = getCategoryOverrides();

  return subs.map((s) => {
    const updatedMembers = (s.familyMembers || []).map((m) => {
      const ovr = overrides[cleanString(m.name)];
      return ovr ? { ...m, type: ovr } : m;
    });

    const going = updatedMembers.filter((m) => getEffectiveMemberStatus(m) === "confirmado");
    const absent = updatedMembers.filter((m) => getEffectiveMemberStatus(m) === "ausente");
    const bk = getBreakdownFromMembers(going);

    return {
      ...s,
      answer: going.length > 0 ? "sim" : "nao",
      familyMembers: updatedMembers,
      idososCount: bk.idosos,
      adultsCount: bk.adultos,
      adolescentesCount: bk.adolescentes,
      kidsCount: bk.criancas,
      bebesCount: bk.bebes,
      declinedCount: absent.length,
    };
  });
}

export function getAllRsvpSubmissions(): RsvpSubmission[] {
  if (typeof window === "undefined") {
    return INITIAL_DEMO_RSVPS.map((s) => normalizeRecordPhones(s));
  }
  try {
    const raw = localStorage.getItem(STORAGE_ALL_RSVPS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as RsvpSubmission[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return applyCategoryOverridesToSubmissions(parsed).map((s) => normalizeRecordPhones(s));
      }
    }
  } catch {}
  return applyCategoryOverridesToSubmissions(
    INITIAL_DEMO_RSVPS.map((s) => normalizeRecordPhones(s))
  );
}

export function getRsvpNotifications(): RsvpNotification[] {
  if (typeof window === "undefined") {
    return applyNotificationReadState(INITIAL_NOTIFICATIONS.map((n) => normalizeItemPhone(n)));
  }
  try {
    const raw = localStorage.getItem(STORAGE_NOTIFICATIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as RsvpNotification[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return applyNotificationReadState(parsed.map((n) => normalizeItemPhone(n)));
      }
    }
  } catch {}
  return applyNotificationReadState(
    INITIAL_NOTIFICATIONS.map((n) => normalizeItemPhone(n))
  );
}

export function saveRsvpSubmission(
  submission: RsvpSubmission,
  options?: { isAdminAction?: boolean }
): RsvpNotification {
  const confirmedNames = submission.familyMembers
    .filter((m) => getEffectiveMemberStatus(m) === "confirmado")
    .map((m) => m.name);
  const declinedNames = submission.familyMembers
    .filter((m) => getEffectiveMemberStatus(m) === "ausente")
    .map((m) => m.name);

  const normalizedSubmission: RsvpSubmission = normalizeRecordPhones({
    ...submission,
    phone: formatPhoneBR(submission.phone),
    answer: confirmedNames.length > 0 ? "sim" : "nao",
    declinedCount: declinedNames.length,
  });

  const notification: RsvpNotification = normalizeItemPhone({
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    invitationId: normalizedSubmission.invitationId,
    primaryName: normalizedSubmission.primaryName,
    phone: normalizedSubmission.phone,
    answer: normalizedSubmission.answer,
    idososCount: normalizedSubmission.idososCount,
    adultsCount: normalizedSubmission.adultsCount,
    adolescentesCount: normalizedSubmission.adolescentesCount,
    kidsCount: normalizedSubmission.kidsCount,
    bebesCount: normalizedSubmission.bebesCount,
    declinedCount: normalizedSubmission.declinedCount,
    confirmedNames,
    declinedNames,
    diet: normalizedSubmission.diet,
    message: normalizedSubmission.message,
    timestamp: normalizedSubmission.timestamp,
    readByNoivos: false,
    readByCerimonialista: false,
  });

  if (typeof window !== "undefined") {
    try {
      if (!options?.isAdminAction) {
        localStorage.setItem(STORAGE_SINGLE_RSVP_KEY, JSON.stringify(normalizedSubmission));
      }

      const currentAll = getAllRsvpSubmissions();
      const updatedAll = [
        normalizedSubmission,
        ...currentAll.filter((r) => r.invitationId !== normalizedSubmission.invitationId),
      ];
      localStorage.setItem(STORAGE_ALL_RSVPS_KEY, JSON.stringify(updatedAll));

      const currentNotifs = getRsvpNotifications();
      const updatedNotifs = [notification, ...currentNotifs].slice(0, 100);
      localStorage.setItem(STORAGE_NOTIFICATIONS_KEY, JSON.stringify(updatedNotifs));

      notifySyncListeners("rsvp_submitted", notification);

      fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission: normalizedSubmission, notification }),
      }).catch(() => {});
    } catch {}
  }

  return notification;
}

export function setAdminMemberOrFamilyAttendance(params: {
  family: GuestRecord;
  existingSubmission?: RsvpSubmission;
  memberName?: string;
  targetStatus: MemberAttendanceStatus;
}): RsvpSubmission {
  const { family, existingSubmission, memberName, targetStatus } = params;
  const targetClean = memberName ? cleanString(memberName) : null;
  const famPreDeclined = isPreDeclinedConfirmation(family.firstConfirmation);

  const baseList: ConfirmedFamilyMember[] =
    existingSubmission && existingSubmission.familyMembers?.length > 0
      ? existingSubmission.familyMembers.map((m) => ({
          ...m,
          type: normalizeGuestCategory(m.type),
          memberStatus: getEffectiveMemberStatus(m),
          confirmed: getEffectiveMemberStatus(m) === "confirmado",
        }))
      : getInvitationMembers(family).map((m, idx) => {
          const orig = family.familyMembers[idx];
          const origObj = orig && typeof orig !== "string" ? orig : undefined;
          const isDeclined = famPreDeclined || isPreDeclinedConfirmation(origObj?.firstConfirmation);
          const initStatus: MemberAttendanceStatus = isDeclined ? "ausente" : "aguardando";
          return {
            name: m.name,
            type: normalizeGuestCategory(m.type),
            phone: m.phone,
            confirmed: false,
            memberStatus: initStatus,
          };
        });

  const updatedMembers: ConfirmedFamilyMember[] = baseList.map((m) => {
    if (targetClean === null || cleanString(m.name) === targetClean) {
      return {
        ...m,
        confirmed: targetStatus === "confirmado",
        memberStatus: targetStatus,
      };
    }
    return m;
  });

  const going = updatedMembers.filter((m) => getEffectiveMemberStatus(m) === "confirmado");
  const absent = updatedMembers.filter((m) => getEffectiveMemberStatus(m) === "ausente");
  const bk = getBreakdownFromMembers(going);
  const nowStr =
    new Date().toLocaleDateString("pt-BR") +
    " " +
    new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const submission: RsvpSubmission = normalizeRecordPhones({
    invitationId: family.id,
    primaryName: family.primaryName,
    phone: formatPhoneBR(existingSubmission?.phone || family.phone || ""),
    answer: going.length > 0 ? "sim" : "nao",
    familyMembers: updatedMembers,
    idososCount: bk.idosos,
    adultsCount: bk.adultos,
    adolescentesCount: bk.adolescentes,
    kidsCount: bk.criancas,
    bebesCount: bk.bebes,
    declinedCount: absent.length,
    diet: existingSubmission?.diet || "",
    message: existingSubmission?.message || "",
    status: "confirmado_lista",
    timestamp: nowStr,
  });

  saveRsvpSubmission(submission, { isAdminAction: true });
  return submission;
}

const NOTIF_SEEN_KEY_PREFIX = "anita_giuseppe_demo_notif_seen_v1_";

function getSeenNotificationIds(role: "noivos" | "cerimonialista"): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(NOTIF_SEEN_KEY_PREFIX + role);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function getAllReadTimestamp(role: "noivos" | "cerimonialista"): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(NOTIF_SEEN_KEY_PREFIX + role + "_all_read_ts");
    const ts = raw ? Number(raw) : 0;
    return Number.isFinite(ts) ? ts : 0;
  } catch {
    return 0;
  }
}

function parseTimestampFromNotif(n: RsvpNotification): number {
  if (typeof n.id === "string" && n.id.startsWith("notif-")) {
    const parts = n.id.split("-");
    const num = Number(parts[1]);
    if (Number.isFinite(num) && num > 1600000000000) return num;
  }
  return 0;
}

export function applyNotificationReadState(notifs: RsvpNotification[]): RsvpNotification[] {
  if (typeof window === "undefined" || !Array.isArray(notifs)) return notifs;
  const seenNoivos = getSeenNotificationIds("noivos");
  const seenCerim = getSeenNotificationIds("cerimonialista");
  const allReadNoivosTs = getAllReadTimestamp("noivos");
  const allReadCerimTs = getAllReadTimestamp("cerimonialista");

  return notifs.map((n) => {
    const nTs = parseTimestampFromNotif(n);
    const readNoivos =
      Boolean(n.readByNoivos) ||
      seenNoivos.has(String(n.id)) ||
      (allReadNoivosTs > 0 && nTs > 0 && nTs <= allReadNoivosTs);

    const readCerim =
      Boolean(n.readByCerimonialista) ||
      seenCerim.has(String(n.id)) ||
      (allReadCerimTs > 0 && nTs > 0 && nTs <= allReadCerimTs);

    return {
      ...n,
      readByNoivos: readNoivos,
      readByCerimonialista: readCerim,
    };
  });
}

export function markNotificationsAsRead(
  role: "noivos" | "cerimonialista",
  visibleNotifications?: RsvpNotification[]
): void {
  if (typeof window === "undefined") return;
  try {
    const current = getRsvpNotifications();
    const allIds = new Set<string>(getSeenNotificationIds(role));

    current.forEach((n) => allIds.add(String(n.id)));
    (visibleNotifications || []).forEach((n) => allIds.add(String(n.id)));
    INITIAL_NOTIFICATIONS.forEach((n) => allIds.add(String(n.id)));

    const idsArr = Array.from(allIds).slice(-1000);
    localStorage.setItem(NOTIF_SEEN_KEY_PREFIX + role, JSON.stringify(idsArr));
    localStorage.setItem(NOTIF_SEEN_KEY_PREFIX + role + "_all_read_ts", String(Date.now()));

    const updated = current.map((n) =>
      role === "noivos" ? { ...n, readByNoivos: true } : { ...n, readByCerimonialista: true }
    );
    localStorage.setItem(STORAGE_NOTIFICATIONS_KEY, JSON.stringify(updated));
    notifySyncListeners("notifications_read");

    fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read", role }),
    }).catch(() => {});
  } catch {}
}

export function markSingleNotificationAsRead(
  role: "noivos" | "cerimonialista",
  notificationId: string
): void {
  if (typeof window === "undefined" || !notificationId) return;
  try {
    const allIds = new Set<string>(getSeenNotificationIds(role));
    allIds.add(String(notificationId));
    localStorage.setItem(NOTIF_SEEN_KEY_PREFIX + role, JSON.stringify(Array.from(allIds).slice(-1000)));

    const current = getRsvpNotifications();
    const updated = current.map((n) => {
      if (String(n.id) !== String(notificationId)) return n;
      return role === "noivos" ? { ...n, readByNoivos: true } : { ...n, readByCerimonialista: true };
    });
    localStorage.setItem(STORAGE_NOTIFICATIONS_KEY, JSON.stringify(updated));
    notifySyncListeners("notifications_read");

    fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read", role, notificationId }),
    }).catch(() => {});
  } catch {}
}

export const INITIAL_SONG_SUGGESTIONS: SongSuggestion[] = [
  {
    id: "song-demo-1",
    title: "La Vie En Rose (Violino & Piano)",
    artist: "Edith Piaf · Instrumental",
    link: "https://www.youtube.com/watch?v=Ptk_1Dc2iPY",
    date: "14/08/2027 15:20",
  },
  {
    id: "song-demo-2",
    title: "All of Me (Acústico)",
    artist: "John Legend",
    date: "15/08/2027 11:05",
  },
];

export function getSongSuggestions(): SongSuggestion[] {
  if (typeof window === "undefined") return INITIAL_SONG_SUGGESTIONS;
  try {
    const raw = localStorage.getItem(STORAGE_SONG_SUGGESTIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SongSuggestion[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_SONG_SUGGESTIONS;
}

export function saveSongSuggestion(item: Omit<SongSuggestion, "id" | "date">): SongSuggestion {
  const newItem: SongSuggestion = {
    id: `song-${Date.now()}`,
    title: item.title.trim(),
    artist: item.artist?.trim() || undefined,
    link: item.link?.trim() || undefined,
    date:
      new Date().toLocaleDateString("pt-BR") +
      " " +
      new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };

  if (typeof window !== "undefined") {
    try {
      const current = getSongSuggestions();
      const updated = [newItem, ...current.filter((s) => s.id !== newItem.id)];
      localStorage.setItem(STORAGE_SONG_SUGGESTIONS_KEY, JSON.stringify(updated));
      notifySyncListeners("song_suggested");
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songs: updated,
          logEntry: {
            action: "rsvp_confirmado",
            actor: "Sugestão de Convidado",
            summary: `Sugeriu música: ${newItem.title}${newItem.artist ? ` — ${newItem.artist}` : ""}`,
            payload: newItem,
          },
        }),
      }).catch(() => {});
    } catch {}
  }
  return newItem;
}

export function formatWhatsAppPhone(phone?: string): string {
  if (!phone) return "";
  return toWhatsAppNumber(phone);
}

export interface PlannerContactInfo {
  name: string;
  phone: string;
}

export const DEFAULT_PLANNER_CONTACT: PlannerContactInfo = {
  name: "Camila Vasconcelos",
  phone: "(24) 99900-2027",
};

export function getStoredPlannerContact(): PlannerContactInfo {
  if (typeof window === "undefined") return DEFAULT_PLANNER_CONTACT;
  try {
    const raw = localStorage.getItem("anita_giuseppe_demo_planner_contact_v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          name: typeof parsed.name === "string" ? parsed.name.trim() : DEFAULT_PLANNER_CONTACT.name,
          phone:
            typeof parsed.phone === "string" && parsed.phone.trim()
              ? formatPhoneBR(parsed.phone)
              : DEFAULT_PLANNER_CONTACT.phone,
        };
      }
    }
  } catch {}
  return DEFAULT_PLANNER_CONTACT;
}

export function saveStoredPlannerContact(info: PlannerContactInfo): void {
  if (typeof window === "undefined") return;
  try {
    const clean: PlannerContactInfo = {
      name: (info.name || "").trim().slice(0, 100),
      phone: formatPhoneBR(info.phone || "") || DEFAULT_PLANNER_CONTACT.phone,
    };
    localStorage.setItem("anita_giuseppe_demo_planner_contact_v1", JSON.stringify(clean));
    notifySyncListeners("planner_contact_updated", clean);
    fetch("/api/admin-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_planner_contact", contact: clean }),
    }).catch(() => {});
  } catch {}
}

export function formatPlannerContactMention(contact?: Partial<PlannerContactInfo>): string {
  const current = {
    ...getStoredPlannerContact(),
    ...(contact || {}),
  };
  const name = (current.name || "").trim();
  const phone = (current.phone || "").trim() || DEFAULT_PLANNER_CONTACT.phone;

  if (name) {
    return ` (*${name}*) pelo WhatsApp *${phone}*`;
  }
  return ` pelo WhatsApp *${phone}*`;
}

export function getDemoSiteOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "https://casamento-anita-giuseppe-demo.vercel.app";
}

export const WEDDING_SITE_URL = "https://casamento-anita-giuseppe-demo.vercel.app/";

export function getWhatsAppRsvpReminderLink(
  guest: GuestRecord,
  plannerOverride?: Partial<PlannerContactInfo>
): string {
  const formattedPhone = formatWhatsAppPhone(guest.phone);
  if (!formattedPhone) return "";
  const rawDigits = (guest.phone || "").replace(/\D/g, "");
  const inviteUrl = `${getDemoSiteOrigin()}/?page=2&nome=${encodeURIComponent(
    guest.primaryName
  )}&tel=${encodeURIComponent(rawDigits)}`;
  const membersList = guest.familyMembers.map((m) => (typeof m === "string" ? m : m.name));
  const memberNames = membersList.join(", ");
  const isSingle = membersList.length <= 1;
  const plannerText = formatPlannerContactMention(plannerOverride);

  const text = isSingle
    ? `Olá, ${guest.primaryName}! Tudo bem com você? 🤍✨\n\nAqui é a *Anita e o Giuseppe*! Estamos preparando com muito carinho nosso casamento no dia *18 de setembro de 2027 (sábado)*, na Villa Imperial das Hortênsias, em Petrópolis/RJ.\n\nPara organizarmos a recepção e o buffet, viemos te lembrar de confirmar sua presença até *10/08* pelo link com seu convite já aberto:\n👉 ${inviteUrl}\n\nQualquer dúvida, fale com nossa cerimonialista${plannerText}!\n\nCom carinho,\n*Anita & Giuseppe* ❤️`
    : `Olá, ${guest.primaryName} e família! Tudo bem com vocês? 🤍✨\n\nAqui é a *Anita e o Giuseppe*! Estamos preparando com muito carinho nosso casamento no dia *18 de setembro de 2027 (sábado)*, na Villa Imperial das Hortênsias, em Petrópolis/RJ.\n\nViemos lembrar vocês de confirmarem a presença da família (${memberNames}) até *10/08* pelo link exclusivo de vocês:\n👉 ${inviteUrl}\n\nQualquer dúvida, falem com nossa cerimonialista${plannerText}!\n\nCom carinho,\n*Anita & Giuseppe* ❤️`;

  return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(text)}`;
}

function getGuestGreetingParts(guest: GuestRecord) {
  const membersList = guest.familyMembers.map((m) => (typeof m === "string" ? m : m.name));
  const isSingle = membersList.length <= 1;
  const firstName = (guest.primaryName || "").trim().split(" ")[0] || guest.primaryName;
  return { isSingle, firstName, memberNames: membersList.join(", ") };
}

export function getWhatsAppSaveTheDateLink(
  guest: GuestRecord,
  plannerOverride?: Partial<PlannerContactInfo>
): string {
  const formattedPhone = formatWhatsAppPhone(guest.phone);
  if (!formattedPhone) return "";
  const { isSingle, firstName, memberNames } = getGuestGreetingParts(guest);
  const plannerText = formatPlannerContactMention(plannerOverride);
  const siteUrl = `${getDemoSiteOrigin()}/`;

  const text = isSingle
    ? `Olá, ${firstName}! Tudo bem? 🤍✨\n\nAqui é a *Anita e o Giuseppe*! Reserve esta data especial:\n\n💍 *Casamento Anita & Giuseppe*\n📅 *Sábado, 18 de setembro de 2027*\n⏰ *19h30*\n📍 *Villa Imperial das Hortênsias* — Petrópolis/RJ\n\nVocê pretende estar conosco nesse dia? Responda *SIM* ou *NÃO*! Acesse também nosso convite digital:\n👉 ${siteUrl}\n\nQualquer dúvida, nossa cerimonialista${plannerText} está à disposição.\n\nCom carinho,\n*Anita & Giuseppe* ❤️`
    : `Olá, ${firstName} e família! Tudo bem? 🤍✨\n\nAqui é a *Anita e o Giuseppe*! Reservem esta data especial:\n\n💍 *Casamento Anita & Giuseppe*\n📅 *Sábado, 18 de setembro de 2027*\n⏰ *19h30*\n📍 *Villa Imperial das Hortênsias* — Petrópolis/RJ\n\nGostaríamos da pré-confirmação de vocês (${memberNames}): pretendem celebrar conosco? Respondam *SIM* ou *NÃO*!\n👉 ${siteUrl}\n\nQualquer dúvida, falem com nossa cerimonialista${plannerText}.\n\nCom carinho,\n*Anita & Giuseppe* ❤️`;

  return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(text)}`;
}

export function getWhatsAppInvitationLink(
  guest: GuestRecord,
  plannerOverride?: Partial<PlannerContactInfo>
): string {
  const formattedPhone = formatWhatsAppPhone(guest.phone);
  if (!formattedPhone) return "";
  const { isSingle, firstName } = getGuestGreetingParts(guest);
  const plannerText = formatPlannerContactMention(plannerOverride);
  const siteUrl = `${getDemoSiteOrigin()}/`;

  const text = isSingle
    ? `Olá, ${firstName}! 🤍✨\n\nCom imensa alegria, *Anita & Giuseppe* convidam você para a celebração do nosso casamento! 💍\n\n📅 *Sábado, 18 de setembro de 2027*\n⏰ *19h30*\n📍 *Villa Imperial das Hortênsias* — Petrópolis/RJ\n\nAcesse nosso convite interativo com todos os detalhes (local, dress code, presentes e RSVP):\n👉 ${siteUrl}\n\nPedimos que confirme sua presença pelo site até *10/08*.\n\nDúvidas? Fale com nossa cerimonialista${plannerText}.\n\nCom carinho,\n*Anita & Giuseppe* ❤️`
    : `Olá, ${firstName} e família! 🤍✨\n\nCom imensa alegria, *Anita & Giuseppe* convidam vocês para a celebração do nosso casamento! 💍\n\n📅 *Sábado, 18 de setembro de 2027*\n⏰ *19h30*\n📍 *Villa Imperial das Hortênsias* — Petrópolis/RJ\n\nAcessem nosso convite interativo com todos os detalhes:\n👉 ${siteUrl}\n\nConfirmem a presença da família pelo site até *10/08*.\n\nDúvidas? Falem com nossa cerimonialista${plannerText}.\n\nCom carinho,\n*Anita & Giuseppe* ❤️`;

  return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(text)}`;
}

export function notifySyncListeners(type: string, payload?: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent("anita_giuseppe_demo_sync", { detail: { type, payload } }));
    if ("BroadcastChannel" in window) {
      const bc = new BroadcastChannel(SYNC_CHANNEL_NAME);
      bc.postMessage({ type, payload });
      bc.close();
    }
  } catch {}
}

export function subscribeToWeddingSync(
  onUpdate: (event: { type: string; payload?: unknown }) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleCustom = (e: Event) => {
    const ce = e as CustomEvent<{ type: string; payload?: unknown }>;
    onUpdate(ce.detail || { type: "custom" });
  };

  const handleStorage = (e: StorageEvent) => {
    if (
      e.key === STORAGE_ALL_RSVPS_KEY ||
      e.key === STORAGE_NOTIFICATIONS_KEY ||
      e.key === STORAGE_CUSTOM_GUESTS_KEY ||
      e.key === STORAGE_SONG_SUGGESTIONS_KEY ||
      e.key === STORAGE_GIFTS_KEY
    ) {
      onUpdate({ type: "storage_change" });
    }
  };

  window.addEventListener("anita_giuseppe_demo_sync", handleCustom);
  window.addEventListener("storage", handleStorage);

  let bc: BroadcastChannel | null = null;
  if ("BroadcastChannel" in window) {
    try {
      bc = new BroadcastChannel(SYNC_CHANNEL_NAME);
      bc.onmessage = (msg) => {
        onUpdate(msg.data || { type: "broadcast" });
      };
    } catch {
      bc = null;
    }
  }

  return () => {
    window.removeEventListener("anita_giuseppe_demo_sync", handleCustom);
    window.removeEventListener("storage", handleStorage);
    if (bc) bc.close();
  };
}

export function parseGuestListText(rawText: string): GuestRecord[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#") && !l.toLowerCase().startsWith("chefe;"));

  const existing = getOfficialGuestList();
  const parsed: GuestRecord[] = [];

  lines.forEach((line, idx) => {
    const sep = line.includes(";") ? ";" : line.includes("\t") ? "\t" : line.includes("|") ? "|" : ",";
    const cols = line.split(sep).map((c) => c.trim()).filter(Boolean);
    if (cols.length === 0) return;

    const primaryName = cols[0];
    let phone = "";
    const membersRaw: string[] = [];
    let group: GuestRecord["group"] = "Amigos";

    for (let i = 1; i < cols.length; i++) {
      const digits = cols[i].replace(/\D/g, "");
      if (digits.length >= 8 && !phone) {
        phone = cols[i];
      } else if (
        cols[i].toLowerCase().includes("noiva") ||
        cols[i].toLowerCase().includes("noivo") ||
        cols[i].toLowerCase().includes("padrinho") ||
        cols[i].toLowerCase().includes("amigo")
      ) {
        const gLower = cols[i].toLowerCase();
        if (gLower.includes("noiva")) group = "Família da Noiva";
        else if (gLower.includes("noivo")) group = "Família do Noivo";
        else group = "Amigos";
      } else {
        membersRaw.push(...cols[i].split(",").map((m) => m.trim()).filter(Boolean));
      }
    }

    const allMemberNames = Array.from(new Set([primaryName, ...membersRaw]));
    const familyMembers: GuestMember[] = allMemberNames.map((m) => {
      const cat = normalizeGuestCategory(m);
      return {
        name: m
          .replace(/\((idoso|60\+|adolescente|jovem|crian[cç]a|beb[eê])\)/gi, "")
          .trim(),
        type: cat,
      };
    });

    parsed.push({
      id: `fam-imp-${Date.now()}-${existing.length + idx + 1}`,
      primaryName,
      familySurname: extractSurname(primaryName),
      phone: phone || "(24) 99999-0000",
      familyMembers,
      maxGuests: Math.max(familyMembers.length + 1, 2),
      group,
      mesaId: null,
    });
  });

  return parsed;
}

export type GiftType = "pix_cota" | "pix_avulso" | "lista_amazon" | "presente_fisico";

export interface GiftContribution {
  id: string;
  guestName: string;
  phone?: string;
  type: GiftType;
  cotaId?: string;
  giftTitle: string;
  amount?: number;
  message?: string;
  confirmedAtBank: boolean;
  thanked: boolean;
  date: string;
}

// Presentes pré-carregados para o Painel Financeiro da Demo já mostrar dados reais de demonstração!
export const INITIAL_GIFT_CONTRIBUTIONS: GiftContribution[] = [
  {
    id: "gift-demo-1",
    guestName: "Mariana Vasconcelos",
    phone: "(24) 99733-4001",
    type: "pix_cota",
    cotaId: "paris",
    giftTitle: "Jantar Romântico na Lua de Mel",
    amount: 300,
    message: "Aproveitem muito a lua de mel! Com carinho dos padrinhos.",
    confirmedAtBank: true,
    thanked: true,
    date: "12/08/2027 10:15",
  },
  {
    id: "gift-demo-2",
    guestName: "Bento Alencar",
    phone: "(21) 99644-5001",
    type: "pix_cota",
    cotaId: "cozinha",
    giftTitle: "Nossa Cozinha Gourmet",
    amount: 200,
    message: "Que o novo lar tenha sempre mesa farta e alegria!",
    confirmedAtBank: true,
    thanked: false,
    date: "13/08/2027 17:00",
  },
  {
    id: "gift-demo-3",
    guestName: "Heitor Montenegro",
    phone: "(11) 99555-6001",
    type: "pix_avulso",
    giftTitle: "Contribuição Livre via Pix",
    amount: 500,
    message: "Um abraço carinhoso para o casal histórico!",
    confirmedAtBank: true,
    thanked: false,
    date: "14/08/2027 12:30",
  },
  {
    id: "gift-demo-4",
    guestName: "Eduardo Cavalcanti",
    phone: "(21) 99466-7001",
    type: "lista_amazon",
    giftTitle: "Aparelho de Jantar 30 Peças Porcelana Off-White",
    amount: 380,
    message: "Comprado pela lista com entrega programada para vocês.",
    confirmedAtBank: false,
    thanked: false,
    date: "14/08/2027 19:10",
  },
];

export function getGiftContributions(): GiftContribution[] {
  if (typeof window === "undefined") return INITIAL_GIFT_CONTRIBUTIONS;
  try {
    const raw = localStorage.getItem(STORAGE_GIFTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((g: GiftContribution) => normalizeItemPhone(g));
      }
    }
  } catch {}
  return INITIAL_GIFT_CONTRIBUTIONS.map((g) => normalizeItemPhone(g));
}

export function saveGiftContributions(gifts: GiftContribution[]): void {
  if (typeof window === "undefined") return;
  try {
    const normalized = gifts.map((g) => normalizeItemPhone(g));
    localStorage.setItem(STORAGE_GIFTS_KEY, JSON.stringify(normalized));
    notifySyncListeners("gift_updated");
  } catch {}
}

export function addGiftContribution(
  data: Omit<GiftContribution, "id" | "date"> & { date?: string }
): GiftContribution {
  const current = getGiftContributions();
  const dateStr =
    data.date ||
    new Date().toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  const newItem: GiftContribution = normalizeItemPhone({
    ...data,
    id: `gift-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    date: dateStr,
  });
  const updated = [newItem, ...current];
  saveGiftContributions(updated);
  notifySyncListeners("gift_submitted", newItem);

  if (typeof window !== "undefined") {
    fetch("/api/gifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", gift: newItem }),
    }).catch(() => {});
  }

  return newItem;
}

export function updateGiftContribution(id: string, patch: Partial<GiftContribution>): void {
  const current = getGiftContributions();
  const updated = current.map((g) => (g.id === id ? { ...g, ...patch } : g));
  saveGiftContributions(updated);

  if (typeof window !== "undefined") {
    fetch("/api/gifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id, patch }),
    }).catch(() => {});
  }
}

export function deleteGiftContribution(id: string): void {
  const current = getGiftContributions();
  const updated = current.filter((g) => g.id !== id);
  saveGiftContributions(updated);

  if (typeof window !== "undefined") {
    fetch("/api/gifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    }).catch(() => {});
  }
}

export { phoneMatchesQuery };
