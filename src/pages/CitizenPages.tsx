import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownUp, Camera, LocateFixed } from 'lucide-react';
import { useCityData } from '../services/useCityData';
import { findJourney } from '../services/journey';
import { evaluateJourney, journeyPlaces, savedJourneyRoutes, type JourneyPlace, type JourneyRoute } from '../domain/citizenJourney';
import { formatDemoDate, formatDemoTime } from '../domain/time';
import { AppHeader, SeverityBadge } from '../components/ui';
import { CitizenMapView } from '../components/CitizenMapView';
import { CitizenReportForm, Modal } from '../components/CitizenReports';
import '../styles-citizen.css';

export default function CitizenPages({ page, navigate, exit }: { page: string; navigate: (page: string) => void; exit: () => void }) {
  const { state, mobility } = useCityData();
  const [originId, setOrigin] = useState(journeyPlaces[0].id);
  const [destinationId, setDestination] = useState(journeyPlaces[1].id);
  const [currentLocation, setCurrentLocation] = useState<JourneyPlace>();
  const [journey, setJourney] = useState({ origin: journeyPlaces[0], destination: journeyPlaces[1] });
  const [routes, setRoutes] = useState<JourneyRoute[]>(savedJourneyRoutes);
  const [selectedId, setSelected] = useState('direct');
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [projectId, setProject] = useState<string>();
  const request = useRef<AbortController | null>(null);
  const requestVersion = useRef(0);
  const locationVersion = useRef(0);
  const places = currentLocation ? [...journeyPlaces, currentLocation] : journeyPlaces;
  const evaluated = useMemo(() => evaluateJourney(state, routes), [state, routes]);
  const recommended = [...evaluated].filter(route => route.minutes !== null).sort((a, b) => a.minutes! - b.minutes!)[0];
  const selected = evaluated.find(route => route.id === selectedId) || recommended || evaluated[0];
  const project = mobility.projects.find(item => item.projectId === projectId && item.status !== 'Completed');
  const relevantProjects = [...new Map(evaluated.flatMap(route => route.projects).map(item => [item.projectId, item])).values()];
  const dirty = journey.origin.id !== originId || journey.destination.id !== destinationId;
  const searchSection = useRef<HTMLElement>(null), routeSection = useRef<HTMLElement>(null), conditionsHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const target = page === 'routes' ? routeSection.current : page === 'alerts' ? conditionsHeading.current : searchSection.current;
    target?.scrollIntoView({ block: 'start' });
  }, [page]);
  useEffect(() => () => { request.current?.abort(); requestVersion.current++; locationVersion.current++; }, []);
  useEffect(() => { setSelected(id => evaluated.find(route => route.id === id)?.blocked && recommended ? recommended.id : id); }, [evaluated]);
  useEffect(() => { if (projectId && !project) setProject(undefined); }, [projectId, project]);
  const invalidate = () => { request.current?.abort(); requestVersion.current++; setBusy(false); setError(''); };
  const search = async () => {
    invalidate();
    const origin = places.find(place => place.id === originId)!, destination = places.find(place => place.id === destinationId)!;
    const controller = new AbortController(); request.current = controller;
    const version = ++requestVersion.current;
    setBusy(true);
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      const result = await findJourney(origin, destination, controller.signal);
      if (version !== requestVersion.current) return;
      setJourney({ origin, destination }); setRoutes(result); setSelected(result[0].id); navigate('routes');
    } catch (cause) {
      if (version === requestVersion.current) {
        setRoutes([]); setJourney({ origin, destination });
        setError(controller.signal.aborted ? 'Routing timed out. Try again or choose the saved Teynampet → Guindy journey.' : cause instanceof Error ? cause.message : 'Routing unavailable.');
      }
    } finally { window.clearTimeout(timeout); if (version === requestVersion.current) setBusy(false); }
  };
  const locate = () => {
    setError('');
    if (!navigator.geolocation) { setError('Location is unavailable. Choose a starting point instead.'); return; }
    const version = ++locationVersion.current; setLocating(true);
    navigator.geolocation.getCurrentPosition(position => {
      if (version !== locationVersion.current) return;
      setLocating(false);
      if (position.coords.accuracy > 500) { setError('Location is too imprecise. Choose a starting point instead.'); return; }
      const location: JourneyPlace = { id: 'current', name: 'Current location', point: [position.coords.latitude, position.coords.longitude] };
      if (location.point[0] < 12.8 || location.point[0] > 13.3 || location.point[1] < 80 || location.point[1] > 80.35) { setError('You are outside Chennai routing coverage. Choose a starting point.'); return; }
      invalidate(); setCurrentLocation(location); setOrigin(location.id);
    }, () => { if (version === locationVersion.current) { setLocating(false); setError('Location could not be obtained. Choose a starting point instead.'); } }, { timeout: 10000, maximumAge: 60000 });
  };
  return <><AppHeader title="Citizen Mobility" subtitle="Chennai · Plan your journey" onExit={exit}/>
    <main className="citizen-journey">
      <section ref={searchSection} className="journey-search" aria-label="Plan a journey">
        <div className="journey-heading"><h1>Where are you going?</h1><button className="icon-btn" aria-label="Report a road issue" onClick={() => setReportOpen(true)}><Camera/></button></div>
        <div className="journey-inputs"><label>From<select aria-label="Source location" value={originId} onChange={event => { invalidate(); locationVersion.current++; setLocating(false); setOrigin(event.target.value); }}>{places.map(place => <option value={place.id} key={place.id}>{place.name}</option>)}</select></label>
          <button className="swap-journey" aria-label="Swap source and destination" onClick={() => { invalidate(); locationVersion.current++; setLocating(false); setOrigin(destinationId); setDestination(originId); }}><ArrowDownUp/></button>
          <label>To<select aria-label="Destination location" value={destinationId} onChange={event => { invalidate(); setDestination(event.target.value); }}>{places.map(place => <option value={place.id} key={place.id}>{place.name}</option>)}</select></label>
        </div>
        <div className="journey-search-actions"><button className="location-action" disabled={locating} onClick={locate}><LocateFixed size={16}/>{locating ? 'Locating…' : 'Use current location'}</button><button className="primary" disabled={busy || originId === destinationId} onClick={() => void search()}>{busy ? 'Finding…' : 'Find routes'}</button></div>
        {originId === destinationId && <p role="status">Choose different start and destination locations.</p>}
        {dirty && <p className="journey-note" role="status">Locations changed. Find routes to update the map.</p>}
        {error && <p className="journey-error" role="alert">{error}</p>}
      </section>
      <CitizenMapView routes={evaluated} selected={selected?.id} select={setSelected} origin={journey.origin} destination={journey.destination} projects={relevantProjects.flatMap(item => {
        const points = state.roadSegments[item.roadSegmentId]?.points;
        return points?.length ? [{ id: item.projectId, title: `${item.roadName} · Municipal work`, point: points[Math.floor(points.length / 2)], select: () => setProject(item.projectId) }] : [];
      })}/>
      <section ref={routeSection} className="journey-sheet" aria-label="Journey route details">
        <div className="journey-sheet-heading"><h2>{page === 'alerts' ? 'On your journey' : 'Route options'}</h2><span>Car · estimates</span></div>
        <p className="journey-note">{journey.origin.name} → {journey.destination.name}</p>
        {!evaluated.length && <p>No route calculated. Adjust the locations or retry.</p>}
        <div className="journey-options">{evaluated.map(route => {
          const other = evaluated.filter(item => item.id !== route.id && item.minutes !== null).sort((a, b) => a.minutes! - b.minutes!)[0];
          const saving = route.minutes !== null && other?.minutes !== null && other?.minutes !== undefined ? other.minutes - route.minutes : null;
          return <button className={`journey-option ${route.id === selected?.id ? 'selected' : ''}`} key={route.id} aria-pressed={route.id === selected?.id} onClick={() => setSelected(route.id)}>
            <span><strong>{route.label}</strong><small>{route.distanceKm.toFixed(1)} km · {route.blocked ? 'Affected by approved closure' : route.id === recommended?.id ? 'Lowest available estimate' : 'Alternative route'}</small>{saving !== null && saving > 0 && <small className="journey-saving">Estimated {saving} min less than the other option</small>}</span>
            <b>{route.minutes === null ? 'Closed' : <>{route.minutes}<small>min</small></>}</b>
          </button>;
        })}</div>
        {evaluated.length > 0 && !recommended && <p role="status">All calculated routes are affected by closures. No open alternative was found.</p>}
        {selected && <>
          <h3 ref={conditionsHeading}>{selected.blocked ? 'Road work affecting this route' : 'Conditions on this route'}</h3>
          {selected.projects.map(item => <button className="journey-condition work" key={item.projectId} onClick={() => setProject(item.projectId)}><span><strong>ROAD WORK · {item.roadName}</strong><small>Until {formatDemoDate(item.endsAt)} · {selected.blocked ? 'Closure' : 'Expect delays'}</small></span><span>Details →</span></button>)}
          {selected.conditions.map(condition => <div className="journey-condition" key={condition.id}><span><strong>{condition.title}</strong><small>{condition.location} · Reported, use caution</small></span><SeverityBadge value={condition.severity}/></div>)}
          {selected.traffic.map(item => <div className="journey-condition" key={item.id}><span><strong>{item.road} · {item.densityLevel} traffic</strong><small>Observed {item.timestamp} · {item.averageSpeed} km/h average</small></span></div>)}
          {!selected.projects.length && !selected.conditions.length && !selected.traffic.length && <p className="journey-note">No recorded issues matched this route. Coverage is limited; this is not an all-clear.</p>}
        </>}
        {relevantProjects.some(item => !selected?.projects.some(visible => visible.projectId === item.projectId)) && <details className="avoided-work"><summary>Road work avoided by this option</summary>{relevantProjects.filter(item => !selected?.projects.some(visible => visible.projectId === item.projectId)).map(item => <button className="journey-condition" key={item.projectId} onClick={() => setProject(item.projectId)}><span><strong>{item.roadName} · Municipal work</strong><small>Until {formatDemoDate(item.endsAt)}</small></span><span>Details →</span></button>)}</details>}
        <details className="journey-method"><summary>About routes and coverage</summary><p>{selected?.source || 'Road-network routing'} · © OpenStreetMap contributors, OSRM. The saved Teynampet → Guindy journey works without a routing request. Other landmark pairs and current-location routes use a public routing service when you press Find routes.</p><p>Estimates use road-network travel times plus matched municipal planning delays, not live traffic predictions. Reported issues are shown on linked corridors or within 120 m of the route; sampled closure coverage is approximate. Follow signs and official diversions. No turn-by-turn guidance.</p><p>Your selected coordinates are sent to routing.openstreetmap.de only for a requested online route. No location is stored by this demo. Last city update: {formatDemoTime(mobility.asOf)}.</p></details>
      </section>
    </main>
    {project && <Modal title="Municipal road work" close={() => setProject(undefined)}><div className="project-public-detail"><span className="eyebrow">ROAD WORK · {project.status.toUpperCase()}</span><h3>{project.roadName}</h3><p>{project.title}</p><p>Active until {formatDemoDate(project.endsAt)}</p><p>Expect delays. This notice comes from approved municipal planning context.</p><button className="primary full" onClick={() => { setProject(undefined); if (recommended) setSelected(recommended.id); navigate('routes'); }}>{recommended ? 'Find better route' : 'Review route availability'}</button></div></Modal>}
    {reportOpen && <CitizenReportForm close={() => setReportOpen(false)} initialRoad={selected?.segmentIds.find(id => state.roadSegments[id])}/>}
  </>;
}
