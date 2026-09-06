import { useState } from 'react';
import { BusFront, Camera } from 'lucide-react';
import type { RoadDefect } from '../types';
import { Grid } from './charts/grid';
import { Line, LineChart } from './charts/line-chart';
import { ChartTooltip } from './charts/tooltip';
import { XAxis } from './charts/x-axis';
import { demoDate } from '../domain/time';
import { EvidenceCredit, EvidenceImage } from './EvidenceMedia';

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
 const baseline=observations[0];
 const selectedImage=selected.image||defect.image;

 return <section className="lifecycle-chart" aria-labelledby="lifecycle-title">
    <header><div><span>OBSERVE → PRIORITISE → ACT → VERIFY</span><h2 id="lifecycle-title">{defect.progressionTitle||'Condition progression'}</h2></div><strong>{defect.detectionCount}<small>fleet observations</small></strong></header>
  <p className="evidence-context">Simulated history · images illustrate the condition at each stage, not a same-site photographic time series.</p>
  <div className="lifecycle-evidence" aria-live="polite">
   <div className="lifecycle-image"><EvidenceImage src={selectedImage} alt={`${selected.label} — illustrative condition`}/><span><Camera/> {selected.busId?'Observation':'Field action'} · Day {selected.day}</span></div>
   <div><span>{selected.date} · DAY {selected.day}{selectedIndex===observations.length-1?' · CURRENT STATE':''}</span><h3>{selected.label}</h3><p>{selected.detail}</p><small>{selected.busId&&<BusFront/>} {selected.busId||'Field team'} · stage {selectedIndex+1} of {observations.length}{selected.source?` · ${selected.source}`:''}</small></div>
  </div>
  <EvidenceCredit src={selectedImage}/>
  <div className="lifecycle-dates evidence-stage-picker">{observations.map((observation,index)=><button key={`${observation.day}-${observation.date}`} aria-pressed={selectedIndex===index} className={selectedIndex===index?'active':undefined} onClick={()=>setSelectedIndex(index)}><strong>Day {observation.day}</strong><span>{observation.label}</span><small>{observation.date}</small></button>)}</div>
  {selectedIndex>0&&baseline.image&&<details className="evidence-comparison"><summary>Compare first observation with selected stage</summary><div className="evidence-pair"><figure><EvidenceImage src={baseline.image} alt={`First stage — ${baseline.label}`}/><figcaption>Day {baseline.day} · {baseline.label}</figcaption><EvidenceCredit src={baseline.image}/></figure><figure><EvidenceImage src={selectedImage} alt={`Selected stage — ${selected.label}`}/><figcaption>Day {selected.day} · {selected.label}</figcaption></figure></div></details>}
  <div className="lifecycle-plot">
   <span className="axis-label y">Condition severity</span>
   <span className="threshold-label">Intervention threshold · {threshold}</span>
   <LineChart data={chartData} xDataKey="date" aspectRatio="2 / 1" margin={{top:18,right:12,bottom:34,left:8}}>
    <Grid horizontal vertical={false} numTicksRows={4} stroke="#dfe5e2" strokeDasharray="3,4" highlightRowValues={[threshold]} highlightRowStroke="#b84940" highlightRowStrokeDasharray="5,4"/>
    <Line dataKey="severity" stroke="#866126" strokeWidth={3} fadeEdges={false} showMarkers markers={{radius:4,fill:'#866126',stroke:'#fff',strokeWidth:2}}/>
    <XAxis numTicks={Math.min(observations.length,4)}/>
    <ChartTooltip showDatePill={false} rows={point=>[{color:'#866126',label:String(point.label),value:`${point.severity} / 100 severity index`}]}/>
   </LineChart>
  </div>
  <details className="chart-data"><summary>View condition chart data</summary><p>Illustrative condition-severity index (0–100), not measured damage percentage.</p><table><thead><tr><th scope="col">Observation</th><th scope="col">Severity index</th></tr></thead><tbody>{chartData.map(point=><tr key={point.day}><th scope="row">Day {point.day} · {point.label}</th><td>{point.severity}</td></tr>)}</tbody></table></details>
 </section>;
}