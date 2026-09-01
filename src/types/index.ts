export type Role = 'landing' | 'police' | 'municipal' | 'citizen';
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
export type Status = 'Open' | 'Investigating' | 'Pending Verification' | 'Resolved' | 'Closed' | 'Verified' | 'Dismissed' | 'Disputed';
export interface GeoPoint { latitude:number; longitude:number; }
export interface PipelineEvent { timestamp:string; label:string; detail:string; }
export interface VehicleTrack { frameCount:number; currentFrame:number; stages:PipelineEvent[]; }
export interface Incident extends GeoPoint { id:string; type:string; severity:Severity; timestamp:string; location:string; busId:string; route:string; vehicleType:string; registrationNumber:string; registrationConfidence:number; status:Status; image:string; detectionSource:'Onboard Edge'; track?:VehicleTrack; }
export interface FleetObservation extends GeoPoint { id:string; timestamp:string; location:string; busId:string; route:string; confidence?:number; }
export interface WatchlistMatch { id:string; subjectType:'Missing Person'|'Flagged Vehicle'; subjectName:string; confidence:number; timestamp:string; location:string; busId:string; route:string; status:Status; image:string; referenceImage:string; observations?:FleetObservation[]; }
export interface DefectObservation { day:number; date:string; label:string; detail:string; relativeSize:number; busId:string; }
export interface RepairEvent { markedRepaired:string; nextObservation:string; busId:string; result:'Verified'|'Disputed'|'Pending'; detail:string; }
export interface RoadDefect extends GeoPoint { id:string; defectType:string; category:'Roads'|'Infrastructure'|'Water'|'Pedestrians'; severity:Severity; location:string; firstSeen:string; lastSeen:string; status:Status; growthPercentage:number; detectionCount:number; route:string; busIds:string[]; repairStatus?:string; repair?:RepairEvent; observations?:DefectObservation[]; image:string; }
export interface RoadRisk { id:string; segment:string; condition:string; risk:Severity; trend:string; projectedIntervention:string; reason:string; currentStage:number; stages:string[]; busIds:string[]; }
export interface ConstructionSimulation { id:string; road:string; duration:string; startDate:string; trafficRedistribution:'High'|'Medium'|'Low'; affectedRoadSegments:number; highRiskSegments:number; congestionIncrease:number; finding:string; recommendation:string; timeline:{period:string;impact:string;level:number}[]; }
export interface TrafficObservation { id:string; location:string; road:string; vehicleCount:number; densityLevel:'Free'|'Moderate'|'Heavy'|'Severe'; averageSpeed:number; timestamp:string; trend:'Increasing'|'Stable'|'Decreasing'; }
export interface Bus extends GeoPoint { id:string; route:string; status:'Sensing'|'In transit'; observations:number; }
