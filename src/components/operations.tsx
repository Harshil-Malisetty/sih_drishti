import { useEffect, useRef, useState } from 'react';
import type { EventRef, WorkflowEntry } from '../types/city';
import { selectEventResolution } from '../domain/operations';
import { formatDemoDate } from '../domain/time';
import { workflowService } from '../services';
import { useCityData } from '../services/useCityData';
import { useFeedback, type ActionFeedbackInput } from './ActionFeedback';
import '../styles-operations.css';
import { EvidenceCredit, EvidenceImage, getEvidenceSource } from './EvidenceMedia';

export function useOperation(defaultFeedback: ActionFeedbackInput = 'Action completed.') {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const mounted = useRef(true);
  const { notify } = useFeedback();
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const run = async <T,>(action: () => Promise<T>, feedback: ActionFeedbackInput | ((result: T) => ActionFeedbackInput) = defaultFeedback): Promise<boolean> => {
    if (pending.current || !mounted.current) return false;
    pending.current = true; setBusy(true); setError('');
    try {
      const result = await action();
      const receipt = typeof feedback === 'function' ? feedback(result) : feedback;
      const { message, tone } = typeof receipt === 'string' ? { message: receipt, tone: 'success' as const } : receipt;
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
  return <details className="operation-history"><summary>Full activity log · {items.length} {items.length === 1 ? 'update' : 'updates'}</summary><p className="operation-meta">Every handoff is kept here, including steps saved together.</p><ol>{items.map((item, index) => <li key={`${item.at}-${index}`}><strong>{item.action}</strong><span>{formatDemoDate(item.at)} · {item.actor}</span></li>)}</ol></details>;
}

export function WorkflowProgress({ steps, current, owner, next, complete = false }: { steps: string[]; current: number; owner: string; next: string; complete?: boolean }) {
  return <div className="workflow-guide">
    <ol className="workflow-progress" aria-label="Case progress">{steps.map((step, index) => <li key={step} data-state={index < current || complete ? 'done' : index === current ? 'current' : 'pending'} aria-current={!complete && index === current ? 'step' : undefined}><span aria-hidden="true">{index < current || complete ? '✓' : index + 1}</span><strong>{step}</strong></li>)}</ol>
    <div className="workflow-next"><span>{complete ? 'Completed by' : 'With'} <strong>{owner}</strong></span><p>{next}</p></div>
  </div>;
}

export function ResolutionReview({ event, actor }: { event: EventRef; actor: string }) {
  const { state } = useCityData();
  const { resolution, review } = selectEventResolution(state, event);
  const [note, setNote] = useState('Work and supporting evidence checked.');
  const { busy, error, run } = useOperation();
  if (!resolution || !review) return null;
  const assignment = state.assignments[resolution.assignmentId];
  const reviewer = event.kind === 'anomaly' ? 'Supervisor' : 'Admin';
  const canClose = event.kind === 'municipal' || event.kind === 'anomaly';
  return <section className="resolution-review" aria-label="Completion review">
    <h3>{review.decision === 'Pending' ? `${reviewer} check` : review.decision === 'Returned' ? 'More work requested' : 'Completion approved'}</h3>
    <details className="submission-details" open={review.decision === 'Pending'}><summary>Team’s completion report</summary>
      <p><strong>{resolution.summary}</strong></p><p>{resolution.resultingCondition}</p>
      <p className="operation-meta">Submitted by {resolution.submittedBy} · {assignment && state.teams[assignment.teamId]?.name}<br/>{formatDemoDate(resolution.submittedAt)}</p>
      {resolution.evidence.map(evidence => {
        const reference = Boolean(getEvidenceSource(evidence.image));
        return <figure className="resolution-evidence" key={evidence.id}><EvidenceImage src={evidence.image} alt={reference ? 'Completion reference photo' : evidence.description}/><figcaption>{reference ? 'Reference photos · demo timeline' : evidence.description}<br/>{formatDemoDate(reference ? resolution.submittedAt : evidence.capturedAt)}</figcaption><EvidenceCredit src={evidence.image} note="Reference attachment, not proof of work at this site. The displayed date is the demo submission time, not the source photo date."/></figure>;
      })}
    </details>
    {review.reviewedAt && <p className="operation-meta">{review.reviewer} · {formatDemoDate(review.reviewedAt)}<br/>{review.note}</p>}
    {review.decision === 'Pending' && <div className="operation-form">
      <p className="operation-meta">{canClose ? 'Check the team’s work, then approve and close. Send it back if anything still needs fixing.' : 'Check the team’s work before approving.'} Demo role: {actor}.</p>
      <label>{reviewer} note<textarea value={note} onChange={e => setNote(e.target.value)} disabled={busy} required/></label>
      <div className="operation-actions"><button className="primary" disabled={busy || !note.trim()} onClick={() => run(() => canClose ? workflowService.approveAndClose(review.id, actor, note) : workflowService.reviewResolution(review.id, 'Verified', actor, note), canClose ? 'Work approved. Case closed.' : 'Work approved.')}>{canClose ? 'Approve & close' : 'Approve work'}</button><button className="secondary" disabled={busy || !note.trim()} onClick={() => run(() => workflowService.reviewResolution(review.id, 'Returned', actor, note), { message: 'Sent back to the team for more work.', tone: 'neutral' })}>Send back to team</button></div>
    </div>}
    {error && <p role="alert">{error}</p>}
  </section>;
}