// Persistência isolada da Versão Demo (Upstash Redis via env vars próprias OU fallback em memória)
// Nunca se conecta ao banco oficial de produção sem configuração explícita de ambiente.
import type { RsvpSubmission, RsvpNotification, GiftContribution, GuestRecord } from "./guestList";
import { normalizeItemPhone, normalizeRecordPhones } from "./phone";

const REDIS_URL =
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL ||
  "";

const REDIS_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN ||
  "";

interface DemoMemEntry {
  value: string;
  expiresAt?: number;
}

const g = globalThis as unknown as {
  __agDemoMemStore?: Map<string, DemoMemEntry>;
};

function getMemStore(): Map<string, DemoMemEntry> {
  if (!g.__agDemoMemStore) {
    g.__agDemoMemStore = new Map<string, DemoMemEntry>();
  }
  return g.__agDemoMemStore;
}

function memGet(key: string): string | null {
  const store = getMemStore();
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

function execMemoryRedis<T = unknown>(cmd: (string | number)[]): T | null {
  const store = getMemStore();
  const op = String(cmd[0] || "").toUpperCase();

  if (op === "GET") {
    return memGet(String(cmd[1])) as unknown as T;
  }
  if (op === "MGET") {
    const res = cmd.slice(1).map((k) => memGet(String(k)));
    return res as unknown as T;
  }
  if (op === "SET") {
    store.set(String(cmd[1]), { value: String(cmd[2]) });
    return "OK" as unknown as T;
  }
  if (op === "DEL") {
    let removed = 0;
    for (const k of cmd.slice(1)) {
      if (store.delete(String(k))) removed++;
    }
    return removed as unknown as T;
  }
  if (op === "INCR") {
    const key = String(cmd[1]);
    const curr = Number(memGet(key) || "0");
    const next = (Number.isFinite(curr) ? curr : 0) + 1;
    const prevExp = store.get(key)?.expiresAt;
    store.set(key, { value: String(next), expiresAt: prevExp });
    return next as unknown as T;
  }
  if (op === "EXPIRE") {
    const key = String(cmd[1]);
    const secs = Number(cmd[2] || 0);
    const entry = store.get(key);
    if (!entry) return 0 as unknown as T;
    entry.expiresAt = Date.now() + secs * 1000;
    store.set(key, entry);
    return 1 as unknown as T;
  }
  if (op === "TTL") {
    const entry = store.get(String(cmd[1]));
    if (!entry || !entry.expiresAt) return -1 as unknown as T;
    return Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000)) as unknown as T;
  }
  return null;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action:
    | "rsvp_confirmado"
    | "rsvp_ausencia"
    | "rsvp_editado"
    | "categoria_alterada"
    | "convidado_salvo"
    | "convidado_removido"
    | "presente_recebido"
    | "backup_exportado"
    | "backup_restaurado"
    | "acesso_painel"
    | "pin_alterado"
    | "tentativa_pin_invalido";
  actor: string;
  summary: string;
  details?: string;
  device?: string;
  payloadSnapshot?: unknown;
}

export function formatNowBR(): string {
  try {
    return new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return new Date().toISOString();
  }
}

export function extractRequestDeviceMeta(request?: Request): string {
  if (!request) return "Modo Demonstração";
  try {
    const ua = request.headers.get("user-agent") || "";
    const city = request.headers.get("x-vercel-ip-city");
    const region = request.headers.get("x-vercel-ip-country-region");

    let os = "Dispositivo Web";
    if (/iPhone|iPad|iPod/i.test(ua)) os = "iPhone / iOS";
    else if (/Android/i.test(ua)) os = "Android";
    else if (/Windows/i.test(ua)) os = "Windows PC";
    else if (/Macintosh|Mac OS X/i.test(ua)) os = "Mac";
    else if (/Linux/i.test(ua)) os = "Linux";

    let browser = "Navegador";
    if (/Edg\//i.test(ua)) browser = "Edge";
    else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = "Chrome";
    else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari";
    else if (/Firefox\//i.test(ua)) browser = "Firefox";

    const loc = city
      ? `${decodeURIComponent(city)}${region ? `/${region}` : ""}`
      : "";

    return loc ? `${os} (${browser}) · ${loc}` : `${os} (${browser})`;
  } catch {
    return "Navegador Web";
  }
}

export async function redisCommand<T = unknown>(cmd: (string | number)[]): Promise<T | null> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    return execMemoryRedis<T>(cmd);
  }
  try {
    const res = await fetch(REDIS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cmd),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.result as T;
  } catch {
    return null;
  }
}

export async function getCloudAuditLogs(): Promise<AuditLogEntry[]> {
  try {
    const raw = await redisCommand<string>(["GET", "demo_wedding:audit_logs"]);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function appendCloudAuditLog(
  entry: Omit<AuditLogEntry, "id" | "timestamp"> & { id?: string; timestamp?: string }
): Promise<void> {
  try {
    const current = await getCloudAuditLogs();
    const newEntry: AuditLogEntry = {
      id: entry.id || `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: entry.timestamp || formatNowBR(),
      action: entry.action,
      actor: entry.actor,
      summary: entry.summary,
      details: entry.details,
      device: entry.device,
      payloadSnapshot: entry.payloadSnapshot,
    };
    const updated = [newEntry, ...current].slice(0, 500);
    await redisCommand(["SET", "demo_wedding:audit_logs", JSON.stringify(updated)]);
  } catch {
    // Non-blocking
  }
}

export async function saveCloudAutomaticBackupSnapshot(): Promise<void> {
  try {
    const res = await redisCommand<(string | null)[]>([
      "MGET",
      "demo_wedding:rsvps",
      "demo_wedding:notifications",
      "demo_wedding:guests",
      "demo_wedding:gifts",
      "demo_wedding:mesas",
      "demo_wedding:assignments",
      "demo_wedding:fornecedores",
      "demo_wedding:roteiro",
      "demo_wedding:checklist",
      "demo_wedding:mural",
      "demo_wedding:songs",
    ]);
    if (!Array.isArray(res)) return;

    const [
      rsvpsRaw,
      notifsRaw,
      guestsRaw,
      giftsRaw,
      mesasRaw,
      assignRaw,
      fornRaw,
      rotRaw,
      checkRaw,
      muralRaw,
      songsRaw,
    ] = res;

    const snapshot = {
      savedAt: formatNowBR(),
      submissions: rsvpsRaw ? JSON.parse(rsvpsRaw) : [],
      notifications: notifsRaw ? JSON.parse(notifsRaw) : [],
      guests: guestsRaw ? JSON.parse(guestsRaw) : [],
      gifts: giftsRaw ? JSON.parse(giftsRaw) : [],
      mesas: mesasRaw ? JSON.parse(mesasRaw) : null,
      assignments: assignRaw ? JSON.parse(assignRaw) : null,
      fornecedores: fornRaw ? JSON.parse(fornRaw) : null,
      roteiro: rotRaw ? JSON.parse(rotRaw) : null,
      checklist: checkRaw ? JSON.parse(checkRaw) : null,
      mural: muralRaw ? JSON.parse(muralRaw) : [],
      songs: songsRaw ? JSON.parse(songsRaw) : [],
    };
    await redisCommand(["SET", "demo_wedding:backup_snapshot", JSON.stringify(snapshot)]);
  } catch {
    // Non-blocking
  }
}

export async function getCloudRsvps(): Promise<{
  ok: boolean;
  submissions: RsvpSubmission[];
  notifications: RsvpNotification[];
}> {
  try {
    const res = await redisCommand<(string | null)[]>([
      "MGET",
      "demo_wedding:rsvps",
      "demo_wedding:notifications",
    ]);

    if (!Array.isArray(res)) {
      return { ok: false, submissions: [], notifications: [] };
    }

    const [subRaw, notifRaw] = res;
    const submissions: RsvpSubmission[] = subRaw ? JSON.parse(subRaw) : [];
    const notifications: RsvpNotification[] = notifRaw ? JSON.parse(notifRaw) : [];

    return {
      ok: true,
      submissions: Array.isArray(submissions) ? submissions.map((s) => normalizeRecordPhones(s)) : [],
      notifications: Array.isArray(notifications) ? notifications.map((n) => normalizeItemPhone(n)) : [],
    };
  } catch {
    return { ok: false, submissions: [], notifications: [] };
  }
}

export async function saveCloudRsvp(
  rawSubmission: RsvpSubmission,
  rawNotification?: RsvpNotification,
  deviceMeta?: string
): Promise<boolean> {
  try {
    const submission = normalizeRecordPhones(rawSubmission);
    const notification = rawNotification ? normalizeItemPhone(rawNotification) : undefined;
    const current = await getCloudRsvps();
    if (!current.ok) return false;

    const baseSubmissions = current.submissions;
    const existedBefore = baseSubmissions.some((s) => s.invitationId === submission.invitationId);
    const updatedSubmissions = [
      submission,
      ...baseSubmissions.filter((s) => s.invitationId !== submission.invitationId),
    ];
    const res1 = await redisCommand(["SET", "demo_wedding:rsvps", JSON.stringify(updatedSubmissions)]);
    if (!res1) return false;

    if (notification) {
      const baseNotifs = current.notifications;
      const updatedNotifs = [
        notification,
        ...baseNotifs.filter((n) => n.id !== notification.id),
      ].slice(0, 100);
      await redisCommand(["SET", "demo_wedding:notifications", JSON.stringify(updatedNotifs)]);
    }

    const goingNames = (submission.familyMembers || [])
      .filter((m) => (m.memberStatus ? m.memberStatus === "confirmado" : m.confirmed))
      .map((m) => m.name);
    const notGoingNames = (submission.familyMembers || [])
      .filter((m) => (m.memberStatus ? m.memberStatus === "ausente" : !m.confirmed))
      .map((m) => m.name);

    await appendCloudAuditLog({
      timestamp: submission.timestamp || formatNowBR(),
      action:
        goingNames.length === 0 && notGoingNames.length > 0
          ? "rsvp_ausencia"
          : existedBefore
          ? "rsvp_editado"
          : "rsvp_confirmado",
      actor: `Família de ${submission.primaryName} (${submission.phone || "sem tel"})`,
      summary:
        goingNames.length > 0
          ? `${existedBefore ? "Atualizou presença" : "Confirmou presença"} de ${goingNames.length} pessoa(s): ${goingNames.join(", ")}${
              notGoingNames.length > 0 ? ` | Não vão (${notGoingNames.length}): ${notGoingNames.join(", ")}` : ""
            }`
          : notGoingNames.length > 0
          ? `Registrou não comparecimento (${notGoingNames.length} ausente(s)): ${notGoingNames.join(", ") || submission.primaryName}`
          : `Retornou status de ${submission.primaryName} para Pendente`,
      details: submission.message ? `Recado: “${submission.message}”` : undefined,
      device: deviceMeta || "Convite Demo Online",
      payloadSnapshot: submission,
    });

    await saveCloudAutomaticBackupSnapshot();

    return true;
  } catch {
    return false;
  }
}

export async function getCloudPlannerContact(): Promise<{ name: string; phone: string }> {
  try {
    const raw = await redisCommand<string>(["GET", "demo_wedding:planner_contact"]);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name : "Camila Vasconcelos",
          phone: typeof parsed.phone === "string" && parsed.phone.trim() ? parsed.phone : "(24) 99900-2027",
        };
      }
    }
  } catch {}
  return { name: "Camila Vasconcelos", phone: "(24) 99900-2027" };
}

export async function saveCloudPlannerContact(contact: { name: string; phone: string }): Promise<boolean> {
  try {
    const res = await redisCommand(["SET", "demo_wedding:planner_contact", JSON.stringify(contact)]);
    return res !== null;
  } catch {
    return false;
  }
}

export async function markCloudNotificationsRead(
  role: "noivos" | "cerimonialista",
  notificationId?: string
): Promise<boolean> {
  try {
    const raw = await redisCommand<string>(["GET", "demo_wedding:notifications"]);
    if (!raw) return true;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return false;
    const updated = (parsed as RsvpNotification[]).map((n) => {
      if (notificationId && String(n.id) !== String(notificationId)) return n;
      return role === "noivos" ? { ...n, readByNoivos: true } : { ...n, readByCerimonialista: true };
    });
    const res = await redisCommand(["SET", "demo_wedding:notifications", JSON.stringify(updated)]);
    return res !== null;
  } catch {
    return false;
  }
}

export async function clearCloudRsvps(): Promise<boolean> {
  try {
    await saveCloudAutomaticBackupSnapshot();
    const [res1, res2] = await Promise.all([
      redisCommand(["DEL", "demo_wedding:rsvps"]),
      redisCommand(["DEL", "demo_wedding:notifications"]),
    ]);
    return res1 !== null && res2 !== null;
  } catch {
    return false;
  }
}

export async function getCloudGifts(): Promise<GiftContribution[]> {
  try {
    const raw = await redisCommand<string>(["GET", "demo_wedding:gifts"]);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((g: GiftContribution) => normalizeItemPhone(g)) : [];
  } catch {
    return [];
  }
}

export async function saveCloudGift(rawGift: GiftContribution, deviceMeta?: string): Promise<boolean> {
  try {
    const gift = normalizeItemPhone(rawGift);
    const mgetRes = await redisCommand<(string | null)[]>(["MGET", "demo_wedding:gifts"]);
    if (!Array.isArray(mgetRes)) return false;
    const current: GiftContribution[] = mgetRes[0] ? JSON.parse(mgetRes[0]) : [];
    const safeCurrent = Array.isArray(current) ? current : [];
    const updated = [gift, ...safeCurrent.filter((g) => g.id !== gift.id)];
    const res = await redisCommand(["SET", "demo_wedding:gifts", JSON.stringify(updated)]);
    if (res !== null) {
      await appendCloudAuditLog({
        timestamp: gift.date || formatNowBR(),
        action: "presente_recebido",
        actor: `${gift.guestName}${gift.phone ? ` (${gift.phone})` : ""}`,
        summary: `Enviou presente: ${gift.giftTitle}${gift.amount ? ` — R$ ${gift.amount.toFixed(2)}` : ""}`,
        details: gift.message ? `Recado: “${gift.message}”` : undefined,
        device: deviceMeta || "Página do Convite Demo",
        payloadSnapshot: gift,
      });
      await saveCloudAutomaticBackupSnapshot();
    }
    return res !== null;
  } catch {
    return false;
  }
}

export async function updateCloudGift(
  id: string,
  patch: Partial<GiftContribution>
): Promise<boolean> {
  try {
    const mgetRes = await redisCommand<(string | null)[]>(["MGET", "demo_wedding:gifts"]);
    if (!Array.isArray(mgetRes)) return false;
    const current: GiftContribution[] = mgetRes[0] ? JSON.parse(mgetRes[0]) : [];
    if (!Array.isArray(current)) return false;
    const updated = current.map((g) =>
      g.id === id ? normalizeItemPhone({ ...g, ...patch }) : g
    );
    const res = await redisCommand(["SET", "demo_wedding:gifts", JSON.stringify(updated)]);
    if (res !== null) {
      await saveCloudAutomaticBackupSnapshot();
    }
    return res !== null;
  } catch {
    return false;
  }
}

export async function deleteCloudGift(id: string): Promise<boolean> {
  try {
    const mgetRes = await redisCommand<(string | null)[]>(["MGET", "demo_wedding:gifts"]);
    if (!Array.isArray(mgetRes)) return false;
    const current: GiftContribution[] = mgetRes[0] ? JSON.parse(mgetRes[0]) : [];
    if (!Array.isArray(current)) return false;
    const updated = current.filter((g) => g.id !== id);
    const res = await redisCommand(["SET", "demo_wedding:gifts", JSON.stringify(updated)]);
    if (res !== null) {
      await saveCloudAutomaticBackupSnapshot();
    }
    return res !== null;
  } catch {
    return false;
  }
}

export async function clearCloudGifts(): Promise<boolean> {
  try {
    const res = await redisCommand(["DEL", "demo_wedding:gifts"]);
    return res !== null;
  } catch {
    return false;
  }
}

export async function getCloudGuestsSafe(): Promise<{ ok: boolean; guests: GuestRecord[] }> {
  try {
    const res = await redisCommand<(string | null)[]>(["MGET", "demo_wedding:guests"]);
    if (!Array.isArray(res)) return { ok: false, guests: [] };
    const parsed = res[0] ? JSON.parse(res[0]) : [];
    if (!Array.isArray(parsed)) return { ok: false, guests: [] };
    return { ok: true, guests: (parsed as GuestRecord[]).map((g) => normalizeRecordPhones(g)) };
  } catch {
    return { ok: false, guests: [] };
  }
}

export async function getCloudGuests(): Promise<GuestRecord[]> {
  const { guests } = await getCloudGuestsSafe();
  return guests;
}

export async function saveAllCloudGuests(guests: GuestRecord[]): Promise<boolean> {
  try {
    const normalized = guests.map((g) => normalizeRecordPhones(g));
    const res = await redisCommand(["SET", "demo_wedding:guests", JSON.stringify(normalized)]);
    if (res !== null) {
      await saveCloudAutomaticBackupSnapshot();
    }
    return res !== null;
  } catch {
    return false;
  }
}

export async function upsertCloudGuest(guest: GuestRecord): Promise<GuestRecord[]> {
  try {
    const current = await getCloudGuestsSafe();
    if (!current.ok) return [];
    const normalizedGuest = normalizeRecordPhones(guest);
    const exists = current.guests.some((g) => g.id === guest.id);
    const updated = exists
      ? current.guests.map((g) => (g.id === guest.id ? normalizedGuest : g))
      : [normalizedGuest, ...current.guests];
    await redisCommand(["SET", "demo_wedding:guests", JSON.stringify(updated)]);
    await saveCloudAutomaticBackupSnapshot();
    return updated;
  } catch {
    return [];
  }
}

export async function deleteCloudGuest(id: string): Promise<GuestRecord[]> {
  try {
    const current = await getCloudGuestsSafe();
    if (!current.ok) return [];
    const updated = current.guests.filter((g) => g.id !== id);
    await redisCommand(["SET", "demo_wedding:guests", JSON.stringify(updated)]);
    await saveCloudAutomaticBackupSnapshot();
    return updated;
  } catch {
    return [];
  }
}

export async function resetCloudGuests(): Promise<boolean> {
  try {
    const res = await redisCommand(["DEL", "demo_wedding:guests"]);
    return res !== null;
  } catch {
    return false;
  }
}
