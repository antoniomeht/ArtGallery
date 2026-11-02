import type { ExhibitionFields } from "./exhibition";

const LOCALE = "es-ES";
const dayMonth = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const fullDate = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

// Dates are calendar days ("2026-03-12"), so they are read as UTC to avoid
// shifting a day in time zones behind UTC.
const parse = (date: string) => new Date(`${date}T00:00:00Z`);

/** "12 de marzo – 30 de abril de 2026", or null when there are no dates. */
export function formatDateRange({
  startDate,
  endDate,
}: Pick<ExhibitionFields, "startDate" | "endDate">): string | null {
  if (startDate && endDate) {
    const sameYear = startDate.slice(0, 4) === endDate.slice(0, 4);
    const start = (sameYear ? dayMonth : fullDate).format(parse(startDate));
    return startDate === endDate
      ? fullDate.format(parse(endDate))
      : `${start} – ${fullDate.format(parse(endDate))}`;
  }
  if (startDate) return `Desde el ${fullDate.format(parse(startDate))}`;
  if (endDate) return `Hasta el ${fullDate.format(parse(endDate))}`;
  return null;
}
