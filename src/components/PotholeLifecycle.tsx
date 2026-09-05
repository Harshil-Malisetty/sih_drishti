import { useState } from 'react';
import { BusFront, Camera } from 'lucide-react';
import type { RoadDefect } from '../types';
import { Grid } from './charts/grid';
import { Line, LineChart } from './charts/line-chart';
import { ChartTooltip } from './charts/tooltip';
import { XAxis } from './charts/x-axis';
import { demoDate } from '../domain/time';

export function ObservationProgression({defect}:{defect:RoadDefect}){
 const observations=defect.observations||[];
 const [selectedIndex,setSelectedIndex]=useState(Math.max(observations.length-1,0));
 if(observations.length===0)return null;
 const selected=observations[Math.min(selectedIndex, observations.length-1)];
 const chartData=observations.map(observation=>({
  date:new Date(observation.observedAt || demoDate(observation.date)),
  severity:observation.relativeSize,
  label:observation.label,
  day:observation.day,
 }));
 const threshold=defect.interventionThreshold||65;

 return <section className="lifecycle-chart" aria-labelledby="lifecycle-title">
    <header><div><span>REPEATED FLEET OBSERVATIONS</span><h2 id="lifecycle-title">{defect.progressionTitle||'Condition progression'}</h2></div><strong>{defect.detectionCount}<small>observations</small></strong></header>
  <div className="lifecycle-plot">
   <span className="axis-label y">Condition severity</span>
   <span className="threshold-label">Intervention threshold · {threshold}</span>
   <LineChart data={chartData} xDataKey="date" aspectRatio="2 / 1" margin={{top:18,right:12,bottom:34,left:8}}>
    <Grid horizontal vertical={false} numTicksRows={4} stroke="#dfe5e2" strokeDasharray="3,4" highlightRowValues={[threshold]} highlightRowStroke="#b84940" highlightRowStrokeDasharray="5,4"/>
    <Line dataKey="severity" stroke="#866126" strokeWidth={3} fadeEdges={false} showMarkers markers={{radius:4,fill:'#866126',stroke:'#fff',strokeWidth:2}}/>
    <XAxis numTicks={Math.min(observations.length,4)}/>
    <ChartTooltip showDatePill={false} rows={point=>[{color:'#866126',label:String(point.label),value:`${point.severity}% severity`}]}/>
   </LineChart>
  </div>
    <div className="lifecycle-dates" style={{gridTemplateColumns:`repeat(${observations.length}, minmax(0, 1fr))`}}>{observations.map((observation,index)=><button key={`${observation.day}-${observation.date}`} className={selectedIndex===index?'active':undefined} onClick={()=>setSelectedIndex(index)} onMouseEnter={()=>setSelectedIndex(index)}><strong>Day {observation.day}</strong><span>{observation.date}</span></button>)}</div>
  <div className="lifecycle-evidence" aria-live="polite">
   <div className="lifecycle-image"><img src={selected.image||defect.image} alt={`${selected.label} fleet observation`}/><span><Camera/> Day {selected.day} evidence</span></div>
    <div><span>{selected.date} · DAY {selected.day}{selectedIndex===observations.length-1?' · CURRENT STATE':''}</span><h3>{selected.label}</h3><p>{selected.detail}</p><small><BusFront/> {selected.busId} · observation {selectedIndex+1} of {observations.length}{selected.source?` · ${selected.source}`:''}</small></div>
  </div>
 </section>;
}