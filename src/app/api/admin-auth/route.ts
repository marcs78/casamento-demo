import { cookies } from "next/headers";
import {
  COOKIE_CERIMONIAL,
  COOKIE_NOIVOS,
  checkPinRateLimit,
  clearPinRateLimit,
  createAdminSessionToken,
  getStoredAdminPins,
  registerFailedPinAttempt,
  saveStoredAdminPins,
  verifyAdminRequest,
  verifyPinInput,
  type AdminRole,
} from "@/lib/adminAuth";
import {
  appendCloudAuditLog,
  extractRequestDeviceMeta,
  formatNowBR,
  getCloudPlannerContact,
  saveCloudPlannerContact,
} from "@/lib/cloudDb";

function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim().slice(0, 64);
  return request.headers.get("x-real-ip")?.trim().slice(0, 64) || "local";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const roleParam = url.searchParams.get("role");
  const role: AdminRole = roleParam === "cerimonialista" ? "cerimonialista" : "noivos";

  const authenticated = await verifyAdminRequest(request, role);

  const plannerContact = await getCloudPlannerContact();

  if (authenticated && role === "noivos") {
    const pins = await getStoredAdminPins();
    return Response.json({
      ok: true,
      authenticated: true,
      role,
      pins: {
        noivosPin: pins.noivosPin,
        cerimonialPin: pins.cerimonialPin,
        updatedAt: pins.updatedAt || null,
      },
      plannerContact,
    });
  }

  return Response.json({
    ok: true,
    authenticated,
    role,
    plannerContact,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action || "unlock";
    const deviceMeta = extractRequestDeviceMeta(request);
    const ip = getClientIp(request);

    if (action === "logout") {
      const cookieStore = await cookies();
      const targetRole = body.role as AdminRole | undefined;
      if (!targetRole || targetRole === "noivos") {
        cookieStore.delete(COOKIE_NOIVOS);
      }
      if (!targetRole || targetRole === "cerimonialista") {
        cookieStore.delete(COOKIE_CERIMONIAL);
      }
      return Response.json({ ok: true, authenticated: false });
    }

    if (action === "update_planner_contact") {
      const contact = body.contact as { name?: string; phone?: string } | undefined;
      const sanitized = {
        name: String(contact?.name || "").trim().slice(0, 100),
        phone: String(contact?.phone || "").trim().slice(0, 40) || "(24) 99900-2027",
      };
      const saved = await saveCloudPlannerContact(sanitized);
      return Response.json({ ok: saved, contact: sanitized });
    }

    if (action === "update_pins") {
      const isNoivos = await verifyAdminRequest(request, "noivos");
      if (!isNoivos) {
        return Response.json({ ok: false, error: "Acesso negado" }, { status: 401 });
      }

      const newNoivosPin = String(body.noivosPin || "").trim();
      const newCerimonialPin = String(body.cerimonialPin || "").trim();

      if (newNoivosPin.length < 4 || newNoivosPin.length > 16) {
        return Response.json(
          { ok: false, error: "O PIN dos Noivos deve ter entre 4 e 16 caracteres." },
          { status: 400 }
        );
      }
      if (newCerimonialPin.length < 4 || newCerimonialPin.length > 16) {
        return Response.json(
          { ok: false, error: "O PIN da Cerimonialista deve ter entre 4 e 16 caracteres." },
          { status: 400 }
        );
      }
      if (newNoivosPin === newCerimonialPin) {
        return Response.json(
          {
            ok: false,
            error: "Use PINs diferentes para os Noivos e para a Cerimonialista por privacidade.",
          },
          { status: 400 }
        );
      }

      const updatedAt = formatNowBR();
      const saved = await saveStoredAdminPins({
        noivosPin: newNoivosPin,
        cerimonialPin: newCerimonialPin,
        updatedAt,
      });

      if (!saved) {
        return Response.json(
          { ok: false, error: "Não foi possível salvar os novos PINs na nuvem." },
          { status: 500 }
        );
      }

      // Atualiza o cookie do aparelho atual dos noivos para não desconectá-los
      const cookieStore = await cookies();
      const newToken = createAdminSessionToken("noivos", newNoivosPin);
      cookieStore.set(COOKIE_NOIVOS, newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 90,
      });

      await appendCloudAuditLog({
        action: "pin_alterado",
        actor: "Painel dos Noivos",
        summary: "PINs de segurança dos painéis foram atualizados na nuvem",
        device: deviceMeta,
      });

      return Response.json({
        ok: true,
        pins: { noivosPin: newNoivosPin, cerimonialPin: newCerimonialPin, updatedAt },
      });
    }

    // action === "unlock"
    const role: AdminRole = body.role === "cerimonialista" ? "cerimonialista" : "noivos";
    const inputPin = String(body.pin || "").trim();
    const remember = body.remember !== false;

    const rl = await checkPinRateLimit(ip);
    if (!rl.allowed) {
      const mins = Math.max(1, Math.ceil((rl.remainingSeconds || 300) / 60));
      return Response.json(
        {
          ok: false,
          error: `Muitas tentativas incorretas. Aguarde cerca de ${mins} minuto(s) e tente novamente.`,
        },
        { status: 429 }
      );
    }

    const pins = await getStoredAdminPins();
    const cookieStore = await cookies();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      ...(remember ? { maxAge: 60 * 60 * 24 * 90 } : {}),
    };

    // Verifica se digitou o PIN dos Noivos (que libera Noivos e também Cerimonialista)
    if (verifyPinInput(inputPin, pins.noivosPin)) {
      await clearPinRateLimit(ip);
      const token = createAdminSessionToken("noivos", pins.noivosPin);
      cookieStore.set(COOKIE_NOIVOS, token, cookieOptions);

      await appendCloudAuditLog({
        action: "acesso_painel",
        actor: "Noivos (PIN Master)",
        summary: `Acesso autorizado ao ${role === "noivos" ? "Painel dos Noivos" : "Portal da Cerimonialista"}`,
        device: deviceMeta,
      });

      return Response.json({
        ok: true,
        authenticated: true,
        role,
        pins:
          role === "noivos"
            ? {
                noivosPin: pins.noivosPin,
                cerimonialPin: pins.cerimonialPin,
                updatedAt: pins.updatedAt || null,
              }
            : undefined,
      });
    }

    // Se está tentando abrir o Portal da Cerimonialista, aceita o PIN da Cerimonialista
    if (role === "cerimonialista" && verifyPinInput(inputPin, pins.cerimonialPin)) {
      await clearPinRateLimit(ip);
      const token = createAdminSessionToken("cerimonialista", pins.cerimonialPin);
      cookieStore.set(COOKIE_CERIMONIAL, token, cookieOptions);

      await appendCloudAuditLog({
        action: "acesso_painel",
        actor: "Assessoria / Cerimonialista",
        summary: "Acesso autorizado ao Portal da Cerimonialista",
        device: deviceMeta,
      });

      return Response.json({
        ok: true,
        authenticated: true,
        role: "cerimonialista",
      });
    }

    // Se digitou o PIN da Cerimonialista tentando entrar no Painel dos Noivos, dá mensagem clara!
    await registerFailedPinAttempt(ip);
    const triedCerimonialInNoivos =
      role === "noivos" && verifyPinInput(inputPin, pins.cerimonialPin);

    await appendCloudAuditLog({
      action: "tentativa_pin_invalido",
      actor: role === "noivos" ? "Tela de Bloqueio (Noivos)" : "Tela de Bloqueio (Cerimonialista)",
      summary: triedCerimonialInNoivos
        ? "Tentativa de acesso ao Painel dos Noivos usando o PIN da Cerimonialista (bloqueado)"
        : `Tentativa de acesso com PIN incorreto em /admin/${role}`,
      device: deviceMeta,
    });

    return Response.json(
      {
        ok: false,
        error: triedCerimonialInNoivos
          ? "Este PIN pertence ao Portal da Cerimonialista e não tem acesso ao Painel dos Noivos."
          : "PIN incorreto. Verifique os dígitos e tente novamente.",
      },
      { status: 401 }
    );
  } catch (err: any) {
    return Response.json(
      { ok: false, error: err?.message || "Erro ao validar acesso" },
      { status: 500 }
    );
  }
}
