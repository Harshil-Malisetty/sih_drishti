// Frozen teaching inputs from the prototype's demo fixtures. Tested against the
// actual domain implementation; never presented as live Chennai measurements.
export const POTHOLE = {
  id: 'DEF-8301', location: 'OMR · Sholinganallur', threshold: 70,
  days: [1, 7, 14, 21, 23, 25], values: [18, 36, 64, 88, 42, 8],
};
export const WATER = {
  id: 'DEF-8292', location: 'Velachery Main Road', threshold: 65,
  days: [1, 2, 3, 3.4], values: [24, 48, 72, 90],
};
export const INFRASTRUCTURE = [
  {id:'INF-8168',kind:'crossing',label:'Faded crossings',place:'Phoenix Mall approach',values:[22,45,68,88]},
  {id:'DEF-8141',kind:'school',label:'Unmanaged crossings',place:'School dismissal window',values:[18,42,68,84]},
  {id:'INF-8159',kind:'divider',label:'Displaced dividers',place:'Carriageway intrusion',values:[28,51,70,86]},
  {id:'INF-8152',kind:'sign',label:'Missing / damaged signs',place:'An absent direction sign',values:[30,52,72,84]},
  {id:'INF-8148',kind:'guardrail',label:'Bent guardrails',place:'An exposed roadside edge',values:[24,46,66,82]},
  {id:null,kind:'debris',label:'Debris / obstruction',place:'A blocked part of the road'},
];
export const PLANNING_INPUTS = [
  { id: 'anna', name: 'Anna Salai', hourlyVehicles: 184, capacity: 230, baselineMinutes: 24 },
  { id: 'cathedral', name: 'Cathedral Road', hourlyVehicles: 116, capacity: 170, baselineMinutes: 18 },
  { id: 'cpr', name: 'C.P. Ramaswamy', hourlyVehicles: 128, capacity: 180, baselineMinutes: 20 },
  { id: 'inner-ring', name: 'Inner Ring Road', hourlyVehicles: 201, capacity: 250, baselineMinutes: 27 },
];
export function calculatePlanning(roads = PLANNING_INPUTS, multiplier = 1) {
  const [road, ...connected] = roads;
  const spare = connected.map(r => Math.max(r.capacity - r.hourlyVehicles, 20));
  const totalSpare = spare.reduce((a,b) => a+b, 0);
  const displaced = Math.round(road.hourlyVehicles * (0.58 + multiplier * 0.12));
  const affected = connected.map((r,i) => {
    const additionalVehicles = Math.round(displaced * spare[i] / totalSpare);
    const after = r.hourlyVehicles + additionalVehicles;
    const saturation = after / r.capacity;
    const delayMinutes = Math.max(2, Math.round(r.baselineMinutes * Math.max(.1, saturation - .55) * multiplier * .48));
    return {...r,spare:spare[i],additionalVehicles,after,saturation,delayMinutes};
  });
  return {road,displaced,totalSpare,affected};
}
export const trafficRatio = (count, baseline) => {
  if (!Number.isFinite(count) || !Number.isFinite(baseline) || baseline <= 0) throw new Error('Positive traffic baseline required');
  return count / baseline;
};
export function distanceKm(a,b) {
  const rad = Math.PI/180, p1=a[0]*rad,p2=b[0]*rad,dp=(b[0]-a[0])*rad,dl=(b[1]-a[1])*rad;
  const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*6371*Math.asin(Math.sqrt(Math.max(0,Math.min(1,h))));
}
export const PROBLEM_BEATS = [
  {id:'blind-spot',start:7,end:12}, {id:'collision',start:21,end:25},
  {id:'vehicle-candidate',start:25,end:33}, {id:'rash-driving',start:33,end:35}, {id:'missing-person',start:35,end:38},
  {id:'pothole',start:38,end:61}, {id:'waterlogging',start:61,end:73},
  {id:'crossing',start:73,end:76}, {id:'school',start:76,end:79},
  {id:'divider',start:79,end:82}, {id:'sign',start:82,end:85},
  {id:'guardrail',start:85,end:88}, {id:'debris',start:88,end:91},
  {id:'parking',start:91,end:94}, {id:'congestion',start:94,end:106},
  {id:'closure',start:106,end:130}, {id:'stale-map',start:130,end:148},
  {id:'stale-transit',start:130,end:134}, {id:'emergency',start:148,end:160},
];