import { useEffect, useState, type FormEvent, type SVGProps } from 'react';
import { ArrowLeft, ArrowRight, BusFront, ChevronRight, Cpu, Radio } from 'lucide-react';
import drishtiLogo from './assets/drishti_logo.png';
import { navigation } from './navigation/config';
import type { Role } from './types';
import { BottomNavigation, SessionActionsProvider } from './components/ui';
import PolicePages from './pages/PolicePages';
import MunicipalPages from './pages/MunicipalOperations';
import CitizenPages from './pages/CitizenPages';
import { useCityData } from './services/useCityData';

type WorkspaceRole = Exclude<Role, 'landing'>;
type Screen = 'landing' | 'signin' | 'workspace';

const roleDetails = {
 police: { label: 'Police', workspace: 'Police Command', sub: 'Incidents & Watchlist', Icon: PoliceIcon },
 municipal: { label: 'Municipal', workspace: 'Municipal Operations', sub: 'Roads & Infrastructure', Icon: MunicipalIcon },
 citizen: { label: 'Citizen', workspace: 'Citizen Mobility', sub: 'Traffic & Mobility', Icon: CitizenIcon }
};

function savedRole(): WorkspaceRole | null {
 const value = localStorage.getItem('drishti-demo-session');
 return value === 'police' || value === 'municipal' || value === 'citizen' ? value : null;
}

export default function App(){
 const [role,setRole]=useState<WorkspaceRole|null>(savedRole);
 const [pendingRole,setPendingRole]=useState<WorkspaceRole|null>(null);
 const [screen,setScreen]=useState<Screen>(()=>role?'workspace':'landing');
 const [page,setPage]=useState(()=>role==='citizen'?'traffic':'overview');
 const [confirmLogout,setConfirmLogout]=useState(false);

 useEffect(()=>{
  const handleBack=()=>{
   if(screen==='signin'){setPendingRole(null);setScreen('landing')}
   else if(screen==='workspace'&&role){history.pushState({screen:'workspace'},'')}
  };
  addEventListener('popstate',handleBack);
  return()=>removeEventListener('popstate',handleBack);
 },[screen,role]);

 const selectRole=(selected:WorkspaceRole)=>{setPendingRole(selected);setScreen('signin');history.pushState({screen:'signin'},'')};
 const signIn=()=>{if(!pendingRole)return;localStorage.setItem('drishti-demo-session',pendingRole);setRole(pendingRole);setPage(pendingRole==='citizen'?'traffic':'overview');setScreen('workspace');history.replaceState({screen:'workspace'},'')};
 const backToLanding=()=>{setPendingRole(null);setScreen('landing');history.replaceState({screen:'landing'},'')};
 const logout=()=>{localStorage.removeItem('drishti-demo-session');setConfirmLogout(false);setRole(null);setPendingRole(null);setScreen('landing');setPage('overview');history.replaceState({screen:'landing'},'')};

 if(screen==='landing'||!role&&screen==='workspace')return <Landing enter={selectRole}/>;
 if(screen==='signin'&&pendingRole)return <SignIn role={pendingRole} onBack={backToLanding} onSubmit={signIn}/>;
 if(!role)return <Landing enter={selectRole}/>;
 const items=navigation[role];
 const changePrimaryPage=(nextPage:string)=>{if(role==='municipal')window.dispatchEvent(new Event('workspace-home'));setPage(nextPage)};
 return <SessionActionsProvider onLogout={()=>setConfirmLogout(true)} onHome={()=>{window.dispatchEvent(new Event('workspace-home'));setPage(role==='citizen'?'traffic':'overview')}}><div className={`app-shell ${role}`}>{role==='police'?<PolicePages page={page} navigate={setPage} exit={()=>setConfirmLogout(true)}/>:role==='municipal'?<MunicipalPages page={page} navigate={setPage} exit={()=>setConfirmLogout(true)}/>:<CitizenPages page={page} navigate={setPage} exit={()=>setConfirmLogout(true)}/>}<BottomNavigation items={items} active={page} onChange={changePrimaryPage}/>{confirmLogout&&<LogoutDialog role={role} onCancel={()=>setConfirmLogout(false)} onConfirm={logout}/>}</div></SessionActionsProvider>
}

function BrandHeader(){return <header><img className="brand-logo" src={drishtiLogo} alt="Drishti"/><div><strong>DRISHTI</strong><small>AI-POWERED MOBILE URBAN INTELLIGENCE</small></div><span className="demo">DEMO MODE</span></header>}

function Landing({enter}:{enter:(r:WorkspaceRole)=>void}){const {policeSummary}=useCityData();const roles=(Object.keys(roleDetails) as WorkspaceRole[]).map(id=>({id,...roleDetails[id]}));return <main className="landing"><BrandHeader/><section className="hero"><div className="hero-visual"><svg viewBox="0 0 390 230"><path d="M-10 200 C80 155 118 205 195 145 S320 55 410 90"/><path d="M35 240 C90 180 105 110 90 -10"/><path d="M250 240 C220 180 260 105 330 -10"/></svg><div className="bus-orbit"><BusFront/><span>PUBLIC FLEET</span></div><i className="node n1"/><i className="node n2"/><i className="node n3"/><div className="signal"><Radio/>{policeSummary.reportingBuses} sensing</div></div><h1>Public transport becomes a moving sensor network.</h1><span className="hero-kicker">ONE FLEET. A CITY OF INSIGHTS.</span><div className="flow" aria-label="Bus cameras to edge processing to city intelligence"><span><BusFront/> Bus cameras</span><ArrowRight/><span><Cpu/> Edge processing</span><ArrowRight/><span>City intelligence</span></div></section><section className="role-section"><div><h2>Select your workspace</h2></div><div className="role-list">{roles.map(({id,label,sub,Icon})=><button onClick={()=>enter(id)} key={id}><i><Icon/></i><div><strong>{label}</strong><span>{sub}</span></div><ChevronRight/></button>)}</div></section><footer><span>SIMULATED DATA ENVIRONMENT</span><b><i/> Platform operational</b></footer></main>}

function SignIn({role,onBack,onSubmit}:{role:WorkspaceRole;onBack:()=>void;onSubmit:()=>void}){const details=roleDetails[role];const Icon=details.Icon;const submit=(event:FormEvent)=>{event.preventDefault();onSubmit()};return <main className={`sign-in ${role}`}><BrandHeader/><button className="signin-back" onClick={onBack}><ArrowLeft/> Back</button><section className="signin-panel"><i className="signin-role-icon"><Icon/></i><span className="eyebrow">{details.label.toUpperCase()} WORKSPACE</span><h1>{details.workspace} Sign In</h1><form onSubmit={submit}><label>Username or email<input name="username" type="text" autoComplete="username" defaultValue={`demo.${role}@drishti.gov.in`} required/></label><label>Password<input name="password" type="password" autoComplete="current-password" defaultValue="drishti-demo" required/></label><button className="primary full" type="submit">Sign In</button></form></section></main>}

function LogoutDialog({role,onCancel,onConfirm}:{role:WorkspaceRole;onCancel:()=>void;onConfirm:()=>void}){return <div className="dialog-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onCancel()}}><section className="logout-dialog" role="alertdialog" aria-modal="true" aria-labelledby="logout-title"><h2 id="logout-title">Log out of {roleDetails[role].workspace}?</h2><div><button className="secondary" onClick={onCancel} autoFocus>Cancel</button><button className="primary" onClick={onConfirm}>Log out</button></div></section></div>}

function PoliceIcon(props:SVGProps<SVGSVGElement>){return <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" {...props}><path d="M24 4 39 10v12c0 10-6.3 17.2-15 22-8.7-4.8-15-12-15-22V10L24 4Z" stroke="currentColor" strokeWidth="2.5"/><path d="m24 12 2.6 5.3 5.9.9-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.9L24 12Z" fill="currentColor"/></svg>}
function MunicipalIcon(props:SVGProps<SVGSVGElement>){return <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" {...props}><path d="m6 18 18-10 18 10H6Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/><path d="M10 39h28M7 44h34M13 19v20m8-20v20m6-20v20m8-20v20" stroke="currentColor" strokeWidth="2.5"/><path d="M22 13h4" stroke="currentColor" strokeWidth="2"/></svg>}
function CitizenIcon(props:SVGProps<SVGSVGElement>){return <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" {...props}><circle cx="24" cy="16" r="6" stroke="currentColor" strokeWidth="2.5"/><circle cx="10" cy="22" r="4" stroke="currentColor" strokeWidth="2.5"/><circle cx="38" cy="22" r="4" stroke="currentColor" strokeWidth="2.5"/><path d="M13 40c.7-8 4.4-12 11-12s10.3 4 11 12M3 39c.4-5.8 3-8.7 7.5-8.7 2.2 0 4 .7 5.2 2.1M45 39c-.4-5.8-3-8.7-7.5-8.7-2.2 0-4 .7-5.2 2.1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>}
