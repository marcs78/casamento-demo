// Padronização de telefones no formato brasileiro: (DD) 12345-6789
// Módulo puro (sem dependências), usado tanto no navegador quanto nas rotas de API.

/** Retorna somente os dígitos do telefone. */
export function phoneDigits(phone?: string | null): string {
  return String(phone ?? "").replace(/\D/g, "");
}

/** Indica se o telefone é internacional (fora do Brasil), ex.: +351 Portugal. */
function isInternational(raw: string, digits: string): boolean {
  const trimmed = raw.trim();
  if (trimmed.startsWith("+") && !digits.startsWith("55")) return true;
  if (trimmed.startsWith("00") && !digits.startsWith("0055")) return true;
  // 12+ dígitos sem o DDI 55 do Brasil
  if (!trimmed.startsWith("+") && digits.length >= 12 && !digits.startsWith("55")) return true;
  return false;
}

/**
 * Converte para o número nacional brasileiro (DDD + número), adicionando o 9º dígito
 * em celulares antigos de 8 dígitos (iniciados por 6, 7, 8 ou 9).
 * Retorna "" quando não é possível identificar um número brasileiro válido.
 */
export function toBrazilianNationalNumber(phone?: string | null): string {
  const raw = String(phone ?? "");
  let digits = phoneDigits(raw);
  if (!digits || isInternational(raw, digits)) return "";

  // Remove prefixos de discagem: 0055, 55 (DDI) e 0 (operadora/DDD)
  if (digits.startsWith("0055")) digits = digits.slice(4);
  if (digits.length >= 12 && digits.startsWith("55")) digits = digits.slice(2);
  if (digits.length >= 11 && digits.startsWith("0")) digits = digits.replace(/^0+/, "");

  if (digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const local = digits.slice(2);
    // Celular antigo com 8 dígitos -> acrescenta o 9 na frente
    if (/^[6-9]/.test(local)) return `${ddd}9${local}`;
    return digits; // telefone fixo
  }
  if (digits.length === 11) return digits;
  return "";
}

/**
 * Formata qualquer telefone no padrão brasileiro "(DD) 12345-6789".
 * - Fixos ficam "(DD) 1234-5678".
 * - Telefones internacionais ou sem dados suficientes são preservados como foram digitados.
 */
export function formatPhoneBR(phone?: string | null): string {
  const raw = String(phone ?? "").trim();
  if (!raw || raw === "*" || raw === "-") return raw;
  const national = toBrazilianNationalNumber(raw);
  if (national.length === 11) {
    return `(${national.slice(0, 2)}) ${national.slice(2, 7)}-${national.slice(7)}`;
  }
  if (national.length === 10) {
    return `(${national.slice(0, 2)}) ${national.slice(2, 6)}-${national.slice(6)}`;
  }
  // Sem DDD: formata apenas o número local
  const digits = phoneDigits(raw);
  if (!raw.startsWith("+") && digits.length === 9) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  if (!raw.startsWith("+") && digits.length === 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return raw;
}

/** Formata um telefone opcional, mantendo undefined quando não houver valor. */
export function formatOptionalPhoneBR(phone?: string | null): string | undefined {
  if (phone === undefined || phone === null) return undefined;
  return formatPhoneBR(phone);
}

/** Número no formato aceito pelo WhatsApp (DDI + DDD + número, somente dígitos). */
export function toWhatsAppNumber(phone?: string | null): string {
  const raw = String(phone ?? "");
  const digits = phoneDigits(raw);
  if (digits.length < 8) return "";
  const national = toBrazilianNationalNumber(raw);
  if (national) return `55${national}`;
  if (isInternational(raw, digits)) return digits.replace(/^00/, "");
  return digits.length >= 12 ? digits : `55${digits}`;
}

/**
 * Compara um telefone com um termo de busca, aceitando tanto texto formatado
 * quanto apenas números (ex.: "4799579431" encontra "(47) 99957-9431").
 */
export function phoneMatchesQuery(phone: string | undefined | null, query: string): boolean {
  const p = String(phone ?? "");
  const q = query.trim();
  if (!p || !q) return false;
  if (p.toLowerCase().includes(q.toLowerCase())) return true;
  const qDigits = phoneDigits(q);
  if (qDigits.length < 3) return false;
  const pDigits = phoneDigits(p);
  if (pDigits.includes(qDigits)) return true;
  // Tolera o 9º dígito: compara pelos últimos 8 dígitos
  if (qDigits.length >= 8) return pDigits.slice(-8) === qDigits.slice(-8);
  return false;
}

type WithPhone = { phone?: string };

/** Padroniza o telefone principal e o de cada integrante de um convite / confirmação. */
export function normalizeRecordPhones<
  T extends WithPhone & { familyMembers?: unknown[] }
>(record: T): T {
  if (!record || typeof record !== "object") return record;
  const out: T = { ...record };
  if (typeof out.phone === "string") out.phone = formatPhoneBR(out.phone);
  if (Array.isArray(out.familyMembers)) {
    out.familyMembers = out.familyMembers.map((m) => {
      if (m && typeof m === "object" && typeof (m as WithPhone).phone === "string") {
        return { ...(m as object), phone: formatPhoneBR((m as WithPhone).phone) };
      }
      return m;
    });
  }
  return out;
}

/** Padroniza o telefone de itens simples (notificações, presentes). */
export function normalizeItemPhone<T extends WithPhone>(item: T): T {
  if (!item || typeof item !== "object" || typeof item.phone !== "string") return item;
  return { ...item, phone: formatPhoneBR(item.phone) };
}
