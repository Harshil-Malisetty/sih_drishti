import { createContext, useContext, type ReactNode } from 'react';
import { AlertCircle, ArrowLeft, ChevronRight, LoaderCircle, Radio } from 'lucide-react';
import drishtiLogo from '../assets/drishti_logo.png';
import type { Severity, Status } from '../types';
import { cx } from '../utils/format';

const SessionActionsContext=createContext<{logout:()=>void;home:()=>void}|undefined>(undefined);
export function SessionActionsProvider({onLogout,onHome,children}:{onLogout:()=>void;onHome:()=>void;children:ReactNode}){return <SessionActionsContext.Provider value={{logout:onLogout,home:onHome}}>{children}</SessionActionsContext.Provider>}

export function StatusBadge({value}:{value:Status|string}){return <span className={cx('badge status',value.toLowerCase().replaceAll(' ','-'))}>{value}</span>}
export function SeverityBadge({value}:{value:Severity}){return <span className={cx('badge severity',value.toLowerCase())}><i/>{value}</span>}
export function SectionHeader({title,action,onAction}:{title:string;action?:string;onAction?:()=>void}){return <div className="section-head"><h2>{title}</h2>{action&&<button onClick={onAction}>{action}<ChevronRight size={16}/></button>}</div>}
export function MetricCard({label,value,meta,tone}:{label:string;value:string|number;meta?:string;tone?:string}){return <div className={cx('metric',tone)}><p>{label}</p><strong>{value}</strong>{meta&&<small>{meta}</small>}</div>}
export function AppHeader({title,subtitle,onBack,onHome,onExit}:{title:string;subtitle?:string;onBack?:()=>void;onHome?:()=>void;onExit?:()=>void}){const session=useContext(SessionActionsContext);return <header className="app-header">{onBack&&<button className="icon-btn" onClick={onBack} aria-label="Go back"><ArrowLeft/></button>}<button className="workspace-logo" onClick={onHome||session?.home} aria-label="Workspace home"><img src={drishtiLogo} alt=""/></button><div className="header-copy"><strong>{title}</strong>{subtitle&&<span>{subtitle}</span>}</div><span className="header-demo">DEMO</span>{(onExit||session?.logout)?<button className="exit" onClick={onExit||session?.logout} aria-label="Log out">Logout</button>:null}</header>}
export function PageIntro({eyebrow,title,text}:{eyebrow?:string;title:string;text?:string}){return <div className="page-intro">{eyebrow&&<span>{eyebrow}</span>}<h1>{title}</h1>{text&&<p>{text}</p>}</div>}
export function BottomNavigation({items,active,onChange}:{items:any[];active:string;onChange:(id:string)=>void}){return <nav className="bottom-nav" aria-label="Primary navigation">{items.map(({id,label,icon:Icon})=><button key={id} className={active===id?'active':''} aria-current={active===id?'page':undefined} onClick={()=>onChange(id)}><Icon/><span>{label}</span></button>)}</nav>}
export function ConfidenceIndicator({value}:{value:number}){return <div className="confidence"><div className="confidence-row"><span>Match confidence</span><strong>{value}%</strong></div><div className="confidence-track"><i style={{width:`${value}%`}}/></div><small>Indicative score · Officer verification required</small></div>}
export function Timeline({items}:{items:{day:string;title:string;text:string}[]}){return <div className="timeline">{items.map((x,i)=><div className="timeline-item" key={x.day}><i>{i+1}</i><div><span>{x.day}</span><strong>{x.title}</strong><p>{x.text}</p></div></div>)}</div>}
export function FilterBar({items,active,onChange}:{items:string[];active:string;onChange:(x:string)=>void}){return <div className="filterbar">{items.map(x=><button className={x===active?'active':''} onClick={()=>onChange(x)} key={x}>{x}</button>)}</div>}
export function LoadingState(){return <div className="state"><LoaderCircle/><strong>Loading observations</strong></div>}
export function EmptyState({title='No active records'}:{title?:string}){return <div className="state"><Radio/><strong>{title}</strong><span>New fleet observations will appear here.</span></div>}
export function ErrorState(){return <div className="state"><AlertCircle/><strong>Unable to load data</strong><span>Please try again.</span></div>}
export function Surface({children,className}:{children:ReactNode;className?:string}){return <section className={cx('surface',className)}>{children}</section>}
