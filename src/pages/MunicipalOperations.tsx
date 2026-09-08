import { useEffect, useState } from "react";
import {
  ArrowRight,
  BusFront,
  CalendarCheck,
  Construction,
  Check,
  MapPin,
  Search,
  X,
} from "lucide-react";
import { useCityData } from "../services/useCityData";
import { municipalService } from "../services";
import { selectPlannerSimulation } from "../domain/planning";
import type { RoadDefect, Severity } from "../types";
import { DefectCard } from "../components/cards";
import {
  AppHeader,
  FilterBar,
  MetricCard,
  PageIntro,
  SectionHeader,
  SeverityBadge,
  Surface,
} from "../components/ui";
import {
  MunicipalMapView,
  type MunicipalGeoMarker,
  type MunicipalMapCamera,
} from "../components/MunicipalMapView";
import { ObservationProgression } from "../components/PotholeLifecycle";
import { EventThumbnail, eventPhaseLabel } from "../components/EventThumbnail";
import { Grid } from "../components/charts/grid";
import { Line, LineChart } from "../components/charts/line-chart";
import { ChartTooltip } from "../components/charts/tooltip";
import { MunicipalWorkflow } from "../components/MunicipalWorkflow";
import { MunicipalTasks } from "../components/MunicipalTasks";
import { ProjectApproval } from "../components/ProjectApproval";
import { EmergencyDispatchPanel } from "../components/EmergencyDispatchPanel";
import { selectEventResolution } from "../domain/operations";
import type { MunicipalTask } from "../types/city";
import { MunicipalReportInbox } from "../components/CitizenReports";
import { useOperation } from "../components/operations";
import { formatDemoDate, formatDemoTime } from "../domain/time";
import { EvidenceCredit, EvidenceImage } from "../components/EvidenceMedia";
import { PlannerMap, type PlannerCamera } from "../components/PlannerMap";
import { AIReviewWorkbench } from "../components/AIReviewWorkbench";

type View =
  | { kind: "detail" | "lifecycle"; id: string }
  | { kind: "result"; scenarioId: string };
type PlannerSimulation = ReturnType<typeof selectPlannerSimulation>;
export default function MunicipalOperations({
  page,
  navigate,
  exit,
}: {
  page: string;
  navigate: (x: string) => void;
  exit: () => void;
}) {
  const { defects, plannerRoadSegments } = useCityData();
  const [stack, setStack] = useState<View[]>([]);
  const [planningError, setPlanningError] = useState("");
  const planningOperation = useOperation();
  const [issueFilter, setIssueFilter] = useState("All");
  const [mapFilter, setMapFilter] = useState<MunicipalLayer>("Road defects");
  const [mapSelected, setMapSelected] = useState(
    defects.find((x) => inMunicipalLayer(x, "Road defects"))?.id ||
      defects[0].id,
  );
  const [mapViews, setMapViews] = useState<
    Partial<Record<MunicipalLayer, MunicipalMapCamera>>
  >({});
  const [planningRoad, setPlanningRoad] = useState(plannerRoadSegments[0].id);
  const [planningDuration, setPlanningDuration] = useState("8 weeks");
  const [planningCamera, setPlanningCamera] = useState<PlannerCamera>();
  const open = (view: View) => {
    history.replaceState({ municipalViews: stack, primaryPage: page }, "");
    const next = [...stack, view];
    setStack(next);
    history.pushState({ municipalViews: next, primaryPage: page }, "");
  };
  const back = () => history.back();
  const home = () => {
    setStack([]);
    history.replaceState({ screen: 'workspace' }, '');
    navigate("overview");
  };
  useEffect(() => {
    const pop = (event: PopStateEvent) => { setStack(event.state?.municipalViews || []); if (event.state?.municipalViews && event.state.primaryPage) navigate(event.state.primaryPage); };
    const reset = () => { setStack([]); history.replaceState({ screen: 'workspace' }, ''); };
    addEventListener("popstate", pop);
    addEventListener("workspace-home", reset);
    return () => {
      removeEventListener("popstate", pop);
      removeEventListener("workspace-home", reset);
    };
  }, []);
  const active = stack.at(-1);
  if (active?.kind === "detail")
    return (
      <Detail
        id={active.id}
        back={back}
        home={home}
        lifecycle={() => open({ kind: "lifecycle", id: active.id })}
      />
    );
  if (active?.kind === "lifecycle")
    return <Lifecycle id={active.id} back={back} home={home} />;
  if (active?.kind === "result")
    return (
      <Result
        scenarioId={active.scenarioId}
        back={back}
        home={home}
      />
    );
  const openItem = (item: RoadDefect) => open({ kind: "detail", id: item.id });
  const openTask = (target: MunicipalTask['target']) => open(target.kind === "issue"
    ? { kind: "detail", id: target.id }
    : { kind: "result", scenarioId: target.id });
  const showIssues = (filter: string) => {
    setIssueFilter(filter);
    navigate("defects");
  };
  return (
    <>
      <AppHeader
        title="Municipal Operations"
        subtitle="Chennai · Municipal operations"
        onHome={home}
        onExit={exit}
      />
      <main>
        {page === "review" && <AIReviewWorkbench role="municipal" openRecord={event => open({ kind: "detail", id: event.id })} />}
        {page === "overview" && (
          <Overview go={navigate} showIssues={showIssues} open={openItem} openTask={openTask} />
        )}{" "}
        {page === "defects" && (
          <IssueList
            filter={issueFilter}
            onFilter={setIssueFilter}
            open={openItem}
            openTask={openTask}
          />
        )}{" "}
        {page === "map" && (
          <MunicipalMap
            filter={mapFilter}
            selected={mapSelected}
            view={mapViews[mapFilter]}
            onFilter={setMapFilter}
            onSelect={setMapSelected}
            onViewChange={(camera) =>
              setMapViews((views) => ({ ...views, [mapFilter]: camera }))
            }
            open={openItem}
          />
        )}{" "}
        {page === "planning" && (
          <Planning
            selected={planningRoad}
            camera={planningCamera}
            onCameraChange={setPlanningCamera}
            duration={planningDuration}
            onRoad={setPlanningRoad}
            onDuration={setPlanningDuration}
            busy={planningOperation.busy}
            run={() => {
              setPlanningError("");
              void planningOperation.run(async () => {
                const scenario = await municipalService.runConstructionSimulation({ roadSegmentId: planningRoad, duration: planningDuration });
                open({ kind: "result", scenarioId: scenario.id });
              }, { message: 'What-if ready for review. Not published to Citizens.', tone: 'info' });
            }}
          />
        )}
        {(planningError || planningOperation.error) && <p role="alert">{planningError || planningOperation.error}</p>}
      </main>
    </>
  );
}
function Overview({
  go,
  showIssues,
  open,
  openTask,
}: {
  go: (x: string) => void;
  showIssues: (filter: string) => void;
  open: (x: RoadDefect) => void;
  openTask: (target: MunicipalTask['target']) => void;
}) {
  const { defects } = useCityData();
  const openIssues = defects.filter((item) => item.workflowStage !== "Closed");
  const criticalIssues = openIssues.filter((item) => item.severity === "Critical");
  const infrastructureIssues = openIssues.filter(
    (item) => item.category === "Infrastructure",
  );
  const pendingIssues = defects.filter(
    (item) => item.workflowStage === "Admin review",
  );
  const totalEvidence = defects.reduce(
    (total, item) => total + item.detectionCount,
    0,
  );
  const reportingBuses = new Set(defects.flatMap((item) => item.busIds)).size;
  const severityRank: Record<Severity, number> = {
    Critical: 4,
    High: 3,
    Medium: 2,
    Low: 1,
  };
  const priorities = [...openIssues]
    .sort(
      (left, right) =>
        severityRank[right.severity] - severityRank[left.severity],
    )
    .slice(0, 3);
  const completedExample = defects.find(item => item.workflowStage === 'Closed' && (item.observations?.length || 0) > 1);
  return (
    <div className="page municipal-overview">
      <PageIntro
        eyebrow="MUNICIPAL OPERATIONS"
        title="City Road Health"
      />
      <MunicipalReportInbox openIssue={id => { const issue = defects.find(item => item.id === id); if (issue) open(issue); }}/>
      <div className="metric-grid compact operations-metrics">
        <MetricCard
          label="Open records"
          value={String(openIssues.length).padStart(2, "0")}
          tone="open"
          meta={`${totalEvidence} fleet observations`}
        />
        <MetricCard
          label="Critical"
          value={String(criticalIssues.length).padStart(2, "0")}
          tone="critical"
          meta="Needs action"
        />
        <MetricCard
          label="Infrastructure"
          value={String(infrastructureIssues.length).padStart(2, "0")}
          tone="infrastructure"
          meta="Active assets"
        />
        <MetricCard
          label="Verification"
          value={String(pendingIssues.length).padStart(2, "0")}
          tone="water"
          meta="Awaiting admin review"
        />
      </div>
      <div className="sensor-strip municipal">
        <BusFront />
        <div>
          <strong>{totalEvidence} historical observations in the register</strong>
          <span>
            {reportingBuses} buses · {defects.length} tracked locations
          </span>
        </div>
      </div>
      {completedExample && <button className="traffic-control-link event-scene-row" onClick={() => open(completedExample)}><EventThumbnail category={completedExample.kind} completed/><div className="event-copy"><strong>{completedExample.defectType} · repaired and verified</strong><small>{completedExample.observations?.length} recorded stages · view the repair history</small></div><ArrowRight aria-hidden="true"/></button>}
      <MunicipalTasks onOpen={openTask} />
      <section className="operations-brief event-priorities">
        <div className="geographic-pressure">
          <header>
            <span>PRIORITY LOCATIONS</span>
            <button onClick={() => go("map")}>
              Open map <ArrowRight />
            </button>
          </header>
          {priorities.map((item) => (
            <button className="event-scene-row" key={item.id} onClick={() => open(item)}>
              <EventThumbnail category={item.kind}/>
              <span className="event-copy">
                <strong>{item.location}</strong>
                <small>{item.defectType}</small>
              </span>
              <b>{eventPhaseLabel(item.workflowStage)}</b>
            </button>
          ))}
        </div>
      </section>
      <SectionHeader
        title="Priority issue"
        action="View all"
        onAction={() => showIssues("All")}
      />
      {priorities[0] && <DefectCard item={priorities[0]} onClick={() => open(priorities[0])} />}
      <nav className="municipal-actions" aria-label="Municipal workflows">
        <button onClick={() => showIssues("All")}>
          <span>ISSUE REGISTER</span>
          <strong>Review all records</strong>
          <ArrowRight />
        </button>
        <button onClick={() => go("map")}>
          <span>GIS OPERATIONS</span>
          <strong>Inspect city layers</strong>
          <ArrowRight />
        </button>
        <button onClick={() => go("planning")}>
          <span>NETWORK PLANNING</span>
          <strong>Model a closure</strong>
          <ArrowRight />
        </button>
      </nav>
    </div>
  );
}
function IssueList({
  filter,
  onFilter,
  open,
  openTask,
}: {
  filter: string;
  onFilter: (value: string) => void;
  open: (x: RoadDefect) => void;
  openTask: (target: MunicipalTask['target']) => void;
}) {
  const { defects, state } = useCityData();
  const visible = defects.filter(
    (x) => filter === "All" || x.category === filter,
  );
  return (
    <div className="page">
      <PageIntro
        eyebrow={`ROAD ISSUE REGISTER · UPDATED ${formatDemoTime(state.now)}`}
        title="Road & infrastructure"
      />
      <MunicipalTasks onOpen={openTask} />
      <FilterBar
        items={["All", "Roads", "Infrastructure", "Water", "Pedestrians"]}
        active={filter}
        onChange={onFilter}
      />
      <div className="list-stack">
        {visible.map((x) => (
          <DefectCard item={x} key={x.id} onClick={() => open(x)} />
        ))}
      </div>
    </div>
  );
}
function Detail({
  id,
  back,
  home,
  lifecycle,
}: {
  id: string;
  back: () => void;
  home: () => void;
  lifecycle: () => void;
}) {
  useEffect(() => { window.scrollTo(0, 0); }, [id]);
  const { defects, state } = useCityData();
  const x = defects.find((d) => d.id === id);
  const { resolution, review } = selectEventResolution(state, { kind: "municipal", id });
  if (!x)
    return (
      <>
        <AppHeader
          title="Record unavailable"
          subtitle={id}
          onBack={back}
          onHome={home}
        />
        <main className="page detail">
          <PageIntro
            eyebrow="MUNICIPAL RECORD"
            title="This record is no longer available"
          />
        </main>
      </>
    );
  const latest = x.observations?.at(-1);
  const hasProgression = (x.observations?.length || 0) > 1;
  const image = x.citizenReportId ? x.image : latest?.image || x.image;
  return (
    <>
      <AppHeader
        title={
          x.category === "Infrastructure"
            ? "Infrastructure record"
            : "Defect record"
        }
        subtitle={x.id}
        onBack={back}
        onHome={home}
      />
      <main className="page detail">
        <div className="title-row">
          <div>
            <span className="eyebrow">
              {x.category.toUpperCase()} · {x.citizenReportId ? 'CITIZEN REPORT' : 'FLEET EVIDENCE'}
            </span>
            <h1>{x.defectType}</h1>
            <p>
              <MapPin /> {x.location}
            </p>
          </div>
          <SeverityBadge value={x.severity} />
        </div>
        <MunicipalWorkflow issueId={id} />
        <details className="operation-panel municipal-evidence-details">
        <summary>Road evidence & observation history</summary>
        {image ? <div className="road-frame">
          <EvidenceImage
            src={image}
            alt={x.citizenReportId ? 'Citizen-submitted photo' : `${x.defectType} reference photo`}
          />
          <span>{x.citizenReportId ? 'CITIZEN PHOTO' : 'REFERENCE PHOTO'}</span>
        </div> : <p className="operation-meta">No photo attached. Field assessment required.</p>}
        {image && !x.citizenReportId && <p className="evidence-context">Reference photos · demo timeline</p>}
        <EvidenceCredit src={image}/>
        {hasProgression && (
          <button className="primary full evidence-story-link" onClick={lifecycle}>
            View {x.observations?.length} stages · {x.progressionTitle?.toLowerCase() || "condition progression"}
            <ArrowRight />
          </button>
        )}
        <Surface className="detail-facts">
          <div>
            <span>{x.citizenReportId ? 'Reported at' : 'First observed'}</span>
            <strong>{x.citizenReportId ? formatDemoDate(x.firstSeen) : x.firstSeen}</strong>
          </div>
          <div>
            <span>Latest observation</span>
            <strong>{x.citizenReportId ? formatDemoDate(x.lastSeen) : x.lastSeen}</strong>
          </div>
          <div>
            <span>Current status</span>
            <strong>{x.workflowStage === 'Admin review' ? 'Resolved · awaiting admin review' : x.workflowStage}</strong>
          </div>
          <div>
            <span>{x.citizenReportId ? 'Evidence source' : 'Fleet evidence'}</span>
            <strong>
              {x.citizenReportId ? `Citizen report · ${x.citizenReportId}` : `${x.detectionCount} observations · ${x.busIds.length} buses`}
            </strong>
          </div>
          <div>
            <span>Infrastructure category</span>
            <strong>{x.infrastructureCategory || x.category}</strong>
          </div>
          <div>
            <span>Current condition</span>
            <strong>{x.currentCondition || x.repairStatus || x.status}</strong>
          </div>
        </Surface>
        {(x.recommendedAction || x.maintenanceState) && (
          <section className="record-action">
            <span>RECOMMENDED ACTION</span>
            <strong>{x.recommendedAction}</strong>
            <small>{x.maintenanceState}</small>
          </section>
        )}
        </details>
        <EmergencyDispatchPanel event={{ kind: "municipal", id }} actor="Municipal admin" />
        {x.repair && (!resolution || !review || x.repair.busId) && (
          <Surface className="verification">
            <CalendarCheck />
            <div>
              <span>REPAIR {x.repair.result.toUpperCase()}</span>
              <strong>{x.repair.detail}</strong>
              <p>
                {x.repair.nextObservation} · {x.repair.busId}
              </p>
            </div>
          </Surface>
        )}
      </main>
    </>
  );
}
function Lifecycle({
  id,
  back,
  home,
}: {
  id: string;
  back: () => void;
  home: () => void;
}) {
  const { defects } = useCityData();
  const x = defects.find((d) => d.id === id);
  if (!x) return null;
  return (
    <>
      <AppHeader
        title="Condition intelligence"
        subtitle={x.id}
        onBack={back}
        onHome={home}
      />
      <main className="page detail">
        <PageIntro
          eyebrow="DEMO CONDITION HISTORY"
          title={x.location}
        />
        <ObservationProgression defect={x} />
      </main>
    </>
  );
}

type MunicipalLayer = "Road defects" | "Infrastructure" | "Pedestrian risks";
const municipalLayers: MunicipalLayer[] = [
  "Road defects",
  "Infrastructure",
  "Pedestrian risks",
];
const inMunicipalLayer = (item: RoadDefect, layer: MunicipalLayer) =>
  layer === "Road defects"
    ? item.category === "Roads" || item.category === "Water"
    : layer === "Infrastructure"
      ? item.category === "Infrastructure"
      : item.category === "Pedestrians";
function MunicipalMap({
  filter,
  selected,
  view,
  onFilter,
  onSelect,
  onViewChange,
  open,
}: {
  filter: MunicipalLayer;
  selected: string;
  view?: MunicipalMapCamera;
  onFilter: (value: MunicipalLayer) => void;
  onSelect: (id: string) => void;
  onViewChange: (camera: MunicipalMapCamera) => void;
  open: (x: RoadDefect) => void;
}) {
  const { defects } = useCityData();
  const visible = defects.filter((x) => inMunicipalLayer(x, filter));
  const item = visible.find((x) => x.id === selected);
  const markers: MunicipalGeoMarker[] = visible.map((x) => ({
    id: x.id,
    type:
      x.category === "Infrastructure"
        ? "infrastructure"
        : x.category === "Pedestrians"
          ? "pedestrian"
          : "road",
    latitude: x.latitude,
    longitude: x.longitude,
    label: `${x.defectType} · ${x.location} · ${x.workflowStage}`,
    closed: x.workflowStage === 'Closed',
  }));
  const changeFilter = (value: string) => {
    const next = value as MunicipalLayer;
    onFilter(next);
    const first = defects.find((x) => inMunicipalLayer(x, next));
    if (first) onSelect(first.id);
  };
  return (
    <div className="map-page municipal-map-page">
      <div className="map-filter">
        <FilterBar
          items={municipalLayers}
          active={filter}
          onChange={changeFilter}
        />
      </div>
      <MunicipalMapView
        markers={markers}
        selected={selected}
        initialView={view}
        onSelect={onSelect}
        onViewChange={onViewChange}
      />
      {item && (
        <section className="bottom-sheet">
          <i className="handle" />
          <span className="sheet-eyebrow">
            {item.workflowStage === 'Closed' ? 'VERIFIED FIXED' : item.severity.toUpperCase()} · {item.category.toUpperCase()}
          </span>
          <h3>{item.defectType}</h3>
          <p>
            {item.location} · {item.workflowStage}
          </p>
          <small>
            {item.detectionCount} observations · Last seen {item.lastSeen}
          </small>
          <button className="primary" onClick={() => open(item)}>
            Open record
          </button>
        </section>
      )}
    </div>
  );
}

function Planning({
  selected,
  camera,
  onCameraChange,
  duration,
  onRoad,
  onDuration,
  run,
  busy,
}: {
  selected: string;
  camera?: PlannerCamera;
  onCameraChange: (camera: PlannerCamera) => void;
  duration: string;
  onRoad: (id: string) => void;
  onDuration: (value: string) => void;
  run: () => void;
  busy: boolean;
}) {
  const { plannerRoadSegments } = useCityData();
  const [query, setQuery] = useState('');
  const locations = plannerRoadSegments.map((road, index) => ({ road, number: index + 1 }));
  const matching = locations.filter(({ road }) => `${road.name} ${road.busRoutes.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()));
  const road =
    plannerRoadSegments.find((segment) => segment.id === selected) ||
    plannerRoadSegments[0];
  return (
    <div className="page planning-page">
      <PageIntro
        eyebrow="MUNICIPAL PLANNING"
        title="Urban Planning & What-If"
        text="Choose a corridor. See how a closure could affect nearby roads."
      />
      <PlannerMap locations={locations} selected={selected} onSelect={id => { onRoad(id); setQuery(''); }} disabled={busy} camera={camera} onCameraChange={onCameraChange}/>
      <section className="planner-road-picker" aria-labelledby="planner-roads-title">
        <div className="planner-section-heading"><h2 id="planner-roads-title">Choose a corridor</h2><span>{plannerRoadSegments.length} roads</span></div>
        <label className="planner-search"><Search aria-hidden="true"/><input type="search" aria-label="Find a road or bus route" placeholder="Find a road or bus route" value={query} onChange={event => setQuery(event.target.value)}/></label>
        <div className="planner-road-list" role="group" aria-label="Road corridors" aria-busy={busy}>
          {matching.map(({ road: segment, number }) => <button type="button" key={segment.id} className="planner-road-option" aria-pressed={segment.id === selected} disabled={busy} onClick={() => onRoad(segment.id)}>
            <span className="planner-road-number" aria-hidden="true">{String(number).padStart(2, '0')}</span>
            <span className="planner-road-copy"><strong>{segment.name}</strong><small>{segment.baselineLevel} traffic · {segment.baselineMinutes} min baseline</small></span>
            {segment.id === selected && <Check aria-hidden="true"/>}
          </button>)}
          {!matching.length && <p className="planner-empty" role="status">No corridors found. Try a road name or bus route.</p>}
        </div>
      </section>
      <Surface className="form planner-closure-form">
        <div className="planner-selection" role="status" aria-live="polite">
          <span>Closure on</span><strong>{road.name}</strong>
          <small>{road.observedPasses.toLocaleString()} observed passes · Routes {road.busRoutes.join(', ')}</small>
        </div>
        <label>
          Full closure duration
          <select
            value={duration}
            disabled={busy}
            onChange={(event) => onDuration(event.target.value)}
          >
            <option>3 days</option>
            <option>2 weeks</option>
            <option>8 weeks</option>
            <option>4 months</option>
          </select>
        </label>
        <p className="planner-draft-note">A private what-if. Nothing is published until you review and approve it.</p>
        <button className="primary full" onClick={run} disabled={busy}>
          <Construction /> {busy ? 'Running simulation…' : 'Run simulation'}
        </button>
      </Surface>
    </div>
  );
}
function ImpactChart({ simulation }: { simulation: PlannerSimulation }) {
  const chartData = simulation.timeline.map((point) => ({
    date: new Date(Date.UTC(2026, 8, 5) + point.day * 86_400_000),
    label: point.label,
    day: Number(point.day.toFixed(2)),
    baseline: simulation.road.baselineMinutes,
    simulated: simulation.road.baselineMinutes + point.delay,
  }));
  return (
    <div className="impact-chart">
      <div className="chart-toolbar">
        <div className="chart-legend">
          <span className="baseline-key">Historical baseline</span>
          <span className="simulated-key">Closure scenario</span>
        </div>
      </div>
      <LineChart data={chartData} xDataKey="date" aspectRatio="2.35 / 1" margin={{ top: 14, right: 12, bottom: 12, left: 8 }}>
        <Grid horizontal vertical={false} numTicksRows={5} stroke="#cbd4d0" strokeDasharray="3,4" />
        <Line dataKey="baseline" stroke="#315c51" strokeWidth={2.5} fadeEdges={false} dashFromIndex={0} dashArray="5,4" />
        <Line dataKey="simulated" stroke="#b34b3f" strokeWidth={3} fadeEdges={false} showMarkers markers={{ radius: 4, fill: "#b34b3f", stroke: "#fff", strokeWidth: 2 }} />
        <ChartTooltip showDatePill={false} rows={(point) => [
          { color: "#315c51", label: "Historical baseline", value: `${point.baseline} min` },
          { color: "#b34b3f", label: `${point.label} · Day ${point.day}`, value: `${point.simulated} min` },
        ]} />
      </LineChart>
      <details className="chart-data"><summary>View planning chart data</summary><p>Municipal planning indicators, not a traversable closed-road ETA.</p><table><thead><tr><th scope="col">Phase</th><th scope="col">Baseline min</th><th scope="col">Scenario min</th></tr></thead><tbody>{chartData.map(point => <tr key={point.day}><th scope="row">{point.label} · Day {point.day}</th><td>{point.baseline}</td><td>{point.simulated}</td></tr>)}</tbody></table></details>
      <div className="chart-axis">
        {simulation.timeline.map((point) => (
          <span key={point.label}>
            {point.label}
            <small>Day {Number(point.day.toFixed(2))}</small>
          </span>
        ))}
      </div>
      <div className="chart-values">
        <span>{simulation.road.baselineMinutes} min baseline</span>
        <strong>{simulation.simulatedMinutes} min peak</strong>
      </div>
    </div>
  );
}
function Result({
  scenarioId,
  back,
  home,
}: {
  scenarioId: string;
  back: () => void;
  home: () => void;
}) {
  const { state, plannerRoadSegments } = useCityData();
  const [showNotice, setShowNotice] = useState(true);
  const scenario = state.scenarios[scenarioId];
  if (!scenario) return <><AppHeader title="Scenario unavailable" onBack={back} onHome={home}/><main className="page">Run the simulation again after resetting the demo.</main></>;
  const simulation = selectPlannerSimulation(scenario);
  const duration = scenario.duration;
  const numberFor = (id: string) => plannerRoadSegments.findIndex(road => road.id === id) + 1;
  const locations = [
    { road: simulation.road, number: numberFor(simulation.road.id), status: 'Full closure' },
    ...simulation.affected.map(item => ({ road: item.segment, number: numberFor(item.segment.id), status: `+${item.delay} min · ${item.severity} impact` })),
  ];
  return (
    <>
      <AppHeader
        title="Scenario result"
        subtitle={`${simulation.road.name} · ${duration}`}
        onBack={back}
        onHome={home}
      />
      <main className="page detail scenario-result">
        {showNotice && (
          <div className="simulation-notice" role="status">
            <span>
              <strong>Simulation complete</strong>
              <small>
                {simulation.road.name} · {duration} closure
              </small>
            </span>
            <button
              onClick={() => setShowNotice(false)}
              aria-label="Dismiss simulation notice"
            >
              <X />
            </button>
          </div>
        )}
        <section className="scenario-heading">
          <span>SCENARIO</span>
          <h1>{simulation.road.name}</h1>
          <p>{duration} full closure · deterministic network estimate</p>
        </section>
        <ProjectApproval scenarioId={scenarioId} />
        <PlannerMap locations={locations} selected={simulation.road.id} result/>
        <p className="planner-result-location"><b>{String(numberFor(simulation.road.id)).padStart(2, '0')}</b> {simulation.road.name} · Full closure</p>
        <div className="scenario-compare">
          <span>
            HISTORICAL<strong>{simulation.road.baselineMinutes} min</strong>
            <small>{simulation.road.baselineLevel} baseline</small>
          </span>
          <ArrowRight />
          <span>
            SIMULATED PEAK<strong>{simulation.simulatedMinutes} min</strong>
            <small>+{simulation.delay} min delay</small>
          </span>
        </div>
        <section className="network-impact">
          <SectionHeader title="Connected network impact" />
          <ul>
            {simulation.affected.map((item) => (
              <li key={item.segment.id}>
                <b className="planner-impact-number">{String(numberFor(item.segment.id)).padStart(2, '0')}</b>
                <span>
                  <strong>{item.segment.name}</strong>
                  <small>
                    +{item.additionalVehicles} vehicles/hr · +{item.delay} min
                  </small>
                </span>
                <b data-impact={item.severity.toLowerCase()}>{item.severity}</b>
              </li>
            ))}
          </ul>
        </section>
        <section className="timeline-section">
          <SectionHeader title="Baseline vs closure period" />
          <ImpactChart simulation={simulation} />
        </section>
        <section className="bus-impact">
          <BusFront />
          <div>
            <span>BUS IMPACT</span>
            <strong>{simulation.busRoutes.join(", ")}</strong>
            <small>
              Routes using the closed corridor or a connected transfer segment
            </small>
          </div>
        </section>
        <section className="data-basis">
          <span>DATA BASIS · {simulation.confidence.toUpperCase()}</span>
          <strong>
            {simulation.road.observedPasses.toLocaleString()} fleet passes
          </strong>
          <p>
            Planning estimate based on observed traffic, segment capacity and
            network connectivity. It is not a citywide prediction.
          </p>
        </section>
      </main>
    </>
  );
}
