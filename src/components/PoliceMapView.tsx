import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type PoliceGeoMarker = {
 id: string;
 type: 'bus' | 'incident' | 'watchlist';
 latitude: number;
 longitude: number;
 label: string;
};

export type PoliceGeoTrail = {
 id?: string;
 latitude: number;
 longitude: number;
 label?: string;
};
export type PoliceMapCamera = { center: L.LatLngTuple; zoom: number };

export function PoliceMapView({markers,selected,onSelect,onTrailSelect,trail=[],initialView,onViewChange}:{markers:PoliceGeoMarker[];selected?:string;onSelect:(id:string)=>void;onTrailSelect?:(id:string)=>void;trail?:PoliceGeoTrail[];initialView?:PoliceMapCamera;onViewChange?:(camera:PoliceMapCamera)=>void}){
 const container=useRef<HTMLDivElement>(null);
 const [tileError,setTileError]=useState(false);
 const map=useRef<L.Map|null>(null);
 const markerLayer=useRef<L.LayerGroup|null>(null);
 const trailLineLayer=useRef<L.LayerGroup|null>(null);
 const trailMarkerLayer=useRef<L.LayerGroup|null>(null);
 const onSelectRef=useRef(onSelect);
 const onTrailSelectRef=useRef(onTrailSelect);
 const cameraCallback=useRef(onViewChange);cameraCallback.current=onViewChange;
 const initialTrail=useRef(true);
 const trailKey=trail.map(point=>`${point.id||''}:${point.latitude}:${point.longitude}:${point.label||''}`).join('|');

 onSelectRef.current=onSelect;
 onTrailSelectRef.current=onTrailSelect;

 useEffect(()=>{
  if(!container.current||map.current)return;
  // Leaflet 1.9's zoom-transition timer can fire after a layer switch removes the map.
  map.current=L.map(container.current,{zoomControl:false,attributionControl:true,zoomAnimation:false}).setView(initialView?.center||[13.035,80.235],initialView?.zoom||12);
  map.current.on('moveend',()=>{if(map.current){const center=map.current.getCenter();cameraCallback.current?.({center:[center.lat,center.lng],zoom:map.current.getZoom()})}});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:19}).on('tileerror',()=>setTileError(true)).addTo(map.current);
  L.control.zoom({position:'topright'}).addTo(map.current);
  trailLineLayer.current=L.layerGroup().addTo(map.current);
  markerLayer.current=L.layerGroup().addTo(map.current);
  trailMarkerLayer.current=L.layerGroup().addTo(map.current);
  return()=>{map.current?.remove();map.current=null;markerLayer.current=null;trailLineLayer.current=null;trailMarkerLayer.current=null};
 },[]);

 useEffect(()=>{
  if(!map.current||!trailLineLayer.current)return;
  trailLineLayer.current.clearLayers();
  if(trail.length>1){
   const points=trail.map(point=>[point.latitude,point.longitude] as L.LatLngTuple);
   L.polyline(points,{color:'#fff',weight:9,opacity:.9,interactive:false,lineJoin:'round'}).addTo(trailLineLayer.current);
   L.polyline(points,{color:'#a96f2c',weight:5,opacity:1,interactive:false,lineJoin:'round'}).addTo(trailLineLayer.current);
    const fitTrail=()=>{
     const sheet=container.current?.closest('.police-real-map')?.querySelector<HTMLElement>('.bottom-sheet');
     const sheetBounds=sheet?.getBoundingClientRect();
     const desktopPanel=window.matchMedia('(min-width: 800px)').matches;
     const paddingBottomRight:L.PointTuple=desktopPanel&&sheetBounds?[Math.round(sheetBounds.width+24),28]:[28,sheetBounds?Math.round(sheetBounds.height+24):28];
     map.current?.fitBounds(L.latLngBounds(points),{paddingTopLeft:[28,72],paddingBottomRight,maxZoom:14,animate:false});
    };
    if(!initialTrail.current||!initialView)fitTrail();
    initialTrail.current=false;
    map.current.on('resize',fitTrail);
    return()=>{map.current?.off('resize',fitTrail)};
  }
 },[trailKey]);

 useEffect(()=>{
  if(!trailMarkerLayer.current)return;
  trailMarkerLayer.current.clearLayers();
  if(trail.length>1){
   const points=trail.map(point=>[point.latitude,point.longitude] as L.LatLngTuple);
     points.forEach((point,index)=>{
        const observation=trail[index];
      const observationId=observation.id||`trail-${index}`;
      const active=observationId===selected;
        L.marker(point,{keyboard:true,riseOnHover:true,icon:L.divIcon({className:`trail-sequence${active?' selected':''}`,html:`<span>${index+1}</span>`,iconSize:[active?28:22,active?28:22],iconAnchor:[active?14:11,active?14:11]})})
         .bindTooltip(`${index+1} → ${observation.label||`Observation ${index+1}`}`)
         .on('click',()=>onTrailSelectRef.current?.(observationId))
         .addTo(trailMarkerLayer.current!);
     });
  }
 },[selected,trailKey]);

 useEffect(()=>{
  if(!markerLayer.current)return;
  markerLayer.current.clearLayers();
  markers.forEach(marker=>{
   const active=marker.id===selected;
   const color=marker.type==='incident'?'#b84940':marker.type==='watchlist'?'#c1852e':'#315c51';
     const node=L.circleMarker([marker.latitude,marker.longitude],{radius:active?11:8,color:'#fff',weight:3,fillColor:color,fillOpacity:1,className:active?'geo-marker-selected':'',bubblingMouseEvents:false});
     node.bindTooltip(marker.label,{direction:'top',offset:[0,-8]}).on('click',()=>onSelectRef.current(marker.id)).addTo(markerLayer.current!);
    const element=node.getElement();
    if(element){element.setAttribute('tabindex','0');element.setAttribute('role','button');element.setAttribute('aria-label',marker.label);element.setAttribute('aria-pressed',String(active));element.addEventListener('keydown',event=>{const key=(event as KeyboardEvent).key;if(key==='Enter'||key===' '){event.preventDefault();onSelectRef.current(marker.id)}})}
  });
 },[markers,selected]);

 return <><div className="police-geo-map" ref={container} aria-label="Interactive Police operations map"/>{tileError&&<p className="gis-map-warning" role="status">Some basemap tiles are unavailable. Observation markers and record details remain available.</p>}</>;
}
