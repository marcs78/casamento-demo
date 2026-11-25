import { verifyAdminRequest } from "@/lib/adminAuth";
import {
  extractRequestDeviceMeta,
  getCloudGifts,
  redisCommand,
  saveCloudGift,
  updateCloudGift,
  deleteCloudGift,
} from "@/lib/cloudDb";
import { INITIAL_GIFT_CONTRIBUTIONS, type GiftContribution } from "@/lib/guestList";

export async function GET() {
  let gifts = await getCloudGifts();
  if (gifts.length === 0) {
    gifts = INITIAL_GIFT_CONTRIBUTIONS;
    await redisCommand(["SET", "demo_wedding:gifts", JSON.stringify(gifts)]);
  }
  return Response.json({ gifts });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: "add" | "update" | "delete";
      gift?: GiftContribution;
      id?: string;
      patch?: Partial<GiftContribution>;
    };

    const deviceMeta = extractRequestDeviceMeta(request);

    // Garante seed inicial antes da escrita
    const existing = await getCloudGifts();
    if (existing.length === 0) {
      await redisCommand(["SET", "demo_wedding:gifts", JSON.stringify(INITIAL_GIFT_CONTRIBUTIONS)]);
    }

    if (body.action === "add" && body.gift) {
      if (!body.gift.id || !body.gift.guestName || !body.gift.giftTitle) {
        return Response.json({ ok: false, error: "Dados do presente incompletos" }, { status: 400 });
      }
      const sanitizedGift: GiftContribution = {
        ...body.gift,
        guestName: String(body.gift.guestName).trim().slice(0, 160),
        giftTitle: String(body.gift.giftTitle).trim().slice(0, 200),
        message: body.gift.message ? String(body.gift.message).slice(0, 2000) : undefined,
      };
      await saveCloudGift(sanitizedGift, deviceMeta);
    } else if (body.action === "update" && body.id && body.patch) {
      const allowed = await verifyAdminRequest(request, "noivos");
      if (!allowed) {
        return Response.json({ ok: false, error: "Acesso restrito aos noivos" }, { status: 401 });
      }
      await updateCloudGift(body.id, body.patch);
    } else if (body.action === "delete" && body.id) {
      const allowed = await verifyAdminRequest(request, "noivos");
      if (!allowed) {
        return Response.json({ ok: false, error: "Acesso restrito aos noivos" }, { status: 401 });
      }
      await deleteCloudGift(body.id);
    }

    const gifts = await getCloudGifts();
    return Response.json({ ok: true, gifts: gifts.length > 0 ? gifts : INITIAL_GIFT_CONTRIBUTIONS });
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
}

export async function DELETE() {
  return Response.json(
    { ok: false, error: "Operação de reset global desativada na Demo." },
    { status: 403 }
  );
}
