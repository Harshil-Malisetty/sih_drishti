import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type MunicipalGeoMarker = {
 id: string;
 type: 'road' | 'infrastructure' | 'pedestrian';
 latitude: number;
 longitude: number;
 label: string;
 closed?: boolean;
};

export type MunicipalMapCamera = { center:L.LatLngTuple; zoom:number };

export function MunicipalMapView({markers,selected,initialView,onSelect,onViewChange}:{markers:MunicipalGeoMarker[];selected?:string;initialView?:MunicipalMapCamera;onSelect:(id:string)=>void;onViewChange:(camera:MunicipalMapCamera)=>void}){
 const container=useRef<HTMLDivElement>(null);
 const [tileError,setTileError]=useState(false);
 const map=useRef<L.Map|null>(null);
 const markerLayer=useRef<L.LayerGroup|null>(null);
 const onSelectRef=useRef(onSelect);
 const onViewChangeRef=useRef(onViewChange);
 const markerKey=markers.map(marker=>`${marker.id}:${marker.latitude}:${marker.longitude}`).join('|');

 onSelectRef.current=onSelect;
 onViewChangeRef.current=onViewChange;

 useEffect(()=>{
  if(!container.current||map.current)return;
  // Keep zoom immediate: a record/layer change may unmount this map at any time.
  map.current=L.map(container.current,{zoomControl:false,attributionControl:true,zoomAnimation:false}).setView(initialView?.center||[13.005,80.238],initialView?.zoom||12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).on('tileerror',()=>setTileError(true)).addTo(map.current);
  L.control.zoom({position:'topright'}).addTo(map.current);
  markerLayer.current=L.layerGroup().addTo(map.current);
  const saveView=()=>{const center=map.current?.getCenter();if(center&&map.current)onViewChangeRef.current({center:[center.lat,center.lng],zoom:map.current.getZoom()})};
  map.current.on('moveend',saveView);
  return()=>{map.current?.remove();map.current=null;markerLayer.current=null};
 },[]);

 useEffect(()=>{
  if(!map.current||!markerLayer.current)return;
  markerLayer.current.clearLayers();
  markers.forEach(marker=>{
   const active=marker.id===selected;
  const color=marker.closed?'#37705b':marker.type==='infrastructure'?'#6e7040':marker.type==='pedestrian'?'#d07b2e':'#7b6136';
  const node=L.circleMarker([marker.latitude,marker.longitude],{radius:active?11:8,color:'#fff',weight:3,fillColor:color,fillOpacity:1,className:active?'geo-marker-selected':'',bubblingMouseEvents:false})
    .bindTooltip(marker.label,{direction:'top',offset:[0,-8]})
    .on('click',()=>onSelectRef.current(marker.id))
    .addTo(markerLayer.current!);
    const element=node.getElement();
    if(element){element.setAttribute('tabindex','0');element.setAttribute('role','button');element.setAttribute('aria-label',marker.label);element.setAttribute('aria-pressed',String(active));element.addEventListener('keydown',event=>{const key=(event as KeyboardEvent).key;if(key==='Enter'||key===' '){event.preventDefault();onSelectRef.current(marker.id)}})}
  });
 },[markers,selected]);

 useEffect(()=>{
  if(!map.current||markers.length===0)return;
  if(initialView){map.current.setView(initialView.center,initialView.zoom,{animate:false});return;}
  const points=markers.map(marker=>[marker.latitude,marker.longitude] as L.LatLngTuple);
  const fitMarkers=()=>{
   const sheet=container.current?.closest('.municipal-map-page')?.querySelector<HTMLElement>('.bottom-sheet');
   const sheetBounds=sheet?.getBoundingClientRect();
   const desktopPanel=window.matchMedia('(min-width: 800px)').matches;
   const paddingBottomRight:L.PointTuple=desktopPanel&&sheetBounds?[Math.round(sheetBounds.width+24),28]:[28,sheetBounds?Math.round(sheetBounds.height+24):28];
   map.current?.fitBounds(L.latLngBounds(points),{paddingTopLeft:[28,72],paddingBottomRight,maxZoom:14,animate:false});
  };
  fitMarkers();
  map.current.on('resize',fitMarkers);
  return()=>{map.current?.off('resize',fitMarkers)};
 },[markerKey]);

 return <><div className="police-geo-map" ref={container} aria-label="Interactive municipal GIS map"/>{tileError&&<p className="gis-map-warning" role="status">Some basemap tiles are unavailable. Use the issue register or marker details.</p>}</>;
}