"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import {
  Bell,
  Check,
  X,
  Plus,
  Trash2,
  Edit3,
  Clock,
  Phone,
  Users,
  CheckCircle2,
  Volume2,
  AlertCircle,
  MessageCircle,
  RotateCcw,
  Sparkles,
  PieChart,
  BarChart3,
  Utensils,
  ArrowRight,
  TrendingUp,
  UserCheck,
  GripVertical,
  Move,
  Search as SearchIcon,
  Lock,
  FileText,
} from "lucide-react";
import { AdminLink, AdminShell, Panel, Stat, Table, adminBtn, adminBtnPrimary } from "@/components/Admin";
import PageCoverIntro from "@/components/PageCoverIntro";
import GuestCategoryEditorModal from "@/components/GuestCategoryEditorModal";
import ManualRsvpModal from "@/components/ManualRsvpModal";
import ReportsCenter from "@/components/ReportsCenter";
import { escHtml, type ReportAssignmentMap } from "@/lib/reportGenerators";
import { scanAndRestoreLocalBackups } from "@/lib/recoveryHelper";
import { formatPhoneBR, phoneMatchesQuery } from "@/lib/phone";
import {
  getAllRsvpSubmissions,
  getOfficialGuestList,
  getRsvpNotifications,
  markNotificationsAsRead,
  markSingleNotificationAsRead,
  subscribeToWeddingSync,
  GUEST_CATEGORIES,
  normalizeGuestCategory,
  formatCategoryBreakdown,
  getBreakdownFromMembers,
  updatePersonCategory,
  getCategoryOverrides,
  applyCategoryOverridesToRecords,
  applyCategoryOverridesToSubmissions,
  getWhatsAppRsvpReminderLink,
  getWhatsAppSaveTheDateLink,
  getWhatsAppInvitationLink,
  applyNotificationReadState,
  getEffectiveMemberStatus,
  isPreDeclinedConfirmation,
  buildPreDeclinedSubmissionFromGuest,
  computeUnifiedRsvpStats,
  setAdminMemberOrFamilyAttendance,
  cleanString,
  type GuestCategory,
  type GuestRecord,
  type MemberAttendanceStatus,
  type RsvpNotification,
  type RsvpSubmission,
} from "@/lib/guestList";

// Tipos Principais
export type MesaItem = {
  id: number;
  nome: string;
  capacidade: number;
  setor?: string;
};

export type FornecedorItem = {
  id: string;
  nome: string;
  servico: string;
  contato: string;
};

export type RoteiroItem = {
  id: string;
  hora: string;
  titulo: string;
  desc: string;
  status: "pendente" | "andamento" | "concluido";
};

export type ChecklistItem = {
  id: string;
  item: string;
  categoria?: string;
  done: boolean;
};

type GuestRow = {
  id: string;
  nome: string;
  chefeFamilia: string;
  familia: string;
  telefone: string;
  mesaId: number | null;
  checkIn: boolean;
  rsvpStatus: "confirmado" | "ausente" | "aguardando";
  primeiraConfirmacao?: "OK" | "PENDENTE" | "?" | "" | string;
  restricoes: string;
  tipo: GuestCategory;
};

// Dados Padrão Iniciais (Atualizados conforme solicitado)
const DEFAULT_MESAS: MesaItem[] = [
  { id: 1, nome: "Mesa 01 · Família da Noiva", capacidade: 10, setor: "Frente Esquerda" },
  { id: 2, nome: "Mesa 02 · Família do Noivo", capacidade: 10, setor: "Frente Direita" },
  { id: 3, nome: "Mesa 03 · Amigos dos Noivos", capacidade: 10, setor: "Centro" },
  { id: 4, nome: "Mesa 04 · Amigos", capacidade: 12, setor: "Lateral" },
];

const DEFAULT_FORNECEDORES: FornecedorItem[] = [
  {
    id: "f-0",
    nome: "Luana Carvalho",
    servico: "Cerimonial & Assessoria Oficial do Casamento",
    contato: "(47) 98855-1243",
  },
  {
    id: "f-1",
    nome: "Buffet & Gastronomia Villa Imperial",
    servico: "Restaurante, Gastronomia & Buffet Completo",
    contato: "(47) 99911-1711",
  },
  {
    id: "f-2",
    nome: "JoyFilmes",
    servico: "Foto & Vídeo Oficial",
    contato: "(47) 99275-1421",
  },
  {
    id: "f-3",
    nome: "Claudete",
    servico: "Decoração & Ambientação",
    contato: "(47) 99137-5134",
  },
  {
    id: "f-1792636997841",
    nome: "Mariana Behrmann Confeitaria",
    servico: "Bolos e Doces Finos",
    contato: "(71) 99665-3156",
  },
];

const DEFAULT_ROTEIRO: RoteiroItem[] = [
  {
    id: "r-1",
    hora: "19:30",
    titulo: "Abertura e Início da Recepção para a Cerimônia (Culto)",
    desc: "Abertura das portas e recepção dos convidados para a parte onde será realizada a cerimônia (Culto). Música suave e acolhimento.",
    status: "pendente",
  },
  {
    id: "r-2",
    hora: "20:15",
    titulo: "Início da Cerimônia (Cerimônia de Casamento de Anita & Giuseppe)",
    desc: "Entrada triunfal do cortejo de amigos, pais, noivo e entrada da noiva. Louvores oficiais, leitura da Palavra pastoral, votos, alianças e oração sacerdotal.",
    status: "pendente",
  },
  {
    id: "r-3",
    hora: "21:15",
    titulo: "Início da Recepção e da Festa (Jantar e tudo mais)",
    desc: "Abertura do buffet e banquete preparado pela Villa Imperial, celebração no salão nobre e fotos com famílias e amigos.",
    status: "pendente",
  },
  {
    id: "r-4",
    hora: "23:59",
    titulo: "Término da Celebração",
    desc: "Encerramento das bênçãos, agradecimento aos presentes e despedida dos noivos.",
    status: "pendente",
  },
];

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: "c-1", item: "Testar instrumentos, som e microfones dos noivos, pastor e equipe de louvor", categoria: "Som & Louvor", done: false },
  { id: "c-2", item: "Briefing e alinhamento de posicionamento com JoyFilmes (Foto & Vídeo: 47 9275-1421)", categoria: "Foto & Vídeo", done: false },
  { id: "c-3", item: "Recepção e conferência da decoração com Claudete (astromélias, mesa e ambientação: 47 9137-5134)", categoria: "Decoração", done: false },
  { id: "c-4", item: "Alinhamento da ordem de entrada do cortejo de amigos, pais e noivos", categoria: "Cerimônia", done: false },
  { id: "c-5", item: "Conferência da entrega e temperatura do buffet e banquete com a equipe do Buffet Villa Imperial (24 99881-2027)", categoria: "Buffet", done: false },
  { id: "c-6", item: "Recebimento, posicionamento e conferência do bolo e doces finos", categoria: "Buffet", done: false },
  { id: "c-7", item: "Recepção e orientação dos convidados na entrada do salão (19h30)", categoria: "Recepção", done: false },
  { id: "c-8", item: "Água, lenços e suporte aos noivos na antessala antes do início do culto (20h15)", categoria: "Noivos", done: false },
  { id: "c-9", item: "Conferência das alianças com os noivos antes do início do cortejo", categoria: "Cerimônia", done: false },
  { id: "c-10", item: "Verificação da climatização e iluminação do salão antes da entrada dos noivos", categoria: "Espaço", done: false },
  { id: "c-11", item: "Acompanhamento do término da recepção e liberação de fornecedores (23h59)", categoria: "Encerramento", done: false },
];

const TABS = [
  { key: "geral", label: "Visão Geral & Dashboard" },
  { key: "checkin", label: "Check-in & Presença" },
  { key: "mesas", label: "Mapa das Mesas" },
  { key: "fornecedores", label: "Fornecedores" },
  { key: "roteiro", label: "Roteiro" },
  { key: "checklist", label: "Checklist do Dia" },
  { key: "relatorios", label: "Relatórios & PDF" },
] as const;

type Tab = (typeof TABS)[number]["key"];

// Sintetizador de Som de Notificação com Web Audio API
export function playNotificationChime(isPositive = true) {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "sine";

    if (isPositive) {
      // Tom de confirmação brilhante e acolhedor (Mi5 -> Dó6)
      osc1.frequency.setValueAtTime(659.25, now);
      osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 0.12);
      osc2.frequency.setValueAtTime(987.77, now);
      osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.12);
    } else {
      // Tom suave para comunicação de ausência
      osc1.frequency.setValueAtTime(659.25, now);
      osc1.frequency.exponentialRampToValueAtTime(523.25, now + 0.15);
      osc2.frequency.setValueAtTime(880.0, now);
      osc2.frequency.exponentialRampToValueAtTime(659.25, now + 0.15);
    }

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.86);
    osc2.stop(now + 0.86);
  } catch {
    // ignore
  }
}

function buildGuestRows(official: GuestRecord[], submissions: RsvpSubmission[]): GuestRow[] {
  const subMap = new Map<string, RsvpSubmission>();
  submissions.forEach((s) => subMap.set(s.invitationId, s));

  // Ordena as famílias alfabeticamente para que a lista base já fique agrupada por família
  const sortedOfficial = [...official].sort((a, b) => {
    const famA = (a.familySurname || a.primaryName || "").trim().toLowerCase();
    const famB = (b.familySurname || b.primaryName || "").trim().toLowerCase();
    const cmp = famA.localeCompare(famB, "pt-BR");
    if (cmp !== 0) return cmp;
    return a.primaryName.localeCompare(b.primaryName, "pt-BR");
  });

  const rows: GuestRow[] = [];

  sortedOfficial.forEach((fam) => {
    const sub = subMap.get(fam.id);
    if (sub && Array.isArray(sub.familyMembers) && sub.familyMembers.length > 0) {
      sub.familyMembers.forEach((m, idx) => {
        const origMember = fam.familyMembers[idx];
        const origObj = origMember && typeof origMember !== "string" ? origMember : undefined;
        const memberPhone = m.phone || origObj?.phone || sub.phone || fam.phone;
        const st = getEffectiveMemberStatus(m);
        rows.push({
          id: `${fam.id}-${idx}`,
          nome: m.name,
          chefeFamilia: origObj?.chefeFamilia || fam.primaryName,
          familia: origObj?.familia || fam.familySurname || fam.primaryName,
          telefone: formatPhoneBR(memberPhone),
          mesaId: st === "ausente" ? null : (fam.mesaId ?? null),
          checkIn: false,
          rsvpStatus: st,
          primeiraConfirmacao: origObj?.firstConfirmation ?? fam.firstConfirmation,
          restricoes:
            st === "confirmado"
              ? sub.message || origObj?.plannerNotes || "Confirmado"
              : st === "ausente"
              ? sub.message || origObj?.plannerNotes || "Comunicou ausência"
              : origObj?.plannerNotes || fam.plannerNotes || "Aguardando RSVP no site",
          tipo: normalizeGuestCategory(m.type),
        });
      });
    } else {
      const famPreDeclined = isPreDeclinedConfirmation(fam.firstConfirmation);
      fam.familyMembers.forEach((m, idx) => {
        const origObj = typeof m !== "string" ? m : undefined;
        const name = typeof m === "string" ? m : m.name;
        const type = typeof m === "string" ? "adulto" : normalizeGuestCategory(m.type);
        const memberPhone = origObj?.phone ?? fam.phone;
        const isDeclined = famPreDeclined || isPreDeclinedConfirmation(origObj?.firstConfirmation);
        rows.push({
          id: `${fam.id}-${idx}`,
          nome: name,
          chefeFamilia: origObj?.chefeFamilia || fam.primaryName,
          familia: origObj?.familia || fam.familySurname || fam.primaryName,
          telefone: formatPhoneBR(memberPhone),
          mesaId: isDeclined ? null : (fam.mesaId ?? null),
          checkIn: false,
          rsvpStatus: isDeclined ? "ausente" : "aguardando",
          primeiraConfirmacao: origObj?.firstConfirmation ?? fam.firstConfirmation,
          restricoes: isDeclined
            ? origObj?.plannerNotes || fam.plannerNotes || "Comunicou ausência (Lista Oficial)"
            : origObj?.plannerNotes || fam.plannerNotes || "Aguardando RSVP no site",
          tipo: type,
        });
      });
    }
  });

  return rows;
}

let globalActiveDragGuestId: string | null = null;

export default function PainelCerimonialistaPage() {
  const [hasEntered, setHasEntered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tab, setTab] = useState<Tab>("geral");
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [submissions, setSubmissions] = useState<RsvpSubmission[]>([]);
  const [officialGuests, setOfficialGuests] = useState<GuestRecord[]>([]);
  const [notifications, setNotifications] = useState<RsvpNotification[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [liveToast, setLiveToast] = useState<RsvpNotification | null>(null);
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [tablePickerMesa, setTablePickerMesa] = useState<MesaItem | null>(null);
  const [tablePickerSearch, setTablePickerSearch] = useState("");
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [manualRsvpOpen, setManualRsvpOpen] = useState(false);
  const [manualRsvpGuest, setManualRsvpGuest] = useState<GuestRecord | null>(null);
  const [manualRsvpMode, setManualRsvpMode] = useState<"confirm" | "decline">("confirm");

  // Estados Interativos Persistidos
  const [mesas, setMesas] = useState<MesaItem[]>(DEFAULT_MESAS);
  const [fornecedores, setFornecedores] = useState<FornecedorItem[]>(DEFAULT_FORNECEDORES);
  const [roteiro, setRoteiro] = useState<RoteiroItem[]>(DEFAULT_ROTEIRO);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST);

  const cerimonialAssignments = useMemo<ReportAssignmentMap>(() => {
    const map: ReportAssignmentMap = {};
    guests.forEach((g) => {
      map[g.id] = { checkIn: g.checkIn, mesaId: g.mesaId, tipo: g.tipo };
    });
    return map;
  }, [guests]);

  // Estados de Modais de Criação/Edição
  const [editingMesa, setEditingMesa] = useState<MesaItem | null>(null);
  const [newMesaOpen, setNewMesaOpen] = useState(false);
  const [mesaForm, setMesaForm] = useState({ nome: "", capacidade: 10, setor: "" });

  const [editingFornecedor, setEditingFornecedor] = useState<FornecedorItem | null>(null);
  const [fornecedorModalOpen, setFornecedorModalOpen] = useState(false);
  const [fornecedorForm, setFornecedorForm] = useState({ nome: "", servico: "", contato: "" });

  const [editingRoteiro, setEditingRoteiro] = useState<RoteiroItem | null>(null);
  const [roteiroModalOpen, setRoteiroModalOpen] = useState(false);
  const [roteiroForm, setRoteiroForm] = useState({ hora: "20:00", titulo: "", desc: "" });

  const [newChecklistText, setNewChecklistText] = useState("");
  const [newChecklistCat, setNewChecklistCat] = useState("Buffet");
  const [checklistFilter, setChecklistFilter] = useState("Todas");
  const [checklistStatusFilter, setChecklistStatusFilter] = useState<"todas" | "pendentes" | "concluidas">("todas");
  const [checklistSearch, setChecklistSearch] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "confirmado" | "ausente" | "aguardando">("todos");
  const [categoryFilter, setCategoryFilter] = useState<"todas" | GuestCategory>("todas");
  const [checkinSort, setCheckinSort] = useState<"familia" | "nome" | "mesa">("familia");

  // Estados para Drag & Drop e Sidebar Lateral de Mesas
  const draggedGuestIdRef = useRef<string | null>(null);
  const [draggingGuestId, setDraggingGuestId] = useState<string | null>(null);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [dragOverMesaId, setDragOverMesaId] = useState<number | null>(null);
  const [dragOverSidebar, setDragOverSidebar] = useState(false);
  const [mesaSidebarSearch, setMesaSidebarSearch] = useState("");
  const [mesaSidebarFilter, setMesaSidebarFilter] = useState<"todos" | "confirmados" | "aguardando">("todos");

  // Carregar dados salvos e sincronizar
  const loadAll = () => {
    const official = getOfficialGuestList();
    const subs = getAllRsvpSubmissions();
    setOfficialGuests(official);
    setSubmissions(subs);
    setNotifications(getRsvpNotifications());

    // Carregar mesas salvas
    try {
      const storedMesas = localStorage.getItem("anita_giuseppe_demo_cerimonialista_mesas_v2");
      if (storedMesas) setMesas(JSON.parse(storedMesas));
    } catch {
      // ignore
    }

    // Carregar fornecedores salvos
    try {
      const storedForn = localStorage.getItem("anita_giuseppe_demo_fornecedores_v2");
      if (storedForn) {
        const parsed = JSON.parse(storedForn) as FornecedorItem[];
        if (Array.isArray(parsed)) {
          // Atualiza telefone do Buffet Villa Imperial se ainda estiver o número antigo
          const updated = parsed.map((f) =>
            f.nome.includes("Villa Imperial")
              ? {
                  ...f,
                  nome: "Buffet & Gastronomia Villa Imperial",
                  contato: "(47) 99911-1711",
                  servico: "Restaurante, Gastronomia & Buffet Completo",
                }
              : f
          );
          setFornecedores(updated);
          localStorage.setItem("anita_giuseppe_demo_fornecedores_v2", JSON.stringify(updated));
        }
      }
    } catch {
      // ignore
    }

    // Carregar roteiro salvo
    try {
      const storedRoteiro = localStorage.getItem("anita_giuseppe_demo_roteiro_v2");
      if (storedRoteiro) setRoteiro(JSON.parse(storedRoteiro));
    } catch {
      // ignore
    }

    // Carregar checklist salvo
    try {
      const storedCheck = localStorage.getItem("anita_giuseppe_demo_checklist_v3");
      if (storedCheck) setChecklist(JSON.parse(storedCheck));
    } catch {
      // ignore
    }

    // Carregar atribuições de mesas, check-in e categorias salvas
    const catOverrides = getCategoryOverrides();
    let savedAssignments: Record<string, { checkIn: boolean; mesaId: number | null; tipo?: GuestCategory }> = {};
    try {
      const raw = localStorage.getItem("anita_giuseppe_demo_guest_assignments_v3");
      if (raw) savedAssignments = JSON.parse(raw);
    } catch {
      // ignore
    }

    setGuests((prev) => {
      const checkInMap = new Map(prev.map((p) => [p.id, { checkIn: p.checkIn, mesaId: p.mesaId, tipo: p.tipo }]));
      return buildGuestRows(official, subs).map((row) => {
        const savedMemory = checkInMap.get(row.id);
        const savedStorage = savedAssignments[row.id];
        const checkIn =
          row.rsvpStatus === "ausente"
            ? false
            : (savedMemory?.checkIn ?? savedStorage?.checkIn ?? row.checkIn);
        const mesaId =
          row.rsvpStatus === "ausente"
            ? null
            : savedMemory?.mesaId !== undefined
            ? savedMemory.mesaId
            : savedStorage?.mesaId !== undefined
            ? savedStorage.mesaId
            : row.mesaId;
        const tipo = catOverrides[cleanString(row.nome)] ?? savedMemory?.tipo ?? savedStorage?.tipo ?? row.tipo;
        return { ...row, checkIn, mesaId, tipo };
      });
    });
  };

  useEffect(() => {
    setMounted(true);
    fetch("/api/admin-auth?role=cerimonialista")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setIsAuthenticated(Boolean(d?.authenticated));
      })
      .catch(() => {})
      .finally(() => setIsAuthChecking(false));
  }, []);

  const handleLockPanel = async () => {
    try {
      await fetch("/api/admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout", role: "cerimonialista" }),
      });
    } catch {}
    setIsAuthenticated(false);
    setHasEntered(false);
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    loadAll();

    // Carrega a lista de convidados da nuvem uma vez ao abrir a página
    fetch("/api/guests")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.guests && Array.isArray(data.guests) && data.guests.length > 0) {
          const overriddenGuests = applyCategoryOverridesToRecords(data.guests);
          setOfficialGuests(overriddenGuests);
          try {
            localStorage.setItem("anita_giuseppe_demo_official_guests_v4", JSON.stringify(overriddenGuests));
          } catch {}
          loadAll();
        }
      })
      .catch(() => {});

    // Sincroniza em tempo real confirmações com o banco de dados em nuvem
    const syncWithCloud = () => {
      fetch("/api/rsvp")
        .then((r) => {
          if (!r.ok) throw new Error("HTTP error " + r.status);
          return r.json();
        })
        .then((data) => {
          if (!data || data.ok === false) return;
          if (data?.submissions && Array.isArray(data.submissions)) {
            let currentSubs = data.submissions;

            // Auto-recupera quaisquer confirmações salvas na memória local deste aparelho que faltem na nuvem
            try {
              const { recovered } = scanAndRestoreLocalBackups();
              if (recovered && recovered.length > 0) {
                const existingIds = new Set(currentSubs.map((s: any) => s.invitationId));
                const missingFromCloud = recovered.filter((r: any) => !existingIds.has(r.invitationId));
                if (missingFromCloud.length > 0) {
                  currentSubs = [...currentSubs, ...missingFromCloud];
                  for (const sub of missingFromCloud) {
                    fetch("/api/rsvp", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ submission: sub }),
                    }).catch(() => {});
                  }
                }
              }
            } catch {}

            currentSubs = applyCategoryOverridesToSubmissions(currentSubs);
            setSubmissions(currentSubs);
            try {
              localStorage.setItem("anita_giuseppe_demo_all_rsvps_v4", JSON.stringify(currentSubs));
            } catch {
              // ignore
            }
            loadAll();
          }
          if (data?.notifications && Array.isArray(data.notifications)) {
            const cleanNotifs = applyNotificationReadState(
              data.notifications.filter(
                (n: any) => !String(n.id).startsWith("notif-restored-") && !String(n.id).startsWith("notif-fam-")
              )
            );
            setNotifications(cleanNotifs);
            try {
              localStorage.setItem("anita_giuseppe_demo_rsvp_notifications_v4", JSON.stringify(cleanNotifs));
            } catch {
              // ignore
            }
          }
        })
        .catch(() => {});

      fetch("/api/sync")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data || data.ok === false) return;
          if (Array.isArray(data.mesas) && data.mesas.length > 0) {
            setMesas(data.mesas);
            try {
              localStorage.setItem("anita_giuseppe_demo_cerimonialista_mesas_v2", JSON.stringify(data.mesas));
            } catch {}
          }
          if (Array.isArray(data.fornecedores) && data.fornecedores.length > 0) {
            setFornecedores(data.fornecedores);
            try {
              localStorage.setItem("anita_giuseppe_demo_fornecedores_v2", JSON.stringify(data.fornecedores));
            } catch {}
          }
          if (Array.isArray(data.roteiro) && data.roteiro.length > 0) {
            setRoteiro(data.roteiro);
            try {
              localStorage.setItem("anita_giuseppe_demo_roteiro_v2", JSON.stringify(data.roteiro));
            } catch {}
          }
          if (Array.isArray(data.checklist) && data.checklist.length > 0) {
            setChecklist(data.checklist);
            try {
              localStorage.setItem("anita_giuseppe_demo_checklist_v3", JSON.stringify(data.checklist));
            } catch {}
          }
          if (data.assignments && typeof data.assignments === "object" && Object.keys(data.assignments).length > 0) {
            try {
              const localRaw = localStorage.getItem("anita_giuseppe_demo_guest_assignments_v3");
              const localObj = localRaw ? JSON.parse(localRaw) : {};
              const merged = { ...localObj, ...data.assignments };
              localStorage.setItem("anita_giuseppe_demo_guest_assignments_v3", JSON.stringify(merged));
              loadAll();
            } catch {}
          }
        })
        .catch(() => {});
    };

    syncWithCloud();
    const interval = setInterval(syncWithCloud, 10000);

    const onVisible = () => {
      if (document.visibilityState === "visible") syncWithCloud();
    };
    document.addEventListener("visibilitychange", onVisible);

    const unsub = subscribeToWeddingSync((evt) => {
      loadAll();
      if (evt.type !== "notifications_read") {
        syncWithCloud();
      }
      if (evt.type === "rsvp_submitted" && evt.payload) {
        const notif = evt.payload as RsvpNotification;
        playNotificationChime(notif.answer === "sim");
        setLiveToast(notif);
        setShowLiveModal(true);
      }
    });

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      unsub();
    };
  }, [isAuthenticated]);

  // Helpers para salvar dados editados (Local + Nuvem /api/sync)
  const saveMesas = (updated: MesaItem[]) => {
    setMesas(updated);
    try {
      localStorage.setItem("anita_giuseppe_demo_cerimonialista_mesas_v2", JSON.stringify(updated));
    } catch {}
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mesas: updated }),
    }).catch(() => {});
  };

  const saveFornecedores = (updated: FornecedorItem[]) => {
    setFornecedores(updated);
    try {
      localStorage.setItem("anita_giuseppe_demo_fornecedores_v2", JSON.stringify(updated));
    } catch {}
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fornecedores: updated }),
    }).catch(() => {});
  };

  const saveRoteiro = (updated: RoteiroItem[]) => {
    setRoteiro(updated);
    try {
      localStorage.setItem("anita_giuseppe_demo_roteiro_v2", JSON.stringify(updated));
    } catch {}
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roteiro: updated }),
    }).catch(() => {});
  };

  const saveChecklist = (updated: ChecklistItem[]) => {
    setChecklist(updated);
    try {
      localStorage.setItem("anita_giuseppe_demo_checklist_v3", JSON.stringify(updated));
    } catch {}
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checklist: updated }),
    }).catch(() => {});
  };

  const updateGuest = (id: string, patch: Partial<GuestRow>) => {
    setGuests((gs) => {
      const target = gs.find((g) => g.id === id);
      const updated = gs.map((g) => (g.id === id ? { ...g, ...patch } : g));
      try {
        const assignments: Record<string, { checkIn: boolean; mesaId: number | null; tipo?: GuestCategory }> = {};
        updated.forEach((g) => {
          if (g.id === id || g.mesaId !== null || g.checkIn || g.tipo) {
            assignments[g.id] = { checkIn: g.checkIn, mesaId: g.mesaId, tipo: g.tipo };
          }
        });
        localStorage.setItem("anita_giuseppe_demo_guest_assignments_v3", JSON.stringify(assignments));
        fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignments }),
        }).catch(() => {});
      } catch {
        // ignore
      }

      if (patch.tipo && target) {
        updatePersonCategory({
          guestName: target.nome,
          newCategory: patch.tipo,
        });
      }

      return updated;
    });
  };

  const handleQuickPersonStatus = (
    g: GuestRow,
    famRecord: GuestRecord,
    targetStatus: MemberAttendanceStatus
  ) => {
    const existingSub = submissions.find((s) => s.invitationId === famRecord.id);
    setAdminMemberOrFamilyAttendance({
      family: famRecord,
      existingSubmission: existingSub,
      memberName: g.nome,
      targetStatus,
    });
    if (targetStatus === "ausente") {
      updateGuest(g.id, { checkIn: false, mesaId: null });
    }
    loadAll();
  };

  const unreadCount = notifications.filter((n) => !n.readByCerimonialista).length;

  const markAllNotificationsRead = () => {
    markNotificationsAsRead("cerimonialista", notifications);
    setNotifications((prev) => prev.map((n) => ({ ...n, readByCerimonialista: true })));
  };

  const handleNotificationClick = (n: RsvpNotification) => {
    if (!n.readByCerimonialista) {
      markSingleNotificationAsRead("cerimonialista", n.id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, readByCerimonialista: true } : item))
      );
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    const list = guests.filter((g) => {
      if (statusFilter !== "todos" && g.rsvpStatus !== statusFilter) return false;
      if (categoryFilter !== "todas" && normalizeGuestCategory(g.tipo) !== categoryFilter) return false;
      if (!q) return true;
      return (
        g.nome.toLowerCase().includes(q) ||
        g.familia.toLowerCase().includes(q) ||
        g.chefeFamilia.toLowerCase().includes(q) ||
        phoneMatchesQuery(g.telefone, q)
      );
    });

    if (checkinSort === "familia") {
      return [...list].sort((a, b) => {
        const famA = (a.familia || a.chefeFamilia || "").trim().toLowerCase();
        const famB = (b.familia || b.chefeFamilia || "").trim().toLowerCase();
        const cmpFam = famA.localeCompare(famB, "pt-BR");
        if (cmpFam !== 0) return cmpFam;

        const headA = (a.chefeFamilia || "").trim().toLowerCase();
        const headB = (b.chefeFamilia || "").trim().toLowerCase();
        const cmpHead = headA.localeCompare(headB, "pt-BR");
        if (cmpHead !== 0) return cmpHead;

        const aIsHead = a.nome.toLowerCase().includes(headA) || headA.includes(a.nome.toLowerCase());
        const bIsHead = b.nome.toLowerCase().includes(headB) || headB.includes(b.nome.toLowerCase());
        if (aIsHead && !bIsHead) return -1;
        if (!aIsHead && bIsHead) return 1;

        return a.nome.localeCompare(b.nome, "pt-BR");
      });
    }

    if (checkinSort === "mesa") {
      return [...list].sort((a, b) => {
        if (a.mesaId === null && b.mesaId !== null) return 1;
        if (a.mesaId !== null && b.mesaId === null) return -1;
        if (a.mesaId !== b.mesaId) return (a.mesaId || 0) - (b.mesaId || 0);
        return a.nome.localeCompare(b.nome, "pt-BR");
      });
    }

    return [...list].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [guests, statusFilter, categoryFilter, q, checkinSort]);

  const unifiedStats = computeUnifiedRsvpStats(officialGuests, submissions);
  const effectiveSubmissions = [
    ...submissions,
    ...officialGuests
      .filter(
        (g) =>
          !submissions.some((s) => s.invitationId === g.id) &&
          isPreDeclinedConfirmation(g.firstConfirmation)
      )
      .map((g) => buildPreDeclinedSubmissionFromGuest(g)),
  ];

  const totalGuests = guests.length;
  const confirmados = guests.filter((g) => g.rsvpStatus === "confirmado");
  const confirmadosCount = confirmados.length;
  const idososConfirmados = confirmados.filter((g) => normalizeGuestCategory(g.tipo) === "idoso").length;
  const adultosConfirmados = confirmados.filter((g) => normalizeGuestCategory(g.tipo) === "adulto").length;
  const adolescentesConfirmados = confirmados.filter((g) => normalizeGuestCategory(g.tipo) === "adolescente").length;
  const criancasConfirmadas = confirmados.filter((g) => normalizeGuestCategory(g.tipo) === "crianca").length;
  const bebesConfirmados = confirmados.filter((g) => normalizeGuestCategory(g.tipo) === "bebe").length;
  const ausentes = guests.filter((g) => g.rsvpStatus === "ausente");
  const ausentesCount = ausentes.length;
  const aguardando = guests.filter((g) => g.rsvpStatus === "aguardando");
  const aguardandoCount = aguardando.length;
  const presentes = guests.filter((g) => g.checkIn).length;
  const presencaPct = confirmadosCount > 0 ? Math.round((presentes / confirmadosCount) * 100) : 0;

  const capacidadeTotalMesas = mesas.reduce((acc, m) => acc + m.capacidade, 0);
  const ocupadosMesas = guests.filter((g) => g.mesaId !== null && g.rsvpStatus !== "ausente").length;
  const ocupacaoMesasPct = capacidadeTotalMesas > 0 ? Math.round((ocupadosMesas / capacidadeTotalMesas) * 100) : 0;
  const semMesaAll = guests.filter((g) => !g.mesaId && g.rsvpStatus !== "ausente");
  const semMesaConfirmados = semMesaAll.filter(
    (g) => g.rsvpStatus === "confirmado" || g.primeiraConfirmacao === "OK"
  );
  const semMesaAguardando = semMesaAll.filter(
    (g) => g.rsvpStatus !== "confirmado" && g.primeiraConfirmacao !== "OK"
  );

  // Convidados da Sidebar de Mesas com busca e filtro
  const filteredUnseated = semMesaAll.filter((g) => {
    if (mesaSidebarFilter === "confirmados") {
      if (g.rsvpStatus !== "confirmado" && g.primeiraConfirmacao !== "OK") return false;
    } else if (mesaSidebarFilter === "aguardando") {
      if (g.rsvpStatus === "confirmado" || g.primeiraConfirmacao === "OK") return false;
    }
    if (!mesaSidebarSearch.trim()) return true;
    const s = mesaSidebarSearch.trim().toLowerCase();
    return (
      g.nome.toLowerCase().includes(s) ||
      g.familia.toLowerCase().includes(s) ||
      g.chefeFamilia.toLowerCase().includes(s) ||
      g.telefone.includes(s)
    );
  });

  const checklistDone = checklist.filter((c) => c.done).length;
  const checklistCategories = [
    "Todas",
    ...Array.from(new Set(checklist.map((c) => c.categoria || "Geral"))),
  ];

  const filteredChecklist = checklist.filter((c) => {
    if (checklistFilter !== "Todas" && (c.categoria || "Geral") !== checklistFilter) {
      return false;
    }
    if (checklistStatusFilter === "pendentes" && c.done) return false;
    if (checklistStatusFilter === "concluidas" && !c.done) return false;
    if (checklistSearch.trim()) {
      const q = checklistSearch.trim().toLowerCase();
      return c.item.toLowerCase().includes(q) || (c.categoria || "").toLowerCase().includes(q);
    }
    return true;
  });
  const checklistPct = checklist.length > 0 ? Math.round((checklistDone / checklist.length) * 100) : 0;
  const roteiroConcluido = roteiro.filter((r) => r.status === "concluido").length;

  // Variáveis para o Gráfico Donut SVG
  const chartTotal = Math.max(1, totalGuests);
  const circ = 2 * Math.PI * 52; // ~326.7256
  const fPresentes = presentes / chartTotal;
  const lPresentes = fPresentes * circ;
  const aChegar = Math.max(0, confirmadosCount - presentes);
  const fAChegar = aChegar / chartTotal;
  const lAChegar = fAChegar * circ;
  const fAusentes = ausentesCount / chartTotal;
  const lAusentes = fAusentes * circ;
  const fAguardando = Math.max(0, chartTotal - presentes - aChegar - ausentesCount) / chartTotal;
  const lAguardando = fAguardando * circ;

  // Ações de Mesas
  const handleSaveMesa = () => {
    if (!mesaForm.nome.trim()) return;
    if (editingMesa) {
      const updated = mesas.map((m) =>
        m.id === editingMesa.id
          ? { ...m, nome: mesaForm.nome.trim(), capacidade: Number(mesaForm.capacidade) || 10, setor: mesaForm.setor.trim() }
          : m
      );
      saveMesas(updated);
    } else {
      const newId = mesas.length > 0 ? Math.max(...mesas.map((m) => m.id)) + 1 : 1;
      const newMesa: MesaItem = {
        id: newId,
        nome: mesaForm.nome.trim(),
        capacidade: Number(mesaForm.capacidade) || 10,
        setor: mesaForm.setor.trim() || undefined,
      };
      saveMesas([...mesas, newMesa]);
    }
    setEditingMesa(null);
    setNewMesaOpen(false);
    setMesaForm({ nome: "", capacidade: 10, setor: "" });
  };

  const handleDeleteMesa = (mesaId: number) => {
    if (!confirm("Tem certeza que deseja excluir esta mesa? Os convidados ficarão sem mesa alocada.")) return;
    saveMesas(mesas.filter((m) => m.id !== mesaId));
    setGuests((prev) => prev.map((g) => (g.mesaId === mesaId ? { ...g, mesaId: null } : g)));
  };

  // Ações de Fornecedores
  const handleSaveFornecedor = () => {
    if (!fornecedorForm.nome.trim() || !fornecedorForm.servico.trim()) return;
    if (editingFornecedor) {
      const updated = fornecedores.map((f) =>
        f.id === editingFornecedor.id
          ? { ...f, nome: fornecedorForm.nome.trim(), servico: fornecedorForm.servico.trim(), contato: fornecedorForm.contato.trim() }
          : f
      );
      saveFornecedores(updated);
    } else {
      const newF: FornecedorItem = {
        id: `f-${Date.now()}`,
        nome: fornecedorForm.nome.trim(),
        servico: fornecedorForm.servico.trim(),
        contato: fornecedorForm.contato.trim(),
      };
      saveFornecedores([...fornecedores, newF]);
    }
    setEditingFornecedor(null);
    setFornecedorModalOpen(false);
    setFornecedorForm({ nome: "", servico: "", contato: "" });
  };

  const handleDeleteFornecedor = (id: string) => {
    if (!confirm("Deseja remover este fornecedor?")) return;
    saveFornecedores(fornecedores.filter((f) => f.id !== id));
  };

  // Ações de Roteiro
  const handleSaveRoteiro = () => {
    if (!roteiroForm.titulo.trim() || !roteiroForm.hora.trim()) return;
    if (editingRoteiro) {
      const updated = roteiro.map((r) =>
        r.id === editingRoteiro.id
          ? { ...r, hora: roteiroForm.hora.trim(), titulo: roteiroForm.titulo.trim(), desc: roteiroForm.desc.trim() }
          : r
      );
      saveRoteiro(updated);
    } else {
      const newR: RoteiroItem = {
        id: `r-${Date.now()}`,
        hora: roteiroForm.hora.trim(),
        titulo: roteiroForm.titulo.trim(),
        desc: roteiroForm.desc.trim(),
        status: "pendente",
      };
      saveRoteiro([...roteiro, newR].sort((a, b) => a.hora.localeCompare(b.hora)));
    }
    setEditingRoteiro(null);
    setRoteiroModalOpen(false);
    setRoteiroForm({ hora: "20:00", titulo: "", desc: "" });
  };

  const handleDeleteRoteiro = (id: string) => {
    if (!confirm("Deseja remover este marco do roteiro?")) return;
    saveRoteiro(roteiro.filter((r) => r.id !== id));
  };

  const toggleRoteiroStatus = (id: string) => {
    const updated = roteiro.map((r) => {
      if (r.id !== id) return r;
      const nextStatus: RoteiroItem["status"] =
        r.status === "pendente" ? "andamento" : r.status === "andamento" ? "concluido" : "pendente";
      return { ...r, status: nextStatus };
    });
    saveRoteiro(updated);
  };

  // Ações de Checklist
  const handleAddChecklist = () => {
    if (!newChecklistText.trim()) return;
    const newItem: ChecklistItem = {
      id: `c-${Date.now()}`,
      item: newChecklistText.trim(),
      categoria: newChecklistCat,
      done: false,
    };
    saveChecklist([...checklist, newItem]);
    setNewChecklistText("");
  };

  const handleDeleteChecklist = (id: string) => {
    saveChecklist(checklist.filter((c) => c.id !== id));
  };

  // Exportar CSV
  const exportCSV = () => {
    const headers = "Nome,Categoria (Faixa Etária),Chefe de Família,Família,WhatsApp,Status RSVP,Mesa,Check-in,Observações\n";
    const rows = guests
      .map((g) =>
        `"${g.nome}","${GUEST_CATEGORIES[normalizeGuestCategory(g.tipo)].label}","${g.chefeFamilia}","${g.familia}","${g.telefone}","${g.rsvpStatus}","${
          g.mesaId ? `Mesa ${g.mesaId}` : "Sem mesa"
        }","${g.checkIn ? "Presente" : "Não"}","${g.restricoes.replace(/"/g, '""')}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `cerimonialista-convidados-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Resumo Pronto para WhatsApp do Buffet Villa Imperial
  const handleCopyBuffetReport = () => {
    const confirmedList = [...confirmados].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    const assentos =
      idososConfirmados + adultosConfirmados + adolescentesConfirmados + criancasConfirmadas;

    const text = [
      `🍽️ *RESUMO OFICIAL DE CONVIDADOS — CASAMENTO ANITA & GIUSEPPE*`,
      `📅 *Data:* 18/09/2027 · *Local:* Villa Imperial das Hortênsias`,
      `🕒 *Gerado em:* ${new Date().toLocaleString("pt-BR")}`,
      ``,
      `📊 *CONTAGEM POR FAIXA ETÁRIA (CONFIRMADOS):*`,
      `• 👵 Idosos (60+): *${idososConfirmados}*`,
      `• 👤 Adultos: *${adultosConfirmados}*`,
      `• 🎒 Adolescentes: *${adolescentesConfirmados}*`,
      `• 🧒 Crianças (Infantil): *${criancasConfirmadas}*`,
      `• 🍼 Bebês de colo (isento): *${bebesConfirmados}*`,
      `--------------------------------`,
      `✅ *TOTAL DE PESSOAS CONFIRMADAS:* ${confirmadosCount} pessoas`,
      `🪑 *TOTAL DE ASSENTOS / BUFFET:* ${assentos} lugares`,
      ``,
      `📋 *LISTA NOMINAL (ORDEM ALFABÉTICA):*`,
      ...confirmedList.map(
        (p, idx) =>
          `${String(idx + 1).padStart(2, "0")}. ${p.nome} — _${
            GUEST_CATEGORIES[normalizeGuestCategory(p.tipo)].shortLabel
          }_`
      ),
    ].join("\n");

    navigator.clipboard.writeText(text).then(() => {
      alert(
        "📋 Resumo para o Buffet Villa Imperial copiado para a área de transferência! Basta colar no WhatsApp."
      );
    });
  };

  // Folha de Recepção para Impressão / PDF
  const handlePrintReceptionList = () => {
    const confirmedList = [...confirmados].sort((a, b) => {
      const famA = (a.familia || a.chefeFamilia || "").trim().toLowerCase();
      const famB = (b.familia || b.chefeFamilia || "").trim().toLowerCase();
      const cmpFam = famA.localeCompare(famB, "pt-BR");
      if (cmpFam !== 0) return cmpFam;

      const headA = (a.chefeFamilia || "").trim().toLowerCase();
      const headB = (b.chefeFamilia || "").trim().toLowerCase();
      const cmpHead = headA.localeCompare(headB, "pt-BR");
      if (cmpHead !== 0) return cmpHead;

      const aIsHead = a.nome.toLowerCase().includes(headA) || headA.includes(a.nome.toLowerCase());
      const bIsHead = b.nome.toLowerCase().includes(headB) || headB.includes(b.nome.toLowerCase());
      if (aIsHead && !bIsHead) return -1;
      if (!aIsHead && bIsHead) return 1;

      return a.nome.localeCompare(b.nome, "pt-BR");
    });

    const win = window.open("", "_blank", "width=950,height=800");
    if (!win) {
      alert("Permita pop-ups para visualizar e imprimir a Folha de Recepção.");
      return;
    }

    const rowsHtml = confirmedList
      .map(
        (p, idx) => `
        <tr>
          <td style="text-align:center;font-weight:bold;">${p.checkIn ? "[ ✓ ]" : "[ &nbsp; ]"}</td>
          <td style="text-align:center;">${idx + 1}</td>
          <td style="font-weight:700;color:#C17767;">${escHtml(p.familia || p.chefeFamilia)}<div style="font-size:10px;color:#8C7B73;font-weight:normal;">Titular: ${escHtml(p.chefeFamilia)}</div></td>
          <td style="font-weight:600;">${escHtml(p.nome)}</td>
          <td>${GUEST_CATEGORIES[normalizeGuestCategory(p.tipo)].shortLabel}</td>
          <td>${p.mesaId ? `<strong>Mesa ${padNum(p.mesaId)}</strong>` : "—"}</td>
          <td style="font-family:monospace;font-size:11px;">${escHtml(formatPhoneBR(p.telefone) || "—")}</td>
        </tr>`
      )
      .join("");

    win.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Lista de Recepção e Check-in — Casamento Anita & Giuseppe (18/09/2027)</title>
        <style>
          body { font-family: Georgia, serif; color: #2b2118; margin: 28px; }
          h1 { margin: 0 0 4px 0; font-size: 22px; color: #3E2723; }
          p.sub { margin: 0 0 16px 0; font-size: 13px; color: #6E5F57; }
          .summary { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; padding: 12px; background: #FAF7F0; border: 1px solid #E8CBC3; border-radius: 10px; font-family: sans-serif; font-size: 12px; }
          .summary div { padding-right: 12px; border-right: 1px solid #E8CBC3; }
          .summary div:last-child { border-right: none; }
          table { width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 12px; }
          th, td { border: 1px solid #D9CDB8; padding: 7px 9px; text-align: left; }
          th { background: #F5F0E6; color: #3E2723; font-size: 11px; text-transform: uppercase; }
          tr:nth-child(even) { background: #FAF9F6; }
          @media print { .no-print { display: none; } body { margin: 10mm; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom:16px;text-align:right;">
          <button onclick="window.print()" style="background:#5F6F52;color:#fff;border:none;padding:8px 18px;border-radius:20px;font-weight:bold;cursor:pointer;">🖨️ Imprimir / Salvar em PDF</button>
        </div>
        <h1>Casamento Anita & Giuseppe · Folha Oficial de Recepção & Check-in (Ordenado por Família)</h1>
        <p class="sub">Data: 18 de Setembro de 2027 · Villa Imperial das Hortênsias (Petrópolis - RJ)</p>
        <div class="summary">
          <div><strong>Total Confirmados:</strong> ${confirmadosCount}</div>
          <div><strong>👵 Idosos (60+):</strong> ${idososConfirmados}</div>
          <div><strong>👤 Adultos:</strong> ${adultosConfirmados}</div>
          <div><strong>🎒 Adolescentes:</strong> ${adolescentesConfirmados}</div>
          <div><strong>🧒 Crianças:</strong> ${criancasConfirmadas}</div>
          <div><strong>🍼 Bebês:</strong> ${bebesConfirmados}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:55px;text-align:center;">Check</th>
              <th style="width:35px;text-align:center;">#</th>
              <th>Família / Titular</th>
              <th>Nome do Convidado</th>
              <th>Faixa Etária</th>
              <th>Mesa</th>
              <th>Telefone</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
      </html>
    `);
    win.document.close();
  };

  if (!mounted) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#FAF7F0]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C17767] border-t-transparent" />
          <p className="font-serif text-sm text-[#3E2723]">Carregando painel da cerimonialista...</p>
        </div>
      </div>
    );
  }

  if (!hasEntered || !isAuthenticated) {
    return (
      <PageCoverIntro
        imageSrc="/assets/og-painel-cerimonialista.jpg"
        imageAlt="Portal da Cerimonialista · Casamento Anita & Giuseppe"
        badgeText="Organização & Cerimonial"
        title="Portal da Cerimonialista"
        subtitle="Checklist Operacional · Disposição das Mesas · Recepção dos Convidados"
        buttonText="Acessar Portal"
        helperText="Painel oficial protegido por PIN da assessoria e cerimonial"
        pinRole="cerimonialista"
        isAuthenticated={isAuthenticated}
        isCheckingAuth={isAuthChecking}
        onPinUnlocked={() => setIsAuthenticated(true)}
        onEnter={() => setHasEntered(true)}
      />
    );
  }

  return (
    <AdminShell
      wide={true}
      role="Área da cerimonialista"
      title="Anita & Giuseppe · 18.09.2027"
      tabs={TABS}
      active={tab}
      onTab={setTab}
      actions={
        <>
          {/* Botão de Ver Capa e Bloquear */}
          <button
            type="button"
            onClick={() => setHasEntered(false)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#E8CBC3] bg-white px-3.5 text-[11px] font-semibold text-[#3E2723] hover:border-[#C17767] hover:text-[#C17767] transition-all cursor-pointer shadow-2xs"
            title="Voltar à capa inicial do portal"
          >
            <span>Ver Capa</span>
          </button>
          <button
            type="button"
            onClick={handleLockPanel}
            className="inline-flex h-9 items-center gap-1 rounded-full border border-[#E8CBC3] bg-[#FAF7F0] px-3 text-[11px] font-semibold text-[#6E5F57] hover:border-[#C17767] hover:text-[#C17767] transition-all cursor-pointer shadow-2xs"
            title="Trancar o painel e exigir PIN novamente neste aparelho"
          >
            <Lock size={12} />
            <span>Bloquear</span>
          </button>

          {/* Botão de Testar Som */}
          <button
            type="button"
            onClick={() => playNotificationChime(true)}
            title="Testar som de notificação da recepção"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#C8D4C0] bg-[#F0F4ED] px-3 text-[11px] font-semibold text-[#5F6F52] hover:bg-[#5F6F52] hover:text-white transition-all cursor-pointer shadow-2xs"
          >
            <Volume2 size={13} />
            <span className="hidden sm:inline">Testar Som</span>
          </button>

          {/* Sino de Notificações */}
          <button
            type="button"
            onClick={() => {
              setShowNotifPanel((v) => !v);
              if (unreadCount > 0) {
                markAllNotificationsRead();
              }
            }}
            className="relative inline-flex h-9 items-center gap-1.5 rounded-full border border-[#E8CBC3] bg-white px-3.5 text-[12px] font-semibold text-[#3E2723] hover:border-[#C17767] cursor-pointer shadow-2xs"
            title="Ver e gerenciar notificações de confirmações"
          >
            <Bell size={14} className="text-[#C17767]" />
            <span>Notificações</span>
            {unreadCount > 0 && (
              <span className="ml-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#C17767] px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setManualRsvpGuest(null);
              setManualRsvpMode("confirm");
              setManualRsvpOpen(true);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] px-3.5 text-[12px] font-bold text-white cursor-pointer shadow-xs transition-colors"
            title="Confirmar presença, registrar ausência ou enviar lembrete carinhoso no WhatsApp"
          >
            <span>✅ Presença / ✕ Ausência</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("relatorios")}
            className={adminBtnPrimary}
            title="Abrir Central Oficial de Emissão de Relatórios (PDF, Impressão, Excel e WhatsApp)"
          >
            <FileText size={13} className="inline mr-1.5 -mt-0.5" />
            Relatórios & PDF
          </button>

          <button type="button" onClick={exportCSV} className={adminBtn}>
            Exportar CSV
          </button>

          <AdminLink href="/mesa">Página das Mesas (QR)</AdminLink>
          <AdminLink href="/" primary>
            Ver convite
          </AdminLink>
        </>
      }
    >
      {/* POP-UP MODAL DESTACADO QUANDO CHEGA UMA NOTIFICAÇÃO (Com Som) */}
      {showLiveModal && liveToast && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowLiveModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border-2 border-[#5F6F52] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`mx-auto grid h-16 w-16 place-items-center rounded-full mb-3 ${
                liveToast.answer === "sim" ? "bg-[#F0F4ED] text-[#5F6F52]" : "bg-[#FDF0EE] text-[#C17767]"
              }`}
            >
              {liveToast.answer === "sim" ? <Check size={32} strokeWidth={2.5} /> : <X size={32} strokeWidth={2.5} />}
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#5F6F52]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#5F6F52] mb-2">
              <Sparkles size={13} /> Nova Resposta Recebida Agora!
            </div>

            <h3 className="font-serif text-2xl font-semibold text-[#3E2723]">
              {liveToast.answer === "sim" ? "Presença Confirmada!" : "Ausência Comunicada"}
            </h3>

            <p className="text-sm font-semibold text-[#C17767] mt-0.5">
              Família de {liveToast.primaryName}
            </p>
            <p className="text-xs text-[#6E5F57]">{liveToast.phone}</p>

            <div className="my-4 rounded-2xl border border-[#E8CBC3]/60 bg-[#FAF7F0] p-4 text-left space-y-2 text-xs">
              {liveToast.confirmedNames.length > 0 && (
                <p className="text-[#2D3D22]">
                  <strong>Vai ({formatCategoryBreakdown({
                    idosos: liveToast.idososCount,
                    adultos: liveToast.adultsCount,
                    adolescentes: liveToast.adolescentesCount,
                    criancas: liveToast.kidsCount,
                    bebes: liveToast.bebesCount,
                  }) || `${liveToast.confirmedNames.length} pessoa(s)`}):</strong>{" "}
                  {liveToast.confirmedNames.join(", ")}
                </p>
              )}
              {liveToast.declinedNames.length > 0 && (
                <p className="text-[#8A3D2F]">
                  <strong>Não vai ({liveToast.declinedCount}):</strong> {liveToast.declinedNames.join(", ")}
                </p>
              )}
              {liveToast.message && (
                <p className="italic text-[#6E5F57] border-t border-[#E8CBC3]/40 pt-1.5">
                  “{liveToast.message}”
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowLiveModal(false)}
              className="w-full rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] text-white py-2.5 text-xs font-bold uppercase tracking-wider shadow-md transition-all cursor-pointer"
            >
              Ciente / Fechar
            </button>
          </div>
        </div>
      )}

      {/* Central de Notificações da Cerimonialista */}
      {showNotifPanel && (
        <Panel
          title="Notificações da Cerimonialista (RSVP em Tempo Real)"
          description="Histórico de confirmações (Vai) e ausências (Não vai) enviadas pelos convidados."
          action={
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="inline-flex items-center gap-1 rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] text-white px-3 py-1.5 text-xs font-semibold cursor-pointer shadow-2xs transition-colors"
                  title="Marcar todas as notificações como lidas"
                >
                  <Check size={13} />
                  <span>Marcar todas como lidas</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowNotifPanel(false)}
                className={adminBtn}
              >
                Fechar
              </button>
            </div>
          }
        >
          {notifications.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma notificação registrada ainda.</p>
          ) : (
            <ul className="divide-y divide-line">
              {notifications.map((n) => {
                const isUnread = !n.readByCerimonialista;
                return (
                  <li
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`py-3.5 px-3 -mx-3 rounded-xl transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      isUnread
                        ? "bg-amber-50/70 border border-amber-200/80 hover:bg-amber-50 shadow-2xs"
                        : "hover:bg-[#FAF7F0]/60 border border-transparent"
                    }`}
                    title={isUnread ? "Clique para marcar esta notificação como lida" : undefined}
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {isUnread && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#C17767] text-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider animate-pulse">
                            Nova
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            n.answer === "sim"
                              ? "bg-[#F0F4ED] text-[#5F6F52]"
                              : "bg-[#FDF0EE] text-[#C17767]"
                          }`}
                        >
                          {n.answer === "sim" ? <Check size={11} /> : <X size={11} />}
                          {n.answer === "sim" ? "Vai Comparecer" : "Não Poderá Ir"}
                        </span>
                        <span className="font-serif text-base font-semibold text-[#3E2723]">
                          Família de {n.primaryName}
                        </span>
                        <span className="text-xs text-muted">({n.phone})</span>
                      </div>
                      {n.confirmedNames.length > 0 && (
                        <p className="text-xs text-[#2D3D22]">
                          <strong>
                            Confirmados ({formatCategoryBreakdown({
                              idosos: n.idososCount,
                              adultos: n.adultsCount,
                              adolescentes: n.adolescentesCount,
                              criancas: n.kidsCount,
                              bebes: n.bebesCount,
                            }) || `${n.confirmedNames.length} pessoa(s)`}):
                          </strong>{" "}
                          {n.confirmedNames.join(", ")}
                        </p>
                      )}
                      {n.declinedNames.length > 0 && (
                        <p className="text-xs text-[#8A3D2F]">
                          <strong>Ausentes ({n.declinedCount}):</strong> {n.declinedNames.join(", ")}
                        </p>
                      )}
                      {n.message && (
                        <div className="mt-1 rounded-lg bg-[#FAF7F0] border border-[#E8CBC3]/60 p-2.5 text-xs italic text-[#3E2723] leading-relaxed whitespace-pre-wrap break-words shadow-2xs">
                          💬 “{n.message}”
                        </div>
                      )}
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0">
                      <span className="text-xs tabular-nums text-muted">{n.timestamp}</span>
                      {isUnread && (
                        <span className="text-[10px] font-medium text-[#C17767]">
                          Clique p/ marcar lida
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      )}

      {/* ABA 0 · VISÃO GERAL & DASHBOARD DA CERIMONIALISTA */}
      {tab === "geral" && (
        <>
          {/* 5 Cards de Estatísticas em Destaque */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Stat
              label="Pessoas Confirmadas"
              value={confirmadosCount}
              hint={formatCategoryBreakdown({
                idosos: idososConfirmados,
                adultos: adultosConfirmados,
                adolescentes: adolescentesConfirmados,
                criancas: criancasConfirmadas,
                bebes: bebesConfirmados,
              })}
            />
            <Stat
              label="Ausências / Não Vão"
              value={ausentesCount}
              hint={`${unifiedStats.familiesWithAnyAbsence} família(s) c/ baixa · ${aguardandoCount} pendentes`}
            />
            <Stat
              label="Presença no Salão"
              value={`${presentes}`}
              hint={`${presencaPct}% de presença realizada no check-in`}
            />
            <Stat
              label="Ocupação das Mesas"
              value={`${ocupadosMesas} / ${capacidadeTotalMesas}`}
              hint={`${mesas.length} mesas · ${semMesaAll.length} sem mesa`}
            />
            <Stat
              label="Operação do Cerimonial"
              value={`${checklistPct}%`}
              hint={`${checklistDone}/${checklist.length} checklist · ${roteiroConcluido}/${roteiro.length} roteiro concluído`}
            />
          </div>

          {/* Card Detalhado das 5 Categorias (Buffet Villa Imperial & Cerimonial) */}
          <div className="rounded-3xl border border-[#E8CBC3] bg-[#FAF9F6] p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8CBC3]/60 pb-3">
              <div>
                <h3 className="font-serif text-lg font-semibold text-[#3E2723] flex items-center gap-2">
                  <span>Planejamento por Categoria & Faixa Etária</span>
                  <span className="text-xs font-normal text-[#6E5F57]">(Buffet Villa Imperial & Cerimonial)</span>
                </h3>
                <p className="text-xs text-[#6E5F57]">
                  Contagem oficial para orientar o buffet, necessidades de acessibilidade e cadeirões/carrinhos
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setManualRsvpGuest(null);
                    setManualRsvpMode("confirm");
                    setManualRsvpOpen(true);
                  }}
                  className="rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] text-white px-3.5 py-1 text-xs font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                  title="Confirmar presença manualmente ou enviar lembrete carinhoso no WhatsApp"
                >
                  ✅ Confirmar / Lembrete
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualRsvpGuest(null);
                    setManualRsvpMode("decline");
                    setManualRsvpOpen(true);
                  }}
                  className="rounded-full border border-[#E8CBC3] bg-[#FDF0EE] hover:bg-[#F9E0DC] text-[#C17767] px-3.5 py-1 text-xs font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                  title="Registrar não comparecimento de pessoa ou família inteira"
                >
                  ✕ Registrar Ausência
                </button>
                <button
                  type="button"
                  onClick={handleCopyBuffetReport}
                  className="rounded-full border border-[#5F6F52]/40 bg-[#F0F4ED] hover:bg-[#E2ECDC] text-[#2D3D22] px-3 py-1 text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-1 shadow-2xs"
                  title="Copiar resumo formatado pronto para enviar no WhatsApp do Buffet Villa Imperial"
                >
                  📋 Resumo p/ Buffet
                </button>
                <button
                  type="button"
                  onClick={handlePrintReceptionList}
                  className="rounded-full border border-[#E8CBC3] bg-white hover:bg-[#FAF7F0] text-[#3E2723] px-3 py-1 text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-1 shadow-2xs"
                  title="Abrir folha de recepção em ordem alfabética para imprimir ou salvar PDF"
                >
                  🖨️ Lista Recepção (PDF)
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(true)}
                  className="rounded-full border border-[#D9CDB8] bg-white hover:bg-[#F5F0E6] text-[#8C6D3B] px-3.5 py-1 text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                  title="Alterar a categoria de qualquer pessoa"
                >
                  ✏️ Editar Categorias
                </button>
                <span className="rounded-full bg-[#5F6F52] text-white px-3 py-1 text-xs font-bold shadow-2xs">
                  {confirmadosCount} confirmados
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
              {/* Idosos 60+ */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                    👵 Idoso (60+)
                  </span>
                  <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                    Prioritário
                  </span>
                </div>
                <p className="font-serif text-3xl font-bold text-amber-950">
                  {idososConfirmados}
                </p>
                <p className="text-[11px] text-amber-800/90 leading-tight">
                  60 anos ou mais · Assentos acessíveis
                </p>
              </div>

              {/* Adultos */}
              <div className="rounded-2xl border border-stone-200 bg-stone-50/90 p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-800">
                    👤 Adulto
                  </span>
                  <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-bold text-stone-700">
                    Buffet Total
                  </span>
                </div>
                <p className="font-serif text-3xl font-bold text-stone-900">
                  {adultosConfirmados}
                </p>
                <p className="text-[11px] text-stone-600 leading-tight">
                  Adultos · Assento e buffet completo
                </p>
              </div>

              {/* Adolescentes */}
              <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sky-900">
                    🎒 Adolescente
                  </span>
                  <span className="rounded-full bg-sky-200/80 px-2 py-0.5 text-[10px] font-bold text-sky-900">
                    Jovem
                  </span>
                </div>
                <p className="font-serif text-3xl font-bold text-sky-950">
                  {adolescentesConfirmados}
                </p>
                <p className="text-[11px] text-sky-800/90 leading-tight">
                  Adolescentes · Assento e buffet
                </p>
              </div>

              {/* Crianças */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                    🧒 Criança
                  </span>
                  <span className="rounded-full bg-emerald-200/80 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                    Infantil
                  </span>
                </div>
                <p className="font-serif text-3xl font-bold text-emerald-950">
                  {criancasConfirmadas}
                </p>
                <p className="text-[11px] text-emerald-800/90 leading-tight">
                  Crianças · Buffet infantil
                </p>
              </div>

              {/* Bebês */}
              <div className="rounded-2xl border border-pink-200 bg-pink-50/80 p-3.5 space-y-1 col-span-2 sm:col-span-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-pink-900">
                    🍼 Bebê
                  </span>
                  <span className="rounded-full bg-pink-200/80 px-2 py-0.5 text-[10px] font-bold text-pink-900">
                    De colo
                  </span>
                </div>
                <p className="font-serif text-3xl font-bold text-pink-950">
                  {bebesConfirmados}
                </p>
                <p className="text-[11px] text-pink-800/90 leading-tight">
                  Bebês de colo · Sem assento/buffet
                </p>
              </div>
            </div>
          </div>

          {/* Alerta de Ação Rápida caso haja convidados sem mesa */}
          {semMesaAll.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#E8CBC3] bg-[#FAF7F0] p-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#C17767]/15 text-[#C17767]">
                  <AlertCircle size={20} />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#C17767]">
                    Organização de Lugares Pendente
                  </p>
                  <p className="font-serif text-sm font-semibold text-[#3E2723]">
                    {semMesaAll.length} convidado(s) ({semMesaConfirmados.length} confirmados/OK) ainda não possui(em) mesa definida.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTab("mesas")}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#C17767] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A86152] transition-colors shrink-0 cursor-pointer shadow-xs"
              >
                Distribuir nas Mesas <ArrowRight size={13} />
              </button>
            </div>
          )}

          {/* Gráficos Principais: Status de Convidados & Composição Gastronomia */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Gráfico 1: Status Geral dos Convidados (Donut Chart SVG) */}
            <div className="lg:col-span-7 rounded-3xl border border-line/80 bg-surface/95 p-6 shadow-2xs">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-xl font-normal text-ink">Status Geral dos Convidados</h3>
                  <p className="text-xs text-muted">Distribuição e presença em tempo real no evento</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F0F4ED] px-2.5 py-1 text-[11px] font-semibold text-[#5F6F52]">
                  <PieChart size={13} /> Ao Vivo
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
                {/* SVG Donut Chart */}
                <div className="relative flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 140 140" className="h-44 w-44 drop-shadow-xs">
                    <circle cx="70" cy="70" r="52" fill="none" stroke="#FAF7F0" strokeWidth="16" />
                    <g transform="rotate(-90 70 70)">
                      {lPresentes > 0 && (
                        <circle
                          cx="70"
                          cy="70"
                          r="52"
                          fill="none"
                          stroke="#2D5A27"
                          strokeWidth="16"
                          strokeDasharray={`${lPresentes} ${circ - lPresentes}`}
                          strokeDashoffset={0}
                        />
                      )}
                      {lAChegar > 0 && (
                        <circle
                          cx="70"
                          cy="70"
                          r="52"
                          fill="none"
                          stroke="#5F6F52"
                          strokeWidth="16"
                          strokeDasharray={`${lAChegar} ${circ - lAChegar}`}
                          strokeDashoffset={-lPresentes}
                        />
                      )}
                      {lAusentes > 0 && (
                        <circle
                          cx="70"
                          cy="70"
                          r="52"
                          fill="none"
                          stroke="#C17767"
                          strokeWidth="16"
                          strokeDasharray={`${lAusentes} ${circ - lAusentes}`}
                          strokeDashoffset={-(lPresentes + lAChegar)}
                        />
                      )}
                      {lAguardando > 0 && (
                        <circle
                          cx="70"
                          cy="70"
                          r="52"
                          fill="none"
                          stroke="#D4A373"
                          strokeWidth="16"
                          strokeDasharray={`${lAguardando} ${circ - lAguardando}`}
                          strokeDashoffset={-(lPresentes + lAChegar + lAusentes)}
                        />
                      )}
                    </g>
                    <text x="70" y="65" textAnchor="middle" className="font-serif text-2xl font-bold fill-[#3E2723]">
                      {confirmadosCount}
                    </text>
                    <text x="70" y="79" textAnchor="middle" className="text-[9.5px] font-semibold uppercase tracking-wider fill-[#6E5F57]">
                      Confirmados
                    </text>
                    <text x="70" y="91" textAnchor="middle" className="text-[8.5px] fill-[#8C7A70]">
                      {totalGuests} no total
                    </text>
                  </svg>
                </div>

                {/* Legenda Explicativa com Contadores */}
                <div className="w-full space-y-2.5">
                  <div className="flex items-center justify-between rounded-xl bg-[#F0F4ED] p-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[#2D5A27] shrink-0" />
                      <span className="font-semibold text-[#2D5A27]">Presentes no Salão (Check-in)</span>
                    </div>
                    <span className="font-bold text-[#2D5A27]">
                      {presentes} <span className="text-[10px] font-normal text-muted">({Math.round((presentes / chartTotal) * 100)}%)</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-[#FAF7F0] border border-[#E8CBC3]/40 p-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[#5F6F52] shrink-0" />
                      <span className="font-semibold text-[#5F6F52]">Confirmados a Chegar</span>
                    </div>
                    <span className="font-bold text-[#5F6F52]">
                      {aChegar} <span className="text-[10px] font-normal text-muted">({Math.round((aChegar / chartTotal) * 100)}%)</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-[#FDF0EE] p-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[#C17767] shrink-0" />
                      <span className="font-semibold text-[#C17767]">Ausências Notificadas</span>
                    </div>
                    <span className="font-bold text-[#C17767]">
                      {ausentesCount} <span className="text-[10px] font-normal text-muted">({Math.round((ausentesCount / chartTotal) * 100)}%)</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-[#FAF7F0] border border-[#E8CBC3]/40 p-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[#D4A373] shrink-0" />
                      <span className="font-semibold text-[#8C7A70]">Aguardando Resposta</span>
                    </div>
                    <span className="font-bold text-[#8C7A70]">
                      {aguardandoCount} <span className="text-[10px] font-normal text-muted">({Math.round((aguardandoCount / chartTotal) * 100)}%)</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Gráfico 2: Composição para Buffet Villa Imperial */}
            <div className="lg:col-span-5 rounded-3xl border border-line/80 bg-surface/95 p-6 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-xl font-normal text-ink">Buffet & Gastronomia</h3>
                    <p className="text-xs text-muted">Villa Imperial das Hortênsias</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FAF7F0] border border-[#E8CBC3] px-2.5 py-1 text-[11px] font-semibold text-[#C17767]">
                    <Utensils size={13} /> Cozinha
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Barra Proporcional por Categoria */}
                  <div>
                    <div className="flex flex-wrap justify-between text-xs font-semibold text-[#3E2723] mb-1.5 gap-2">
                      <span className="text-[#8C6D3B]">Idosos 60+: {idososConfirmados}</span>
                      <span className="text-[#35628D]">Adultos: {adultosConfirmados}</span>
                      <span className="text-[#74457F]">Adolescentes: {adolescentesConfirmados}</span>
                      <span className="text-[#C17767]">Crianças: {criancasConfirmadas}</span>
                      <span className="text-[#B86B14]">Bebês: {bebesConfirmados}</span>
                    </div>
                    <div className="h-4 w-full rounded-full bg-[#E8CBC3]/20 overflow-hidden flex">
                      {idososConfirmados > 0 && (
                        <div
                          style={{ width: `${confirmadosCount > 0 ? (idososConfirmados / confirmadosCount) * 100 : 0}%` }}
                          className="bg-[#D9CDB8] h-full transition-all duration-500"
                          title={`Idosos 60+: ${idososConfirmados}`}
                        />
                      )}
                      {adultosConfirmados > 0 && (
                        <div
                          style={{ width: `${confirmadosCount > 0 ? (adultosConfirmados / confirmadosCount) * 100 : 0}%` }}
                          className="bg-[#5F6F52] h-full transition-all duration-500"
                          title={`Adultos: ${adultosConfirmados}`}
                        />
                      )}
                      {adolescentesConfirmados > 0 && (
                        <div
                          style={{ width: `${confirmadosCount > 0 ? (adolescentesConfirmados / confirmadosCount) * 100 : 0}%` }}
                          className="bg-[#9A7B9B] h-full transition-all duration-500"
                          title={`Adolescentes: ${adolescentesConfirmados}`}
                        />
                      )}
                      {criancasConfirmadas > 0 && (
                        <div
                          style={{ width: `${confirmadosCount > 0 ? (criancasConfirmadas / confirmadosCount) * 100 : 0}%` }}
                          className="bg-[#C17767] h-full transition-all duration-500"
                          title={`Crianças: ${criancasConfirmadas}`}
                        />
                      )}
                      {bebesConfirmados > 0 && (
                        <div
                          style={{ width: `${confirmadosCount > 0 ? (bebesConfirmados / confirmadosCount) * 100 : 0}%` }}
                          className="bg-[#E6A055] h-full transition-all duration-500"
                          title={`Bebês: ${bebesConfirmados}`}
                        />
                      )}
                    </div>
                  </div>

                  {/* Resumo Operacional para o Buffet e Acomodação */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                    <div className="rounded-2xl border border-[#D9CDB8]/80 bg-[#FAF8F5] p-2.5 text-center">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-[#8C6D3B]">Idosos 60+</p>
                      <p className="font-serif text-xl font-bold text-[#3E2723] mt-0.5">{idososConfirmados}</p>
                      <p className="text-[9.5px] text-muted">Acesso fácil / prioridade</p>
                    </div>
                    <div className="rounded-2xl border border-line/80 bg-[#FAF7F0] p-2.5 text-center">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-[#5F6F52]">Adultos</p>
                      <p className="font-serif text-xl font-bold text-[#3E2723] mt-0.5">{adultosConfirmados}</p>
                      <p className="text-[9.5px] text-muted">Buffet convencional</p>
                    </div>
                    <div className="rounded-2xl border border-[#D8BFDF]/80 bg-[#FAF8FB] p-2.5 text-center">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-[#74457F]">Adolescentes</p>
                      <p className="font-serif text-xl font-bold text-[#3E2723] mt-0.5">{adolescentesConfirmados}</p>
                      <p className="text-[9.5px] text-muted">Buffet convencional</p>
                    </div>
                    <div className="rounded-2xl border border-line/80 bg-[#FAF7F0] p-2.5 text-center">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-[#C17767]">Crianças</p>
                      <p className="font-serif text-xl font-bold text-[#3E2723] mt-0.5">{criancasConfirmadas}</p>
                      <p className="text-[9.5px] text-muted">Pratos kids / meia</p>
                    </div>
                    <div className="rounded-2xl border border-[#FCD8A5]/80 bg-[#FFFDF9] p-2.5 text-center col-span-2 sm:col-span-1">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-[#B86B14]">Bebês</p>
                      <p className="font-serif text-xl font-bold text-[#3E2723] mt-0.5">{bebesConfirmados}</p>
                      <p className="text-[9.5px] text-muted">Cadeirão / no colo</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contato Rápido Buffet Villa Imperial */}
              <div className="mt-4 pt-3 border-t border-line/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-muted">Buffet Villa Imperial:</span>
                <div className="flex items-center gap-2.5">
                  <a
                    href="https://wa.me/5547999111711"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-[#5F6F52] hover:underline"
                  >
                    <MessageCircle size={12} /> WhatsApp
                  </a>
                  <a
                    href="tel:47999111711"
                    className="inline-flex items-center gap-1 font-semibold text-[#3E2723] hover:underline"
                  >
                    <Phone size={11} /> (47) 99911-1711
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico 3: Ocupação das Mesas no Salão */}
          <Panel
            title="Ocupação das Mesas no Salão"
            description={`Capacidade total de ${capacidadeTotalMesas} lugares em ${mesas.length} mesas (${ocupadosMesas} lugares ocupados · ${Math.max(0, capacidadeTotalMesas - ocupadosMesas)} lugares livres).`}
            action={
              <button
                type="button"
                onClick={() => setTab("mesas")}
                className={adminBtn}
              >
                Abrir Mapa Completo de Mesas ↗
              </button>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {mesas.map((m) => {
                const seated = guests.filter((g) => g.mesaId === m.id && g.rsvpStatus !== "ausente");
                const pct = Math.min(100, Math.round((seated.length / m.capacidade) * 100));
                const isFull = seated.length >= m.capacidade;
                const isNear = seated.length >= m.capacidade * 0.8 && !isFull;
                const free = Math.max(0, m.capacidade - seated.length);

                return (
                  <div key={m.id} className="rounded-2xl border border-line/80 bg-surface/90 p-4 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="inline-block rounded-md bg-rose/10 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-rose">
                            Mesa {padNum(m.id)}
                          </span>
                          <h4 className="font-serif text-base font-semibold text-[#3E2723] mt-1 line-clamp-1">
                            {m.nome.split("·")[1]?.trim() || m.nome}
                          </h4>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                          isFull
                            ? "bg-[#FDF0EE] text-[#C17767]"
                            : isNear
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-[#F0F4ED] text-[#5F6F52]"
                        }`}>
                          {isFull ? "Lotada" : `${free} livres`}
                        </span>
                      </div>

                      {m.setor && (
                        <p className="text-[11px] text-muted mt-0.5">📍 {m.setor}</p>
                      )}

                      {/* Barra de Progresso da Mesa */}
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-semibold text-[#3E2723]">{seated.length} / {m.capacidade}</span>
                          <span className="text-muted">{pct}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[#E8CBC3]/30 overflow-hidden">
                          <div
                            style={{ width: `${pct}%` }}
                            className={`h-full transition-all duration-300 ${
                              isFull ? "bg-[#C17767]" : isNear ? "bg-amber-500" : "bg-[#5F6F52]"
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Mini lista de convidados da mesa */}
                    <div className="mt-3 pt-2.5 border-t border-line/60">
                      {seated.length === 0 ? (
                        <p className="text-[11px] text-muted italic">Mesa vazia no momento</p>
                      ) : (
                        <p className="text-[11px] text-[#3E2723] truncate">
                          👥 {seated.slice(0, 3).map((g) => g.nome.split(" ")[0]).join(", ")}
                          {seated.length > 3 ? ` +${seated.length - 3}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Gráfico 4 / Painel Operacional: Roteiro & Checklist */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Roteiro da Cerimônia */}
            <Panel
              title="Roteiro da Cerimônia"
              description="Cronograma oficial da noite com horários e etapas."
              action={
                <button type="button" onClick={() => setTab("roteiro")} className={adminBtn}>
                  Editar Roteiro ↗
                </button>
              }
            >
              <div className="space-y-3">
                {roteiro.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 rounded-2xl border p-3.5 transition-colors ${
                      item.status === "concluido"
                        ? "border-[#C8D4C0] bg-[#F0F4ED]/60"
                        : item.status === "andamento"
                        ? "border-[#C17767] bg-[#FAF7F0]"
                        : "border-line/70 bg-surface/80"
                    }`}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white border border-line text-xs font-bold text-[#3E2723]">
                      {item.hora}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h5 className="font-serif text-sm font-semibold text-[#3E2723] truncate">
                          {item.titulo}
                        </h5>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                          item.status === "concluido"
                            ? "bg-[#F0F4ED] text-[#5F6F52]"
                            : item.status === "andamento"
                            ? "bg-[#C17767] text-white"
                            : "bg-gray-100 text-muted"
                        }`}>
                          {item.status === "concluido" ? "Concluído" : item.status === "andamento" ? "Em Andamento" : "Pendente"}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-0.5 line-clamp-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Checklist do Dia - Apenas Tarefas Pendentes */}
            <Panel
              title="Tarefas Pendentes do Checklist"
              description={`${checklist.filter((c) => !c.done).length} tarefas pendentes de ${checklist.length} no total (${checklistPct}% concluído).`}
              action={
                <button type="button" onClick={() => setTab("checklist")} className={adminBtn}>
                  Ver Checklist Completo ↗
                </button>
              }
            >
              <div className="space-y-4">
                {/* Barra de Progresso */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-[#3E2723]">
                    <span>Progresso Operacional</span>
                    <span>{checklistPct}%</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-[#E8CBC3]/30 overflow-hidden">
                    <div
                      style={{ width: `${checklistPct}%` }}
                      className="h-full bg-[#5F6F52] transition-all duration-300"
                    />
                  </div>
                </div>

                {/* Lista apenas com tarefas pendentes */}
                {checklist.filter((c) => !c.done).length === 0 ? (
                  <div className="py-6 text-center rounded-2xl bg-[#F0F4ED] border border-[#C8D4C0] p-4">
                    <p className="text-sm font-semibold text-[#5F6F52]">
                      ✓ Todas as tarefas do checklist foram concluídas!
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-line/70">
                    {checklist
                      .filter((c) => !c.done)
                      .map((c) => (
                        <li
                          key={c.id}
                          onClick={() => {
                            const updated = checklist.map((i) =>
                              i.id === c.id ? { ...i, done: true } : i
                            );
                            saveChecklist(updated);
                          }}
                          className="py-2.5 flex items-center justify-between gap-3 cursor-pointer group hover:bg-[#FAF7F0] px-2 rounded-xl transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-line bg-white group-hover:border-[#5F6F52] text-transparent group-hover:text-[#5F6F52] transition-colors">
                              <Check size={13} strokeWidth={3} />
                            </span>
                            <span className="text-xs text-[#3E2723] font-medium leading-relaxed">
                              {c.item}
                            </span>
                          </div>
                          {c.categoria && (
                            <span className="text-[10px] uppercase font-semibold text-muted bg-[#FAF7F0] border border-[#E8CBC3] px-2 py-0.5 rounded-full shrink-0">
                              {c.categoria}
                            </span>
                          )}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </Panel>
          </div>

          {/* Painel de Últimas Confirmações & Ausências Recebidas */}
          <Panel
            title="Últimas Respostas Recebidas (Vai / Não vai)"
            description="Atualizado automaticamente em tempo real sempre que um convidado responder ou tiver ausência registrada."
            action={
              <button type="button" onClick={() => setTab("checkin")} className={adminBtn}>
                Ver Lista Completa de Check-in ↗
              </button>
            }
          >
            {effectiveSubmissions.length === 0 ? (
              <p className="text-sm text-muted">Nenhuma resposta registrada ainda no sistema.</p>
            ) : (
              <Table head={["Titular do Convite", "WhatsApp", "Status", "Quem Vai", "Quem Não Vai", "Recado / Observação", "Horário"]}>
                {effectiveSubmissions.slice(0, 6).map((s) => {
                  const going = s.familyMembers.filter((m) => getEffectiveMemberStatus(m) === "confirmado");
                  const notGoing = s.familyMembers.filter((m) => getEffectiveMemberStatus(m) === "ausente");
                  return (
                    <tr key={s.invitationId}>
                      <td className="py-3 pr-4 font-medium">{s.primaryName}</td>
                      <td className="py-3 pr-4 tabular-nums text-ink/75">{s.phone}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            going.length > 0
                              ? "bg-[#F0F4ED] text-[#5F6F52]"
                              : "bg-[#FDF0EE] text-[#C17767]"
                          }`}
                        >
                          {going.length > 0 ? (
                            <span className="flex flex-col gap-0.5">
                              <span>
                                Confirmado ({going.length})
                                {notGoing.length > 0 ? ` · ${notGoing.length} ausente(s)` : ""}
                              </span>
                              <span className="text-[10px] text-muted font-normal">
                                {formatCategoryBreakdown(
                                  getBreakdownFromMembers(
                                    going.map((m) => ({ type: m.type, confirmed: true }))
                                  )
                                )}
                              </span>
                            </span>
                          ) : (
                            `Não poderá ir (${notGoing.length})`
                          )}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-xs text-[#2D3D22]">
                        {going.length > 0 ? going.map((m) => m.name).join(", ") : "—"}
                      </td>
                      <td className="py-3 pr-4 text-xs text-[#8A3D2F]">
                        {notGoing.length > 0 ? notGoing.map((m) => m.name).join(", ") : "—"}
                      </td>
                      <td className="py-3 pr-4 text-xs text-[#3E2723] min-w-[200px] max-w-md">
                        {s.message ? (
                          <div className="rounded-lg border border-[#E8CBC3]/50 bg-[#FAF7F0] p-2 text-xs italic leading-relaxed text-[#3E2723] whitespace-pre-wrap break-words">
                            “{s.message}”
                          </div>
                        ) : (
                          <span className="text-muted/60">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 tabular-nums text-xs text-muted">{s.timestamp}</td>
                    </tr>
                  );
                })}
              </Table>
            )}
          </Panel>
        </>
      )}

      {/* ABA 1 · CHECK-IN & CONFIRMAÇÕES */}
      {tab === "checkin" && (
        <Panel
          title="Recepção, Confirmações, Ausências & Check-in"
          description={`${confirmadosCount} confirmados (Vai) · ${ausentesCount} ausências (Não vai) · ${aguardandoCount} pendentes · ${presentes} presentes no check-in`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="h-10 rounded-full border border-line bg-white px-3.5 text-xs font-medium text-ink focus:outline-none cursor-pointer"
              >
                <option value="todos">Todos ({guests.length})</option>
                <option value="confirmado">Confirmados - Vai ({confirmadosCount})</option>
                <option value="ausente">Ausentes - Não vai ({ausentesCount})</option>
                <option value="aguardando">Aguardando RSVP ({aguardandoCount})</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
                className="h-10 rounded-full border border-line bg-white px-3.5 text-xs font-medium text-ink focus:outline-none cursor-pointer"
              >
                <option value="todas">Todas as Faixas Etárias</option>
                <option value="idoso">👵 Idosos (60+)</option>
                <option value="adulto">👤 Adultos</option>
                <option value="adolescente">🎒 Adolescentes</option>
                <option value="crianca">🧒 Crianças</option>
                <option value="bebe">🍼 Bebês</option>
              </select>
              <select
                value={checkinSort}
                onChange={(e) => setCheckinSort(e.target.value as typeof checkinSort)}
                className="h-10 rounded-full border border-line bg-white px-3.5 text-xs font-semibold text-[#3E2723] focus:outline-none cursor-pointer shadow-2xs"
                title="Critério de ordenação da lista de recepção"
              >
                <option value="familia">👨‍👩‍👧‍👦 Ordenar: Por Família (Padrão)</option>
                <option value="nome">🔤 Ordenar: Nome do Convidado (A–Z)</option>
                <option value="mesa">🍽️ Ordenar: Por Mesa</option>
              </select>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar convidado, titular da família ou tel…"
                className="h-10 w-full rounded-full border border-line px-4 text-sm focus:border-ink/40 focus:outline-none sm:w-64"
              />
              <button
                type="button"
                onClick={() => {
                  setManualRsvpGuest(null);
                  setManualRsvpMode("confirm");
                  setManualRsvpOpen(true);
                }}
                className="h-10 rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] text-white px-4 text-xs font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5 shrink-0 shadow-2xs"
                title="Confirmar presença manualmente ou enviar lembrete carinhoso no WhatsApp"
              >
                ✅ Confirmar / Lembrete
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualRsvpGuest(null);
                  setManualRsvpMode("decline");
                  setManualRsvpOpen(true);
                }}
                className="h-10 rounded-full border border-[#E8CBC3] bg-[#FDF0EE] hover:bg-[#F9E0DC] text-[#C17767] px-3.5 text-xs font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5 shrink-0 shadow-2xs"
                title="Registrar não comparecimento de pessoa ou família inteira"
              >
                ✕ Registrar Ausência
              </button>
              <button
                type="button"
                onClick={handleCopyBuffetReport}
                className="h-10 rounded-full border border-[#5F6F52]/40 bg-[#F0F4ED] hover:bg-[#E2ECDC] text-[#2D3D22] px-3.5 text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-1 shrink-0 shadow-2xs"
                title="Copiar resumo pronto para o WhatsApp do Buffet Villa Imperial"
              >
                📋 Resumo p/ Buffet
              </button>
              <button
                type="button"
                onClick={handlePrintReceptionList}
                className="h-10 rounded-full border border-[#E8CBC3] bg-white hover:bg-[#FAF7F0] text-[#3E2723] px-3.5 text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-1 shrink-0 shadow-2xs"
                title="Imprimir ou gerar PDF da lista de recepção"
              >
                🖨️ Lista Recepção (PDF)
              </button>
              <button
                type="button"
                onClick={() => setCategoryModalOpen(true)}
                className="h-10 rounded-full border border-[#D9CDB8] bg-[#FAF8F5] hover:bg-[#F5F0E6] text-[#8C6D3B] px-3.5 text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-1.5 shrink-0 shadow-2xs"
                title="Abrir gerenciador de categorias de todos os convidados"
              >
                ✏️ Editar Categorias
              </button>
            </div>
          }
        >
          <Table head={["Check-in", "Família / Titular", "Nome do Convidado", "Categoria", "1ª Confirmação", "Status RSVP Site", "Telefone", "Mesa", "Observação"]}>
            {filtered.map((g) => {
              const cat = GUEST_CATEGORIES[normalizeGuestCategory(g.tipo)];
              const famRecord = officialGuests.find((f) => g.id.startsWith(`${f.id}-`));
              return (
              <tr key={g.id}>
                <td className="py-3 pr-4">
                  <button
                    type="button"
                    onClick={() => updateGuest(g.id, { checkIn: !g.checkIn })}
                    className={`h-8 cursor-pointer rounded-full px-3 text-[12px] font-semibold transition-colors ${
                      g.checkIn ? "bg-sage text-paper shadow-2xs" : "border border-line text-muted hover:border-ink/30"
                    }`}
                  >
                    {g.checkIn ? "Presente" : "Check-in"}
                  </button>
                </td>
                <td className="py-3 pr-4">
                  <div className="font-semibold text-xs text-[#C17767]">{g.familia || g.chefeFamilia}</div>
                  {g.chefeFamilia && g.chefeFamilia !== g.familia && (
                    <div className="text-[10px] text-muted">Titular: {g.chefeFamilia}</div>
                  )}
                </td>
                <td className="py-3 pr-4 font-medium">
                  <span className="text-[#3E2723] break-words">{g.nome}</span>
                </td>
                <td className="py-3 pr-4">
                  <select
                    value={normalizeGuestCategory(g.tipo)}
                    onChange={(e) => {
                      const newCat = e.target.value as GuestCategory;
                      updateGuest(g.id, { tipo: newCat });
                    }}
                    className={`h-7 rounded-full border px-2 text-[10.5px] font-bold transition-colors focus:outline-none cursor-pointer shadow-2xs ${cat.badgeBg} ${cat.badgeText} ${cat.badgeBorder}`}
                    title="Clique para editar a faixa etária deste convidado"
                  >
                    <option value="idoso">👵 Idoso (60+)</option>
                    <option value="adulto">👤 Adulto</option>
                    <option value="adolescente">🎒 Adolescente</option>
                    <option value="crianca">🧒 Crianças</option>
                    <option value="bebe">🍼 Bebê</option>
                  </select>
                </td>
                <td className="py-3 pr-4">
                  {g.primeiraConfirmacao === "OK" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F0F4ED] px-2.5 py-0.5 text-[10px] font-bold text-[#5F6F52]">
                      OK
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FDF0EE] px-2.5 py-0.5 text-[10px] font-bold text-[#C17767]">
                      {g.primeiraConfirmacao || "PENDENTE"}
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {g.rsvpStatus === "confirmado" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F0F4ED] px-2.5 py-0.5 text-[11px] font-semibold text-[#5F6F52]">
                        <Check size={12} /> Vai
                      </span>
                    )}
                    {g.rsvpStatus === "ausente" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FDF0EE] px-2.5 py-0.5 text-[11px] font-semibold text-[#C17767]">
                        <X size={12} /> Não vai
                      </span>
                    )}
                    {g.rsvpStatus === "aguardando" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] text-muted">
                        Aguardando
                      </span>
                    )}
                    {famRecord && (
                      <>
                        {g.rsvpStatus !== "confirmado" && (
                          <button
                            type="button"
                            onClick={() => handleQuickPersonStatus(g, famRecord, "confirmado")}
                            className="rounded-full bg-[#F0F4ED] hover:bg-[#5F6F52] text-[#2D3D22] hover:text-white border border-[#C8D4C0] px-2 py-0.5 text-[10px] font-bold cursor-pointer transition-colors"
                            title={`Confirmar presença apenas de ${g.nome}`}
                          >
                            ✓ Vai
                          </button>
                        )}
                        {g.rsvpStatus !== "ausente" && (
                          <button
                            type="button"
                            onClick={() => handleQuickPersonStatus(g, famRecord, "ausente")}
                            className="rounded-full bg-[#FDF0EE] hover:bg-[#C17767] text-[#C17767] hover:text-white border border-[#E8CBC3] px-2 py-0.5 text-[10px] font-bold cursor-pointer transition-colors"
                            title={`Registrar não comparecimento (ausência) apenas de ${g.nome}`}
                          >
                            ✕ Não vai
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setManualRsvpGuest(famRecord);
                            setManualRsvpMode(g.rsvpStatus === "ausente" ? "decline" : "confirm");
                            setManualRsvpOpen(true);
                          }}
                          className="rounded-full bg-stone-100 hover:bg-stone-700 text-stone-700 hover:text-white px-2 py-0.5 text-[10px] font-bold cursor-pointer transition-colors"
                          title="Gerenciar presença ou ausência da família inteira"
                        >
                          👨‍👩‍👧 Família
                        </button>
                        {g.rsvpStatus !== "ausente" && getWhatsAppSaveTheDateLink(famRecord) && (
                          <a
                            href={getWhatsAppSaveTheDateLink(famRecord)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full bg-amber-100 hover:bg-amber-600 text-amber-900 hover:text-white px-2 py-0.5 text-[10px] font-bold transition-colors inline-flex items-center gap-1 shadow-2xs"
                            title="Enviar lembrete no WhatsApp para quem não fez a 1ª confirmação (Save the Date)"
                          >
                            <span>📅 Lembrete Save the Date</span>
                          </a>
                        )}
                        {g.rsvpStatus === "aguardando" && getWhatsAppRsvpReminderLink(famRecord) && (
                          <a
                            href={getWhatsAppRsvpReminderLink(famRecord)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full bg-emerald-100 hover:bg-emerald-600 text-emerald-900 hover:text-white px-2 py-0.5 text-[10px] font-bold transition-colors inline-flex items-center gap-1 shadow-2xs"
                            title="Enviar lembrete no WhatsApp para quem ainda não confirmou presença no convite"
                          >
                            <span>💌 Lembrete Convite</span>
                          </a>
                        )}
                        {g.rsvpStatus !== "ausente" && getWhatsAppInvitationLink(famRecord) && (
                          <a
                            href={getWhatsAppInvitationLink(famRecord)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full bg-[#FDF0EE] hover:bg-[#C17767] text-[#C17767] hover:text-white border border-[#E8CBC3] px-2 py-0.5 text-[10px] font-bold transition-colors inline-flex items-center gap-1 shadow-2xs"
                            title="Enviar o convite oficial no WhatsApp com o link do site"
                          >
                            <span>💍 Enviar Convite</span>
                          </a>
                        )}
                      </>
                    )}
                  </div>
                </td>
                <td className="py-3 pr-4 tabular-nums text-xs font-mono text-ink/75">{formatPhoneBR(g.telefone) || "—"}</td>
                <td className="py-3 pr-4 text-xs">
                  <select
                    value={g.mesaId ?? ""}
                    onChange={(e) => updateGuest(g.id, { mesaId: e.target.value ? Number(e.target.value) : null })}
                    className="h-8 rounded-lg border border-line bg-white px-2 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="">Sem mesa</option>
                    {mesas.map((m) => (
                      <option key={m.id} value={m.id}>
                        Mesa {padNum(m.id)} ({m.nome.split("·")[1]?.trim() || m.nome})
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-3 pr-4 text-xs text-[#3E2723] min-w-[160px] max-w-sm whitespace-pre-wrap break-words">
                  {g.restricoes || <span className="text-muted/60">—</span>}
                </td>
              </tr>
            );
          })}
          </Table>
        </Panel>
      )}

      {/* ABA 2 · MAPA INTERATIVO DE MESAS (Criar, Editar, Mover e Excluir) */}
      {tab === "mesas" && (
        <Panel
          title="Mapa Interativo das Mesas"
          description="Crie, edite, organize e atribua convidados às mesas com total flexibilidade."
          action={
            <button
              type="button"
              onClick={() => {
                setEditingMesa(null);
                setMesaForm({
                  nome: `Mesa ${padNum(mesas.length + 1)} · `,
                  capacidade: 10,
                  setor: "Salão Principal",
                });
                setNewMesaOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#C17767] hover:bg-[#a66152] px-4 py-2 text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
            >
              <Plus size={14} />
              Criar Nova Mesa
            </button>
          }
        >
          {/* Modal de Criação / Edição de Mesa */}
          {newMesaOpen && (
            <div className="mb-6 rounded-2xl border-2 border-[#C17767] bg-[#FAF7F0] p-5 shadow-md animate-in fade-in">
              <h4 className="font-serif text-lg font-semibold text-[#3E2723] mb-3">
                {editingMesa ? "Editar Mesa" : "Adicionar Nova Mesa"}
              </h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-[#3E2723] mb-1">Nome da Mesa *</label>
                  <input
                    type="text"
                    required
                    value={mesaForm.nome}
                    onChange={(e) => setMesaForm({ ...mesaForm, nome: e.target.value })}
                    placeholder="Ex: Mesa 05 · Família Silva"
                    className="w-full h-10 rounded-xl border border-line bg-white px-3 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3E2723] mb-1">Capacidade (Lugares) *</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={mesaForm.capacidade}
                    onChange={(e) => setMesaForm({ ...mesaForm, capacidade: Number(e.target.value) })}
                    className="w-full h-10 rounded-xl border border-line bg-white px-3 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3E2723] mb-1">Setor / Localização</label>
                  <input
                    type="text"
                    value={mesaForm.setor}
                    onChange={(e) => setMesaForm({ ...mesaForm, setor: e.target.value })}
                    placeholder="Ex: Frente ao palco / Janela"
                    className="w-full h-10 rounded-xl border border-line bg-white px-3 text-xs focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setNewMesaOpen(false)}
                  className="rounded-full border border-line bg-white px-4 py-1.5 text-xs text-muted hover:text-ink cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveMesa}
                  className="rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] px-5 py-1.5 text-xs font-bold text-white shadow-xs cursor-pointer"
                >
                  Salvar Mesa
                </button>
              </div>
            </div>
          )}

          {/* LAYOUT 2 COLUNAS: SIDEBAR LATERAL DE CONVIDADOS + GRID DE MESAS DRAG & DROP */}
          <div className="grid gap-6 lg:grid-cols-12 items-start">
            {/* SIDEBAR LATERAL: Convidados Sem Mesa (Sticky no Desktop) */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = "move";
                setDragOverSidebar(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOverSidebar(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverSidebar(false);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const guestId = draggedGuestIdRef.current || e.dataTransfer.getData("text/plain") || draggingGuestId;
                if (guestId) {
                  updateGuest(guestId, { mesaId: null });
                }
                draggedGuestIdRef.current = null;
                setDraggingGuestId(null);
                setDragOverMesaId(null);
                setDragOverSidebar(false);
              }}
              className={`lg:col-span-5 xl:col-span-4 2xl:col-span-3.5 rounded-3xl border transition-all p-5 bg-[#FAF7F0] lg:sticky lg:top-6 shadow-xs ${
                dragOverSidebar ? "border-2 border-dashed border-[#C17767] bg-[#FDF0EE]/90 ring-4 ring-[#C17767]/20" : "border-line"
              }`}
            >
              {/* Header da Sidebar */}
              <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#5F6F52] text-white">
                    <Users size={16} />
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-semibold text-[#3E2723]">
                      Convidados Sem Mesa
                    </h3>
                    <p className="text-[11px] text-muted">
                      {filteredUnseated.length} de {semMesaAll.length} convidados
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-[#C17767] text-white font-bold text-xs px-2.5 py-0.5">
                  {semMesaAll.length}
                </span>
              </div>

              {/* Dica de Arraste e Solte */}
              <div className="mt-3 rounded-xl bg-white/80 border border-line/60 p-2.5 text-[11.5px] text-[#5F6F52] flex items-center gap-2">
                <Move size={14} className="shrink-0 text-[#C17767]" />
                <span>
                  <strong>Arraste</strong> ou <strong>clique</strong> no convidado para alocar numa mesa.
                </span>
              </div>

              {/* Barra de Busca de Convidados */}
              <div className="mt-3 relative">
                <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={mesaSidebarSearch}
                  onChange={(e) => setMesaSidebarSearch(e.target.value)}
                  placeholder="Buscar por nome ou família..."
                  className="w-full h-9 rounded-xl border border-line bg-white pl-8 pr-3 text-xs focus:border-[#C17767] focus:outline-none"
                />
                {mesaSidebarSearch && (
                  <button
                    type="button"
                    onClick={() => setMesaSidebarSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-ink cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Filtros da Sidebar */}
              <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setMesaSidebarFilter("todos")}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer shrink-0 ${
                    mesaSidebarFilter === "todos"
                      ? "bg-[#3E2723] text-white"
                      : "bg-white text-muted border border-line hover:border-ink/30"
                  }`}
                >
                  Todos ({semMesaAll.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMesaSidebarFilter("confirmados")}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer shrink-0 ${
                    mesaSidebarFilter === "confirmados"
                      ? "bg-[#5F6F52] text-white"
                      : "bg-white text-muted border border-line hover:border-ink/30"
                  }`}
                >
                  Confirmados/OK ({semMesaConfirmados.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMesaSidebarFilter("aguardando")}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer shrink-0 ${
                    mesaSidebarFilter === "aguardando"
                      ? "bg-[#C17767] text-white"
                      : "bg-white text-muted border border-line hover:border-ink/30"
                  }`}
                >
                  Aguardando ({semMesaAguardando.length})
                </button>
              </div>

              {/* Área de Descarte / Solte aqui para desalocar */}
              {draggingGuestId && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = "move";
                    setDragOverSidebar(true);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const guestId = draggedGuestIdRef.current || e.dataTransfer.getData("text/plain") || draggingGuestId;
                    if (guestId) {
                      updateGuest(guestId, { mesaId: null });
                    }
                    draggedGuestIdRef.current = null;
                    setDraggingGuestId(null);
                    setDragOverMesaId(null);
                    setDragOverSidebar(false);
                  }}
                  className="mt-2.5 rounded-2xl border-2 border-dashed border-[#C17767] bg-[#FDF0EE] p-3 text-center text-xs font-bold text-[#C17767] animate-pulse cursor-pointer shadow-xs"
                >
                  ⬇️ Solte aqui para retirar da mesa (desalocar)
                </div>
              )}

              {/* Lista dos Convidados Sem Mesa (Arrastáveis e Clicáveis) */}
              <div className="mt-3 space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                {filteredUnseated.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted">
                    {semMesaAll.length === 0 ? (
                      <p className="text-[#5F6F52] font-semibold">🎉 Todos os convidados já possuem mesa alocada!</p>
                    ) : (
                      <p>Nenhum convidado encontrado com este filtro de busca.</p>
                    )}
                  </div>
                ) : (
                  filteredUnseated.map((g) => {
                    const isDragging = draggingGuestId === g.id;
                    const isSelected = selectedGuestId === g.id;
                    const isOk = g.primeiraConfirmacao === "OK" || g.rsvpStatus === "confirmado";
                    return (
                      <div
                        key={g.id}
                        draggable={true}
                        onDragStart={(e) => {
                          globalActiveDragGuestId = g.id;
                          draggedGuestIdRef.current = g.id;
                          e.dataTransfer.setData("text/plain", g.id);
                          e.dataTransfer.setData("text", g.id);
                          e.dataTransfer.effectAllowed = "copyMove";
                          setTimeout(() => {
                            setDraggingGuestId(g.id);
                          }, 40);
                        }}
                        onDragEnd={() => {
                          setTimeout(() => {
                            globalActiveDragGuestId = null;
                            draggedGuestIdRef.current = null;
                            setDraggingGuestId(null);
                            setDragOverMesaId(null);
                            setDragOverSidebar(false);
                          }, 350);
                        }}
                        onClick={() => {
                          setSelectedGuestId((prev) => (prev === g.id ? null : g.id));
                        }}
                        className={`group relative rounded-2xl border bg-white p-3.5 shadow-2xs transition-all cursor-grab active:cursor-grabbing hover:border-[#5F6F52] hover:shadow-sm select-none ${
                          isDragging
                            ? "opacity-40 border-dashed border-[#5F6F52]"
                            : isSelected
                            ? "ring-2 ring-[#5F6F52] border-[#5F6F52] bg-[#F0F4ED]"
                            : "border-line"
                        }`}
                        style={{ userSelect: "none" }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <div className="p-1 cursor-grab active:cursor-grabbing text-muted group-hover:text-[#5F6F52] transition-colors shrink-0">
                              <GripVertical size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-[13.5px] text-[#3E2723] break-words leading-tight">
                                  {g.nome}
                                </span>
                                <span
                                  className={`rounded-full border px-1.5 py-0.2 text-[9px] font-semibold shrink-0 ${GUEST_CATEGORIES[normalizeGuestCategory(g.tipo)].badgeBg} ${GUEST_CATEGORIES[normalizeGuestCategory(g.tipo)].badgeText} ${GUEST_CATEGORIES[normalizeGuestCategory(g.tipo)].badgeBorder}`}
                                  title={GUEST_CATEGORIES[normalizeGuestCategory(g.tipo)].description}
                                >
                                  {GUEST_CATEGORIES[normalizeGuestCategory(g.tipo)].label}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-muted mt-1 flex-wrap">
                                <span className="text-[#3E2723]/80 font-medium">{g.familia}</span>
                                <span>·</span>
                                <span className={`font-semibold ${isOk ? "text-[#5F6F52]" : "text-[#D4A373]"}`}>
                                  {g.rsvpStatus === "confirmado" ? "Confirmado" : g.primeiraConfirmacao === "OK" ? "1ª Conf. OK" : "Aguardando"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Seletor rápido de mesa para dispositivos móveis ou 1 clique */}
                          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  updateGuest(g.id, { mesaId: Number(e.target.value) });
                                  if (selectedGuestId === g.id) setSelectedGuestId(null);
                                }
                              }}
                              title="Atribuir a uma mesa"
                              className="h-7 rounded-lg border border-line bg-[#FAF7F0] hover:bg-[#F0F4ED] px-2 text-[11px] font-semibold text-[#5F6F52] cursor-pointer focus:outline-none"
                            >
                              <option value="" disabled>
                                + Mesa
                              </option>
                              {mesas.map((m) => (
                                <option key={m.id} value={m.id}>
                                  Mesa {padNum(m.id)} ({m.nome.split("·")[1]?.trim() || m.nome})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="mt-2.5 pt-2 border-t border-[#C8D4C0] flex items-center justify-between text-[11px] text-[#5F6F52] font-semibold">
                            <span>👉 Clique em qualquer mesa ao lado para alocar</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedGuestId(null);
                              }}
                              className="text-[10px] text-muted hover:text-ink underline cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* COLUNA PRINCIPAL: Grid de Mesas Interativas (Drop Targets) */}
            <div className="lg:col-span-7 xl:col-span-8 2xl:col-span-8.5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 2xl:grid-cols-2">
                {mesas.map((mesa) => {
                  const sentados = guests.filter((g) => g.mesaId === mesa.id && g.rsvpStatus !== "ausente");
                  const cheia = sentados.length >= mesa.capacidade;
                  const isDropTarget = dragOverMesaId === mesa.id;

                  return (
                    <div
                      key={mesa.id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = "move";
                        if (dragOverMesaId !== mesa.id) setDragOverMesaId(mesa.id);
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverMesaId(mesa.id);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        const rect = e.currentTarget.getBoundingClientRect();
                        if (
                          e.clientX < rect.left ||
                          e.clientX >= rect.right ||
                          e.clientY < rect.top ||
                          e.clientY >= rect.bottom
                        ) {
                          if (dragOverMesaId === mesa.id) setDragOverMesaId(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const guestId =
                          e.dataTransfer.getData("text/plain") ||
                          e.dataTransfer.getData("text") ||
                          globalActiveDragGuestId ||
                          draggedGuestIdRef.current ||
                          draggingGuestId ||
                          selectedGuestId;
                        if (guestId) {
                          updateGuest(guestId, { mesaId: mesa.id });
                        }
                        setTimeout(() => {
                          globalActiveDragGuestId = null;
                          draggedGuestIdRef.current = null;
                          setDraggingGuestId(null);
                          setDragOverMesaId(null);
                          setSelectedGuestId(null);
                        }, 100);
                      }}
                      onClick={() => {
                        if (selectedGuestId) {
                          updateGuest(selectedGuestId, { mesaId: mesa.id });
                          setSelectedGuestId(null);
                        }
                      }}
                      className={`rounded-3xl border p-5 bg-white transition-all shadow-2xs hover:shadow-md ${
                        isDropTarget
                          ? "border-2 border-dashed border-[#5F6F52] bg-[#F0F4ED]/90 scale-[1.01] shadow-lg ring-4 ring-[#5F6F52]/20"
                          : cheia
                          ? "border-[#C17767]/60"
                          : "border-line"
                      }`}
                    >
                      {/* Topo da Mesa */}
                      <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="inline-block rounded-md bg-rose/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose">
                              Mesa {padNum(mesa.id)}
                            </span>
                            <h3 className="font-serif text-lg font-semibold text-[#3E2723]">
                              {mesa.nome.split("·")[1]?.trim() || mesa.nome}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {mesa.setor && (
                              <span className="rounded-full bg-[#FAF7F0] border border-[#E8CBC3] px-2 py-0.5 text-[9.5px] text-[#C17767] font-semibold">
                                📍 {mesa.setor}
                              </span>
                            )}
                            <span className="text-[11px] text-muted">
                              Capacidade: {mesa.capacidade} pessoas
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setTablePickerMesa(mesa);
                              setTablePickerSearch("");
                            }}
                            title="Adicionar convidados a esta mesa"
                            className="inline-flex items-center gap-1 rounded-full bg-[#FAF7F0] border border-[#C8D4C0] hover:bg-[#F0F4ED] px-2.5 py-1 text-[11px] font-semibold text-[#5F6F52] transition-colors cursor-pointer"
                          >
                            <Plus size={12} />
                            <span>Adicionar</span>
                          </button>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${
                              cheia ? "bg-[#FDF0EE] text-[#C17767]" : "bg-[#F0F4ED] text-[#5F6F52]"
                            }`}
                          >
                            {sentados.length} / {mesa.capacidade}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMesa(mesa);
                              setMesaForm({
                                nome: mesa.nome,
                                capacidade: mesa.capacidade,
                                setor: mesa.setor || "",
                              });
                              setNewMesaOpen(true);
                            }}
                            title="Editar mesa"
                            className="grid h-7 w-7 place-items-center rounded-full border border-line text-muted hover:text-[#3E2723] hover:border-ink/40 cursor-pointer"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMesa(mesa.id)}
                            title="Excluir mesa"
                            className="grid h-7 w-7 place-items-center rounded-full border border-line text-muted hover:text-[#C17767] hover:border-[#C17767] cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Drop Zone e Botão de Alocação Fácil */}
                      {(draggingGuestId || selectedGuestId) && (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.dataTransfer.dropEffect = "move";
                            if (dragOverMesaId !== mesa.id) setDragOverMesaId(mesa.id);
                          }}
                          onDragEnter={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragOverMesaId(mesa.id);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const guestId =
                              e.dataTransfer.getData("text/plain") ||
                              e.dataTransfer.getData("text") ||
                              globalActiveDragGuestId ||
                              draggedGuestIdRef.current ||
                              draggingGuestId ||
                              selectedGuestId;
                            if (guestId) {
                              updateGuest(guestId, { mesaId: mesa.id });
                            }
                            setTimeout(() => {
                              globalActiveDragGuestId = null;
                              draggedGuestIdRef.current = null;
                              setDraggingGuestId(null);
                              setDragOverMesaId(null);
                              setSelectedGuestId(null);
                            }, 100);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            const guestId = selectedGuestId || globalActiveDragGuestId || draggedGuestIdRef.current || draggingGuestId;
                            if (guestId) {
                              updateGuest(guestId, { mesaId: mesa.id });
                              setSelectedGuestId(null);
                              setDraggingGuestId(null);
                              draggedGuestIdRef.current = null;
                              globalActiveDragGuestId = null;
                            }
                          }}
                          className={`my-3 py-3 px-4 rounded-2xl border-2 border-dashed text-center font-bold text-xs cursor-pointer transition-all ${
                            isDropTarget
                              ? "border-[#5F6F52] bg-[#5F6F52] text-white shadow-md scale-[1.01]"
                              : selectedGuestId
                              ? "border-[#5F6F52] bg-[#F0F4ED] text-[#5F6F52] hover:bg-[#5F6F52] hover:text-white shadow-xs"
                              : "border-[#5F6F52]/50 bg-[#FAF7F0] text-muted hover:border-[#5F6F52]"
                          }`}
                        >
                          {isDropTarget
                            ? `✓ Solte aqui para colocar na Mesa ${padNum(mesa.id)}!`
                            : selectedGuestId
                            ? `👉 Clique para colocar ${guests.find((x) => x.id === selectedGuestId)?.nome.split(" ")[0] || "convidado"} na Mesa ${padNum(mesa.id)}`
                            : cheia
                            ? `Mesa cheia (${sentados.length}/${mesa.capacidade}) - arraste e solte aqui`
                            : `⬇️ Arraste e solte nesta Mesa ${padNum(mesa.id)}`}
                        </div>
                      )}

                      {/* Lista de convidados na mesa (também arrastáveis para mover) */}
                      <div className="mt-3 space-y-1.5">
                        {sentados.length === 0 ? (
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.dataTransfer.dropEffect = "move";
                              if (dragOverMesaId !== mesa.id) setDragOverMesaId(mesa.id);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const guestId =
                                e.dataTransfer.getData("text/plain") ||
                                e.dataTransfer.getData("text") ||
                                globalActiveDragGuestId ||
                                draggedGuestIdRef.current ||
                                draggingGuestId ||
                                selectedGuestId;
                              if (guestId) updateGuest(guestId, { mesaId: mesa.id });
                              setTimeout(() => {
                                globalActiveDragGuestId = null;
                                draggedGuestIdRef.current = null;
                                setDraggingGuestId(null);
                                setDragOverMesaId(null);
                                setSelectedGuestId(null);
                              }, 100);
                            }}
                            className="py-5 text-center rounded-2xl border-2 border-dashed border-line/90 bg-[#FAF7F0]/60 text-xs text-muted space-y-2"
                          >
                            <p className="italic">Nenhum convidado alocado nesta mesa ainda.</p>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTablePickerMesa(mesa);
                                  setTablePickerSearch("");
                                }}
                                className="inline-flex items-center gap-1.5 rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs cursor-pointer"
                              >
                                <Plus size={13} />
                                Adicionar Convidado
                              </button>
                            </div>
                          </div>
                        ) : (
                          <ul className="divide-y divide-line/60">
                            {sentados.map((g) => (
                              <li
                                key={g.id}
                                draggable={true}
                                onDragStart={(e) => {
                                  globalActiveDragGuestId = g.id;
                                  draggedGuestIdRef.current = g.id;
                                  e.dataTransfer.setData("text/plain", g.id);
                                  e.dataTransfer.setData("text", g.id);
                                  e.dataTransfer.effectAllowed = "copyMove";
                                  setTimeout(() => {
                                    setDraggingGuestId(g.id);
                                  }, 40);
                                }}
                                onDragEnd={() => {
                                  setTimeout(() => {
                                    globalActiveDragGuestId = null;
                                    draggedGuestIdRef.current = null;
                                    setDraggingGuestId(null);
                                    setDragOverMesaId(null);
                                    setDragOverSidebar(false);
                                  }, 350);
                                }}
                                className="py-2 px-2.5 flex items-center justify-between text-xs gap-2 rounded-xl hover:bg-[#FAF7F0] transition-colors cursor-grab active:cursor-grabbing group select-none"
                                style={{ userSelect: "none" }}
                              >
                                <div className="flex items-start gap-2 min-w-0 flex-1">
                                  <GripVertical size={14} className="text-muted group-hover:text-ink shrink-0 mt-0.5" />
                                  <div className="min-w-0 flex-1">
                                    <span className="font-semibold text-xs text-[#3E2723] break-words">
                                      {g.nome}
                                    </span>{" "}
                                    <span className="text-[10px] text-muted block sm:inline">
                                      ({g.familia})
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <select
                                    value={mesa.id}
                                    onChange={(e) =>
                                      updateGuest(g.id, {
                                        mesaId: e.target.value ? Number(e.target.value) : null,
                                      })
                                    }
                                    title="Mover para outra mesa"
                                    className="h-6.5 rounded-md border border-line bg-white px-1.5 text-[11px] focus:outline-none cursor-pointer"
                                  >
                                    {mesas.map((m) => (
                                      <option key={m.id} value={m.id}>
                                        Mesa {padNum(m.id)}
                                      </option>
                                    ))}
                                    <option value="">Remover</option>
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => updateGuest(g.id, { mesaId: null })}
                                    title="Desalocar da mesa"
                                    className="text-muted hover:text-[#C17767] p-1 cursor-pointer"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Modal de Seleção Rápida de Convidados por Mesa */}
          {tablePickerMesa && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
              <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-line space-y-4 max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose">
                      Mesa {padNum(tablePickerMesa.id)} · Capacidade: {tablePickerMesa.capacidade}
                    </span>
                    <h3 className="font-serif text-lg font-semibold text-[#3E2723]">
                      Adicionar Convidados à {tablePickerMesa.nome}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTablePickerMesa(null)}
                    className="grid h-8 w-8 place-items-center rounded-full text-muted hover:text-ink cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="relative">
                  <SearchIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={tablePickerSearch}
                    onChange={(e) => setTablePickerSearch(e.target.value)}
                    placeholder="Buscar por nome ou família..."
                    className="w-full h-10 rounded-xl border border-line bg-white pl-9 pr-3 text-xs focus:border-[#5F6F52] focus:outline-none"
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-line/60">
                  {guests
                    .filter((g) => g.mesaId === null && g.rsvpStatus !== "ausente")
                    .filter((g) => {
                      if (!tablePickerSearch.trim()) return true;
                      const q = tablePickerSearch.trim().toLowerCase();
                      return (
                        g.nome.toLowerCase().includes(q) ||
                        g.familia.toLowerCase().includes(q) ||
                        g.chefeFamilia.toLowerCase().includes(q)
                      );
                    }).length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted">
                      Nenhum convidado sem mesa encontrado com este termo.
                    </div>
                  ) : (
                    guests
                      .filter((g) => g.mesaId === null && g.rsvpStatus !== "ausente")
                      .filter((g) => {
                        if (!tablePickerSearch.trim()) return true;
                        const q = tablePickerSearch.trim().toLowerCase();
                        return (
                          g.nome.toLowerCase().includes(q) ||
                          g.familia.toLowerCase().includes(q) ||
                          g.chefeFamilia.toLowerCase().includes(q)
                        );
                      })
                      .map((g) => (
                        <div key={g.id} className="pt-2.5 pb-1 flex items-center justify-between gap-3 text-xs">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-[#3E2723]">{g.nome}</p>
                            <p className="text-[11px] text-muted flex items-center gap-1.5 flex-wrap">
                              <span>{g.familia}</span>
                              <span>·</span>
                              <span
                                className={`rounded-full border px-1.5 py-0.2 text-[9.5px] font-semibold ${GUEST_CATEGORIES[normalizeGuestCategory(g.tipo)].badgeBg} ${GUEST_CATEGORIES[normalizeGuestCategory(g.tipo)].badgeText} ${GUEST_CATEGORIES[normalizeGuestCategory(g.tipo)].badgeBorder}`}
                                title={GUEST_CATEGORIES[normalizeGuestCategory(g.tipo)].description}
                              >
                                {GUEST_CATEGORIES[normalizeGuestCategory(g.tipo)].label}
                              </span>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              updateGuest(g.id, { mesaId: tablePickerMesa.id });
                            }}
                            className="shrink-0 rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition-all cursor-pointer"
                          >
                            + Colocar nesta Mesa
                          </button>
                        </div>
                      ))
                  )}
                </div>

                <div className="pt-3 border-t border-line flex items-center justify-between">
                  <span className="text-xs text-muted font-medium">
                    Ocupação atual:{" "}
                    <strong>
                      {guests.filter((g) => g.mesaId === tablePickerMesa.id && g.rsvpStatus !== "ausente").length}
                    </strong>{" "}
                    / {tablePickerMesa.capacidade}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTablePickerMesa(null)}
                    className="rounded-full bg-[#3E2723] hover:bg-black px-5 py-2 text-xs font-bold text-white cursor-pointer"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            </div>
          )}
        </Panel>
      )}

      {/* ABA 3 · FORNECEDORES ATUALIZADOS & EDITÁVEIS */}
      {tab === "fornecedores" && (
        <Panel
          title="Fornecedores Oficiais"
          description="Contatos diretos das equipes contratadas para o casamento."
          action={
            <button
              type="button"
              onClick={() => {
                setEditingFornecedor(null);
                setFornecedorForm({ nome: "", servico: "", contato: "" });
                setFornecedorModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] px-4 py-2 text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
            >
              <Plus size={14} />
              Adicionar Fornecedor
            </button>
          }
        >
          {/* Modal de Criação / Edição de Fornecedor */}
          {fornecedorModalOpen && (
            <div className="mb-6 rounded-2xl border-2 border-[#5F6F52] bg-[#F0F4ED] p-5 shadow-md animate-in fade-in">
              <h4 className="font-serif text-lg font-semibold text-[#3E2723] mb-3">
                {editingFornecedor ? "Editar Fornecedor" : "Cadastrar Novo Fornecedor"}
              </h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-[#3E2723] mb-1">Nome / Empresa *</label>
                  <input
                    type="text"
                    required
                    value={fornecedorForm.nome}
                    onChange={(e) => setFornecedorForm({ ...fornecedorForm, nome: e.target.value })}
                    placeholder="Ex: JoyFilmes"
                    className="w-full h-10 rounded-xl border border-line bg-white px-3 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3E2723] mb-1">Serviço Prestado *</label>
                  <input
                    type="text"
                    required
                    value={fornecedorForm.servico}
                    onChange={(e) => setFornecedorForm({ ...fornecedorForm, servico: e.target.value })}
                    placeholder="Ex: Foto & Vídeo"
                    className="w-full h-10 rounded-xl border border-line bg-white px-3 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3E2723] mb-1">Telefone / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={fornecedorForm.contato}
                    onChange={(e) => setFornecedorForm({ ...fornecedorForm, contato: e.target.value })}
                    placeholder="Ex: +55 47 9275-1421"
                    className="w-full h-10 rounded-xl border border-line bg-white px-3 text-xs focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setFornecedorModalOpen(false)}
                  className="rounded-full border border-line bg-white px-4 py-1.5 text-xs text-muted hover:text-ink cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveFornecedor}
                  className="rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] px-5 py-1.5 text-xs font-bold text-white shadow-xs cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {fornecedores.map((f) => {
              const cleanDigits = f.contato.replace(/\D/g, "");
              const isMobile = cleanDigits.length >= 10;
              return (
                <div
                  key={f.id}
                  className="flex flex-col justify-between rounded-2xl border border-line bg-white p-4 shadow-2xs hover:shadow-xs transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-full bg-[#F0F4ED] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#5F6F52]">
                        {f.servico}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFornecedor(f);
                            setFornecedorForm({
                              nome: f.nome,
                              servico: f.servico,
                              contato: f.contato,
                            });
                            setFornecedorModalOpen(true);
                          }}
                          title="Editar"
                          className="grid h-6 w-6 place-items-center rounded-full border border-line text-muted hover:text-[#3E2723] cursor-pointer"
                        >
                          <Edit3 size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFornecedor(f.id)}
                          title="Excluir"
                          className="grid h-6 w-6 place-items-center rounded-full border border-line text-muted hover:text-[#C17767] cursor-pointer"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-serif text-lg font-semibold text-[#3E2723] mt-2">{f.nome}</h3>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2.5">
                    <span className="text-xs font-mono font-semibold text-muted">{f.contato}</span>
                    <div className="flex items-center gap-2">
                      {isMobile && (
                        <a
                          href={`https://wa.me/${cleanDigits.startsWith("55") ? cleanDigits : `55${cleanDigits}`}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-[#C8D4C0] bg-[#F0F4ED] px-2.5 py-1 text-[11px] font-semibold text-[#5F6F52] hover:bg-[#5F6F52] hover:text-white transition-colors"
                        >
                          <MessageCircle size={12} /> WhatsApp
                        </a>
                      )}
                      <a
                        href={`tel:${cleanDigits}`}
                        className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-semibold text-muted hover:text-ink transition-colors"
                      >
                        <Phone size={11} /> Ligar
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* ABA 4 · ROTEIRO DA CELEBRAÇÃO & INTERATIVO */}
      {tab === "roteiro" && (
        <Panel
          title="Roteiro da Celebração"
          description="Acompanhamento e marcação de status em tempo real do culto e recepção."
          action={
            <button
              type="button"
              onClick={() => {
                setEditingRoteiro(null);
                setRoteiroForm({ hora: "21:00", titulo: "", desc: "" });
                setRoteiroModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#C17767] hover:bg-[#a66152] px-4 py-2 text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
            >
              <Plus size={14} />
              Adicionar Marco
            </button>
          }
        >
          {/* Modal de Criação / Edição de Roteiro */}
          {roteiroModalOpen && (
            <div className="mb-6 rounded-2xl border-2 border-[#C17767] bg-[#FAF7F0] p-5 shadow-md animate-in fade-in">
              <h4 className="font-serif text-lg font-semibold text-[#3E2723] mb-3">
                {editingRoteiro ? "Editar Marco do Roteiro" : "Adicionar Novo Marco"}
              </h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-[#3E2723] mb-1">Horário (ex: 20:15) *</label>
                  <input
                    type="text"
                    required
                    value={roteiroForm.hora}
                    onChange={(e) => setRoteiroForm({ ...roteiroForm, hora: e.target.value })}
                    className="w-full h-10 rounded-xl border border-line bg-white px-3 text-xs focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#3E2723] mb-1">Título do Momento *</label>
                  <input
                    type="text"
                    required
                    value={roteiroForm.titulo}
                    onChange={(e) => setRoteiroForm({ ...roteiroForm, titulo: e.target.value })}
                    placeholder="Ex: Entrada do Cortejo e Noivos"
                    className="w-full h-10 rounded-xl border border-line bg-white px-3 text-xs focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-[#3E2723] mb-1">Descrição detalhada</label>
                  <input
                    type="text"
                    value={roteiroForm.desc}
                    onChange={(e) => setRoteiroForm({ ...roteiroForm, desc: e.target.value })}
                    placeholder="Ex: Ordem dos padrinhos, louvor oficial, leitura pastoral..."
                    className="w-full h-10 rounded-xl border border-line bg-white px-3 text-xs focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setRoteiroModalOpen(false)}
                  className="rounded-full border border-line bg-white px-4 py-1.5 text-xs text-muted hover:text-ink cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveRoteiro}
                  className="rounded-full bg-[#C17767] hover:bg-[#a66152] px-5 py-1.5 text-xs font-bold text-white shadow-xs cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {roteiro.map((r) => {
              const isConcluido = r.status === "concluido";
              const isAndamento = r.status === "andamento";
              return (
                <div
                  key={r.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-all ${
                    isConcluido
                      ? "bg-[#F0F4ED] border-[#C8D4C0]"
                      : isAndamento
                      ? "bg-[#FFF9EE] border-[#B38F4D] shadow-xs"
                      : "bg-white border-line"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span className="font-serif text-2xl font-bold tabular-nums text-[#C17767] shrink-0 w-16">
                      {r.hora}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`font-serif text-base font-semibold ${isConcluido ? "line-through text-muted" : "text-[#3E2723]"}`}>
                          {r.titulo}
                        </p>
                        <span
                          onClick={() => toggleRoteiroStatus(r.id)}
                          className={`cursor-pointer rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            isConcluido
                              ? "bg-[#5F6F52] text-white"
                              : isAndamento
                              ? "bg-[#B38F4D] text-white animate-pulse"
                              : "bg-gray-100 text-[#6E5F57] hover:bg-gray-200"
                          }`}
                        >
                          {isConcluido ? "Concluído" : isAndamento ? "Em Andamento" : "Aguardando"}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-0.5 leading-relaxed">{r.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleRoteiroStatus(r.id)}
                      className={`h-8 rounded-full px-3 text-xs font-semibold cursor-pointer transition-colors ${
                        isConcluido
                          ? "bg-white text-[#5F6F52] border border-[#C8D4C0]"
                          : "bg-[#5F6F52] text-white hover:bg-[#4E5C43]"
                      }`}
                    >
                      {isConcluido ? "Desmarcar" : "Marcar Concluído"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRoteiro(r);
                        setRoteiroForm({ hora: r.hora, titulo: r.titulo, desc: r.desc });
                        setRoteiroModalOpen(true);
                      }}
                      title="Editar"
                      className="grid h-8 w-8 place-items-center rounded-full border border-line bg-white text-muted hover:text-ink cursor-pointer"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRoteiro(r.id)}
                      title="Excluir"
                      className="grid h-8 w-8 place-items-center rounded-full border border-line bg-white text-muted hover:text-[#C17767] cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* ABA 5 · CHECKLIST DO DIA INTERATIVO & EDITÁVEL */}
      {tab === "checklist" && (
        <Panel
          title="Checklist do Dia"
          description={`${checklist.filter((c) => c.done).length} de ${checklist.length} tarefas concluídas`}
          action={
            <button
              type="button"
              onClick={() => {
                if (confirm("Deseja restaurar as tarefas padrões recomendadas para o casamento?")) {
                  saveChecklist(DEFAULT_CHECKLIST);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-1.5 text-xs text-muted hover:text-ink cursor-pointer shadow-2xs"
            >
              <RotateCcw size={12} />
              Restaurar Padrão
            </button>
          }
        >
          {/* BARRA DE FILTROS & BUSCA DO CHECKLIST */}
          <div className="mb-6 space-y-3 rounded-2xl border border-line bg-[#FAF7F0] p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Filtro de Status (Todas, Pendentes, Concluídas) */}
              <div className="flex items-center gap-1.5 bg-white p-1 rounded-full border border-line shrink-0">
                <button
                  type="button"
                  onClick={() => setChecklistStatusFilter("todas")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    checklistStatusFilter === "todas"
                      ? "bg-[#3E2723] text-white shadow-2xs"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  Todas ({checklist.length})
                </button>
                <button
                  type="button"
                  onClick={() => setChecklistStatusFilter("pendentes")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    checklistStatusFilter === "pendentes"
                      ? "bg-[#C17767] text-white shadow-2xs"
                      : "text-muted hover:text-[#C17767]"
                  }`}
                >
                  Pendentes ({checklist.filter((c) => !c.done).length})
                </button>
                <button
                  type="button"
                  onClick={() => setChecklistStatusFilter("concluidas")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    checklistStatusFilter === "concluidas"
                      ? "bg-[#5F6F52] text-white shadow-2xs"
                      : "text-muted hover:text-[#5F6F52]"
                  }`}
                >
                  Concluídas ({checklist.filter((c) => c.done).length})
                </button>
              </div>

              {/* Busca por palavra-chave */}
              <div className="relative flex-1 sm:max-w-xs">
                <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={checklistSearch}
                  onChange={(e) => setChecklistSearch(e.target.value)}
                  placeholder="Buscar tarefa no checklist…"
                  className="w-full h-8.5 rounded-full border border-line bg-white pl-8 pr-3 text-xs focus:border-[#C17767] focus:outline-none"
                />
                {checklistSearch && (
                  <button
                    type="button"
                    onClick={() => setChecklistSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-ink cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Pílulas de Filtro por Categoria */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-t border-line/60 pt-2.5">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider shrink-0 mr-1">
                Categoria:
              </span>
              {checklistCategories.map((cat) => {
                const count =
                  cat === "Todas"
                    ? checklist.length
                    : checklist.filter((c) => (c.categoria || "Geral") === cat).length;
                const active = checklistFilter === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setChecklistFilter(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                      active
                        ? "bg-[#5F6F52] text-white font-bold shadow-2xs"
                        : "bg-white text-[#3E2723] border border-line hover:border-[#5F6F52] hover:bg-[#F0F4ED]"
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Adicionar Nova Tarefa */}
          <div className="mb-6 rounded-2xl border border-line/80 bg-white p-3.5 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#6E5F57] mb-2">
              + Cadastrar nova tarefa para a cerimonialista:
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddChecklist()}
                placeholder="Ex: Alinhar com a noiva antes da entrada, verificar arranjos…"
                className="flex-1 h-10 rounded-full border border-line bg-[#FAF7F0] px-4 text-xs focus:bg-white focus:border-[#C17767] focus:outline-none"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-muted hidden sm:inline">Categoria:</span>
                <select
                  value={newChecklistCat}
                  onChange={(e) => setNewChecklistCat(e.target.value)}
                  className="h-10 rounded-full border border-line bg-[#FAF7F0] px-3.5 text-xs font-semibold text-[#3E2723] focus:bg-white focus:outline-none cursor-pointer"
                >
                  <option value="Buffet">Buffet</option>
                  <option value="Cerimônia">Cerimônia</option>
                  <option value="Som & Louvor">Som & Louvor</option>
                  <option value="Foto & Vídeo">Foto & Vídeo</option>
                  <option value="Decoração">Decoração</option>
                  <option value="Noivos">Noivos</option>
                  <option value="Recepção">Recepção</option>
                  <option value="Espaço">Espaço</option>
                  <option value="Encerramento">Encerramento</option>
                  <option value="Geral">Geral</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddChecklist}
                  className="h-10 rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] px-5 text-xs font-bold text-white shadow-xs cursor-pointer transition-colors"
                >
                  + Adicionar
                </button>
              </div>
            </div>
          </div>

          {/* Barra de Progresso Geral */}
          <div className="mb-6 space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-[#3E2723]">
              <span>Progresso Geral do Casamento ({checklist.filter((c) => c.done).length} de {checklist.length} tarefas)</span>
              <span>{checklist.length > 0 ? Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100) : 0}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 border border-line/60">
              <div
                className="h-full bg-[#5F6F52] transition-all duration-300"
                style={{
                  width: `${checklist.length > 0 ? (checklist.filter((c) => c.done).length / checklist.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Indicador de Filtro Ativo */}
          {(checklistFilter !== "Todas" || checklistStatusFilter !== "todas" || checklistSearch) && (
            <div className="mb-3 flex items-center justify-between text-xs text-muted bg-[#F0F4ED] border border-[#C8D4C0] px-3.5 py-2 rounded-xl">
              <span>
                Exibindo <strong>{filteredChecklist.length}</strong> de <strong>{checklist.length}</strong> tarefas
                {checklistFilter !== "Todas" && ` na categoria "${checklistFilter}"`}
                {checklistStatusFilter !== "todas" && ` (${checklistStatusFilter})`}
                {checklistSearch && ` contendo "${checklistSearch}"`}
              </span>
              <button
                type="button"
                onClick={() => {
                  setChecklistFilter("Todas");
                  setChecklistStatusFilter("todas");
                  setChecklistSearch("");
                }}
                className="text-[#5F6F52] font-semibold hover:underline cursor-pointer"
              >
                Limpar filtros ×
              </button>
            </div>
          )}

          {/* Lista de Tarefas Filtrada */}
          {filteredChecklist.length === 0 ? (
            <div className="py-12 text-center rounded-2xl border border-dashed border-line bg-[#FAF7F0] p-6 space-y-2">
              <p className="font-serif text-base text-[#3E2723]">Nenhuma tarefa encontrada com os filtros selecionados.</p>
              <button
                type="button"
                onClick={() => {
                  setChecklistFilter("Todas");
                  setChecklistStatusFilter("todas");
                  setChecklistSearch("");
                }}
                className="text-xs font-semibold text-[#5F6F52] underline cursor-pointer"
              >
                Mostrar todas as tarefas do checklist
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {filteredChecklist.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3 hover:bg-[#FAF7F0]/60 px-2 rounded-xl transition-colors">
                  <label className="flex flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={c.done}
                      onChange={() =>
                        saveChecklist(
                          checklist.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x))
                        )
                      }
                      className="h-4 w-4 accent-[#5F6F52] cursor-pointer"
                    />
                    <div className="flex items-center gap-2 min-w-0">
                      {c.categoria && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setChecklistFilter(c.categoria || "Geral");
                          }}
                          title={`Filtrar apenas ${c.categoria}`}
                          className="rounded-full bg-[#FAF7F0] border border-[#E8CBC3] px-2.5 py-0.5 text-[9.5px] font-semibold text-[#C17767] hover:bg-[#C17767] hover:text-white transition-colors shrink-0 cursor-pointer"
                        >
                          {c.categoria}
                        </button>
                      )}
                      <span className={`text-xs ${c.done ? "text-muted line-through" : "text-[#3E2723] font-medium"}`}>
                        {c.item}
                      </span>
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleDeleteChecklist(c.id)}
                    title="Excluir tarefa"
                    className="grid h-7 w-7 place-items-center rounded-full text-muted hover:text-[#C17767] hover:bg-[#FDF0EE] transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {tab === "relatorios" && (
        <ReportsCenter
          bundle={{
            role: "cerimonialista",
            officialGuests,
            submissions,
            mesas,
            assignments: cerimonialAssignments,
            fornecedores,
            roteiro,
            checklist,
          }}
          onReportEmitted={(title, format) => {
            fetch("/api/backup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "log_export",
                format: `[Cerimonialista] ${title} (${format})`,
              }),
            }).catch(() => {});
          }}
        />
      )}

      {/* Modal Rápido de Edição de Categorias */}
      <GuestCategoryEditorModal
        isOpen={categoryModalOpen}
        onClose={() => {
          setCategoryModalOpen(false);
          loadAll();
        }}
        onCategoryChanged={() => {
          loadAll();
        }}
      />

      {/* Modal de Confirmação Manual & Cobrança no WhatsApp */}
      <ManualRsvpModal
        isOpen={manualRsvpOpen}
        onClose={() => {
          setManualRsvpOpen(false);
          setManualRsvpGuest(null);
        }}
        officialGuests={officialGuests}
        submissions={submissions}
        initialGuest={manualRsvpGuest}
        initialMode={manualRsvpMode}
        roleLabel="Painel da Cerimonialista"
        onSaved={() => {
          loadAll();
        }}
      />
    </AdminShell>
  );
}

function padNum(n: number) {
  return String(n).padStart(2, "0");
}
