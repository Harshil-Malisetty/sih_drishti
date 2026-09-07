import type { WatchlistMatch } from '../types';
import type { CityState, EventRef } from '../types/city';

// Operational groupings for this demo, not official Chennai police boundaries.
// Own corridors explicitly; never infer ownership from a moving source bus.
export const policeJurisdictions = [
  { id: 'central', name: 'Central · Anna Salai', areas: 'Teynampet · T. Nagar · Nandanam', segments: ['anna', 'anna-nandanam', 'cathedral', 'cpr'], center: [13.043, 80.245], zoom: 13 },
  { id: 'guindy', name: 'Guindy · Saidapet', areas: 'Kathipara · Inner Ring Road · GST Road', segments: ['inner-ring', 'gst', 'gst-saidapet', 'guindy-kathipara'], center: [13.011, 80.218], zoom: 13 },
  { id: 'velachery', name: 'Velachery', areas: 'Main Road · Phoenix Marketcity', segments: ['velachery', 'velachery-phoenix'], center: [12.986, 80.222], zoom: 14 },
  { id: 'adyar', name: 'Adyar · Madhya Kailash', areas: 'L.B. Road · School zone · OMR junction', segments: ['lb-road', 'adyar-school', 'omr'], center: [13.001, 80.252], zoom: 13 },
  { id: 'omr', name: 'OMR South', areas: 'Thoraipakkam · Sholinganallur', segments: ['omr-thoraipakkam', 'omr-sholinganallur'], center: [12.926, 80.235], zoom: 12 },
] as const;

export type PoliceJurisdictionId = 'all' | typeof policeJurisdictions[number]['id'];
export function isPoliceJurisdictionId(value: unknown): value is PoliceJurisdictionId {
  return value === 'all' || policeJurisdictions.some(item => item.id === value);
}
export function jurisdictionForSegment(segmentId: string | undefined) {
  return policeJurisdictions.find(area => (area.segments as readonly string[]).includes(segmentId || ''));
}
export function segmentInJurisdiction(segmentId: string | undefined, scope: PoliceJurisdictionId) {
  return scope === 'all' || jurisdictionForSegment(segmentId)?.id === scope;
}
export function matchInJurisdiction(match: WatchlistMatch, scope: PoliceJurisdictionId) {
  return segmentInJurisdiction(match.observations?.at(-1)?.roadSegmentId, scope);
}
export function eventInJurisdiction(state: CityState, event: EventRef, scope: PoliceJurisdictionId) {
  if (scope === 'all') return true;
  const match = state.watchlist[event.id];
  if (match) return matchInJurisdiction(match, scope);
  const record = event.kind === 'incident' ? state.incidents[event.id] : event.kind === 'anomaly' ? state.anomalies[event.id] : state.issues[event.id];
  return segmentInJurisdiction(record?.roadSegmentId, scope);
}