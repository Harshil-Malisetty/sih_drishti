import type { CitizenReportInput } from '../types/city';

// Routing is determined by category, never by a caller-supplied recipient.
export const reportCategories = {
  pothole: { label: 'Pothole', recipient: 'municipal', destination: 'Municipal · Roads engineering' },
  waterlogging: { label: 'Waterlogging', recipient: 'municipal', destination: 'Municipal · Stormwater' },
  obstruction: { label: 'Road debris / damaged infrastructure', recipient: 'municipal', destination: 'Municipal · Roads engineering' },
  'traffic-obstruction': { label: 'Traffic obstruction / unsafe parking', recipient: 'police', destination: 'Police · Traffic review' },
} as const;

export type ReportRecipient = 'municipal' | 'police';
export const reportRecipient = (category: CitizenReportInput['category']): ReportRecipient => reportCategories[category].recipient;