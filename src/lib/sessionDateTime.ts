const BRASILIA_TIME_ZONE = 'America/Sao_Paulo';

const pad = (value: number) => String(value).padStart(2, '0');

function getBrasiliaDateParts(dateInput: string | Date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRASILIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(new Date(dateInput));

  return {
    year: parts.find((part) => part.type === 'year')?.value ?? '',
    month: parts.find((part) => part.type === 'month')?.value ?? '',
    day: parts.find((part) => part.type === 'day')?.value ?? '',
  };
}

export function getBrasiliaCalendarDate(dateInput: string | Date = new Date()) {
  const { year, month, day } = getBrasiliaDateParts(dateInput);
  return `${year}-${month}-${day}`;
}

export function getBrasiliaYear(dateInput: string | Date = new Date()) {
  return getBrasiliaDateParts(dateInput).year;
}

export function getStoredSessionDayRangeForBrasilia(dateInput: string | Date = new Date()) {
  const date = getBrasiliaCalendarDate(dateInput);

  return {
    start: `${date}T00:00:00.000Z`,
    end: `${date}T23:59:59.999Z`,
  };
}

export function getStoredSessionYearRangeForBrasilia(dateInput: string | Date = new Date()) {
  const year = getBrasiliaYear(dateInput);

  return {
    start: `${year}-01-01T00:00:00.000Z`,
    end: `${year}-12-31T23:59:59.999Z`,
  };
}

export function toStoredSessionDateTime(value: string) {
  if (!value) return value;

  const normalized = value.length === 16 ? `${value}:00` : value;
  return normalized.endsWith('Z') ? normalized : `${normalized}Z`;
}

export function toDateTimeLocalFromStoredSession(value: string) {
  const date = new Date(value);

  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

export function formatStoredSessionTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(new Date(value));
}

export function formatStoredSessionDateLong(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}
