import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ArrowRight,
  BusFront,
  CalendarCheck,
  Construction,
  MapPin,
  X,
} from "lucide-react";
import { useCityData } from "../services/useCityData";
import { municipalService } from "../services";
import { selectPlannerSimulation } from "../domain/planning";
import type { PlannerRoadSegment, RoadDefect, Severity } from "../types";
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
import { Bar } from "../components/charts/bar";
import { BarChart } from "../components/charts/bar-chart";
import { BarXAxis } from "../components/charts/bar-x-axis";
import { Grid } from "../components/charts/grid";
import { Line, LineChart } from "../components/charts/line-chart";
import { ChartTooltip } from "../components/charts/tooltip";
import { MunicipalWorkflow } from "../components/MunicipalWorkflow";
import { MunicipalTasks } from "../components/MunicipalTasks";
import { ProjectApproval } from "../components/ProjectApproval";
import { EmergencyDispatchPanel } from "../components/EmergencyDispatchPanel";
import { selectEventResolution } from "../domain/operations";
import type { MunicipalTask } from "../types/city";

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
  const open = (view: View) => {
    setStack((s) => [...s, view]);
    history.pushState({ municipal: true }, "");
  };
  const back = () => history.back();
  const home = () => {
    setStack([]);
    navigate("overview");
  };
  useEffect(() => {
    const pop = () => setStack((s) => s.slice(0, -1));
    const reset = () => setStack([]);
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
        subtitle="Chennai Zone Network · Live"
        onHome={home}
        onExit={exit}
      />
      <main>
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
            duration={planningDuration}
            onRoad={setPlanningRoad}
            onDuration={setPlanningDuration}
            run={() => {
              setPlanningError("");
              void municipalService.runConstructionSimulation({ roadSegmentId: planningRoad, duration: planningDuration })
                .then(scenario => open({ kind: "result", scenarioId: scenario.id }))
                .catch(error => setPlanningError(error instanceof Error ? error.message : "Unable to run simulation"));
            }}
          />
        )}
        {planningError && <p role="alert">{planningError}</p>}
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
  const { defects, plannerRoadSegments } = useCityData();
  const openIssues = defects.filter((item) => item.workflowStage !== "Closed");
  const criticalIssues = defects.filter((item) => item.severity === "Critical");
  const infrastructureIssues = defects.filter(
    (item) => item.category === "Infrastructure",
  );
  const pendingIssues = defects.filter(
    (item) => item.status === "Pending Verification",
  );
  const totalEvidence = defects.reduce(
    (total, item) => total + item.detectionCount,
    0,
  );
  const reportingBuses = new Set(defects.flatMap((item) => item.busIds)).size;
  const corridorCoverage = plannerRoadSegments.map((segment) => ({
    corridor: segment.name.split(" · ")[0].replace(" Road", ""),
    passes: segment.observedPasses,
  }));
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
  return (
    <div className="page municipal-overview">
      <PageIntro
        eyebrow="MUNICIPAL OPERATIONS · LIVE REGISTER"
        title="City Road Health"
      />
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
          <strong>{totalEvidence} observations in the active register</strong>
          <span>
            {reportingBuses} buses · {defects.length} tracked locations
          </span>
        </div>
      </div>
      <MunicipalTasks onOpen={openTask} />
      <section className="operations-brief">
        <div className="observation-trend">
          <header>
            <span>MUNICIPAL FLEET OBSERVATION COVERAGE</span>
            <strong>
              {plannerRoadSegments.length} <small>sampled corridors</small>
            </strong>
          </header>
          <BarChart data={corridorCoverage} xDataKey="corridor" aspectRatio="2.65 / 1" margin={{ top: 12, right: 8, bottom: 38, left: 8 }} barGap={0.28}>
            <Grid horizontal vertical={false} numTicksRows={4} stroke="#d7dfdc" strokeDasharray="3,4" />
            <Bar dataKey="passes" fill="#315c51" lineCap={3} />
            <BarXAxis maxLabels={4} tickerHalfWidth={34} />
            <ChartTooltip showDatePill={false} rows={(point) => [{ color: "#315c51", label: "Observed fleet passes", value: Number(point.passes) }]} />
          </BarChart>
        </div>
        <div className="geographic-pressure">
          <header>
            <span>PRIORITY LOCATIONS</span>
            <button onClick={() => go("map")}>
              Open map <ArrowRight />
            </button>
          </header>
          {priorities.map((item) => (
            <button key={item.id} onClick={() => open(item)}>
              <i
                data-tone={
                  item.severity === "Critical"
                    ? "high"
                    : item.severity === "High"
                      ? "medium"
                      : "low"
                }
              />
              <span>
                <strong>{item.location}</strong>
                <small>{item.defectType}</small>
              </span>
              <b>{item.status}</b>
            </button>
          ))}
        </div>
      </section>
      <SectionHeader
        title="Priority evidence"
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
  const { defects } = useCityData();
  const visible = defects.filter(
    (x) => filter === "All" || x.category === filter,
  );
  return (
    <div className="page">
      <PageIntro
        eyebrow="FLEET OBSERVATIONS · UPDATED 18:45"
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
              {x.category.toUpperCase()} · FLEET EVIDENCE
            </span>
            <h1>{x.defectType}</h1>
            <p>
              <MapPin /> {x.location}
            </p>
          </div>
          <SeverityBadge value={x.severity} />
        </div>
        <div className="road-frame">
          <img
            src={latest?.image || x.image}
            alt={`${x.defectType} latest observation`}
          />
          <span>LATEST EVIDENCE</span>
          <em>
            {x.lastSeen} · {latest?.busId || x.busIds.at(-1)}
          </em>
        </div>
        <Surface className="detail-facts">
          <div>
            <span>First observed</span>
            <strong>{x.firstSeen}</strong>
          </div>
          <div>
            <span>Latest observation</span>
            <strong>{x.lastSeen}</strong>
          </div>
          <div>
            <span>Current status</span>
            <strong>{x.status}</strong>
          </div>
          <div>
            <span>Fleet evidence</span>
            <strong>
              {x.detectionCount} observations · {x.busIds.length} buses
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
        <MunicipalWorkflow issueId={id} />
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
        {hasProgression && (
          <button className="primary full" onClick={lifecycle}>
            Open {x.progressionTitle?.toLowerCase() || "condition progression"}{" "}
            <ArrowRight />
          </button>
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
          eyebrow="FLEET-DERIVED CONDITION HISTORY"
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
    label: `${x.defectType} · ${x.location}`,
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
            {item.severity.toUpperCase()} · {item.category.toUpperCase()}
          </span>
          <h3>{item.defectType}</h3>
          <p>
            {item.location} · {item.status}
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
  duration,
  onRoad,
  onDuration,
  run,
}: {
  selected: string;
  duration: string;
  onRoad: (id: string) => void;
  onDuration: (value: string) => void;
  run: () => void;
}) {
  const { plannerRoadSegments } = useCityData();
  const road =
    plannerRoadSegments.find((segment) => segment.id === selected) ||
    plannerRoadSegments[0];
  return (
    <div className="page planning-page">
      <PageIntro
        eyebrow="MAP-FIRST NETWORK SCENARIO"
        title="Urban Planning & What-If"
      />
      <div className="planning-instruction">
        <strong>Select a road on the map</strong>
        <span>Tap a corridor to configure its closure</span>
      </div>
      <ScenarioMap selected={selected} onSelect={onRoad} />
      <section className="selected-road">
        <span>SELECTED ROAD</span>
        <strong>{road.name}</strong>
        <small>
          {road.baselineLevel} traffic · {road.baselineMinutes} min baseline ·{" "}
          {road.observedPasses.toLocaleString()} observed passes
        </small>
      </section>
      <Surface className="form">
        <label>
          Closure / construction duration
          <select
            value={duration}
            onChange={(event) => onDuration(event.target.value)}
          >
            <option>3 days</option>
            <option>2 weeks</option>
            <option>8 weeks</option>
            <option>4 months</option>
          </select>
        </label>
        <button className="primary full" onClick={run}>
          <Construction /> Run simulation
        </button>
      </Surface>
    </div>
  );
}
function ScenarioMap({
  selected,
  onSelect,
  simulation,
}: {
  selected: string;
  onSelect?: (id: string) => void;
  simulation?: PlannerSimulation;
}) {
  const { plannerRoadSegments } = useCityData();
  const host = useRef<HTMLDivElement>(null),
    map = useRef<L.Map | null>(null),
    layer = useRef<L.LayerGroup | null>(null);
  useEffect(() => {
    if (!host.current || map.current) return;
    map.current = L.map(host.current, { zoomControl: false }).setView(
      [13.02, 80.239],
      13,
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => {
      map.current?.remove();
      map.current = null;
      layer.current = null;
    };
  }, []);
  useEffect(() => {
    if (!layer.current || !map.current) return;
    layer.current.clearLayers();
    const affectedById = new Map(
      simulation?.affected.map((item) => [item.segment.id, item]),
    );
    plannerRoadSegments.forEach((road) => {
      const active = road.id === selected;
      const affected = affectedById.get(road.id);
      const choose = () => onSelect?.(road.id);
      const color = active
        ? "#a93632"
        : affected?.severity === "Severe"
          ? "#7a2d35"
          : affected?.severity === "High"
            ? "#d07727"
            : affected
              ? "#d5a33c"
              : "#547069";
      const weight = active ? 11 : affected ? 8 : 5;
      L.polyline(road.points, {
        color,
        weight,
        opacity: active || affected?.severity ? 1 : 0.58,
        dashArray: active && simulation ? "10 7" : undefined,
      })
        .bindTooltip(
          active
            ? `${road.name} · ${simulation ? "CLOSED" : "SELECTED"}`
            : affected
              ? `${road.name} · ${affected.severity} · +${affected.delay} min`
              : road.name,
        )
        .addTo(layer.current!);
      if (onSelect)
        L.polyline(road.points, { color: "#000", weight: 22, opacity: 0 })
          .on("click", choose)
          .addTo(layer.current!);
      if (active) {
        const anchor = road.points[Math.floor(road.points.length / 2)];
        L.marker(anchor, {
          title: road.name,
          alt: road.name,
          keyboard: true,
          icon: L.divIcon({
            className: "scenario-road-label active",
            html: `<span>${simulation ? "CLOSED" : "SELECTED"} · ${road.name.split(" · ")[0]}</span>`,
            iconSize: [150, 34],
            iconAnchor: [75, 17],
          }),
        })
          .on("click", choose)
          .addTo(layer.current!);
      }
    });
    const relevant = simulation
      ? [simulation.road, ...simulation.affected.map((item) => item.segment)]
      : plannerRoadSegments;
    map.current.fitBounds(
      L.latLngBounds(relevant.flatMap((road) => road.points)),
      { padding: [30, 30], maxZoom: 14, animate: false },
    );
  }, [selected, onSelect, simulation]);
  return (
    <div
      className="scenario-map"
      ref={host}
      aria-label={
        simulation
          ? "Closed road and affected road network"
          : "Selectable road network map"
      }
    />
  );
}
function ImpactChart({ simulation }: { simulation: PlannerSimulation }) {
  const chartData = simulation.timeline.map((point) => ({
    date: new Date(2026, 0, point.day + 1),
    label: point.label,
    day: point.day,
    baseline: simulation.road.baselineMinutes,
    simulated: simulation.road.baselineMinutes + point.delay,
  }));
  return (
    <div className="impact-chart">
      <div className="chart-toolbar">
        <div className="chart-legend">
          <span className="baseline-key">Observed baseline</span>
          <span className="simulated-key">Closure scenario</span>
        </div>
      </div>
      <LineChart data={chartData} xDataKey="date" aspectRatio="2.35 / 1" margin={{ top: 14, right: 12, bottom: 12, left: 8 }}>
        <Grid horizontal vertical={false} numTicksRows={5} stroke="#cbd4d0" strokeDasharray="3,4" />
        <Line dataKey="baseline" stroke="#315c51" strokeWidth={2.5} fadeEdges={false} dashFromIndex={0} dashArray="5,4" />
        <Line dataKey="simulated" stroke="#b34b3f" strokeWidth={3} fadeEdges={false} showMarkers markers={{ radius: 4, fill: "#b34b3f", stroke: "#fff", strokeWidth: 2 }} />
        <ChartTooltip showDatePill={false} rows={(point) => [
          { color: "#315c51", label: "Observed baseline", value: `${point.baseline} min` },
          { color: "#b34b3f", label: `${point.label} · Day ${point.day}`, value: `${point.simulated} min` },
        ]} />
      </LineChart>
      <div className="chart-axis">
        {simulation.timeline.map((point) => (
          <span key={point.label}>
            {point.label}
            <small>Day {point.day}</small>
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
  const { state } = useCityData();
  const [showNotice, setShowNotice] = useState(true);
  const scenario = state.scenarios[scenarioId];
  if (!scenario) return <><AppHeader title="Scenario unavailable" onBack={back} onHome={home}/><main className="page">Run the simulation again after resetting the demo.</main></>;
  const simulation = selectPlannerSimulation(scenario);
  const duration = scenario.duration;
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
        <ScenarioMap selected={simulation.road.id} simulation={simulation} />
        <div className="scenario-compare">
          <span>
            OBSERVED<strong>{simulation.road.baselineMinutes} min</strong>
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
