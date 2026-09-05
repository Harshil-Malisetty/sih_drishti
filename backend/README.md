# Future backend architecture

This directory is intentionally documentation-only in the frontend prototype.

- `api/` HTTP application and versioned endpoints
- `models/` persistence entities
- `services/` domain logic and integrations
- `inference/` contracts for edge-event ingestion and future model orchestration
- `database/` migrations and repositories
- `routes/` route registration and authorization policies
- `schemas/` validated request/response models
- `config/` environment configuration
- `tests/` API and service tests

## Planned endpoints

| Endpoint | Response | Frontend consumer |
|---|---|---|
| `GET /api/incidents` | `Incident[]` | `incidentsService.getIncidents` |
| `GET /api/incidents/:id` | `Incident` with `VehicleTrack` and pipeline events | `incidentsService.getIncident` |
| `GET /api/watchlist` | `WatchlistEntry[]` | `watchlistService.getWatchlist` |
| `GET /api/watchlist/matches` | `WatchlistMatch[]` | `watchlistService.getWatchlistMatches` |
| `GET /api/watchlist/matches/:id` | Match with `FleetObservation[]` | `watchlistService.getWatchlistMatch` |
| `PATCH /api/watchlist/matches/:id` | Officer decision: verified or dismissed | future verification service |
| `GET /api/municipal/defects` | `RoadDefect[]` | `municipalService.getRoadDefects` |
| `GET /api/municipal/defects/:id` | Defect with observations and repair event | `municipalService.getRoadDefect` |
| `GET /api/municipal/road-risk` | `RoadRisk[]` | `municipalService.getRoadRisk` |
| `POST /api/municipal/construction/simulate` | `PlanningScenario` input/result snapshot and draft project | `municipalService.runConstructionSimulation` |
| `GET /api/municipal/map` | Filterable municipal GIS records | `municipalService.getMunicipalMapData` |
| `GET /api/traffic` | `TrafficObservation[]` | `trafficService.getTrafficData` |
| `GET /api/traffic/segments/:id` | `TrafficObservation` | `trafficService.getSegment` |
| `GET /api/citizen/map` | `CitizenMapData` | `citizenService.getMapData` |
| `GET /api/alerts` | `CitizenAlert[]` | `citizenService.getAlerts` |
| `POST /api/routes/recommend` | `CitizenJourney` (nullable times when a candidate is blocked) | `citizenService.recommendRoute` |
| `GET /api/fleet/buses` | `Bus[]` | `mapService` |

Responses mirror the contracts in `src/types`. Citizen responses expose public road conditions and journey guidance only; they exclude faces, registrations, watchlists, confidence scores and internal source-bus identifiers. Route recommendations are advisory prototype outputs, not turn-by-turn navigation. An incident detail response includes location, source bus and route, ANPR confidence, evidence reference, and ordered pipeline events. A watchlist match includes zero or more geolocated fleet observations. A road defect includes longitudinal observations and an optional repair verification event. Construction requests contain road, start date and duration; responses contain network impacts and a weekly progression.

Edge devices should submit event metadata, a representative frame or short clip, source bus, GPS and timestamps—not continuous video. Predictions and confidence scores require explicit provenance. Watchlist decisions remain human actions and must later be authenticated and audited.

## Implemented frontend domain boundary

The backend is still documentation-only. The promise-based service methods now operate on one immutable, observable in-memory city store rather than unrelated fixture arrays. Future HTTP adapters should return the same typed objects and feed the same shared snapshot/subscription boundary; do not add per-screen caches as another source of truth.

Canonical contracts live in `src/types/city.ts`. Roads and segments have different IDs: for example, `gst` is a road, while `gst` (planning corridor south of Guindy) and `gst-saidapet` (Citizen's northern corridor) are distinct segment records. Similar display names do not imply identical observations. Traffic counts and comparison baselines use the same explicitly specified measurement window. Public traffic DTOs include `roadSegmentId`, `observationId`, `observedAt` and `windowMinutes` without internal bus IDs.

New service commands (no new server endpoints are implemented):

- `municipalService.assign`, `acknowledge`, `startFieldWork`: appropriate departmental ownership for every existing issue kind.
- `workflowService.submitResolution`, `getPendingReviews`, `reviewResolution`: evidence submission atomically creates an admin review/notification; verification closes an issue, return-for-action reopens field work. Public conditions remain unchanged until verified.
- `policeTrafficService.qualify`, `requestDispatch`, `assign`, `advanceDispatch`: candidate anomaly → qualified → requested → assigned → en route → on scene. Resolution uses the same review primitives. Closure requires a later normalizing observation.
- `municipalService.runConstructionSimulation({roadSegmentId,duration,startsAt?})`: stores a versioned input/result snapshot and draft project. Supported duration presets include three days as well as the existing UI presets. The current UI still exposes only its existing presets.
- `municipalService.approveProject`, `cancelProject`: explicit approval publishes a project; draft, cancelled, future and expired impacts never appear as active Citizen restrictions.
- `citizenService.getMobilityContext`, `recommendRoute`: derived public projections. Candidate route legs reference canonical segments; these are advisory demo candidates, not a citywide routing engine. Route-leg fractions represent the sampled portion of a corridor, not inferred geometry.
- `roadsService`: canonical road and segment lookup; `trafficService.getObservations`: internal observation history.

Commands reject invalid transitions and unknown references without partial writes. Repeated identical assignment, review, approval and dispatch requests are idempotent where applicable. All assets/actors are synthetic demo fixtures. Clock advance/reset helpers are demo-only controls and must not become production client authority. No authentication, emergency-team simulator, ML or persistence infrastructure has been added.

Compatibility: existing list/detail/map service names remain. The former fixed `ConstructionSimulation` response is superseded by `PlanningScenario`; the active charts use a presentation adapter over that snapshot. The former non-null `CitizenRoute` view is superseded by `CitizenJourney`. Existing risk/fleet summary fields remain, derived from actual scoped demo records rather than independent constants.