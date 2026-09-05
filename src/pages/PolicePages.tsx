import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BusFront, CheckCircle2, LocateFixed, ScanLine, ShieldCheck, Siren } from 'lucide-react';
import { IncidentCard, WatchlistCard } from '../components/cards';
import { BottomSheet } from '../components/MapView';
import { PoliceMapView, type PoliceGeoMarker, type PoliceMapCamera } from '../components/PoliceMapView';
import { PoliceTrafficControl } from '../components/PoliceTrafficControl';
import { EmergencyDispatchPanel } from '../components/EmergencyDispatchPanel';
import { useOperation } from '../components/operations';
import { notifyAction } from '../components/ActionFeedback';
import { AppHeader, ConfidenceIndicator, FilterBar, MetricCard, PageIntro, SectionHeader, SeverityBadge, Surface } from '../components/ui';
import { selectTrafficAnomalies } from '../domain/selectors';
import { formatDemoDate, formatDemoTime } from '../domain/time';
import { incidentsService, watchlistService } from '../services';
import { useCityData } from '../services/useCityData';
import type { FleetObservation, Status, WatchlistMatch } from '../types';
import type { CityIncident } from '../types/city';

type WorkflowView={kind:'incident';id:string}|{kind:'evidence';id:string}|{kind:'assignment';id:string}|{kind:'match';id:string}|{kind:'map';id:string}|{kind:'traffic';id:string};
type Assignment=ReturnType<typeof useCityData>['assignments'][string];
type PoliceMapRecord={id:string;type:'bus'|'incident'|'watchlist';group:'Fleet'|'Incidents'|'Watchlist';latitude:number;longitude:number;label:string;eyebrow:string;title:string;location:string};
const isActive=(status:Status)=>!['Resolved','Closed','Verified','Dismissed'].includes(status);
const hasRegistration=(incident:CityIncident)=>incident.registrationConfidence>0&&Boolean(incident.registrationNumber.trim())&&incident.registrationNumber!=='Not available';
const incidentCard=(incident:CityIncident)=>({...incident,timestamp:formatDemoDate(incident.observedAt)});
// The card expects a date/time separator; latest watchlist observations may contain only a time.
const matchCard=(match:WatchlistMatch)=>({...match,timestamp:/^\d{4}-\d{2}-\d{2}T/.test(match.timestamp)?formatDemoDate(match.timestamp):match.timestamp.includes('·')?match.timestamp:`Observed · ${match.timestamp}`});

function PoliceOperationalMap({open,selected,onSelect,cameras}:{open:(id:string)=>void;selected:string;onSelect:(id:string)=>void;cameras:Partial<Record<PoliceMapRecord['group'],PoliceMapCamera>>}){
 const {state,buses,incidents,watchlist}=useCityData();
 const [filter,setFilter]=useState<PoliceMapRecord['group']>(()=>buses.some(item=>item.id===selected)?'Fleet':incidents.some(item=>item.id===selected)?'Incidents':'Watchlist');
 const records=useMemo<PoliceMapRecord[]>(()=>{
  const fleet=buses.slice(0,6).map(bus=>{
   const location=state.roadSegments[bus.roadSegmentId]?.name||'Location unavailable';
   return {id:bus.id,type:'bus' as const,group:'Fleet' as const,latitude:bus.latitude,longitude:bus.longitude,label:`${bus.id} · Route ${bus.route} · ${location}`,eyebrow:'FLEET VEHICLE · 6-BUS SAMPLE',title:`BUS ${bus.id}`,location};
  });
  const events=incidents.filter(item=>isActive(item.status)&&Date.parse(item.observedAt)<=Date.parse(state.now)).map(item=>({
   id:item.id,type:'incident' as const,group:'Incidents' as const,latitude:item.latitude,longitude:item.longitude,label:`${item.type} · ${item.location}`,eyebrow:`${item.severity.toUpperCase()} PRIORITY`,title:item.type,location:item.location,
  }));
  const matches=watchlist.filter(item=>item.status!=='Dismissed').flatMap(item=>{
   const latest=item.observations?.at(-1);
   return latest?[{id:item.id,type:'watchlist' as const,group:'Watchlist' as const,latitude:latest.latitude,longitude:latest.longitude,label:`Possible match · ${item.location}`,eyebrow:item.status==='Verified'?'REVIEWED WATCHLIST MATCH':'POSSIBLE WATCHLIST MATCH',title:item.subjectName,location:item.location}]:[];
  });
  return [...fleet,...events,...matches];
 },[state,buses,incidents,watchlist]);
 const visible=records.filter(item=>item.group===filter);
 const selectedObservation=filter==='Watchlist'?watchlist.filter(item=>item.status!=='Dismissed').flatMap(item=>(item.observations||[]).map(observation=>({observation,parent:item}))).find(item=>item.observation.id===selected):undefined;
 const active=visible.find(item=>item.id===(selectedObservation?.parent.id||selected));
 const trail=active?.type==='watchlist'?watchlist.find(item=>item.id===active.id)?.observations?.map(item=>({id:item.id,latitude:item.latitude,longitude:item.longitude,label:`${item.busId} · ${item.timestamp}`})):[];
 const actionRecordId=selectedObservation?.parent.id||active?.id;
 const changeFilter=(value:string)=>{const next=value as PoliceMapRecord['group'];setFilter(next);const first=records.find(item=>item.group===next);if(first)onSelect(first.id)};
 return <div className="map-page police-real-map">
  <div className="map-filter police-filters"><FilterBar items={['Fleet','Incidents','Watchlist']} active={filter} onChange={changeFilter}/></div>
  <PoliceMapView key={filter} initialView={cameras[filter]} onViewChange={camera=>{cameras[filter]=camera}} markers={visible} selected={selected} onSelect={onSelect} onTrailSelect={onSelect} trail={trail}/>
  {active&&<BottomSheet eyebrow={selectedObservation?'MOVEMENT TRAIL OBSERVATION':active.eyebrow} title={selectedObservation?selectedObservation.observation.id:active.title} action={active.type==='incident'?'View Incident':active.type==='watchlist'?'Open Record':undefined} onAction={active.type!=='bus'&&actionRecordId?()=>open(actionRecordId):undefined}>
   {selectedObservation?<PoliceObservationDetails matchId={selectedObservation.parent.id} observation={selectedObservation.observation}/>:<PoliceMapDetails record={active}/>}
  </BottomSheet>}
 </div>;
}

function PoliceObservationDetails({matchId,observation}:{matchId:string;observation:FleetObservation}){
 const {watchlist}=useCityData();
 const match=watchlist.find(item=>item.id===matchId);
 if(!match)return null;
 return <div className="map-detail-grid"><span>Timestamp<strong>{observation.timestamp}</strong></span><span>Bus ID<strong>{observation.busId}</strong></span><span>Location<strong>{observation.location}</strong></span><span>Target<strong>{match.subjectName}</strong></span><span>Confidence<strong>{observation.confidence===undefined?'Not available':`${observation.confidence}%`}</strong></span><span>Route<strong>{observation.route}</strong></span></div>;
}

export default function PolicePages({page,navigate,exit}:{page:string;navigate:(p:string)=>void;exit:()=>void}){
 const {assignments,state}=useCityData();
 const [workflow,setWorkflow]=useState<WorkflowView[]>([]);
 const [mapSelection,setMapSelection]=useState('INC-24091');
 const mapCameras=useRef<Partial<Record<PoliceMapRecord['group'],PoliceMapCamera>>>({});
 const open=(view:WorkflowView)=>{history.replaceState({policeViews:workflow,primaryPage:page},'');const next=[...workflow,view];setWorkflow(next);history.pushState({policeViews:next,primaryPage:page},'')};
 const back=()=>history.back();
 const openMapRecord=(id:string)=>open({kind:state.incidents[id]?'incident':'match',id});
 useEffect(()=>{const onPop=(event:PopStateEvent)=>{setWorkflow(event.state?.policeViews||[]);if(event.state?.policeViews&&event.state.primaryPage)navigate(event.state.primaryPage)};const home=()=>{setWorkflow([]);history.replaceState({screen:'workspace'},'')};addEventListener('popstate',onPop);addEventListener('workspace-home',home);return()=>{removeEventListener('popstate',onPop);removeEventListener('workspace-home',home)}},[]);
 const active=workflow.at(-1);
 if(active?.kind==='incident')return <IncidentDetail id={active.id} assignment={assignments[active.id]} onBack={back} onEvidence={()=>open({kind:'evidence',id:active.id})} onAssign={()=>open({kind:'assignment',id:active.id})} onMap={()=>{setMapSelection(active.id);open({kind:'map',id:active.id})}}/>;
 if(active?.kind==='evidence')return <EvidenceView id={active.id} onBack={back}/>;
 if(active?.kind==='assignment')return <InvestigationAssignment key={active.id} id={active.id} current={assignments[active.id]} onBack={back}/>;
 if(active?.kind==='match')return <MatchDetail key={active.id} id={active.id} onBack={back}/>;
 if(active?.kind==='traffic')return <PoliceTrafficControl id={active.id} onBack={back}/>;
 if(active?.kind==='map')return <div className="police-workflow"><AppHeader title="Police map" subtitle={active.id} onBack={back}/><PoliceOperationalMap cameras={mapCameras.current} selected={mapSelection} onSelect={setMapSelection} open={openMapRecord}/></div>;
 return <><AppHeader title="Police Command & Control" onExit={exit}/><main>
  {page==='overview'&&<PoliceOverview go={next=>{if(next==='map')setMapSelection('MTC-2147');navigate(next)}} open={id=>open({kind:'incident',id})} openTraffic={id=>open({kind:'traffic',id})}/>}
  {page==='incidents'&&<IncidentList open={id=>open({kind:'incident',id})} openTraffic={id=>open({kind:'traffic',id})}/>}
  {page==='watchlist'&&<Watchlist open={id=>open({kind:'match',id})}/>}
  {page==='map'&&<PoliceOperationalMap cameras={mapCameras.current} selected={mapSelection} onSelect={setMapSelection} open={openMapRecord}/>}
 </main></>;
}

function PoliceOverview({go,open,openTraffic}:{go:(x:string)=>void;open:(x:string)=>void;openTraffic:(id:string)=>void}){
 const {state,incidents,watchlist,policeSummary}=useCityData();
 const priorityIncident=incidents.find(item=>isActive(item.status)&&Date.parse(item.observedAt)<=Date.parse(state.now));
 const priorityMatch=watchlist.find(item=>isActive(item.status));
 return <div className="page">
  <PageIntro eyebrow="POLICE COMMAND · DEMO DATA" title="Operational overview" text={`Updated ${formatDemoTime(state.now)}`}/>
  <div className="metric-grid compact"><MetricCard label="Active incidents" value={policeSummary.activeIncidents} tone="warn"/><MetricCard label="Possible matches" value={policeSummary.possibleMatches} tone="critical"/><MetricCard label="Vehicle observations" value={policeSummary.vehiclesObserved} meta="Latest corridor windows"/><MetricCard label="Alerts today" value={policeSummary.alertsToday}/></div>
  <button className="sensor-strip fleet-link" onClick={()=>go('map')}><BusFront/><div><strong>{policeSummary.reportingBuses} buses reporting</strong><span>View current fleet locations · 6-bus sample</span></div><ArrowRight/></button>
    <TrafficControlEntries open={openTraffic}/>
  <SectionHeader title="Priority alerts" action="All incidents" onAction={()=>go('incidents')}/>
  {priorityIncident?<><IncidentCard item={incidentCard(priorityIncident)} onClick={()=>open(priorityIncident.id)}/><button className="primary full" onClick={()=>open(priorityIncident.id)}>Review incident <ArrowRight/></button></>:<p>No active incidents.</p>}
  <SectionHeader title="Recent activity"/>
  <div className="activity-list">{policeSummary.activity.slice(0,4).map(item=><div key={item.id}><time>{item.time}</time><i/><p><strong>{item.title}</strong><span>{item.detail}</span></p></div>)}</div>
  <SectionHeader title="Possible match" action="Watchlist" onAction={()=>go('watchlist')}/>
  {priorityMatch?<WatchlistCard item={matchCard(priorityMatch)} onClick={()=>go('watchlist')}/>:<p>No matches awaiting review.</p>}
 </div>;
}

function TrafficControlEntries({open}:{open:(id:string)=>void}){
 const {state}=useCityData();
 const anomalies=selectTrafficAnomalies(state).filter(item=>Date.parse(item.detectedAt)<=Date.parse(state.now));
 const active=anomalies.filter(item=>!['Closed','Dismissed'].includes(item.status));
 const candidates=active.filter(item=>item.status==='Candidate').length;
 const closed=anomalies.filter(item=>item.status==='Closed').length;
 return <section aria-label="Traffic control records">
  <SectionHeader title="Traffic control"/>
  <p className="operation-meta" role="status">{active.length} active · {candidates} awaiting officer qualification · {closed} closed</p>
  {anomalies.length?anomalies.map(item=><button className="traffic-control-link" key={item.id} onClick={()=>open(item.id)}><div><strong>Traffic control · {item.observation?.location||state.roadSegments[item.roadSegmentId]?.name||item.id}</strong><small>{item.dispatch?.stage||item.status} · {item.ratio===null?'Ratio unavailable':`${item.ratio.toFixed(1)}× baseline`} · {item.id}</small><small>Fleet observation candidate — not an authoritative emergency</small></div><ArrowRight aria-hidden="true"/></button>):<p className="operation-meta">No traffic candidates are available.</p>}
 </section>;
}

function IncidentList({open,openTraffic}:{open:(x:string)=>void;openTraffic:(id:string)=>void}){
 const {state,incidents}=useCityData();
 const [filter,setFilter]=useState('All');
 return <div className="page"><PageIntro eyebrow="INCIDENT RECORDS" title="Incidents" text="Observations requiring police review"/>
    <TrafficControlEntries open={openTraffic}/>
  <div className="segmented">{['All','Active','Resolved'].map(x=><button key={x} aria-pressed={filter===x} onClick={()=>setFilter(x)} className={filter===x?'active':''}>{x}</button>)}</div>
  <div className="list-stack">{incidents.filter(x=>filter==='All'||(filter==='Resolved'?!isActive(x.status):isActive(x.status)&&Date.parse(x.observedAt)<=Date.parse(state.now))).map(x=><IncidentCard item={incidentCard(x)} key={x.id} onClick={()=>open(x.id)}/>)}</div>
 </div>;
}

function MissingRecord({id,onBack}:{id:string;onBack:()=>void}){
 return <div className="police-workflow"><AppHeader title="Record unavailable" subtitle={id} onBack={onBack}/><main className="page detail"><p>This record is no longer available.</p></main></div>;
}

function IncidentDetail({id,assignment,onBack,onMap,onEvidence,onAssign}:{id:string;assignment?:Assignment;onBack:()=>void;onMap:()=>void;onEvidence:()=>void;onAssign:()=>void}){
 const {incidents}=useCityData();
 const x=incidents.find(item=>item.id===id);
 if(!x)return <MissingRecord id={id} onBack={onBack}/>;
 return <div className="police-workflow"><AppHeader title="Incident record" subtitle={`${x.id} · ${x.severity.toUpperCase()} PRIORITY`} onBack={onBack}/><main className="page detail">
  <div className="title-row"><div><h1>{x.type}</h1><p>{x.location} · {formatDemoDate(x.observedAt)}</p></div><SeverityBadge value={x.severity}/></div>
  <Surface className="facts"><div><span>Observed by</span><strong>{x.busId}</strong></div><div><span>Route</span><strong>{x.route}</strong></div><div><span>Vehicle</span><strong>{x.vehicleType}</strong></div><div><span>Plate</span><strong>{hasRegistration(x)?x.registrationNumber:'Not available'}</strong></div></Surface>
  {assignment&&<div className="assignment-status"><CheckCircle2/><div><span>INVESTIGATION ASSIGNED</span><strong>{assignment.officer} · {assignment.team}</strong></div></div>}
  <SectionHeader title="Evidence"/><button className="evidence-preview" onClick={onEvidence}><img src={x.image} alt="Traffic observation evidence"/><span>Review evidence</span><ArrowRight/></button>
  <Surface className="operational-flow"><SectionHeader title="Incident progression"/><OperationalTimeline incident={x}/></Surface>
    {x.resolvedAt&&<p className="operation-meta">Resolved {formatDemoDate(x.resolvedAt)} · {x.resolutionSummary}</p>}
    <EmergencyDispatchPanel event={{kind:'incident',id}} actor="Police operator"/>
  <Surface><SectionHeader title="Location" action="Open map" onAction={onMap}/><button className="location-row" onClick={onMap}><LocateFixed/><div><strong>{x.location}</strong><span>{x.latitude}° N, {x.longitude}° E</span></div><ArrowRight/></button></Surface>
    <button className="primary full" disabled={Boolean(x.resolvedAt)||['Resolved','Closed'].includes(x.status)} onClick={onAssign}>{x.resolvedAt||['Resolved','Closed'].includes(x.status)?'Incident resolved — assignment unavailable':assignment?'Update assignment':'Assign for investigation'}</button>
 </main></div>;
}

function OperationalTimeline({incident}:{incident:CityIncident}){
 const steps=incident.track?.stages.length?incident.track.stages:[
  {label:'Incident observed',timestamp:formatDemoTime(incident.observedAt),detail:incident.type},
  ...(hasRegistration(incident)?[{label:'Registration recorded',timestamp:formatDemoTime(incident.observedAt),detail:`${incident.registrationNumber} · confidence ${incident.registrationConfidence}%`}]:[]),
 ];
 return <div className="operational-timeline">
  {steps.map((step,index)=><div className={index===0?'observed':index===steps.length-1?'alert':'processing'} key={`${index}-${step.label}`}><i>✓</i><p><strong>{step.label}</strong><span>{step.timestamp}</span>{step.detail!==incident.type&&<small>{step.detail}</small>}</p></div>)}
  <div className="action"><i>{steps.length+1}</i><p><strong>Officer review</strong><span>{incident.status}</span></p></div>
 </div>;
}

function EvidenceView({id,onBack}:{id:string;onBack:()=>void}){
 const {incidents}=useCityData();
 const x=incidents.find(item=>item.id===id);
 if(!x)return <MissingRecord id={id} onBack={onBack}/>;
 return <div className="police-workflow"><AppHeader title="Evidence" subtitle={x.id} onBack={onBack}/><main className="page detail"><h1>{x.type}</h1>
  <div className="evidence"><img src={x.image} alt="Traffic observation evidence"/>{x.vehicleType!=='Unknown'&&<div className="bbox vehicle"><span>{x.vehicleType.toUpperCase()}</span></div>}{hasRegistration(x)&&<div className="bbox plate"><span>{x.registrationNumber}</span></div>}<em>{formatDemoDate(x.observedAt)}</em></div>
  <Surface className="facts"><div><span>Time</span><strong>{formatDemoTime(x.observedAt)}</strong></div><div><span>Location</span><strong>{x.location}</strong></div><div><span>Vehicle</span><strong>{x.vehicleType}</strong></div><div><span>Plate confidence</span><strong>{hasRegistration(x)?`${x.registrationConfidence}%`:'Not available'}</strong></div></Surface>
  <Surface className="operational-flow"><SectionHeader title="Event timeline"/><OperationalTimeline incident={x}/></Surface>
 </main></div>;
}

function InvestigationAssignment({id,current,onBack}:{id:string;current?:Assignment;onBack:()=>void}){
 const {state}=useCityData();
 const teams=Object.values(state.teams).filter(team=>state.departments[team.departmentId]?.role==='police');
 const [officer,setOfficer]=useState(current?.officer||'Inspector R. Kumar');
 const [teamId,setTeamId]=useState(()=>teams.find(team=>team.name===current?.team)?.id||teams[0]?.id||'');
 const {busy:saving,error,run}=useOperation();
 const incident=state.incidents[id];
 const resolved=Boolean(incident?.resolvedAt)||['Resolved','Closed'].includes(incident?.status||'');
 const save=()=>run(async()=>{await incidentsService.assign(id,teamId,officer);onBack()}, { message: 'Investigation assigned to the selected officer and team.', tone: 'info' });
 return <div className="police-workflow"><AppHeader title="Assign investigation" subtitle={id} onBack={onBack}/><main className="page detail"><PageIntro eyebrow="CASE ASSIGNMENT" title="Investigation owner"/>
  <Surface className="assignment-form"><label>Officer<select value={officer} disabled={saving} onChange={event=>setOfficer(event.target.value)}>
   {[...new Set(['Inspector R. Kumar','Sub-Inspector P. Devi','Inspector A. Selvan',...(current?.officer?[current.officer]:[])])].map(name=><option key={name}>{name}</option>)}
  </select></label><label>Team<select value={teamId} disabled={saving} onChange={event=>setTeamId(event.target.value)}>{teams.map(team=><option key={team.id} value={team.id}>{team.name}</option>)}</select></label></Surface>
    {resolved&&<p role="status">This incident is resolved. Its investigation assignment cannot be changed.</p>}
  {error&&<p role="alert">{error}</p>}
    <button className="primary full" disabled={saving||!teamId||!incident||resolved} onClick={save}>Confirm assignment</button>
 </main></div>;
}

function Watchlist({open}:{open:(x:string)=>void}){
 const {watchlist,policeSummary}=useCityData();
 const [tab,setTab]=useState('Missing Persons');
 const matches=watchlist.filter(item=>item.subjectType===(tab==='Missing Persons'?'Missing Person':'Flagged Vehicle'));
 const visible=matches.filter(item=>item.status!=='Dismissed');
 return <div className="page"><PageIntro eyebrow="OFFICER VERIFICATION REQUIRED" title="Watchlist" text="Potential matches—not confirmed identifications"/>
  <div className="watch-metrics"><span>ACTIVE MATCHES<strong>{String(policeSummary.possibleMatches).padStart(2,'0')}</strong></span><span>WATCHLIST ENTRIES<strong>{watchlist.length}</strong></span></div>
  <div className="segmented">{['Missing Persons','Flagged Vehicles'].map(x=><button key={x} aria-pressed={tab===x} className={tab===x?'active':''} onClick={()=>setTab(x)}>{x}</button>)}</div>
  <SectionHeader title={visible.length>0&&visible.every(item=>item.status==='Verified')?'Reviewed match':'Active matches'}/>
  {visible.length?visible.map(item=><WatchlistCard key={item.id} item={matchCard(item)} onClick={()=>open(item.id)}/>):<div className="match-removed"><CheckCircle2/><strong>{matches.length?'Match dismissed':'No matches'}</strong><span>{matches.length?'This observation is no longer in the active queue.':'No observations are available for this category.'}</span></div>}
 </div>;
}

function MatchDetail({id,onBack}:{id:string;onBack:()=>void}){
 const {watchlist}=useCityData();
 const [observationId,setObservation]=useState<string>();
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const x=watchlist.find(item=>item.id===id);
 const decide=async(decision:'Verified'|'Dismissed')=>{
  if(saving)return;
  setSaving(true);setError('');
  try{await watchlistService.decide(id,decision);notifyAction(decision==='Verified'?'Match verified for investigation.':'Match dismissed from the active queue.',decision==='Verified'?'success':'neutral')}
  catch(cause){setError(cause instanceof Error?cause.message:'Unable to save the decision. Please try again.')}
  finally{setSaving(false)}
 };
 if(!x)return <MissingRecord id={id} onBack={onBack}/>;
 const decision=x.status==='Verified'||x.status==='Dismissed'?x.status:undefined;
 const observations=x.observations||[];
 const points=observations.map(item=>({id:item.id,latitude:item.latitude,longitude:item.longitude,label:`${item.busId} · ${item.timestamp}`}));
 const markers:PoliceGeoMarker[]=observations.map(item=>({id:item.id,type:'watchlist',latitude:item.latitude,longitude:item.longitude,label:`${item.timestamp} · ${item.location}`}));
 return <div className="police-workflow"><AppHeader title="Possible watchlist match" subtitle={x.id} onBack={onBack}/><main className="page detail">
  <div className={`warning-note ${decision?.toLowerCase()||''}`}><Siren/><div><strong>{decision||'Requires officer verification'}</strong><span>{decision==='Verified'?'Match verified for investigation.':decision==='Dismissed'?'Match dismissed and removed from the active queue.':'Confidence is not confirmation of identity.'}</span></div></div>
  <h1>{x.subjectType==='Missing Person'?'Possible missing-person match':'Possible flagged-vehicle match'}</h1>
  <div className="compare"><figure><img src={x.referenceImage} alt="Watchlist reference"/><figcaption>REFERENCE · {x.subjectName.split(' · ')[0]}</figcaption></figure><div>VS</div><figure><img src={x.image} alt="Fleet observation"/><ScanLine/><figcaption>OBSERVATION · {x.timestamp.split('·').at(-1)}</figcaption></figure></div>
  <ConfidenceIndicator value={x.confidence}/>
  {x.subjectType==='Missing Person'&&<div className="privacy-note"><ShieldCheck/><span>Synthetic demo data only. Production privacy and access controls are future work; authentication is not implemented.</span></div>}
  <Surface className="facts"><div><span>Observed by</span><strong>{x.busId}</strong></div><div><span>Latest location</span><strong>{x.location}</strong></div><div><span>Time</span><strong>{x.timestamp.split('·').at(-1)}</strong></div><div><span>Route</span><strong>{x.route}</strong></div></Surface>
  {observations.length>0&&<><SectionHeader title="Fleet observation trail"/><div className="observation-list">{observations.map(o=><div key={o.id}><time>{o.timestamp}</time><i/><p><strong>{o.busId} · {o.location}</strong><span>Route {o.route} · {o.confidence===undefined?'Confidence unavailable':`${o.confidence}% possible match`}</span></p></div>)}</div>
  <div className="mini-map real-map"><PoliceMapView markers={markers} selected={observationId||markers.at(-1)?.id} onSelect={setObservation} onTrailSelect={setObservation} trail={points}/></div>
  {observationId&&observations.find(item=>item.id===observationId)&&<PoliceObservationDetails matchId={id} observation={observations.find(item=>item.id===observationId)!}/>}
   <div className="trail-summary"><strong>Observed by {new Set(observations.map(item=>item.busId)).size} different buses</strong><span>Chronological sightings from the distributed fleet</span></div>
  </>}
  {error&&<p role="alert">{error}</p>}
  {!decision&&<div className="action-row"><button className="secondary" disabled={saving} onClick={()=>decide('Dismissed')}>Dismiss match</button><button className="primary" disabled={saving} onClick={()=>decide('Verified')}>Verify match</button></div>}
 </main></div>;
}

function PoliceMapDetails({record}:{record:PoliceMapRecord}){
 const {state,buses,incidents,watchlist,assignments}=useCityData();
 if(record.type==='bus'){
  const bus=buses.find(item=>item.id===record.id);
  if(!bus)return null;
  return <div className="map-detail-grid"><span>Bus ID<strong>{bus.id}</strong></span><span>Route<strong>{bus.route}</strong></span><span>Status<strong>{bus.status}</strong></span><span>Last update<strong>{formatDemoDate(bus.observedAt)}</strong></span><span>Location<strong>{state.roadSegments[bus.roadSegmentId]?.name||'Location unavailable'}</strong></span><span>Recent observation summary<strong>{bus.observations} observations</strong></span></div>;
 }
 if(record.type==='incident'){
  const item=incidents.find(incident=>incident.id===record.id);
  if(!item)return null;
  const assignment=assignments[item.id];
  return <div className="map-detail-grid"><span>Timestamp<strong>{formatDemoDate(item.observedAt)}</strong></span><span>Location<strong>{item.location}</strong></span><span>Vehicle / person<strong>{item.vehicleType}</strong></span><span>Status<strong>{item.status}</strong></span><span>Evidence<strong>{item.busId} · Route {item.route}</strong></span><span>Assignment<strong>{assignment?`${assignment.officer} · ${assignment.team}`:'Unassigned'}</strong></span></div>;
 }
 const item=watchlist.find(match=>match.id===record.id);
 if(!item)return null;
 const observations=item.observations||[];
 return <div className="map-detail-grid"><span>Target<strong>{item.subjectName}</strong></span><span>Match type<strong>{item.subjectType}</strong></span><span>Confidence<strong>{item.confidence}%</strong></span><span>Timestamp<strong>{item.timestamp}</strong></span><span>Bus ID<strong>{item.busId}</strong></span><span>Location<strong>{item.location}</strong></span><span>Evidence<strong>{observations.length} fleet sightings</strong></span>{item.subjectType==='Flagged Vehicle'&&<p>Detected plate: {item.subjectName}</p>}<div className="sheet-trail">{observations.map((observation,index)=><div key={observation.id}><b>{observation.busId}</b><span>{observation.timestamp} · {observation.location}</span>{index<observations.length-1&&<i>↓</i>}</div>)}</div></div>;
}
