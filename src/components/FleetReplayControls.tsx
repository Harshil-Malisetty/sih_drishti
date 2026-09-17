import type { useBusPlayback } from '../services/useBusPlayback';

export function FleetReplayControls({ playback, enabled, setEnabled, speed, setSpeed, onLocate }: {
  playback: ReturnType<typeof useBusPlayback>; enabled: boolean; setEnabled: (enabled: boolean) => void; speed: number; setSpeed: (speed: number) => void; onLocate: (id: string) => void;
}) {
  const moving = playback.positions.filter(bus => bus.status === 'Sensing' && bus.playback);
  return <section className="fleet-replay-controls" aria-label="Demo fleet playback">
    <div className="fleet-replay-actions">
      <label><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)}/>Demo route playback</label>
      <span className="fleet-demo-badge">NOT LIVE GPS</span>
      <button disabled={!enabled || !moving.length} onClick={() => playback.setPaused(!playback.paused)}>{playback.paused ? 'Resume replay' : 'Pause replay'}</button>
      <label>Speed<select aria-label="Demo playback speed" disabled={!enabled} value={speed} onChange={event => setSpeed(Number(event.target.value))}><option value="1">1×</option><option value="4">4×</option><option value="8">8×</option></select></label>
      <button disabled={!enabled || !moving.length} onClick={() => onLocate(moving[0].id)}>Locate moving bus</button>
      <span role="status">{!enabled ? 'Recorded positions' : playback.paused ? 'Replay paused' : `${moving.length} moving · ${speed}× replay`}</span>
    </div>
    <p>Illustrative movement on existing saved roads, not actual MTC routes. Uncovered buses stay at their recorded positions. Source observations never change.</p>
  </section>;
}