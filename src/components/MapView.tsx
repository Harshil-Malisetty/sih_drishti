import { BusFront, Crosshair, Droplets, ShieldAlert, TriangleAlert, Wrench } from 'lucide-react';
import { cx } from '../utils/format';

export type MapMarker={id:string;type:'bus'|'incident'|'watchlist'|'defect'|'water'|'traffic'|'infrastructure'|'pedestrian'|'risk';x:number;y:number;label:string;detail?:string};
export type MapTrailPoint={x:number;y:number;label?:string};
export function MapView({markers,selected,onSelect,mode='operations',trail,children}:{markers:MapMarker[];selected?:string;onSelect?:(id:string)=>void;mode?:string;trail?:MapTrailPoint[];children?:React.ReactNode}){
 const icons:any={bus:BusFront,incident:ShieldAlert,watchlist:TriangleAlert,defect:Wrench,water:Droplets,traffic:TriangleAlert,infrastructure:Wrench,pedestrian:TriangleAlert,risk:TriangleAlert};
 const trailPath=trail?.map((p,i)=>`${i?'L':'M'} ${p.x*4} ${p.y*5}`).join(' ');
 return <div className={cx('map-view',mode)}>
  <svg className="roads" viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden="true"><path d="M-20 90 C90 110 175 65 430 115"/><path d="M30 -20 C80 110 70 270 130 540"/><path d="M210 -30 C185 120 250 290 225 530"/><path d="M430 190 C330 205 160 170 -30 245"/><path d="M430 370 C270 325 150 390 -20 345"/><path className="major" d="M-10 450 C110 315 250 290 420 15"/></svg>
  {mode==='traffic'&&<><div className="traffic-line severe"/><div className="traffic-line heavy"/><div className="traffic-line free"/></>}
  {mode==='simulation'&&<><div className="closure-line"/><div className="impact-line one"/><div className="impact-line two"/></>}
  {trailPath&&<svg className="observation-trail" viewBox="0 0 400 500" preserveAspectRatio="none"><path d={trailPath}/>{trail?.map((p,i)=><circle key={i} cx={p.x*4} cy={p.y*5} r="4"/>)}</svg>}
  <div className="map-label l1">ANNA SALAI</div><div className="map-label l2">GUINDY</div><div className="map-label l3">T. NAGAR</div>
  {markers.map(m=>{const Icon=icons[m.type];return <button aria-label={m.label} aria-pressed={selected===m.id} className={cx('marker',m.type,m.detail?.toLowerCase(),selected===m.id&&'selected')} style={{left:`${m.x}%`,top:`${m.y}%`}} onClick={()=>onSelect?.(m.id)} key={m.id}><Icon/></button>})}
  <button className="locate" aria-label="Center map"><Crosshair/></button>{children}
 </div>
}
export function MapLegend({mode='operations'}:{mode?:string}){return <div className="map-legend">{mode==='traffic'?<><span><i className="free"/>Free</span><span><i className="moderate"/>Moderate</span><span><i className="heavy"/>Heavy</span><span><i className="severe"/>Severe</span></>:<><span><i className="bus"/>Fleet</span><span><i className="event"/>Events</span><span><i className="alert"/>Alerts</span></>}</div>}
export function BottomSheet({eyebrow,title,children,action,onAction}:{eyebrow?:string;title:string;children:React.ReactNode;action?:string;onAction?:()=>void}){return <section className="bottom-sheet" aria-live="polite"><i className="handle"/>{eyebrow&&<span className="sheet-eyebrow">{eyebrow}</span>}<h3>{title}</h3>{children}{action&&<button className="primary" onClick={onAction}>{action}</button>}</section>}
