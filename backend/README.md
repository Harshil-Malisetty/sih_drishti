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
| `POST /api/municipal/construction/simulate` | `ConstructionSimulation` | `municipalService.runConstructionSimulation` |
| `GET /api/municipal/map` | Filterable municipal GIS records | `municipalService.getMunicipalMapData` |
| `GET /api/traffic` | `TrafficObservation[]` | `trafficService.getTrafficData` |
| `GET /api/traffic/segments/:id` | `TrafficObservation` | `trafficService.getSegment` |
| `GET /api/citizen/map` | `CitizenMapData` | `citizenService.getMapData` |
| `GET /api/alerts` | `CitizenAlert[]` | `citizenService.getAlerts` |
| `POST /api/routes/recommend` | `CitizenRoute` | `citizenService.recommendRoute` |
| `GET /api/fleet/buses` | `Bus[]` | `mapService` |

Responses mirror the contracts in `src/types`. Citizen responses expose public road conditions and journey guidance only; they exclude faces, registrations, watchlists, confidence scores and internal source-bus identifiers. Route recommendations are advisory prototype outputs, not turn-by-turn navigation. An incident detail response includes location, source bus and route, ANPR confidence, evidence reference, and ordered pipeline events. A watchlist match includes zero or more geolocated fleet observations. A road defect includes longitudinal observations and an optional repair verification event. Construction requests contain road, start date and duration; responses contain network impacts and a weekly progression.

Edge devices should submit event metadata, a representative frame or short clip, source bus, GPS and timestamps—not continuous video. Predictions and confidence scores require explicit provenance. Watchlist decisions remain human actions and must later be authenticated and audited.