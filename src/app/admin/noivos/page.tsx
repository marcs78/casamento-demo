"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import {
  Bell,
  Check,
  ExternalLink,
  Upload,
  X,
  Gift,
  Heart,
  Search,
  Plus,
  Edit3,
  Trash2,
  Sparkles,
  MessageCircle,
  ShoppingBag,
  DollarSign,
  Share2,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  FileText,
} from "lucide-react";
import { AdminLink, AdminShell, Panel, Stat, Table, adminBtn, adminBtnPrimary } from "@/components/Admin";
import PageCoverIntro from "@/components/PageCoverIntro";
import {
  COUPLE,
  PLAYLIST,
  GOOGLE_DRIVE_PHOTOS_URL,
  COTAS,
  GIFTS,
  PIX_KEY,
  AMAZON_WISHLIST_URL,
  type GuestMessage,
  type SongSuggestion,
  type Cota,
} from "@/lib/wedding";
import {
  getAllRsvpSubmissions,
  getOfficialGuestList,
  getRsvpNotifications,
  getSongSuggestions,
  markNotificationsAsRead,
  markSingleNotificationAsRead,
  parseGuestListText,
  saveOfficialGuestList,
  subscribeToWeddingSync,
  extractSurname,
  getGiftContributions,
  saveGiftContributions,
  addGiftContribution,
  updateGiftContribution,
  deleteGiftContribution,
  type GuestRecord,
  type RsvpNotification,
  type RsvpSubmission,
  type GiftContribution,
  type GiftType,
  GUEST_CATEGORIES,
  normalizeGuestCategory,
  formatCategoryBreakdown,
  getBreakdownFromMembers,
  updatePersonCategory,
  cleanString,
  notifySyncListeners,
  applyCategoryOverridesToRecords,
  applyCategoryOverridesToSubmissions,
  formatWhatsAppPhone,
  getWhatsAppRsvpReminderLink,
  getWhatsAppSaveTheDateLink,
  getWhatsAppInvitationLink,
  applyNotificationReadState,
  getEffectiveMemberStatus,
  isPreDeclinedConfirmation,
  buildPreDeclinedSubmissionFromGuest,
  computeUnifiedRsvpStats,
  setAdminMemberOrFamilyAttendance,
  getStoredPlannerContact,
  saveStoredPlannerContact,
  formatPlannerContactMention,
  type PlannerContactInfo,
  type GuestCategory,
  type MemberAttendanceStatus,
} from "@/lib/guestList";
import GuestCategoryEditorModal from "@/components/GuestCategoryEditorModal";
import GuestCrudModal from "@/components/GuestCrudModal";
import ManualRsvpModal from "@/components/ManualRsvpModal";
import ReportsCenter from "@/components/ReportsCenter";
import { formatPhoneBR, phoneMatchesQuery } from "@/lib/phone";
import {
  DEFAULT_REPORT_MESAS,
  DEFAULT_REPORT_FORNECEDORES,
  DEFAULT_REPORT_ROTEIRO,
  DEFAULT_REPORT_CHECKLIST,
  type ReportMesaItem,
  type ReportFornecedorItem,
  type ReportRoteiroItem,
  type ReportChecklistItem,
} from "@/lib/reportGenerators";
import { playNotificationChime } from "../cerimonialista/page";
import { scanAndRestoreLocalBackups } from "@/lib/recoveryHelper";
import type { AuditLogEntry } from "@/lib/cloudDb";

const TABS = [
  { key: "geral", label: "Visão geral" },
  { key: "convidados", label: "Confirmações & Ausências" },
  { key: "lista_oficial", label: "Lista Oficial (Famílias)" },
  { key: "presentes", label: "Cotas & presentes" },
  { key: "recados", label: "Recados" },
  { key: "louvores", label: "Louvores" },
  { key: "relatorios", label: "Relatórios & PDF" },
  { key: "logs_backup", label: "Logs & Backup" },
] as const;

type Tab = (typeof TABS)[number]["key"];

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function getWhatsAppThankYouLink(phone?: string, guestName?: string, giftTitle?: string) {
  const formattedPhone = formatWhatsAppPhone(phone);
  if (!formattedPhone) return "";
  const firstName = guestName ? guestName.split(" ")[0] : "amigo(a)";
  const msg = encodeURIComponent(
    `Olá, ${firstName}! Aqui é a Anita e o Giuseppe.\n\nQueremos agradecer de coração pelo presente tão especial (${giftTitle || "que você nos enviou"})! Ficamos imensamente felizes com o seu carinho e generosidade para o início do nosso novo lar.\n\nQue Deus abençoe ricamente sua vida e família! Esperamos você no nosso grande dia! ❤️✨`
  );
  return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${msg}`;
}

export default function PainelNoivosPage() {
  const [hasEntered, setHasEntered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [noivosPinInput, setNoivosPinInput] = useState("0901");
  const [cerimonialPinInput, setCerimonialPinInput] = useState("2027");
  const [pinsUpdatedAt, setPinsUpdatedAt] = useState<string | null>(null);
  const [showPinsInSettings, setShowPinsInSettings] = useState(false);
  const [isSavingPins, setIsSavingPins] = useState(false);
  const [plannerContact, setPlannerContact] = useState<PlannerContactInfo>(getStoredPlannerContact());
  const [plannerNameInput, setPlannerNameInput] = useState(plannerContact.name);
  const [plannerPhoneInput, setPlannerPhoneInput] = useState(plannerContact.phone);
  const [isSavingPlanner, setIsSavingPlanner] = useState(false);
  const [cloudAssignments, setCloudAssignments] = useState<
    Record<string, { checkIn: boolean; mesaId: number | null; tipo?: GuestCategory }>
  >({});
  const [cloudMesas, setCloudMesas] = useState<ReportMesaItem[]>(DEFAULT_REPORT_MESAS);
  const [cloudFornecedores, setCloudFornecedores] = useState<ReportFornecedorItem[]>(
    DEFAULT_REPORT_FORNECEDORES
  );
  const [cloudRoteiro, setCloudRoteiro] = useState<ReportRoteiroItem[]>(DEFAULT_REPORT_ROTEIRO);
  const [cloudChecklist, setCloudChecklist] = useState<ReportChecklistItem[]>(
    DEFAULT_REPORT_CHECKLIST
  );
  const [tab, setTab] = useState<Tab>("geral");
  const [submissions, setSubmissions] = useState<RsvpSubmission[]>([]);
  const [notifications, setNotifications] = useState<RsvpNotification[]>([]);
  const [officialGuests, setOfficialGuests] = useState<GuestRecord[]>([]);
  const [songSuggestions, setSongSuggestions] = useState<SongSuggestion[]>([]);
  const [muralMessages, setMuralMessages] = useState<GuestMessage[]>([]);
  const [gifts, setGifts] = useState<GiftContribution[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [liveToast, setLiveToast] = useState<{
    title: string;
    description: string;
    isGift?: boolean;
  } | null>(null);
  const [importText, setImportText] = useState("");
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Estados da Aba de Presentes
  const [giftSearch, setGiftSearch] = useState("");
  const [giftFilter, setGiftFilter] = useState<
    "todos" | "pix_cota" | "pix_avulso" | "lista_amazon" | "pendente_agradecer"
  >("todos");
  const [giftModalOpen, setGiftModalOpen] = useState(false);
  const [editingGift, setEditingGift] = useState<GiftContribution | null>(null);
  const [giftForm, setGiftForm] = useState<{
    guestName: string;
    phone: string;
    type: GiftType;
    giftTitle: string;
    cotaId: string;
    amount: string;
    message: string;
    confirmedAtBank: boolean;
    thanked: boolean;
  }>({
    guestName: "",
    phone: "",
    type: "pix_cota",
    giftTitle: "",
    cotaId: "",
    amount: "200",
    message: "",
    confirmedAtBank: true,
    thanked: false,
  });

  // Filtros da aba de convidados RSVP
  const [rsvpSearch, setRsvpSearch] = useState("");
  const [rsvpStatusFilter, setRsvpStatusFilter] = useState<"todos" | "confirmado" | "ausente">("todos");
  const [rsvpCategoryFilter, setRsvpCategoryFilter] = useState<"todos" | GuestCategory>("todos");
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  // Estados de CRUD da Lista Oficial de Convidados
  const [editingGuest, setEditingGuest] = useState<GuestRecord | null>(null);
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [officialSearch, setOfficialSearch] = useState("");
  const [officialCategoryFilter, setOfficialCategoryFilter] = useState<"todas" | GuestCategory>("todas");
  const [officialGroupFilter, setOfficialGroupFilter] = useState<string>("todos");
  const [officialStatusFilter, setOfficialStatusFilter] = useState<
    "todos" | "confirmados" | "ausentes" | "pendentes"
  >("todos");
  const [showImportBox, setShowImportBox] = useState(false);

  // Estados de Logs de Auditoria & Central de Backup
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [logSearch, setLogSearch] = useState("");
  const [logFilter, setLogFilter] = useState<string>("todos");
  const [cloudSnapshotSavedAt, setCloudSnapshotSavedAt] = useState<string>("");
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);

  // Estados de Confirmação Manual & Cobrança no WhatsApp
  const [manualRsvpOpen, setManualRsvpOpen] = useState(false);
  const [manualRsvpGuest, setManualRsvpGuest] = useState<GuestRecord | null>(null);
  const [manualRsvpMode, setManualRsvpMode] = useState<"confirm" | "decline">("confirm");

  const refreshData = () => {
    setSubmissions(getAllRsvpSubmissions());
    setNotifications(getRsvpNotifications());
    setOfficialGuests(getOfficialGuestList());
    setSongSuggestions(getSongSuggestions());
    setGifts(getGiftContributions());

    try {
      const stored = localStorage.getItem("anita_giuseppe_demo_guest_mural_v3");
      if (stored) {
        const parsed = JSON.parse(stored) as GuestMessage[];
        if (Array.isArray(parsed)) {
          setMuralMessages(parsed);
          return;
        }
      }
    } catch {
      // ignore
    }
    setMuralMessages([]);
  };

  const handleQuickPersonAttendance = (
    invitationId: string,
    memberName: string,
    targetStatus: MemberAttendanceStatus
  ) => {
    const fam = officialGuests.find((g) => g.id === invitationId);
    const existingSub = submissions.find((s) => s.invitationId === invitationId);
    const fallbackGuest: GuestRecord | undefined =
      fam ||
      (existingSub
        ? {
            id: existingSub.invitationId,
            primaryName: existingSub.primaryName,
            phone: existingSub.phone,
            familyMembers: existingSub.familyMembers.map((m) => ({
              name: m.name,
              type: m.type,
              phone: m.phone,
            })),
            maxGuests: existingSub.familyMembers.length,
            group: "Amigos",
          }
        : undefined);
    if (!fallbackGuest) return;

    setAdminMemberOrFamilyAttendance({
      family: fallbackGuest,
      existingSubmission: existingSub,
      memberName,
      targetStatus,
    });
    refreshData();
    setLiveToast({
      title:
        targetStatus === "ausente"
          ? "✕ Ausência Registrada na Nuvem"
          : targetStatus === "confirmado"
          ? "✓ Presença Confirmada na Nuvem"
          : "⏳ Status Retornado p/ Pendente",
      description: `${memberName} (${fallbackGuest.primaryName}) atualizado com sucesso.`,
    });
    setTimeout(() => setLiveToast(null), 4000);
  };

  const handleNewGuest = () => {
    setEditingGuest(null);
    setGuestModalOpen(true);
  };

  const handleEditGuest = (g: GuestRecord) => {
    setEditingGuest(g);
    setGuestModalOpen(true);
  };

  const handleDeleteGuest = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o convite da família de "${name}"? Esta ação removerá a família da lista oficial e do banco em nuvem.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/guests?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data?.guests && Array.isArray(data.guests)) {
        setOfficialGuests(data.guests);
        try {
          localStorage.setItem("anita_giuseppe_demo_official_guests_v4", JSON.stringify(data.guests));
        } catch {}
      } else {
        setOfficialGuests((prev) => {
          const updated = prev.filter((g) => g.id !== id);
          try {
            localStorage.setItem("anita_giuseppe_demo_official_guests_v4", JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
      notifySyncListeners("guests_updated");
      setLiveToast({
        title: "Convidado Excluído",
        description: `A família de ${name} foi removida da lista oficial.`,
      });
      setTimeout(() => setLiveToast(null), 5000);
    } catch {
      alert("Erro ao excluir convidado na nuvem.");
    }
  };

  const handleGuestSaved = (saved: GuestRecord) => {
    setOfficialGuests((prev) => {
      const exists = prev.some((g) => g.id === saved.id);
      const updated = exists ? prev.map((g) => (g.id === saved.id ? saved : g)) : [saved, ...prev];
      try {
        localStorage.setItem("anita_giuseppe_demo_official_guests_v4", JSON.stringify(updated));
      } catch {}
      return updated;
    });
    notifySyncListeners("guests_updated");
    setLiveToast({
      title: "✓ Convidado Salvo na Nuvem!",
      description: `A família de ${saved.primaryName} foi salva com sucesso no banco de dados.`,
    });
    setTimeout(() => setLiveToast(null), 5000);
  };

  useEffect(() => {
    setMounted(true);
    fetch("/api/admin-auth?role=noivos")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const authOk = Boolean(d?.authenticated);
        setIsAuthenticated(authOk);
        if (d?.pins) {
          setNoivosPinInput(d.pins.noivosPin || "0901");
          setCerimonialPinInput(d.pins.cerimonialPin || "2027");
          setPinsUpdatedAt(d.pins.updatedAt || null);
        }
        if (d?.plannerContact) {
          setPlannerContact(d.plannerContact);
          if (d.plannerContact.name) setPlannerNameInput(d.plannerContact.name);
          if (d.plannerContact.phone) setPlannerPhoneInput(d.plannerContact.phone);
        }
      })
      .catch(() => {})
      .finally(() => setIsAuthChecking(false));
  }, []);

  const handleLockPanel = async () => {
    try {
      await fetch("/api/admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout", role: "noivos" }),
      });
    } catch {}
    setIsAuthenticated(false);
    setHasEntered(false);
  };

  const handleSaveAdminPins = async () => {
    setIsSavingPins(true);
    try {
      const res = await fetch("/api/admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_pins",
          noivosPin: noivosPinInput.trim(),
          cerimonialPin: cerimonialPinInput.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data?.ok) {
        if (data.pins) {
          setNoivosPinInput(data.pins.noivosPin);
          setCerimonialPinInput(data.pins.cerimonialPin);
          setPinsUpdatedAt(data.pins.updatedAt || null);
        }
        setLiveToast({
          title: "🔐 Senhas (PIN) Atualizadas!",
          description: "Os novos PINs dos Noivos e da Cerimonialista foram salvos com segurança na nuvem.",
        });
        setTimeout(() => setLiveToast(null), 5000);
        fetch("/api/backup")
          .then((r) => (r.ok ? r.json() : null))
          .then((b) => {
            if (b?.logs) setAuditLogs(b.logs);
          })
          .catch(() => {});
      } else {
        alert(data?.error || "Não foi possível atualizar os PINs.");
      }
    } catch {
      alert("Erro de conexão ao salvar os PINs.");
    } finally {
      setIsSavingPins(false);
    }
  };

  const handleSavePlannerContact = () => {
    setIsSavingPlanner(true);
    const newContact: PlannerContactInfo = {
      name: plannerNameInput.trim(),
      phone: formatPhoneBR(plannerPhoneInput.trim()) || "(47) 98855-1243",
    };
    saveStoredPlannerContact(newContact);
    setPlannerContact(newContact);
    setLiveToast({
      title: "📞 Contato da Cerimonialista Atualizado!",
      description: `Nome: ${newContact.name || "Padrão"} · WhatsApp: ${newContact.phone}. As mensagens de lembrete agora usam esses dados.`,
    });
    setIsSavingPlanner(false);
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    refreshData();

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
        }
      })
      .catch(() => {});

    // Sincroniza em tempo real confirmações e presentes com o banco de dados em nuvem
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

      fetch("/api/gifts")
        .then((r) => {
          if (!r.ok) throw new Error("HTTP error " + r.status);
          return r.json();
        })
        .then((data) => {
          if (!data || data.ok === false) return;
          if (data?.gifts && Array.isArray(data.gifts)) {
            setGifts(data.gifts);
            try {
              localStorage.setItem("anita_giuseppe_demo_gifts_contributions_v2", JSON.stringify(data.gifts));
            } catch {
              // ignore
            }
          }
        })
        .catch(() => {});

      fetch("/api/backup")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.ok) {
            if (Array.isArray(data.logs)) setAuditLogs(data.logs);
            if (data.snapshot?.savedAt) setCloudSnapshotSavedAt(data.snapshot.savedAt);
          }
        })
        .catch(() => {});

      fetch("/api/sync")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.ok) {
            if (Array.isArray(data.mural) && data.mural.length > 0) {
              setMuralMessages(data.mural);
              try {
                localStorage.setItem("anita_giuseppe_demo_guest_mural_v3", JSON.stringify(data.mural));
              } catch {}
            }
            if (Array.isArray(data.songs) && data.songs.length > 0) {
              setSongSuggestions(data.songs);
              try {
                localStorage.setItem("anita_giuseppe_demo_song_suggestions_v2", JSON.stringify(data.songs));
              } catch {}
            }
            if (data.assignments && typeof data.assignments === "object") {
              setCloudAssignments(data.assignments);
            }
            if (Array.isArray(data.mesas) && data.mesas.length > 0) {
              setCloudMesas(data.mesas);
            }
            if (Array.isArray(data.fornecedores) && data.fornecedores.length > 0) {
              setCloudFornecedores(data.fornecedores);
            }
            if (Array.isArray(data.roteiro) && data.roteiro.length > 0) {
              setCloudRoteiro(data.roteiro);
            }
            if (Array.isArray(data.checklist) && data.checklist.length > 0) {
              setCloudChecklist(data.checklist);
            }
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
      refreshData();
      if (evt.type !== "notifications_read") {
        syncWithCloud();
      }
      if (evt.type === "rsvp_submitted" && evt.payload) {
        const notif = evt.payload as RsvpNotification;
        playNotificationChime(notif.answer === "sim");
        setLiveToast({
          title: "Novo RSVP Recebido!",
          description: `Família de ${notif.primaryName} — ${
            notif.answer === "sim"
              ? `${notif.confirmedNames?.length || (notif.adultsCount + notif.kidsCount)} confirmado(s) (${formatCategoryBreakdown({
                  idosos: notif.idososCount,
                  adultos: notif.adultsCount,
                  adolescentes: notif.adolescentesCount,
                  criancas: notif.kidsCount,
                  bebes: notif.bebesCount,
                })})`
              : "Comunicou ausência (Não vai)"
          }`,
        });
        setTimeout(() => setLiveToast(null), 8000);
      } else if (evt.type === "gift_submitted" && evt.payload) {
        const gift = evt.payload as GiftContribution;
        playNotificationChime(true);
        setLiveToast({
          title: "🎉 Novo Presente Recebido!",
          description: `${gift.guestName} enviou: ${gift.giftTitle}${
            gift.amount ? ` (${brl(gift.amount)})` : ""
          }`,
          isGift: true,
        });
        setTimeout(() => setLiveToast(null), 8000);
      }
    });

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      unsub();
    };
  }, [isAuthenticated]);

  const unreadCount = notifications.filter((n) => !n.readByNoivos).length;

  const markAllNotificationsRead = () => {
    markNotificationsAsRead("noivos", notifications);
    setNotifications((prev) => prev.map((n) => ({ ...n, readByNoivos: true })));
  };

  const handleNotificationClick = (n: RsvpNotification) => {
    if (!n.readByNoivos) {
      markSingleNotificationAsRead("noivos", n.id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, readByNoivos: true } : item))
      );
    }
  };

  // Detalhamento das 5 Categorias de Convidados
  const confirmedBreakdown = useMemo(() => {
    let idosos = 0;
    let adultos = 0;
    let adolescentes = 0;
    let criancas = 0;
    let bebes = 0;
    let totalConfirmados = 0;

    submissions.forEach((s) => {
      if (s.familyMembers && Array.isArray(s.familyMembers)) {
        s.familyMembers.forEach((m) => {
          if (getEffectiveMemberStatus(m) === "confirmado") {
            totalConfirmados++;
            const cat = normalizeGuestCategory(m.type);
            if (cat === "idoso") idosos++;
            else if (cat === "adolescente") adolescentes++;
            else if (cat === "crianca") criancas++;
            else if (cat === "bebe") bebes++;
            else adultos++;
          }
        });
      } else {
        adultos += s.adultsCount || 0;
        criancas += s.kidsCount || 0;
        totalConfirmados += (s.adultsCount || 0) + (s.kidsCount || 0);
      }
    });

    return { idosos, adultos, adolescentes, criancas, bebes, totalConfirmados };
  }, [submissions]);

  const unifiedStats = useMemo(
    () => computeUnifiedRsvpStats(officialGuests, submissions),
    [officialGuests, submissions]
  );

  const effectiveSubmissions = useMemo(() => {
    const subIds = new Set(submissions.map((s) => s.invitationId));
    const preDeclined = officialGuests
      .filter((g) => !subIds.has(g.id) && isPreDeclinedConfirmation(g.firstConfirmation))
      .map((g) => buildPreDeclinedSubmissionFromGuest(g));
    return [...submissions, ...preDeclined];
  }, [officialGuests, submissions]);

  const submissionByFamilyId = useMemo(() => {
    const map = new Map<string, RsvpSubmission>();
    effectiveSubmissions.forEach((s) => map.set(s.invitationId, s));
    return map;
  }, [effectiveSubmissions]);

  const totalConfirmedPeople = confirmedBreakdown.totalConfirmados;
  const totalConfirmedAdults = confirmedBreakdown.adultos;
  const totalConfirmedKids = confirmedBreakdown.criancas;
  const totalDeclinedPeople = unifiedStats.declinedPeople;
  const rsvpMessages = useMemo(
    () => submissions.filter((s) => s.message && s.message.trim().length > 0),
    [submissions]
  );

  // Estatísticas de Presentes
  const pixGifts = gifts.filter((g) => g.type === "pix_cota" || g.type === "pix_avulso");
  const storeGifts = gifts.filter((g) => g.type === "lista_amazon" || g.type === "presente_fisico");
  const totalPixAmount = pixGifts.reduce((acc, g) => acc + (g.amount || 0), 0);
  const totalStoreCount = storeGifts.length;
  const pendingThanksCount = gifts.filter((g) => !g.thanked).length;

  // Filtragem da Lista de Presentes
  const filteredGifts = useMemo(() => {
    return gifts.filter((g) => {
      if (giftFilter === "pix_cota" && g.type !== "pix_cota") return false;
      if (giftFilter === "pix_avulso" && g.type !== "pix_avulso") return false;
      if (
        giftFilter === "lista_amazon" &&
        g.type !== "lista_amazon" &&
        g.type !== "presente_fisico"
      ) {
        return false;
      }
      if (giftFilter === "pendente_agradecer" && g.thanked) return false;

      if (!giftSearch.trim()) return true;
      const q = giftSearch.trim().toLowerCase();
      return (
        g.guestName.toLowerCase().includes(q) ||
        g.giftTitle.toLowerCase().includes(q) ||
        phoneMatchesQuery(g.phone, q) ||
        (g.message && g.message.toLowerCase().includes(q)) ||
        (g.amount && String(g.amount).includes(q))
      );
    });
  }, [gifts, giftFilter, giftSearch]);

  // Filtragem da Lista Oficial de Convidados (CRUD)
  const filteredOfficialGuests = useMemo(() => {
    const q = cleanString(officialSearch);
    return officialGuests.filter((g) => {
      if (officialGroupFilter !== "todos" && g.group !== officialGroupFilter) return false;
      if (officialStatusFilter !== "todos") {
        const sub = submissionByFamilyId.get(g.id);
        const going = sub
          ? sub.familyMembers.filter((m) => getEffectiveMemberStatus(m) === "confirmado").length
          : 0;
        const absent = sub
          ? sub.familyMembers.filter((m) => getEffectiveMemberStatus(m) === "ausente").length
          : isPreDeclinedConfirmation(g.firstConfirmation)
          ? g.familyMembers.length
          : 0;
        const pending = sub
          ? sub.familyMembers.filter((m) => getEffectiveMemberStatus(m) === "aguardando").length
          : g.familyMembers.length - absent;
        if (officialStatusFilter === "confirmados" && going === 0) return false;
        if (officialStatusFilter === "ausentes" && absent === 0) return false;
        if (officialStatusFilter === "pendentes" && pending === 0) return false;
      }
      if (officialCategoryFilter !== "todas") {
        const hasCat = g.familyMembers.some((m) => {
          const mType = typeof m === "string" ? "adulto" : normalizeGuestCategory(m.type);
          return mType === officialCategoryFilter;
        });
        if (!hasCat) return false;
      }
      if (!q) return true;
      const matchPrimary = cleanString(g.primaryName).includes(q);
      const matchSurname = cleanString(g.familySurname || "").includes(q);
      const matchPhone = phoneMatchesQuery(g.phone, q);
      const matchMember = g.familyMembers.some((m) => {
        const mName = typeof m === "string" ? m : m.name;
        return cleanString(mName).includes(q);
      });
      return matchPrimary || matchSurname || matchPhone || matchMember;
    });
  }, [
    officialGuests,
    officialSearch,
    officialCategoryFilter,
    officialGroupFilter,
    officialStatusFilter,
    submissionByFamilyId,
  ]);

  const officialTotals = useMemo(() => {
    let idosos = 0;
    let adultos = 0;
    let adolescentes = 0;
    let criancas = 0;
    let bebes = 0;
    let totalPessoas = 0;
    officialGuests.forEach((g) => {
      g.familyMembers.forEach((m) => {
        totalPessoas++;
        const cat = typeof m === "string" ? "adulto" : normalizeGuestCategory(m.type);
        if (cat === "idoso") idosos++;
        else if (cat === "adulto") adultos++;
        else if (cat === "adolescente") adolescentes++;
        else if (cat === "crianca") criancas++;
        else if (cat === "bebe") bebes++;
      });
    });
    return { idosos, adultos, adolescentes, criancas, bebes, totalPessoas };
  }, [officialGuests]);

  // Ações de Presentes
  const handleOpenAddGift = () => {
    setEditingGift(null);
    setGiftForm({
      guestName: "",
      phone: "",
      type: "pix_cota",
      giftTitle: `Cota: ${COTAS[0].title}`,
      cotaId: COTAS[0].id,
      amount: String(COTAS[0].value),
      message: "",
      confirmedAtBank: true,
      thanked: false,
    });
    setGiftModalOpen(true);
  };

  const handleEditGift = (gift: GiftContribution) => {
    setEditingGift(gift);
    setGiftForm({
      guestName: gift.guestName,
      phone: gift.phone || "",
      type: gift.type,
      giftTitle: gift.giftTitle,
      cotaId: gift.cotaId || "",
      amount: gift.amount ? String(gift.amount) : "",
      message: gift.message || "",
      confirmedAtBank: gift.confirmedAtBank,
      thanked: gift.thanked,
    });
    setGiftModalOpen(true);
  };

  const handleSaveGiftForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!giftForm.guestName.trim()) return;

    const numAmount = parseFloat(giftForm.amount.replace(/[^\d.,]/g, "").replace(",", ".")) || undefined;

    if (editingGift) {
      updateGiftContribution(editingGift.id, {
        guestName: giftForm.guestName.trim(),
        phone: giftForm.phone.trim() || undefined,
        type: giftForm.type,
        giftTitle: giftForm.giftTitle.trim() || "Presente especial",
        cotaId: giftForm.cotaId || undefined,
        amount: numAmount,
        message: giftForm.message.trim() || undefined,
        confirmedAtBank: giftForm.confirmedAtBank,
        thanked: giftForm.thanked,
      });
    } else {
      addGiftContribution({
        guestName: giftForm.guestName.trim(),
        phone: giftForm.phone.trim() || undefined,
        type: giftForm.type,
        giftTitle: giftForm.giftTitle.trim() || "Presente especial",
        cotaId: giftForm.cotaId || undefined,
        amount: numAmount,
        message: giftForm.message.trim() || undefined,
        confirmedAtBank: giftForm.confirmedAtBank,
        thanked: giftForm.thanked,
      });
    }

    refreshData();
    setGiftModalOpen(false);
  };

  const handleDeleteGift = (id: string) => {
    if (confirm("Deseja realmente remover este registro de presente?")) {
      deleteGiftContribution(id);
      refreshData();
    }
  };

  const handleToggleBank = (gift: GiftContribution) => {
    updateGiftContribution(gift.id, { confirmedAtBank: !gift.confirmedAtBank });
    refreshData();
  };

  const handleToggleThanked = (gift: GiftContribution) => {
    updateGiftContribution(gift.id, { thanked: !gift.thanked });
    refreshData();
  };

  const exportGiftsCSV = () => {
    const esc = (v: string | number | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [
      [
        "Quem Presenteou",
        "Telefone",
        "Tipo",
        "Presente / Cota",
        "Valor (R$)",
        "Status no Banco",
        "Agradecido",
        "Mensagem / Recado",
        "Data e Hora",
      ],
      ...gifts.map((g) => [
        g.guestName,
        g.phone || "",
        g.type === "pix_cota"
          ? "Cota via Pix"
          : g.type === "pix_avulso"
          ? "Pix Avulso"
          : g.type === "lista_amazon"
          ? "Lista Amazon"
          : "Presente Físico",
        g.giftTitle,
        g.amount ? g.amount.toFixed(2) : "",
        g.confirmedAtBank ? "Confirmado no Banco" : "Pendente",
        g.thanked ? "Sim" : "Não",
        g.message || "",
        g.date,
      ]),
    ].map((r) => r.map(esc).join(","));

    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: "presentes_e_cotas_anita_giuseppe_demo.csv",
    });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportCSV = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [
      [
        "ID Convite",
        "Chefe da Família",
        "Telefone",
        "Status",
        "Idosos (60+)",
        "Adultos",
        "Adolescentes",
        "Crianças",
        "Bebês",
        "Total Confirmados",
        "Ausentes",
        "Confirmados (com Categoria)",
        "Ausentes (Não vai)",
        "Mensagem",
        "Data/Hora",
      ],
      ...effectiveSubmissions.map((s) => {
        const going = s.familyMembers.filter((m) => getEffectiveMemberStatus(m) === "confirmado");
        const notGoing = s.familyMembers.filter((m) => getEffectiveMemberStatus(m) === "ausente");
        const bk = getBreakdownFromMembers(going.map((m) => ({ type: m.type, confirmed: true })));
        return [
          s.invitationId,
          s.primaryName,
          s.phone,
          going.length > 0 ? "Confirmado" : "Não irá comparecer",
          bk.idosos,
          bk.adultos,
          bk.adolescentes,
          bk.criancas,
          bk.bebes,
          going.length,
          notGoing.length,
          going
            .map((m) => `${m.name} (${GUEST_CATEGORIES[normalizeGuestCategory(m.type)].shortLabel})`)
            .join(", "),
          notGoing.map((m) => m.name).join(", "),
          s.message,
          s.timestamp,
        ];
      }),
    ].map((r) => r.map(esc).join(","));

    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: "confirmacoes_anita_giuseppe_demo.csv",
    });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportFullBackupJSON = () => {
    const nowStr = new Date().toISOString().slice(0, 10);
    const fullBundle = {
      version: "anita-giuseppe-demo-backup-v1",
      exportedAt: new Date().toLocaleString("pt-BR"),
      totalConfirmedPeople,
      totalConfirmedFamilies: submissions.length,
      submissions,
      notifications,
      guests: officialGuests,
      gifts,
      songSuggestions,
      muralMessages,
      logs: auditLogs,
    };
    const blob = new Blob([JSON.stringify(fullBundle, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: `backup_completo_casamento_anita_giuseppe_demo_${nowStr}.json`,
    });
    a.click();
    URL.revokeObjectURL(a.href);

    fetch("/api/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "log_export", format: "JSON Completo" }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.logs) setAuditLogs(d.logs);
      })
      .catch(() => {});

    setLiveToast({
      title: "💾 Backup Completo Salvo!",
      description: "Arquivo JSON com confirmações, recados, categorias, lista e presentes baixado com sucesso.",
    });
    setTimeout(() => setLiveToast(null), 5000);
  };

  const handleRestoreFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result || "{}"));
        if (!parsed.submissions && !parsed.guests) {
          alert("Arquivo de backup inválido.");
          return;
        }
        if (
          !confirm(
            `Deseja restaurar este backup (${parsed.submissions?.length || 0} famílias confirmadas e ${
              parsed.guests?.length || 0
            } convites)? Os dados serão sincronizados na nuvem e neste navegador.`
          )
        ) {
          return;
        }
        setIsRestoringBackup(true);
        const res = await fetch("/api/backup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "restore_json", backup: parsed }),
        });
        const data = await res.json();
        if (data?.ok) {
          if (Array.isArray(data.submissions) && data.submissions.length > 0) {
            const subs = applyCategoryOverridesToSubmissions(data.submissions);
            setSubmissions(subs);
            localStorage.setItem("anita_giuseppe_demo_all_rsvps_v4", JSON.stringify(subs));
          }
          if (Array.isArray(data.notifications) && data.notifications.length > 0) {
            setNotifications(data.notifications);
            localStorage.setItem("anita_giuseppe_demo_rsvp_notifications_v4", JSON.stringify(data.notifications));
          }
          if (Array.isArray(data.guests) && data.guests.length > 0) {
            const gList = applyCategoryOverridesToRecords(data.guests);
            setOfficialGuests(gList);
            localStorage.setItem("anita_giuseppe_demo_official_guests_v4", JSON.stringify(gList));
          }
          if (Array.isArray(data.gifts)) {
            setGifts(data.gifts);
            localStorage.setItem("anita_giuseppe_demo_gifts_contributions_v2", JSON.stringify(data.gifts));
          }
          if (Array.isArray(data.logs)) {
            setAuditLogs(data.logs);
          }
          setLiveToast({
            title: "✓ Backup Restaurado com Sucesso!",
            description: "Todos os dados do arquivo foram restaurados no banco em nuvem e no painel.",
          });
          setTimeout(() => setLiveToast(null), 6000);
        }
      } catch {
        alert("Não foi possível ler o arquivo de backup selecionado.");
      } finally {
        setIsRestoringBackup(false);
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreCloudSnapshot = async () => {
    if (
      !confirm(
        "Deseja restaurar a cópia de segurança automática salva na nuvem (Snapshot Blindado)?"
      )
    ) {
      return;
    }
    setIsRestoringBackup(true);
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore_cloud_snapshot" }),
      });
      const data = await res.json();
      if (data?.ok) {
        if (Array.isArray(data.submissions) && data.submissions.length > 0) {
          const subs = applyCategoryOverridesToSubmissions(data.submissions);
          setSubmissions(subs);
          localStorage.setItem("anita_giuseppe_demo_all_rsvps_v4", JSON.stringify(subs));
        }
        if (Array.isArray(data.notifications) && data.notifications.length > 0) {
          setNotifications(data.notifications);
          localStorage.setItem("anita_giuseppe_demo_rsvp_notifications_v4", JSON.stringify(data.notifications));
        }
        if (Array.isArray(data.guests) && data.guests.length > 0) {
          const gList = applyCategoryOverridesToRecords(data.guests);
          setOfficialGuests(gList);
          localStorage.setItem("anita_giuseppe_demo_official_guests_v4", JSON.stringify(gList));
        }
        if (Array.isArray(data.logs)) {
          setAuditLogs(data.logs);
        }
        setLiveToast({
          title: "✓ Cópia da Nuvem Restaurada!",
          description: "Os dados do Snapshot Automático da Nuvem foram restaurados com sucesso.",
        });
        setTimeout(() => setLiveToast(null), 6000);
      }
    } catch {
      alert("Erro ao restaurar snapshot da nuvem.");
    } finally {
      setIsRestoringBackup(false);
    }
  };

  const handleImportGuests = () => {
    if (!importText.trim()) return;
    const parsed = parseGuestListText(importText);
    if (parsed.length === 0) return;
    const updated = [...officialGuests, ...parsed];
    saveOfficialGuestList(updated);
    setOfficialGuests(updated);
    setImportText("");
    setImportSuccess(`${parsed.length} família(s) adicionada(s) com sucesso à Lista Oficial!`);
    setTimeout(() => setImportSuccess(null), 4000);
  };

  // Resumo Pronto para WhatsApp do Buffet Villa Imperial
  const handleCopyBuffetReport = () => {
    const confirmedList: { name: string; cat: GuestCategory; family: string }[] = [];
    submissions.forEach((s) => {
      if (s.answer === "sim" && Array.isArray(s.familyMembers)) {
        s.familyMembers.forEach((m) => {
          if (m.confirmed) {
            confirmedList.push({
              name: m.name,
              cat: normalizeGuestCategory(m.type),
              family: s.primaryName,
            });
          }
        });
      }
    });
    confirmedList.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

    const assentos =
      confirmedBreakdown.idosos +
      confirmedBreakdown.adultos +
      confirmedBreakdown.adolescentes +
      confirmedBreakdown.criancas;

    const text = [
      `🍽️ *RESUMO OFICIAL DE CONVIDADOS — CASAMENTO ANITA & GIUSEPPE*`,
      `📅 *Data:* 18/09/2027 · *Local:* Villa Imperial das Hortênsias`,
      `🕒 *Gerado em:* ${new Date().toLocaleString("pt-BR")}`,
      ``,
      `📊 *CONTAGEM POR FAIXA ETÁRIA (CONFIRMADOS):*`,
      `• 👵 Idosos (60+): *${confirmedBreakdown.idosos}*`,
      `• 👤 Adultos: *${confirmedBreakdown.adultos}*`,
      `• 🎒 Adolescentes: *${confirmedBreakdown.adolescentes}*`,
      `• 🧒 Crianças (Infantil): *${confirmedBreakdown.criancas}*`,
      `• 🍼 Bebês de colo (isento): *${confirmedBreakdown.bebes}*`,
      `--------------------------------`,
      `✅ *TOTAL DE PESSOAS CONFIRMADAS:* ${totalConfirmedPeople} pessoas (${submissions.filter((s) => s.answer === "sim").length} famílias)`,
      `🪑 *TOTAL DE ASSENTOS / BUFFET:* ${assentos} lugares`,
      ``,
      `📋 *LISTA NOMINAL (ORDEM ALFABÉTICA):*`,
      ...confirmedList.map(
        (p, idx) =>
          `${String(idx + 1).padStart(2, "0")}. ${p.name} — _${GUEST_CATEGORIES[p.cat].shortLabel}_`
      ),
    ].join("\n");

    navigator.clipboard.writeText(text).then(() => {
      setLiveToast({
        title: "📋 Resumo p/ Buffet Copiado!",
        description:
          "O relatório completo com contagens por faixa etária e lista nominal foi copiado. Basta colar no WhatsApp do Buffet!",
      });
      setTimeout(() => setLiveToast(null), 6000);
    });
  };

  // Folha de Recepção para Impressão / PDF
  const handlePrintReceptionList = () => {
    const confirmedList: {
      name: string;
      cat: GuestCategory;
      mesaLabel: string;
      family: string;
      phone: string;
      notes: string;
    }[] = [];
    submissions.forEach((s) => {
      if (s.answer === "sim" && Array.isArray(s.familyMembers)) {
        const officialFam = officialGuests.find((g) => g.id === s.invitationId);
        s.familyMembers.forEach((m) => {
          if (m.confirmed) {
            let mesaId: number | null = null;
            if (officialFam) {
              const memIdx = officialFam.familyMembers.findIndex(
                (fm) => cleanString(typeof fm === "string" ? fm : fm.name) === cleanString(m.name)
              );
              if (memIdx >= 0) {
                const rowId = `${officialFam.id}-${memIdx}`;
                mesaId = cloudAssignments[rowId]?.mesaId ?? null;
              }
            }
            confirmedList.push({
              name: m.name,
              cat: normalizeGuestCategory(m.type),
              mesaLabel: mesaId ? `Mesa ${String(mesaId).padStart(2, "0")}` : "—",
              family: s.primaryName,
              phone: s.phone || "",
              notes: s.message || "",
            });
          }
        });
      }
    });
    confirmedList.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

    const win = window.open("", "_blank", "width=950,height=800");
    if (!win) {
      alert("Permita pop-ups para visualizar e imprimir a Folha de Recepção.");
      return;
    }

    const rowsHtml = confirmedList
      .map(
        (p, idx) => `
        <tr>
          <td style="text-align:center;font-weight:bold;">[ &nbsp; ]</td>
          <td style="text-align:center;">${idx + 1}</td>
          <td style="font-weight:600;">${p.name}</td>
          <td>${GUEST_CATEGORIES[p.cat].shortLabel}</td>
          <td>${p.mesaLabel}</td>
          <td>${p.family}</td>
          <td>${p.phone}</td>
        </tr>`
      )
      .join("");

    win.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Lista de Recepção e Buffet — Casamento Anita & Giuseppe (18/09/2027)</title>
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
        <h1>Casamento Anita & Giuseppe · Lista Oficial de Recepção & Buffet</h1>
        <p class="sub">Data: 18 de Setembro de 2027 · Villa Imperial das Hortênsias (Petrópolis - RJ)</p>
        <div class="summary">
          <div><strong>Total Confirmados:</strong> ${totalConfirmedPeople}</div>
          <div><strong>👵 Idosos (60+):</strong> ${confirmedBreakdown.idosos}</div>
          <div><strong>👤 Adultos:</strong> ${confirmedBreakdown.adultos}</div>
          <div><strong>🎒 Adolescentes:</strong> ${confirmedBreakdown.adolescentes}</div>
          <div><strong>🧒 Crianças:</strong> ${confirmedBreakdown.criancas}</div>
          <div><strong>🍼 Bebês:</strong> ${confirmedBreakdown.bebes}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:55px;text-align:center;">Check</th>
              <th style="width:35px;text-align:center;">#</th>
              <th>Nome do Convidado</th>
              <th>Faixa Etária</th>
              <th>Mesa</th>
              <th>Titular da Família</th>
              <th>WhatsApp</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
      </html>
    `);
    win.document.close();
  };

  // Variáveis para o Gráfico Donut SVG de RSVP
  const chartTotal = Math.max(1, unifiedStats.totalPeople || 129);
  const circ = 2 * Math.PI * 52; // ~326.72
  const fConfirmados = totalConfirmedPeople / chartTotal;
  const lConfirmados = fConfirmados * circ;
  const fAusentes = totalDeclinedPeople / chartTotal;
  const lAusentes = fAusentes * circ;
  const fAguardando = Math.max(0, 1 - fConfirmados - fAusentes);
  const lAguardando = fAguardando * circ;

  // Variáveis para o Gráfico Donut de Presentes
  const totalGiftsAll = Math.max(1, gifts.length);
  const fCotasPix = gifts.filter((g) => g.type === "pix_cota").length / totalGiftsAll;
  const lCotasPix = fCotasPix * circ;
  const fPixAvulso = gifts.filter((g) => g.type === "pix_avulso").length / totalGiftsAll;
  const lPixAvulso = fPixAvulso * circ;
  const fLoja = storeGifts.length / totalGiftsAll;
  const lLoja = fLoja * circ;

  if (!mounted) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#FAF7F0]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C17767] border-t-transparent" />
          <p className="font-serif text-sm text-[#3E2723]">Carregando painel dos noivos...</p>
        </div>
      </div>
    );
  }

  if (!hasEntered || !isAuthenticated) {
    return (
      <PageCoverIntro
        imageSrc="/assets/og-painel-noivos.jpg"
        imageAlt="Painel dos Noivos · Anita & Giuseppe"
        badgeText="Área Exclusiva dos Noivos"
        title="Painel dos Noivos"
        subtitle="Confirmações de Presença (RSVP) · Mural de Fotos & Recados · Gestão de Presentes"
        buttonText="Acessar Painel"
        helperText="Acesso privado protegido por PIN exclusivo dos noivos"
        pinRole="noivos"
        isAuthenticated={isAuthenticated}
        isCheckingAuth={isAuthChecking}
        onPinUnlocked={(pins) => {
          setIsAuthenticated(true);
          if (pins) {
            setNoivosPinInput(pins.noivosPin || "0901");
            setCerimonialPinInput(pins.cerimonialPin || "2027");
            setPinsUpdatedAt(pins.updatedAt || null);
          }
        }}
        onEnter={() => setHasEntered(true)}
      />
    );
  }

  return (
    <AdminShell
      wide={true}
      role="Painel dos noivos"
      title="Anita & Giuseppe"
      tabs={TABS}
      active={tab}
      onTab={setTab}
      actions={
        <>
          <button
            type="button"
            onClick={() => setHasEntered(false)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#E8CBC3] bg-white px-3.5 text-[12px] font-semibold text-[#3E2723] hover:border-[#C17767] hover:text-[#C17767] cursor-pointer shadow-2xs"
            title="Voltar à capa inicial do painel"
          >
            <span>Ver Capa</span>
          </button>
          <button
            type="button"
            onClick={handleLockPanel}
            className="inline-flex h-9 items-center gap-1 rounded-full border border-[#E8CBC3] bg-[#FAF7F0] px-3 text-[12px] font-semibold text-[#6E5F57] hover:border-[#C17767] hover:text-[#C17767] cursor-pointer shadow-2xs"
            title="Trancar o painel e exigir PIN novamente neste aparelho"
          >
            <Lock size={12} />
            <span>Bloquear</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setShowNotifPanel((v) => !v);
              if (unreadCount > 0) {
                markAllNotificationsRead();
              }
            }}
            className="relative inline-flex h-9 items-center gap-1.5 rounded-full border border-[#E8CBC3] bg-white px-3.5 text-[12px] font-semibold text-[#3E2723] hover:border-[#C17767] cursor-pointer shadow-2xs"
            title="Ver e gerenciar notificações de confirmações e presentes"
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
            onClick={() => playNotificationChime(true)}
            title="Testar som de notificação"
            className="hidden sm:inline-flex h-9 items-center gap-1 rounded-full border border-line bg-white px-3 text-[11px] font-semibold text-muted hover:text-ink cursor-pointer"
          >
            <Sparkles size={13} className="text-[#C17767]" />
            Som
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
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#C17767] hover:bg-[#a96152] px-3.5 text-[12px] font-bold text-white cursor-pointer shadow-xs transition-colors"
            title="Abrir Central Oficial de Emissão de Relatórios (PDF, Impressão, Excel e WhatsApp)"
          >
            <FileText size={13} />
            <span>Relatórios & PDF</span>
          </button>
          <button type="button" onClick={exportFullBackupJSON} className={adminBtnPrimary} title="Baixar backup completo de segurança (.JSON)">
            💾 Baixar Backup
          </button>
          <button type="button" onClick={exportCSV} className={adminBtn}>
            Exportar RSVP (CSV)
          </button>
          <AdminLink href="/admin/cerimonialista">Painel da cerimonialista</AdminLink>
          <AdminLink href="/mesa">Página das Mesas (QR)</AdminLink>
          <AdminLink href="/">Ver convite</AdminLink>
        </>
      }
    >
      {/* Alerta em Tempo Real quando chega uma confirmação ou presente */}
      {liveToast && (
        <div className="rounded-2xl border-2 border-[#5F6F52] bg-[#F0F4ED] p-4 shadow-lg flex items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-white ${
                liveToast.isGift ? "bg-[#C17767]" : "bg-[#5F6F52]"
              }`}
            >
              {liveToast.isGift ? <Gift size={18} /> : <Bell size={18} />}
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#5F6F52]">
                {liveToast.title}
              </p>
              <p className="font-serif text-base font-semibold text-[#3E2723]">
                {liveToast.description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLiveToast(null)}
            className="text-xs font-semibold text-[#6E5F57] hover:text-[#3E2723] cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Painel expansível de Notificações */}
      {showNotifPanel && (
        <Panel
          title="Central de Notificações (RSVP & Presentes)"
          description="Todas as confirmações, comunicados de ausência e avisos de presentes recebidos."
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
            <p className="text-sm text-muted">
              Nenhuma notificação registrada ainda.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {notifications.map((n) => {
                const isUnread = !n.readByNoivos;
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
                          {n.answer === "sim" ? "Confirmou Presença" : "Comunicou Ausência"}
                        </span>
                        <span className="font-serif text-base font-semibold text-[#3E2723]">
                          Família de {n.primaryName}
                        </span>
                        <span className="text-xs text-muted">({n.phone})</span>
                      </div>
                      {n.confirmedNames.length > 0 && (
                        <p className="text-xs text-[#2D3D22]">
                          <strong>
                            Vai ({formatCategoryBreakdown({
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
                          <strong>Não vai ({n.declinedCount}):</strong> {n.declinedNames.join(", ")}
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

      {/* ABA 1 · VISÃO GERAL & DASHBOARD COMPLETO */}
      {tab === "geral" && (
        <>
          {/* Grid dos 5 KPIs Principais */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Stat
              label="Pessoas Confirmadas"
              value={totalConfirmedPeople}
              hint={formatCategoryBreakdown(confirmedBreakdown)}
            />
            <Stat
              label="Ausências Comunicadas"
              value={totalDeclinedPeople}
              hint={`${unifiedStats.familiesWithAnyAbsence} família(s) c/ baixa · ${effectiveSubmissions.length} responderam`}
            />
            <Stat
              label="Famílias na Lista"
              value={officialGuests.length}
              hint={`${unifiedStats.confirmedFamilies + unifiedStats.fullyDeclinedFamilies} definidas · ${unifiedStats.pendingFamilies} pendentes`}
            />
            <Stat
              label="Arrecadação em Pix"
              value={brl(totalPixAmount)}
              hint={`${pixGifts.length} Pix · ${totalStoreCount} itens na loja`}
            />
            <Stat
              label="Recados & Louvores"
              value={rsvpMessages.length + muralMessages.length + songSuggestions.length}
              hint={`${rsvpMessages.length + muralMessages.length} recados · ${songSuggestions.length} louvores`}
            />
          </div>

          {/* Card Detalhado das 5 Faixas Etárias (Buffet & Evento) */}
          <div className="rounded-3xl border border-[#E8CBC3] bg-[#FAF9F6] p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8CBC3]/60 pb-3">
              <div>
                <h3 className="font-serif text-lg font-semibold text-[#3E2723] flex items-center gap-2">
                  <span>Detalhamento por Categoria & Faixa Etária</span>
                  <span className="text-xs font-normal text-[#6E5F57]">(Buffet & Cerimonial)</span>
                </h3>
                <p className="text-xs text-[#6E5F57]">
                  Planejamento exato de quantidades para o buffet, assentos prioritários e recepção
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
                  title="Registrar não comparecimento de uma pessoa ou da família inteira"
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
                  title="Alterar faixa etária de qualquer convidado"
                >
                  ✏️ Editar Categorias
                </button>
                <span className="rounded-full bg-[#5F6F52] text-white px-3 py-1 text-xs font-bold shadow-2xs">
                  {totalConfirmedPeople} confirmados no total
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
                  {confirmedBreakdown.idosos}
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
                  {confirmedBreakdown.adultos}
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
                  {confirmedBreakdown.adolescentes}
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
                  {confirmedBreakdown.criancas}
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
                  {confirmedBreakdown.bebes}
                </p>
                <p className="text-[11px] text-pink-800/90 leading-tight">
                  Bebês de colo · Sem assento/buffet
                </p>
              </div>
            </div>
          </div>

          {/* Gráficos Visuais de Status e Presentes */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Gráfico 1: Confirmações de Presença (Donut SVG) */}
            <div className="lg:col-span-6 rounded-3xl border border-line/80 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div>
                  <h3 className="font-serif text-lg font-semibold text-[#3E2723]">
                    Status Geral das Confirmações
                  </h3>
                  <p className="text-xs text-muted">
                    Proporção de convidados confirmados, ausentes e aguardando resposta
                  </p>
                </div>
                <span className="rounded-full bg-[#FAF7F0] border border-[#E8CBC3] px-2.5 py-0.5 text-xs font-bold text-[#C17767]">
                  {chartTotal} pessoas
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
                <div className="relative h-44 w-44 shrink-0">
                  <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
                    <circle cx="70" cy="70" r="52" fill="none" stroke="#FAF7F0" strokeWidth="18" />
                    {/* Confirmados (Verde Musgo) */}
                    <circle
                      cx="70"
                      cy="70"
                      r="52"
                      fill="none"
                      stroke="#5F6F52"
                      strokeWidth="18"
                      strokeDasharray={`${lConfirmados} ${circ}`}
                      strokeDashoffset="0"
                      className="transition-all duration-700"
                    />
                    {/* Ausentes (Terracota) */}
                    <circle
                      cx="70"
                      cy="70"
                      r="52"
                      fill="none"
                      stroke="#C17767"
                      strokeWidth="18"
                      strokeDasharray={`${lAusentes} ${circ}`}
                      strokeDashoffset={`-${lConfirmados}`}
                      className="transition-all duration-700"
                    />
                    {/* Aguardando (Ouro / Bege) */}
                    <circle
                      cx="70"
                      cy="70"
                      r="52"
                      fill="none"
                      stroke="#D4A373"
                      strokeWidth="18"
                      strokeDasharray={`${lAguardando} ${circ}`}
                      strokeDashoffset={`-${lConfirmados + lAusentes}`}
                      className="transition-all duration-700"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="font-serif text-2xl font-bold text-[#3E2723]">
                      {totalConfirmedPeople}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#5F6F52]">
                      Confirmados
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-2.5 w-full text-xs">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#F0F4ED]">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[#5F6F52]" />
                      <span className="font-semibold text-[#5F6F52]">Confirmados (Vai)</span>
                    </div>
                    <span className="font-bold text-[#5F6F52] tabular-nums">
                      {totalConfirmedPeople} ({Math.round(fConfirmados * 100)}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#FDF0EE]">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[#C17767]" />
                      <span className="font-semibold text-[#C17767]">Ausentes (Não vai)</span>
                    </div>
                    <span className="font-bold text-[#C17767] tabular-nums">
                      {totalDeclinedPeople} ({Math.round(fAusentes * 100)}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#FAF7F0] border border-line">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[#D4A373]" />
                      <span className="font-semibold text-[#3E2723]">Aguardando Resposta</span>
                    </div>
                    <span className="font-bold text-[#3E2723] tabular-nums">
                      {Math.max(0, chartTotal - totalConfirmedPeople - totalDeclinedPeople)} (
                      {Math.round(fAguardando * 100)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Gráfico 2: Distribuição de Presentes & Cotas */}
            <div className="lg:col-span-6 rounded-3xl border border-line/80 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div>
                  <h3 className="font-serif text-lg font-semibold text-[#3E2723]">
                    Distribuição dos Presentes
                  </h3>
                  <p className="text-xs text-muted">
                    Divisão entre Cotas Pix, Pix Avulso e Itens Comprados da Loja
                  </p>
                </div>
                <span className="rounded-full bg-[#F0F4ED] border border-[#C8D4C0] px-2.5 py-0.5 text-xs font-bold text-[#5F6F52]">
                  {gifts.length} presentes
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
                <div className="relative h-44 w-44 shrink-0">
                  <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
                    <circle cx="70" cy="70" r="52" fill="none" stroke="#FAF7F0" strokeWidth="18" />
                    {/* Cotas Pix (Terracota) */}
                    <circle
                      cx="70"
                      cy="70"
                      r="52"
                      fill="none"
                      stroke="#C17767"
                      strokeWidth="18"
                      strokeDasharray={`${lCotasPix} ${circ}`}
                      strokeDashoffset="0"
                      className="transition-all duration-700"
                    />
                    {/* Pix Avulso (Verde Musgo) */}
                    <circle
                      cx="70"
                      cy="70"
                      r="52"
                      fill="none"
                      stroke="#5F6F52"
                      strokeWidth="18"
                      strokeDasharray={`${lPixAvulso} ${circ}`}
                      strokeDashoffset={`-${lCotasPix}`}
                      className="transition-all duration-700"
                    />
                    {/* Loja / Físicos (Marrom) */}
                    <circle
                      cx="70"
                      cy="70"
                      r="52"
                      fill="none"
                      stroke="#3E2723"
                      strokeWidth="18"
                      strokeDasharray={`${lLoja} ${circ}`}
                      strokeDashoffset={`-${lCotasPix + lPixAvulso}`}
                      className="transition-all duration-700"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="font-serif text-lg font-bold text-[#C17767]">
                      {brl(totalPixAmount)}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted">
                      Arrecadado
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-2.5 w-full text-xs">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#FDF0EE]">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[#C17767]" />
                      <span className="font-semibold text-[#C17767]">Cotas Simbólicas Pix</span>
                    </div>
                    <span className="font-bold text-[#C17767] tabular-nums">
                      {gifts.filter((g) => g.type === "pix_cota").length} cotas
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#F0F4ED]">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[#5F6F52]" />
                      <span className="font-semibold text-[#5F6F52]">Pix Valor Livre</span>
                    </div>
                    <span className="font-bold text-[#5F6F52] tabular-nums">
                      {gifts.filter((g) => g.type === "pix_avulso").length} pix
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#FAF7F0] border border-line">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[#3E2723]" />
                      <span className="font-semibold text-[#3E2723]">Lista Amazon / Loja</span>
                    </div>
                    <span className="font-bold text-[#3E2723] tabular-nums">
                      {totalStoreCount} itens
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Resumo Rápido dos Últimos Presentes Recebidos */}
          <Panel
            title="Últimos Presentes & Cotas Recebidos"
            description="Informações atualizadas sobre quem presenteou, qual item ou cota escolheu e valores."
            action={
              <button
                type="button"
                onClick={() => setTab("presentes")}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#C17767] hover:bg-[#B36858] px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer"
              >
                <Gift size={14} />
                Ver Todos os Presentes ↗
              </button>
            }
          >
            {gifts.length === 0 ? (
              <p className="text-sm text-muted">Nenhum presente registrado ainda no sistema.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {gifts.slice(0, 6).map((g) => (
                  <div
                    key={g.id}
                    className="rounded-2xl border border-line bg-[#FAF7F0]/60 p-4 space-y-2 hover:border-[#C17767] transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${
                          g.type === "pix_cota"
                            ? "bg-[#FDF0EE] text-[#C17767]"
                            : g.type === "pix_avulso"
                            ? "bg-[#F0F4ED] text-[#5F6F52]"
                            : "bg-[#3E2723] text-white"
                        }`}
                      >
                        {g.type === "pix_cota"
                          ? "Cota Pix"
                          : g.type === "pix_avulso"
                          ? "Pix Livre"
                          : "Lista Amazon"}
                      </span>
                      {g.amount && (
                        <span className="font-serif text-base font-bold text-[#C17767]">
                          {brl(g.amount)}
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="font-serif text-base font-semibold text-[#3E2723] leading-snug">
                        {g.guestName}
                      </p>
                      <p className="text-xs text-muted font-medium mt-0.5">{g.giftTitle}</p>
                    </div>

                    {g.message && (
                      <p className="text-xs italic text-[#6E5F57] line-clamp-2 bg-white/70 p-2 rounded-xl border border-line/60">
                        “{g.message}”
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[11px] text-muted border-t border-line/60">
                      <span>{g.date}</span>
                      <span
                        className={`font-semibold ${
                          g.thanked ? "text-[#5F6F52]" : "text-[#C17767]"
                        }`}
                      >
                        {g.thanked ? "✓ Agradecido" : "Agradecer pendente"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Últimas Respostas de RSVP */}
          <Panel
            title={`Respostas Recebidas (${effectiveSubmissions.length} Famílias · ${totalConfirmedPeople} Confirmados · ${totalDeclinedPeople} Ausências)`}
            description="Atualizado automaticamente assim que o convidado confirma ou tem ausência registrada."
            action={
              <button type="button" onClick={() => setTab("convidados")} className={adminBtn}>
                Ver Lista Completa de Convidados ↗
              </button>
            }
          >
            <RsvpSubmissionsTable
              submissions={effectiveSubmissions}
              onEditFamily={(invitationId, mode) => {
                const fam = officialGuests.find((g) => g.id === invitationId);
                if (fam) {
                  setManualRsvpGuest(fam);
                  setManualRsvpMode(mode);
                  setManualRsvpOpen(true);
                }
              }}
              onTogglePersonStatus={handleQuickPersonAttendance}
            />
          </Panel>
        </>
      )}

      {/* ABA 2 · CONFIRMAÇÕES & AUSÊNCIAS (RSVP DETALHADO) */}
      {tab === "convidados" && (
        <Panel
          title="Confirmações de Presença & Comunicados de Ausência"
          description={`${totalConfirmedPeople} confirmados (Vai) · ${totalDeclinedPeople} ausências contabilizadas (Não vai) · ${unifiedStats.pendingPeople} aguardando resposta.`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={rsvpStatusFilter}
                onChange={(e) => setRsvpStatusFilter(e.target.value as typeof rsvpStatusFilter)}
                className="h-10 rounded-full border border-line bg-white px-3.5 text-xs font-medium text-ink focus:outline-none cursor-pointer"
              >
                <option value="todos">Todos c/ Resposta ({effectiveSubmissions.length})</option>
                <option value="confirmado">
                  Confirmados - Vai ({unifiedStats.confirmedFamilies} fam. · {totalConfirmedPeople} pess.)
                </option>
                <option value="ausente">
                  Com Ausência - Não vai ({unifiedStats.familiesWithAnyAbsence} fam. · {totalDeclinedPeople} pess.)
                </option>
              </select>
              <select
                value={rsvpCategoryFilter}
                onChange={(e) => setRsvpCategoryFilter(e.target.value as typeof rsvpCategoryFilter)}
                className="h-10 rounded-full border border-line bg-white px-3.5 text-xs font-medium text-ink focus:outline-none cursor-pointer"
              >
                <option value="todos">Todas as Faixas Etárias</option>
                <option value="idoso">👵 Idosos (60+)</option>
                <option value="adulto">👤 Adultos</option>
                <option value="adolescente">🎒 Adolescentes</option>
                <option value="crianca">🧒 Crianças</option>
                <option value="bebe">🍼 Bebês</option>
              </select>
              <input
                value={rsvpSearch}
                onChange={(e) => setRsvpSearch(e.target.value)}
                placeholder="Buscar por titular, telefone ou convidado…"
                className="h-10 w-48 sm:w-64 rounded-full border border-line px-4 text-xs focus:border-[#C17767] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setManualRsvpGuest(null);
                  setManualRsvpMode("confirm");
                  setManualRsvpOpen(true);
                }}
                className="h-10 rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] text-white px-4 text-xs font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-2xs"
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
                className="h-10 rounded-full border border-[#E8CBC3] bg-[#FDF0EE] hover:bg-[#F9E0DC] text-[#C17767] px-3.5 text-xs font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                title="Registrar não comparecimento de pessoa ou família inteira"
              >
                ✕ Registrar Ausência
              </button>
              <button
                type="button"
                onClick={handleCopyBuffetReport}
                className="h-10 rounded-full border border-[#5F6F52]/40 bg-[#F0F4ED] hover:bg-[#E2ECDC] text-[#2D3D22] px-3.5 text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-1 shadow-2xs"
                title="Copiar resumo pronto para o WhatsApp do Buffet Villa Imperial"
              >
                📋 Resumo p/ Buffet
              </button>
              <button
                type="button"
                onClick={handlePrintReceptionList}
                className="h-10 rounded-full border border-[#E8CBC3] bg-white hover:bg-[#FAF7F0] text-[#3E2723] px-3.5 text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-1 shadow-2xs"
                title="Imprimir ou gerar PDF da lista de recepção"
              >
                🖨️ Lista Recepção (PDF)
              </button>
              <button
                type="button"
                onClick={() => setCategoryModalOpen(true)}
                className="h-10 rounded-full border border-[#D9CDB8] bg-[#FAF8F5] hover:bg-[#F5F0E6] text-[#8C6D3B] px-3.5 text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                title="Editar categorias dos convidados"
              >
                ✏️ Editar Categorias
              </button>
              <button type="button" onClick={exportCSV} className={adminBtnPrimary}>
                Baixar planilha CSV
              </button>
            </div>
          }
        >
          {effectiveSubmissions.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma resposta registrada ainda no sistema.</p>
          ) : (
            <RsvpSubmissionsTable
              submissions={effectiveSubmissions.filter((s) => {
                const hasGoing = s.familyMembers.some(
                  (m) => getEffectiveMemberStatus(m) === "confirmado"
                );
                const hasAbsent = s.familyMembers.some(
                  (m) => getEffectiveMemberStatus(m) === "ausente"
                );
                if (rsvpStatusFilter === "confirmado" && !hasGoing) return false;
                if (rsvpStatusFilter === "ausente" && !hasAbsent) return false;
                if (rsvpCategoryFilter !== "todos") {
                  const hasCat = s.familyMembers.some(
                    (m) =>
                      (rsvpStatusFilter === "ausente"
                        ? getEffectiveMemberStatus(m) === "ausente"
                        : getEffectiveMemberStatus(m) === "confirmado") &&
                      normalizeGuestCategory(m.type) === rsvpCategoryFilter
                  );
                  if (!hasCat) return false;
                }
                if (rsvpSearch.trim()) {
                  const q = rsvpSearch.trim().toLowerCase();
                  return (
                    s.primaryName.toLowerCase().includes(q) ||
                    phoneMatchesQuery(s.phone, q) ||
                    s.familyMembers.some((m) => m.name.toLowerCase().includes(q))
                  );
                }
                return true;
              })}
              onEditFamily={(invitationId, mode) => {
                const fam = officialGuests.find((g) => g.id === invitationId);
                if (fam) {
                  setManualRsvpGuest(fam);
                  setManualRsvpMode(mode);
                  setManualRsvpOpen(true);
                }
              }}
              onTogglePersonStatus={handleQuickPersonAttendance}
            />
          )}
        </Panel>
      )}

      {/* ABA 3 · LISTA OFICIAL (CRUD DE CONVIDADOS & FAMÍLIAS) */}
      {tab === "lista_oficial" && (
        <div className="space-y-6">
          {/* Cards de Resumo da Lista Oficial */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
            <div className="rounded-2xl border border-[#E8CBC3] bg-white p-3.5 shadow-2xs col-span-2 sm:col-span-1 lg:col-span-2 flex flex-col justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Total Cadastrado</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-serif text-3xl font-bold text-[#3E2723]">{officialGuests.length}</span>
                  <span className="text-xs text-muted">convites / famílias</span>
                </div>
              </div>
              <p className="text-xs text-[#5F6F52] font-semibold mt-2">
                👥 {officialTotals.totalPessoas} convidados no total
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3 space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900">👵 Idosos 60+</span>
              <p className="font-serif text-2xl font-bold text-amber-950">{officialTotals.idosos}</p>
              <p className="text-[10px] text-amber-800">Prioritários</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50/90 p-3 space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-800">👤 Adultos</span>
              <p className="font-serif text-2xl font-bold text-stone-900">{officialTotals.adultos}</p>
              <p className="text-[10px] text-stone-600">Buffet padrão</p>
            </div>

            <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-3 space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-900">🎒 Adolescentes</span>
              <p className="font-serif text-2xl font-bold text-sky-950">{officialTotals.adolescentes}</p>
              <p className="text-[10px] text-sky-800">Jovens</p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">🧒 Crianças</span>
              <p className="font-serif text-2xl font-bold text-emerald-950">{officialTotals.criancas}</p>
              <p className="text-[10px] text-emerald-800">Buffet infantil</p>
            </div>

            <div className="rounded-2xl border border-pink-200 bg-pink-50/80 p-3 space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-pink-900">🍼 Bebês</span>
              <p className="font-serif text-2xl font-bold text-pink-950">{officialTotals.bebes}</p>
              <p className="text-[10px] text-pink-800">De colo</p>
            </div>
          </div>

          {/* Painel Principal com CRUD e Filtros */}
          <Panel
            title={`Gerenciamento Oficial de Convidados (${filteredOfficialGuests.length} de ${officialGuests.length} Famílias)`}
            description="Cadastre novos convidados, edite qualquer dado (nomes, telefone, integrantes e faixas etárias) ou exclua convites com sincronização imediata na nuvem."
            action={
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleNewGuest}
                  className="rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] text-white px-4 py-2 text-xs font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <Plus size={15} />
                  <span>Novo Convidado / Família</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(true)}
                  className="rounded-full border border-[#D9CDB8] bg-[#FAF8F5] hover:bg-[#F5F0E6] text-[#8C6D3B] px-3.5 py-2 text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                  title="Alterar faixa etária de pessoas em 1 clique"
                >
                  <Sparkles size={14} />
                  <span>Trocar Categorias em Massa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowImportBox(!showImportBox)}
                  className="rounded-full border border-line bg-white hover:bg-[#FAF7F0] text-muted hover:text-ink px-3.5 py-2 text-xs font-medium cursor-pointer transition-colors inline-flex items-center gap-1"
                >
                  <Upload size={13} />
                  <span>{showImportBox ? "Ocultar Importador" : "Importar em Lote"}</span>
                </button>
              </div>
            }
          >
            {/* Caixa retrátil de importação em lote */}
            {showImportBox && (
              <div className="mb-5 rounded-2xl border border-[#E8CBC3] bg-[#FAF7F0] p-4 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif text-sm font-semibold text-[#3E2723]">
                    Importar / Adicionar em Lote
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowImportBox(false)}
                    className="text-xs text-muted hover:text-[#3E2723]"
                  >
                    Fechar
                  </button>
                </div>
                {importSuccess && (
                  <div className="rounded-xl bg-[#F0F4ED] border border-[#C8D4C0] p-2.5 text-xs font-semibold text-[#5F6F52]">
                    ✓ {importSuccess}
                  </div>
                )}
                <textarea
                  rows={3}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`Exemplo:\nRoberto Almeida ; (47) 99333-4444 ; Cláudia Almeida, Beatriz Almeida (criança) ; Família do Noivo`}
                  className="w-full rounded-xl border border-[#E8CBC3] bg-white p-3 text-xs text-[#3E2723] focus:border-[#C17767] focus:outline-none"
                />
                <button type="button" onClick={handleImportGuests} className={adminBtnPrimary}>
                  <Upload size={13} className="mr-1.5" />
                  Processar e Salvar na Nuvem
                </button>
              </div>
            )}

            {/* Barra de Filtros e Busca de Convidados */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-4 border-b border-line/60">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative flex-1 min-w-[220px] max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={15} />
                  <input
                    type="text"
                    value={officialSearch}
                    onChange={(e) => setOfficialSearch(e.target.value)}
                    placeholder="Buscar por nome do titular, familiar ou telefone..."
                    className="w-full rounded-full border border-line bg-white pl-9 pr-4 py-2 text-xs text-ink focus:border-[#C17767] focus:outline-none shadow-2xs"
                  />
                  {officialSearch && (
                    <button
                      type="button"
                      onClick={() => setOfficialSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink text-xs"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <select
                  value={officialStatusFilter}
                  onChange={(e) =>
                    setOfficialStatusFilter(e.target.value as typeof officialStatusFilter)
                  }
                  className="h-9 rounded-full border border-line bg-white px-3 text-xs font-medium text-ink focus:outline-none cursor-pointer"
                >
                  <option value="todos">Todos os Status RSVP</option>
                  <option value="confirmados">✓ Com Confirmados ({unifiedStats.confirmedFamilies})</option>
                  <option value="ausentes">✕ Com Ausências ({unifiedStats.familiesWithAnyAbsence})</option>
                  <option value="pendentes">⏳ Com Pendentes ({unifiedStats.pendingFamilies})</option>
                </select>

                <select
                  value={officialCategoryFilter}
                  onChange={(e) => setOfficialCategoryFilter(e.target.value as typeof officialCategoryFilter)}
                  className="h-9 rounded-full border border-line bg-white px-3 text-xs font-medium text-ink focus:outline-none cursor-pointer"
                >
                  <option value="todas">Todas as Categorias</option>
                  <option value="idoso">👵 Com Idosos (60+)</option>
                  <option value="adulto">👤 Com Adultos</option>
                  <option value="adolescente">🎒 Com Adolescentes</option>
                  <option value="crianca">🧒 Com Crianças</option>
                  <option value="bebe">🍼 Com Bebês</option>
                </select>

                <select
                  value={officialGroupFilter}
                  onChange={(e) => setOfficialGroupFilter(e.target.value)}
                  className="h-9 rounded-full border border-line bg-white px-3 text-xs font-medium text-ink focus:outline-none cursor-pointer"
                >
                  <option value="todos">Todos os Grupos</option>
                  <option value="Família do Noivo">Família do Noivo</option>
                  <option value="Família da Noiva">Família da Noiva</option>
                  <option value="Amigos">Amigos</option>
                  <option value="Padrinhos">Padrinhos</option>
                </select>
              </div>

              <span className="text-xs text-muted">
                Mostrando <strong>{filteredOfficialGuests.length}</strong> famílias
              </span>
            </div>

            {/* Tabela Oficial de Convidados */}
            {filteredOfficialGuests.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted">
                Nenhum convidado encontrado com os termos de busca selecionados.
              </div>
            ) : (
              <Table head={["Titular do Convite", "Família", "WhatsApp / Telefone", "Integrantes (Status & Categoria)", "Status RSVP / 1ª Conf.", "Observações", "Ações"]}>
                {filteredOfficialGuests.map((g) => {
                  const surname = g.familySurname || extractSurname(g.primaryName);
                  const formattedP = formatWhatsAppPhone(g.phone);
                  const waLink = formattedP ? `https://wa.me/${formattedP}` : null;
                  const famSub = submissionByFamilyId.get(g.id);
                  const famGoing = famSub
                    ? famSub.familyMembers.filter((m) => getEffectiveMemberStatus(m) === "confirmado").length
                    : 0;
                  const famAbsent = famSub
                    ? famSub.familyMembers.filter((m) => getEffectiveMemberStatus(m) === "ausente").length
                    : isPreDeclinedConfirmation(g.firstConfirmation)
                    ? g.familyMembers.length
                    : 0;

                  return (
                    <tr key={g.id}>
                      <td className="py-3 pr-4">
                        <div className="font-semibold text-sm text-[#3E2723]">{g.primaryName}</div>
                        <div className="text-[10px] text-muted flex items-center gap-1 mt-0.5">
                          <span className="rounded-md bg-stone-100 px-1.5 py-0.2 font-medium">{g.group}</span>
                          <span>·</span>
                          <span className="font-mono">{g.id}</span>
                        </div>
                      </td>

                      <td className="py-3 pr-4 font-semibold text-xs text-[#C17767]">{surname}</td>

                      <td className="py-3 pr-4 tabular-nums text-xs font-mono">
                        {waLink ? (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#5F6F52] hover:underline font-medium inline-flex items-center gap-1"
                            title="Conversar no WhatsApp"
                          >
                            <span>{formatPhoneBR(g.phone)}</span>
                            <ArrowUpRight size={11} />
                          </a>
                        ) : (
                          <span className="text-muted">{formatPhoneBR(g.phone) || "—"}</span>
                        )}
                      </td>

                      <td className="py-3 pr-4 text-xs">
                        <div className="flex flex-wrap gap-1.5">
                          {g.familyMembers.map((m, idx) => {
                            const memName = typeof m === "string" ? m : m.name;
                            const memType = typeof m === "string" ? "adulto" : normalizeGuestCategory(m.type);
                            const cat = GUEST_CATEGORIES[memType];
                            const matchedSubMem = famSub?.familyMembers.find(
                              (sm) => cleanString(sm.name) === cleanString(memName)
                            );
                            const memStatus: MemberAttendanceStatus = matchedSubMem
                              ? getEffectiveMemberStatus(matchedSubMem)
                              : isPreDeclinedConfirmation(g.firstConfirmation) ||
                                (typeof m !== "string" && isPreDeclinedConfirmation(m.firstConfirmation))
                              ? "ausente"
                              : "aguardando";

                            return (
                              <span
                                key={idx}
                                className={`inline-flex items-center gap-1.5 rounded-xl border px-2 py-1 text-xs shadow-2xs ${
                                  memStatus === "confirmado"
                                    ? "bg-[#F0F4ED]/60 border-[#C8D4C0]"
                                    : memStatus === "ausente"
                                    ? "bg-[#FDF0EE]/70 border-[#E8CBC3]"
                                    : "bg-white border-[#E8CBC3]"
                                }`}
                              >
                                <span
                                  className={`font-semibold ${
                                    memStatus === "ausente"
                                      ? "text-[#8D5B50] line-through"
                                      : "text-[#3E2723]"
                                  }`}
                                >
                                  {memName}
                                </span>
                                <select
                                  value={memType}
                                  onChange={(e) => {
                                    const newCat = e.target.value as GuestCategory;
                                    updatePersonCategory({
                                      guestName: memName,
                                      newCategory: newCat,
                                      invitationId: g.id,
                                    });
                                    refreshData();
                                  }}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer focus:outline-none ${cat.badgeBg} ${cat.badgeText} ${cat.badgeBorder}`}
                                  title="Clique para alterar a faixa etária deste familiar"
                                >
                                  <option value="idoso">👵 Idoso (60+)</option>
                                  <option value="adulto">👤 Adulto</option>
                                  <option value="adolescente">🎒 Adolescente</option>
                                  <option value="crianca">🧒 Criança</option>
                                  <option value="bebe">🍼 Bebê</option>
                                </select>
                                {memStatus !== "confirmado" && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleQuickPersonAttendance(g.id, memName, "confirmado")
                                    }
                                    className="grid h-5 w-5 place-items-center rounded-full bg-[#F0F4ED] hover:bg-[#5F6F52] text-[#5F6F52] hover:text-white border border-[#C8D4C0] cursor-pointer transition-colors"
                                    title={`Confirmar presença apenas de ${memName}`}
                                  >
                                    <Check size={11} />
                                  </button>
                                )}
                                {memStatus !== "ausente" && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleQuickPersonAttendance(g.id, memName, "ausente")
                                    }
                                    className="grid h-5 w-5 place-items-center rounded-full bg-[#FDF0EE] hover:bg-[#C17767] text-[#C17767] hover:text-white border border-[#E8CBC3] cursor-pointer transition-colors"
                                    title={`Registrar não comparecimento apenas de ${memName}`}
                                  >
                                    <X size={11} />
                                  </button>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      <td className="py-3 pr-4">
                        <div className="flex flex-col items-start gap-1">
                          {famGoing > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#F0F4ED] border border-[#C8D4C0] px-2.5 py-0.5 text-[10px] font-bold text-[#5F6F52]">
                              ✓ {famGoing} vão{famAbsent > 0 ? ` · ${famAbsent} não` : ""}
                            </span>
                          ) : famAbsent > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#FDF0EE] border border-[#E8CBC3] px-2.5 py-0.5 text-[10px] font-bold text-[#C17767]">
                              ✕ {famAbsent} não vão
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-900">
                              ⏳ Pendente no site
                            </span>
                          )}
                          <span className="text-[10px] text-muted">
                            1ª Conf.: <strong>{g.firstConfirmation || "PENDENTE"}</strong>
                          </span>
                        </div>
                      </td>

                      <td className="py-3 pr-4 text-xs min-w-[220px] max-w-sm">
                        {famSub?.message || g.plannerNotes ? (
                          <div className="rounded-lg border border-[#E8CBC3]/60 bg-[#FAF7F0] p-2.5 text-xs italic leading-relaxed text-[#3E2723] whitespace-pre-wrap break-words shadow-2xs">
                            “{famSub?.message || g.plannerNotes}”
                          </div>
                        ) : (
                          <span className="text-muted/60">—</span>
                        )}
                      </td>

                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setManualRsvpGuest(g);
                              setManualRsvpMode("confirm");
                              setManualRsvpOpen(true);
                            }}
                            className="rounded-xl bg-[#5F6F52] hover:bg-[#4E5C43] text-white px-2.5 py-1.5 text-xs font-bold cursor-pointer transition-colors inline-flex items-center gap-1 shadow-2xs"
                            title="Confirmar ou editar presença desta família pelo painel"
                          >
                            <Check size={13} />
                            <span>{famGoing > 0 ? "Presença" : "Confirmar"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setManualRsvpGuest(g);
                              setManualRsvpMode("decline");
                              setManualRsvpOpen(true);
                            }}
                            className="rounded-xl border border-[#E8CBC3] bg-[#FDF0EE] hover:bg-[#F9E0DC] text-[#C17767] px-2.5 py-1.5 text-xs font-bold cursor-pointer transition-colors inline-flex items-center gap-1 shadow-2xs"
                            title="Registrar não comparecimento desta família ou de algum integrante"
                          >
                            <X size={13} />
                            <span>Não vai</span>
                          </button>
                          {getWhatsAppSaveTheDateLink(g, plannerContact) && (
                            <a
                              href={getWhatsAppSaveTheDateLink(g, plannerContact)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-2.5 py-1.5 text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-2xs"
                              title="Enviar lembrete no WhatsApp para quem não fez a 1ª confirmação (Save the Date)"
                            >
                              <span>📅 Lembrete Save the Date</span>
                            </a>
                          )}
                          {getWhatsAppRsvpReminderLink(g, plannerContact) && (
                            <a
                              href={getWhatsAppRsvpReminderLink(g, plannerContact)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 px-2.5 py-1.5 text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-2xs"
                              title="Enviar lembrete no WhatsApp para quem ainda não confirmou presença no convite"
                            >
                              <MessageCircle size={13} />
                              <span>💌 Lembrete Convite</span>
                            </a>
                          )}
                          {getWhatsAppInvitationLink(g, plannerContact) && (
                            <a
                              href={getWhatsAppInvitationLink(g, plannerContact)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-xl border border-[#E8CBC3] bg-[#FDF0EE] hover:bg-[#F9E0DC] text-[#C17767] px-2.5 py-1.5 text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-2xs"
                              title="Enviar o convite oficial no WhatsApp com o link do site"
                            >
                              <span>💍 Enviar Convite</span>
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleEditGuest(g)}
                            className="rounded-xl border border-[#E8CBC3] bg-[#FAF7F0] hover:bg-[#F0E6E0] text-[#3E2723] px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-1 shadow-2xs"
                            title="Editar informações da família, adicionar/remover membros ou mudar categorias"
                          >
                            <Edit3 size={13} className="text-[#C17767]" />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteGuest(g.id, g.primaryName)}
                            className="grid h-8 w-8 place-items-center rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                            title="Excluir convite da lista oficial"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </Table>
            )}
          </Panel>
        </div>
      )}

      {/* ABA 4 · COTAS & PRESENTES RECEBIDOS (NOVO E COMPLETO) */}
      {tab === "presentes" && (
        <div className="space-y-6">
          {/* 4 KPIs de Presentes */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Total Arrecadado via Pix"
              value={brl(totalPixAmount)}
              hint={`${pixGifts.length} Pix registrados no total`}
            />
            <Stat
              label="Presentes Físicos / Loja"
              value={totalStoreCount}
              hint={`${totalStoreCount} itens comprados na Amazon / lojas`}
            />
            <Stat
              label="Pessoas que Presentearam"
              value={gifts.length}
              hint={`${gifts.length} contribuições carinhosas registradas`}
            />
            <Stat
              label="Agradecimentos Pendentes"
              value={pendingThanksCount}
              hint={
                pendingThanksCount === 0
                  ? "✓ Todos os presentes já foram agradecidos!"
                  : `${pendingThanksCount} pessoas para enviar agradecimento`
              }
            />
          </div>

          {/* Painel: As 6 Cotas Simbólicas e Contribuições por Cota */}
          <Panel
            title="Desempenho das Cotas Simbólicas"
            description="Acompanhe quantas pessoas contribuíram para cada uma das 6 cotas e os valores acumulados."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {COTAS.map((c) => {
                const cotaGifts = gifts.filter(
                  (g) => g.cotaId === c.id || g.giftTitle.toLowerCase().includes(c.title.toLowerCase())
                );
                const cotaTotal = cotaGifts.reduce((acc, g) => acc + (g.amount || 0), 0);
                const buyers = Array.from(new Set(cotaGifts.map((g) => g.guestName)));

                return (
                  <div
                    key={c.id}
                    className="overflow-hidden rounded-3xl border border-line bg-white shadow-2xs hover:border-[#C17767] hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative h-28 w-full overflow-hidden bg-[#FAF7F0]">
                        <Image src={c.image} alt={c.title} fill className="object-cover" sizes="300px" />
                        <span className="absolute top-2.5 right-2.5 rounded-full bg-white/95 px-2.5 py-0.5 text-xs font-bold text-[#C17767] shadow-xs">
                          {brl(c.value)} / cota
                        </span>
                      </div>

                      <div className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-serif text-base font-semibold text-[#3E2723] leading-snug">
                            {c.title}
                          </h4>
                          <span className="rounded-full bg-[#F0F4ED] px-2 py-0.5 text-[10px] font-bold text-[#5F6F52] shrink-0">
                            {cotaGifts.length} {cotaGifts.length === 1 ? "cota" : "cotas"}
                          </span>
                        </div>

                        <p className="text-xs text-muted leading-relaxed">{c.text}</p>

                        <div className="pt-2 border-t border-line/60 flex items-center justify-between text-xs">
                          <span className="text-muted">Total acumulado:</span>
                          <span className="font-serif text-base font-bold text-[#C17767]">
                            {brl(cotaTotal)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#FAF7F0] px-4 py-2.5 border-t border-line/60 text-xs">
                      {buyers.length === 0 ? (
                        <span className="text-muted italic text-[11px]">Nenhuma cota recebida ainda.</span>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="text-[10.5px] font-semibold text-[#5F6F52] block">
                            Quem presenteou:
                          </span>
                          <p className="text-[11px] text-[#3E2723] truncate">{buyers.join(", ")}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Tabela Interativa de Presentes Recebidos */}
          <Panel
            title="Lista de Presentes e Pix Recebidos"
            description="Pesquise por quem mandou, presente, valor, confirme no banco e envie mensagens de agradecimento."
            action={
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenAddGift}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer"
                >
                  <Plus size={14} />
                  Registrar Presente
                </button>
                <button type="button" onClick={exportGiftsCSV} className={adminBtn}>
                  Exportar Presentes (CSV)
                </button>
              </div>
            }
          >
            {/* Barra de Busca e Filtros por Abas */}
            <div className="space-y-3 mb-5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setGiftFilter("todos")}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                      giftFilter === "todos"
                        ? "bg-[#3E2723] text-white"
                        : "bg-white border border-line text-muted hover:border-ink/30"
                    }`}
                  >
                    Todos ({gifts.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setGiftFilter("pix_cota")}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                      giftFilter === "pix_cota"
                        ? "bg-[#C17767] text-white"
                        : "bg-white border border-line text-muted hover:border-ink/30"
                    }`}
                  >
                    Cotas Pix ({gifts.filter((g) => g.type === "pix_cota").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setGiftFilter("pix_avulso")}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                      giftFilter === "pix_avulso"
                        ? "bg-[#5F6F52] text-white"
                        : "bg-white border border-line text-muted hover:border-ink/30"
                    }`}
                  >
                    Pix Avulso ({gifts.filter((g) => g.type === "pix_avulso").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setGiftFilter("lista_amazon")}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                      giftFilter === "lista_amazon"
                        ? "bg-[#3E2723] text-white"
                        : "bg-white border border-line text-muted hover:border-ink/30"
                    }`}
                  >
                    Lista Amazon / Loja ({totalStoreCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setGiftFilter("pendente_agradecer")}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                      giftFilter === "pendente_agradecer"
                        ? "bg-[#D4A373] text-white font-bold"
                        : "bg-white border border-line text-[#C17767] hover:border-[#C17767]"
                    }`}
                  >
                    Agradecer Pendente ({pendingThanksCount})
                  </button>
                </div>

                <div className="relative w-full sm:w-72 shrink-0">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={giftSearch}
                    onChange={(e) => setGiftSearch(e.target.value)}
                    placeholder="Buscar quem mandou, presente, valor…"
                    className="w-full h-10 rounded-full border border-line bg-white pl-9 pr-4 text-xs text-[#3E2723] focus:border-[#C17767] focus:outline-none"
                  />
                  {giftSearch && (
                    <button
                      type="button"
                      onClick={() => setGiftSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-ink cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Tabela dos Presentes */}
            {filteredGifts.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted">
                {gifts.length === 0 ? (
                  <p>Nenhum presente registrado ainda. Clique em &quot;+ Registrar Presente&quot; acima para adicionar.</p>
                ) : (
                  <p>Nenhum presente encontrado com os filtros de busca aplicados.</p>
                )}
              </div>
            ) : (
              <Table
                head={[
                  "Quem Presenteou",
                  "Tipo",
                  "Presente / Cota",
                  "Valor (R$)",
                  "Mensagem",
                  "Status no Banco",
                  "Agradecimento",
                  "Data",
                  "Ações",
                ]}
              >
                {filteredGifts.map((g) => {
                  const waLink = getWhatsAppThankYouLink(g.phone, g.guestName, g.giftTitle);

                  return (
                    <tr key={g.id} className="hover:bg-[#FAF7F0]/40 transition-colors">
                      {/* Quem Presenteou */}
                      <td className="py-3.5 pr-4">
                        <div className="font-semibold text-sm text-[#3E2723]">{g.guestName}</div>
                        {g.phone && (
                          <div className="text-[11px] text-muted tabular-nums mt-0.5 flex items-center gap-1 font-mono">
                            <span>{formatPhoneBR(g.phone)}</span>
                            {waLink && (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Conversar no WhatsApp"
                                className="text-[#5F6F52] hover:text-[#4E5C43]"
                              >
                                <MessageCircle size={12} />
                              </a>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Tipo */}
                      <td className="py-3.5 pr-4 whitespace-nowrap">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            g.type === "pix_cota"
                              ? "bg-[#FDF0EE] text-[#C17767]"
                              : g.type === "pix_avulso"
                              ? "bg-[#F0F4ED] text-[#5F6F52]"
                              : g.type === "lista_amazon"
                              ? "bg-[#3E2723] text-white"
                              : "bg-[#FAF7F0] border border-[#E8CBC3] text-[#3E2723]"
                          }`}
                        >
                          {g.type === "pix_cota"
                            ? "Cota Pix"
                            : g.type === "pix_avulso"
                            ? "Pix Livre"
                            : g.type === "lista_amazon"
                            ? "Lista Amazon"
                            : "Presente Físico"}
                        </span>
                      </td>

                      {/* Presente / Cota */}
                      <td className="py-3.5 pr-4 font-medium text-xs text-[#3E2723] max-w-[200px]">
                        {g.giftTitle}
                      </td>

                      {/* Valor */}
                      <td className="py-3.5 pr-4 font-serif text-sm font-bold text-[#C17767] tabular-nums whitespace-nowrap">
                        {g.amount ? brl(g.amount) : "—"}
                      </td>

                      {/* Mensagem */}
                      <td className="py-3.5 pr-4 text-xs text-[#3E2723] min-w-[200px] max-w-sm">
                        {g.message ? (
                          <div className="rounded-lg border border-[#E8CBC3]/50 bg-[#FAF7F0] p-2 text-xs italic leading-relaxed whitespace-pre-wrap break-words">
                            “{g.message}”
                          </div>
                        ) : (
                          <span className="text-muted/60">—</span>
                        )}
                      </td>

                      {/* Status no Banco */}
                      <td className="py-3.5 pr-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleBank(g)}
                          title="Clique para alternar status financeiro"
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold transition-all cursor-pointer ${
                            g.confirmedAtBank
                              ? "bg-[#F0F4ED] text-[#5F6F52] hover:bg-[#E3EBDD]"
                              : "bg-[#FDF0EE] text-[#C17767] hover:bg-[#FBE4E0]"
                          }`}
                        >
                          {g.confirmedAtBank ? (
                            <>
                              <CheckCircle2 size={12} /> Confirmado
                            </>
                          ) : (
                            <>
                              <Clock size={12} /> Pendente
                            </>
                          )}
                        </button>
                      </td>

                      {/* Agradecimento */}
                      <td className="py-3.5 pr-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleThanked(g)}
                            title="Clique para alternar status de agradecimento"
                            className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold transition-all cursor-pointer ${
                              g.thanked
                                ? "bg-[#F0F4ED] text-[#5F6F52] hover:bg-[#E3EBDD]"
                                : "bg-[#FDF0EE] text-[#C17767] hover:bg-[#FBE4E0]"
                            }`}
                          >
                            {g.thanked ? "✓ Agradecido" : "Pendente"}
                          </button>

                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Agradecer no WhatsApp com mensagem carinhosa pronta"
                              className="inline-flex items-center gap-1 rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] px-2 py-0.5 text-[10px] font-bold text-white transition-all shadow-2xs"
                            >
                              <MessageCircle size={11} /> WhatsApp
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Data */}
                      <td className="py-3.5 pr-4 text-xs tabular-nums text-muted whitespace-nowrap">
                        {g.date}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 pr-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditGift(g)}
                            title="Editar presente"
                            className="p-1 text-muted hover:text-[#3E2723] rounded-md hover:bg-black/5 cursor-pointer"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteGift(g.id)}
                            title="Excluir registro"
                            className="p-1 text-muted hover:text-[#C17767] rounded-md hover:bg-[#FDF0EE] cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </Table>
            )}
          </Panel>

          {/* Modal de Criação / Edição de Presente */}
          {giftModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
              <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-line space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#C17767] text-white">
                      <Gift size={16} />
                    </span>
                    <h3 className="font-serif text-lg font-semibold text-[#3E2723]">
                      {editingGift ? "Editar Presente" : "Registrar Novo Presente Recebido"}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGiftModalOpen(false)}
                    className="grid h-8 w-8 place-items-center rounded-full text-muted hover:text-ink cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleSaveGiftForm} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-semibold text-[#3E2723] mb-1">
                      Quem Presenteou (Nome ou Família) *
                    </label>
                    <input
                      required
                      type="text"
                      value={giftForm.guestName}
                      onChange={(e) => setGiftForm({ ...giftForm, guestName: e.target.value })}
                      placeholder="Ex: Roberto Almeida & Cláudia"
                      className="w-full h-10 rounded-xl border border-line bg-white px-3 text-xs focus:border-[#C17767] focus:outline-none"
                    />
                    {/* Atalhos rápidos para preencher com nomes da lista oficial */}
                    {officialGuests.length > 0 && !giftForm.guestName && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="text-[10px] text-muted self-center">Sugestões:</span>
                        {officialGuests.slice(0, 4).map((og) => (
                          <button
                            key={og.id}
                            type="button"
                            onClick={() =>
                              setGiftForm({
                                ...giftForm,
                                guestName: og.primaryName,
                                phone: og.phone || "",
                              })
                            }
                            className="rounded-md bg-[#FAF7F0] border border-line px-1.5 py-0.5 text-[9.5px] text-[#3E2723] hover:border-[#C17767] cursor-pointer"
                          >
                            {og.primaryName}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-[#3E2723] mb-1">
                      Telefone / WhatsApp (para agradecer)
                    </label>
                    <input
                      type="text"
                      value={giftForm.phone}
                      onChange={(e) => setGiftForm({ ...giftForm, phone: e.target.value })}
                      placeholder="(47) 99999-9999"
                      className="w-full h-10 rounded-xl border border-line bg-white px-3 text-xs focus:border-[#C17767] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-[#3E2723] mb-1">
                        Tipo de Presente
                      </label>
                      <select
                        value={giftForm.type}
                        onChange={(e) => {
                          const t = e.target.value as GiftType;
                          let title = giftForm.giftTitle;
                          let amt = giftForm.amount;
                          if (t === "pix_cota") {
                            title = `Cota: ${COTAS[0].title}`;
                            amt = String(COTAS[0].value);
                          }
                          setGiftForm({
                            ...giftForm,
                            type: t,
                            giftTitle: title,
                            amount: amt,
                          });
                        }}
                        className="w-full h-10 rounded-xl border border-line bg-white px-3 text-xs focus:border-[#C17767] focus:outline-none cursor-pointer"
                      >
                        <option value="pix_cota">Cota via Pix</option>
                        <option value="pix_avulso">Pix Valor Livre</option>
                        <option value="lista_amazon">Item da Lista Amazon</option>
                        <option value="presente_fisico">Outro Presente Físico</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-[#3E2723] mb-1">
                        Valor em R$ (se aplicável)
                      </label>
                      <input
                        type="text"
                        value={giftForm.amount}
                        onChange={(e) => setGiftForm({ ...giftForm, amount: e.target.value })}
                        placeholder="Ex: 200"
                        className="w-full h-10 rounded-xl border border-line bg-white px-3 text-xs focus:border-[#C17767] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#3E2723] mb-1">
                      Presente / Cota
                    </label>
                    {giftForm.type === "pix_cota" ? (
                      <select
                        value={giftForm.giftTitle}
                        onChange={(e) => {
                          const chosen = COTAS.find((c) => `Cota: ${c.title}` === e.target.value);
                          setGiftForm({
                            ...giftForm,
                            giftTitle: e.target.value,
                            cotaId: chosen ? chosen.id : "",
                            amount: chosen ? String(chosen.value) : giftForm.amount,
                          });
                        }}
                        className="w-full h-10 rounded-xl border border-line bg-white px-3 text-xs focus:border-[#C17767] focus:outline-none cursor-pointer"
                      >
                        {COTAS.map((c) => (
                          <option key={c.id} value={`Cota: ${c.title}`}>
                            {c.title} — {brl(c.value)}
                          </option>
                        ))}
                      </select>
                    ) : giftForm.type === "lista_amazon" ? (
                      <select
                        value={giftForm.giftTitle}
                        onChange={(e) => setGiftForm({ ...giftForm, giftTitle: e.target.value })}
                        className="w-full h-10 rounded-xl border border-line bg-white px-3 text-xs focus:border-[#C17767] focus:outline-none cursor-pointer"
                      >
                        <option value="">Selecione o item da Amazon...</option>
                        {GIFTS.map((g, idx) => (
                          <option key={idx} value={g.title}>
                            {g.title.slice(0, 50)}...
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={giftForm.giftTitle}
                        onChange={(e) => setGiftForm({ ...giftForm, giftTitle: e.target.value })}
                        placeholder="Ex: Oferta de amor / Faqueiro Tramontina"
                        className="w-full h-10 rounded-xl border border-line bg-white px-3 text-xs focus:border-[#C17767] focus:outline-none"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-[#3E2723] mb-1">
                      Mensagem / Recado do Convidado
                    </label>
                    <textarea
                      rows={2}
                      value={giftForm.message}
                      onChange={(e) => setGiftForm({ ...giftForm, message: e.target.value })}
                      placeholder="Recado carinhoso deixado pelo convidado..."
                      className="w-full rounded-xl border border-line bg-white p-3 text-xs focus:border-[#C17767] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-line bg-[#FAF7F0] cursor-pointer hover:border-[#5F6F52]">
                      <input
                        type="checkbox"
                        checked={giftForm.confirmedAtBank}
                        onChange={(e) =>
                          setGiftForm({ ...giftForm, confirmedAtBank: e.target.checked })
                        }
                        className="h-4 w-4 rounded text-[#5F6F52] focus:ring-0"
                      />
                      <span className="font-semibold text-xs text-[#3E2723]">
                        Confirmado no Banco / Entregue
                      </span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-line bg-[#FAF7F0] cursor-pointer hover:border-[#5F6F52]">
                      <input
                        type="checkbox"
                        checked={giftForm.thanked}
                        onChange={(e) =>
                          setGiftForm({ ...giftForm, thanked: e.target.checked })
                        }
                        className="h-4 w-4 rounded text-[#5F6F52] focus:ring-0"
                      />
                      <span className="font-semibold text-xs text-[#3E2723]">
                        Já Envei Agradecimento
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                    <button
                      type="button"
                      onClick={() => setGiftModalOpen(false)}
                      className="rounded-full border border-line px-4 py-2 font-semibold text-muted hover:text-ink cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] px-5 py-2 font-bold text-white shadow-xs cursor-pointer"
                    >
                      {editingGift ? "Salvar Alterações" : "Cadastrar Presente"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA 5 · RECADOS & ÁLBUM */}
      {tab === "recados" && (
        <div className="space-y-6">
          <Panel
            title={`Recados dos Convidados nas Confirmações (${rsvpMessages.length})`}
            description="Mensagens de carinho enviadas pelas famílias ao confirmarem presença no convite."
          >
            {rsvpMessages.length === 0 ? (
              <p className="text-sm text-muted">Nenhum recado enviado junto às confirmações ainda.</p>
            ) : (
              <ul className="divide-y divide-line">
                {rsvpMessages.map((s) => {
                  const goingNames = s.familyMembers
                    .filter((m) => m.confirmed)
                    .map((m) => m.name)
                    .join(", ");
                  return (
                    <li key={s.invitationId} className="py-4 space-y-1.5">
                      <p className="font-serif text-lg italic text-[#3E2723] whitespace-pre-line">
                        “{s.message}”
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
                        <strong className="text-[#5F6F52] font-semibold">
                          Família de {s.primaryName}
                        </strong>
                        {goingNames && <span>({goingNames})</span>}
                        <span>·</span>
                        <span className="font-mono">{formatPhoneBR(s.phone)}</span>
                        <span>·</span>
                        <span className="tabular-nums">{s.timestamp}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel
            title="Mural de recados & Fotos (Capítulo 05)"
            description="Mensagens deixadas no mural do capítulo 05 e envio para nuvem."
            action={
              <a
                href={GOOGLE_DRIVE_PHOTOS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={adminBtn}
              >
                Abrir Pasta no Google Drive ↗
              </a>
            }
          >
            {muralMessages.length === 0 ? (
              <p className="text-sm text-muted">Nenhum recado avulso recebido no mural do capítulo 05.</p>
            ) : (
              <ul className="divide-y divide-line">
                {muralMessages.map((m, idx) => (
                  <li key={`${m.name}-${idx}`} className="py-4">
                    <p className="font-serif text-lg italic text-[#3E2723]">“{m.message}”</p>
                    <p className="mt-1 text-[12px] text-muted">
                      {m.name} {m.relation ? `(${m.relation})` : ""} · {m.date}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {/* ABA 6 · LOUVORES */}
      {tab === "louvores" && (
        <Panel title="Louvores da Playlist & Sugeridos" description="Indicações dos convidados (com link opcional).">
          <ul className="divide-y divide-line">
            {songSuggestions.map((s) => (
              <li key={s.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                <div>
                  <span className="inline-block rounded-full bg-[#F0F4ED] px-2 py-0.5 text-[10px] font-bold uppercase text-[#5F6F52] mr-2">
                    Nova Sugestão
                  </span>
                  <strong>{s.title}</strong>
                  {s.artist && <span className="text-muted"> — {s.artist}</span>}
                  <span className="ml-2 text-xs text-muted">({s.date})</span>
                </div>
                {s.link && (
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#C17767] hover:underline"
                  >
                    Abrir link da música <ExternalLink size={12} />
                  </a>
                )}
              </li>
            ))}
            {PLAYLIST.map((s) => (
              <li key={s.title} className="py-3 flex items-center justify-between gap-3 text-sm">
                <div>
                  {s.title} <span className="text-muted">— {s.artist}</span>
                </div>
                <a
                  href={s.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted hover:text-ink"
                >
                  Ouvir no YouTube ↗
                </a>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* ABA 7 · CENTRAL DE LOGS & BACKUP DE SEGURANÇA */}
      {tab === "logs_backup" && (
        <div className="space-y-6">
          {/* Painel de Segurança & Senhas (PIN) dos Painéis */}
          <Panel
            title="🔐 Segurança & Senhas de Acesso (PIN)"
            description="Gerencie os PINs exclusivos do Painel dos Noivos e do Portal da Cerimonialista. Ao trocar um PIN aqui, todos os aparelhos antigos precisam digitar a nova senha."
            action={
              <button
                type="button"
                onClick={() => setShowPinsInSettings((v) => !v)}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#E8CBC3] bg-white hover:bg-[#FAF7F0] px-3.5 text-xs font-semibold text-[#3E2723] cursor-pointer shadow-2xs"
              >
                {showPinsInSettings ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{showPinsInSettings ? "Ocultar PINs" : "Mostrar PINs"}</span>
              </button>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-end">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-[#3E2723]">
                  <KeyRound size={13} className="text-[#C17767]" />
                  <span>PIN Exclusivo dos Noivos (Master)</span>
                </label>
                <input
                  type={showPinsInSettings ? "text" : "password"}
                  value={noivosPinInput}
                  onChange={(e) => setNoivosPinInput(e.target.value)}
                  maxLength={16}
                  placeholder="Ex: 0901"
                  className="h-10 w-full rounded-xl border border-[#E8CBC3] bg-[#FAF7F0] px-3.5 font-mono text-sm font-bold tracking-widest text-[#3E2723] focus:border-[#C17767] focus:bg-white focus:outline-none"
                />
                <p className="text-[11px] text-muted">
                  Libera o Painel dos Noivos (presentes, Pix, backups) e também o da Cerimonialista.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-[#3E2723]">
                  <Lock size={13} className="text-[#5F6F52]" />
                  <span>PIN da Cerimonialista (Operacional)</span>
                </label>
                <input
                  type={showPinsInSettings ? "text" : "password"}
                  value={cerimonialPinInput}
                  onChange={(e) => setCerimonialPinInput(e.target.value)}
                  maxLength={16}
                  placeholder="Ex: 2027"
                  className="h-10 w-full rounded-xl border border-[#C8D4C0] bg-[#F0F4ED]/60 px-3.5 font-mono text-sm font-bold tracking-widest text-[#3E2723] focus:border-[#5F6F52] focus:bg-white focus:outline-none"
                />
                <p className="text-[11px] text-muted">
                  Libera apenas <code>/admin/cerimonialista</code> (sem acesso aos presentes/Pix dos noivos).
                </p>
              </div>

              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={handleSaveAdminPins}
                  disabled={isSavingPins}
                  className="h-10 w-full rounded-full bg-[#3E2723] hover:bg-[#2A1A17] text-white px-5 text-xs font-bold cursor-pointer transition-colors shadow-xs disabled:opacity-60"
                >
                  {isSavingPins ? "Salvando na nuvem..." : "💾 Salvar Novos PINs na Nuvem"}
                </button>
                <p className="text-[11px] text-muted text-center">
                  {pinsUpdatedAt
                    ? `Última alteração: ${pinsUpdatedAt}`
                    : "Usando PINs iniciais configurados (personalize quando quiser)"}
                </p>
              </div>
            </div>
          </Panel>

          {/* Painel do Contato da Cerimonialista para Lembretes no WhatsApp */}
          <Panel
            title="📞 Cerimonialista de Apoio aos Convidados (Mensagens no WhatsApp)"
            description="Configure o nome e telefone da cerimonialista que serão incluídos automaticamente nos lembretes de Save the Date, Confirmação de Presença e Convites Oficiais enviados aos convidados."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-end">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-[#3E2723]">
                  <span>Nome da Cerimonialista</span>
                </label>
                <input
                  type="text"
                  value={plannerNameInput}
                  onChange={(e) => setPlannerNameInput(e.target.value)}
                  placeholder="Ex: Giseli (ou deixe vazio para 'nossa cerimonialista')"
                  className="h-10 w-full rounded-xl border border-[#E8CBC3] bg-[#FAF7F0] px-3.5 text-sm font-semibold text-[#3E2723] focus:border-[#C17767] focus:bg-white focus:outline-none"
                />
                <p className="text-[11px] text-muted">
                  Nome exibido na frase: &ldquo;...falar com a nossa cerimonialista (Nome)...&rdquo;
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-[#3E2723]">
                  <span>WhatsApp / Telefone</span>
                </label>
                <input
                  type="text"
                  value={plannerPhoneInput}
                  onChange={(e) => setPlannerPhoneInput(formatPhoneBR(e.target.value))}
                  placeholder="Ex: (47) 98855-1243"
                  className="h-10 w-full rounded-xl border border-[#E8CBC3] bg-[#FAF7F0] px-3.5 font-mono text-sm font-semibold text-[#3E2723] focus:border-[#C17767] focus:bg-white focus:outline-none"
                />
                <p className="text-[11px] text-muted">
                  Telefone com DDD para os convidados tirarem dúvidas sobre hospedagem, trajes ou acesso.
                </p>
              </div>

              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={handleSavePlannerContact}
                  disabled={isSavingPlanner}
                  className="h-10 w-full rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] text-white px-5 text-xs font-bold cursor-pointer transition-colors shadow-xs disabled:opacity-60"
                >
                  {isSavingPlanner ? "Salvando..." : "💾 Salvar Contato da Cerimonialista"}
                </button>
                <p className="text-[11px] text-muted text-center">
                  Atualiza instantaneamente todos os botões de envio no WhatsApp
                </p>
              </div>
            </div>

            {/* Prévia ao vivo da mensagem */}
            <div className="mt-4 rounded-xl border border-[#E8CBC3]/60 bg-[#FAF7F0] p-3 text-xs text-[#3E2723] leading-relaxed">
              <span className="font-bold text-[#C17767]">Prévia do trecho no WhatsApp: </span>
              <em>
                &ldquo;Qualquer dúvida ou se precisar de ajuda, você também pode entrar em contato com{" "}
                <strong>{formatPlannerContactMention({ name: plannerNameInput, phone: plannerPhoneInput }).trim()}</strong>.&rdquo;
              </em>
            </div>
          </Panel>

          {/* Painel de Backup & Restauração */}
          <Panel
            title="Central de Backup Completo & Recuperação"
            description="Salve uma cópia integral de todos os dados do casamento (confirmações, recados, categorias, lista de famílias e presentes) ou restaure a qualquer momento."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Card 1: Baixar Backup JSON */}
              <div className="rounded-2xl border border-[#C8D4C0] bg-[#F0F4ED]/70 p-4 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <span className="inline-block rounded-full bg-[#5F6F52] text-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    Recomendado
                  </span>
                  <h4 className="font-serif text-base font-bold text-[#2D3D22]">
                    1. Baixar Backup Completo (.JSON)
                  </h4>
                  <p className="text-xs text-[#4A5840] leading-relaxed">
                    Salva no seu computador ou celular um arquivo único com todas as {submissions.length} famílias confirmadas ({totalConfirmedPeople} pessoas), recados, 35 categorias, {officialGuests.length} convites e presentes.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={exportFullBackupJSON}
                    className="rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] text-white px-4 py-2 text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                  >
                    💾 Baixar Backup (.JSON)
                  </button>
                  <button
                    type="button"
                    onClick={exportCSV}
                    className="rounded-full border border-[#5F6F52] bg-white hover:bg-[#F0F4ED] text-[#5F6F52] px-3.5 py-2 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    📊 Planilha (.CSV)
                  </button>
                </div>
              </div>

              {/* Card 2: Restaurar a partir de Arquivo */}
              <div className="rounded-2xl border border-[#E8CBC3] bg-[#FAF7F0] p-4 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <span className="inline-block rounded-full bg-[#C17767]/15 text-[#C17767] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    Restauração Local
                  </span>
                  <h4 className="font-serif text-base font-bold text-[#3E2723]">
                    2. Restaurar de Arquivo (.JSON)
                  </h4>
                  <p className="text-xs text-[#6E5F57] leading-relaxed">
                    Caso queira voltar para uma versão anterior que você baixou, selecione o arquivo <code>.json</code> abaixo e o painel restaurará tudo na nuvem.
                  </p>
                </div>
                <div>
                  <label className="inline-flex items-center gap-1.5 rounded-full border border-[#C17767] bg-white hover:bg-[#FDF0EE] text-[#C17767] px-4 py-2 text-xs font-bold cursor-pointer transition-colors shadow-2xs">
                    <Upload size={13} />
                    <span>{isRestoringBackup ? "Restaurando..." : "Selecionar Arquivo de Backup"}</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleRestoreFromFile}
                      disabled={isRestoringBackup}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Card 3: Snapshot Automático na Nuvem */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <span className="inline-block rounded-full bg-amber-200/80 text-amber-950 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    Proteção Automática Ativa
                  </span>
                  <h4 className="font-serif text-base font-bold text-amber-950">
                    3. Cópia Blindada na Nuvem
                  </h4>
                  <p className="text-xs text-amber-900/90 leading-relaxed">
                    A cada nova confirmação ou edição, o servidor grava automaticamente um espelho separado no banco.
                    {cloudSnapshotSavedAt && (
                      <span className="block mt-1 font-semibold">
                        Último espelho automático: {cloudSnapshotSavedAt}
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleRestoreCloudSnapshot}
                    disabled={isRestoringBackup}
                    className="rounded-full border border-amber-400 bg-white hover:bg-amber-100 text-amber-950 px-4 py-2 text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                  >
                    🛡️ Restaurar Espelho da Nuvem
                  </button>
                </div>
              </div>
            </div>
          </Panel>

          {/* Painel de Registro de Logs (Sem Login) */}
          <Panel
            title={`Registro de Logs & Histórico de Atividades (${auditLogs.length} eventos)`}
            description="Rastreamento automático de confirmações, recados, edições de categorias e backups — identifica dispositivo e origem automaticamente, mesmo sem login."
            action={
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  className="h-9 rounded-full border border-line bg-white px-3 text-xs font-medium text-ink focus:outline-none cursor-pointer"
                >
                  <option value="todos">Todos os Eventos</option>
                  <option value="rsvp_confirmado">✅ Confirmações de Presença</option>
                  <option value="rsvp_editado">✏️ Confirmações Atualizadas</option>
                  <option value="rsvp_ausencia">❌ Comunicados de Ausência</option>
                  <option value="categoria_alterada">🏷️ Trocas de Categoria</option>
                  <option value="convidado_salvo">👨‍👩‍👧‍👦 Cadastro / Edição de Família</option>
                  <option value="presente_recebido">🎁 Presentes Recebidos</option>
                  <option value="backup">💾 Backups & Restaurações</option>
                  <option value="seguranca">🔐 Acessos & Segurança (PIN)</option>
                </select>
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Buscar no log por nome, recado ou aparelho..."
                  className="h-9 w-56 sm:w-64 rounded-full border border-line bg-white px-3.5 text-xs focus:border-[#C17767] focus:outline-none"
                />
              </div>
            }
          >
            {auditLogs.length === 0 ? (
              <p className="text-sm text-muted">Nenhum evento registrado no histórico ainda.</p>
            ) : (
              <Table head={["Data / Hora", "Evento", "Quem / Família", "Descrição & Recado", "Aparelho / Origem"]}>
                {auditLogs
                  .filter((l) => {
                    if (logFilter === "backup") {
                      if (l.action !== "backup_exportado" && l.action !== "backup_restaurado") return false;
                    } else if (logFilter === "seguranca") {
                      if (
                        l.action !== "acesso_painel" &&
                        l.action !== "pin_alterado" &&
                        l.action !== "tentativa_pin_invalido"
                      ) {
                        return false;
                      }
                    } else if (logFilter !== "todos" && l.action !== logFilter) {
                      return false;
                    }
                    if (!logSearch.trim()) return true;
                    const q = logSearch.trim().toLowerCase();
                    return (
                      l.actor.toLowerCase().includes(q) ||
                      l.summary.toLowerCase().includes(q) ||
                      (l.details && l.details.toLowerCase().includes(q)) ||
                      (l.device && l.device.toLowerCase().includes(q))
                    );
                  })
                  .map((l) => {
                    const badgeMap: Record<string, { label: string; cls: string }> = {
                      rsvp_confirmado: { label: "Presença Confirmada", cls: "bg-[#F0F4ED] text-[#5F6F52] border-[#C8D4C0]" },
                      rsvp_editado: { label: "RSVP Atualizado", cls: "bg-sky-50 text-sky-900 border-sky-200" },
                      rsvp_ausencia: { label: "Ausência Comunicada", cls: "bg-[#FDF0EE] text-[#C17767] border-[#E8CBC3]" },
                      categoria_alterada: { label: "Categoria Alterada", cls: "bg-amber-50 text-amber-900 border-amber-200" },
                      convidado_salvo: { label: "Convite Salvo", cls: "bg-stone-100 text-stone-800 border-stone-300" },
                      convidado_removido: { label: "Convite Removido", cls: "bg-red-50 text-red-700 border-red-200" },
                      presente_recebido: { label: "Presente Recebido", cls: "bg-pink-50 text-pink-900 border-pink-200" },
                      backup_exportado: { label: "Backup Baixado", cls: "bg-emerald-50 text-emerald-900 border-emerald-200" },
                      backup_restaurado: { label: "Backup Restaurado", cls: "bg-purple-50 text-purple-900 border-purple-200" },
                      acesso_painel: { label: "Acesso liberado (PIN)", cls: "bg-teal-50 text-teal-900 border-teal-200" },
                      pin_alterado: { label: "PIN Atualizado", cls: "bg-indigo-50 text-indigo-900 border-indigo-200" },
                      tentativa_pin_invalido: { label: "PIN Incorreto", cls: "bg-red-100 text-red-900 border-red-300" },
                    };
                    const badge = badgeMap[l.action] || { label: l.action, cls: "bg-stone-100 text-stone-800 border-stone-200" };
                    return (
                      <tr key={l.id}>
                        <td className="py-3 pr-4 tabular-nums text-xs text-muted whitespace-nowrap">
                          {l.timestamp}
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3 pr-4 font-semibold text-xs text-[#3E2723]">
                          {l.actor}
                        </td>
                        <td className="py-3 pr-4 text-xs text-ink space-y-1">
                          <div>{l.summary}</div>
                          {l.details && (
                            <div className="italic text-[#5F6F52] bg-[#FAF7F0] border border-[#E8CBC3]/60 rounded-lg px-2.5 py-1.5 whitespace-pre-line">
                              {l.details}
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-xs text-muted whitespace-nowrap">
                          {l.device || "Convite Online"}
                        </td>
                      </tr>
                    );
                  })}
              </Table>
            )}
          </Panel>
        </div>
      )}

      {tab === "relatorios" && (
        <ReportsCenter
          bundle={{
            role: "noivos",
            officialGuests,
            submissions,
            mesas: cloudMesas,
            assignments: cloudAssignments,
            fornecedores: cloudFornecedores,
            roteiro: cloudRoteiro,
            checklist: cloudChecklist,
            gifts,
            muralMessages,
            songSuggestions,
          }}
          onReportEmitted={(title, format) => {
            fetch("/api/backup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "log_export",
                format: `[Noivos] ${title} (${format})`,
              }),
            })
              .then((r) => (r.ok ? r.json() : null))
              .then((d) => {
                if (d?.logs) setAuditLogs(d.logs);
              })
              .catch(() => {});
          }}
        />
      )}

      {/* Modal CRUD Completo de Convidados (Criar e Editar) */}
      <GuestCrudModal
        isOpen={guestModalOpen}
        onClose={() => {
          setGuestModalOpen(false);
          setEditingGuest(null);
        }}
        guestToEdit={editingGuest}
        onSaved={handleGuestSaved}
      />

      {/* Modal Rápido de Edição de Categorias */}
      <GuestCategoryEditorModal
        isOpen={categoryModalOpen}
        onClose={() => {
          setCategoryModalOpen(false);
          refreshData();
        }}
        onCategoryChanged={() => {
          refreshData();
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
        roleLabel="Painel dos Noivos"
        onSaved={(sub) => {
          refreshData();
          setLiveToast({
            title:
              sub.answer === "nao"
                ? "✕ Ausência Registrada na Nuvem!"
                : "✓ Presença Salva na Nuvem!",
            description:
              sub.answer === "nao"
                ? `O não comparecimento de ${sub.primaryName} (${sub.declinedCount} pessoa(s)) foi contabilizado.`
                : `A confirmação da família de ${sub.primaryName} foi salva com sucesso.`,
          });
          setTimeout(() => setLiveToast(null), 5000);
        }}
      />
    </AdminShell>
  );
}

function RsvpSubmissionsTable({
  submissions,
  onEditFamily,
  onTogglePersonStatus,
}: {
  submissions: RsvpSubmission[];
  onEditFamily?: (invitationId: string, mode: "confirm" | "decline") => void;
  onTogglePersonStatus?: (
    invitationId: string,
    memberName: string,
    targetStatus: MemberAttendanceStatus
  ) => void;
}) {
  return (
    <Table
      head={[
        "Titular do Convite",
        "WhatsApp",
        "Status",
        "Faixas Etárias",
        "Quem Vai (Categorias)",
        "Quem Não Vai (Ausências)",
        "Recado / Observação",
        "Horário",
        "Ações",
      ]}
    >
      {submissions.map((s) => {
        const going = s.familyMembers.filter((m) => getEffectiveMemberStatus(m) === "confirmado");
        const notGoing = s.familyMembers.filter((m) => getEffectiveMemberStatus(m) === "ausente");
        const pending = s.familyMembers.filter((m) => getEffectiveMemberStatus(m) === "aguardando");
        const bk = getBreakdownFromMembers(
          going.map((m) => ({ type: m.type, confirmed: true }))
        );
        return (
          <tr key={s.invitationId}>
            <td className="py-3 pr-4 font-medium">{s.primaryName}</td>
            <td className="py-3 pr-4 tabular-nums font-mono text-xs text-ink/75">{formatPhoneBR(s.phone)}</td>
            <td className="py-3 pr-4">
              <div className="flex flex-col items-start gap-1">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    going.length > 0
                      ? "bg-[#F0F4ED] text-[#5F6F52]"
                      : notGoing.length > 0
                      ? "bg-[#FDF0EE] text-[#C17767]"
                      : "bg-amber-50 text-amber-900"
                  }`}
                >
                  {going.length > 0
                    ? `Confirmado (${going.length})`
                    : notGoing.length > 0
                    ? `Não poderá ir (${notGoing.length})`
                    : "Pendente"}
                </span>
                {going.length > 0 && notGoing.length > 0 && (
                  <span className="rounded-full bg-[#FDF0EE] text-[#C17767] px-2 py-0.5 text-[10px] font-bold">
                    ✕ {notGoing.length} ausente(s)
                  </span>
                )}
                {pending.length > 0 && (
                  <span className="rounded-full bg-amber-50 text-amber-900 px-2 py-0.5 text-[10px] font-semibold">
                    ⏳ {pending.length} pendente(s)
                  </span>
                )}
              </div>
            </td>
            <td className="py-3 pr-4 text-xs">
              {going.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {bk.idosos > 0 && (
                    <span className="rounded-md bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 text-[10px] font-bold">
                      {bk.idosos} 60+
                    </span>
                  )}
                  {bk.adultos > 0 && (
                    <span className="rounded-md bg-stone-100 text-stone-800 border border-stone-300 px-1.5 py-0.5 text-[10px] font-semibold">
                      {bk.adultos} Adulto{bk.adultos > 1 ? "s" : ""}
                    </span>
                  )}
                  {bk.adolescentes > 0 && (
                    <span className="rounded-md bg-sky-100 text-sky-900 border border-sky-300 px-1.5 py-0.5 text-[10px] font-semibold">
                      {bk.adolescentes} Adolesc.
                    </span>
                  )}
                  {bk.criancas > 0 && (
                    <span className="rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 px-1.5 py-0.5 text-[10px] font-semibold">
                      {bk.criancas} Criança{bk.criancas > 1 ? "s" : ""}
                    </span>
                  )}
                  {bk.bebes > 0 && (
                    <span className="rounded-md bg-pink-100 text-pink-900 border border-pink-300 px-1.5 py-0.5 text-[10px] font-semibold">
                      {bk.bebes} Bebê{bk.bebes > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-muted">—</span>
              )}
            </td>
            <td className="py-3 pr-4 text-xs text-[#2D3D22]">
              {going.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {going.map((m, idx) => {
                    const cat = GUEST_CATEGORIES[normalizeGuestCategory(m.type)];
                    return (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#C8D4C0] px-2 py-0.5 text-[11px] shadow-2xs"
                      >
                        <span className="font-medium text-[#3E2723]">{m.name}</span>
                        <select
                          value={normalizeGuestCategory(m.type)}
                          onChange={(e) => {
                            const newCat = e.target.value as GuestCategory;
                            updatePersonCategory({
                              guestName: m.name,
                              newCategory: newCat,
                              invitationId: s.invitationId,
                            });
                          }}
                          className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-full border cursor-pointer focus:outline-none ${cat.badgeBg} ${cat.badgeText} ${cat.badgeBorder}`}
                          title="Alterar categoria deste familiar confirmado"
                        >
                          <option value="idoso">👵 Idoso (60+)</option>
                          <option value="adulto">👤 Adulto</option>
                          <option value="adolescente">🎒 Adolescente</option>
                          <option value="crianca">🧒 Criança</option>
                          <option value="bebe">🍼 Bebê</option>
                        </select>
                        {onTogglePersonStatus && (
                          <button
                            type="button"
                            onClick={() =>
                              onTogglePersonStatus(s.invitationId, m.name, "ausente")
                            }
                            className="grid h-4 w-4 place-items-center rounded-full bg-[#FDF0EE] hover:bg-[#C17767] text-[#C17767] hover:text-white cursor-pointer transition-colors"
                            title={`Registrar ausência apenas de ${m.name}`}
                          >
                            <X size={10} />
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
              ) : (
                "—"
              )}
            </td>
            <td className="py-3 pr-4 text-xs text-[#8A3D2F]">
              {notGoing.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {notGoing.map((m, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 rounded-full bg-[#FDF0EE] border border-[#E8CBC3] px-2 py-0.5 text-[11px] font-medium text-[#8A3D2F]"
                    >
                      <span>✕ {m.name}</span>
                      {onTogglePersonStatus && (
                        <button
                          type="button"
                          onClick={() =>
                            onTogglePersonStatus(s.invitationId, m.name, "confirmado")
                          }
                          className="grid h-4 w-4 place-items-center rounded-full bg-white hover:bg-[#5F6F52] text-[#5F6F52] hover:text-white cursor-pointer transition-colors"
                          title={`Marcar ${m.name} como Vai`}
                        >
                          <Check size={10} />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                "—"
              )}
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
            <td className="py-3 pr-4">
              {onEditFamily && (
                <button
                  type="button"
                  onClick={() =>
                    onEditFamily(s.invitationId, going.length === 0 ? "decline" : "confirm")
                  }
                  className="rounded-full border border-[#E8CBC3] bg-[#FAF7F0] hover:bg-[#F0E6E0] text-[#3E2723] px-2.5 py-1 text-[11px] font-semibold cursor-pointer transition-colors whitespace-nowrap"
                  title="Editar presenças ou ausências desta família"
                >
                  ✏️ Presença / Ausência
                </button>
              )}
            </td>
          </tr>
        );
      })}
    </Table>
  );
}
