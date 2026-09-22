import { useEffect, useState, type ReactNode } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import './styles-operational-map.css';

/** True on handset viewports — narrow, or short enough that a control strip would erase the map. */
export const COMPACT_MAP_QUERY = '(max-width: 799px), (max-height: 560px)';
export function useCompactViewport(query = COMPACT_MAP_QUERY) {
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const change = () => setCompact(media.matches);
    change(); media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, [query]);
  return compact;
}

const DOCK_ID = 'operational-control-dock';

/**
 * Secondary map controls. One DOM tree in both layouts — a desktop control strip above
 * the map, and a progressively disclosed sheet on mobile — so opening or closing the
 * sheet never remounts a control or drops the state it holds.
 */
export function MapControlDock({ open, onClose, title = 'Map layers', children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  return <div className="operational-control-dock" id={DOCK_ID} data-open={open} aria-label={title}>
    <div className="operational-dock-head">
      <i className="handle" aria-hidden="true"/>
      <strong>{title}</strong>
      <button type="button" className="operational-dock-close" onClick={onClose} aria-label={`Close ${title.toLowerCase()}`}><X size={17} aria-hidden="true"/></button>
    </div>
    <div className="operational-dock-body">{children}</div>
  </div>;
}

export function MapDockLauncher({ open, onToggle, count }: { open: boolean; onToggle: () => void; count?: string }) {
  return <button type="button" className="operational-dock-launcher" onClick={onToggle} aria-expanded={open} aria-controls={DOCK_ID}>
    <SlidersHorizontal size={15} aria-hidden="true"/><span>Layers</span>{count && <em>{count}</em>}
  </button>;
}
