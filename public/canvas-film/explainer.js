import { C, createIllustration } from './illustration.js';
import { clamp, ease, mix, progress } from './timeline.js';
import { POTHOLE, WATER, INFRASTRUCTURE, calculatePlanning, trafficRatio, distanceKm } from './model.js';

export function createScenes(ctx) {
  const A = createIllustration(ctx);
  const { group, opacity, rect, ellipse, circle, line, polygon, text, pill, backdrop, heading,
    appear, arrow, check, cross, eye, clock, pin, camera, bus, car, person, roadTile, portrait,
    connector, curve, packet, node, number, smallRoad } = A;
  const note = (value, color = C.muted) => text(value, 960, 885, 25, color, 500, 'center');
  function frameCorners(x, y, w, h, color = C.teal) {
    const d = 27;
    line([[x,y+d],[x,y],[x+d,y]],color,6); line([[x+w-d,y],[x+w,y],[x+w,y+d]],color,6);
    line([[x,y+h-d],[x,y+h],[x+d,y+h]],color,6);line([[x+w-d,y+h],[x+w,y+h],[x+w,y+h-d]],color,6);
  }
  function opening(t) {
    backdrop(t);
    heading('01 / THE QUESTION', 'What if a road could remember?');
    const p = progress(t, 2.5, 6);
    roadTile(mix(960,650,p),596,mix(1.4,1.05,p),'pothole',mix(.15,.92,progress(t,0,4)),t);
    if(t>2.5) {
      appear(1275,540,t,2.5,()=>{clock(0,0,1.4);text('Yesterday',0,90,31,C.muted,500,'center');});
      appear(1540,540,t,3.8,()=>{pin(0,0,1.25);text('Today',0,90,31,C.paper,800,'center');});
      connector(curve([1340,540],[1470,540],-35),progress(t,4.2,5.3),C.purple);
      if(t>5) text('The same road. A changing condition.', 1360, 740, 27, C.teal, 500, 'center');
    }
    note('An observation is more useful when it has a history.');
  }
  function coverage(t) {
    backdrop(t,C.teal);
    heading('02 / OBSERVATION', t<5?'A camera can miss what happens next.':'One image becomes a useful observation.', 'FLEET AI IS A PRODUCT-VISION ILLUSTRATION · NO LIVE INFERENCE');
    if(t<5){
      smallRoad(960,676,1160);camera(482,467,1.55,t>3);
      opacity(.2,()=>polygon([[603,464],[694,641],[1134,641]],C.yellow));
      roadTile(1443,639,.67,'pothole',.9,t);
      text('Visible patch',893,777,30,C.yellow,800,'center');text('Blind spot',1454,777,30,C.coral,800,'center');
      if(t>2.2)cross(1170,591,.8);note('Fixed viewpoint ≠ continuous coverage');
    }else{
      const shrink=progress(t,8,10),bx=mix(mix(350,900,progress(t,5,8)),430,shrink);
      smallRoad(mix(960,450,shrink),680,mix(1180,550,shrink));
      bus(bx,645,mix(1.4,1,shrink),t);
      if(t<9)opacity(.18,()=>polygon([[bx+158,495],[bx+403,620],[bx+246,688]],C.teal));
      const px=mix(1360,925,shrink);roadTile(px,621,.57,'pothole',.8,t);
      if(t>6.5) frameCorners(px-161,511,325,210);
      if(t>8.5){
        appear(1400,510,t,8.5,()=>{eye(0,-15,.8);text('Road reference',0,68,27,C.paper,800,'center');text('OMR · Sholinganallur',0,111,25,C.teal,500,'center');});
        appear(1400,712,t,10,()=>{clock(-89,-9,.58);text('Capture time',-38,0,27,C.paper);text('Evidence + source',0,58,24,C.muted,500,'center');});
        connector(curve([626,555],[739,555],-38),progress(t,8.5,9.4),C.teal);arrow(687,532,C.teal);
        connector(curve([1090,567],[1226,538],-20),progress(t,9.2,10.1),C.teal);arrow(1170,540,C.teal);
      }
      note('Not just a picture: what happened, where, when, and which source.');
    }
  }
  function observation(x,y,label,time,t,second=false){
    circle(x,y,157,C.panel);smallRoad(x,y+57,257);car(x,y+33,.95,t,C.coral);frameCorners(x-121,y-107,240,170,C.yellow);
    text(label,x,y+204,27,C.paper,800,'center');text(time,x,y+247,25,C.muted,500,'center');
    if(second)pin(x+125,y-94,.55,C.purple);
  }
  function investigation(t){
    backdrop(t,C.coral);
    if(t<4){
      heading('03 / EVIDENCE', 'Which way did that vehicle go?', 'FICTIONAL, NON-GRAPHIC INCIDENT');
      smallRoad(960,663,1170);car(mix(780,1460,progress(t,0,3.6)),622,1.4,t);
      opacity(1-progress(t,0,1.8),()=>{const r=45+progress(t,0,1.8)*100;circle(733,613,r,'#ff876d30');line([[635,567],[662,581]],C.yellow,7);line([[688,696],[699,675]],C.yellow,7);});
      appear(472,431,t,.7,()=>{text('?',0,0,124,C.yellow,800,'center');});
      note('A vehicle leaves. The evidence is in separate observations.');
    }else if(t<12){
      heading('03 / EVIDENCE', 'A connection—not an identification.', 'SIMULATED CANDIDATES · NO IDENTITY CERTAINTY');
      observation(472,515,'Observation A','08:42:16',t);
      if(t>5.4)appear(1448,515,t,5.4,()=>observation(0,0,'Observation B','08:43:02',t,true));
      connector(curve([655,511],[1265,511],-75),progress(t,6.3,8.4),C.yellow,7,true);
      if(t>6.5){appear(960,420,t,6.5,()=>{text('46 seconds apart',0,0,37,C.paper,800,'center');});}
      if(t>8){circle(879,628,22,C.coral);text('Colour + body',930,638,29,C.muted);text('Possible match',960,752,41,C.yellow,800,'center');}
      note('Appearance + place + time are evidence. They are not proof of identity.');
    }else if(t<14){
      heading('03 / EVIDENCE', 'Driving behaviour needs context.', 'POTENTIAL RASH-DRIVING REPORT · NO AUTOMATED FINDING OF FAULT');
      smallRoad(880,672,700);car(830+Math.sin(t*2)*60,620,1.6,t,C.purple);portrait(1400,522,1.25,'police',t);
      frameCorners(480,401,700,353,C.yellow);note('Keep the observation. Do not invent a conclusion.');
    }else{
      heading('03 / EVIDENCE', 'A missing-person candidate is still a candidate.', 'ILLUSTRATIVE PEOPLE · HUMAN EVIDENCE REVIEW');
      portrait(595,529,1.6,'citizen',t);portrait(1325,529,1.6,'citizen',t);
      connector(curve([794,530],[1126,530],-53),progress(t,14,15.1),C.yellow,6,true);
      text('?',960,557,92,C.yellow,800,'center');text('Reference',595,773,29,C.muted,500,'center');text('Possible sighting',1325,773,29,C.paper,800,'center');
      note('No automatic identity claim.');
    }
  }
  function historyGraph(data, visible, {x=225,y=346,w=930,h=410,threshold=true}={}){
    const maxDay=data.days.at(-1),point=i=>[x+(data.days[i]-1)/(maxDay-1)*w,y+h-data.values[i]/100*h];
    [0,50,100].forEach(v=>{const yy=y+h-v/100*h;line([[x,yy],[x+w,yy]],C.faint,2);text(v,x-27,yy+8,22,C.muted,500,'right');});
    text('Demo condition index',x,y-35,24,C.muted);text('Observation day',x+w/2,y+h+91,24,C.muted,500,'center');
    if(threshold){const yy=y+h-data.threshold/100*h;line([[x,yy],[x+w,yy]],C.yellow,3,[12,11]);text(`Reference ${data.threshold}`,x+10,yy-15,22,C.yellow,800);}
    const max=clamp(visible,0,data.values.length-1);
    for(let i=0;i<data.values.length-1;i++){
      const p=clamp(max-i);if(p<=0)continue;const a=point(i),b=point(i+1),end=[mix(a[0],b[0],p),mix(a[1],b[1],p)];
      opacity(.07,()=>polygon([a,end,[end[0],y+h],[a[0],y+h]],i>=3?C.teal:C.coral));line([a,end],i>=3?C.teal:C.coral,8);
    }
    for(let i=0;i<data.values.length;i++){if(i>max+.03)continue;const p=point(i);circle(...p,12,i>=4?C.teal:C.coral);circle(...p,4,C.paper);text(data.values[i],p[0],p[1]-24,28,C.paper,800,'center');text(data.days[i],p[0],y+h+40,22,C.muted,500,'center');}
    return point;
  }
  function maintenance(t){
    backdrop(t,C.coral);
    heading('04 / THE LIFECYCLE GRAPH', t<5?'A photograph is a moment.':'A history shows the change.', 'ACTUAL DEMO SERIES · STORED INDEX, NOT IMAGE-MEASURED DAMAGE');
    const move=progress(t,3,5);const stages=[5,8,11,13,19,21.5];
    let v=0;for(let i=1;i<stages.length;i++)v+=progress(t,stages[i]-.9,stages[i]);
    opacity(move,()=>historyGraph(POTHOLE,v));
    const repaired=t>=18.2,amount=clamp(mix(.18,.88,Math.min(v,3)/3));
    roadTile(mix(960,1500,move),mix(588,570,move),mix(1.45,.76,move),repaired?'repaired':'pothole',amount,t);
    if(t>5){text(POTHOLE.id,1500,755,24,C.teal,800,'center');text('The same recorded issue',1500,797,24,C.muted,500,'center');}
    if(t>=13&&t<17.5){pill('88 > 70',1406,338,C.yellow,28);note('The reference line informs a person. It does not trigger work automatically.',C.yellow);}
    else if(t>=17.5){
      appear(1500,358,t,17.5,()=>{text(t<21?'Repair record':'Verification record',0,0,31,C.teal,800,'center');});
      note('88 → 42 → 8: later records complete the story—not a fabricated AI score.');
    }else note('One road reference links repeat observations over time.');
  }
  function waterlogging(t){
    backdrop(t,C.blue);
    heading('05 / RECURRENCE', t<4?'Why does the water keep coming back?':'Repeat observations reveal persistence.', 'ACTUAL DEMO SERIES · NOT WATER DEPTH OR A RAINFALL FORECAST');
    const p=progress(t,2.8,4.5);roadTile(mix(960,1490,p),mix(565,570,p),mix(1.35,.77,p),'water',mix(.32,.93,progress(t,0,10)),t);
    opacity(p,()=>historyGraph(WATER,progress(t,4,6)+progress(t,6.2,8.1)+progress(t,9,10.8)));
    if(t>4.5){text(WATER.id,1490,744,24,C.blue,800,'center');text('Velachery Main Road',1490,791,26,C.muted,500,'center');}
    note(t<4?'Rain stops. A persistent drainage problem may not.':'24 → 48 → 72 → 90 in this recorded demonstration.',C.blue);
  }
  function infrastructure(t){
    backdrop(t,C.purple);
    heading('06 / NOT JUST POTHOLES', 'Different problems. The same need for history.', 'ONE PROBLEM AT A TIME · CONDITION RECORDS, NOT LIVE DETECTORS');
    const i=Math.min(5,Math.floor(t/3)),r=INFRASTRUCTURE[i],local=t-i*3,p=progress(local,0,.55);
    group(0,(1-p)*28,1,()=>{
      roadTile(618,601,1.27,r.kind,mix(.32,.9,progress(local,0,2.4)),t);
      text(r.label,1380,429,38,C.paper,800,'center');text(r.place,1380,480,27,C.muted,500,'center');
      if(r.values){
        const points=r.values.map((v,k)=>[1180+k*134,739-v*1.85]);
        line([[1165,740],[1600,740]],C.faint,3);connector(points,progress(local,.25,2.2),C.purple,8);
        r.values.forEach((v,k)=>{if(progress(local,.25,2.2)*3>=k){circle(...points[k],9,C.purple);text(v,points[k][0],points[k][1]-23,26,C.paper,800,'center');}});
        text('Stored demo condition index',1380,797,23,C.muted,500,'center');
      }else{
        pin(1235,625,.88,C.coral);clock(1400,625,.88);eye(1560,615,.7);
        text('Place',1235,704,24,C.muted,500,'center');text('Time',1400,704,24,C.muted,500,'center');text('Evidence',1560,704,24,C.muted,500,'center');
      }
    });
    for(let k=0;k<6;k++)circle(885+k*30,882,k===i?7:4,k===i?C.purple:C.faint);
  }
  function traffic(t){
    backdrop(t,C.yellow);
    if(t<3){
      heading('07 / TRAFFIC', 'One obstruction can become everybody’s delay.', 'UNSAFE PARKING / TRAFFIC OBSTRUCTION · ILLUSTRATIVE OBSERVATION');
      roadTile(820,598,1.4,'parking',1,t);person(1440,744,1.65,'police',t,'point');note('The obstruction is a case. The traffic count is separate evidence.');return;
    }
    heading('07 / A SIMPLE COMPARISON', 'Is this traffic unusual?', 'SAME CORRIDOR · SAME 60-MINUTE WINDOW · SUPPLIED DEMO COUNTS');
    const later=t>=10, q=later?mix(184,60,progress(t,10,11.2)):mix(60,184,progress(t,3.8,6.2));
    const x=533,w=850,scale=w/220;
    text('Baseline',473,426,31,C.muted,500,'right');text(later?'Later count':'Current count',473,631,31,C.paper,800,'right');
    rect(x,370,w,86,C.panel,24);rect(x,575,w,86,C.panel,24);
    rect(x,370,60*scale,86,C.purple,24);rect(x,575,q*scale,86,later?C.teal:C.coral,24);
    number(60,x+60*scale+66,426,41,C.purple);number(Math.round(q),x+q*scale+69,631,41,later?C.teal:C.coral);
    line([[x+120*scale,331],[x+120*scale,703]],C.yellow,3,[10,12]);text('2× baseline',x+120*scale,305,24,C.yellow,800,'center');
    if(t>5.5)text(`${later?60:184} ÷ 60 = ${trafficRatio(later?60:184,60).toFixed(1)}×`,960,802,65,later?C.teal:C.paper,800,'center');
    note(later?'A later observation below 2× is evidence of recovery.':'At least 2× baseline can create an anomaly candidate.');
  }
  const scenario=calculatePlanning();
  function planning(t){
    backdrop(t,C.teal);
    heading('08 / THE CLOSURE CALCULATION', t<4?'Close one road. Move the pressure.':t<18?'How is the displaced traffic shared?':'How much capacity does that leave?', 'ACTUAL DEMO MODEL · 8 WEEKS · CORRIDOR RECORDS, NOT A GEOGRAPHIC MAP');
    if(t<4){
      smallRoad(960,650,1120);car(mix(470,750,progress(t,0,2)),610,1.15,t);cross(1060,648,1.7);rect(1230,438,170,157,C.purple,25);text('METRO',1315,522,28,C.ink,800,'center');
      note('Anna Salai closes; its connected corridors receive modelled extra load.');return;
    }
    if(t<18){
      const source=[472,575], destinations=[[1175,389],[1485,566],[1175,710]];
      text('round(184 × 0.70) = 129',960,301,44,C.teal,800,'center');
      scenario.affected.forEach((road,i)=>{
        const [x,y]=destinations[i],r=curve([source[0]+111,source[1]],[x-85,y],i===0?-44:i===2?44:0);
        connector(r,progress(t,8+i*.4,10+i*.4),[C.yellow,C.purple,C.blue][i],8);
        if(t>10+i*.4)packet(r,t*.29+i*.2,[C.yellow,C.purple,C.blue][i]);
        appear(x,y,t,6+i*.65,()=>{node(0,0,69,[C.yellow,C.purple,C.blue][i],t>=12?`+${road.additionalVehicles}`:`${road.spare}`);text(road.name,0,112,27,C.paper,800,'center');text(t>=12?'vehicles / hour':'spare-capacity weight',0,148,21,C.muted,500,'center');});
      });
      node(...source,106,C.teal,String(scenario.displaced));text('Anna Salai',source[0],source[1]+157,31,C.paper,800,'center');text('displaced vehicles / hour',source[0],source[1]+203,24,C.muted,500,'center');
      note(t<12?'Spare weights: 54 + 52 + 49 = 155':t<15?'Cathedral’s share: round(129 × 54 ÷ 155) = 45':'45 + 43 + 41 = 129 vehicles / hour in this example');
    }else{
      const r=scenario.affected[0],p=progress(t,18,20);
      text('Cathedral Road',960,346,38,C.muted,500,'center');
      text('116 + 45 = 161',960,460,78,C.paper,800,'center');
      rect(456,558,1008,83,C.panel,30);rect(456,558,1008*mix(116/170,r.saturation,p),83,C.teal,30);
      line([[1464,545],[1464,658]],C.yellow,4);text('Capacity 170',1464,706,27,C.yellow,500,'center');
      if(t>19.5)text('161 ÷ 170 = 94.7%',960,798,62,C.teal,800,'center');
      note('Sharing weight is not a hard cap. This is a scenario estimate—not a traffic forecast.');
    }
  }
  function citizen(t){
    backdrop(t,C.purple);
    heading('09 / WHAT REACHES YOUR JOURNEY', t<6?'Old information describes the wrong road.':'A closed road is not just a slower road.', t<6?'MAPS CAN LAG LOCAL CHANGES · NO LIVE BUS-ARRIVAL SERVICE':'DRISHTI MAP ONLY · SCHEMATIC ROUTE CANDIDATES');
    if(t<6){
      roadTile(600,600,1.06,'debris',1,t);cross(620,469,1);
      rect(1120,334,480,400,C.panel,40);text('OLD INFORMATION',1360,404,26,C.yellow,800,'center');
      const label=t<4?'Bus / road notices':'Route still looks open';clock(1240,496,.7);text(label,1390,506,27,C.paper,500,'center');line([[1190,574],[1530,574]],C.purple,10);line([[1190,617],[1467,617]],C.faint,10);text('Last update?',1360,684,28,C.muted,500,'center');
      note('The physical change and the displayed information do not agree.');return;
    }
    const a=[435,585],b=[1490,585],upper=[[490,565],[810,390],[1110,390],[1435,565]],lower=[[490,607],[810,773],[1110,773],[1435,607]];
    const published=t>=10;
    connector(upper,1,published?C.faint:C.purple,10,published);connector(lower,progress(t,7,8.5),C.teal,10);
    node(...a,59,C.purple,'A');node(...b,59,C.teal,'B');text('Start',435,710,27,C.muted,500,'center');text('Destination',1490,710,27,C.muted,500,'center');
    if(t>=6&&t<10){appear(960,505,t,6,()=>{rect(-163,-60,326,123,C.panel,25);pin(-99,0,.6);text('Approved restriction',30,2,25,C.paper,800,'center');text('Shared city record',0,43,22,C.muted,500,'center');});}
    if(published){cross(960,390,1.1);text('Unavailable · no ETA',960,306,35,C.coral,800,'center');}
    else{text('Candidate through the affected road',960,308,28,C.muted,500,'center');}
    if(t>=14){packet(lower,(t-14)*.23,C.paper);text('Compare remaining estimates',960,717,33,C.teal,800,'center');}
    note(t<10?'Draft calculations do not change public routes.':t<14?'Active, published closure + route uses the segment → unavailable':'Available route estimate = baseline minutes + active recorded delays');
  }
  function station(x,y,label,color){circle(x,y,93,C.panel);rect(x-51,y-49,102,93,color,14);polygon([[x-62,y-49],[x,y-92],[x+62,y-49]],C.paper);rect(x-12,y+1,24,43,C.ink,[10,10,0,0]);text(label,x,y+146,28,C.paper,800,'center');}
  function emergency(t){
    backdrop(t,C.blue);
    heading('10 / A SMALL DISTANCE GRAPH', 'Which station is nearest to the event?', 'ILLUSTRATIVE COORDINATES · STRAIGHT-LINE DISTANCE, NOT ROAD ETA');
    const a=[486,625],b=[1111,422],c=[1460,740];
    const near=distanceKm([0,0],[0,.01]).toFixed(2),far=distanceKm([0,0],[0,.02]).toFixed(2);
    connector(curve(a,b,-60),progress(t,1,3),t>7?C.teal:C.blue,8);
    connector(curve(a,c,27),progress(t,2,4),t>7?C.faint:C.purple,7,true);
    node(...a,85,C.coral);pin(...a,1.4,C.ink);text('Eligible event',a[0],a[1]+145,29,C.paper,800,'center');
    station(...b,'Station A',C.blue);station(...c,'Station B',C.purple);
    if(t>4){text(`${near} km`,739,416,42,t>7?C.teal:C.blue,800,'center');text(`${far} km`,980,775,40,C.muted,800,'center');}
    if(t>7){check(1191,339,.8);text(`${near} < ${far}`,960,310,40,C.teal,800,'center');}
    note('Nearest in the prototype directory ≠ fastest available response unit.');
  }
  function connected(t){
    t=Math.min(t,19.1);
    backdrop(t,C.teal);
    if(t<14){
      heading('11 / THE CONNECTION', 'Evidence becomes a shared understanding.', 'PRODUCT VISION + PROTOTYPE · HUMAN DECISIONS REMAIN ESSENTIAL');
      const links=[curve([493,557],[847,557],-70),curve([1073,557],[1427,557],70)];
      connector(links[0],progress(t,3,6),C.purple,8);connector(links[1],progress(t,8,11),C.teal,8);
      circle(390,555,95,C.panel);camera(386,548,.85);text('Evidence',390,734,36,C.paper,800,'center');
      appear(960,555,t,4,()=>{circle(0,0,104,C.panel);line([[-68,42],[-26,9],[10,-58],[63,40]],C.coral,7);[[-68,42],[-26,9],[10,-58],[63,40]].forEach(p=>circle(...p,7,C.paper));text('Road history',0,179,36,C.paper,800,'center');});
      appear(1530,555,t,8.5,()=>{circle(0,0,95,C.panel);pin(-25,10,.85,C.teal);line([[-17,36],[43,36],[43,-22]],C.purple,6);text('Journey context',0,179,36,C.paper,800,'center');});
      if(t>6)packet(links[0],t*.3,C.paper);if(t>11)packet(links[1],t*.3,C.paper);
      note(t<5?'Police connect observations—not assumed identities.':t<9?'Municipal teams can see the recorded condition over time.':'Citizens receive approved changes and contribute reports.');
    }else{
      const p=progress(t,14,16);opacity(p,()=>{eye(960,353,2.25);text('DRISHTI',960,544,127,C.paper,800,'center');text('One city. One connected view.',960,638,42,C.teal,500,'center');
        connector(curve([587,740],[1333,740],45),progress(t,15,17),C.purple,5);[587,960,1333].forEach((x,i)=>circle(x,i===1?785:740,10,C.teal));
        text('A connected record. Not another isolated alert.',960,864,26,C.muted,500,'center');});
    }
  }
  const scenes={opening,coverage,investigation,maintenance,waterlogging,infrastructure,traffic,planning,citizen,emergency,connected};
  return {draw:(id,t)=>scenes[id](t),art:A};
}