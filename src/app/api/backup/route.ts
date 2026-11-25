import { verifyAdminRequest } from "@/lib/adminAuth";
import {
  appendCloudAuditLog,
  extractRequestDeviceMeta,
  formatNowBR,
  getCloudAuditLogs,
  getCloudGifts,
  getCloudGuests,
  getCloudRsvps,
  redisCommand,
  saveCloudAutomaticBackupSnapshot,
  type AuditLogEntry,
} from "@/lib/cloudDb";
import {
  DEFAULT_OFFICIAL_GUEST_LIST,
  INITIAL_DEMO_RSVPS,
  INITIAL_GIFT_CONTRIBUTIONS,
  INITIAL_NOTIFICATIONS,
} from "@/lib/guestList";

function buildHistoricalSeedLogs(): AuditLogEntry[] {
  const logs: AuditLogEntry[] = [];

  for (const sub of INITIAL_DEMO_RSVPS) {
    const going = (sub.familyMembers || []).filter((m) => m.confirmed).map((m) => m.name);
    const notGoing = (sub.familyMembers || []).filter((m) => !m.confirmed).map((m) => m.name);
    logs.push({
      id: `log-hist-${sub.invitationId}`,
      timestamp: sub.timestamp || "10/08/2027",
      action: sub.answer === "sim" ? "rsvp_confirmado" : "rsvp_ausencia",
      actor: `Família de ${sub.primaryName} (${sub.phone || "sem tel"})`,
      summary:
        sub.answer === "sim"
          ? `Confirmou presença de ${going.length} pessoa(s): ${going.join(", ")}${
              notGoing.length > 0 ? ` | Não vão: ${notGoing.join(", ")}` : ""
            }`
          : `Comunicou ausência (${notGoing.join(", ")})`,
      details: sub.message ? `Recado: “${sub.message}”` : undefined,
      device: "Convite Demo (Registro Inicial)",
      payloadSnapshot: sub,
    });
  }

  return logs;
}

export async function GET(request: Request) {
  try {
    const allowed = await verifyAdminRequest(request, "noivos");
    if (!allowed) {
      return Response.json(
        { ok: false, error: "Acesso restrito ao Painel dos Noivos." },
        { status: 401 }
      );
    }

    let logs = await getCloudAuditLogs();
    if (!logs || logs.length === 0) {
      logs = buildHistoricalSeedLogs();
      await redisCommand(["SET", "demo_wedding:audit_logs", JSON.stringify(logs)]);
    }

    const [rsvps, guests, gifts, snapshotRaw] = await Promise.all([
      getCloudRsvps(),
      getCloudGuests(),
      getCloudGifts(),
      redisCommand<string>(["GET", "demo_wedding:backup_snapshot"]),
    ]);

    let snapshot = snapshotRaw ? JSON.parse(snapshotRaw) : null;
    if (!snapshot) {
      await saveCloudAutomaticBackupSnapshot();
      const freshRaw = await redisCommand<string>(["GET", "demo_wedding:backup_snapshot"]);
      snapshot = freshRaw ? JSON.parse(freshRaw) : null;
    }

    return Response.json({
      ok: true,
      exportedAt: formatNowBR(),
      logs,
      snapshot,
      data: {
        submissions: rsvps.ok && rsvps.submissions.length > 0 ? rsvps.submissions : INITIAL_DEMO_RSVPS,
        notifications: rsvps.ok && rsvps.notifications.length > 0 ? rsvps.notifications : INITIAL_NOTIFICATIONS,
        guests: guests && guests.length > 0 ? guests : DEFAULT_OFFICIAL_GUEST_LIST,
        gifts: gifts && gifts.length > 0 ? gifts : INITIAL_GIFT_CONTRIBUTIONS,
      },
    });
  } catch (err: any) {
    return Response.json(
      { ok: false, error: err?.message || "Erro ao consultar logs e backup" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const allowed = await verifyAdminRequest(request, "noivos");
    if (!allowed) {
      return Response.json(
        { ok: false, error: "Acesso restrito ao Painel dos Noivos." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const action = body.action;
    const deviceMeta = extractRequestDeviceMeta(request);

    if (action === "log_export") {
      await appendCloudAuditLog({
        action: "backup_exportado",
        actor: "Painel dos Noivos (Demo)",
        summary: `Download de Backup Completo realizado (${body.format || "JSON"})`,
        device: deviceMeta,
      });
      const logs = await getCloudAuditLogs();
      return Response.json({ ok: true, logs });
    }

    if (action === "restore_json" && body.backup) {
      const b = body.backup;
      const submissions = Array.isArray(b.submissions) ? b.submissions : [];
      const notifications = Array.isArray(b.notifications) ? b.notifications : [];
      const guests = Array.isArray(b.guests) ? b.guests : [];
      const gifts = Array.isArray(b.gifts) ? b.gifts : [];

      if (submissions.length > 0) await redisCommand(["SET", "demo_wedding:rsvps", JSON.stringify(submissions)]);
      if (notifications.length > 0) await redisCommand(["SET", "demo_wedding:notifications", JSON.stringify(notifications)]);
      if (guests.length > 0) await redisCommand(["SET", "demo_wedding:guests", JSON.stringify(guests)]);
      if (gifts.length > 0) await redisCommand(["SET", "demo_wedding:gifts", JSON.stringify(gifts)]);
      if (Array.isArray(b.muralMessages) && b.muralMessages.length > 0) {
        await redisCommand(["SET", "demo_wedding:mural", JSON.stringify(b.muralMessages)]);
      }
      if (Array.isArray(b.songSuggestions) && b.songSuggestions.length > 0) {
        await redisCommand(["SET", "demo_wedding:songs", JSON.stringify(b.songSuggestions)]);
      }
      if (Array.isArray(b.mesas) && b.mesas.length > 0) {
        await redisCommand(["SET", "demo_wedding:mesas", JSON.stringify(b.mesas)]);
      }
      if (b.assignments && typeof b.assignments === "object") {
        await redisCommand(["SET", "demo_wedding:assignments", JSON.stringify(b.assignments)]);
      }

      await saveCloudAutomaticBackupSnapshot();
      await appendCloudAuditLog({
        action: "backup_restaurado",
        actor: "Painel dos Noivos (Demo)",
        summary: `Backup completo restaurado (${submissions.length} famílias, ${guests.length} convites)`,
        device: deviceMeta,
      });

      const logs = await getCloudAuditLogs();
      return Response.json({ ok: true, submissions, notifications, guests, gifts, logs });
    }

    if (action === "restore_cloud_snapshot") {
      const snapshotRaw = await redisCommand<string>(["GET", "demo_wedding:backup_snapshot"]);
      if (!snapshotRaw) {
        return Response.json({ ok: false, error: "Nenhum snapshot encontrado" }, { status: 404 });
      }
      const snap = JSON.parse(snapshotRaw);
      if (Array.isArray(snap.submissions) && snap.submissions.length > 0) await redisCommand(["SET", "demo_wedding:rsvps", JSON.stringify(snap.submissions)]);
      if (Array.isArray(snap.notifications) && snap.notifications.length > 0) await redisCommand(["SET", "demo_wedding:notifications", JSON.stringify(snap.notifications)]);
      if (Array.isArray(snap.guests) && snap.guests.length > 0) await redisCommand(["SET", "demo_wedding:guests", JSON.stringify(snap.guests)]);
      if (Array.isArray(snap.gifts) && snap.gifts.length > 0) await redisCommand(["SET", "demo_wedding:gifts", JSON.stringify(snap.gifts)]);
      if (Array.isArray(snap.mural) && snap.mural.length > 0) await redisCommand(["SET", "demo_wedding:mural", JSON.stringify(snap.mural)]);
      if (Array.isArray(snap.songs) && snap.songs.length > 0) await redisCommand(["SET", "demo_wedding:songs", JSON.stringify(snap.songs)]);
      if (Array.isArray(snap.mesas) && snap.mesas.length > 0) await redisCommand(["SET", "demo_wedding:mesas", JSON.stringify(snap.mesas)]);
      if (snap.assignments && typeof snap.assignments === "object") await redisCommand(["SET", "demo_wedding:assignments", JSON.stringify(snap.assignments)]);
      if (Array.isArray(snap.fornecedores) && snap.fornecedores.length > 0) await redisCommand(["SET", "demo_wedding:fornecedores", JSON.stringify(snap.fornecedores)]);
      if (Array.isArray(snap.roteiro) && snap.roteiro.length > 0) await redisCommand(["SET", "demo_wedding:roteiro", JSON.stringify(snap.roteiro)]);
      if (Array.isArray(snap.checklist) && snap.checklist.length > 0) await redisCommand(["SET", "demo_wedding:checklist", JSON.stringify(snap.checklist)]);

      await appendCloudAuditLog({
        action: "backup_restaurado",
        actor: "Painel dos Noivos (Demo)",
        summary: `Restaurou Snapshot da Demo (salvo em ${snap.savedAt || "data anterior"})`,
        device: deviceMeta,
      });

      const logs = await getCloudAuditLogs();
      return Response.json({
        ok: true,
        submissions: snap.submissions || [],
        notifications: snap.notifications || [],
        guests: snap.guests || [],
        gifts: snap.gifts || [],
        logs,
      });
    }

    return Response.json({ ok: false, error: "Ação inválida" }, { status: 400 });
  } catch (err: any) {
    return Response.json({ ok: false, error: err?.message || "Erro no servidor" }, { status: 500 });
  }
}
