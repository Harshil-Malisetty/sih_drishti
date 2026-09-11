import { clamp, ease, mix } from './timeline.js';

// Original geometric explainer artwork: strong silhouettes, large subjects,
// restrained compositions and bright accents. No channel artwork is reused.
export const C = {
  sky: '#171b38', ink: '#171b38', panel: '#23294c', faint: '#363b63',
  paper: '#fff4dd', white: '#fff9ed', muted: '#b5b9d6',
  teal: '#4bd9c6', mint: '#a7f0b5', yellow: '#ffd075',
  coral: '#ff876d', red: '#f26b8d', purple: '#9d8cff', blue: '#6ebcf4',
  road: '#424566', skin: '#eab17f', hair: '#363254',
};

export function createIllustration(ctx) {
  function group(x, y, scale, draw, angle = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale); draw(); ctx.restore();
  }
  function opacity(a, draw) { ctx.save(); ctx.globalAlpha *= clamp(a); draw(); ctx.restore(); }
  function rect(x, y, w, h, fill, r = 0) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
  }
  function ellipse(x, y, rx, ry, fill) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }
  const circle = (x, y, r, fill) => ellipse(x, y, r, r, fill);
  function line(points, color, width = 5, dash = []) {
    ctx.beginPath(); ctx.moveTo(...points[0]); points.slice(1).forEach(p => ctx.lineTo(...p));
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.setLineDash(dash); ctx.stroke(); ctx.setLineDash([]);
  }
  function polygon(points, fill) { ctx.beginPath(); ctx.moveTo(...points[0]); points.slice(1).forEach(p => ctx.lineTo(...p)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
  function text(value, x, y, size = 32, color = C.paper, weight = 500, align = 'left') {
    ctx.font = `${weight} ${size}px "Film Sans"`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillText(String(value), x, y);
  }
  function pill(value, x, y, color = C.teal, size = 20) {
    ctx.font = `800 ${size}px "Film Sans"`; const w = ctx.measureText(value).width + 36;
    rect(x, y, w, 42, color, 21); text(value, x + 18, y + 29, size, C.ink, 800); return w;
  }
  function backdrop(t, accent = C.purple) {
    rect(0, 0, 1920, 1080, C.sky);
    opacity(.035, () => { circle(1600, 610, 520, accent); circle(170, 870, 360, accent); });
    // A small brand anchor, not a permanent dashboard header.
    text('DRISHTI', 80, 68, 21, C.muted, 800);
  }
  function heading(chapter, value, qualifier = 'ILLUSTRATED PRODUCT EXPLAINER') {
    text(chapter, 1840, 68, 19, C.muted, 500, 'right');
    text(value, 80, 155, 57, C.paper, 800);
    text(qualifier, 82, 205, 19, C.muted);
  }
  function appear(x, y, t, start, draw, scale = 1) {
    const p = ease((t - start) / .65);
    if (p > 0) opacity(p, () => group(x, y + (1 - p) * 34, scale * mix(.88, 1, p), draw));
  }
  function arrow(x, y, color = C.teal, angle = 0, s = 1) {
    group(x, y, s, () => { line([[-30, 0], [27, 0]], color, 7); line([[13, -16], [29, 0], [13, 16]], color, 7); }, angle);
  }
  function check(x, y, s = 1, color = C.teal) {
    group(x, y, s, () => { circle(0, 0, 27, color); line([[-12, 0], [-3, 10], [14, -10]], C.ink, 5); });
  }
  function cross(x, y, s = 1, color = C.coral) {
    group(x, y, s, () => { circle(0, 0, 26, color); line([[-8, -8], [8, 8]], C.ink, 5); line([[-8, 8], [8, -8]], C.ink, 5); });
  }
  function eye(x, y, s = 1) {
    group(x, y, s, () => { ctx.beginPath(); ctx.moveTo(-54, 0); ctx.bezierCurveTo(-27,-43,27,-43,54,0); ctx.bezierCurveTo(27,43,-27,43,-54,0); ctx.fillStyle=C.teal;ctx.fill();circle(0,0,23,C.ink);circle(7,-8,7,C.paper); });
  }
  function clock(x, y, s = 1) { group(x,y,s,()=>{circle(0,0,29,C.yellow);line([[0,-17],[0,0],[13,6]],C.ink,5);}); }
  function pin(x, y, s = 1, color = C.coral) { group(x,y,s,()=>{polygon([[-20,-6],[0,26],[20,-6]],color);circle(0,-13,26,color);circle(0,-13,9,C.ink);}); }
  function camera(x, y, s = 1, offline = false) {
    group(x,y,s,()=>{line([[-40,80],[-40,5],[0,5]],C.purple,15);rect(-36,-34,114,66,C.paper,19);polygon([[73,-22],[106,-36],[106,35],[73,22]],C.teal);circle(38,-1,10,offline?C.red:C.ink);rect(-27,-44,74,11,C.purple,5);if(offline)cross(57,-49,.55);});
  }
  function wheel(x,y,t,r=24){circle(x,y,r,C.ink);circle(x,y,r*.54,C.purple);const a=t*5;line([[x-Math.cos(a)*r*.35,y-Math.sin(a)*r*.35],[x+Math.cos(a)*r*.35,y+Math.sin(a)*r*.35]],C.paper,4);}
  function bus(x,y,s=1,t=0){group(x,y,s,()=>{
    ellipse(0,12,151,16,'#0e122a');rect(-153,-123,306,118,C.teal,[26,32,12,12]);rect(-152,-35,304,23,C.paper);rect(-152,-16,304,14,C.purple,[0,0,12,12]);
    for(let i=0;i<5;i++){rect(-133+i*53,-106,43,58,C.ink,9);circle(-111+i*53,-76,10,C.skin);rect(-127+i*53,-66,30,18,i%2?C.coral:C.purple,8);line([[-124+i*53,-96],[-105+i*53,-96]],'#567184',4);}
    rect(127,-92,15,76,C.ink,4);wheel(-100,0,t);wheel(99,0,t);rect(81,-137,32,15,C.paper,5);circle(104,-130,5,C.ink);text('MTC 27B',-46,-17,14,C.ink,800);
  });}
  function car(x,y,s=1,t=0,color=C.coral){group(x,y,s,()=>{
    ellipse(0,10,109,13,'#0e122a');polygon([[-83,-45],[-52,-98],[39,-98],[80,-45]],color);rect(-104,-52,208,49,color,[23,28,12,12]);polygon([[-43,-87],[-65,-51],[-6,-51],[-6,-87]],C.ink);polygon([[5,-87],[33,-87],[61,-51],[5,-51]],'#70668b');rect(80,-38,23,11,C.yellow,5);wheel(-63,0,t,22);wheel(64,0,t,22);
  });}
  function person(x,y,s=1,role='citizen',t=0,pose='still'){
    group(x,y,s,()=>{
      const stride=pose==='walk'?Math.sin(t*7)*15:0,bob=pose==='walk'?Math.abs(Math.sin(t*7))*3:Math.sin(t*1.5)*1.3;
      ellipse(0,4,43,10,'#0e122a');line([[-17,-58],[-24+stride,-6]],C.purple,19);line([[17,-58],[23-stride,-6]],C.purple,19);rect(-41+stride,-10,39,15,C.ink,8);rect(8-stride,-10,39,15,C.ink,8);
      ctx.translate(0,-bob);const color={citizen:C.coral,police:C.blue,municipality:C.teal,crew:C.yellow,representative:C.purple}[role];
      rect(-39,-140,78,89,color,[28,28,19,19]);line([[-34,-115],[-52-stride/2,-67]],color,19);line([[34,-113],[56,-91],[67,-112+(pose==='point'?-25:0)]],color,18);circle(-52-stride/2,-64,11,C.skin);circle(67,-112+(pose==='point'?-25:0),11,C.skin);
      rect(-11,-158,22,26,C.skin,8);ellipse(0,-187,43,46,C.skin);ellipse(-10,-215,36,23,C.hair);ellipse(-32,-194,13,26,C.hair);circle(44,-185,9,C.skin);
      circle(8,-188,3.5,C.ink);circle(29,-188,3.5,C.ink);line([[15,-169],[25,-169]],'#aa675d',3);ellipse(35,-176,6,3,'#d38773');
      if(role==='police'){rect(-42,-228,87,17,C.blue,7);rect(-27,-250,59,28,C.blue,[12,12,0,0]);circle(9,-228,7,C.yellow);rect(-32,-72,64,8,C.ink,2);rect(15,-122,10,13,C.yellow,3);}
      if(role==='crew'){ellipse(0,-227,49,23,C.yellow);rect(-50,-230,100,14,C.yellow,6);line([[-18,-135],[-18,-58]],C.paper,7);line([[18,-135],[18,-58]],C.paper,7);}
      if(role==='municipality'){line([[-14,-140],[1,-99],[16,-140]],C.paper,3);rect(-8,-103,20,27,C.paper,4);}
      if(role==='citizen'){line([[-24,-137],[24,-61]],C.yellow,9);rect(18,-86,35,38,C.yellow,10);}
    });
  }
  function roadTile(x,y,s=1,kind='pothole',amount=.6,t=0){group(x,y,s,()=>{
    ellipse(0,125,239,32,'#10142b');rect(-242,-111,484,234,'#2d3154',40);rect(-242,-132,484,232,C.road,37);
    line([[-208,68],[208,68]],'#8280a0',4);for(let i=0;i<5;i++)rect(-203+i*91,-19,46,7,C.yellow,4);
    if(kind==='pothole'){
      line([[-100,-37],[-65,-48],[-41,-26],[-8,-57],[19,-31],[62,-53],[119,-29]],C.ink,4+amount*5);
      ellipse(0,-35,91*amount,35*amount,C.ink);ellipse(3,-40,67*amount,24*amount,'#876e80');ellipse(4,-32,55*amount,19*amount,'#212443');
    }else if(kind==='repaired'){
      rect(-101,-75,202,89,'#626d89',28);for(let i=0;i<8;i++)circle(-72+i*21,-46+(i%2)*25,2,'#919cab');
    }else if(kind==='water'){
      ellipse(10,12,190*amount,63*amount,C.blue);ellipse(4,5,149*amount,43*amount,'#538be5');
      for(let i=0;i<3;i++)line([[-97+i*31,-11+i*19],[-55+i*31+Math.sin(t*2+i)*12,-11+i*19]],'#b9e9fb',5);
      for(let i=0;i<7;i++){const dx=-155+i*52,dy=-200+((t*110+i*44)%140);line([[dx,dy],[dx-7,dy+19]],C.blue,5);}
      rect(157,-91,57,45,C.ink,8);for(let i=0;i<4;i++)line([[165+i*12,-83],[165+i*12,-55]],C.faint,4);
    }else if(kind==='crossing'||kind==='school'){
      for(let i=0;i<6;i++)opacity(1-amount*.85,()=>rect(-98+i*37,-117,22,192,C.paper,3));
      if(kind==='school'){rect(-140,-257,280,112,C.purple,[24,24,0,0]);polygon([[-165,-257],[0,-325],[165,-257]],C.coral);rect(-26,-212,52,67,C.ink,[22,22,0,0]);text('SCHOOL',0,-227,19,C.paper,800,'center');person(103,48,.52,'citizen',t,'still');}
    }else if(kind==='divider'){
      for(let i=0;i<4;i++)group(-149+i*98,-25+(i===2?amount*39:0),1,()=>{rect(-43,-34,85,58,C.yellow,9);rect(-43,-2,85,26,C.coral,[0,0,9,9]);},i===2?amount*.3:0);
    }else if(kind==='sign'){
      line([[6,23],[6,-191]],C.purple,15);group(6,-159,1,()=>{rect(-90,-52,180,95,C.teal,16);arrow(8,-5,C.ink,0,1.3);},amount*.55);
      if(amount>.7)line([[-54,-177],[38,-120]],C.ink,7);
    }else if(kind==='guardrail'){
      for(let i=0;i<4;i++)line([[-169+i*110,-13],[-169+i*110,-102]],C.purple,13);
      line([[-201,-87],[-88,-87],[0,-87+amount*53],[92,-87],[201,-87]],C.paper,22);line([[-197,-87],[-88,-87],[0,-87+amount*53],[92,-87],[197,-87]],C.blue,5);
    }else if(kind==='debris'){
      polygon([[-88,-56],[-36,-112],[23,-80],[8,-18],[-66,-6]],'#ae86bb');polygon([[13,-29],[65,-82],[131,-32],[76,0]],C.yellow);line([[-89,45],[96,45]],C.coral,6,[16,14]);
    }else if(kind==='parking'){
      car(7,-11,.88,0,C.purple);line([[-178,-84],[-178,47]],C.coral,10);cross(-176,-119,.7);
    }
  },-.07);}
  function portrait(x,y,s=1,role='citizen',t=0){group(x,y,s,()=>{circle(0,0,101,C.panel);ctx.save();ctx.beginPath();ctx.arc(0,0,96,0,Math.PI*2);ctx.clip();person(0,145,1.12,role,t);ctx.restore();});}
  function connector(points, amount=1, color=C.teal, width=7, dashed=false){
    if(points.length<2||amount<=0)return;
    const p=clamp(amount)*(points.length-1),i=Math.floor(p),partial=points.slice(0,i+1);
    if(i<points.length-1)partial.push([mix(points[i][0],points[i+1][0],p-i),mix(points[i][1],points[i+1][1],p-i)]);
    if(partial.length>1)line(partial,color,width,dashed?[13,12]:[]);
  }
  function curve(a,b,bend=0){return Array.from({length:41},(_,i)=>{const t=i/40;return[mix(a[0],b[0],t),mix(a[1],b[1],t)+Math.sin(Math.PI*t)*bend];});}
  function packet(points,t,color=C.paper){const p=((t%1)+1)%1*(points.length-1),i=Math.floor(p),j=Math.min(i+1,points.length-1);circle(mix(points[i][0],points[j][0],p-i),mix(points[i][1],points[j][1],p-i),9,color);}
  function node(x,y,r,color=C.purple,label=''){circle(x,y,r+8,C.sky);circle(x,y,r,color);if(label)text(label,x,y+12,r*.7,C.ink,800,'center');}
  function number(value,x,y,size=90,color=C.paper){text(value,x,y,size,color,800,'center');}
  function smallRoad(x,y,w=520){rect(x-w/2,y-35,w,70,C.road,35);line([[x-w/2+24,y],[x+w/2-24,y]],'#7a7998',4,[25,26]);}
  return {ctx,group,opacity,rect,ellipse,circle,line,polygon,text,pill,backdrop,heading,appear,arrow,check,cross,eye,clock,pin,camera,bus,car,person,roadTile,portrait,connector,curve,packet,node,number,smallRoad};
}