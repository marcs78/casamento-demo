// Motor Central de Emissão de Relatórios (PDF / Impressão, Excel CSV e Resumos WhatsApp)
// Compartilhado com isolamento de permissões entre Painel dos Noivos e Portal da Cerimonialista.

import {
  GUEST_CATEGORIES,
  normalizeGuestCategory,
  getCategoryOverrides,
  getEffectiveMemberStatus,
  isPreDeclinedConfirmation,
  buildPreDeclinedSubmissionFromGuest,
  computeUnifiedRsvpStats,
  cleanString,
  type GuestCategory,
  type GuestRecord,
  type MemberAttendanceStatus,
  type RsvpSubmission,
  type GiftContribution,
} from "./guestList";
import { COTAS, type GuestMessage, type SongSuggestion } from "./wedding";
import { formatPhoneBR } from "./phone";

export type ReportRole = "noivos" | "cerimonialista";

export type ReportMesaItem = {
  id: number;
  nome: string;
  capacidade: number;
  setor?: string;
};

export type ReportFornecedorItem = {
  id: string;
  nome: string;
  servico: string;
  contato: string;
};

export type ReportRoteiroItem = {
  id: string;
  hora: string;
  titulo: string;
  desc: string;
  status: "pendente" | "andamento" | "concluido";
};

export type ReportChecklistItem = {
  id: string;
  item: string;
  categoria?: string;
  done: boolean;
};

export type ReportAssignmentMap = Record<
  string,
  { checkIn: boolean; mesaId: number | null; tipo?: GuestCategory }
>;

export interface UnifiedPersonRow {
  rowId: string;
  invitationId: string;
  name: string;
  category: GuestCategory;
  categoryLabel: string;
  categoryShort: string;
  familyPrimary: string;
  familySurname: string;
  group: string;
  phone: string;
  status: MemberAttendanceStatus;
  firstConfirmation: string;
  mesaId: number | null;
  mesaName: string;
  checkIn: boolean;
  diet: string;
  notes: string;
}

export interface ReportDataBundle {
  role: ReportRole;
  officialGuests: GuestRecord[];
  submissions: RsvpSubmission[];
  mesas: ReportMesaItem[];
  assignments: ReportAssignmentMap;
  fornecedores: ReportFornecedorItem[];
  roteiro: ReportRoteiroItem[];
  checklist: ReportChecklistItem[];
  // Campos exclusivos dos Noivos (nunca enviados nem exibidos para a Cerimonialista)
  gifts?: GiftContribution[];
  muralMessages?: GuestMessage[];
  songSuggestions?: SongSuggestion[];
}

export interface ReportFilterOptions {
  groupFilter: string; // "todos" | "Família da Noiva" | "Família do Noivo" | "Amigos" | "Padrinhos"
  sortBy: "alfabetica" | "familia" | "mesa";
  includePendingInReception: boolean;
  onlyPendingThanksGifts: boolean;
}

export interface GeneratedReportPreview {
  id: string;
  title: string;
  subtitle: string;
  emittedBy: string;
  emittedAt: string;
  kpis: { label: string; value: string }[];
  bodyHtml: string;
  fullPrintHtml: string;
}

export const DEFAULT_REPORT_MESAS: ReportMesaItem[] = [
  { id: 1, nome: "Mesa 01 · Família da Noiva", capacidade: 10, setor: "Frente Esquerda" },
  { id: 2, nome: "Mesa 02 · Família do Noivo", capacidade: 10, setor: "Frente Direita" },
  { id: 3, nome: "Mesa 03 · Amigos dos Noivos", capacidade: 10, setor: "Centro" },
  { id: 4, nome: "Mesa 04 · Amigos", capacidade: 12, setor: "Lateral" },
];

export const DEFAULT_REPORT_FORNECEDORES: ReportFornecedorItem[] = [
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

export const DEFAULT_REPORT_ROTEIRO: ReportRoteiroItem[] = [
  {
    id: "r-1",
    hora: "19:30",
    titulo: "Abertura e Início da Recepção para a Cerimônia (Culto)",
    desc: "Abertura das portas e recepção dos convidados para a parte onde será realizada a cerimônia (Culto).",
    status: "pendente",
  },
  {
    id: "r-2",
    hora: "20:15",
    titulo: "Início da Cerimônia (Cerimônia de Casamento de Anita & Giuseppe)",
    desc: "Entrada do cortejo, louvores oficiais, leitura da Palavra pastoral, votos, alianças e oração.",
    status: "pendente",
  },
  {
    id: "r-3",
    hora: "21:15",
    titulo: "Início da Recepção e da Festa (Jantar)",
    desc: "Abertura do buffet preparado pela Villa Imperial, celebração e fotos com famílias e amigos.",
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

export const DEFAULT_REPORT_CHECKLIST: ReportChecklistItem[] = [
  { id: "c-1", item: "Testar instrumentos, som e microfones dos noivos, pastor e equipe de louvor", categoria: "Som & Louvor", done: false },
  { id: "c-2", item: "Briefing e alinhamento de posicionamento com JoyFilmes (Foto & Vídeo: 47 9275-1421)", categoria: "Foto & Vídeo", done: false },
  { id: "c-3", item: "Recepção e conferência da decoração com Claudete (47 9137-5134)", categoria: "Decoração", done: false },
  { id: "c-4", item: "Alinhamento da ordem de entrada do cortejo de amigos, pais e noivos", categoria: "Cerimônia", done: false },
  { id: "c-5", item: "Conferência da entrega e temperatura do buffet com o Buffet Villa Imperial (24 99881-2027)", categoria: "Buffet", done: false },
  { id: "c-6", item: "Recebimento, posicionamento e conferência do bolo e doces finos", categoria: "Buffet", done: false },
  { id: "c-7", item: "Recepção e orientação dos convidados na entrada do salão (19h30)", categoria: "Recepção", done: false },
  { id: "c-8", item: "Água, lenços e suporte aos noivos na antessala antes do início do culto (20h15)", categoria: "Noivos", done: false },
  { id: "c-9", item: "Conferência das alianças com os noivos antes do início do cortejo", categoria: "Cerimônia", done: false },
  { id: "c-10", item: "Verificação da climatização e iluminação do salão antes da entrada dos noivos", categoria: "Espaço", done: false },
  { id: "c-11", item: "Acompanhamento do término da recepção e liberação de fornecedores (23h59)", categoria: "Encerramento", done: false },
];

export function escHtml(val: unknown): string {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatBrl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function buildUnifiedPersonRows(bundle: ReportDataBundle): UnifiedPersonRow[] {
  const { officialGuests, submissions, assignments, mesas } = bundle;
  const subMap = new Map<string, RsvpSubmission>();
  submissions.forEach((s) => subMap.set(s.invitationId, s));

  const mesaMap = new Map<number, ReportMesaItem>();
  mesas.forEach((m) => mesaMap.set(m.id, m));

  const catOverrides = getCategoryOverrides();
  const rows: UnifiedPersonRow[] = [];

  officialGuests.forEach((fam) => {
    const sub = subMap.get(fam.id);
    if (sub && Array.isArray(sub.familyMembers) && sub.familyMembers.length > 0) {
      sub.familyMembers.forEach((m, idx) => {
        const rowId = `${fam.id}-${idx}`;
        const origMember = fam.familyMembers[idx];
        const origObj = origMember && typeof origMember !== "string" ? origMember : undefined;
        const st = getEffectiveMemberStatus(m);
        const savedAssign = assignments[rowId];
        const cat = normalizeGuestCategory(
          catOverrides[cleanString(m.name)] ?? savedAssign?.tipo ?? m.type
        );
        const mesaId =
          st === "ausente"
            ? null
            : savedAssign?.mesaId !== undefined
            ? savedAssign.mesaId
            : (fam.mesaId ?? null);
        const mesaObj = mesaId ? mesaMap.get(mesaId) : undefined;
        const checkIn = st === "ausente" ? false : Boolean(savedAssign?.checkIn);

        rows.push({
          rowId,
          invitationId: fam.id,
          name: m.name,
          category: cat,
          categoryLabel: GUEST_CATEGORIES[cat].label,
          categoryShort: GUEST_CATEGORIES[cat].shortLabel,
          familyPrimary: origObj?.chefeFamilia || fam.primaryName,
          familySurname: origObj?.familia || fam.familySurname || fam.primaryName,
          group: fam.group || "Amigos",
          phone: formatPhoneBR(m.phone || origObj?.phone || sub.phone || fam.phone || ""),
          status: st,
          firstConfirmation: origObj?.firstConfirmation || fam.firstConfirmation || "PENDENTE",
          mesaId,
          mesaName: mesaId
            ? mesaObj
              ? `Mesa ${pad2(mesaId)} (${mesaObj.nome.split("·")[1]?.trim() || mesaObj.nome})`
              : `Mesa ${pad2(mesaId)}`
            : "Sem mesa",
          checkIn,
          diet: sub.diet || "",
          notes: sub.message || origObj?.plannerNotes || fam.plannerNotes || "",
        });
      });
    } else {
      const famPreDeclined = isPreDeclinedConfirmation(fam.firstConfirmation);
      fam.familyMembers.forEach((m, idx) => {
        const rowId = `${fam.id}-${idx}`;
        const origObj = typeof m !== "string" ? m : undefined;
        const memName = typeof m === "string" ? m : m.name;
        const isDeclined = famPreDeclined || isPreDeclinedConfirmation(origObj?.firstConfirmation);
        const st: MemberAttendanceStatus = isDeclined ? "ausente" : "aguardando";
        const savedAssign = assignments[rowId];
        const cat = normalizeGuestCategory(
          catOverrides[cleanString(memName)] ??
            savedAssign?.tipo ??
            (typeof m === "string" ? "adulto" : m.type)
        );
        const mesaId =
          st === "ausente"
            ? null
            : savedAssign?.mesaId !== undefined
            ? savedAssign.mesaId
            : (fam.mesaId ?? null);
        const mesaObj = mesaId ? mesaMap.get(mesaId) : undefined;

        rows.push({
          rowId,
          invitationId: fam.id,
          name: memName,
          category: cat,
          categoryLabel: GUEST_CATEGORIES[cat].label,
          categoryShort: GUEST_CATEGORIES[cat].shortLabel,
          familyPrimary: origObj?.chefeFamilia || fam.primaryName,
          familySurname: origObj?.familia || fam.familySurname || fam.primaryName,
          group: fam.group || "Amigos",
          phone: formatPhoneBR(origObj?.phone || fam.phone || ""),
          status: st,
          firstConfirmation: origObj?.firstConfirmation || fam.firstConfirmation || "PENDENTE",
          mesaId,
          mesaName: mesaId
            ? mesaObj
              ? `Mesa ${pad2(mesaId)} (${mesaObj.nome.split("·")[1]?.trim() || mesaObj.nome})`
              : `Mesa ${pad2(mesaId)}`
            : "Sem mesa",
          checkIn: st === "ausente" ? false : Boolean(savedAssign?.checkIn),
          diet: "",
          notes: origObj?.plannerNotes || fam.plannerNotes || "",
        });
      });
    }
  });

  return rows;
}

export function sortPersonRows(
  rows: UnifiedPersonRow[],
  sortBy: ReportFilterOptions["sortBy"]
): UnifiedPersonRow[] {
  const copy = [...rows];
  if (sortBy === "familia") {
    return copy.sort((a, b) => {
      const famA = (a.familySurname || a.familyPrimary || "").trim().toLowerCase();
      const famB = (b.familySurname || b.familyPrimary || "").trim().toLowerCase();
      const cmpFam = famA.localeCompare(famB, "pt-BR");
      if (cmpFam !== 0) return cmpFam;

      const headA = (a.familyPrimary || "").trim().toLowerCase();
      const headB = (b.familyPrimary || "").trim().toLowerCase();
      const cmpHead = headA.localeCompare(headB, "pt-BR");
      if (cmpHead !== 0) return cmpHead;

      const aIsHead = a.name.toLowerCase().includes(headA) || headA.includes(a.name.toLowerCase());
      const bIsHead = b.name.toLowerCase().includes(headB) || headB.includes(b.name.toLowerCase());
      if (aIsHead && !bIsHead) return -1;
      if (!aIsHead && bIsHead) return 1;

      return a.name.localeCompare(b.name, "pt-BR");
    });
  }
  if (sortBy === "mesa") {
    return copy.sort((a, b) => {
      if (a.mesaId === null && b.mesaId !== null) return 1;
      if (a.mesaId !== null && b.mesaId === null) return -1;
      if (a.mesaId !== b.mesaId) return (a.mesaId || 0) - (b.mesaId || 0);
      return a.name.localeCompare(b.name, "pt-BR");
    });
  }
  return copy.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function buildPrintDocumentShell(params: {
  id: string;
  title: string;
  subtitle: string;
  role: ReportRole;
  kpis: { label: string; value: string }[];
  bodyHtml: string;
}): GeneratedReportPreview {
  const emittedAt = new Date().toLocaleString("pt-BR");
  const emittedBy =
    params.role === "noivos" ? "Painel Exclusivo dos Noivos" : "Portal Oficial da Cerimonialista";

  const kpisHtml = params.kpis
    .map(
      (k) => `
      <div class="kpi">
        <div class="kpi-label">${escHtml(k.label)}</div>
        <div class="kpi-value">${escHtml(k.value)}</div>
      </div>`
    )
    .join("");

  const fullPrintHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${escHtml(params.title)} — Anita & Giuseppe (18/09/2027)</title>
  <style>
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #2B2118;
      background: #FFFFFF;
      margin: 0;
      padding: 28px 34px;
      line-height: 1.45;
    }
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #FAF7F0;
      border: 1px solid #E8CBC3;
      padding: 10px 16px;
      border-radius: 14px;
      margin-bottom: 22px;
    }
    .toolbar-note { font-size: 12px; color: #6E5F57; }
    .btn-print {
      background: #5F6F52;
      color: #FFFFFF;
      border: none;
      padding: 9px 20px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-close {
      background: #FFFFFF;
      color: #3E2723;
      border: 1px solid #D9CDB8;
      padding: 8px 15px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      margin-left: 8px;
    }
    .header {
      border-bottom: 2px solid #E8CBC3;
      padding-bottom: 14px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 16px;
      flex-wrap: wrap;
    }
    .monogram {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 12px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #C17767;
      font-weight: 700;
      margin-bottom: 4px;
    }
    h1 {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 22px;
      color: #3E2723;
      margin: 0 0 4px 0;
      font-weight: 700;
    }
    .subtitle {
      font-size: 12.5px;
      color: #6E5F57;
      margin: 0;
    }
    .meta {
      text-align: right;
      font-size: 11px;
      color: #6E5F57;
    }
    .meta strong { color: #3E2723; }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(135px, 1fr));
      gap: 10px;
      margin-bottom: 20px;
    }
    .kpi {
      background: #FAF7F0;
      border: 1px solid #E8CBC3;
      border-radius: 10px;
      padding: 10px 12px;
    }
    .kpi-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #8C6D58;
      font-weight: 700;
    }
    .kpi-value {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 20px;
      font-weight: 700;
      color: #3E2723;
      margin-top: 2px;
    }
    h2 {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 15px;
      color: #3E2723;
      margin: 20px 0 8px 0;
      border-left: 4px solid #C17767;
      padding-left: 9px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11.5px;
      margin-bottom: 16px;
    }
    th, td {
      border: 1px solid #DED5C8;
      padding: 6.5px 8px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #F4EFE6;
      color: #3E2723;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
    }
    tr { page-break-inside: avoid; }
    tbody tr:nth-child(even) { background: #FAF9F6; }
    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 700;
    }
    .b-ok { background: #EBF2E6; color: #2D4A22; border: 1px solid #C5D6B8; }
    .b-no { background: #FDF0EE; color: #9E4231; border: 1px solid #E8CBC3; }
    .b-wait { background: #FFF8E7; color: #8A5A19; border: 1px solid #EBD49E; }
    .b-cat { background: #F3EFEA; color: #4A3E35; border: 1px solid #D9CDB8; }
    .card-box {
      border: 1px solid #E2D7C8;
      border-radius: 12px;
      padding: 12px 14px;
      margin-bottom: 12px;
      background: #FCFBF9;
      page-break-inside: avoid;
    }
    .footer {
      margin-top: 26px;
      padding-top: 10px;
      border-top: 1px solid #E8CBC3;
      font-size: 10.5px;
      color: #8C7A70;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      .no-print { display: none !important; }
      body { padding: 8mm 10mm; }
    }
  </style>
</head>
<body>
  <div class="toolbar no-print">
    <span class="toolbar-note">📄 Dica: Na janela de impressão, escolha <strong>"Salvar como PDF"</strong> para baixar o arquivo PDF oficial ou selecione sua impressora.</span>
    <div>
      <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button>
      <button class="btn-close" onclick="window.close()">Fechar</button>
    </div>
  </div>

  <div class="header">
    <div>
      <div class="monogram">Anita &amp; Giuseppe · 18 de Setembro de 2027</div>
      <h1>${escHtml(params.title)}</h1>
      <p class="subtitle">${escHtml(params.subtitle)}</p>
    </div>
    <div class="meta">
      <div><strong>Local:</strong> Villa Imperial das Hortênsias (Petrópolis - RJ)</div>
      <div><strong>Origem:</strong> ${escHtml(emittedBy)}</div>
      <div><strong>Emitido em:</strong> ${escHtml(emittedAt)}</div>
    </div>
  </div>

  <div class="kpi-grid">${kpisHtml}</div>

  ${params.bodyHtml}

  <div class="footer">
    <span>Casamento Anita &amp; Giuseppe · Documento Oficial Sincronizado em Nuvem</span>
    <span>Emitido em ${escHtml(emittedAt)} (${escHtml(emittedBy)})</span>
  </div>
</body>
</html>`;

  return {
    id: params.id,
    title: params.title,
    subtitle: params.subtitle,
    emittedBy,
    emittedAt,
    kpis: params.kpis,
    bodyHtml: params.bodyHtml,
    fullPrintHtml,
  };
}

export function openPrintableReport(preview: GeneratedReportPreview): boolean {
  if (typeof window === "undefined") return false;
  const win = window.open("", "_blank", "width=1020,height=840");
  if (!win) {
    alert("Permita a abertura de nova guia/pop-up no navegador para imprimir ou salvar o PDF.");
    return false;
  }
  win.document.write(preview.fullPrintHtml);
  win.document.close();
  return true;
}

export function downloadCsvReport(
  filename: string,
  headers: string[],
  rows: (string | number | undefined | null)[][]
): void {
  if (typeof window === "undefined") return;
  const esc = (v: string | number | undefined | null) =>
    `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
  const lines = [headers.map(esc).join(";"), ...rows.map((r) => r.map(esc).join(";"))];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// 1. RELATÓRIO OFICIAL DE BUFFET & GASTRONOMIA (VILLA IMPERIAL)
// ---------------------------------------------------------------------------
export function generateBuffetReport(
  bundle: ReportDataBundle,
  filters: ReportFilterOptions
): { preview: GeneratedReportPreview; csv: () => void; whatsappText: string } {
  const allRows = buildUnifiedPersonRows(bundle).filter(
    (r) =>
      r.status === "confirmado" &&
      (filters.groupFilter === "todos" || r.group === filters.groupFilter)
  );
  const sorted = sortPersonRows(allRows, filters.sortBy);

  const idosos = sorted.filter((r) => r.category === "idoso").length;
  const adultos = sorted.filter((r) => r.category === "adulto").length;
  const adolescentes = sorted.filter((r) => r.category === "adolescente").length;
  const criancas = sorted.filter((r) => r.category === "crianca").length;
  const bebes = sorted.filter((r) => r.category === "bebe").length;
  const assentosPagantes = idosos + adultos + adolescentes + criancas;

  const dietRows = sorted.filter((r) => r.diet.trim().length > 0);

  const catTable = `
    <h2>Resumo Quantitativo por Faixa Etária (Confirmados)</h2>
    <table>
      <thead>
        <tr>
          <th>Categoria / Faixa Etária</th>
          <th>Orientação p/ Buffet &amp; Salão</th>
          <th style="width:120px;text-align:center;">Quantidade</th>
        </tr>
      </thead>
      <tbody>
        <tr><td><strong>Idosos (60+ anos)</strong></td><td>Assento prioritário / acessível · Buffet adulto</td><td style="text-align:center;font-weight:700;">${idosos}</td></tr>
        <tr><td><strong>Adultos</strong></td><td>Buffet adulto completo · Ocupa assento</td><td style="text-align:center;font-weight:700;">${adultos}</td></tr>
        <tr><td><strong>Adolescentes / Jovens</strong></td><td>Buffet completo · Ocupa assento</td><td style="text-align:center;font-weight:700;">${adolescentes}</td></tr>
        <tr><td><strong>Crianças</strong></td><td>Buffet infantil · Ocupa assento</td><td style="text-align:center;font-weight:700;">${criancas}</td></tr>
        <tr><td><strong>Bebês de colo</strong></td><td>Isento de buffet / não ocupa assento individual</td><td style="text-align:center;font-weight:700;">${bebes}</td></tr>
        <tr style="background:#F0F4ED;">
          <td colspan="2"><strong>TOTAL DE ASSENTOS / SERVIÇO DE BUFFET (Excluindo bebês de colo)</strong></td>
          <td style="text-align:center;font-weight:700;font-size:13px;color:#2D4A22;">${assentosPagantes} lugares</td>
        </tr>
      </tbody>
    </table>
  `;

  const dietHtml =
    dietRows.length > 0
      ? `
    <h2>Restrições Alimentares Informadas</h2>
    <table>
      <thead><tr><th>Convidado</th><th>Família</th><th>Restrição / Observação</th></tr></thead>
      <tbody>
        ${dietRows
          .map(
            (r) =>
              `<tr><td><strong>${escHtml(r.name)}</strong></td><td>${escHtml(r.familyPrimary)}</td><td>${escHtml(r.diet)}</td></tr>`
          )
          .join("")}
      </tbody>
    </table>`
      : "";

  const listHtml = `
    <h2>Lista Nominal Oficial de Convidados Confirmados (${sorted.length})</h2>
    <table>
      <thead>
        <tr>
          <th style="width:36px;text-align:center;">#</th>
          <th>Nome do Convidado</th>
          <th>Faixa Etária</th>
          <th>Titular da Família</th>
          <th>Grupo</th>
          <th>Mesa Alocada</th>
        </tr>
      </thead>
      <tbody>
        ${
          sorted.length === 0
            ? `<tr><td colspan="6" style="text-align:center;">Nenhum convidado confirmado para o filtro selecionado.</td></tr>`
            : sorted
                .map(
                  (r, i) => `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td><strong>${escHtml(r.name)}</strong></td>
            <td><span class="badge b-cat">${escHtml(r.categoryShort)}</span></td>
            <td>${escHtml(r.familyPrimary)}</td>
            <td>${escHtml(r.group)}</td>
            <td>${escHtml(r.mesaName)}</td>
          </tr>`
                )
                .join("")
        }
      </tbody>
    </table>
  `;

  const preview = buildPrintDocumentShell({
    id: "buffet",
    title: "Relatório Oficial p/ Buffet & Gastronomia",
    subtitle: `Contagem detalhada por faixa etária e lista nominal de confirmados (${
      filters.groupFilter === "todos" ? "Todos os Grupos" : filters.groupFilter
    })`,
    role: bundle.role,
    kpis: [
      { label: "Total Confirmados", value: `${sorted.length} pessoas` },
      { label: "Assentos / Buffet", value: `${assentosPagantes} lugares` },
      { label: "Adultos + 60+ + Adol.", value: `${idosos + adultos + adolescentes}` },
      { label: "Crianças (Infantil)", value: `${criancas}` },
      { label: "Bebês de Colo", value: `${bebes}` },
    ],
    bodyHtml: catTable + dietHtml + listHtml,
  });

  const csv = () => {
    const dateSlug = new Date().toISOString().slice(0, 10);
    downloadCsvReport(
      `relatorio_buffet_duas_rodas_${dateSlug}.csv`,
      ["#", "Nome do Convidado", "Faixa Etária", "Ocupa Assento/Buffet", "Titular da Família", "Grupo", "Mesa", "Restrição Alimentar"],
      sorted.map((r, idx) => [
        idx + 1,
        r.name,
        r.categoryLabel,
        r.category === "bebe" ? "Não (Bebê de colo)" : "Sim",
        r.familyPrimary,
        r.group,
        r.mesaName,
        r.diet || "",
      ])
    );
  };

  const whatsappText = [
    `🍽️ *RELATÓRIO OFICIAL P/ BUFFET — CASAMENTO ANITA & GIUSEPPE*`,
    `📅 *Data:* 18/09/2027 · *Local:* Villa Imperial das Hortênsias`,
    `🕒 *Emitido em:* ${preview.emittedAt}`,
    ``,
    `📊 *CONTAGEM POR FAIXA ETÁRIA (CONFIRMADOS):*`,
    `• 👵 Idosos (60+): *${idosos}*`,
    `• 👤 Adultos: *${adultos}*`,
    `• 🎒 Adolescentes: *${adolescentes}*`,
    `• 🧒 Crianças (Infantil): *${criancas}*`,
    `• 🍼 Bebês de colo (isento): *${bebes}*`,
    `--------------------------------`,
    `✅ *TOTAL DE PESSOAS CONFIRMADAS:* ${sorted.length} pessoas`,
    `🪑 *TOTAL DE ASSENTOS / BUFFET:* ${assentosPagantes} lugares`,
    ``,
    `📋 *LISTA NOMINAL:*`,
    ...sorted.map((p, idx) => `${pad2(idx + 1)}. ${p.name} (${p.categoryShort}) — ${p.mesaName}`),
  ].join("\n");

  return { preview, csv, whatsappText };
}

// ---------------------------------------------------------------------------
// 2. FOLHA OFICIAL DE RECEPÇÃO & CHECK-IN (PORTARIA A-Z)
// ---------------------------------------------------------------------------
export function generateReceptionReport(
  bundle: ReportDataBundle,
  filters: ReportFilterOptions
): { preview: GeneratedReportPreview; csv: () => void; whatsappText: string } {
  const base = buildUnifiedPersonRows(bundle).filter((r) => {
    if (filters.groupFilter !== "todos" && r.group !== filters.groupFilter) return false;
    if (filters.includePendingInReception) {
      return r.status === "confirmado" || r.status === "aguardando";
    }
    return r.status === "confirmado";
  });

  const sortMode = filters.sortBy || "familia";
  const sorted = sortPersonRows(base, sortMode);
  const checkedIn = sorted.filter((r) => r.checkIn).length;
  const withMesa = sorted.filter((r) => r.mesaId !== null).length;

  const bodyHtml = `
    <h2>Lista de Portaria &amp; Recepção (${sorted.length} nomes)</h2>
    <table>
      <thead>
        <tr>
          <th style="width:52px;text-align:center;">Check</th>
          <th style="width:34px;text-align:center;">#</th>
          <th>Família / Titular</th>
          <th>Nome do Convidado</th>
          <th>Categoria</th>
          <th>Status RSVP</th>
          <th>Mesa Alocada</th>
          <th>Telefone</th>
        </tr>
      </thead>
      <tbody>
        ${sorted
          .map(
            (r, i) => `
          <tr>
            <td style="text-align:center;font-weight:700;">${r.checkIn ? "[ ✓ ]" : "[ &nbsp;&nbsp; ]"}</td>
            <td style="text-align:center;">${i + 1}</td>
            <td>
              <strong style="color:#C17767;">${escHtml(r.familySurname || r.familyPrimary)}</strong>
              ${
                r.familyPrimary && r.familyPrimary !== r.familySurname
                  ? `<div style="font-size:10px;color:#8C7B73;">Titular: ${escHtml(r.familyPrimary)}</div>`
                  : ""
              }
            </td>
            <td><strong>${escHtml(r.name)}</strong></td>
            <td>${escHtml(r.categoryShort)}</td>
            <td>
              <span class="badge ${r.status === "confirmado" ? "b-ok" : "b-wait"}">
                ${r.status === "confirmado" ? "Confirmado" : "Pendente"}
              </span>
            </td>
            <td><strong>${escHtml(r.mesaName)}</strong></td>
            <td style="font-family:monospace;font-size:11px;">${escHtml(formatPhoneBR(r.phone) || "—")}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;

  const preview = buildPrintDocumentShell({
    id: "recepcao",
    title: "Folha Oficial de Recepção & Check-in",
    subtitle: `${
      filters.includePendingInReception
        ? "Incluindo convidados confirmados e pendentes"
        : "Somente convidados com presença confirmada"
    } · Ordenação: ${sortMode === "familia" ? "Por Família (Facilita Portaria)" : sortMode === "mesa" ? "Por Mesa" : "Alfabética (A–Z)"}`,
    role: bundle.role,
    kpis: [
      { label: "Nomes na Lista", value: `${sorted.length}` },
      { label: "Com Mesa Definida", value: `${withMesa}` },
      { label: "Sem Mesa", value: `${sorted.length - withMesa}` },
      { label: "Check-in Realizado", value: `${checkedIn}` },
    ],
    bodyHtml,
  });

  const csv = () => {
    const dateSlug = new Date().toISOString().slice(0, 10);
    downloadCsvReport(
      `folha_recepcao_checkin_${dateSlug}.csv`,
      ["Check-in", "#", "Família", "Titular da Família", "Nome do Convidado", "Faixa Etária", "Status RSVP", "Mesa", "Grupo", "Telefone", "Observações"],
      sorted.map((r, i) => [
        r.checkIn ? "Presente" : "",
        i + 1,
        r.familySurname,
        r.familyPrimary,
        r.name,
        r.categoryLabel,
        r.status === "confirmado" ? "Confirmado" : "Pendente",
        r.mesaName,
        r.group,
        formatPhoneBR(r.phone),
        r.notes,
      ])
    );
  };

  const whatsappText = [
    `📋 *LISTA DE RECEPÇÃO & PORTARIA — ANITA & GIUSEPPE (18/09/2027)*`,
    `👥 *Total na lista:* ${sorted.length} convidados (${withMesa} com mesa alocada)`,
    ``,
    ...sorted.map(
      (r, idx) =>
        `${pad2(idx + 1)}. *${r.name}* (${r.categoryShort}) — ${r.mesaName} · _Fam. ${r.familyPrimary}_`
    ),
  ].join("\n");

  return { preview, csv, whatsappText };
}

// ---------------------------------------------------------------------------
// 3. MAPA COMPLETO DE ALOCAÇÃO DAS MESAS
// ---------------------------------------------------------------------------
export function generateTablesReport(bundle: ReportDataBundle): {
  preview: GeneratedReportPreview;
  csv: () => void;
  whatsappText: string;
} {
  const allRows = buildUnifiedPersonRows(bundle);
  const activeRows = allRows.filter((r) => r.status !== "ausente");
  const seatedRows = activeRows.filter((r) => r.mesaId !== null);
  const unseatedConfirmed = activeRows.filter(
    (r) => r.mesaId === null && r.status === "confirmado"
  );
  const totalCap = bundle.mesas.reduce((acc, m) => acc + m.capacidade, 0);

  const mesasHtml = bundle.mesas
    .map((m) => {
      const occupants = activeRows
        .filter((r) => r.mesaId === m.id)
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
      const vagasLivres = Math.max(0, m.capacidade - occupants.length);
      return `
      <div class="card-box">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div>
            <strong style="font-size:14px;color:#3E2723;">Mesa ${pad2(m.id)} — ${escHtml(m.nome)}</strong>
            ${m.setor ? `<span style="font-size:11px;color:#6E5F57;margin-left:8px;">(Setor: ${escHtml(m.setor)})</span>` : ""}
          </div>
          <span class="badge ${occupants.length > m.capacidade ? "b-no" : "b-ok"}">
            ${occupants.length} / ${m.capacidade} lugares (${vagasLivres} livres)
          </span>
        </div>
        ${
          occupants.length === 0
            ? `<div style="font-size:11.5px;color:#8C7A70;font-style:italic;">Nenhum convidado alocado nesta mesa ainda.</div>`
            : `<table>
                <thead>
                  <tr>
                    <th style="width:34px;text-align:center;">#</th>
                    <th>Convidado</th>
                    <th>Faixa Etária</th>
                    <th>Titular da Família</th>
                    <th>Status RSVP</th>
                  </tr>
                </thead>
                <tbody>
                  ${occupants
                    .map(
                      (o, idx) => `
                    <tr>
                      <td style="text-align:center;">${idx + 1}</td>
                      <td><strong>${escHtml(o.name)}</strong></td>
                      <td>${escHtml(o.categoryShort)}</td>
                      <td>${escHtml(o.familyPrimary)}</td>
                      <td><span class="badge ${o.status === "confirmado" ? "b-ok" : "b-wait"}">${
                        o.status === "confirmado" ? "Confirmado" : "Pendente"
                      }</span></td>
                    </tr>`
                    )
                    .join("")}
                </tbody>
              </table>`
        }
      </div>`;
    })
    .join("");

  const unseatedHtml =
    unseatedConfirmed.length > 0
      ? `
      <h2>Convidados Confirmados Ainda Sem Mesa (${unseatedConfirmed.length})</h2>
      <table>
        <thead><tr><th>Convidado</th><th>Faixa Etária</th><th>Titular da Família</th><th>Grupo</th></tr></thead>
        <tbody>
          ${unseatedConfirmed
            .map(
              (u) =>
                `<tr><td><strong>${escHtml(u.name)}</strong></td><td>${escHtml(u.categoryShort)}</td><td>${escHtml(u.familyPrimary)}</td><td>${escHtml(u.group)}</td></tr>`
            )
            .join("")}
        </tbody>
      </table>`
      : "";

  const preview = buildPrintDocumentShell({
    id: "mesas",
    title: "Mapa Oficial de Alocação das Mesas",
    subtitle: "Distribuição nominal por mesa, setor, lotação e vagas disponíveis no salão",
    role: bundle.role,
    kpis: [
      { label: "Total de Mesas", value: `${bundle.mesas.length}` },
      { label: "Lugares Ocupados", value: `${seatedRows.length} / ${totalCap}` },
      { label: "Lugares Livres", value: `${Math.max(0, totalCap - seatedRows.length)}` },
      { label: "Confirmados s/ Mesa", value: `${unseatedConfirmed.length}` },
    ],
    bodyHtml: `<h2>Distribuição por Mesa</h2>` + mesasHtml + unseatedHtml,
  });

  const csv = () => {
    const dateSlug = new Date().toISOString().slice(0, 10);
    const csvRows: (string | number)[][] = [];
    bundle.mesas.forEach((m) => {
      const occupants = activeRows.filter((r) => r.mesaId === m.id);
      if (occupants.length === 0) {
        csvRows.push([`Mesa ${pad2(m.id)}`, m.nome, m.setor || "", m.capacidade, "(Vazia)", "", "", ""]);
      } else {
        occupants.forEach((o) => {
          csvRows.push([
            `Mesa ${pad2(m.id)}`,
            m.nome,
            m.setor || "",
            m.capacidade,
            o.name,
            o.categoryLabel,
            o.familyPrimary,
            o.status === "confirmado" ? "Confirmado" : "Pendente",
          ]);
        });
      }
    });
    unseatedConfirmed.forEach((u) => {
      csvRows.push(["Sem mesa", "Aguardando alocação", "", "", u.name, u.categoryLabel, u.familyPrimary, "Confirmado"]);
    });
    downloadCsvReport(
      `mapa_de_mesas_anita_giuseppe_demo_${dateSlug}.csv`,
      ["Número", "Nome da Mesa", "Setor", "Capacidade", "Convidado", "Faixa Etária", "Família", "Status RSVP"],
      csvRows
    );
  };

  const whatsappText = [
    `🪑 *MAPA DAS MESAS — CASAMENTO ANITA & GIUSEPPE*`,
    `📊 *Ocupação:* ${seatedRows.length}/${totalCap} lugares em ${bundle.mesas.length} mesas`,
    ``,
    ...bundle.mesas.map((m) => {
      const occ = activeRows.filter((r) => r.mesaId === m.id);
      return [
        `*Mesa ${pad2(m.id)} · ${m.nome}* (${occ.length}/${m.capacidade})${m.setor ? ` — _${m.setor}_` : ""}`,
        occ.length > 0 ? occ.map((o) => `  • ${o.name} (${o.categoryShort})`).join("\n") : `  • _(Sem convidados)_`,
      ].join("\n");
    }),
  ].join("\n\n");

  return { preview, csv, whatsappText };
}

// ---------------------------------------------------------------------------
// 4. RELATÓRIO GERAL DE FAMÍLIAS & STATUS RSVP (CONFIRMADOS, AUSENTES E PENDENTES)
// ---------------------------------------------------------------------------
export function generateGeneralGuestsReport(
  bundle: ReportDataBundle,
  filters: ReportFilterOptions
): { preview: GeneratedReportPreview; csv: () => void; whatsappText: string } {
  const stats = computeUnifiedRsvpStats(bundle.officialGuests, bundle.submissions);
  const subMap = new Map<string, RsvpSubmission>();
  bundle.submissions.forEach((s) => subMap.set(s.invitationId, s));

  const filteredFamilies = bundle.officialGuests.filter(
    (g) => filters.groupFilter === "todos" || g.group === filters.groupFilter
  );

  const familySummaries = filteredFamilies.map((fam) => {
    const sub = subMap.get(fam.id) || (isPreDeclinedConfirmation(fam.firstConfirmation) ? buildPreDeclinedSubmissionFromGuest(fam) : undefined);
    const going: string[] = [];
    const absent: string[] = [];
    const pending: string[] = [];

    if (sub && sub.familyMembers?.length > 0) {
      sub.familyMembers.forEach((m) => {
        const st = getEffectiveMemberStatus(m);
        if (st === "confirmado") going.push(`${m.name} (${GUEST_CATEGORIES[normalizeGuestCategory(m.type)].shortLabel})`);
        else if (st === "ausente") absent.push(m.name);
        else pending.push(m.name);
      });
    } else {
      fam.familyMembers.forEach((m) => {
        const memName = typeof m === "string" ? m : m.name;
        const memDeclined = typeof m !== "string" && isPreDeclinedConfirmation(m.firstConfirmation);
        if (memDeclined) absent.push(memName);
        else pending.push(memName);
      });
    }

    return {
      id: fam.id,
      primaryName: fam.primaryName,
      group: fam.group,
      phone: sub?.phone || fam.phone || "",
      going,
      absent,
      pending,
      notes: sub?.message || fam.plannerNotes || "",
      timestamp: sub?.timestamp || "Aguardando",
    };
  });

  const bodyHtml = `
    <h2>Panorama Completo por Família (${familySummaries.length} convites)</h2>
    <table>
      <thead>
        <tr>
          <th>Titular / Convite</th>
          <th>Grupo</th>
          <th>Telefone</th>
          <th>Confirmados (Vai)</th>
          <th>Ausentes (Não vai)</th>
          <th>Pendentes</th>
          <th>Observação / Recado</th>
        </tr>
      </thead>
      <tbody>
        ${familySummaries
          .map(
            (f) => `
          <tr>
            <td><strong>${escHtml(f.primaryName)}</strong><br/><span style="font-size:10px;color:#8C7A70;">${escHtml(f.id)}</span></td>
            <td>${escHtml(f.group)}</td>
            <td>${escHtml(f.phone || "—")}</td>
            <td style="color:#2D4A22;">${f.going.length > 0 ? `<strong>(${f.going.length})</strong> ${escHtml(f.going.join(", "))}` : "—"}</td>
            <td style="color:#9E4231;">${f.absent.length > 0 ? `<strong>(${f.absent.length})</strong> ${escHtml(f.absent.join(", "))}` : "—"}</td>
            <td style="color:#8A5A19;">${f.pending.length > 0 ? `<strong>(${f.pending.length})</strong> ${escHtml(f.pending.join(", "))}` : "—"}</td>
            <td>${escHtml(f.notes || "—")}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;

  const preview = buildPrintDocumentShell({
    id: "geral_familias",
    title: "Relatório Geral da Lista Oficial de Convidados",
    subtitle: `Panorama consolidado de presenças, baixas e pendências (${
      filters.groupFilter === "todos" ? "Todos os Grupos" : filters.groupFilter
    })`,
    role: bundle.role,
    kpis: [
      { label: "Total na Lista", value: `${stats.totalPeople} pessoas` },
      { label: "Confirmados (Vai)", value: `${stats.confirmedPeople}` },
      { label: "Ausências (Não vai)", value: `${stats.declinedPeople}` },
      { label: "Pendentes", value: `${stats.pendingPeople}` },
      { label: "Famílias Convidadas", value: `${bundle.officialGuests.length}` },
    ],
    bodyHtml,
  });

  const csv = () => {
    const dateSlug = new Date().toISOString().slice(0, 10);
    downloadCsvReport(
      `relatorio_geral_familias_${dateSlug}.csv`,
      ["ID", "Titular da Família", "Grupo", "Telefone", "Qtd Vai", "Quem Vai", "Qtd Não Vai", "Quem Não Vai", "Qtd Pendente", "Quem Falta Responder", "Observações"],
      familySummaries.map((f) => [
        f.id,
        f.primaryName,
        f.group,
        f.phone,
        f.going.length,
        f.going.join(", "),
        f.absent.length,
        f.absent.join(", "),
        f.pending.length,
        f.pending.join(", "),
        f.notes,
      ])
    );
  };

  const whatsappText = [
    `📊 *PANORAMA GERAL DE CONVIDADOS — ANITA & GIUSEPPE*`,
    `👥 *Total na Lista Oficial:* ${stats.totalPeople} pessoas (${bundle.officialGuests.length} famílias)`,
    `✅ *Confirmados (Vai):* ${stats.confirmedPeople} pessoas (${stats.confirmedFamilies} famílias)`,
    `❌ *Ausências Comunicadas:* ${stats.declinedPeople} pessoas (${stats.familiesWithAnyAbsence} famílias c/ baixa)`,
    `⏳ *Aguardando Confirmação:* ${stats.pendingPeople} pessoas (${stats.pendingFamilies} famílias)`,
  ].join("\n");

  return { preview, csv, whatsappText };
}

// ---------------------------------------------------------------------------
// 5. RELATÓRIO DE PENDÊNCIAS DE CONFIRMAÇÃO (FOLLOW-UP / COBRANÇA ATIVA)
// ---------------------------------------------------------------------------
export function generatePendingRsvpReport(
  bundle: ReportDataBundle,
  filters: ReportFilterOptions
): { preview: GeneratedReportPreview; csv: () => void; whatsappText: string } {
  const allRows = buildUnifiedPersonRows(bundle).filter(
    (r) =>
      r.status === "aguardando" &&
      (filters.groupFilter === "todos" || r.group === filters.groupFilter)
  );

  // Agrupa por família para facilitar o contato via WhatsApp
  const byFam = new Map<
    string,
    { id: string; primaryName: string; group: string; phone: string; firstConf: string; notes: string; members: string[] }
  >();
  allRows.forEach((r) => {
    const curr = byFam.get(r.invitationId) || {
      id: r.invitationId,
      primaryName: r.familyPrimary,
      group: r.group,
      phone: r.phone,
      firstConf: r.firstConfirmation,
      notes: r.notes,
      members: [],
    };
    curr.members.push(`${r.name} (${r.categoryShort})`);
    byFam.set(r.invitationId, curr);
  });

  const pendingFamilies = Array.from(byFam.values()).sort((a, b) =>
    a.primaryName.localeCompare(b.primaryName, "pt-BR")
  );

  const bodyHtml = `
    <h2>Famílias e Convidados Pendentes de Confirmação (${pendingFamilies.length} famílias · ${allRows.length} pessoas)</h2>
    <table>
      <thead>
        <tr>
          <th style="width:36px;text-align:center;">#</th>
          <th>Titular da Família</th>
          <th>Grupo</th>
          <th>WhatsApp / Telefone</th>
          <th>Pessoas Aguardando (${allRows.length})</th>
          <th>1ª Confirmação</th>
          <th>Observações do Cerimonial</th>
        </tr>
      </thead>
      <tbody>
        ${
          pendingFamilies.length === 0
            ? `<tr><td colspan="7" style="text-align:center;">🎉 Todos os convidados deste grupo já responderam!</td></tr>`
            : pendingFamilies
                .map(
                  (f, idx) => `
          <tr>
            <td style="text-align:center;">${idx + 1}</td>
            <td><strong>${escHtml(f.primaryName)}</strong></td>
            <td>${escHtml(f.group)}</td>
            <td><strong>${escHtml(f.phone || "Sem telefone")}</strong></td>
            <td>${escHtml(f.members.join(", "))}</td>
            <td><span class="badge b-wait">${escHtml(f.firstConf)}</span></td>
            <td>${escHtml(f.notes || "—")}</td>
          </tr>`
                )
                .join("")
        }
      </tbody>
    </table>
  `;

  const preview = buildPrintDocumentShell({
    id: "pendentes",
    title: "Relatório de Follow-up · Pendentes de Confirmação",
    subtitle: "Lista de famílias que ainda não confirmaram presença no site para contato via WhatsApp",
    role: bundle.role,
    kpis: [
      { label: "Famílias Pendentes", value: `${pendingFamilies.length}` },
      { label: "Pessoas Pendentes", value: `${allRows.length}` },
      { label: "Com Telefone", value: `${pendingFamilies.filter((f) => f.phone && f.phone !== "*").length}` },
    ],
    bodyHtml,
  });

  const csv = () => {
    const dateSlug = new Date().toISOString().slice(0, 10);
    downloadCsvReport(
      `relatorio_pendentes_rsvp_${dateSlug}.csv`,
      ["#", "ID", "Titular da Família", "Grupo", "Telefone / WhatsApp", "Qtd Pendentes", "Integrantes Pendentes", "1ª Confirmação", "Observações"],
      pendingFamilies.map((f, idx) => [
        idx + 1,
        f.id,
        f.primaryName,
        f.group,
        f.phone,
        f.members.length,
        f.members.join(", "),
        f.firstConf,
        f.notes,
      ])
    );
  };

  const whatsappText = [
    `⏳ *PENDENTES DE CONFIRMAÇÃO NO SITE — ANITA & GIUSEPPE*`,
    `📌 *Total faltando responder:* ${pendingFamilies.length} famílias (${allRows.length} pessoas)`,
    ``,
    ...pendingFamilies.map(
      (f, idx) =>
        `${pad2(idx + 1)}. *${f.primaryName}* (${f.members.length} pess.: ${f.members.join(", ")}) — Tel: ${f.phone || "s/ tel"}`
    ),
  ].join("\n");

  return { preview, csv, whatsappText };
}

// ---------------------------------------------------------------------------
// 6. RELATÓRIO CONSOLIDADO DE AUSÊNCIAS / BAIXAS
// ---------------------------------------------------------------------------
export function generateAbsencesReport(
  bundle: ReportDataBundle,
  filters: ReportFilterOptions
): { preview: GeneratedReportPreview; csv: () => void; whatsappText: string } {
  const absentRows = sortPersonRows(
    buildUnifiedPersonRows(bundle).filter(
      (r) =>
        r.status === "ausente" &&
        (filters.groupFilter === "todos" || r.group === filters.groupFilter)
    ),
    filters.sortBy
  );

  const uniqueFamilies = new Set(absentRows.map((r) => r.invitationId)).size;

  const bodyHtml = `
    <h2>Lista Nominal de Ausências Comunicadas (${absentRows.length} pessoas)</h2>
    <table>
      <thead>
        <tr>
          <th style="width:36px;text-align:center;">#</th>
          <th>Convidado Ausente</th>
          <th>Faixa Etária</th>
          <th>Titular da Família</th>
          <th>Grupo</th>
          <th>Telefone</th>
          <th>Motivo / Observação</th>
        </tr>
      </thead>
      <tbody>
        ${
          absentRows.length === 0
            ? `<tr><td colspan="7" style="text-align:center;">Nenhuma ausência registrada até o momento.</td></tr>`
            : absentRows
                .map(
                  (r, i) => `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td><strong>${escHtml(r.name)}</strong></td>
            <td>${escHtml(r.categoryShort)}</td>
            <td>${escHtml(r.familyPrimary)}</td>
            <td>${escHtml(r.group)}</td>
            <td>${escHtml(r.phone || "—")}</td>
            <td>${escHtml(r.notes || "Comunicou não comparecimento")}</td>
          </tr>`
                )
                .join("")
        }
      </tbody>
    </table>
  `;

  const preview = buildPrintDocumentShell({
    id: "ausencias",
    title: "Relatório Consolidado de Ausências (Baixas)",
    subtitle: "Controle de pessoas e famílias que comunicaram não comparecimento (liberação de vagas/buffet)",
    role: bundle.role,
    kpis: [
      { label: "Total de Ausências", value: `${absentRows.length} pessoas` },
      { label: "Famílias c/ Baixa", value: `${uniqueFamilies} famílias` },
      {
        label: "Assentos Liberados",
        value: `${absentRows.filter((r) => r.category !== "bebe").length} lugares`,
      },
    ],
    bodyHtml,
  });

  const csv = () => {
    const dateSlug = new Date().toISOString().slice(0, 10);
    downloadCsvReport(
      `relatorio_ausencias_casamento_${dateSlug}.csv`,
      ["#", "Convidado Ausente", "Faixa Etária", "Titular da Família", "Grupo", "Telefone", "Observação / Motivo"],
      absentRows.map((r, i) => [
        i + 1,
        r.name,
        r.categoryLabel,
        r.familyPrimary,
        r.group,
        r.phone,
        r.notes || "Comunicou ausência",
      ])
    );
  };

  const whatsappText = [
    `❌ *RELATÓRIO DE AUSÊNCIAS / BAIXAS — ANITA & GIUSEPPE*`,
    `📉 *Total de baixas contabilizadas:* ${absentRows.length} pessoa(s) em ${uniqueFamilies} família(s)`,
    ``,
    ...(absentRows.length === 0
      ? ["Nenhuma ausência registrada."]
      : absentRows.map(
          (r, i) => `${pad2(i + 1)}. ${r.name} (${r.categoryShort}) — _Fam. ${r.familyPrimary}_`
        )),
  ].join("\n");

  return { preview, csv, whatsappText };
}

// ---------------------------------------------------------------------------
// 7. DOSSIÊ OPERACIONAL DO CERIMONIAL (ROTEIRO + FORNECEDORES + CHECKLIST)
// ---------------------------------------------------------------------------
export function generateCeremonialDossierReport(bundle: ReportDataBundle): {
  preview: GeneratedReportPreview;
  csv: () => void;
  whatsappText: string;
} {
  const doneCount = bundle.checklist.filter((c) => c.done).length;
  const pct =
    bundle.checklist.length > 0 ? Math.round((doneCount / bundle.checklist.length) * 100) : 0;

  const roteiroHtml = `
    <h2>1. Cronograma &amp; Roteiro Oficial do Dia (18/09/2027)</h2>
    <table>
      <thead>
        <tr>
          <th style="width:75px;">Horário</th>
          <th>Momento / Etapa</th>
          <th>Descrição Operacional</th>
          <th style="width:105px;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${bundle.roteiro
          .map(
            (r) => `
          <tr>
            <td><strong>${escHtml(r.hora)}</strong></td>
            <td><strong>${escHtml(r.titulo)}</strong></td>
            <td>${escHtml(r.desc)}</td>
            <td>
              <span class="badge ${
                r.status === "concluido" ? "b-ok" : r.status === "andamento" ? "b-wait" : "b-cat"
              }">
                ${
                  r.status === "concluido"
                    ? "Concluído"
                    : r.status === "andamento"
                    ? "Em andamento"
                    : "Programado"
                }
              </span>
            </td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;

  const fornHtml = `
    <h2>2. Quadro Oficial de Fornecedores &amp; Contatos</h2>
    <table>
      <thead>
        <tr>
          <th>Fornecedor / Responsável</th>
          <th>Serviço Contratado</th>
          <th>Telefone / WhatsApp</th>
        </tr>
      </thead>
      <tbody>
        ${bundle.fornecedores
          .map(
            (f) => `
          <tr>
            <td><strong>${escHtml(f.nome)}</strong></td>
            <td>${escHtml(f.servico)}</td>
            <td><strong>${escHtml(f.contato)}</strong></td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;

  const checkHtml = `
    <h2>3. Checklist Operacional do Cerimonial (${doneCount}/${bundle.checklist.length} concluídas)</h2>
    <table>
      <thead>
        <tr>
          <th style="width:55px;text-align:center;">Check</th>
          <th style="width:120px;">Categoria</th>
          <th>Tarefa Operacional</th>
        </tr>
      </thead>
      <tbody>
        ${bundle.checklist
          .map(
            (c) => `
          <tr>
            <td style="text-align:center;font-weight:700;">${c.done ? "[ ✓ ]" : "[ &nbsp;&nbsp; ]"}</td>
            <td><span class="badge b-cat">${escHtml(c.categoria || "Geral")}</span></td>
            <td style="${c.done ? "text-decoration:line-through;color:#8C7A70;" : ""}">${escHtml(c.item)}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;

  const preview = buildPrintDocumentShell({
    id: "dossie_cerimonial",
    title: "Dossiê Operacional do Grande Dia (Cerimonial)",
    subtitle: "Roteiro hora a hora, contatos dos fornecedores e checklist operacional de execução",
    role: bundle.role,
    kpis: [
      { label: "Etapas do Roteiro", value: `${bundle.roteiro.length}` },
      { label: "Fornecedores", value: `${bundle.fornecedores.length}` },
      { label: "Checklist Concluído", value: `${pct}% (${doneCount}/${bundle.checklist.length})` },
      { label: "Tarefas Pendentes", value: `${bundle.checklist.length - doneCount}` },
    ],
    bodyHtml: roteiroHtml + fornHtml + checkHtml,
  });

  const csv = () => {
    const dateSlug = new Date().toISOString().slice(0, 10);
    const rows: (string | number)[][] = [
      ...bundle.roteiro.map((r) => ["ROTEIRO", r.hora, r.titulo, r.desc, r.status]),
      ...bundle.fornecedores.map((f) => ["FORNECEDOR", "", f.nome, f.servico, f.contato]),
      ...bundle.checklist.map((c) => [
        "CHECKLIST",
        c.categoria || "Geral",
        c.item,
        "",
        c.done ? "Concluído" : "Pendente",
      ]),
    ];
    downloadCsvReport(
      `dossie_operacional_cerimonial_${dateSlug}.csv`,
      ["Seção", "Horário / Categoria", "Título / Nome", "Descrição / Serviço", "Status / Contato"],
      rows
    );
  };

  const whatsappText = [
    `⏱️ *DOSSIÊ OPERACIONAL DO DIA — ANITA & GIUSEPPE (18/09/2027)*`,
    `📍 *Local:* Villa Imperial das Hortênsias`,
    ``,
    `🗓️ *ROTEIRO OFICIAL:*`,
    ...bundle.roteiro.map((r) => `• *${r.hora}* — ${r.titulo}`),
    ``,
    `📞 *FORNECEDORES:*`,
    ...bundle.fornecedores.map((f) => `• *${f.nome}* (${f.servico}): ${f.contato}`),
    ``,
    `✅ *CHECKLIST:* ${doneCount}/${bundle.checklist.length} concluídos (${pct}%)`,
  ].join("\n");

  return { preview, csv, whatsappText };
}

// ---------------------------------------------------------------------------
// 8. EXCLUSIVO DOS NOIVOS: RELATÓRIO FINANCEIRO DE PRESENTES, COTAS PIX & AGRADECIMENTOS
// ---------------------------------------------------------------------------
export function generateGiftsFinancialReport(
  bundle: ReportDataBundle,
  filters: ReportFilterOptions
): { preview: GeneratedReportPreview; csv: () => void; whatsappText: string } {
  const allGifts = bundle.gifts || [];
  const filteredGifts = filters.onlyPendingThanksGifts
    ? allGifts.filter((g) => !g.thanked)
    : allGifts;

  const pixGifts = allGifts.filter((g) => g.type === "pix_cota" || g.type === "pix_avulso");
  const storeGifts = allGifts.filter((g) => g.type === "lista_amazon" || g.type === "presente_fisico");
  const totalPix = pixGifts.reduce((acc, g) => acc + (g.amount || 0), 0);
  const confirmedBankTotal = pixGifts
    .filter((g) => g.confirmedAtBank)
    .reduce((acc, g) => acc + (g.amount || 0), 0);
  const pendingThanks = allGifts.filter((g) => !g.thanked).length;

  const cotasSummaryHtml = `
    <h2>Desempenho por Cota Simbólica</h2>
    <table>
      <thead>
        <tr>
          <th>Cota Simbólica</th>
          <th style="width:110px;">Valor Sugerido</th>
          <th style="width:110px;text-align:center;">Contribuições</th>
          <th style="width:130px;text-align:right;">Total Acumulado</th>
        </tr>
      </thead>
      <tbody>
        ${COTAS.map((c) => {
          const matches = allGifts.filter(
            (g) => g.cotaId === c.id || g.giftTitle.toLowerCase().includes(c.title.toLowerCase())
          );
          const sum = matches.reduce((acc, g) => acc + (g.amount || 0), 0);
          return `
          <tr>
            <td><strong>${escHtml(c.title)}</strong></td>
            <td>${formatBrl(c.value)}</td>
            <td style="text-align:center;">${matches.length}</td>
            <td style="text-align:right;font-weight:700;">${formatBrl(sum)}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
  `;

  const giftsListHtml = `
    <h2>Relação Nominal de Presentes Recebidos (${filteredGifts.length})</h2>
    <table>
      <thead>
        <tr>
          <th>Data</th>
          <th>Quem Presenteou</th>
          <th>Telefone</th>
          <th>Modalidade</th>
          <th>Presente / Cota</th>
          <th style="text-align:right;">Valor</th>
          <th>Banco</th>
          <th>Agradecido?</th>
        </tr>
      </thead>
      <tbody>
        ${
          filteredGifts.length === 0
            ? `<tr><td colspan="8" style="text-align:center;">Nenhum registro encontrado para este filtro.</td></tr>`
            : filteredGifts
                .map(
                  (g) => `
          <tr>
            <td>${escHtml(g.date)}</td>
            <td><strong>${escHtml(g.guestName)}</strong></td>
            <td>${escHtml(g.phone || "—")}</td>
            <td>${
              g.type === "pix_cota"
                ? "Cota Pix"
                : g.type === "pix_avulso"
                ? "Pix Livre"
                : g.type === "lista_amazon"
                ? "Lista Amazon"
                : "Presente Físico"
            }</td>
            <td>${escHtml(g.giftTitle)}</td>
            <td style="text-align:right;font-weight:700;">${g.amount ? formatBrl(g.amount) : "—"}</td>
            <td><span class="badge ${g.confirmedAtBank ? "b-ok" : "b-wait"}">${
                    g.confirmedAtBank ? "Confirmado" : "Conferir"
                  }</span></td>
            <td><span class="badge ${g.thanked ? "b-ok" : "b-no"}">${
                    g.thanked ? "✓ Sim" : "Pendente"
                  }</span></td>
          </tr>`
                )
                .join("")
        }
      </tbody>
    </table>
  `;

  const preview = buildPrintDocumentShell({
    id: "presentes_financeiro",
    title: "Relatório Financeiro de Presentes, Cotas Pix & Agradecimentos",
    subtitle: "Documento confidencial exclusivo dos noivos · Arrecadação em Pix, presentes físicos e controle de agradecimentos",
    role: "noivos",
    kpis: [
      { label: "Total Arrecadado (Pix)", value: formatBrl(totalPix) },
      { label: "Confirmado no Banco", value: formatBrl(confirmedBankTotal) },
      { label: "Total de Presentes", value: `${allGifts.length}` },
      { label: "Itens Loja / Amazon", value: `${storeGifts.length}` },
      { label: "Falta Agradecer", value: `${pendingThanks}` },
    ],
    bodyHtml: cotasSummaryHtml + giftsListHtml,
  });

  const csv = () => {
    const dateSlug = new Date().toISOString().slice(0, 10);
    downloadCsvReport(
      `relatorio_financeiro_presentes_noivos_${dateSlug}.csv`,
      ["Data", "Quem Presenteou", "Telefone", "Tipo", "Presente / Cota", "Valor (R$)", "Confirmado no Banco", "Agradecido", "Mensagem"],
      filteredGifts.map((g) => [
        g.date,
        g.guestName,
        g.phone || "",
        g.type === "pix_cota"
          ? "Cota Pix"
          : g.type === "pix_avulso"
          ? "Pix Livre"
          : g.type === "lista_amazon"
          ? "Lista Amazon"
          : "Presente Físico",
        g.giftTitle,
        g.amount ? g.amount.toFixed(2).replace(".", ",") : "",
        g.confirmedAtBank ? "Sim" : "Pendente",
        g.thanked ? "Sim" : "Pendente",
        g.message || "",
      ])
    );
  };

  const whatsappText = [
    `💝 *RESUMO PRIVADO DOS NOIVOS — PRESENTES & PIX*`,
    `💰 *Total em Pix / Cotas:* ${formatBrl(totalPix)} (${pixGifts.length} contribuições)`,
    `🛍️ *Presentes Lista / Físicos:* ${storeGifts.length} itens`,
    `💌 *Faltam agradecer:* ${pendingThanks} pessoa(s)`,
    ``,
    ...(filteredGifts.slice(0, 25).map(
      (g, i) =>
        `${pad2(i + 1)}. *${g.guestName}* — ${g.giftTitle}${g.amount ? ` (${formatBrl(g.amount)})` : ""} [${
          g.thanked ? "✓ Agradecido" : "⏳ Agradecer"
        }]`
    )),
  ].join("\n");

  return { preview, csv, whatsappText };
}

// ---------------------------------------------------------------------------
// 9. EXCLUSIVO DOS NOIVOS: LIVRETO DE RECORDAÇÕES (RECADOS & LOUVORES SUGERIDOS)
// ---------------------------------------------------------------------------
export function generateMemoriesAndSongsReport(bundle: ReportDataBundle): {
  preview: GeneratedReportPreview;
  csv: () => void;
  whatsappText: string;
} {
  const rsvpMsgs = bundle.submissions
    .filter((s) => s.message && s.message.trim().length > 0)
    .map((s) => ({
      author: `Família de ${s.primaryName}`,
      origin: "Confirmação de Presença (RSVP)",
      date: s.timestamp,
      text: s.message.trim(),
    }));

  const muralMsgs = (bundle.muralMessages || []).map((m) => ({
    author: m.name,
    origin: `Mural do Site${m.relation ? ` (${m.relation})` : ""}`,
    date: m.date,
    text: m.message,
  }));

  const giftMsgs = (bundle.gifts || [])
    .filter((g) => g.message && g.message.trim().length > 0)
    .map((g) => ({
      author: g.guestName,
      origin: `Junto ao Presente (${g.giftTitle})`,
      date: g.date,
      text: g.message!.trim(),
    }));

  const allMessages = [...rsvpMsgs, ...muralMsgs, ...giftMsgs];
  const songs = bundle.songSuggestions || [];

  const messagesHtml = `
    <h2>1. Mensagens &amp; Votos de Carinho dos Convidados (${allMessages.length})</h2>
    ${
      allMessages.length === 0
        ? `<p style="font-size:12px;color:#8C7A70;">Nenhum recado registrado até o momento.</p>`
        : allMessages
            .map(
              (m) => `
        <div class="card-box">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:#8C6D58;margin-bottom:4px;">
            <strong>${escHtml(m.author)} · <span style="font-weight:400;">${escHtml(m.origin)}</span></strong>
            <span>${escHtml(m.date)}</span>
          </div>
          <div style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:#3E2723;white-space:pre-line;">“${escHtml(m.text)}”</div>
        </div>`
            )
            .join("")
    }
  `;

  const songsHtml = `
    <h2>2. Sugestões de Louvores &amp; Músicas (${songs.length})</h2>
    <table>
      <thead>
        <tr>
          <th style="width:36px;text-align:center;">#</th>
          <th>Título do Louvor / Música</th>
          <th>Intérprete / Igreja</th>
          <th>Link de Referência</th>
          <th>Data</th>
        </tr>
      </thead>
      <tbody>
        ${
          songs.length === 0
            ? `<tr><td colspan="5" style="text-align:center;">Nenhuma sugestão registrada.</td></tr>`
            : songs
                .map(
                  (s, i) => `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td><strong>${escHtml(s.title)}</strong></td>
            <td>${escHtml(s.artist || "—")}</td>
            <td style="word-break:break-all;">${escHtml(s.link || "—")}</td>
            <td>${escHtml(s.date)}</td>
          </tr>`
                )
                .join("")
        }
      </tbody>
    </table>
  `;

  const preview = buildPrintDocumentShell({
    id: "recordacoes_louvores",
    title: "Caderno de Recordações: Recados Carinhosos & Louvores",
    subtitle: "Compilado afetivo de todas as mensagens recebidas pelos noivos e sugestões musicais para a celebração",
    role: "noivos",
    kpis: [
      { label: "Total de Recados", value: `${allMessages.length}` },
      { label: "Recados no RSVP", value: `${rsvpMsgs.length}` },
      { label: "Recados no Mural/Presentes", value: `${muralMsgs.length + giftMsgs.length}` },
      { label: "Louvores Sugeridos", value: `${songs.length}` },
    ],
    bodyHtml: messagesHtml + songsHtml,
  });

  const csv = () => {
    const dateSlug = new Date().toISOString().slice(0, 10);
    const rows: (string | number)[][] = [
      ...allMessages.map((m) => ["RECADO", m.author, m.origin, m.text, m.date]),
      ...songs.map((s) => ["LOUVOR", s.title, s.artist || "", s.link || "", s.date]),
    ];
    downloadCsvReport(
      `recordacoes_recados_e_louvores_${dateSlug}.csv`,
      ["Categoria", "Autor / Título", "Origem / Artista", "Mensagem / Link", "Data"],
      rows
    );
  };

  const whatsappText = [
    `🎵 *SUGESTÕES DE LOUVORES & RECADOS — ANITA & GIUSEPPE*`,
    `💌 *Recados recebidos:* ${allMessages.length} mensagens carinhosas`,
    `🎶 *Louvores sugeridos (${songs.length}):*`,
    ...songs.map(
      (s, i) => `${pad2(i + 1)}. *${s.title}*${s.artist ? ` — ${s.artist}` : ""}${s.link ? `\n   🔗 ${s.link}` : ""}`
    ),
  ].join("\n");

  return { preview, csv, whatsappText };
}
