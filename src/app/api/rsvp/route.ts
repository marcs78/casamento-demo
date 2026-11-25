import { extractRequestDeviceMeta, getCloudRsvps, markCloudNotificationsRead, redisCommand, saveCloudRsvp } from "@/lib/cloudDb";
import { INITIAL_DEMO_RSVPS, INITIAL_NOTIFICATIONS, type RsvpNotification, type RsvpSubmission } from "@/lib/guestList";

export async function GET() {
  const store = await getCloudRsvps();
  if (!store.ok) {
    return Response.json(
      { ok: true, submissions: INITIAL_DEMO_RSVPS, notifications: INITIAL_NOTIFICATIONS }
    );
  }
  let submissions = store.submissions;
  let notifications = store.notifications;

  if (submissions.length === 0) {
    submissions = INITIAL_DEMO_RSVPS;
    await redisCommand(["SET", "demo_wedding:rsvps", JSON.stringify(submissions)]);
  }
  if (notifications.length === 0) {
    notifications = INITIAL_NOTIFICATIONS;
    await redisCommand(["SET", "demo_wedding:notifications", JSON.stringify(notifications)]);
  }

  return Response.json({ ok: true, submissions, notifications });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: string;
      role?: string;
      notificationId?: string;
      submission?: RsvpSubmission;
      notification?: RsvpNotification;
    };

    if (body.action === "mark_read") {
      const role = body.role === "cerimonialista" ? "cerimonialista" : "noivos";
      const notificationId =
        typeof body.notificationId === "string" && body.notificationId.trim()
          ? body.notificationId.trim()
          : undefined;
      const ok = await markCloudNotificationsRead(role, notificationId);
      return Response.json({ ok: true, success: ok }, { status: ok ? 200 : 500 });
    }

    const deviceMeta = extractRequestDeviceMeta(request);

    if (body.submission) {
      const sub = body.submission;
      if (
        typeof sub.invitationId !== "string" ||
        !sub.invitationId.trim() ||
        typeof sub.primaryName !== "string" ||
        !sub.primaryName.trim() ||
        !Array.isArray(sub.familyMembers)
      ) {
        return Response.json(
          { ok: false, error: "Dados de confirmação inválidos ou incompletos" },
          { status: 400 }
        );
      }

      // Garante semente inicial antes do primeiro upsert
      const current = await getCloudRsvps();
      if (current.ok && current.submissions.length === 0) {
        await redisCommand(["SET", "demo_wedding:rsvps", JSON.stringify(INITIAL_DEMO_RSVPS)]);
      }
      if (current.ok && current.notifications.length === 0) {
        await redisCommand(["SET", "demo_wedding:notifications", JSON.stringify(INITIAL_NOTIFICATIONS)]);
      }

      const sanitizedSub: RsvpSubmission = {
        ...sub,
        invitationId: sub.invitationId.trim().slice(0, 80),
        primaryName: sub.primaryName.trim().slice(0, 160),
        phone: String(sub.phone || "").slice(0, 40),
        message: String(sub.message || "").slice(0, 2000),
      };

      const saved = await saveCloudRsvp(sanitizedSub, body.notification, deviceMeta);
      if (!saved) {
        return Response.json(
          { ok: false, error: "Erro ao persistir confirmação no banco da Demo" },
          { status: 500 }
        );
      }
    }

    const store = await getCloudRsvps();
    return Response.json({
      ok: true,
      submissions: store.submissions.length > 0 ? store.submissions : INITIAL_DEMO_RSVPS,
      notifications: store.notifications.length > 0 ? store.notifications : INITIAL_NOTIFICATIONS,
    });
  } catch (err: any) {
    return Response.json(
      { ok: false, error: err?.message || "Erro interno ao processar RSVP" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  return Response.json(
    { ok: false, error: "Operação de reset global desativada na Demo." },
    { status: 403 }
  );
}
