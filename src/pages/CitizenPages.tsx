import { useEffect, useState } from 'react';
import { ArrowDown, ArrowRight, Clock3, CloudRain, LocateFixed, Navigation, Route, TrafficCone, TrendingUp } from 'lucide-react';
import type { CitizenAlert, TrafficObservation } from '../types';
import type { CitizenJourney, PublicMunicipalProject, PublicRoadCondition } from '../types/city';
import { useCityData } from '../services/useCityData';
import { formatDemoTime } from '../domain/time';
import { BottomSheet, MapLegend, MapView, type MapMarker } from '../components/MapView';
import { CitizenProjectPicker, CitizenProjectSheet, CitizenRouteProjects, CitizenWorkCard } from '../components/CitizenProjectContext';
import { AppHeader, EmptyState, PageIntro, SectionHeader, SeverityBadge, Surface } from '../components/ui';

export default function CitizenPages({page,navigate,exit}:{page:string;navigate:(x:string)=>void;exit:()=>void}){
 const {traffic,alerts,route,mobility}=useCityData();
 const [selectedId,setSelectedId]=useState<string|undefined>(()=>traffic[0]?.id);
 const [selectedProjectId,setSelectedProjectId]=useState<string>();
 const [routeDetail,setRouteDetail]=useState(false);
 const selectedProject=mobility.projects.find(project=>project.projectId===selectedProjectId&&project.status!=='Completed');
 useEffect(()=>setRouteDetail(false),[page]);
 useEffect(()=>{if(route.alternativeMinutes===null)setRouteDetail(false)},[route.alternativeMinutes]);
 useEffect(()=>{if(selectedProjectId&&!selectedProject)setSelectedProjectId(undefined)},[selectedProjectId,selectedProject]);
 useEffect(()=>{const home=()=>setRouteDetail(false);addEventListener('workspace-home',home);return()=>removeEventListener('workspace-home',home)},[]);
 const selectTraffic=(id:string)=>{setSelectedId(id);setSelectedProjectId(undefined)};
 const openProject=(projectId:string)=>{setSelectedProjectId(projectId);navigate('map')};
 const dismissProject=()=>{
  setSelectedProjectId(undefined);
  if(selectedProjectId)document.getElementById(`citizen-project-${selectedProjectId}`)?.focus({preventScroll:true});
 };
 if(page==='routes'&&routeDetail&&route.alternativeMinutes!==null)return <><AppHeader title="Route details" subtitle={`Simulated journey estimate · Updated ${formatDemoTime(mobility.asOf)}`} onBack={()=>setRouteDetail(false)}/><main><RouteDetail route={route} projects={mobility.projects} openProject={openProject}/></main></>;
 return <><AppHeader title="Citizen Mobility" subtitle={`Chennai · Updated ${formatDemoTime(mobility.asOf)}`} onExit={exit}/><main>
  {page==='traffic'&&<TrafficHome traffic={traffic} alerts={alerts} projects={mobility.projects} selectedId={selectedId} openProject={openProject} openMap={()=>navigate('map')} selectMarker={id=>{selectTraffic(id);navigate('map')}} openAlerts={()=>navigate('alerts')}/>}
  {page==='map'&&<TrafficMap traffic={traffic} projects={mobility.projects} selectedId={selectedId} selectedProject={selectedProject} onSelect={selectTraffic} onSelectProject={setSelectedProjectId} dismissProject={dismissProject} findRoute={()=>navigate('routes')}/>}
  {page==='routes'&&<Routes route={route} projects={mobility.projects} openProject={openProject} view={()=>{if(route.alternativeMinutes!==null)setRouteDetail(true)}}/>}
  {page==='alerts'&&<Alerts alerts={alerts} conditions={mobility.conditions}/>}
 </main></>;
}

const markers=(traffic:TrafficObservation[]):MapMarker[]=>traffic.map(x=>({id:x.id,type:'traffic',x:x.mapX,y:x.mapY,label:`${x.road}, ${x.densityLevel} traffic`,detail:x.densityLevel}));

function TrafficHome({traffic,alerts,projects,selectedId,openMap,selectMarker,openAlerts,openProject}:{traffic:TrafficObservation[];alerts:CitizenAlert[];projects:PublicMunicipalProject[];selectedId?:string;openMap:()=>void;selectMarker:(id:string)=>void;openAlerts:()=>void;openProject:(projectId:string)=>void}){const main=traffic.find(item=>item.id===selectedId)||traffic[0];return <div className="citizen-home"><div className="city-greeting"><span>CITY MOBILITY</span><h1>Current traffic</h1><p>Live conditions from the city's public transport sensing network.</p></div><div className="home-map"><MapView markers={markers(traffic)} selected={selectedId} onSelect={selectMarker} mode="traffic"><MapLegend mode="traffic"/><button className="map-open" onClick={openMap}>Explore map <ArrowRight/></button><div className="traffic-summary"><span>TRAFFIC STATUS<strong>{main?.densityLevel??'Unavailable'}</strong></span><span>LAST UPDATED<strong>{main?.timestamp??'Unavailable'}</strong></span></div></MapView></div><CitizenWorkCard projects={projects} openProject={openProject}/><div className="nearby"><SectionHeader title="Nearby conditions" action="View alerts" onAction={openAlerts}/>{alerts.map(a=><div className="nearby-row" key={a.id}><i className={a.type.toLowerCase()}>{a.type==='Waterlogging'?<CloudRain/>:<TrafficCone/>}</i><div><strong>{a.title}</strong><span>{a.location}</span></div><b>{a.distance}</b></div>)}</div></div>}

function TrafficMap({traffic,projects,selectedId,selectedProject,onSelect,onSelectProject,dismissProject,findRoute}:{
 traffic:TrafficObservation[];projects:PublicMunicipalProject[];selectedId?:string;selectedProject?:PublicMunicipalProject;
 onSelect:(id:string)=>void;onSelectProject:(projectId:string)=>void;dismissProject:()=>void;findRoute:()=>void;
}){
 const selected=selectedId??traffic[0]?.id;
 const segment=traffic.find(x=>x.id===selected);
 const activeProjects=projects.filter(project=>project.status==='Active');
 // Reuse only known schematic road positions, with one marker per traffic position.
 // The picker remains available for additional projects on the same road and unmapped roads.
 const mapMarkers=markers(traffic).map((marker,index):MapMarker=>{
  const roadSegmentId=traffic[index].roadSegmentId;
  const project=activeProjects.find(item=>item.projectId===selectedProject?.projectId&&item.roadSegmentId===roadSegmentId)
   ??activeProjects.find(item=>item.roadSegmentId===roadSegmentId);
  return project?{id:`project-${project.projectId}`,type:'infrastructure',x:marker.x,y:marker.y,label:`${project.title}, ${project.roadName}, active approved municipal work. Show project details`}:marker;
 });
 const selectedMarker=selectedProject?`project-${selectedProject.projectId}`:selected;
 return <div className="map-page citizen-full-map"><MapView markers={mapMarkers} selected={selectedMarker} onSelect={id=>{
  const project=activeProjects.find(item=>`project-${item.projectId}`===id);
  if(project)onSelectProject(project.projectId);else onSelect(id);
 }} mode="traffic">
  <MapLegend mode="traffic"/>
  <CitizenProjectPicker projects={projects} selectedProjectId={selectedProject?.projectId} onSelect={onSelectProject}/>
  {selectedProject?<CitizenProjectSheet project={selectedProject} hasMarker={mapMarkers.some(marker=>marker.id===selectedMarker)} onDismiss={dismissProject} findRoute={findRoute}/>:segment&&<BottomSheet eyebrow={`${segment.road.toUpperCase()} · UPDATED ${segment.timestamp}`} title={`${segment.densityLevel} traffic`} action={segment.id==='TR-1'?'Find a better route':undefined} onAction={segment.id==='TR-1'?findRoute:undefined}><div className="traffic-facts"><span>Vehicle density<strong>{segment.densityLevel==='Severe'?'Very high':segment.densityLevel}</strong></span><span>Average speed<strong>{segment.averageSpeed} km/h</strong></span><span>Trend<strong><TrendingUp/> {segment.trend}</strong></span></div><p className="fleet-source">Why is this shown? <strong>Observed by public transport fleet</strong></p><small>Recommended: {segment.recommendedAction}</small></BottomSheet>}
 </MapView></div>;
}

function Routes({route,projects,openProject,view}:{route:CitizenJourney;projects:PublicMunicipalProject[];openProject:(projectId:string)=>void;view:()=>void}){
 const saving=route.currentMinutes!==null&&route.alternativeMinutes!==null?route.currentMinutes-route.alternativeMinutes:null;
 const faster=saving!==null&&saving>0;
 const recommended=route.alternativeMinutes!==null&&(route.currentMinutes===null||faster);
 return <div className="page"><PageIntro eyebrow="PUBLIC MOBILITY ADVISORY" title={recommended?'A better route':'Route options'} text={`From ${route.origin} to ${route.destination}`}/>
  <div className="route-saving"><span>{faster?'SAVE':'SAVINGS'}</span><strong>{faster?`${saving} min`:saving===null?'Unavailable':'No time saved'}</strong></div>
  <div className="route-compare"><div className="route old"><i/><div><span>Current route</span><strong>{route.currentMinutes===null?'Unavailable':`${route.currentMinutes} min`}</strong><small>Via {route.currentVia} · {route.currentTraffic} traffic</small></div></div><div className={`route${recommended?' recommended':''}`}><i/><div><span>{recommended?'Recommended':'Alternative'} · Route B</span><strong>{route.alternativeMinutes===null?'Unavailable':`${route.alternativeMinutes} min`}</strong><small>Via {route.via}</small></div><b>{route.traffic}</b></div></div>
  <Surface className="route-reason"><Navigation/><div><strong>{recommended?'Why this route?':'Route availability'}</strong><p>{route.reason}</p><CitizenRouteProjects projects={projects} projectIds={route.projectIds} openProject={openProject}/></div></Surface>
  {route.alternativeMinutes===null&&<p role="status">{route.currentMinutes===null?'Both demo routes are unavailable. No open route can be recommended.':'The alternative route is unavailable.'} Follow local traffic advisories; no other route has been calculated.</p>}
  <button className="primary full" onClick={view} disabled={route.alternativeMinutes===null} style={{minHeight:44}}>View route <ArrowRight/></button><p className="disclaimer">Demo recommendation only. This prototype does not replace turn-by-turn navigation.</p>
 </div>;
}

function RouteDetail({route,projects,openProject}:{route:CitizenJourney;projects:PublicMunicipalProject[];openProject:(projectId:string)=>void}){const recommended=route.alternativeMinutes!==null&&(route.currentMinutes===null||route.alternativeMinutes<route.currentMinutes);return <div className="page"><PageIntro eyebrow={`${recommended?'RECOMMENDED':'ALTERNATIVE'} · ROUTE B`} title={route.alternativeMinutes===null?'Unavailable':`${route.alternativeMinutes} min to ${route.destination}`} text={`${route.origin} → ${route.destination}`}/><Surface className="route-overview"><div><span>Origin<strong>{route.origin}</strong></span><span>Destination<strong>{route.destination}</strong></span><span>Estimated time<strong>{route.alternativeMinutes===null?'Unavailable':`${route.alternativeMinutes} min`}</strong></span><span>Traffic<strong>{route.traffic}</strong></span></div></Surface><div className="route-visual" aria-label={`Route from ${route.origin} to ${route.destination}`}>{route.stops.map((stop,index)=><div key={stop}><i>{index===0?'START':index===route.stops.length-1?'END':index}</i><strong>{stop.replace('Start · ','')}</strong>{index<route.stops.length-1&&<ArrowDown/>}</div>)}</div><Surface className="route-reason"><Navigation/><div><strong>Avoiding</strong><p>{route.avoiding}</p><strong>{recommended?'Why recommended':'Route context'}</strong><p>{route.reason} · Traffic is {route.traffic.toLowerCase()}.</p><CitizenRouteProjects projects={projects} projectIds={route.projectIds} openProject={openProject}/></div></Surface><p className="disclaimer">Demo advisory only, not turn-by-turn navigation.</p></div>}

function Alerts({alerts,conditions}:{alerts:CitizenAlert[];conditions:PublicRoadCondition[]}){const icons={Traffic:TrafficCone,Waterlogging:CloudRain,Obstruction:Route};return <div className="page"><PageIntro eyebrow="NEARBY UPDATES" title="Mobility alerts" text="Important conditions that may affect your journey"/>{alerts.length===0?<EmptyState title="No nearby alerts"/>:<div className="alert-list">{alerts.map(x=>{const Icon=icons[x.type];return <div className="alert-row" key={x.id}><i className={x.type==='Waterlogging'?'blue':''}><Icon/></i><div><strong>{x.title}</strong><span><LocateFixed/> {x.location}</span></div><small><Clock3/> {x.timeAgo}</small></div>})}</div>}<SectionHeader title="Road conditions"/><div className="condition-list">{conditions.map(condition=><Surface key={condition.id}><div><strong>{condition.title} · {condition.location}</strong><span>{condition.verified?'Verified fixed · ':''}{condition.condition} · Updated {formatDemoTime(condition.updatedAt)}</span></div><SeverityBadge value={condition.severity}/></Surface>)}</div></div>}
