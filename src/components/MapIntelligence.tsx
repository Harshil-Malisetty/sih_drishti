import { BusFront, Flame, Layers, Pause, Play, LocateFixed } from 'lucide-react';
import { municipalHeatCategories, policeHeatCategories, rankHotspots, type HeatFilters, type HeatPoint } from '../domain/mapSignals';
import type { useBusPlayback } from '../services/useBusPlayback';
import { formatDemoDate } from '../domain/time';
import { BusModel } from './BusModel';

export function MapSignalControls({ role, heat, setHeat, filters, setFilters }: {
  role: 'police' | 'municipal'; heat: boolean; setHeat: (value: boolean) => void;
  filters: HeatFilters; setFilters: (value: HeatFilters) => void;
}) {
  const categories = role === 'police' ? policeHeatCategories : municipalHeatCategories;
  return <div className="gis-controls">
    <div className="gis-mode" aria-label="Map display">
      <button aria-pressed={!heat} onClick={() => setHeat(false)}><Layers size={16}/> Records</button>
      <button aria-pressed={heat} onClick={() => setHeat(true)}><Flame size={16}/> Heatmap</button>
    </div>
    {heat ? <>
      <label>Signal<select aria-label="Signal" value={filters.category} onChange={event => setFilters({ ...filters, category: event.target.value })}>{categories.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <label>{role === 'police' ? 'Observed' : 'Last observed'}<select aria-label="Observation period" value={filters.period} onChange={event => setFilters({ ...filters, period: event.target.value as HeatFilters['period'] })}><option value="all">All recorded time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select></label>
      {role === 'municipal' && <label>Measure<select aria-label="Measure" value={filters.metric} onChange={event => setFilters({ ...filters, metric: event.target.value as HeatFilters['metric'] })}><option value="cases">Distinct issues</option><option value="observations">Repeated observations</option></select></label>}
      <label className="gis-check"><input type="checkbox" checked={filters.history} onChange={event => setFilters({ ...filters, history: event.target.checked })}/> Include resolved history</label>
    </> : <p>Explore records, or switch to heatmap to see local patterns.</p>}
  </div>;
}

export function HeatSignalSummary({ points, role, filters, onSelect }: { points: HeatPoint[]; role: 'police' | 'municipal'; filters: HeatFilters; onSelect: (id: string) => void }) {
  const hotspots = rankHotspots(points);
  const repeats = role === 'municipal' && filters.metric === 'observations';
  const unit = role === 'police' ? 'incidents' : 'issues';
  return <section className="gis-signal-summary" aria-label="Heat signal summary">
    <div className="gis-panel-title"><Flame size={18}/><h2>Signal intensity</h2><span>DERIVED</span></div>
    <div className="gis-signal-metrics" role="status"><div><strong>{points.length}</strong><span>{filters.history ? 'recorded' : 'active'} {unit}</span></div><div><strong>{hotspots.length}</strong><span>corridors</span></div></div>
    <div className="gis-heat-ramp" aria-hidden="true"/><div className="gis-ramp-labels"><span>Lower concentration</span><span>Higher</span></div>
    <p className="gis-explanation">{repeats ? 'Repeat-observation intensity: 1 + log₂(detections), capped at 8 per issue. Repeat sightings are not new defects or proof of recurrence after repair.' : 'One point per case. Overlapping cases create stronger heat; this is not a prediction or a risk probability.'} {filters.history ? 'Includes resolved records.' : 'Resolved records excluded.'}</p>
    {repeats && <p className="gis-explanation">Detection totals are lifetime counts for issues last seen in the selected period, not counts within that period.</p>}
    <h3>Corridors in this view</h3>
    {!points.length && <p className="gis-empty" role="status">No matching {unit}. Try another signal, time range, or include resolved history. No data does not mean no risk.</p>}
    <div className="gis-hotspots">{hotspots.map((spot, index) => <div className="gis-hotspot" key={spot.segmentId}><span className="gis-rank">{String(index + 1).padStart(2, '0')}</span><div><strong>{spot.location}</strong><small>{spot.points.length} {unit}{repeats ? ` · ${spot.detections} detections` : ''}</small>{spot.points.map(point => <button key={point.id} onClick={() => onSelect(point.id)}>{point.title}<span>{point.active ? 'Open' : 'Resolved'} →</span></button>)}</div></div>)}</div>
    <p className="gis-explanation">Sampled demo records only. Blank areas are not evidence of safe conditions.</p>
  </section>;
}

export function BusMovementFeed({ playback, selected, onSelect }: { playback: ReturnType<typeof useBusPlayback>; selected?: string; onSelect: (id: string) => void }) {
  const { positions, paused, setPaused, visible, setVisible, seconds } = playback;
  const moving = positions.filter(bus => bus.playback).length;
  return <section className="gis-bus-feed" aria-label="Bus movement feed">
    <div className="gis-panel-title"><BusFront size={18} aria-hidden="true"/><h2>Bus movement</h2><span className="gis-demo-badge">DEMO</span></div>
    <p className="gis-explanation">Animated road-geometry playback, not live GPS or actual MTC route tracking. Uncovered buses keep their last recorded position.</p>
    <div className="gis-feed-actions"><button aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? 'Hide buses' : 'Show buses'}</button><button disabled={!visible || !moving} onClick={() => setPaused(!paused)}>{paused ? <Play size={14}/> : <Pause size={14}/>} {paused ? 'Resume' : 'Pause'}</button></div>
    <div className="gis-feed-status"><span className={!paused && visible && moving ? 'gis-pulse' : ''}/>{!visible ? 'Overlay hidden' : paused ? 'Playback paused' : 'Demo playback'} · {moving} animated / {positions.length} buses<span className="gis-feed-clock">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span></div>
    {!positions.length && <p className="gis-empty">No reporting buses in this area.</p>}
    <div className="gis-bus-list">{positions.map(bus => <button key={bus.id} className={selected === bus.id ? 'is-selected' : ''} aria-pressed={selected === bus.id} onClick={() => { setVisible(true); onSelect(bus.id); }}>
      <span className="gis-bus-glyph"><BusModel/></span><span><strong>{bus.id}<em>Route {bus.route}</em></strong><small>{bus.playback ? 'Simulated position' : 'Recorded snapshot'} · {bus.latitude.toFixed(4)}, {bus.longitude.toFixed(4)}</small><small>Source observed {formatDemoDate(bus.observedAt)}</small></span><LocateFixed size={15} aria-hidden="true"/>
    </button>)}</div>
    <p className="gis-explanation">Select a bus to locate it. Playback never changes the incident locations or fleet observation counts.</p>
  </section>;
}