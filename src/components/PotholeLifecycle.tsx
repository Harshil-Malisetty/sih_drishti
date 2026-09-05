import { useState } from 'react';
import { BusFront, Camera } from 'lucide-react';
import type { RoadDefect } from '../types';

export function ObservationProgression({defect}:{defect:RoadDefect}){
 const observations=defect.observations||[];
 const [selectedIndex,setSelectedIndex]=useState(Math.max(observations.length-1,0));
 if(observations.length===0)return null;
 const selected=observations[selectedIndex];
 const points=observations.map((observation,index)=>{
  const x=12+(index/Math.max(observations.length-1,1))*76;
  const y=88-observation.relativeSize*.7;
  return {x,y,observation};
 });

 const thresholdY=88-(defect.interventionThreshold||65)*.7;

 return <section className="lifecycle-chart" aria-labelledby="lifecycle-title">
    <header><div><span>REPEATED FLEET OBSERVATIONS</span><h2 id="lifecycle-title">{defect.progressionTitle||'Condition progression'}</h2></div><strong>{defect.detectionCount}<small>observations</small></strong></header>
  <div className="lifecycle-plot">
     <span className="axis-label y">Condition severity</span>
   <span className="threshold-label">Intervention threshold</span>
   <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <line className="grid-line" x1="8" y1="18" x2="92" y2="18"/>
    <line className="grid-line" x1="8" y1="45" x2="92" y2="45"/>
    <line className="grid-line" x1="8" y1="72" x2="92" y2="72"/>
    <line className="threshold-line" x1="8" y1={thresholdY} x2="92" y2={thresholdY}/>
    <polyline className="trend-casing" points={points.map(point=>`${point.x},${point.y}`).join(' ')}/>
    <polyline className="trend-line" points={points.map(point=>`${point.x},${point.y}`).join(' ')}/>
   </svg>
   <div className="severity-scale" aria-hidden="true"><span>High</span><span>Watch</span><span>Early</span></div>
   {points.map((point,index)=><button key={point.observation.day} className={`lifecycle-point${selectedIndex===index?' active':''}${index===points.length-1?' current':''}`} style={{left:`${point.x}%`,top:`${point.y}%`}} onClick={()=>setSelectedIndex(index)} onMouseEnter={()=>setSelectedIndex(index)} aria-label={`Day ${point.observation.day}: ${point.observation.label}`}><i/><span>Day {point.observation.day}</span></button>)}
  </div>
    <div className="lifecycle-dates" style={{gridTemplateColumns:`repeat(${observations.length}, minmax(0, 1fr))`}} aria-hidden="true">{observations.map(observation=><span key={`${observation.day}-${observation.date}`}>{observation.date}</span>)}</div>
  <div className="lifecycle-evidence" aria-live="polite">
   <div className="lifecycle-image"><img src={selected.image||defect.image} alt={`${selected.label} fleet observation`}/><span><Camera/> Day {selected.day} evidence</span></div>
    <div><span>{selected.date} · DAY {selected.day}{selectedIndex===observations.length-1?' · CURRENT STATE':''}</span><h3>{selected.label}</h3><p>{selected.detail}</p><small><BusFront/> {selected.busId} · observation {selectedIndex+1} of {observations.length}{selected.source?` · ${selected.source}`:''}</small></div>
  </div>
 </section>;
}