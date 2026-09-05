import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Camera, X } from 'lucide-react';
import { citizenService, municipalService } from '../services';
import { useCityData } from '../services/useCityData';
import { formatDemoDate } from '../domain/time';
import type { CitizenReport, CitizenReportInput } from '../types/city';
import { useOperation } from './operations';

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
  const roads = Object.values(state.roadSegments).filter(road => road.planningEnabled);
  const [roadSegmentId, setRoad] = useState(initialRoad || roads[0].id);
  const [category, setCategory] = useState<CitizenReportInput['category']>('pothole');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [reading, setReading] = useState(false);
  const [receipt, setReceipt] = useState<CitizenReport>();
  const { busy, error, run } = useOperation();
  const readId = useRef(0);
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
    } catch { if (id === readId.current) setPhotoError('That image could not be read. Please choose another photo.'); }
    finally { URL.revokeObjectURL(url); if (id === readId.current) setReading(false); }
  };
  return <Modal title="Report a road issue" close={close}>{receipt ? <section className="report-receipt" role="status">
    <h3>Report received · {receipt.id}</h3><p>Awaiting municipal assessment. Your report is not yet a verified road warning.</p>
    <p className="operation-meta">Saved to this demo session's municipal inbox. Reloading clears it; no external delivery occurs.</p><button className="primary full" onClick={close}>Done</button>
  </section> : <form className="operation-form" onSubmit={event => { event.preventDefault(); void run(async () => {
    const report = await citizenService.submitReport({ roadSegmentId, category, description, image }); setReceipt(report);
  }, { message: 'Report sent to the municipal demo inbox.', tone: 'info' }); }}>
    <p>Share a photo and confirm the road. Avoid faces, number plates and personal details. Do not take photos while driving.</p>
    <label className="photo-input"><span><Camera size={18}/> Take or choose a photo</span><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={event => void readPhoto(event.target.files?.[0])} disabled={busy}/></label>
    {reading && <p role="status">Preparing photo…</p>}{photoError && <p role="alert">{photoError}</p>}
    {image && <img className="report-photo" src={image} alt="Your road issue photo preview"/>}
    <label>Road location<select value={roadSegmentId} onChange={event => setRoad(event.target.value)} disabled={busy}>{roads.map(road => <option key={road.id} value={road.id}>{road.name}</option>)}</select></label>
    <small>Confirm the affected corridor; this is not a precise GPS pin.</small>
    <label>Issue type<select value={category} onChange={event => setCategory(event.target.value as CitizenReportInput['category'])} disabled={busy}><option value="pothole">Pothole</option><option value="waterlogging">Waterlogging</option><option value="obstruction">Road obstruction</option></select></label>
    <label>What did you see?<textarea minLength={10} maxLength={1000} required value={description} onChange={event => setDescription(event.target.value)} placeholder="Describe the issue and a nearby landmark" disabled={busy}/></label>
    <p className="operation-meta">Photo metadata is removed. Demo only: no account, upload server or emergency response.</p>
    {error && <p role="alert">{error}</p>}
    <button className="primary full" disabled={busy || reading || !image || description.trim().length < 10}>{busy ? 'Submitting…' : 'Submit report'}</button>
  </form>}</Modal>;
}

export function MunicipalReportInbox({ openIssue }: { openIssue: (id: string) => void }) {
  const { state } = useCityData();
  const reports = Object.values(state.citizenReports);
  const [selectedId, setSelected] = useState<string>();
  const [note, setNote] = useState('');
  const { busy, error, run } = useOperation();
  const selected = reports.find(report => report.id === selectedId);
  if (!reports.length) return null;
  return <section className="citizen-intake" aria-label="Citizen report inbox">
    <h2>Citizen reports <small>{reports.filter(report => report.status === 'Pending').length} awaiting assessment</small></h2>
    <details><summary>Review citizen reports ({reports.length})</summary>{reports.map(report => <button className="report-inbox-row" key={report.id} onClick={() => { setSelected(report.id); setNote(''); }}>
      <span><strong>{report.category === 'pothole' ? 'Pothole' : report.category === 'waterlogging' ? 'Waterlogging' : 'Road obstruction'}</strong><small>{state.roadSegments[report.roadSegmentId].name} · {report.id}</small></span><span>{report.status === 'Pending' ? 'Requires assessment' : report.status}</span>
    </button>)}</details>
    {selected && <Modal title={`Citizen report · ${selected.id}`} close={() => setSelected(undefined)}>
      <img className="report-photo" src={selected.image} alt="Citizen-submitted road evidence"/>
      <p><strong>{state.roadSegments[selected.roadSegmentId].name}</strong></p><p>{selected.description}</p>
      <p className="operation-meta">Citizen-submitted · {formatDemoDate(selected.submittedAt)} · {selected.status}<br/>Corridor location selected by reporter; requires field assessment.</p>
      {selected.status === 'Pending' ? <div className="operation-form"><label>Triage note<textarea value={note} onChange={event => setNote(event.target.value)} maxLength={1000} disabled={busy}/></label>
        <div className="operation-actions"><button className="primary" disabled={busy || !note.trim()} onClick={() => run(() => municipalService.reviewCitizenReport(selected.id, 'Accepted', note), { message: 'Report accepted. Road issue created for assessment.', tone: 'info' })}>Accept for assessment</button>
        <button className="secondary" disabled={busy || !note.trim()} onClick={() => run(() => municipalService.reviewCitizenReport(selected.id, 'Dismissed', note), { message: 'Citizen report dismissed.', tone: 'neutral' })}>Dismiss report</button></div></div> : <p>{selected.reviewNote}</p>}
      {selected.issueId && <button className="primary full" onClick={() => { setSelected(undefined); openIssue(selected.issueId!); }}>Open linked road issue</button>}{error && <p role="alert">{error}</p>}
    </Modal>}
  </section>;
}