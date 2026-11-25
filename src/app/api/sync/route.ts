import { verifyAdminRequest } from "@/lib/adminAuth";
import {
  appendCloudAuditLog,
  extractRequestDeviceMeta,
  redisCommand,
  saveCloudAutomaticBackupSnapshot,
} from "@/lib/cloudDb";
import { INITIAL_SONG_SUGGESTIONS } from "@/lib/guestList";
import { INITIAL_MESSAGES, type GuestMessage, type SongSuggestion } from "@/lib/wedding";

export async function GET() {
  try {
    const res = await redisCommand<(string | null)[]>([
      "MGET",
      "demo_wedding:mesas",
      "demo_wedding:assignments",
      "demo_wedding:fornecedores",
      "demo_wedding:roteiro",
      "demo_wedding:checklist",
      "demo_wedding:mural",
      "demo_wedding:songs",
    ]);

    const [mesasRaw, assignRaw, fornRaw, rotRaw, checkRaw, muralRaw, songsRaw] =
      Array.isArray(res) ? res : [null, null, null, null, null, null, null];

    return Response.json({
      ok: true,
      mesas: mesasRaw ? JSON.parse(mesasRaw) : null,
      assignments: assignRaw ? JSON.parse(assignRaw) : null,
      fornecedores: fornRaw ? JSON.parse(fornRaw) : null,
      roteiro: rotRaw ? JSON.parse(rotRaw) : null,
      checklist: checkRaw ? JSON.parse(checkRaw) : null,
      mural: muralRaw ? JSON.parse(muralRaw) : INITIAL_MESSAGES,
      songs: songsRaw ? JSON.parse(songsRaw) : INITIAL_SONG_SUGGESTIONS,
    });
  } catch (err: any) {
    return Response.json(
      { ok: false, error: err?.message || "Erro ao carregar sincronização" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const deviceMeta = extractRequestDeviceMeta(request);

    const hasAdminFields =
      body.mesas !== undefined ||
      body.assignments !== undefined ||
      body.fornecedores !== undefined ||
      body.roteiro !== undefined ||
      body.checklist !== undefined;

    if (hasAdminFields) {
      const allowed = await verifyAdminRequest(request, "cerimonialista");
      if (!allowed) {
        return Response.json(
          { ok: false, error: "Autenticação administrativa necessária." },
          { status: 401 }
        );
      }
    }

    if (body.mesas !== undefined && Array.isArray(body.mesas)) {
      await redisCommand(["SET", "demo_wedding:mesas", JSON.stringify(body.mesas)]);
    }

    if (body.assignments !== undefined && body.assignments && typeof body.assignments === "object") {
      const mgetRes = await redisCommand<(string | null)[]>(["MGET", "demo_wedding:assignments"]);
      if (Array.isArray(mgetRes)) {
        const existing = mgetRes[0] ? JSON.parse(mgetRes[0]) : {};
        const safeExisting = existing && typeof existing === "object" ? existing : {};
        const mergedAssignments = { ...safeExisting, ...body.assignments };
        await redisCommand(["SET", "demo_wedding:assignments", JSON.stringify(mergedAssignments)]);
      }
    }

    if (body.fornecedores !== undefined && Array.isArray(body.fornecedores)) {
      await redisCommand(["SET", "demo_wedding:fornecedores", JSON.stringify(body.fornecedores)]);
    }

    if (body.roteiro !== undefined && Array.isArray(body.roteiro)) {
      await redisCommand(["SET", "demo_wedding:roteiro", JSON.stringify(body.roteiro)]);
    }

    if (body.checklist !== undefined && Array.isArray(body.checklist)) {
      await redisCommand(["SET", "demo_wedding:checklist", JSON.stringify(body.checklist)]);
    }

    if (body.mural !== undefined && Array.isArray(body.mural)) {
      const mgetRes = await redisCommand<(string | null)[]>(["MGET", "demo_wedding:mural"]);
      if (Array.isArray(mgetRes)) {
        const existing: GuestMessage[] = mgetRes[0] ? JSON.parse(mgetRes[0]) : INITIAL_MESSAGES;
        const safeExisting = Array.isArray(existing) ? existing : [];
        const seen = new Set<string>();
        const mergedMural: GuestMessage[] = [];

        for (const item of [...body.mural, ...safeExisting]) {
          if (!item || typeof item.name !== "string" || typeof item.message !== "string") continue;
          const key = `${item.name.trim().toLowerCase()}|${item.message.trim().toLowerCase()}`;
          if (!seen.has(key)) {
            seen.add(key);
            mergedMural.push({
              name: item.name.trim().slice(0, 120),
              relation: String(item.relation || "Convidado").slice(0, 80),
              message: item.message.trim().slice(0, 2000),
              date: String(item.date || "").slice(0, 40),
            });
          }
        }
        await redisCommand(["SET", "demo_wedding:mural", JSON.stringify(mergedMural.slice(0, 300))]);
      }
    }

    if (body.songs !== undefined && Array.isArray(body.songs)) {
      const mgetRes = await redisCommand<(string | null)[]>(["MGET", "demo_wedding:songs"]);
      if (Array.isArray(mgetRes)) {
        const existing: SongSuggestion[] = mgetRes[0] ? JSON.parse(mgetRes[0]) : INITIAL_SONG_SUGGESTIONS;
        const safeExisting = Array.isArray(existing) ? existing : [];
        const seen = new Set<string>();
        const mergedSongs: SongSuggestion[] = [];

        for (const item of [...body.songs, ...safeExisting]) {
          if (!item || typeof item.title !== "string" || !item.title.trim()) continue;
          const key = `${item.title.trim().toLowerCase()}|${String(item.artist || "").trim().toLowerCase()}`;
          if (!seen.has(key)) {
            seen.add(key);
            mergedSongs.push({
              id: String(item.id || `song-${Date.now()}`),
              title: item.title.trim().slice(0, 160),
              artist: item.artist ? String(item.artist).trim().slice(0, 120) : undefined,
              link: item.link ? String(item.link).trim().slice(0, 300) : undefined,
              date: String(item.date || "").slice(0, 40),
            });
          }
        }
        await redisCommand(["SET", "demo_wedding:songs", JSON.stringify(mergedSongs.slice(0, 300))]);
      }
    }

    if (body.logEntry) {
      await appendCloudAuditLog({
        action: body.logEntry.action || "rsvp_editado",
        actor: String(body.logEntry.actor || "Painel / Site Demo").slice(0, 160),
        summary: String(body.logEntry.summary || "Atualização sincronizada na Demo").slice(0, 300),
        details: body.logEntry.details ? String(body.logEntry.details).slice(0, 2000) : undefined,
        device: deviceMeta,
        payloadSnapshot: body.logEntry.payload,
      });
    }

    await saveCloudAutomaticBackupSnapshot();

    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json(
      { ok: false, error: err?.message || "Erro ao salvar sincronização" },
      { status: 500 }
    );
  }
}
