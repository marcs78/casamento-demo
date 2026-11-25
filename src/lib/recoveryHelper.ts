// Helper para varrer o localStorage da Demo em busca de RSVPs salvos localmente
export function scanAndRestoreLocalBackups(): { recovered: any[]; sourceKey: string } {
  if (typeof window === "undefined") return { recovered: [], sourceKey: "" };

  const candidateKeys = [
    "anita_giuseppe_demo_all_rsvps_v1",
  ];

  for (const key of candidateKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter(
            (item: any) =>
              item &&
              item.invitationId &&
              item.familyMembers &&
              Array.isArray(item.familyMembers) &&
              item.familyMembers.length > 0
          );
          if (valid.length > 0) {
            return { recovered: valid, sourceKey: key };
          }
        }
      }
    } catch {}
  }

  const notifKeys = [
    "anita_giuseppe_demo_rsvp_notifications_v1",
  ];

  for (const key of notifKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const reconstructed = parsed
            .filter((n: any) => n && n.invitationId && n.confirmedNames && n.confirmedNames.length > 0)
            .map((n: any) => ({
              invitationId: n.invitationId,
              primaryName: n.primaryName,
              phone: n.phone,
              answer: n.answer || "sim",
              familyMembers: n.confirmedNames.map((name: string) => ({
                name,
                type: "adulto",
                confirmed: true,
              })),
              adultsCount: n.adultsCount || n.confirmedNames.length,
              kidsCount: n.kidsCount || 0,
              declinedCount: n.declinedCount || 0,
              diet: n.diet || "",
              message: n.message || "",
              status: "confirmado_lista",
              timestamp: n.timestamp || "",
            }));
          if (reconstructed.length > 0) {
            return { recovered: reconstructed, sourceKey: key };
          }
        }
      }
    } catch {}
  }

  return { recovered: [], sourceKey: "" };
}
