# Drishti — Mobile Urban Intelligence

A mobile-first SIH frontend prototype that turns public transport fleets into moving city sensors. It includes navigable Police, Municipal and Citizen experiences powered by centralized structured demo data.

## Run

1. `npm install`
2. `npm run dev`
3. Open the local URL; use browser device mode at 390 × 844 for the intended presentation.
4. `npm run build` validates the production build.

## Structure

- `src/components` shared application UI, cards and GIS-style map
- `src/data/demo` centralized simulated Chennai data
- `src/navigation` role navigation configuration
- `src/services` future API boundary (currently returns demo data)
- `src/types` shared data contracts
- `src/pages` role pages
- `backend/README.md` planned backend architecture and endpoint contracts

All records are simulated demonstration data. Remote images are presentation placeholders. No live surveillance or inference service is connected.

## Next stage

Connect authenticated APIs, add a production GIS provider and offline tiles, implement evidence authorization/audit workflows, ingest signed edge-event payloads, add test coverage and replace remote placeholder imagery with approved evidence fixtures.