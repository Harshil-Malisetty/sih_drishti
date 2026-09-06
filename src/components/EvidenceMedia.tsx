import { useState, type ImgHTMLAttributes } from 'react';
import sources from '../../public/evidence/image-sources.json';

const sourceByPath = new Map(sources.map(source => [source.filename, source]));
export const getEvidenceSource = (src: string) => sourceByPath.get(src);
export function evidenceLabel(src: string) {
  const source = sourceByPath.get(src);
  return source ? 'Reference photo' : src.startsWith('data:image/') ? 'Submitted photo' : 'Unverified image';
}

// A failed evidence image must never silently become another event's photograph.
export function EvidenceImage({ src = '', alt, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState('');
  if (!src || failed === src) return <span className="evidence-unavailable" role="status">Evidence image unavailable. Review the record details; no substitute image is shown.</span>;
  return <img src={src} alt={alt} decoding="async" {...props} onError={() => setFailed(src)}/>;
}

export function EvidenceCredit({ src, additionalSources = [], note }: { src: string; additionalSources?: string[]; note?: string }) {
  const credits = [...new Set([src, ...additionalSources])].flatMap(path => {
    const source = sourceByPath.get(path);
    return source ? [source] : [];
  });
  if (!credits.length) return null; // User-uploaded media has no invented attribution.
  return <details className="evidence-credit">
    <summary>Photo credits</summary>
    {note && <p>{note}</p>}
    {credits.map(source => <div key={source.filename}>
      <p><strong>{source.title}</strong> · {source.usedFor}</p>
      <p>Source date: {source.captureDate || 'Not supplied by source'}. Not the demo event time.</p>
      <p>{source.attribution} · <a href={source.licenseUrl} target="_blank" rel="noreferrer">{source.license}</a> · <a href={source.sourceUrl} target="_blank" rel="noreferrer">Source</a></p>
      <p>{source.note}</p>
      <p>{source.modifications}</p>
    </div>)}
    <a href="/evidence/credits.html" target="_blank" rel="noreferrer">All photograph credits</a>
  </details>;
}