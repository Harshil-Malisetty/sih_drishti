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

// Position the overlay against the intrinsic image, never against a letterboxed frame.
export function EvidenceScene({ src, alt, label }: { src: string; alt: string; label: string }) {
  const [loaded, setLoaded] = useState('');
  const [failed, setFailed] = useState('');
  const region = sourceByPath.get(src)?.subjectRegion;
  if (!src || failed === src) return <span className="evidence-unavailable" role="status">Evidence image unavailable.</span>;
  return <div className="evidence-scene">
    <img src={src} alt={alt} decoding="async" onLoad={() => setLoaded(src)} onError={() => setFailed(src)}/>
    {region && loaded === src && <span className="evidence-subject-box" aria-hidden="true" style={{ left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.width * 100}%`, height: `${region.height * 100}%` }}><span>{label}</span></span>}
  </div>;
}

export function EvidenceCredit({ src, additionalSources = [] }: { src: string; additionalSources?: string[] }) {
  const credits = [...new Set([src, ...additionalSources])].flatMap(path => {
    const source = sourceByPath.get(path);
    return source ? [source] : [];
  });
  if (!credits.length) return null; // User-uploaded media has no invented attribution.
  return <div className="evidence-credit"><a href={`/evidence/credits.html#${credits[0].id}`} target="_blank" rel="noreferrer">Photo credits</a></div>;
}