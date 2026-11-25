import { verifyAdminRequest } from "@/lib/adminAuth";
import {
  getCloudGuestsSafe,
  saveAllCloudGuests,
  deleteCloudGuest,
  getCloudRsvps,
  redisCommand,
  appendCloudAuditLog,
  extractRequestDeviceMeta,
} from "@/lib/cloudDb";
import {
  DEFAULT_OFFICIAL_GUEST_LIST,
  GUEST_CATEGORIES,
  cleanString,
  normalizeGuestCategory,
  isPreDeclinedConfirmation,
  buildPreDeclinedSubmissionFromGuest,
  type GuestRecord,
  type RsvpSubmission,
  getBreakdownFromMembers,
} from "@/lib/guestList";
import { normalizeRecordPhones } from "@/lib/phone";

const CLOUD_UNAVAILABLE = () =>
  Response.json(
    { ok: false, error: "Armazenamento da Demo temporariamente indisponível." },
    { status: 503 }
  );

async function loadGuestsForWrite(): Promise<GuestRecord[] | null> {
  const res = await getCloudGuestsSafe();
  if (!res.ok) return null;
  return res.guests.length > 0 ? res.guests : DEFAULT_OFFICIAL_GUEST_LIST.map((g) => normalizeRecordPhones(g));
}

export async function GET() {
  try {
    const res = await getCloudGuestsSafe();
    if (!res.ok) {
      return Response.json({ ok: true, guests: DEFAULT_OFFICIAL_GUEST_LIST });
    }
    let guests = res.guests;
    if (guests.length === 0) {
      guests = DEFAULT_OFFICIAL_GUEST_LIST.map((g) => normalizeRecordPhones(g));
      await saveAllCloudGuests(guests);
    }
    return Response.json({ ok: true, guests });
  } catch {
    return Response.json({ ok: true, guests: DEFAULT_OFFICIAL_GUEST_LIST });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action || "save_all";
    const deviceMeta = extractRequestDeviceMeta(request);

    if (action === "update_category") {
      const allowedCat = await verifyAdminRequest(request, "cerimonialista");
      if (!allowedCat) {
        return Response.json({ ok: false, error: "Autenticação administrativa necessária." }, { status: 401 });
      }
    } else {
      const allowedNoivos = await verifyAdminRequest(request, "noivos");
      if (!allowedNoivos) {
        return Response.json({ ok: false, error: "Acesso restrito ao Painel dos Noivos." }, { status: 401 });
      }
    }

    if (action === "save_all" && Array.isArray(body.guests)) {
      if (body.guests.length < 1) {
        return Response.json(
          { ok: false, error: "Lista não pode ficar vazia." },
          { status: 400 }
        );
      }
      await saveAllCloudGuests(body.guests);
      return Response.json({ ok: true, guests: body.guests.map((g: GuestRecord) => normalizeRecordPhones(g)) });
    }

    if (action === "upsert" && body.guest) {
      const current = await loadGuestsForWrite();
      if (!current) return CLOUD_UNAVAILABLE();
      body.guest = normalizeRecordPhones(body.guest as GuestRecord);
      const exists = current.some((g) => g.id === body.guest.id);
      const updated = exists
        ? current.map((g) => (g.id === body.guest.id ? body.guest : g))
        : [body.guest, ...current];
      await saveAllCloudGuests(updated);

      await appendCloudAuditLog({
        action: "convidado_salvo",
        actor: "Painel dos Noivos (Demo)",
        summary: `${exists ? "Editou" : "Cadastrou"} convite da família de ${body.guest.primaryName} (${body.guest.familyMembers?.length || 1} integrante(s))`,
        device: deviceMeta,
        payloadSnapshot: body.guest,
      });

      try {
        const cloudRsvps = await getCloudRsvps();
        if (!cloudRsvps.ok) throw new Error("rsvps indisponíveis");
        const targetSub = cloudRsvps.submissions.find((s) => s.invitationId === body.guest.id);
        const markedAllDeclined = isPreDeclinedConfirmation(body.guest.firstConfirmation);

        if (markedAllDeclined && !targetSub) {
          const declinedSub = buildPreDeclinedSubmissionFromGuest(body.guest);
          const updatedAllSubs = [declinedSub, ...cloudRsvps.submissions];
          await redisCommand(["SET", "demo_wedding:rsvps", JSON.stringify(updatedAllSubs)]);
        } else if (targetSub) {
          const updatedMembers = targetSub.familyMembers.map((rm) => {
            const matchingNewMem = body.guest.familyMembers.find(
              (gm: any) => cleanString(typeof gm === "string" ? gm : gm.name) === cleanString(rm.name)
            );
            if (matchingNewMem) {
              const newCat = typeof matchingNewMem === "string" ? "adulto" : normalizeGuestCategory(matchingNewMem.type);
              return {
                ...rm,
                type: newCat,
                name: typeof matchingNewMem === "string" ? matchingNewMem : matchingNewMem.name,
                ...(markedAllDeclined ? { confirmed: false, memberStatus: "ausente" as const } : {}),
              };
            }
            return markedAllDeclined ? { ...rm, confirmed: false, memberStatus: "ausente" as const } : rm;
          });
          const going = updatedMembers.filter((m) => m.confirmed);
          const absent = updatedMembers.filter(
            (m) => (m.memberStatus ? m.memberStatus === "ausente" : !m.confirmed)
          );
          const bk = getBreakdownFromMembers(going);
          const updatedSub: RsvpSubmission = {
            ...targetSub,
            answer: going.length > 0 ? "sim" : "nao",
            primaryName: body.guest.primaryName,
            phone: body.guest.phone || targetSub.phone,
            familyMembers: updatedMembers,
            adultsCount: bk.adultos,
            kidsCount: bk.criancas,
            idososCount: bk.idosos,
            adolescentesCount: bk.adolescentes,
            bebesCount: bk.bebes,
            declinedCount: absent.length,
          };
          const updatedAllSubs = cloudRsvps.submissions.map((s) =>
            s.invitationId === targetSub.invitationId ? updatedSub : s
          );
          await redisCommand(["SET", "demo_wedding:rsvps", JSON.stringify(updatedAllSubs)]);
        }
      } catch {}

      return Response.json({ ok: true, guests: updated, guest: body.guest });
    }

    if (action === "delete" && body.id) {
      const current = await loadGuestsForWrite();
      if (!current) return CLOUD_UNAVAILABLE();
      const target = current.find((g) => g.id === body.id);
      const updated = current.filter((g) => g.id !== body.id);
      await saveAllCloudGuests(updated);

      await appendCloudAuditLog({
        action: "convidado_removido",
        actor: "Painel dos Noivos (Demo)",
        summary: `Removeu convite da família de ${target?.primaryName || body.id}`,
        device: deviceMeta,
        payloadSnapshot: target,
      });

      return Response.json({ ok: true, guests: updated });
    }

    if (action === "update_category" && body.guestName && body.newCategory) {
      const current = await loadGuestsForWrite();
      if (!current) return CLOUD_UNAVAILABLE();
      const targetClean = cleanString(body.guestName);
      const normCat = normalizeGuestCategory(body.newCategory);

      const updated = current.map((g) => {
        const isTarget = !body.invitationId || g.id === body.invitationId;
        if (!isTarget) return g;
        let changed = false;
        const updatedMembers = g.familyMembers.map((m) => {
          const mName = typeof m === "string" ? m : m.name;
          if (cleanString(mName) === targetClean) {
            changed = true;
            if (typeof m === "string") {
              return {
                name: m,
                familia: g.familySurname,
                chefeFamilia: g.primaryName,
                type: normCat,
                firstConfirmation: g.firstConfirmation,
              };
            }
            return { ...m, type: normCat };
          }
          return m;
        });
        return changed ? { ...g, familyMembers: updatedMembers } : g;
      });

      await saveAllCloudGuests(updated);

      await appendCloudAuditLog({
        action: "categoria_alterada",
        actor: "Painel Administrativo (Demo)",
        summary: `Categoria de ${body.guestName} alterada para ${GUEST_CATEGORIES[normCat]?.label || normCat}`,
        device: deviceMeta,
        payloadSnapshot: { guestName: body.guestName, newCategory: normCat, invitationId: body.invitationId },
      });

      try {
        const cloudRsvps = await getCloudRsvps();
        if (!cloudRsvps.ok) throw new Error("rsvps indisponíveis");
        let subChanged = false;
        const updatedSubs = cloudRsvps.submissions.map((sub) => {
          const isTargetSub = !body.invitationId || sub.invitationId === body.invitationId;
          if (!isTargetSub) return sub;
          let memChanged = false;
          const updatedMembers = sub.familyMembers.map((m) => {
            if (cleanString(m.name) === targetClean) {
              memChanged = true;
              subChanged = true;
              return { ...m, type: normCat };
            }
            return m;
          });
          if (memChanged) {
            const going = updatedMembers.filter((m) => m.confirmed);
            const bk = getBreakdownFromMembers(going);
            return {
              ...sub,
              familyMembers: updatedMembers,
              adultsCount: bk.adultos,
              kidsCount: bk.criancas,
              idososCount: bk.idosos,
              adolescentesCount: bk.adolescentes,
              bebesCount: bk.bebes,
            };
          }
          return sub;
        });

        if (subChanged) {
          await redisCommand(["SET", "demo_wedding:rsvps", JSON.stringify(updatedSubs)]);
        }
      } catch {}

      return Response.json({ ok: true, guests: updated });
    }

    return Response.json({ ok: false, error: "Ação não reconhecida" }, { status: 400 });
  } catch (err: any) {
    return Response.json({ ok: false, error: err?.message || "Erro no servidor" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const allowedNoivos = await verifyAdminRequest(request, "noivos");
    if (!allowedNoivos) {
      return Response.json({ ok: false, error: "Acesso restrito ao Painel dos Noivos." }, { status: 401 });
    }
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (id) {
      const updated = await deleteCloudGuest(id);
      return Response.json({ ok: true, guests: updated });
    }
    return Response.json({ ok: false, error: "Operação não permitida." }, { status: 403 });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
