import { useRef, useState } from 'react';
import type { EventRef, WorkflowEntry } from '../types/city';
import { selectEventResolution } from '../domain/operations';
import { formatDemoDate } from '../domain/time';
import { workflowService } from '../services';
import { useCityData } from '../services/useCityData';
import '../styles-operations.css';

export function useOperation() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const run = async (action: () => Promise<unknown>) => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try { await action(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to complete the action. Please retry.'); }
    finally { pending.current = false; setBusy(false); }
  };
  return { busy, error, run };
}

export function WorkflowHistory({ items }: { items: WorkflowEntry[] }) {
  return <details className="operation-history"><summary>Action history ({items.length})</summary><ol>{items.map((item, index) => <li key={`${item.at}-${index}`}><strong>{item.action}</strong><span>{formatDemoDate(item.at)} · {item.actor}</span></li>)}</ol></details>;
}

export function ResolutionReview({ event, actor }: { event: EventRef; actor: string }) {
  const { state } = useCityData();
  const { resolution, review } = selectEventResolution(state, event);
  const [note, setNote] = useState('Evidence reviewed against the field submission');
  const { busy, error, run } = useOperation();
  if (!resolution || !review) return null;
  const assignment = state.assignments[resolution.assignmentId];
  return <section className="resolution-review" aria-label="Field resolution and admin review">
    <h3>Field resolution</h3>
    <p><strong>{resolution.summary}</strong></p>
    <p>{resolution.resultingCondition}</p>
    <p className="operation-meta">Resolved by {resolution.submittedBy} · {assignment && state.teams[assignment.teamId]?.name}<br/>{formatDemoDate(resolution.submittedAt)}</p>
    {resolution.evidence.map(evidence => <figure className="resolution-evidence" key={evidence.id}><img src={evidence.image} alt={evidence.description}/><figcaption>{evidence.description}<br/>{formatDemoDate(evidence.capturedAt)}</figcaption></figure>)}
    <p role="status"><strong>{review.decision === 'Pending' ? 'Awaiting admin verification — not closed' : review.decision === 'Returned' ? 'Returned for field action' : 'Admin verification complete'}</strong></p>
    {review.reviewedAt && <p className="operation-meta">{review.reviewer} · {formatDemoDate(review.reviewedAt)}<br/>{review.note}</p>}
    {review.decision === 'Pending' && <div className="operation-form">
      <label>Admin review note<textarea value={note} onChange={e => setNote(e.target.value)} disabled={busy}/></label>
      <div className="operation-actions"><button className="primary" disabled={busy || !note.trim()} onClick={() => run(() => workflowService.reviewResolution(review.id, 'Verified', actor, note))}>Verify resolution</button><button className="secondary" disabled={busy || !note.trim()} onClick={() => run(() => workflowService.reviewResolution(review.id, 'Returned', actor, note))}>Return for action</button></div>
    </div>}
    {error && <p role="alert">{error}</p>}
  </section>;
}