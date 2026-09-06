import type { IssueKind } from '../../types/city';
const asset = (name: string) => `/evidence/${name}.webp`;

// All assets are Indian reference photographs. These scenario attachment slots
// do not establish source capture dates or successive real-world sightings.
export const evidenceSequences = {
  pothole: ['pothole-detected', 'pothole-observed', 'pothole-degrading', 'pothole-high-risk', 'pothole-repair', 'pothole-verified'].map(asset),
  waterlogging: ['water-pooling', 'water-recurring', 'water-spreading', 'water-persistent'].map(asset),
  'zebra-crossing': ['crossing-fading', 'crossing-degraded', 'crossing-worn', 'crossing-absent'].map(asset),
  divider: [1, 2, 3, 4].map(n => asset(`divider-stage-${n}`)),
  signboard: ['sign-damaged', 'sign-degraded', 'sign-missing', 'sign-absent'].map(asset),
  guardrail: ['guardrail-stage-1', 'guardrail-stage-2', 'guardrail-stage-3', 'guardrail-damaged'].map(asset),
  'school-crossing': [1, 2, 3, 4].map(n => asset(`school-stage-${n}`)),
};
export const defectEvidence = {
  'DEF-8301': evidenceSequences.pothole,
  'DEF-8292': evidenceSequences.waterlogging,
  'INF-8168': evidenceSequences['zebra-crossing'],
  'INF-8159': evidenceSequences.divider,
  'INF-8152': evidenceSequences.signboard,
  'INF-8148': evidenceSequences.guardrail,
  'DEF-8141': evidenceSequences['school-crossing'],
} as const;
export const policeEvidence = {
  incident: [1, 2, 3, 4, 5].map(n => asset(`incident-frame-${n}`)),
  plate: asset('incident-plate'),
  motorcycle: asset('motorcycle-candidate'),
  obstruction: asset('road-debris'),
  vehicle: [1, 2, 3].map(n => asset(`vehicle-pass-${n}`)),
  vehicleReference: asset('vehicle-reference'),
  person: [1, 2, 3].map(n => asset(`person-pass-${n}`)),
  personReference: asset('person-reference'),
};
export const completionEvidenceByKind: Record<IssueKind, string> = {
  pothole: asset('pothole-verified'),
  waterlogging: asset('water-completed'),
  obstruction: asset('obstruction-completed'),
  'zebra-crossing': asset('crossing-completed'),
  divider: asset('divider-completed'),
  signboard: asset('sign-completed'),
  guardrail: asset('guardrail-completed'),
  'school-crossing': asset('school-completed'),
};