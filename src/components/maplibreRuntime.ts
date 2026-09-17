import { Map, Marker, Popup, NavigationControl, AttributionControl, setWorkerUrl, setWorkerCount } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
// Bundle the worker's imports too; emitting an unbundled worker breaks production.
setWorkerUrl(workerUrl);
setWorkerCount(2);
export { Map, Marker, Popup, NavigationControl, AttributionControl };