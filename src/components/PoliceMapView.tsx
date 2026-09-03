import { useEffect, useRef } from 'react';
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
 latitude: number;
 longitude: number;
 label?: string;
};

export function PoliceMapView({markers,selected,onSelect,trail=[]}:{markers:PoliceGeoMarker[];selected?:string;onSelect:(id:string)=>void;trail?:PoliceGeoTrail[]}){
 const container=useRef<HTMLDivElement>(null);
 const map=useRef<L.Map|null>(null);
 const layer=useRef<L.LayerGroup|null>(null);

 useEffect(()=>{
  if(!container.current||map.current)return;
  map.current=L.map(container.current,{zoomControl:false,attributionControl:true}).setView([13.035,80.235],12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(map.current);
  L.control.zoom({position:'topright'}).addTo(map.current);
  layer.current=L.layerGroup().addTo(map.current);
  return()=>{map.current?.remove();map.current=null;layer.current=null};
 },[]);

 useEffect(()=>{
  if(!map.current||!layer.current)return;
  layer.current.clearLayers();
  if(trail.length>1){
   const points=trail.map(point=>[point.latitude,point.longitude] as L.LatLngTuple);
   L.polyline(points,{color:'#a96f2c',weight:3,dashArray:'7 7'}).addTo(layer.current);
   points.forEach((point,index)=>L.circleMarker(point,{radius:5,color:'#a96f2c',weight:2,fillColor:'#fff',fillOpacity:1}).bindTooltip(trail[index].label||`Observation ${index+1}`).addTo(layer.current!));
  }
  markers.forEach(marker=>{
   const active=marker.id===selected;
   const color=marker.type==='incident'?'#b84940':marker.type==='watchlist'?'#c1852e':'#315c51';
   const node=L.circleMarker([marker.latitude,marker.longitude],{radius:active?11:8,color:'#fff',weight:3,fillColor:color,fillOpacity:1,className:active?'geo-marker-selected':''});
   node.bindTooltip(marker.label,{direction:'top',offset:[0,-8]}).on('click',()=>onSelect(marker.id)).addTo(layer.current!);
  });
 },[markers,selected,onSelect,trail]);

 return <div className="police-geo-map" ref={container} aria-label="Interactive Police operations map"/>;
}
