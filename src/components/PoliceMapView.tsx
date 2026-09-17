import { useEffect, useMemo, useRef } from 'react';
import { CityMapStatus, fitOperationalPoints, jumpCamera, useCityMap, useMapLines, useMapMarkers, type CityMapCamera } from './MapLibreMap';
import { useGLFleet, useGLHeat } from './MapLibreLayers';
import type { HeatPoint } from '../domain/mapSignals';
import type { RoadCoordinate } from '../types';

export type PoliceGeoMarker = {
 id: string;
 type: 'bus' | 'incident' | 'watchlist';
 latitude: number;
 longitude: number;
 label: string;
 heading?: number;
};

export type PoliceGeoTrail = {
 id?: string;
 latitude: number;
 longitude: number;
 label?: string;
};
export type PoliceMapCamera = CityMapCamera;

export function PoliceMapView({markers,selected,onSelect,onTrailSelect,trail=[],initialView,onViewChange,heatPoints=[],heatOpacity=0,heatFitRequest=0,fleetFocusRequest=0,viewKey}:{markers:PoliceGeoMarker[];selected?:string;onSelect:(id:string)=>void;onTrailSelect?:(id:string)=>void;trail?:PoliceGeoTrail[];initialView?:PoliceMapCamera;onViewChange?:(camera:PoliceMapCamera)=>void;heatPoints?:HeatPoint[];heatOpacity?:number;heatFitRequest?:number;fleetFocusRequest?:number;viewKey?:string}){
 const container=useRef<HTMLDivElement>(null);
 const initialTrail=useRef(true);
 const previousViewKey=useRef(viewKey);
 const trailKey=trail.map(point=>`${point.id||''}:${point.latitude}:${point.longitude}:${point.label||''}`).join('|');
 const active=markers.find(marker=>marker.id===selected);
 const {handle,loading,error}=useCityMap(container,{initialView:initialView||{center:[13.035,80.235],zoom:12},onViewChange,focus:active?[active.latitude,active.longitude]:undefined});
 useEffect(()=>{
  if(previousViewKey.current===viewKey)return;
  previousViewKey.current=viewKey;initialTrail.current=true;
  jumpCamera(handle,initialView||{center:[13.035,80.235],zoom:12});
 },[handle,viewKey,initialView]);
 const fleet=useMemo(()=>markers.filter(marker=>marker.type==='bus'),[markers]);
 useGLHeat(handle,heatPoints,heatOpacity,heatFitRequest);
 useGLFleet(handle,fleet,selected,onSelect);
 const points=trail.length>1?trail.map(point=>[point.latitude,point.longitude] as RoadCoordinate):[];
 useMapLines(handle,'city-trail-outline',points.length?[{id:'trail-outline',points,color:'#fff',width:9}]:[]);
 useMapLines(handle,'city-trail',points.length?[{id:'trail',points,color:'#a96f2c',width:5}]:[]);
 useMapMarkers(handle,'city-records',markers.filter(marker=>marker.type!=='bus').map(marker=>({...marker,color:marker.type==='incident'?'#b84940':'#c1852e'})),selected,onSelect);
 useMapMarkers(handle,'city-observations',trail.length>1?trail.map((point,index)=>({...point,id:point.id||`trail-${index}`,label:`${index+1} → ${point.label||`Observation ${index+1}`}`,text:String(index+1),className:'trail-sequence',color:'#a96f2c'})):[],selected,onTrailSelect);
 useEffect(()=>{
  if(!handle||trail.length<2)return;
  const fit=()=>fitOperationalPoints(handle,trail.map(point=>[point.latitude,point.longitude]));
  if(!initialTrail.current||!initialView)fit();
  initialTrail.current=false;handle.map.on('resize',fit);return()=>{handle.map.off('resize',fit)};
 },[handle,trailKey]);
 useEffect(()=>{
  if(handle&&fleetFocusRequest&&active?.type==='bus')handle.map.jumpTo({center:[active.longitude,active.latitude],zoom:Math.max(14,handle.map.getZoom())});
 },[handle,fleetFocusRequest]);
 return <><div className="police-geo-map" ref={container} aria-label="Interactive Police operations map"/><CityMapStatus loading={loading} error={error}/></>;
}
