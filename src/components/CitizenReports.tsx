import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Camera, X } from 'lucide-react';
import { citizenService, incidentsService, municipalService } from '../services';
import { useCityData } from '../services/useCityData';
import { formatDemoDate } from '../domain/time';
import type { CitizenReport, CitizenReportInput } from '../types/city';
import { useOperation } from './operations';
import { reportCategories, reportRecipient, type ReportRecipient } from '../domain/citizenReports';
import { EvidenceImage } from './EvidenceMedia';
import { EventThumbnail } from './EventThumbnail';

export function Modal({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef(document.activeElement);
  useEffect(() => {
    ref.current?.showModal();
    return () => { ref.current?.close(); if (opener.current instanceof HTMLElement && opener.current.isConnected) opener.current.focus(); };
  }, []);
  return <dialog ref={ref} className="product-dialog" aria-label={title} onCancel={event => { event.preventDefault(); close(); }} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); } }}>
    <div className="dialog-heading"><h2>{title}</h2><button type="button" className="icon-btn" aria-label="Close dialog" onClick={close}><X/></button></div>{children}
  </dialog>;
}

export function CitizenReportForm({ close, initialRoad }: { close: () => void; initialRoad?: string }) {
  const { state } = useCityData();
  const roads = Object.values(state.roadSegments).filter(road => road.points.length > 0);
  const [roadSegmentId, setRoad] = useState(roads.some(road => road.id === initialRoad) ? initialRoad! : '');
  const [category, setCategory] = useState<CitizenReportInput['category']>('pothole');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [reading, setReading] = useState(false);
  const [receipt, setReceipt] = useState<CitizenReport>();
  const { busy, error, run } = useOperation();
  const readId = useRef(0);
  const photoInput = useRef<HTMLInputElement>(null);
  useEffect(() => () => { readId.current++; }, []);
  const readPhoto = async (file?: File) => {
    const id = ++readId.current;
    setImage(''); setPhotoError('');
    if (!file) { setReading(false); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setPhotoError('Choose a JPEG, PNG or WebP photo under 10 MB.'); setReading(false); return;
    }
    setReading(true);
    const url = URL.createObjectURL(file);
    try {
      const photo = new Image(); photo.src = url; await photo.decode();
      const scale = Math.min(1, 1280 / Math.max(photo.width, photo.height));
      const canvas = document.createElement('canvas'); canvas.width = Math.round(photo.width * scale); canvas.height = Math.round(photo.height * scale);
      const context = canvas.getContext('2d'); if (!context) throw new Error('Image processing unavailable');
      context.drawImage(photo, 0, 0, canvas.width, canvas.height);
      // Decode/re-encode to validate pixels, bound memory, and discard location/EXIF metadata.
      const result = canvas.toDataURL('image/jpeg', .82);
      if (result.length > 2_800_000) throw new Error('Image too large');
      if (id === readId.current) setImage(result);
    } catch { if (id === readId.current) setPhotoError('That image could not be read. Choose another photo or submit without it.'); }
    finally { URL.revokeObjectURL(url); if (id === readId.current) setReading(false); }
  };
  return <Modal title={receipt ? 'Report submitted' : 'Report a road issue'} close={close}>{receipt ? <ReportReceipt report={receipt} roadName={state.roadSegments[receipt.roadSegmentId].name} close={close}/> : <form className="operation-form" onSubmit={event => { event.preventDefault(); void run(async () => {
    const report = await citizenService.submitReport({ roadSegmentId, category, description, image }); setReceipt(report);
  }, { message: `Report sent to the ${reportRecipient(category)} demo inbox.`, tone: 'info' }); }}>
    <p>Confirm the road and describe the issue. A photo is optional. Avoid personal details and do not report while driving.</p>
    <label>Road location<select required value={roadSegmentId} onChange={event => setRoad(event.target.value)} disabled={busy}><option value="">Choose the affected road</option>{roads.map(road => <option key={road.id} value={road.id}>{road.name}</option>)}</select></label>
    <small>Confirm the affected corridor; this is not a precise GPS pin.</small>
    <label>Issue type<select value={category} onChange={event => setCategory(event.target.value as CitizenReportInput['category'])} disabled={busy}>{(Object.keys(reportCategories) as CitizenReportInput['category'][]).map(value => <option value={value} key={value}>{reportCategories[value].label}</option>)}</select></label>
    <p className="report-destination">Sent to {reportCategories[category].destination}</p>
    <label>What did you see?<textarea minLength={10} maxLength={1000} required aria-describedby="report-description-help" value={description} onChange={event => setDescription(event.target.value)} placeholder="Describe the issue and a nearby landmark" disabled={busy}/></label>
    <small id="report-description-help">10–1000 characters. Include a nearby landmark.</small>
    <label className="photo-input"><span><Camera size={18}/> Photo (optional)</span><input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={event => void readPhoto(event.target.files?.[0])} disabled={busy}/></label>
    {reading && <p role="status">Preparing photo…</p>}{photoError && <p role="alert">{photoError}</p>}
    {image && <EvidenceImage className="report-photo" src={image} alt="Your road issue photo preview"/>}
    {(image || photoError || reading) && <button type="button" className="secondary" disabled={busy} onClick={() => { void readPhoto(); if (photoInput.current) photoInput.current.value = ''; }}>Remove photo</button>}
    <p className="operation-meta">Photo metadata is removed. Demo only: no account, upload server or emergency response.</p>
    {error && <p role="alert">{error}</p>}
    <button type="submit" className="primary full" disabled={busy || reading || !roads.length}>{busy ? 'Submitting…' : 'Submit report'}</button>
  </form>}</Modal>;
}

function ReportReceipt({ report, roadName, close }: { report: CitizenReport; roadName: string; close: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); heading.current?.closest('dialog')?.scrollTo(0, 0); }, []);
  return <section className="report-receipt">
    <h3 ref={heading} tabIndex={-1}>Report received · {report.id}</h3>
    <p className="operation-meta">Submitted <time dateTime={report.submittedAt}>{formatDemoDate(report.submittedAt)}</time></p>
    <p>Saved to the shared demo inbox. Awaiting {reportRecipient(report.category)} assessment; not yet a verified road warning.</p>
    <dl><div><dt>Issue</dt><dd>{reportCategories[report.category].label}</dd></div><div><dt>Road</dt><dd>{roadName}</dd></div><div><dt>Sent to</dt><dd>{reportCategories[report.category].destination}</dd></div><div><dt>Photo</dt><dd>{report.image ? 'Attached' : 'Not attached'}</dd></div></dl>
    <p className="operation-meta">Switch workspaces using Log out to review this exact report. Reloading clears demo data; no external delivery occurs.</p>
    <button type="button" className="primary full" onClick={close}>Done</button>
  </section>;
}

export function MunicipalReportInbox({ openIssue }: { openIssue: (id: string) => void }) {
  return <CitizenReportInbox recipient="municipal" openRecord={openIssue}/>;
}

export function CitizenReportInbox({ recipient, openRecord }: { recipient: ReportRecipient; openRecord: (id: string) => void }) {
  const { state } = useCityData();
  const reports = Object.values(state.citizenReports).filter(report => reportRecipient(report.category) === recipient).reverse();
  const [selectedId, setSelected] = useState<string>();
  const [note, setNote] = useState('');
  const { busy, error, run } = useOperation();
  const selected = reports.find(report => report.id === selectedId);
  const service = recipient === 'municipal' ? municipalService : incidentsService;
  const recordId = selected?.issueId || selected?.incidentId;
  if (!reports.length) return null;
  return <section className="citizen-intake" aria-label="Citizen report inbox">
    <h2>Citizen reports <small>{reports.filter(report => report.status === 'Pending').length} awaiting assessment</small></h2>
    <details open><summary>Review citizen reports ({reports.length})</summary>{reports.map(report => <button className="report-inbox-row event-scene-row" key={report.id} onClick={() => { setSelected(report.id); setNote(''); }}>
      <EventThumbnail category={report.category === 'traffic-obstruction' ? 'traffic' : report.category}/>
      <span className="event-copy"><strong>{reportCategories[report.category].label}</strong><small>{state.roadSegments[report.roadSegmentId].name} · {report.id}</small><small>Submitted <time dateTime={report.submittedAt}>{formatDemoDate(report.submittedAt)}</time></small></span><span>{report.status === 'Pending' ? 'Requires assessment' : report.status}</span>
    </button>)}</details>
    {selected && <Modal title={`Citizen report · ${selected.id}`} close={() => setSelected(undefined)}>
      {selected.image ? <EvidenceImage className="report-photo" src={selected.image} alt="Citizen-submitted road evidence"/> : <p className="operation-meta">No photo attached. Assess the report description and corridor on site.</p>}
      <p><strong>{state.roadSegments[selected.roadSegmentId].name}</strong></p><p>{selected.description}</p>
      <p className="operation-meta">Citizen-submitted · {formatDemoDate(selected.submittedAt)} · {selected.status}<br/>Corridor location selected by reporter; requires field assessment.</p>
      {selected.status === 'Pending' ? <div className="operation-form"><label>Triage note<textarea value={note} onChange={event => setNote(event.target.value)} maxLength={1000} disabled={busy}/></label>
        <div className="operation-actions"><button className="primary" disabled={busy || !note.trim()} onClick={() => run(() => service.reviewCitizenReport(selected.id, 'Accepted', note), { message: `Report accepted. ${recipient === 'municipal' ? 'Road issue' : 'Police incident'} created for assessment.`, tone: 'info' })}>Accept for assessment</button>
        <button className="secondary" disabled={busy || !note.trim()} onClick={() => run(() => service.reviewCitizenReport(selected.id, 'Dismissed', note), { message: 'Citizen report dismissed.', tone: 'neutral' })}>Dismiss report</button></div></div> : <p>{selected.reviewNote}</p>}
      {recordId && <button className="primary full" onClick={() => { setSelected(undefined); openRecord(recordId); }}>{recipient === 'municipal' ? 'Open linked road issue' : 'Open linked police incident'}</button>}{error && <p role="alert">{error}</p>}
    </Modal>}
  </section>;
}