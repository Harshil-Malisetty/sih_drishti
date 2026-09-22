import { useEffect, useRef } from 'react';
import { CityMapStatus, fitOperationalPoints, jumpCamera, useCityMap, useMapMarkers, type CityMapCamera, type CityMapMode } from './MapLibreMap';
import { useGLHeat } from './MapLibreLayers';
import type { HeatPoint } from '../domain/mapSignals';

export type MunicipalGeoMarker = {
 id: string;
 type: 'road' | 'infrastructure' | 'pedestrian';
 latitude: number;
 longitude: number;
 label: string;
 closed?: boolean;
};

export type MunicipalMapCamera = CityMapCamera;

export function MunicipalMapView({markers,selected,initialView,onSelect,onViewChange,heatPoints=[],heatOpacity=0,heatFitRequest=0,mode,onModeChange,compact=false}:{markers:MunicipalGeoMarker[];selected?:string;initialView?:MunicipalMapCamera;onSelect:(id:string)=>void;onViewChange:(camera:MunicipalMapCamera)=>void;heatPoints?:HeatPoint[];heatOpacity?:number;heatFitRequest?:number;mode?:CityMapMode;onModeChange?:(mode:CityMapMode)=>void;compact?:boolean}){
 const container=useRef<HTMLDivElement>(null);
 const markerKey=markers.map(marker=>`${marker.id}:${marker.latitude}:${marker.longitude}`).join('|');
 const {handle,loading,error}=useCityMap(container,{initialView:initialView||{center:[13.005,80.238],zoom:12},onViewChange,mode,onModeChange});
 useGLHeat(handle,heatPoints,heatOpacity,heatFitRequest);
 useMapMarkers(handle,'city-records',markers.map(marker=>({...marker,color:marker.closed?'#37705b':marker.type==='infrastructure'?'#6e7040':marker.type==='pedestrian'?'#d07b2e':'#7b6136'})),selected,onSelect,false,{cluster:compact,labels:true});
 useEffect(()=>{
  if(!handle||markers.length===0)return;
  if(initialView){jumpCamera(handle,initialView);return;}
  const fit=()=>fitOperationalPoints(handle,markers.map(marker=>[marker.latitude,marker.longitude]));
  fit();handle.map.on('resize',fit);return()=>{handle.map.off('resize',fit)};
 },[handle,markerKey]);
 return <><div className="police-geo-map" ref={container} aria-label="Interactive municipal GIS map"/><CityMapStatus loading={loading} error={error}/></>;
}