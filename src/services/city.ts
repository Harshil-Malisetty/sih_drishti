import { createCitySeed } from '../data/demo/citySeed';
import { createCityStore } from '../domain/cityStore';

// The browser session has exactly one domain store; changing roles never recreates it.
// Landing/import time is NOT login time. Call cityStore.startBrowserSession() on
// first sign-in AND restored-role entry, before workspace reads. A reload starts
// a fresh demo; role switches must never call reset(). No auth/backend is implied.
export const cityStore = createCityStore(createCitySeed());