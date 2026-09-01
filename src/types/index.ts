export type Role = 'landing' | 'police' | 'municipal' | 'citizen';
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
export type Status = 'Open' | 'Investigating' | 'Pending Verification' | 'Resolved' | 'Closed';
export interface GeoPoint { latitude:number; longitude:number; }
export interface Incident extends GeoPoint { id:string; type:string; severity:Severity; timestamp:string; location:string; busId:string; route:string; vehicleType:string; registrationNumber:string; registrationConfidence:number; status:Status; image:string; detectionSource:'Onboard Edge'; }
export interface WatchlistMatch { id:string; subjectType:'Missing Person'|'Flagged Vehicle'; subjectName:string; confidence:number; timestamp:string; location:string; busId:string; route:string; status:Status; image:string; referenceImage:string; }
export interface RoadDefect extends GeoPoint { id:string; defectType:string; severity:Severity; location:string; firstSeen:string; lastSeen:string; status:Status; growthPercentage:number; detectionCount:number; route:string; busIds:string[]; repairStatus?:string; image:string; }
export interface TrafficObservation { id:string; location:string; road:string; vehicleCount:number; densityLevel:'Free'|'Moderate'|'Heavy'|'Severe'; averageSpeed:number; timestamp:string; trend:'Increasing'|'Stable'|'Decreasing'; }
export interface Bus extends GeoPoint { id:string; route:string; status:'Sensing'|'In transit'; observations:number; }
