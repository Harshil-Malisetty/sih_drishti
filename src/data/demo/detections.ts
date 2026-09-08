import sources from '../../../public/evidence/image-sources.json';
import { evidenceSequences, policeEvidence } from './evidence';
import type { DetectionCategory, EdgeDetection, ReviewRole } from '../../types/detectionReview';
import type { Severity } from '../../types';

// Fixture output only. No OpenCV/YOLO inference is run on these reference photographs.
// Deduplicate aliases by original source, not by filename. Never invent successive captures.
function uniquePhotos(images: string[]) {
  const seen = new Set<string>();
  return images.filter(image => {
    const key = sources.find(source => source.filename === image)?.originalUrl || image;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}
export function createDemoDetections(now: string): Record<string, EdgeDetection> {
  const candidates: { id: string; role: ReviewRole; category: DetectionCategory; severity: Severity; segment: string; images: string[]; label: string; score: number }[] = [
    { id: 'EDGE-M01', role: 'municipal', category: 'pothole', severity: 'High', segment: 'anna-nandanam', images: evidenceSequences.pothole.slice(0, 4), label: 'road defect', score: .89 },
    { id: 'EDGE-M02', role: 'municipal', category: 'waterlogging', severity: 'Critical', segment: 'velachery-phoenix', images: evidenceSequences.waterlogging, label: 'standing water', score: .94 },
    { id: 'EDGE-M03', role: 'municipal', category: 'signboard', severity: 'Medium', segment: 'adyar-school', images: evidenceSequences.signboard, label: 'signboard', score: .58 },
    { id: 'EDGE-P01', role: 'police', category: 'potential-collision', severity: 'High', segment: 'gst', images: policeEvidence.incident, label: 'vehicle', score: .92 },
    { id: 'EDGE-P02', role: 'police', category: 'obstruction', severity: 'Medium', segment: 'omr', images: [policeEvidence.obstruction], label: 'road debris', score: .67 },
  ];
  return Object.fromEntries(candidates.map((candidate, index) => {
    const detection: EdgeDetection = {
      id: candidate.id, revision: 1, role: candidate.role, category: candidate.category, severity: candidate.severity,
      roadSegmentId: candidate.segment, busId: index % 2 ? 'MTC-1423' : 'MTC-2147',
      receivedAt: new Date(Date.parse(now) - (index + 1) * 180_000).toISOString(),
      modelVersion: candidate.role === 'municipal' ? 'yolo-road-demo-v1' : 'yolo-traffic-demo-v1',
      processing: ['OpenCV · frame selection', 'YOLO · object proposals', 'OpenCV · grouping / quality checks'],
      provenance: 'Demo annotations on reference photos',
      frames: uniquePhotos(candidate.images).map((image, frameIndex) => ({
        id: `${candidate.id}-F${frameIndex + 1}`, image, label: `Reference frame ${frameIndex + 1}`,
        quality: frameIndex === 1 ? 'Partial context — inspect surrounding road' : 'Manual evidence-quality check required',
        boxes: [{ id: `${candidate.id}-B${frameIndex + 1}`, label: candidate.label,
          confidence: Math.round((candidate.score - frameIndex * .065) * 100) / 100,
          x: .12, y: .28, width: .72, height: .55 }],
      })),
    };
    return [detection.id, detection];
  }));
}