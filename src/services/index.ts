import { buses, citizenAlerts, citizenRoute, constructionSimulation, defects, incidents, roadRisks, traffic, watchlist } from '../data/demo';
const delay=<T,>(data:T)=>Promise.resolve(data);
export const incidentsService={getIncidents:()=>delay(incidents),getIncident:(id:string)=>delay(incidents.find(x=>x.id===id))};
export const watchlistService={getWatchlist:()=>delay(watchlist),getWatchlistMatches:()=>delay(watchlist),getWatchlistMatch:(id:string)=>delay(watchlist.find(x=>x.id===id))};
export const municipalService={getRoadDefects:()=>delay(defects),getRoadDefect:(id:string)=>delay(defects.find(x=>x.id===id)),getRoadRisk:()=>delay(roadRisks),getMunicipalMapData:()=>delay(defects),runConstructionSimulation:()=>delay(constructionSimulation)};
export const trafficService={getTrafficData:()=>delay(traffic),getSegment:(id:string)=>delay(traffic.find(x=>x.id===id))};
export const citizenService={getMapData:()=>delay({traffic,alerts:citizenAlerts}),getAlerts:()=>delay(citizenAlerts),recommendRoute:()=>delay(citizenRoute)};
export const mapService={getBuses:()=>delay(buses)};
export const analyticsService={getFleetSummary:()=>delay({activeBuses:238,eventsToday:128,coverage:'82%'})};
