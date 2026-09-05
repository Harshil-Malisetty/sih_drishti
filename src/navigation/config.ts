import { Activity, AlertTriangle, Bell, Binoculars, Construction, Map, Navigation, Route, ShieldAlert, Wrench } from 'lucide-react';
export const navigation={
 police:[{id:'overview',label:'Overview',icon:Activity},{id:'incidents',label:'Incidents',icon:ShieldAlert},{id:'watchlist',label:'Watchlist',icon:Binoculars},{id:'map',label:'Map',icon:Map}],
 municipal:[{id:'overview',label:'Overview',icon:Activity},{id:'planning',label:'Planning',icon:Construction},{id:'defects',label:'Defects',icon:Wrench},{id:'map',label:'Map',icon:Map}],
 citizen:[{id:'map',label:'Map',icon:Map},{id:'routes',label:'Routes',icon:Route},{id:'alerts',label:'On route',icon:Bell}]
};
export const roleIcons={police:ShieldAlert,municipal:AlertTriangle,citizen:Navigation};