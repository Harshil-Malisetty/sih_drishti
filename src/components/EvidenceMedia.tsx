import { useState, type ImgHTMLAttributes } from 'react';
import sources from '../../public/evidence/image-sources.json';

const sourceByPath = new Map(sources.map(source => [source.filename, source]));
export function evidenceLabel(src: string) {
  const source = sourceByPath.get(src);
  return source?.kind === 'synthetic' ? 'Synthetic demo scene' : source ? 'Illustrative photo' : 'Submitted photo';
}

// A failed evidence image must never silently become another event's photograph.
export function EvidenceImage({ src = '', alt, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState('');
  if (!src || failed === src) return <span className="evidence-unavailable" role="status">Evidence image unavailable. Review the record details; no substitute image is shown.</span>;
  return <img src={src} alt={alt} decoding="async" {...props} onError={() => setFailed(src)}/>;
}

export function EvidenceCredit({ src }: { src: string }) {
  const source = sourceByPath.get(src);
  if (!source) return null; // User-uploaded media has no invented attribution.
  return <details className="evidence-credit">
    <summary>{evidenceLabel(src)} · source &amp; limits</summary>
    <p>{source.note}</p>
    <p>{source.attribution} · <a href={source.licenseUrl} target="_blank" rel="noreferrer">{source.license}</a> · <a href={source.sourceUrl} target="_blank" rel="noreferrer">Source</a></p>
    <p>{source.modifications}</p>
    <a href="/evidence/credits.html" target="_blank" rel="noreferrer">All evidence credits</a>
  </details>;
}