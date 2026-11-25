import { VENUE } from "./wedding";

const EVENT_TITLE = "Casamento Anita & Giuseppe 💍 (Demo)";
const EVENT_LOCATION = `${VENUE.name} - ${VENUE.address}, ${VENUE.city}`;
const EVENT_DESCRIPTION =
  "Cerimônia e recepção do casamento de Anita & Giuseppe (Versão Demonstração).\n" +
  "Horário: 19h30 (Pontualmente)\n" +
  `Local: ${VENUE.name} (${VENUE.address}, ${VENUE.city})`;

// 18/09/2027 19:30 BRT (-03:00) = 2027-09-18T22:30:00Z até 2027-09-19T03:00:00Z
const START_UTC = "20270918T223000Z";
const END_UTC = "20270919T030000Z";

export function getGoogleCalendarUrl(): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: EVENT_TITLE,
    dates: `${START_UTC}/${END_UTC}`,
    details: EVENT_DESCRIPTION,
    location: EVENT_LOCATION,
    ctz: "America/Sao_Paulo",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadWeddingIcs(): void {
  if (typeof window === "undefined") return;

  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Casamento Anita e Giuseppe//Convite Demo//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:casamento-anita-giuseppe-demo-20270918@demo.app",
    `DTSTAMP:${START_UTC}`,
    `DTSTART:${START_UTC}`,
    `DTEND:${END_UTC}`,
    `SUMMARY:${EVENT_TITLE}`,
    `LOCATION:${EVENT_LOCATION.replace(/,/g, "\\,")}`,
    `DESCRIPTION:${EVENT_DESCRIPTION.replace(/\n/g, "\\n").replace(/,/g, "\\,")}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    "DESCRIPTION:Amanhã é o Casamento de Anita & Giuseppe às 19h30!",
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-PT3H",
    "ACTION:DISPLAY",
    `DESCRIPTION:Casamento de Anita & Giuseppe hoje às 19h30 na ${VENUE.name}!`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const blob = new Blob([icsLines.join("\r\n")], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: "casamento-anita-e-giuseppe-18-09-2027.ics",
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
