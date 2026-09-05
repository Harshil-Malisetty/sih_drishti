const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** Seed-only parser. Domain commands and future APIs use explicit ISO timestamps. */
export function demoDate(display: string): string {
  const day = display.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/);
  const time = display.match(/\b(\d{2}:\d{2}(?::\d{2})?)\b/);
  if (!day && !time) throw new Error(`Invalid demo date: ${display}`);
  return `2026-${day ? String(months.indexOf(day[2]) + 1).padStart(2,'0') : '09'}-${day ? day[1].padStart(2,'0') : '05'}T${time ? time[1].length === 5 ? `${time[1]}:00` : time[1] : '09:00:00'}+05:30`;
}
export function formatDemoTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
}
export function formatDemoDate(iso: string): string {
  const date = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' }).format(new Date(iso));
  return `${date} · ${formatDemoTime(iso)}`;
}
export function relativeDemoTime(iso: string, now: string): string {
  const minutes = Math.max(0, Math.floor((Date.parse(now) - Date.parse(iso)) / 60_000));
  return minutes < 1 ? 'Just now' : minutes < 60 ? `${minutes} min ago` : minutes < 1440 ? `${Math.floor(minutes / 60)} hr ago` : `${Math.floor(minutes / 1440)} days ago`;
}