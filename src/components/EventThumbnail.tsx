import type { IssueKind } from '../types/city';
import { completionEvidenceByKind } from '../data/demo/evidence';
import '../styles-event-cards.css';

export type EventCategory = IssueKind | 'traffic' | 'incident' | 'person' | 'vehicle' | 'project';

// Presentation only: workflow values and transitions remain unchanged.
const phaseLabels: Record<string, string> = {
  Candidate: 'Needs officer check',
  Detected: 'Needs assessment',
  Qualified: 'Ready to assign',
  Requested: 'Response requested',
  Dispatched: 'Response sent',
  Acknowledged: 'Team confirmed',
  'Admin review': 'Needs verification',
  'Pending Verification': 'Needs verification',
  Verified: 'Verified',
};
export const eventPhaseLabel = (phase: string) => phaseLabels[phase] || phase;

// Local photographs listed in the photo manifest; never selected from case captures.
const categoryPhotos: Record<EventCategory, string> = {
  pothole: '/evidence/pothole-detected.webp',
  waterlogging: '/evidence/water-persistent.webp',
  obstruction: '/evidence/road-debris.webp',
  'zebra-crossing': '/evidence/crossing-worn.webp',
  divider: '/evidence/divider-stage-2.webp',
  signboard: '/evidence/sign-missing.webp',
  guardrail: '/evidence/guardrail-damaged.webp',
  'school-crossing': '/evidence/school-stage-4.webp',
  traffic: '/evidence/water-completed.webp',
  incident: '/evidence/incident-frame-4.webp',
  person: '/evidence/person-reference.webp',
  vehicle: '/evidence/vehicle-reference.webp',
  project: '/evidence/pothole-repair.webp',
};

/** Decorative category reference only, not a case capture. Detail views display provenance. */
export function EventThumbnail({ category, completed = false, image }: { category: EventCategory; completed?: boolean; image?: string }) {
  const src = image || (completed && Object.prototype.hasOwnProperty.call(completionEvidenceByKind, category)
    ? completionEvidenceByKind[category as IssueKind]
    : Object.prototype.hasOwnProperty.call(categoryPhotos, category) ? categoryPhotos[category] : undefined);
  return <span className="event-thumbnail" data-category={category} aria-hidden="true">
    {src && <img className="event-thumbnail-photo" src={src} alt="" loading="lazy" decoding="async"/>}
  </span>;
}