import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCheck, ChevronLeft, ChevronRight, Eye, Pause, Play, ScanLine } from 'lucide-react';
import type { CityState, EventRef } from '../types/city';
import type { DetectionCategory, DetectionDecision, DetectionFrame, DetectionReview, EdgeDetection, FrameVerdict, ReviewRole } from '../types/detectionReview';
import type { Severity } from '../types';
import { detectionLabels, detectionScore, detectionStatus, latestDetectionReview, reviewCategories, selectDetectionQueue, type ReviewFilter, type ReviewSort } from '../domain/detectionReview';
import type { PoliceJurisdictionId } from '../domain/policeJurisdictions';
import { formatDemoDate } from '../domain/time';
import { detectionReviewService } from '../services';
import { useCityData } from '../services/useCityData';
import { EvidenceCredit, EvidenceImage, getEvidenceSource } from './EvidenceMedia';
import { FilterBar, PageIntro, SeverityBadge } from './ui';
import { useOperation } from './operations';
import '../styles-review.css';

const percent = (value: number | null) => value === null ? 'Not supplied' : `${Math.round(value * 100)}%`;
const frameScore = (frame: DetectionFrame) => frame.boxes.length ? Math.max(...frame.boxes.map(box => box.confidence)) : null;

export function AIReviewWorkbench({ role, scope = 'all', openRecord }: {
  role: ReviewRole; scope?: PoliceJurisdictionId; openRecord: (event: EventRef) => void;
}) {
  const { state } = useCityData();
  const [status, setStatus] = useState<ReviewFilter>('Pending');
  const [category, setCategory] = useState('all');
  const [confidence, setConfidence] = useState<'all' | 'low' | 'high'>('all');
  const [sort, setSort] = useState<ReviewSort>('Priority');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('');
  const [advance, setAdvance] = useState(true);
  const [receipt, setReceipt] = useState<DetectionReview>();
  const [focusVersion, setFocusVersion] = useState(0);
  const queue = selectDetectionQueue(state, role, scope, { status, category, confidence, sort, search });
  const all = selectDetectionQueue(state, role, scope);
  const active = queue.find(item => item.id === selected) || queue[0];
  const pending = all.filter(item => detectionStatus(state, item.id) === 'Pending').length;
  const held = all.filter(item => detectionStatus(state, item.id) === 'Needs verification').length;
  const reviewed = all.length - pending - held;
  const choose = (id: string) => { setSelected(id); setFocusVersion(value => value + 1); };
  const saved = (review: DetectionReview) => {
    setReceipt(review);
    if (advance) {
      const index = queue.findIndex(item => item.id === review.detectionId);
      const remaining = [...queue.slice(index + 1), ...queue.slice(0, index)].filter(item => detectionStatus(state, item.id) === 'Pending');
      setStatus('Pending'); choose(remaining[0]?.id || '');
    } else {
      setStatus(review.decision === 'Needs verification' ? 'Needs verification' : 'Reviewed');
      choose(review.detectionId);
    }
  };
  return <div className="page ai-review">
    <PageIntro eyebrow="HUMAN IN THE LOOP" title="AI review" text="Inspect the evidence. Check the prediction. Decide what moves forward."/>
    <div className="review-summary" aria-label="Review queue summary">
      <span><strong>{pending}</strong> pending</span><span><strong>{held}</strong> need verification</span><span><strong>{reviewed}</strong> reviewed</span>
      <span className="review-demo"><ScanLine size={15}/> Simulated edge feed</span>
    </div>
    <p className="review-disclosure">Reference photos with illustrative YOLO boxes and scores. OpenCV / YOLO are not running here. Frames are supplied references, not consecutive video captures. Decisions last for this demo session.</p>
    {receipt && <div className="review-receipt" role="status"><CheckCheck size={18}/><span><strong>{receipt.detectionId} · {receipt.decision}</strong> {receipt.event ? 'Case created. No team dispatched.' : receipt.decision === 'Rejected' ? 'Retained in history. No case created.' : 'Held for verification. No field request has been sent.'}</span>{receipt.event && <button onClick={() => openRecord(receipt.event!)}>Open case <ArrowRight size={15}/></button>}</div>}
    <div className="review-filters">
      <FilterBar label="Review status" items={['Pending', 'Needs verification', 'Reviewed', 'All']} active={status} onChange={value => setStatus(value as ReviewFilter)}/>
      <div className="review-filter-fields">
        <label>Search<input type="search" placeholder="Location, ID or source bus" value={search} onChange={event => setSearch(event.target.value)}/></label>
        <label>Category<select value={category} onChange={event => setCategory(event.target.value)}><option value="all">All categories</option>{reviewCategories[role].map(value => <option key={value} value={value}>{detectionLabels[value]}</option>)}</select></label>
        <label>Peak demo confidence<select value={confidence} onChange={event => setConfidence(event.target.value as typeof confidence)}><option value="all">All scores</option><option value="low">Below 80%</option><option value="high">80% and above</option></select></label>
        <label>Sort candidates<select value={sort} onChange={event => setSort(event.target.value as ReviewSort)}>{['Priority', 'Oldest first', 'Newest first', 'Lowest confidence'].map(value => <option key={value}>{value}</option>)}</select></label>
      </div>
    </div>
    <div className="review-workspace">
      <aside className="review-queue" aria-label="Detection queue">
        <div className="review-queue-heading"><h2>Candidates</h2><span>{queue.length} shown</span></div>
        {queue.map(item => <button key={item.id} className="review-candidate" aria-pressed={item.id === active?.id} onClick={() => choose(item.id)}>
          <div><span>{item.id}</span><SeverityBadge value={item.severity}/></div>
          <strong>{detectionLabels[item.category]}</strong><span>{state.roadSegments[item.roadSegmentId]?.name}</span>
          <div className="review-candidate-meta"><span>{item.frames.length} {item.frames.length === 1 ? 'frame' : 'frames'} · {percent(detectionScore(item))} peak</span><span>{formatDemoDate(item.receivedAt)}</span></div>
          <small>{detectionStatus(state, item.id)}</small>
        </button>)}
        {!queue.length && <p className="review-empty">No candidates in this view.</p>}
      </aside>
      {active ? <CandidateReview key={`${active.id}-${latestDetectionReview(state, active.id)?.id || 'new'}`} state={state} detection={active} scope={scope} onSaved={saved} advance={advance} setAdvance={setAdvance} openRecord={openRecord} focusVersion={focusVersion}/>
        : <section className="review-complete"><CheckCheck size={32}/><h2>{pending === 0 && status === 'Pending' ? 'Pending queue complete' : 'No matching candidates'}</h2><p>{held ? `${held} candidate(s) still need verification. Held items are not approved.` : 'Change the filters or inspect the review history.'}</p><button className="secondary" onClick={() => { setStatus(held ? 'Needs verification' : 'All'); setCategory('all'); setConfidence('all'); setSearch(''); }}>View {held ? 'verification queue' : 'all candidates'}</button></section>}
    </div>
  </div>;
}

function CandidateReview({ state, detection, scope, onSaved, advance, setAdvance, openRecord, focusVersion }: {
  state: CityState; detection: EdgeDetection; scope: PoliceJurisdictionId; onSaved: (review: DetectionReview) => void;
  advance: boolean; setAdvance: (value: boolean) => void; openRecord: (event: EventRef) => void; focusVersion: number;
}) {
  const previous = latestDetectionReview(state, detection.id);
  const final = Boolean(previous && previous.decision !== 'Needs verification');
  const [frameId, setFrameId] = useState(detection.frames[0]?.id || '');
  const [frameOrder, setFrameOrder] = useState('Supplied order');
  const [playing, setPlaying] = useState(false);
  const [intervalSeconds, setIntervalSeconds] = useState(3);
  const [annotated, setAnnotated] = useState(true);
  const [verdicts, setVerdicts] = useState<Record<string, FrameVerdict>>(() => Object.fromEntries((previous?.frames || []).map(frame => [frame.frameId, frame.verdict])));
  const [category, setCategory] = useState<DetectionCategory>(previous?.category || detection.category);
  const [severity, setSeverity] = useState<Severity>(previous?.severity || detection.severity);
  const [note, setNote] = useState('');
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [unavailable, setUnavailable] = useState<Record<string, boolean>>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(true);
  const { busy, error, run } = useOperation();
  const frames = [...detection.frames].sort((a, b) => frameOrder === 'Lowest confidence' ? (frameScore(a) ?? 2) - (frameScore(b) ?? 2) || a.id.localeCompare(b.id) : 0);
  const frame = frames.find(item => item.id === frameId) || frames[0];
  const index = frames.findIndex(item => item.id === frame?.id);
  const changed = category !== detection.category || severity !== detection.severity;
  const assessed = detection.frames.filter(item => verdicts[item.id]).length;
  const supporting = Object.values(verdicts).includes('Supports');
  const ready = !final && !busy && Boolean(note.trim());
  const canConfirm = ready && frames.length > 0 && assessed === frames.length && supporting;
  const actor = detection.role === 'municipal' ? 'Municipal reviewer (demo)' : 'Police reviewer (demo)';
  const history = Object.values(state.detectionReviews).filter(review => review.detectionId === detection.id);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (focusVersion) heading.current?.focus({ preventScroll: true }); }, [focusVersion]);
  useEffect(() => {
    if (!playing || frames.length < 2 || busy) return;
    const timer = window.setInterval(() => setFrameId(current => frames[(frames.findIndex(item => item.id === current) + 1) % frames.length].id), intervalSeconds * 1000);
    const pauseHidden = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', pauseHidden);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', pauseHidden); };
  }, [playing, intervalSeconds, frameOrder, detection.id, busy]);
  const step = (delta: number) => { setPlaying(false); setFrameId(frames[(index + delta + frames.length) % frames.length].id); };
  const assess = (verdict: FrameVerdict) => {
    setPlaying(false);
    setVerdicts(current => ({ ...current, [frame.id]: verdict }));
    const next = [...frames.slice(index + 1), ...frames.slice(0, index)].find(item => !verdicts[item.id]);
    if (next) setFrameId(next.id);
  };
  const decide = async (decision: DetectionDecision) => {
    setPlaying(false);
    let result: DetectionReview | undefined;
    const success = await run(async () => {
      result = await detectionReviewService.review({
        detectionId: detection.id, expectedRevision: detection.revision, expectedReviewId: previous?.id || null,
        role: detection.role, jurisdictionId: scope, reviewer: actor, decision, note,
        category: decision === 'Corrected' ? category : detection.category,
        severity: decision === 'Corrected' ? severity : detection.severity,
        frames: detection.frames.filter(item => verdicts[item.id]).map(item => ({ frameId: item.id, verdict: verdicts[item.id] })),
      });
    }, `${detection.id}: ${decision.toLowerCase()}. Review saved.`);
    // onSaved belongs to the parent, which remains mounted after the final decision.
    if (success && result) onSaved(result);
  };
  return <section className="review-detail" aria-label="Candidate review">
    <header className="review-detail-heading"><div><span>{detection.id} · {detection.busId}</span><h2 ref={heading} tabIndex={-1}>{detectionLabels[detection.category]}</h2><p>{state.roadSegments[detection.roadSegmentId]?.name}</p></div><SeverityBadge value={detection.severity}/></header>
    <div className="review-detail-body">
      <div className="review-evidence">
        <div className="review-viewer-toolbar"><span><ScanLine size={16}/> Evidence inspection</span><button aria-pressed={annotated} onClick={() => setAnnotated(value => !value)}><Eye size={16}/>{annotated ? 'Show raw image' : 'Show annotations'}</button></div>
        {frame ? <>
          <div className="review-canvas" tabIndex={0} aria-label="Frame viewer. Use left and right arrows to change frames." onKeyDown={event => {
            if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && event.target === event.currentTarget && frames.length > 1) { event.preventDefault(); step(event.key === 'ArrowLeft' ? -1 : 1); }
          }}>
            <AnnotatedFrame key={frame.id} frame={frame} annotated={annotated} onReady={ok => {
              if (!mounted.current) return;
              setLoaded(current => ({ ...current, [frame.id]: ok }));
              setUnavailable(current => ({ ...current, [frame.id]: !ok }));
              if (!ok) setPlaying(false);
            }}/>
            <div className="review-canvas-caption"><span>REFERENCE IMAGE · {annotated ? 'DEMO OVERLAY' : 'RAW VIEW'}</span><span>{index + 1} / {frames.length}</span></div>
          </div>
          <div className="review-playback" aria-label="Frame playback">
            <button aria-label="Previous frame" disabled={frames.length < 2} onClick={() => step(-1)}><ChevronLeft size={18}/></button>
            <button aria-label={playing ? 'Pause frame playback' : 'Play frames'} aria-pressed={playing} disabled={frames.length < 2} onClick={() => setPlaying(value => !value)}>{playing ? <Pause size={17}/> : <Play size={17}/>} {playing ? 'Pause' : 'Play'}</button>
            <button aria-label="Next frame" disabled={frames.length < 2} onClick={() => step(1)}><ChevronRight size={18}/></button>
            <label>Interval<select aria-label="Frame interval" value={intervalSeconds} onChange={event => setIntervalSeconds(Number(event.target.value))}><option value={2}>2 sec</option><option value={3}>3 sec</option><option value={5}>5 sec</option></select></label>
            <label>Frame order<select value={frameOrder} onChange={event => { setPlaying(false); setFrameOrder(event.target.value); }}><option>Supplied order</option><option>Lowest confidence</option></select></label>
          </div>
          <div className="review-filmstrip" aria-label="Supplied frames">{frames.map((item, itemIndex) => <button key={item.id} aria-label={`Frame ${itemIndex + 1}, ${percent(frameScore(item))}${verdicts[item.id] ? `, ${verdicts[item.id]}` : ''}`} aria-pressed={item.id === frame.id} onClick={() => { setPlaying(false); setFrameId(item.id); }}><EvidenceImage src={item.image} alt=""/><span>{itemIndex + 1} · {percent(frameScore(item))}{verdicts[item.id] && <Check size={13}/>}</span></button>)}</div>
          <div className="review-frame-meta"><strong>{frame.label}</strong><span>{frame.quality}</span>{verdicts[frame.id] && <span>Human frame assessment: <strong>{verdicts[frame.id]}</strong></span>}<EvidenceCredit src={frame.image}/></div>
          <div className="review-output"><h3>YOLO output <span>Illustrative</span></h3>{frame.boxes.length ? frame.boxes.map(box => <div key={box.id}><span>{box.label}</span><meter aria-label={`${box.label} demo confidence`} min={0} max={1} value={box.confidence}/><strong>{percent(box.confidence)}</strong></div>) : <p>No object proposals supplied.</p>}<p>Object confidence is not event certainty, calibrated accuracy, or proof of fault.</p></div>
          {!final && <fieldset className="review-frame-assessment" disabled={busy}>
            <legend>Does this frame support your assessment?</legend>
            <div>{(['Supports', 'Unclear', 'False positive'] as FrameVerdict[]).map(verdict => <button type="button" key={verdict} aria-pressed={verdicts[frame.id] === verdict} disabled={verdict !== 'Unclear' && !loaded[frame.id]} onClick={() => assess(verdict)}>{verdict}</button>)}</div>
            <p>{assessed} / {frames.length} frames assessed · Selecting an assessment advances to the next unassessed frame.</p>
            {unavailable[frame.id] && <p role="status">Image unavailable: mark Unclear or request verification. It cannot support confirmation.</p>}
          </fieldset>}
        </> : <p className="review-empty">No frames supplied. Request verification rather than confirming.</p>}
        <details className="review-pipeline"><summary>Processing & source details</summary><p>{detection.modelVersion} · payload revision {detection.revision}</p><ol>{detection.processing.map(stage => <li key={stage}>{stage}</li>)}</ol><p>Pipeline preview only; all boxes and scores are hand-authored fixtures. Unique original-photo sources are shown once. No missing frames are invented.</p><p>Demo intake: {formatDemoDate(detection.receivedAt)}. This is not the photograph’s capture time.</p>{frame && <p>Photo capture date: {getEvidenceSource(frame.image)?.captureDate || 'Not supplied'}. Original source and licence are in Photo credits.</p>}</details>
      </div>
      <aside className="review-decision" aria-label="Human decision">
        <span className="review-step">HUMAN DECISION</span><h3>{final ? 'Review recorded' : 'Your assessment'}</h3>
        <p className="review-proposal">Original proposal <strong>{detectionLabels[detection.category]} · {detection.severity}</strong></p>
        {final ? <><div className="review-final"><CheckCheck size={22}/><strong>{previous?.decision}</strong><span>{detectionLabels[previous!.category]} · {previous?.severity}</span></div>{previous?.event && <button className="primary" onClick={() => openRecord(previous.event!)}>Open operational case <ArrowRight size={16}/></button>}<p>Final decisions are locked. Original predictions are retained.</p></> : <fieldset disabled={busy}>
          <label>Category<select value={category} onChange={event => { setPlaying(false); setCategory(event.target.value as DetectionCategory); }}>{reviewCategories[detection.role].map(value => <option key={value} value={value}>{detectionLabels[value]}</option>)}</select></label>
          <label>Severity<select value={severity} onChange={event => { setPlaying(false); setSeverity(event.target.value as Severity); }}>{['Critical', 'High', 'Medium', 'Low'].map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Decision reason <span>Required</span><textarea value={note} maxLength={1000} rows={4} placeholder="What do the frames show? Explain confirmation, correction, rejection, or the evidence needed." onFocus={() => setPlaying(false)} onChange={event => setNote(event.target.value)}/></label>
          <p className="review-reviewer">{actor} · not an authenticated identity</p>
          <div className="review-effect"><strong>After confirmation</strong><p>{detection.role === 'municipal' ? 'Create a qualified issue for assignment. A reviewed condition becomes visible to Citizens.' : 'Create an incident for officer assessment. A confirmed road obstruction can appear in Citizen conditions.'} No automatic dispatch, enforcement, or identity verification.</p></div>
          {!canConfirm && <p className="review-requirements">To confirm: assess all {frames.length} frames, mark at least one as supporting your assessment, and provide a reason.</p>}
          <button className="primary" disabled={!canConfirm} onClick={() => void decide(changed ? 'Corrected' : 'Confirmed')}><Check size={17}/>{busy ? 'Saving…' : changed ? 'Correct & confirm' : 'Confirm candidate'}</button>
          <button className="secondary" disabled={!ready} onClick={() => void decide('Needs verification')}>Request verification</button>
          <button className="review-reject" disabled={!ready} onClick={() => void decide('Rejected')}>Reject candidate</button>
          <p>Reject and request verification preserve the original proposal; unsaved category/severity edits are not applied.</p>
          <label className="review-auto"><input type="checkbox" checked={advance} onChange={event => setAdvance(event.target.checked)}/> Next pending candidate after saving</label>
        </fieldset>}
        {error && <p className="review-error" role="alert">{error}</p>}
        {history.length > 0 && <div className="review-audit"><h3>Decision history</h3>{history.map(review => <article key={review.id}><strong>{review.decision}</strong><span>{formatDemoDate(review.reviewedAt)} · {review.reviewer}</span><p>{review.note}</p><small>{review.frames.length} frame assessments · revision {review.expectedRevision}</small>{review.decision === 'Corrected' && <p>{detectionLabels[detection.category]} / {detection.severity} → {detectionLabels[review.category]} / {review.severity}</p>}</article>)}<p>Feedback retained for offline evaluation. These actions do not retrain a model.</p></div>}
      </aside>
    </div>
    <a className="review-back-top" href="#root"><ArrowLeft size={14}/> Back to top</a>
  </section>;
}

export function AnnotatedFrame({ frame, annotated, onReady }: { frame: DetectionFrame; annotated: boolean; onReady: (loaded: boolean) => void }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  if (failed || !frame.image) return <div className="review-image-error" role="status">Evidence image unavailable. No substitute is shown.</div>;
  return <div className="review-image-plane"><img src={frame.image} alt={`${frame.label}. Reference photo with ${annotated ? 'illustrative detection overlays' : 'no overlays'}.`} onLoad={() => { setLoaded(true); onReady(true); }} onError={() => { setFailed(true); setLoaded(false); onReady(false); }}/>{loaded && annotated && frame.boxes.map(box => <span className="review-box" key={box.id} aria-hidden="true" style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.width * 100}%`, height: `${box.height * 100}%` }}><span>{box.label} {percent(box.confidence)}</span></span>)}</div>;
}