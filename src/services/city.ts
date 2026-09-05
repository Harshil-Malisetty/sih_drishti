import { createCitySeed } from '../data/demo/citySeed';
import { createCityStore } from '../domain/cityStore';

// The browser session has exactly one domain store; changing roles never recreates it.
// A page reload intentionally resets the deterministic demo. No auth or backend is implied.
export const cityStore = createCityStore(createCitySeed());