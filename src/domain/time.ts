import type { CityState } from '../types/city';

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export type CityClock = () => string;
export const browserClock: CityClock = () => new Date().toISOString();

/** Explicit zones only; Date.parse alone silently accepts dates such as February 30. */
export function timestampMillis(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  const time = Date.parse(value);
  if (!match || !Number.isFinite(time)) throw new Error('An explicit ISO timestamp is required');
  const [, year, month, day, hour, minute, second, zone] = match;
  const leap = +year % 4 === 0 && (+year % 100 !== 0 || +year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (+month < 1 || +month > 12 || +day < 1 || +day > days[+month - 1]
    || +hour > 23 || +minute > 59 || +second > 59
    || (zone !== 'Z' && (+zone.slice(1, 3) > 23 || +zone.slice(4) > 59))) {
    throw new Error('An explicit ISO timestamp is required');
  }
  return time;
}

/** Seed-only parser. Domain commands and future APIs use explicit ISO timestamps. */
export function demoDate(display: string, reference = '2026-09-05T09:00:00+05:30'): string {
  if (/^\d{4}-\d{2}-\d{2}T/.test(display)) { timestampMillis(display); return display; }
  const referenceDay = new Date(timestampMillis(reference) + 330 * 60_000).toISOString().slice(0, 10);
  const day = display.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)(?:\s+(\d{4}))?/);
  const time = display.match(/\b(\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?)\b/);
  if (!day && !time) throw new Error(`Invalid demo date: ${display}`);
  const date = day ? `${day[3] || referenceDay.slice(0, 4)}-${String(months.indexOf(day[2].slice(0, 3)) + 1).padStart(2,'0')}-${day[1].padStart(2,'0')}` : referenceDay;
  const iso = `${date}T${time ? time[1].length === 5 ? `${time[1]}:00` : time[1] : '09:00:00'}+05:30`;
  timestampMillis(iso);
  return iso;
}

/** Legacy text-only surfaces need the year and seconds, including across midnight/year boundaries. */
export function formatDemoTimestamp(iso: string): string {
  const date = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    ...(new Date(iso).getUTCMilliseconds() ? { fractionalSecondDigits: 3 as const } : {}),
  }).format(new Date(iso));
  return `${date} · ${time}`;
}

/** Translate history by ONE offset, preserving ages/durations. Never translate schedule windows. */
export function anchorCityHistory(seed: CityState, anchor: string): CityState {
  const offset = timestampMillis(anchor) - timestampMillis(seed.now);
  const state = structuredClone(seed);
  const shift = (value: string) => new Date(timestampMillis(demoDate(value)) + offset).toISOString();
  const history = (entries: { at: string }[]) => entries.forEach(entry => { entry.at = shift(entry.at); });
  for (const bus of Object.values(state.buses)) bus.observedAt = shift(bus.observedAt);
  for (const observation of Object.values(state.trafficObservations)) {
    observation.observedAt = shift(observation.observedAt);
    observation.timestamp = formatDemoTime(observation.observedAt);
  }
  for (const incident of Object.values(state.incidents)) {
    const parent = incident.observedAt;
    incident.observedAt = shift(parent);
    incident.timestamp = formatDemoTimestamp(incident.observedAt);
    if (incident.resolvedAt) incident.resolvedAt = shift(incident.resolvedAt);
    for (const stage of incident.track?.stages || []) {
      stage.timestamp = formatDemoTimestamp(shift(demoDate(stage.timestamp, parent)));
    }
  }
  for (const match of Object.values(state.watchlist)) {
    const parent = demoDate(match.timestamp);
    match.timestamp = shift(parent);
    for (const observation of match.observations || []) observation.timestamp = shift(demoDate(observation.timestamp, parent));
  }
  for (const issue of Object.values(state.issues)) {
    issue.firstSeen = shift(issue.firstSeen);
    issue.lastSeen = shift(issue.lastSeen);
    for (const observation of issue.observations || []) {
      observation.observedAt = shift(observation.observedAt || observation.date);
      observation.date = formatDemoDate(observation.observedAt);
    }
    if (issue.repair) {
      issue.repair.markedRepaired = shift(issue.repair.markedRepaired);
      issue.repair.nextObservation = shift(issue.repair.nextObservation);
    }
    history(issue.history);
  }
  for (const assignment of Object.values(state.assignments)) {
    assignment.assignedAt = shift(assignment.assignedAt);
    if (assignment.acknowledgedAt) assignment.acknowledgedAt = shift(assignment.acknowledgedAt);
    if (assignment.supersededAt) assignment.supersededAt = shift(assignment.supersededAt);
  }
  for (const resolution of Object.values(state.resolutions)) {
    resolution.submittedAt = shift(resolution.submittedAt);
    resolution.evidence.forEach(evidence => { evidence.capturedAt = shift(evidence.capturedAt); });
  }
  for (const review of Object.values(state.reviews)) {
    review.notifiedAt = shift(review.notifiedAt);
    if (review.reviewedAt) review.reviewedAt = shift(review.reviewedAt);
  }
  for (const anomaly of Object.values(state.anomalies)) { anomaly.detectedAt = shift(anomaly.detectedAt); history(anomaly.history); }
  for (const dispatch of Object.values(state.dispatches)) { dispatch.requestedAt = shift(dispatch.requestedAt); history(dispatch.history); }
  for (const dispatch of Object.values(state.emergencyDispatches)) {
    dispatch.requestedAt = shift(dispatch.requestedAt);
    if (dispatch.completedAt) dispatch.completedAt = shift(dispatch.completedAt);
    if (dispatch.dischargedAt) dispatch.dischargedAt = shift(dispatch.dischargedAt);
    if (dispatch.resolvedAt) dispatch.resolvedAt = shift(dispatch.resolvedAt);
    history(dispatch.history);
  }
  for (const scenario of Object.values(state.scenarios)) scenario.createdAt = shift(scenario.createdAt);
  for (const project of Object.values(state.projects)) {
    project.createdAt = shift(project.createdAt);
    if (project.approvedAt) project.approvedAt = shift(project.approvedAt);
    if (project.publishedAt) project.publishedAt = shift(project.publishedAt);
  }
  for (const report of Object.values(state.citizenReports)) report.submittedAt = shift(report.submittedAt);
  state.now = anchor;
  return state;
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