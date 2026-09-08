import type { Severity } from './index';
import type { EventRef } from './city';
import type { PoliceJurisdictionId } from '../domain/policeJurisdictions';

export type ReviewRole = 'municipal' | 'police';
export type DetectionCategory = 'pothole' | 'waterlogging' | 'signboard' | 'guardrail' | 'obstruction' | 'potential-collision';
export type DetectionDecision = 'Confirmed' | 'Corrected' | 'Rejected' | 'Needs verification';
export type FrameVerdict = 'Supports' | 'Unclear' | 'False positive';
export interface DetectionBox {
  id: string; label: string; confidence: number;
  // Normalized top-left coordinates relative to the actual image, not its container.
  x: number; y: number; width: number; height: number;
}
export interface DetectionFrame {
  id: string; image: string; label: string; quality: string; boxes: DetectionBox[];
}
export interface EdgeDetection {
  id: string; revision: number; role: ReviewRole; roadSegmentId: string; busId: string;
  receivedAt: string; category: DetectionCategory; severity: Severity;
  modelVersion: string; processing: string[]; frames: DetectionFrame[];
  provenance: 'Demo annotations on reference photos';
}
export interface DetectionReviewInput {
  detectionId: string; expectedRevision: number; expectedReviewId: string | null;
  role: ReviewRole; jurisdictionId: PoliceJurisdictionId; reviewer: string;
  decision: DetectionDecision; note: string;
  category: DetectionCategory; severity: Severity;
  frames: { frameId: string; verdict: FrameVerdict }[];
}
export interface DetectionReview extends DetectionReviewInput {
  id: string; reviewedAt: string; event?: EventRef;
}