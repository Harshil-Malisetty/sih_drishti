import { useMemo, useState } from 'react';
import { municipalHeatCategories, policeHeatCategories, type HeatPoint } from '../domain/mapSignals';
import './styles-operational-map.css';

export function useHeatDisplay(points: HeatPoint[]) {
	const [visible, setVisible] = useState(true), [opacity, setOpacity] = useState(.85), [categories, setCategories] = useState<string[] | null>(null);
	const filtered = useMemo(() => points.filter(point => categories === null || categories.includes(point.category)), [points, categories]);
	return { visible, setVisible, opacity, setOpacity, categories, setCategories, points: filtered };
}
export function OperationalHeatControls({ role, display, points, history, setHistory, repeats, setRepeats, onFit }: {
	role: 'police' | 'municipal'; display: ReturnType<typeof useHeatDisplay>; points: HeatPoint[]; history: boolean; setHistory: (value: boolean) => void;
	repeats?: boolean; setRepeats?: (value: boolean) => void; onFit: () => void;
}) {
	const known = (role === 'police' ? policeHeatCategories : municipalHeatCategories).filter(([id]) => id !== 'all');
	const categories = [...known, ...[...new Set(points.map(point => point.category))].filter(id => !known.some(([key]) => key === id)).map(id => [id, id] as const)];
	return <section className="operational-heat-controls" aria-label="Geographic heatmap controls">
		<div className="operational-heat-toolbar">
			<label className="operational-heat-switch"><input type="checkbox" checked={display.visible} onChange={event => display.setVisible(event.target.checked)}/><span><strong>Hotspot intensity</strong><small>{display.points.length} {history ? 'recorded' : 'active'} {role === 'police' ? 'incidents · current jurisdiction' : 'issues · all categories'}</small></span></label>
			<div className="operational-heat-legend" aria-label="Relative intensity: green, yellow, orange, red"><span>Lower</span><i/><span>Higher</span></div>
			<label className="operational-opacity">Visibility<input aria-label="Heatmap opacity" type="range" min="0" max="100" value={Math.round(display.opacity * 100)} onChange={event => display.setOpacity(Number(event.target.value) / 100)}/><output>{Math.round(display.opacity * 100)}%</output></label>
			<button className="operational-fit-heat" disabled={!display.points.length} onClick={() => { display.setVisible(true); if (!display.opacity) display.setOpacity(.85); onFit(); }}>Fit hotspots</button>
			<details className="operational-heat-options"><summary>Hotspot layers</summary><div className="operational-heat-settings"><fieldset><legend>Combine categories</legend>
				<label><input type="checkbox" checked={display.categories === null} onChange={event => display.setCategories(event.target.checked ? null : [])}/>All categories</label>
				{categories.map(([id, label]) => <label key={id}><input type="checkbox" checked={display.categories === null || display.categories.includes(id)} onChange={event => {
					const active = display.categories ?? categories.map(([key]) => key), next = event.target.checked ? [...active, id] : active.filter(key => key !== id);
					display.setCategories(next.length === categories.length ? null : next);
				}}/>{label}<span>{points.filter(point => point.category === id).length}</span></label>)}
			</fieldset><label><input type="checkbox" checked={history} onChange={event => setHistory(event.target.checked)}/>Include resolved history</label>
				{setRepeats && <label><input type="checkbox" checked={repeats} onChange={event => setRepeats(event.target.checked)}/>Weight repeated observations</label>}
				<p>{repeats ? 'Lifetime repeat counts are logarithmically weighted, not treated as separate issues. ' : 'One sample per canonical case. '}Record tabs remain independent of heat layers.</p>
			</div></details>
		</div>
		<p className="operational-map-note">Relative concentration in the displayed records—not severity or predicted risk. Colours rescale with filters; nearby samples blend and accumulate. {!display.points.length && 'No matching heat samples.'}</p>
	</section>;
}
