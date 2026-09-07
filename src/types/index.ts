export type Role = 'landing' | 'police' | 'municipal' | 'citizen';
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
export type Status = 'Open' | 'Investigating' | 'Pending Verification' | 'Resolved' | 'Closed' | 'Verified' | 'Dismissed' | 'Disputed';
export interface GeoPoint { latitude:number; longitude:number; }
export interface PipelineEvent { timestamp:string; label:string; detail:string; image?:string; }
export interface VehicleTrack { frameCount:number; currentFrame:number; stages:PipelineEvent[]; }
export interface Incident extends GeoPoint { id:string; type:string; severity:Severity; timestamp:string; location:string; busId:string; route:string; vehicleType:string; registrationNumber:string; registrationConfidence:number; status:Status; image:string; plateImage?:string; detectionSource:'Onboard Edge'|'Citizen report'; track?:VehicleTrack; }
export interface FleetObservation extends GeoPoint { id:string; timestamp:string; location:string; roadSegmentId?:string; busId:string; route:string; confidence?:number; image?:string; }
export interface WatchlistMatch { id:string; subjectType:'Missing Person'|'Flagged Vehicle'; subjectName:string; confidence:number; timestamp:string; location:string; busId:string; route:string; status:Status; image:string; referenceImage:string; observations?:FleetObservation[]; }
export interface DefectObservation { day:number; date:string; observedAt?:string; label:string; detail:string; relativeSize:number; busId:string; image?:string; source?:string; }
export interface RepairEvent { markedRepaired:string; nextObservation:string; busId:string; result:'Verified'|'Disputed'|'Pending'; detail:string; }
export interface RoadDefect extends GeoPoint { id:string; defectType:string; category:'Roads'|'Infrastructure'|'Water'|'Pedestrians'; severity:Severity; location:string; firstSeen:string; lastSeen:string; status:Status; growthPercentage:number; detectionCount:number; route:string; busIds:string[]; infrastructureCategory?:string; currentCondition?:string; recommendedAction?:string; maintenanceState?:string; progressionTitle?:string; interventionThreshold?:number; repairStatus?:string; repair?:RepairEvent; observations?:DefectObservation[]; image:string; }
export interface RoadRisk { id:string; segment:string; condition:string; risk:Severity; trend:string; projectedIntervention:string; reason:string; currentStage:number; stages:string[]; busIds:string[]; }
export type RoadCoordinate = [number,number];
export interface PlannerRoadSegment { id:string; name:string; points:RoadCoordinate[]; baselineLevel:TrafficLevel; baselineMinutes:number; observedPasses:number; hourlyVehicles:number; capacity:number; busRoutes:string[]; connectsTo:string[]; }
export interface ConstructionSimulation { id:string; road:string; duration:string; startDate:string; trafficRedistribution:'High'|'Medium'|'Low'; affectedRoadSegments:number; highRiskSegments:number; congestionIncrease:number; finding:string; recommendation:string; timeline:{period:string;impact:string;level:number}[]; }
export type TrafficLevel = 'Free'|'Moderate'|'Heavy'|'Severe';
export interface TrafficObservation { id:string; observationId?:string; roadSegmentId?:string; observedAt?:string; windowMinutes?:number; location:string; road:string; vehicleCount:number; densityLevel:TrafficLevel; averageSpeed:number; timestamp:string; trend:'Increasing'|'Stable'|'Decreasing'; mapX:number; mapY:number; recommendedAction:string; }
export interface CitizenAlert { id:string; type:'Traffic'|'Waterlogging'|'Obstruction'; title:string; location:string; distance:string; timeAgo:string; trafficId?:string; roadSegmentId?:string; sourceId?:string; severity:Severity; }
export interface CitizenRoute { id:string; origin:string; destination:string; currentMinutes:number; alternativeMinutes:number; via:string; traffic:TrafficLevel; reason:string; avoiding:string; stops:string[]; }
export interface CitizenMapData { traffic:TrafficObservation[]; alerts:CitizenAlert[]; }
export interface Bus extends GeoPoint { id:string; route:string; status:'Sensing'|'In transit'; observations:number; }
