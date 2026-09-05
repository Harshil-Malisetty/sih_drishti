import { useMemo, useSyncExternalStore } from 'react';
import { cityStore } from './city';
import { selectCitizenAlerts, selectCitizenContext, selectCitizenRoute, selectIssues, selectPlannerRoads, selectPoliceAssignments, selectPoliceSummary, selectTraffic, selectWatchlist } from '../domain/selectors';

export function useCityData() {
  const state = useSyncExternalStore(cityStore.subscribe, cityStore.getSnapshot, cityStore.getSnapshot);
  return useMemo(() => ({
    state, buses: Object.values(state.buses), incidents: Object.values(state.incidents),
    watchlist: selectWatchlist(state), defects: selectIssues(state), plannerRoadSegments: selectPlannerRoads(state),
    traffic: selectTraffic(state), alerts: selectCitizenAlerts(state), route: selectCitizenRoute(state),
    mobility: selectCitizenContext(state), assignments: selectPoliceAssignments(state), policeSummary: selectPoliceSummary(state),
  }), [state]);
}