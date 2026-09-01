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
| `GET /api/incidents` | `Incident[]` | `incidentsService` |
| `GET /api/watchlist/matches` | `WatchlistMatch[]` | `watchlistService` |
| `GET /api/municipal/defects` | `RoadDefect[]` | `municipalService` |
| `POST /api/municipal/simulations` | `ConstructionSimulation` | `municipalService` |
| `GET /api/traffic` | `TrafficObservation[]` | `trafficService` |
| `GET /api/map/buses` | `Bus[]` | `mapService` |

Responses will mirror the TypeScript contracts in `src/types`. Edge devices should submit event metadata, a representative frame or short clip, source bus, GPS and timestamps—not continuous video.