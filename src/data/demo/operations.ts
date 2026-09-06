import { completionEvidenceByKind } from './evidence';
import type { IssueKind } from '../../types/city';

// Operator-editable demo defaults, not inferred repair results.
export const completionEvidence = (kind: IssueKind) => completionEvidenceByKind[kind];
export const issueResolutionDefaults: Record<IssueKind, { summary: string; condition: string }> = {
  obstruction: { summary: 'Obstruction removed and carriageway inspected', condition: 'Carriageway clear of the reported obstruction' },
  pothole: { summary: 'Pothole filled and surface levelled', condition: 'Surface sealed and level' },
  waterlogging: { summary: 'Drain inlet cleared and standing water removed', condition: 'Drainage restored; carriageway clear of standing water' },
  'zebra-crossing': { summary: 'Crossing markings renewed and inspected', condition: 'Crossing markings visible' },
  divider: { summary: 'Displaced divider panels replaced and secured', condition: 'Divider aligned and carriageway clear' },
  signboard: { summary: 'Direction signboard replaced and mounting checked', condition: 'Direction signage installed and legible' },
  guardrail: { summary: 'Damaged rail section replaced and secured', condition: 'Guardrail aligned and secured' },
  'school-crossing': { summary: 'Crossing control restored for the school dismissal window', condition: 'Crossing control in place during the reviewed school window' },
};