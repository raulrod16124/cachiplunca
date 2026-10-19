import type { AppLocale } from './messages';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export function formatRelativeDate(date: Date, locale: AppLocale, now: Date = new Date()): string {
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const diff = date.getTime() - now.getTime();
  const absolute = Math.abs(diff);

  if (absolute < MINUTE) {
    return formatter.format(0, 'second');
  }
  if (absolute < HOUR) {
    return formatter.format(Math.round(diff / MINUTE), 'minute');
  }
  if (absolute < DAY) {
    return formatter.format(Math.round(diff / HOUR), 'hour');
  }
  if (absolute < WEEK) {
    return formatter.format(Math.round(diff / DAY), 'day');
  }
  if (absolute < MONTH) {
    return formatter.format(Math.round(diff / WEEK), 'week');
  }
  if (absolute < YEAR) {
    return formatter.format(Math.round(diff / MONTH), 'month');
  }
  return formatter.format(Math.round(diff / YEAR), 'year');
}

export function formatShortDate(date: Date, locale: AppLocale): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}
