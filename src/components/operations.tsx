import { useEffect, useRef, useState } from 'react';
import type { EventRef, WorkflowEntry } from '../types/city';
import { selectEventResolution } from '../domain/operations';
import { formatDemoDate } from '../domain/time';
import { workflowService } from '../services';
import { useCityData } from '../services/useCityData';
import { useFeedback, type ActionFeedbackInput } from './ActionFeedback';
import '../styles-operations.css';

export function useOperation(defaultFeedback: ActionFeedbackInput = 'Action completed.') {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const mounted = useRef(true);
  const { notify } = useFeedback();
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const run = async (action: () => Promise<unknown>, feedback: ActionFeedbackInput = defaultFeedback): Promise<boolean> => {
    if (pending.current || !mounted.current) return false;
    pending.current = true; setBusy(true); setError('');
    try {
      await action();
      const { message, tone } = typeof feedback === 'string' ? { message: feedback, tone: 'success' as const } : feedback;
      notify(message, tone);
      return true;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to complete the action. Please retry.';
      if (mounted.current) setError(message);
      notify(message, 'error');
      return false;
    } finally { pending.current = false; if (mounted.current) setBusy(false); }
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
      <div className="operation-actions"><button className="primary" disabled={busy || !note.trim()} onClick={() => run(() => workflowService.reviewResolution(review.id, 'Verified', actor, note), 'Resolution verified.')}>Verify resolution</button><button className="secondary" disabled={busy || !note.trim()} onClick={() => run(() => workflowService.reviewResolution(review.id, 'Returned', actor, note), { message: 'Resolution returned for field action.', tone: 'neutral' })}>Return for action</button></div>
    </div>}
    {error && <p role="alert">{error}</p>}
  </section>;
}