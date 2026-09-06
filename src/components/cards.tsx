import { BusFront, ChevronRight, Clock3, MapPin } from 'lucide-react';
import type { Incident, WatchlistMatch } from '../types';
import type { MunicipalIssue } from '../types/city';
import { formatDemoDate } from '../domain/time';
import { SeverityBadge, StatusBadge } from './ui';
import { EventThumbnail, eventPhaseLabel } from './EventThumbnail';
export function IncidentCard({item,onClick}:{item:Incident;onClick:()=>void}){return <button className="event-card" onClick={onClick}><EventThumbnail category="incident"/><div className="event-main"><div className="card-top"><SeverityBadge value={item.severity}/><StatusBadge value={item.status}/></div><strong>{item.type}</strong><span><MapPin/> {item.location}</span><small><Clock3/> {item.timestamp} <b>·</b> {item.detectionSource==='Citizen report'?'Citizen report':<><BusFront/> {item.busId}</>}</small></div><ChevronRight className="chev"/></button>}
export function DefectCard({item,onClick}:{item:MunicipalIssue;onClick:()=>void}){
 const latest=item.observations?.at(-1), closed=item.workflowStage==='Closed';
 return <button className="event-card defect-card" onClick={onClick}><EventThumbnail category={item.kind}/><div className="event-main"><div className="card-top">{!closed&&<SeverityBadge value={item.severity}/>}<StatusBadge value={eventPhaseLabel(item.workflowStage||item.status)}/></div><strong>{item.defectType}</strong><span><MapPin/> {item.location}</span><small className="defect-state">{closed?'Verified fixed':item.workflowStage==='Admin review'?'Field team reported resolved':item.citizenReportId?'Citizen-submitted issue':latest?.label||item.currentCondition||item.status}</small><small>{item.citizenReportId?`Reported ${formatDemoDate(item.firstSeen)}`:`Latest ${item.lastSeen} · ${item.detectionCount} observations`}</small></div><ChevronRight className="chev"/></button>;
}
export function WatchlistCard({item,onClick}:{item:WatchlistMatch;onClick:()=>void}){return <button className="watch-card" onClick={onClick}><EventThumbnail category={item.subjectType==='Missing Person'?'person':'vehicle'}/><div className="event-copy"><span>{item.subjectType} · demo</span><strong>{item.subjectName}</strong><small><MapPin/> {item.location} · {item.timestamp.split('·').at(-1)}</small><em>{item.confidence}% possible match · {item.status}</em></div><ChevronRight aria-hidden="true"/></button>}
