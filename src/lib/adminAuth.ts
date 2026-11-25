import { createHmac, timingSafeEqual } from "crypto";
import { redisCommand } from "./cloudDb";

export type AdminRole = "noivos" | "cerimonialista";

export const COOKIE_NOIVOS = "ag_demo_admin_noivos";
export const COOKIE_CERIMONIAL = "ag_demo_admin_cerimonial";

export const DEMO_PIN_NOIVOS = process.env.ADMIN_PIN_NOIVOS || "1234";
export const DEMO_PIN_CERIMONIAL = process.env.ADMIN_PIN_CERIMONIAL || "4321";

const SIGNING_SECRET =
  process.env.ADMIN_AUTH_SECRET ||
  `ag-demo-hmac-${process.env.UPSTASH_REDIS_REST_TOKEN || "anita-giuseppe-demo-secret-v1"}`;

export interface StoredAdminPins {
  noivosPin: string;
  cerimonialPin: string;
  updatedAt?: string;
}

export async function getStoredAdminPins(): Promise<StoredAdminPins> {
  try {
    const raw = await redisCommand<string>(["GET", "demo_wedding:admin_pins"]);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.noivosPin === "string" && typeof parsed.cerimonialPin === "string") {
        return {
          noivosPin: parsed.noivosPin,
          cerimonialPin: parsed.cerimonialPin,
          updatedAt: parsed.updatedAt,
        };
      }
    }
  } catch {
    // fallback seguro para os PINs da demo
  }
  return {
    noivosPin: DEMO_PIN_NOIVOS,
    cerimonialPin: DEMO_PIN_CERIMONIAL,
  };
}

export async function saveStoredAdminPins(pins: StoredAdminPins): Promise<boolean> {
  try {
    const res = await redisCommand(["SET", "demo_wedding:admin_pins", JSON.stringify(pins)]);
    return res !== null;
  } catch {
    return false;
  }
}

function hashPinVersion(pin: string): string {
  return createHmac("sha256", SIGNING_SECRET).update(`pinver:${pin}`).digest("hex").slice(0, 16);
}

function signPayload(payload: string): string {
  return createHmac("sha256", SIGNING_SECRET).update(payload).digest("hex");
}

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function createAdminSessionToken(role: AdminRole, currentPinForRole: string): string {
  const issuedAt = Date.now();
  const pinVer = hashPinVersion(currentPinForRole);
  const payload = `${role}.${issuedAt}.${pinVer}`;
  const sig = signPayload(payload);
  return `${payload}.${sig}`;
}

export function verifyAdminSessionToken(
  token: string | undefined,
  expectedRole: AdminRole,
  currentPinForRole: string
): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 4) return false;

  const [role, issuedAtStr, pinVer, sig] = parts;
  if (role !== expectedRole) return false;

  const issuedAt = Number(issuedAtStr);
  if (!Number.isFinite(issuedAt)) return false;

  const maxAgeMs = 120 * 24 * 60 * 60 * 1000;
  if (Date.now() - issuedAt > maxAgeMs) return false;

  const expectedPayload = `${role}.${issuedAtStr}.${pinVer}`;
  const expectedSig = signPayload(expectedPayload);
  if (!safeCompare(sig, expectedSig)) return false;

  const expectedPinVer = hashPinVersion(currentPinForRole);
  if (!safeCompare(pinVer, expectedPinVer)) return false;

  return true;
}

export function parseCookiesFromHeader(cookieHeader: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const pair of cookieHeader.split(";")) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const val = decodeURIComponent(pair.slice(idx + 1).trim());
    out[key] = val;
  }
  return out;
}

export async function verifyAdminRequest(
  request: Request,
  requiredRole: AdminRole
): Promise<boolean> {
  try {
    const cookiesMap = parseCookiesFromHeader(request.headers.get("cookie"));
    const pins = await getStoredAdminPins();

    const noivosToken = cookiesMap[COOKIE_NOIVOS];
    if (verifyAdminSessionToken(noivosToken, "noivos", pins.noivosPin)) {
      return true;
    }

    if (requiredRole === "cerimonialista") {
      const cerimonialToken = cookiesMap[COOKIE_CERIMONIAL];
      if (verifyAdminSessionToken(cerimonialToken, "cerimonialista", pins.cerimonialPin)) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

export function verifyPinInput(inputPin: string, targetPin: string): boolean {
  const a = inputPin.trim();
  const b = targetPin.trim();
  if (!a || !b) return false;
  return safeCompare(a, b);
}

export async function checkPinRateLimit(ip: string): Promise<{ allowed: boolean; remainingSeconds?: number }> {
  try {
    const key = `demo_wedding:pin_rl:${ip}`;
    const currentRaw = await redisCommand<string>(["GET", key]);
    const attempts = currentRaw ? Number(currentRaw) : 0;
    if (attempts >= 12) {
      const ttl = await redisCommand<number>(["TTL", key]);
      return { allowed: false, remainingSeconds: ttl && ttl > 0 ? ttl : 120 };
    }
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

export async function registerFailedPinAttempt(ip: string): Promise<void> {
  try {
    const key = `demo_wedding:pin_rl:${ip}`;
    const count = await redisCommand<number>(["INCR", key]);
    if (count === 1) {
      await redisCommand(["EXPIRE", key, 120]);
    }
  } catch {
    // non-blocking
  }
}

export async function clearPinRateLimit(ip: string): Promise<void> {
  try {
    await redisCommand(["DEL", `demo_wedding:pin_rl:${ip}`]);
  } catch {
    // non-blocking
  }
}
