/** Renderer-only motion. Canonical coordinates and observations are never mutated. */
export interface VehicleFix { id: string; latitude: number; longitude: number; label: string; heading?: number }
export interface VehicleFrame extends VehicleFix { heading: number }
type Transition = { from: VehicleFrame; to: VehicleFrame; started: number; duration: number; received: number };
export const validFix = (fix: { latitude: number; longitude: number }) => Number.isFinite(fix.latitude) && Number.isFinite(fix.longitude) && Math.abs(fix.latitude) <= 90 && Math.abs(fix.longitude) <= 180;
const wrap = (degrees: number) => ((degrees + 540) % 360) - 180;
export function travelBearing(from: VehicleFix, to: VehicleFix) {
	const rad = Math.PI / 180, a = from.latitude * rad, b = to.latitude * rad, d = wrap(to.longitude - from.longitude) * rad;
	return (Math.atan2(Math.sin(d) * Math.cos(b), Math.cos(a) * Math.sin(b) - Math.sin(a) * Math.cos(b) * Math.cos(d)) / rad + 360) % 360;
}
export class FleetMotion {
	private tracks = new Map<string, Transition>();
	update(fixes: VehicleFix[], now: number, reducedMotion = false) {
		const valid = fixes.filter(validFix), ids = new Set(valid.map(fix => fix.id));
		for (const id of this.tracks.keys()) if (!ids.has(id)) this.tracks.delete(id);
		for (const fix of valid) {
			const old = this.tracks.get(fix.id), heading = Number.isFinite(fix.heading) ? fix.heading : undefined;
			if (!old) {
				const frame = { ...fix, heading: heading ?? 0 };
				this.tracks.set(fix.id, { from: frame, to: frame, started: now, received: now, duration: 0 }); continue;
			}
			const moved = old.to.latitude !== fix.latitude || old.to.longitude !== fix.longitude;
			if (!moved && (heading === undefined || heading === old.to.heading)) { old.to = { ...old.to, label: fix.label }; continue; }
			this.tracks.set(fix.id, { from: this.frame(old, now), to: { ...fix, heading: heading ?? (moved ? travelBearing(old.to, fix) : old.to.heading) },
				started: now, received: now, duration: reducedMotion ? 0 : Math.min(1600, Math.max(250, now - old.received)) });
		}
	}
	private frame(track: Transition, now: number): VehicleFrame {
		const t = track.duration ? Math.min(1, Math.max(0, (now - track.started) / track.duration)) : 1;
		if (t === 1) return { ...track.to };
		return { ...track.to, latitude: track.from.latitude + (track.to.latitude - track.from.latitude) * t,
			longitude: wrap(track.from.longitude + wrap(track.to.longitude - track.from.longitude) * t), heading: track.from.heading + wrap(track.to.heading - track.from.heading) * t };
	}
	frames(now: number) { return [...this.tracks.values()].map(track => this.frame(track, now)); }
	moving(now: number) { return [...this.tracks.values()].some(track => now < track.started + track.duration); }
	finish() { this.tracks.forEach(track => { track.duration = 0; }); }
}

/** Relative heat normalization changes styling only, never counts or severity. */
export function relativeHeatWeights(points: { weight: number }[]) {
	const peak = Math.max(1, ...points.map(point => Number.isFinite(point.weight) ? Math.max(0, point.weight) : 0));
	return points.map(point => Number.isFinite(point.weight) ? Math.max(0, point.weight) / peak : 0);
}
