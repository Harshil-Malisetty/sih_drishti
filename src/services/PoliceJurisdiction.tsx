import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { isPoliceJurisdictionId, matchInJurisdiction, policeJurisdictions, segmentInJurisdiction, type PoliceJurisdictionId } from '../domain/policeJurisdictions';
import { selectPoliceSummary, selectTrafficAnomalies } from '../domain/selectors';
import { reportRecipient } from '../domain/citizenReports';
import type { CityState } from '../types/city';
import { useCityData } from './useCityData';

const storageKey = 'drishti-police-jurisdiction';
function savedJurisdiction(): PoliceJurisdictionId {
  try { const value = sessionStorage.getItem(storageKey); return isPoliceJurisdictionId(value) ? value : 'all'; }
  catch { return 'all'; }
}
const PoliceJurisdictionContext = createContext<{ jurisdictionId: PoliceJurisdictionId; chooseJurisdiction: (id: PoliceJurisdictionId) => void }>({ jurisdictionId: 'all', chooseJurisdiction: () => {} });

export function PoliceJurisdictionProvider({ children, initialJurisdiction }: { children: ReactNode; initialJurisdiction?: PoliceJurisdictionId }) {
  const [jurisdictionId, setJurisdiction] = useState(initialJurisdiction ?? savedJurisdiction);
  const previousJurisdiction = useRef(jurisdictionId);
  useEffect(() => {
    if (previousJurisdiction.current === jurisdictionId) return;
    previousJurisdiction.current = jurisdictionId;
    // Scope changes intentionally close details. Return keyboard focus to the
    // new picker rather than losing it when the scoped workspace remounts.
    document.querySelector<HTMLSelectElement>('.jurisdiction-select select')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [jurisdictionId]);
  const chooseJurisdiction = (id: PoliceJurisdictionId) => {
    if (!isPoliceJurisdictionId(id)) return;
    setJurisdiction(id);
    try { sessionStorage.setItem(storageKey, id); } catch { /* Selection still works without browser storage. */ }
  };
  return <PoliceJurisdictionContext.Provider value={{ jurisdictionId, chooseJurisdiction }}>{children}</PoliceJurisdictionContext.Provider>;
}

export function usePoliceJurisdiction() {
  const context = useContext(PoliceJurisdictionContext);
  const jurisdiction = policeJurisdictions.find(item => item.id === context.jurisdictionId);
  return { ...context, jurisdiction, areaName: jurisdiction?.name || 'Citywide' };
}

// Presentation only. Retain the complete state for linked evidence and citywide
// team availability; filtering must never change workflow/dispatch commands.
export function selectPoliceScope(state: CityState, scope: PoliceJurisdictionId) {
  return {
    buses: Object.values(state.buses).filter(item => segmentInJurisdiction(item.roadSegmentId, scope)),
    incidents: Object.values(state.incidents).filter(item => segmentInJurisdiction(item.roadSegmentId, scope)),
    anomalies: selectTrafficAnomalies(state).filter(item => segmentInJurisdiction(item.roadSegmentId, scope)),
    citizenReports: Object.values(state.citizenReports).filter(item => reportRecipient(item.category) === 'police' && segmentInJurisdiction(item.roadSegmentId, scope)),
    policeSummary: selectPoliceSummary(state, scope),
  };
}

export function usePoliceData() {
  const data = useCityData();
  const { jurisdictionId } = usePoliceJurisdiction();
  return useMemo(() => ({ ...data, ...selectPoliceScope(data.state, jurisdictionId), watchlist: data.watchlist.filter(item => matchInJurisdiction(item, jurisdictionId)) }), [data, jurisdictionId]);
}