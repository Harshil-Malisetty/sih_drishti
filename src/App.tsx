import { lazy, Suspense, useEffect, useRef, useState, type FormEvent, type SVGProps } from 'react';
import { ArrowLeft, ArrowRight, BusFront, ChevronRight, Cpu, Network } from 'lucide-react';
import { LazyMotion, domAnimation, useReducedMotion, type Variants } from 'motion/react';
import * as m from 'motion/react-m';
import drishtiLogo from './assets/drishti_logo.png';
import { navigation } from './navigation/config';
import type { Role } from './types';
import { BottomNavigation, LoadingState, SessionActionsProvider } from './components/ui';
import { ActionFeedbackProvider } from './components/ActionFeedback';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { persistRole, savedRole } from './lib/demoSession';
import { cityStore } from './services/city';
const PolicePages = lazy(() => import('./pages/PolicePages'));
const MunicipalPages = lazy(() => import('./pages/MunicipalOperations'));
const CitizenPages = lazy(() => import('./pages/CitizenPages'));

type WorkspaceRole = Exclude<Role, 'landing'>;
type Screen = 'landing' | 'signin' | 'workspace';

const roleDetails = {
 police: { label: 'Police', workspace: 'Police Command', sub: 'Incidents & Watchlist', identity: 'POLICE-204', Icon: PoliceIcon },
 municipal: { label: 'Municipal', workspace: 'Municipal Operations', sub: 'Roads & Infrastructure', identity: 'MUNICIPAL-118', Icon: MunicipalIcon },
 citizen: { label: 'Citizen', workspace: 'Citizen Mobility', sub: 'Traffic & Mobility', identity: 'CITIZEN-032', Icon: CitizenIcon }
};

export default function App(){
 return <AppErrorBoundary><ActionFeedbackProvider><Suspense fallback={<main aria-busy="true"><LoadingState/></main>}><AppScreens/></Suspense></ActionFeedbackProvider></AppErrorBoundary>;
}

function AppScreens(){
 const [role,setRole]=useState<WorkspaceRole|null>(()=>{const restored=savedRole();if(restored)cityStore.startBrowserSession();return restored});
 const [pendingRole,setPendingRole]=useState<WorkspaceRole|null>(null);
 const [screen,setScreen]=useState<Screen>(()=>role?'workspace':'landing');
 const [page,setPage]=useState(()=>role==='citizen'?'map':'overview');
 const [citizenNavigationVersion,setCitizenNavigationVersion]=useState(0);
 const [confirmLogout,setConfirmLogout]=useState(false);
 useEffect(()=>{document.title=role&&screen==='workspace'?`Drishti · ${roleDetails[role].workspace}`:'Drishti — City Intelligence'},[role,screen]);

 useEffect(()=>{
    const handleBack=(event:PopStateEvent)=>{
     // Workspace children own their detail stacks. Never push or replace history
     // here: doing so truncates Forward history and fights their popstate handlers.
     if(screen==='workspace')return;
     const selected=event.state?.pendingRole;
     if(event.state?.screen==='signin'&&(selected==='police'||selected==='municipal'||selected==='citizen')){
        setPendingRole(selected);setScreen('signin');
     }else{setPendingRole(null);setScreen('landing')}
  };
  addEventListener('popstate',handleBack);
  return()=>removeEventListener('popstate',handleBack);
 },[screen]);

 const selectRole=(selected:WorkspaceRole)=>{setPendingRole(selected);setScreen('signin');history.pushState({screen:'signin',pendingRole:selected},'')};
 const signIn=()=>{if(!pendingRole)return;cityStore.startBrowserSession();persistRole(pendingRole);setRole(pendingRole);setPage(pendingRole==='citizen'?'map':'overview');setScreen('workspace');history.replaceState({screen:'workspace'},'')};
 const backToLanding=()=>{if(history.state?.screen==='signin')history.back();else{setPendingRole(null);setScreen('landing');history.replaceState({screen:'landing'},'')}};
 const logout=()=>{persistRole(null);setConfirmLogout(false);setRole(null);setPendingRole(null);setScreen('landing');setPage('overview');history.replaceState({screen:'landing'},'')};

 if(screen==='landing'||!role&&screen==='workspace')return <Landing enter={selectRole}/>;
 if(screen==='signin'&&pendingRole)return <SignIn role={pendingRole} onBack={backToLanding} onSubmit={signIn}/>;
 if(!role)return <Landing enter={selectRole}/>;
 const items=navigation[role];
 const navigateCitizen=(nextPage:string)=>{setPage(nextPage);setCitizenNavigationVersion(version=>version+1)};
 const changePrimaryPage=(nextPage:string)=>{if(role==='municipal')window.dispatchEvent(new Event('workspace-home'));if(role==='citizen')navigateCitizen(nextPage);else setPage(nextPage)};
 return <SessionActionsProvider onLogout={()=>setConfirmLogout(true)} onHome={()=>{window.dispatchEvent(new Event('workspace-home'));if(role==='citizen')navigateCitizen('map');else setPage('overview')}}><div className={`app-shell ${role}`}>{role==='police'?<PolicePages page={page} navigate={setPage} exit={()=>setConfirmLogout(true)}/>:role==='municipal'?<MunicipalPages page={page} navigate={setPage} exit={()=>setConfirmLogout(true)}/>:<CitizenPages page={page} navigationVersion={citizenNavigationVersion} navigate={navigateCitizen} exit={()=>setConfirmLogout(true)}/>}<BottomNavigation items={items} active={page} onChange={changePrimaryPage}/>{confirmLogout&&<LogoutDialog role={role} onCancel={()=>setConfirmLogout(false)} onConfirm={logout}/>}</div></SessionActionsProvider>
}

function BrandHeader({entrance}:{entrance?:Variants}){
 const content=<><img className="brand-logo" src={drishtiLogo} alt=""/><div><strong>DRISHTI</strong><small>AI-Powered Mobile Urban Intelligence</small></div><span className="demo">DEMO</span></>;
 // Only Landing supplies variants; demo sign-in keeps its existing static header.
 return entrance?<m.header variants={entrance} custom={0}>{content}</m.header>:<header>{content}</header>;
}

function Landing({enter}:{enter:(r:WorkspaceRole)=>void}){
 const roles=(Object.keys(roleDetails) as WorkspaceRole[]).map(id=>({id,...roleDetails[id]}));
 const title=useRef<HTMLHeadingElement>(null);
 const reduceMotion=useReducedMotion()!==false;
 const reveal:Variants={
   hidden:{opacity:0,y:6},
   visible:(delay:number=0)=>({opacity:1,y:0,transition:{type:'tween',duration:reduceMotion?0:.24,delay:reduceMotion?0:delay,ease:[.22,1,.36,1]}})
 };
 useEffect(()=>{title.current?.focus({preventScroll:true});window.scrollTo(0,0)},[]);
 // Scope Motion to this screen, without layout/drag features or navigation delays.
 return <LazyMotion features={domAnimation} strict><m.main className="landing" initial={reduceMotion?false:'hidden'} animate="visible"><BrandHeader entrance={reveal}/>
  <section className="hero" aria-labelledby="landing-title">
    <m.h1 id="landing-title" ref={title} tabIndex={-1} variants={reveal} custom={.04}>A clearer view of our roads.</m.h1>
    <m.p className="hero-summary" variants={reveal} custom={.11}>Bus cameras help city teams spot road problems and keep people moving.</m.p>
   <div className="intelligence-flow" aria-label="From bus cameras to city services">
    <ol><m.li variants={reveal} custom={.18}><BusFront aria-hidden="true"/><span>Bus cameras</span></m.li><m.li variants={reveal} custom={.25}><ArrowRight aria-hidden="true"/><Cpu aria-hidden="true"/><span>Edge AI</span></m.li><m.li variants={reveal} custom={.32}><ArrowRight aria-hidden="true"/><Network aria-hidden="true"/><span>City intelligence</span></m.li></ol>
   </div>
  </section>
   <section className="role-section" aria-labelledby="workspace-title"><div><h2 id="workspace-title">Select your workspace</h2><p className="workspace-caption">Three roles. One shared city view.</p></div>
    <div className="role-list">{roles.map(({id,label,sub,Icon})=><m.button type="button" className={`role-card role-card--${id}`} onClick={()=>enter(id)} key={id} initial={false} animate={{x:0}} whileHover={{x:reduceMotion?0:2}} whileTap={{x:reduceMotion?0:1}} transition={{type:'tween',duration:reduceMotion?0:.14,ease:'easeOut'}}><i><Icon/></i><div><strong>{label}</strong><span>{sub}</span></div><ChevronRight aria-hidden="true"/></m.button>)}</div>
  </section>
  <footer><span>Simulated data · No account needed</span><a href="/evidence/credits.html" target="_blank" rel="noreferrer">Evidence sources</a></footer>
 </m.main></LazyMotion>;
}

function SignIn({role,onBack,onSubmit}:{role:WorkspaceRole;onBack:()=>void;onSubmit:()=>void}){
 const details=roleDetails[role];const Icon=details.Icon;
 const title=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{title.current?.focus({preventScroll:true});window.scrollTo(0,0)},[]);
 const submit=(event:FormEvent)=>{event.preventDefault();onSubmit()};
 return <main className={`sign-in ${role}`}><BrandHeader/><button type="button" className="signin-back" onClick={onBack}><ArrowLeft aria-hidden="true"/> Back</button><section className="signin-panel"><i className="signin-role-icon"><Icon/></i><span className="eyebrow">Demo access</span><h1 ref={title} tabIndex={-1}>{details.workspace}</h1><p id="demo-access-note">A demonstration environment with simulated city data. No account or real authentication.</p><form onSubmit={submit} aria-describedby="demo-access-note"><label htmlFor="demo-identity">{role==='citizen'?'Demo citizen identity':'Demo officer / operator identity'}<input id="demo-identity" value={details.identity} readOnly aria-describedby="demo-identity-note"/></label><small id="demo-identity-note">Fictional identity for this walkthrough.</small><label htmlFor="demo-role">Workspace role<input id="demo-role" value={details.label} readOnly/></label><button className="primary full" type="submit">Enter demo workspace<ArrowRight aria-hidden="true"/></button></form><p className="signin-session-note">Changes are shared across roles in this tab until reload.</p></section></main>;
}

function LogoutDialog({role,onCancel,onConfirm}:{role:WorkspaceRole;onCancel:()=>void;onConfirm:()=>void}){
 const dialogRef=useRef<HTMLDialogElement>(null);
 // Capture before React applies autoFocus to the Cancel button during commit.
 const openerRef=useRef(document.activeElement);
 useEffect(()=>{
  const dialog=dialogRef.current;
  const opener=openerRef.current;
  dialog?.showModal();
  return()=>{dialog?.close();if(opener instanceof HTMLElement&&opener.isConnected)opener.focus()};
 },[]);
 return <dialog ref={dialogRef} className="logout-dialog" aria-labelledby="logout-title" aria-describedby="logout-description" onCancel={event=>{event.preventDefault();onCancel()}} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onCancel()}}} onClick={event=>{
  if(event.target!==event.currentTarget)return;
  const bounds=event.currentTarget.getBoundingClientRect();
  if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)onCancel();
 }}><h2 id="logout-title">Log out of {roleDetails[role].workspace}?</h2><p id="logout-description">Return to workspace selection. Demo data remains until this page is reloaded.</p><div><button type="button" className="secondary" onClick={onCancel} autoFocus>Cancel</button><button type="button" className="primary" onClick={onConfirm}>Log out</button></div></dialog>;
}

function PoliceIcon(props:SVGProps<SVGSVGElement>){return <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" {...props}><path d="M24 4 39 10v12c0 10-6.3 17.2-15 22-8.7-4.8-15-12-15-22V10L24 4Z" stroke="currentColor" strokeWidth="2.5"/><path d="m24 12 2.6 5.3 5.9.9-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.9L24 12Z" fill="currentColor"/></svg>}
function MunicipalIcon(props:SVGProps<SVGSVGElement>){return <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" {...props}><path d="m6 18 18-10 18 10H6Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/><path d="M10 39h28M7 44h34M13 19v20m8-20v20m6-20v20m8-20v20" stroke="currentColor" strokeWidth="2.5"/><path d="M22 13h4" stroke="currentColor" strokeWidth="2"/></svg>}
function CitizenIcon(props:SVGProps<SVGSVGElement>){return <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" {...props}><circle cx="24" cy="16" r="6" stroke="currentColor" strokeWidth="2.5"/><circle cx="10" cy="22" r="4" stroke="currentColor" strokeWidth="2.5"/><circle cx="38" cy="22" r="4" stroke="currentColor" strokeWidth="2.5"/><path d="M13 40c.7-8 4.4-12 11-12s10.3 4 11 12M3 39c.4-5.8 3-8.7 7.5-8.7 2.2 0 4 .7 5.2 2.1M45 39c-.4-5.8-3-8.7-7.5-8.7-2.2 0-4 .7-5.2 2.1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>}
