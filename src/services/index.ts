import { buses, defects, incidents, traffic, watchlist } from '../data/demo';
const delay=<T,>(data:T)=>Promise.resolve(data);
export const incidentsService={getIncidents:()=>delay(incidents),getById:(id:string)=>delay(incidents.find(x=>x.id===id))};
export const watchlistService={getMatches:()=>delay(watchlist)};
export const municipalService={getRoadDefects:()=>delay(defects),getConstructionSimulation:()=>delay({congestionIncrease:24,affectedRoads:6,highRiskSegments:2})};
export const trafficService={getTrafficData:()=>delay(traffic)};
export const mapService={getBuses:()=>delay(buses)};
export const analyticsService={getFleetSummary:()=>delay({activeBuses:238,eventsToday:128,coverage:'82%'})};
