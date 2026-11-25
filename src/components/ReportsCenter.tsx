"use client";

import { useState, useMemo } from "react";
import {
  FileText,
  Printer,
  Download,
  Copy,
  Check,
  Eye,
  X,
  Utensils,
  ClipboardCheck,
  LayoutGrid,
  Users,
  Clock,
  UserX,
  CalendarClock,
  Gift,
  Heart,
  Filter,
} from "lucide-react";
import { computeUnifiedRsvpStats } from "@/lib/guestList";
import {
  buildUnifiedPersonRows,
  openPrintableReport,
  generateBuffetReport,
  generateReceptionReport,
  generateTablesReport,
  generateGeneralGuestsReport,
  generatePendingRsvpReport,
  generateAbsencesReport,
  generateCeremonialDossierReport,
  generateGiftsFinancialReport,
  generateMemoriesAndSongsReport,
  type ReportDataBundle,
  type ReportFilterOptions,
  type GeneratedReportPreview,
} from "@/lib/reportGenerators";

interface ReportsCenterProps {
  bundle: ReportDataBundle;
  onReportEmitted?: (reportTitle: string, format: string) => void;
}

export default function ReportsCenter({ bundle, onReportEmitted }: ReportsCenterProps) {
  const [groupFilter, setGroupFilter] = useState<string>("todos");
  const [sortBy, setSortBy] = useState<ReportFilterOptions["sortBy"]>("familia");
  const [includePendingInReception, setIncludePendingInReception] = useState(false);
  const [onlyPendingThanksGifts, setOnlyPendingThanksGifts] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activePreview, setActivePreview] = useState<GeneratedReportPreview | null>(null);

  const filters: ReportFilterOptions = useMemo(
    () => ({
      groupFilter,
      sortBy,
      includePendingInReception,
      onlyPendingThanksGifts,
    }),
    [groupFilter, sortBy, includePendingInReception, onlyPendingThanksGifts]
  );

  const unifiedStats = useMemo(
    () => computeUnifiedRsvpStats(bundle.officialGuests, bundle.submissions),
    [bundle.officialGuests, bundle.submissions]
  );

  const allPersonRows = useMemo(() => buildUnifiedPersonRows(bundle), [bundle]);

  const confirmedRows = useMemo(
    () => allPersonRows.filter((r) => r.status === "confirmado"),
    [allPersonRows]
  );
  const buffetSeats = useMemo(
    () => confirmedRows.filter((r) => r.category !== "bebe").length,
    [confirmedRows]
  );
  const seatedCount = useMemo(
    () => allPersonRows.filter((r) => r.status !== "ausente" && r.mesaId !== null).length,
    [allPersonRows]
  );
  const totalMesaCap = useMemo(
    () => bundle.mesas.reduce((acc, m) => acc + m.capacidade, 0),
    [bundle.mesas]
  );

  const pixTotal = useMemo(() => {
    if (bundle.role !== "noivos" || !bundle.gifts) return 0;
    return bundle.gifts
      .filter((g) => g.type === "pix_cota" || g.type === "pix_avulso")
      .reduce((acc, g) => acc + (g.amount || 0), 0);
  }, [bundle.role, bundle.gifts]);

  const handleCopy = (id: string, title: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 3000);
      onReportEmitted?.(title, "Resumo WhatsApp");
    });
  };

  const handlePrint = (title: string, preview: GeneratedReportPreview) => {
    if (openPrintableReport(preview)) {
      onReportEmitted?.(title, "PDF / Impressão");
    }
  };

  const handleCsv = (title: string, csvFn: () => void) => {
    csvFn();
    onReportEmitted?.(title, "Planilha CSV");
  };

  const reportCards = useMemo(() => {
    const buffet = generateBuffetReport(bundle, filters);
    const reception = generateReceptionReport(bundle, filters);
    const tables = generateTablesReport(bundle);
    const general = generateGeneralGuestsReport(bundle, filters);
    const pending = generatePendingRsvpReport(bundle, filters);
    const absences = generateAbsencesReport(bundle, filters);
    const dossier = generateCeremonialDossierReport(bundle);

    const list = [
      {
        id: "buffet",
        badge: "Gastronomia & Buffet",
        badgeClass: "bg-[#F0F4ED] text-[#5F6F52] border-[#C8D4C0]",
        icon: Utensils,
        title: "Relatório Oficial p/ Buffet & Gastronomia",
        description:
          "Contagem exata por faixa etária (Idosos 60+, Adultos, Adolescentes, Crianças e Bebês isentos), total de lugares pagantes, restrições alimentares e lista nominal.",
        metric: `${confirmedRows.length} confirmados · ${buffetSeats} lugares buffet`,
        report: buffet,
      },
      {
        id: "recepcao",
        badge: "Portaria & Check-in",
        badgeClass: "bg-amber-50 text-amber-900 border-amber-200",
        icon: ClipboardCheck,
        title: "Folha Oficial de Recepção & Check-in",
        description:
          "Lista nominal pronta para prancheta na entrada do salão com coluna de marcação [  ], mesa alocada, faixa etária, titular da família e telefone.",
        metric: `${
          includePendingInReception
            ? confirmedRows.length + unifiedStats.pendingPeople
            : confirmedRows.length
        } nomes na folha`,
        report: reception,
      },
      {
        id: "mesas",
        badge: "Salão & Lugares",
        badgeClass: "bg-stone-100 text-stone-800 border-stone-300",
        icon: LayoutGrid,
        title: "Mapa Completo de Alocação das Mesas",
        description:
          "Relação mesa por mesa com setor, capacidade, vagas livres, convidados alocados em cada mesa e lista de confirmados ainda sem mesa.",
        metric: `${bundle.mesas.length} mesas · ${seatedCount}/${totalMesaCap} lugares`,
        report: tables,
      },
      {
        id: "geral_familias",
        badge: "Panorama Completo",
        badgeClass: "bg-sky-50 text-sky-900 border-sky-200",
        icon: Users,
        title: "Relatório Geral por Família (Lista Oficial)",
        description:
          "Visão consolidada de todas as famílias convidadas separando quem Vai, quem Não vai e quem ainda está Pendente em cada convite.",
        metric: `${bundle.officialGuests.length} famílias · ${unifiedStats.totalPeople} convidados`,
        report: general,
      },
      {
        id: "pendentes",
        badge: "Follow-up Ativo",
        badgeClass: "bg-orange-50 text-orange-900 border-orange-200",
        icon: Clock,
        title: "Relatório de Pendentes de Confirmação",
        description:
          "Lista exclusiva de famílias e integrantes que ainda não confirmaram presença no site, com telefones e observações para acompanhamento.",
        metric: `${unifiedStats.pendingFamilies} famílias · ${unifiedStats.pendingPeople} pendentes`,
        report: pending,
      },
      {
        id: "ausencias",
        badge: "Controle de Baixas",
        badgeClass: "bg-[#FDF0EE] text-[#C17767] border-[#E8CBC3]",
        icon: UserX,
        title: "Relatório Consolidado de Ausências (Não Vão)",
        description:
          "Relação nominal de todas as baixas totais e parciais comunicadas pelos convidados ou marcadas na Lista Oficial, indicando quantos assentos foram liberados.",
        metric: `${unifiedStats.declinedPeople} ausências · ${unifiedStats.familiesWithAnyAbsence} famílias`,
        report: absences,
      },
      {
        id: "dossie_cerimonial",
        badge: "Operação do Dia",
        badgeClass: "bg-emerald-50 text-emerald-900 border-emerald-200",
        icon: CalendarClock,
        title: "Dossiê Operacional do Grande Dia",
        description:
          "Documento completo da assessoria reunindo o Roteiro hora a hora (19h30 às 23h59), Quadro de Fornecedores com contatos e Checklist Operacional.",
        metric: `${bundle.roteiro.length} etapas · ${bundle.fornecedores.length} fornecedores · ${bundle.checklist.length} tarefas`,
        report: dossier,
      },
    ];

    // Relatórios estritamente exclusivos dos Noivos (jamais renderizados no Portal da Cerimonialista)
    if (bundle.role === "noivos") {
      const giftsReport = generateGiftsFinancialReport(bundle, filters);
      const memoriesReport = generateMemoriesAndSongsReport(bundle);
      const giftsCount = bundle.gifts?.length || 0;
      const pendingThanks = (bundle.gifts || []).filter((g) => !g.thanked).length;
      const songsCount = bundle.songSuggestions?.length || 0;
      const msgsCount =
        bundle.submissions.filter((s) => s.message && s.message.trim().length > 0).length +
        (bundle.muralMessages?.length || 0) +
        (bundle.gifts || []).filter((g) => g.message && g.message.trim().length > 0).length;

      list.push(
        {
          id: "presentes_financeiro",
          badge: "Exclusivo dos Noivos · Financeiro",
          badgeClass: "bg-[#FDF0EE] text-[#C17767] border-[#E8CBC3]",
          icon: Gift,
          title: "Relatório Financeiro de Presentes, Cotas Pix & Agradecimentos",
          description:
            "Balanço privado de arrecadação em Cotas Pix e Pix Livre, presentes da Lista Amazon, conferência bancária e lista de quem falta agradecer.",
          metric: `${pixTotal.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })} · ${giftsCount} presentes (${pendingThanks} p/ agradecer)`,
          report: giftsReport,
        },
        {
          id: "recordacoes_musicas",
          badge: "Exclusivo dos Noivos · Afetivo",
          badgeClass: "bg-pink-50 text-pink-900 border-pink-200",
          icon: Heart,
          title: "Caderno de Recordações: Recados Carinhosos & Músicas",
          description:
            "Livreto especial para guardar ou imprimir com todas as mensagens de carinho recebidas no RSVP, Mural e Presentes, além das músicas sugeridas.",
          metric: `${msgsCount} recados · ${songsCount} músicas`,
          report: memoriesReport,
        }
      );
    }

    return list;
  }, [
    bundle,
    filters,
    confirmedRows.length,
    buffetSeats,
    includePendingInReception,
    unifiedStats,
    seatedCount,
    totalMesaCap,
    pixTotal,
  ]);

  return (
    <div className="space-y-6">
      {/* Resumo Executivo Rápido no Topo da Central */}
      <div className="rounded-3xl border border-[#E8CBC3] bg-[#FAF9F6] p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8CBC3]/60 pb-3.5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#5F6F52] text-white shadow-2xs">
              <FileText size={20} />
            </span>
            <div>
              <h2 className="font-serif text-xl font-semibold text-[#3E2723]">
                Central Oficial de Emissão de Relatórios
              </h2>
              <p className="text-xs text-[#6E5F57]">
                {bundle.role === "noivos"
                  ? "Gere documentos em PDF para impressão, planilhas Excel (CSV) ou resumos prontos para WhatsApp (incluindo relatórios exclusivos dos noivos)."
                  : "Gere listas oficiais de portaria, buffet, mapa de mesas, ausências e dossiê operacional em PDF, Planilha CSV ou WhatsApp."}
              </p>
            </div>
          </div>

          <span className="rounded-full bg-white border border-[#E8CBC3] px-3 py-1 text-[11px] font-bold text-[#5F6F52] self-start sm:self-auto">
            ✓ Dados sincronizados em tempo real
          </span>
        </div>

        {/* Filtros Personalizáveis antes de Emitir */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#3E2723]">
              <Filter size={13} className="text-[#C17767]" />
              Personalizar emissão:
            </span>

            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="h-9 rounded-full border border-line bg-white px-3.5 text-xs font-semibold text-ink focus:border-[#C17767] focus:outline-none cursor-pointer shadow-2xs"
            >
              <option value="todos">Todos os Grupos ({unifiedStats.totalPeople} pessoas)</option>
              <option value="Família da Noiva">Apenas Família da Noiva</option>
              <option value="Família do Noivo">Apenas Família do Noivo</option>
              <option value="Amigos">Apenas Amigos</option>
              <option value="Padrinhos">Apenas Padrinhos</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ReportFilterOptions["sortBy"])}
              className="h-9 rounded-full border border-line bg-white px-3.5 text-xs font-semibold text-ink focus:border-[#C17767] focus:outline-none cursor-pointer shadow-2xs"
            >
              <option value="familia">👨‍👩‍👧‍👦 Ordenar: Por Família (Padrão Portaria)</option>
              <option value="alfabetica">🔤 Ordenar: Alfabética (A–Z)</option>
              <option value="mesa">🍽️ Ordenar: Por Número da Mesa</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <label className="inline-flex items-center gap-2 cursor-pointer text-[#3E2723] font-medium">
              <input
                type="checkbox"
                checked={includePendingInReception}
                onChange={(e) => setIncludePendingInReception(e.target.checked)}
                className="h-4 w-4 accent-[#5F6F52] cursor-pointer"
              />
              <span>Incluir pendentes na Folha de Recepção</span>
            </label>

            {bundle.role === "noivos" && (
              <label className="inline-flex items-center gap-2 cursor-pointer text-[#3E2723] font-medium">
                <input
                  type="checkbox"
                  checked={onlyPendingThanksGifts}
                  onChange={(e) => setOnlyPendingThanksGifts(e.target.checked)}
                  className="h-4 w-4 accent-[#C17767] cursor-pointer"
                />
                <span>Filtrar presentes pendentes de agradecer</span>
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Grid de Cards dos Relatórios */}
      <div className="grid gap-5 md:grid-cols-2">
        {reportCards.map((card) => {
          const Icon = card.icon;
          const isCopied = copiedId === card.id;
          return (
            <div
              key={card.id}
              className="rounded-3xl border border-line/90 bg-white p-5 shadow-2xs hover:border-[#C17767]/70 hover:shadow-md transition-all flex flex-col justify-between gap-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider ${card.badgeClass}`}
                  >
                    <Icon size={12} />
                    <span>{card.badge}</span>
                  </span>

                  <span className="rounded-full bg-[#FAF7F0] border border-[#E8CBC3]/80 px-2.5 py-0.5 text-[11px] font-bold text-[#3E2723]">
                    {card.metric}
                  </span>
                </div>

                <h3 className="font-serif text-lg font-bold text-[#3E2723] leading-snug">
                  {card.title}
                </h3>

                <p className="text-xs text-[#6E5F57] leading-relaxed">{card.description}</p>
              </div>

              <div className="pt-3 border-t border-line/70 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrint(card.title, card.report.preview)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] text-white px-3.5 py-1.5 text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                  title="Abrir documento formatado A4 para imprimir ou salvar como PDF"
                >
                  <Printer size={13} />
                  <span>Emitir PDF / Imprimir</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePreview(card.report.preview)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#E8CBC3] bg-[#FAF7F0] hover:bg-[#F3ECE1] text-[#3E2723] px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors"
                  title="Pré-visualizar o relatório diretamente na tela antes de imprimir"
                >
                  <Eye size={13} />
                  <span>Visualizar</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCsv(card.title, card.report.csv)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white hover:bg-stone-50 text-[#3E2723] px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors"
                  title="Baixar planilha CSV compatível com Microsoft Excel e Google Planilhas"
                >
                  <Download size={13} className="text-[#C17767]" />
                  <span>Excel (CSV)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopy(card.id, card.title, card.report.whatsappText)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                    isCopied
                      ? "border-[#5F6F52] bg-[#F0F4ED] text-[#2D4A22]"
                      : "border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-950"
                  }`}
                  title="Copiar texto formatado pronto para enviar no WhatsApp"
                >
                  {isCopied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{isCopied ? "Copiado!" : "WhatsApp"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Pré-visualização Rápida na Tela */}
      {activePreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setActivePreview(null)}
        >
          <div
            className="w-full max-w-5xl rounded-3xl border border-[#E8CBC3] bg-white shadow-2xl overflow-hidden flex flex-col h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-[#FAF7F0] px-6 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#C17767]">
                  Pré-visualização Oficial · {activePreview.emittedBy}
                </p>
                <h3 className="font-serif text-lg font-bold text-[#3E2723]">
                  {activePreview.title}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrint(activePreview.title, activePreview)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#5F6F52] hover:bg-[#4E5C43] text-white px-4 py-2 text-xs font-bold cursor-pointer shadow-xs"
                >
                  <Printer size={14} />
                  <span>🖨️ Imprimir / Salvar como PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreview(null)}
                  className="rounded-full p-2 text-muted hover:bg-stone-200/60 hover:text-ink cursor-pointer"
                  title="Fechar visualização"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-stone-100 p-4 overflow-hidden">
              <iframe
                title={activePreview.title}
                srcDoc={activePreview.fullPrintHtml}
                className="w-full h-full rounded-2xl border border-line bg-white shadow-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
