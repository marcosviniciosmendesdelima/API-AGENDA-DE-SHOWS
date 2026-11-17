export function normalizarHorarioTermino(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;

  const show = input as Record<string, unknown>;
  const data = toDate(show.data);
  const dataFim = toDate(show.dataFim);
  if (!data || !dataFim || dataFim > data) return input;

  const dataFimSeguinte = addCalendarDay(show.dataFim);
  const dataFimSeguinteDate = toDate(dataFimSeguinte);
  if (!dataFimSeguinteDate || dataFimSeguinteDate <= data) return input;

  return { ...show, dataFim: dataFimSeguinte };
}

function toDate(value: unknown): Date | null {
  const date = value instanceof Date ? value : typeof value === "string" ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
}

function addCalendarDay(value: unknown): string | Date | null {
  if (value instanceof Date) {
    return new Date(value.getTime() + 24 * 60 * 60 * 1000);
  }
  if (typeof value !== "string") return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})(T.*)$/.exec(value);
  if (!match) return null;

  const [, year, month, day, time] = match;
  const nextDay = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day) + 1));
  const nextDate = [
    String(nextDay.getUTCFullYear()).padStart(4, "0"),
    String(nextDay.getUTCMonth() + 1).padStart(2, "0"),
    String(nextDay.getUTCDate()).padStart(2, "0"),
  ].join("-");
  return `${nextDate}${time}`;
}
