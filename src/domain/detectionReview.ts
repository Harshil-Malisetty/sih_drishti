import type { CityState, IssueKind } from '../types/city';
import type { DetectionCategory, DetectionReview, DetectionReviewInput, EdgeDetection, ReviewRole } from '../types/detectionReview';
import { segmentInJurisdiction, isPoliceJurisdictionId, type PoliceJurisdictionId } from './policeJurisdictions';

export const detectionLabels: Record<DetectionCategory, string> = {
  pothole: 'Pothole', waterlogging: 'Waterlogging', signboard: 'Signboard', guardrail: 'Guardrail',
  obstruction: 'Road obstruction', 'potential-collision': 'Potential collision',
};
export const reviewCategories: Record<ReviewRole, DetectionCategory[]> = {
  municipal: ['pothole', 'waterlogging', 'signboard', 'guardrail', 'obstruction'],
  police: ['potential-collision', 'obstruction'],
};
export const reviewDepartments: Partial<Record<IssueKind, string>> = {
  pothole: 'roads-engineering', waterlogging: 'stormwater', signboard: 'signage', guardrail: 'roads-infrastructure', obstruction: 'roads-engineering',
};
export function latestDetectionReview(state: CityState, detectionId: string): DetectionReview | undefined {
  return Object.values(state.detectionReviews).filter(review => review.detectionId === detectionId)
    .sort((a, b) => Date.parse(b.reviewedAt) - Date.parse(a.reviewedAt) || b.id.localeCompare(a.id))[0];
}
export const detectionStatus = (state: CityState, id: string) => latestDetectionReview(state, id)?.decision || 'Pending';
export const detectionScore = (detection: EdgeDetection) => {
  const scores = detection.frames.flatMap(frame => frame.boxes.map(box => box.confidence));
  return scores.length ? Math.max(...scores) : null;
};
export type ReviewFilter = 'Pending' | 'Needs verification' | 'Reviewed' | 'All';
export type ReviewSort = 'Priority' | 'Oldest first' | 'Newest first' | 'Lowest confidence';
const priority = { Critical: 0, High: 1, Medium: 2, Low: 3 };
export function selectDetectionQueue(state: CityState, role: ReviewRole, scope: PoliceJurisdictionId = 'all', options: {
  status?: ReviewFilter; category?: string; confidence?: 'all' | 'low' | 'high'; sort?: ReviewSort; search?: string;
} = {}) {
  return Object.values(state.edgeDetections).filter(item => {
    const status = detectionStatus(state, item.id);
    const score = detectionScore(item);
    return item.role === role && (role !== 'police' || segmentInJurisdiction(item.roadSegmentId, scope))
      && Date.parse(item.receivedAt) <= Date.parse(state.now)
      && (!options.status || options.status === 'All' || (options.status === 'Reviewed' ? ['Confirmed', 'Corrected', 'Rejected'].includes(status) : status === options.status))
      && (!options.category || options.category === 'all' || item.category === options.category)
      && (!options.confidence || options.confidence === 'all' || (score !== null && (options.confidence === 'low' ? score < .8 : score >= .8)))
      && `${item.id} ${detectionLabels[item.category]} ${state.roadSegments[item.roadSegmentId]?.name || ''} ${item.busId}`.toLowerCase().includes((options.search || '').trim().toLowerCase());
  }).sort((a, b) => {
    const time = Date.parse(a.receivedAt) - Date.parse(b.receivedAt);
    const order = options.sort === 'Lowest confidence' ? (detectionScore(a) ?? 2) - (detectionScore(b) ?? 2)
      : options.sort === 'Newest first' ? -time : options.sort === 'Oldest first' ? time : priority[a.severity] - priority[b.severity];
    return order || time || a.id.localeCompare(b.id);
  });
}

/** Validate independently of UI. A stale/repeated decision can never create a second case. */
export function validateDetectionReview(state: CityState, input: DetectionReviewInput): EdgeDetection {
  const detection = state.edgeDetections[input.detectionId];
  if (!detection) throw new Error('Unknown edge detection');
  if (input.role !== detection.role || !isPoliceJurisdictionId(input.jurisdictionId)
    || (input.role === 'police' && !segmentInJurisdiction(detection.roadSegmentId, input.jurisdictionId))) throw new Error('Review this detection in its responsible workspace and jurisdiction');
  const previous = latestDetectionReview(state, detection.id);
  if (input.expectedRevision !== detection.revision || (previous?.id || null) !== input.expectedReviewId) throw new Error('This review changed. Reopen the candidate before deciding');
  if (previous && previous.decision !== 'Needs verification') throw new Error('This detection already has a final decision');
  if (!['Confirmed', 'Corrected', 'Rejected', 'Needs verification'].includes(input.decision)) throw new Error('Invalid review decision');
  if (!input.reviewer.trim() || !input.note.trim() || input.note.length > 1000) throw new Error('Reviewer and a reason of 1–1000 characters are required');
  if (!reviewCategories[input.role].includes(input.category) || !Object.hasOwn(priority, input.severity)) throw new Error('Choose a valid category and severity for this workspace');
  if (new Set(input.frames.map(frame => frame.frameId)).size !== input.frames.length
    || input.frames.some(frame => !detection.frames.some(source => source.id === frame.frameId) || !['Supports', 'Unclear', 'False positive'].includes(frame.verdict))) throw new Error('Invalid frame assessment');
  if (['Confirmed', 'Corrected'].includes(input.decision)) {
    if (!detection.frames.length || input.frames.length !== detection.frames.length) throw new Error('Assess every supplied frame before confirmation');
    if (!input.frames.some(frame => frame.verdict === 'Supports')) throw new Error('At least one frame must support the human assessment');
    const changed = input.category !== detection.category || input.severity !== detection.severity;
    if (changed !== (input.decision === 'Corrected')) throw new Error(changed ? 'Use Correct & confirm for changed predictions' : 'Change the category or severity before correcting');
  } else if (input.category !== detection.category || input.severity !== detection.severity) {
    throw new Error('Only a corrected confirmation can change the prediction');
  }
  return detection;
}