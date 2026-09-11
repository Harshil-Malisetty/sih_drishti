import { C, createArt } from './art.js';
import { clamp, ease, mix, progress, sampleWorkflow } from './timeline.js';

export function createScenes(ctx) {
  const A = createArt(ctx);
  const { group, rect, ellipse, circle, path, text, pill, check, warning, pin, signal, brackets, eye, person, vehicle, topVehicle, street, city, traffic, camera, barrier, phone } = A;

  function title(number, heading, subheading, qualifier = 'PRODUCT VISION + PROTOTYPE') {
    // A solid quiet header remains outside the world camera and subtitle safe area.
    rect(0, 0, 1920, 225, C.paper);
    rect(72, 53, 39, 5, C.teal, 2);
    text(`DRISHTI  /  ${String(number).padStart(2, '0')}`, 127, 64, 19, C.teal, 800);
    text(heading, 72, 136, 55, C.ink, 800);
    text(subheading, 76, 183, 25, C.slate);
    text(qualifier, 1848, 65, 18, C.slate, 800, 'right');
  }
  function worldCamera(t, duration, render, zoom = .035, pan = 12) {
    const p = ease(t / duration), scale = 1 + p * zoom;
    ctx.save(); ctx.translate(960 + (p - .5) * pan, 610); ctx.scale(scale, scale); ctx.translate(-960, -610); render(); ctx.restore();
  }
  function lens(x, y, r, draw, color = C.teal) {
    ellipse(x + 8, y + r + 13, r * .78, 13, '#12394620');
    circle(x, y, r + 9, C.paper); circle(x, y, r + 3, color);
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r - 4, 0, Math.PI * 2); ctx.clip(); group(x, y, 1, draw); ctx.restore();
  }
  function roadLens(x, y, t, { defect = false, crossing = false, comparison = false } = {}) {
    lens(x, y, 119, () => {
      rect(-130, -125, 260, 250, C.road); path([[-125, 40], [125, 40]], C.paper, 3, [22, 19]);
      if (defect) { ellipse(0, 0, 52, 23, '#19313e'); path([[-68, 0], [-42, -5], [-13, -30], [3, -10], [40, -22], [66, 0]], C.ink, 6); }
      else if (crossing) { for (let i = 0; i < 5; i++) { rect(-75 + i * 32, -48, 18, 104, '#c1bf9a'); rect(-75 + i * 32, -48, 18, 104, '#a2d7bc60'); } }
      else if (comparison) { ellipse(-50, 0, 39, 19, C.ink); rect(12, -33, 87, 57, '#577277', 10); path([[0, -88], [0, 88]], C.white, 3); check(57, 4, .8); }
      else vehicle(0, 39, .93, 'car', t, C.coral);
      brackets(-89, -63, 178, 124);
      const scan = -70 + ((t * 53) % 140); path([[-100, scan], [100, scan]], '#ace6c3', 2);
    });
  }
  function statusTag(label, x, y, color = C.teal) { pill(label, x, y, color, C.white, 19); }
  function miniFeed(x, y, offline, t, car = false) {
    rect(x, y, 126, 77, C.ink, 8, C.paper, 3);
    if (offline) { path([[x + 50, y + 26], [x + 77, y + 53]], C.coral, 3); path([[x + 77, y + 26], [x + 50, y + 53]], C.coral, 3); }
    else { path([[x + 7, y + 53], [x + 119, y + 53]], C.slate, 26); path([[x + 7, y + 53], [x + 119, y + 53]], C.paper, 2, [9, 9]); if (car) topVehicle(x + 60, y + 43, 0, 'car', C.coral, .6); else circle(x + 97, y + 14, 3, C.mint); }
  }
  function opening(t) {
    worldCamera(t, 4, () => {
      city(t); traffic(t, 1);
      camera(224, 423, .95); camera(782, 423, .95, t > 1.2);
      const crack = progress(t, 1, 2.5);
      path([[1180, 811], [1200, 794], [1221, 823], [1253, 803]], C.ink, 6 * crack + 1);
      if (t > 1.1) { warning(1220, 767, .8 * crack); topVehicle(1370 - t * 35, 835, Math.PI, 'police', C.white); }
      person(1300, 733, .72, 'municipality', t, false, .5);
      phone(1733, 738, .7, { t, stale: true }); person(1845, 875, 1, 'citizen', t, false, .5);
      const connectors = [[[312, 432], [450, 361], [664, 360]], [[868, 360], [1116, 360], [1210, 465]], [[1250, 872], [1390, 910], [1580, 888]]];
      connectors.forEach((r, i) => { path(r, '#c48a71', 3, [9, 12]); A.packets(r, t, C.coral, 2, 45); const p = r[1]; circle(p[0], p[1], 18, C.paper); path([[p[0] - 6, p[1] - 6], [p[0] + 6, p[1] + 6]], C.coral, 3); path([[p[0] - 6, p[1] + 6], [p[0] + 6, p[1] - 6]], C.coral, 3); });
    }, .055, -30);
    title(1, 'One city. Thousands of changes.', 'But the pieces don’t yet connect.');
  }
  function coverage(t) {
    worldCamera(t, 10, () => {
      city(t); traffic(t * .8);
      camera(190, 410, 1.15); camera(738, 400, 1.15, t >= 1.8);
      warning(1400, 530, .9); signal(1400, 565, t, C.coral);
      miniFeed(1575, 297, false, t); miniFeed(1718, 297, t >= 1.8, t); miniFeed(1575, 388, false, t); miniFeed(1718, 388, false, t);
      person(1825, 752, 1.08, 'police', t, false, .8);
      if (t < 4) { brackets(1565 + (Math.floor(t * 1.4) % 2) * 143, 287 + (Math.floor(t * .7) % 2) * 91, 146, 97, C.coral); statusTag(t > 1.8 ? 'One camera offline. A blind spot remains.' : 'Fixed cameras. Limited lines of sight.', 79, 890, C.ink); }
      else {
        const p = progress(t, 4, 8); const bx = mix(210, 1420, p);
        // Coverage is a moving, finite camera footprint, never permanent road-wide fill.
        ctx.save(); ctx.globalAlpha = .25; path([[bx - 65, 565], [bx + 110, 508], [bx + 135, 630]], null, 0, [], true, C.mint); path([[Math.max(0, bx - 235), 565], [bx, 565]], C.mint, 72); ctx.restore();
        topVehicle(bx, 565, 0, 'bus', C.teal, 1.2);
        if (t > 5) {
          roadLens(643, 736, t); path([[bx, 594], [bx, 674], [770, 736]], C.teal, 3, [6, 8]); A.packets([[bx, 594], [bx, 674], [770, 736]], t, C.mint, 3);
          text('FRAME · 08:42:16', 643, 890, 18, C.ink, 800, 'center');
        }
        if (t > 6.4) { pin(1410, 530, C.yellow, 1.2); brackets(1357, 509, 110, 92); text('13.06° N · 80.25° E', 1220, 677, 19, C.ink, 800); }
        if (t > 7.5) { eye(1080, 354, 1.1); signal(1080, 354, t, C.teal); path([[1410, 493], [1410, 354], [1130, 354]], C.teal, 3); A.packets([[1410, 493], [1410, 354], [1130, 354]], t); check(1162, 354, .75); }
        statusTag(t < 6.3 ? 'Capture → interpret' : t < 8 ? 'Location + capture time' : 'A reviewable observation—not a blind spot', 79, 890);
      }
    }, .02, 15);
    title(2, t < 4 ? 'The incident moves. The camera can’t.' : 'Turn the moving fleet into observation.', t < 4 ? 'An officer searches separate feeds.' : 'Capture an image. Detect an event. Attach place and time.', 'ILLUSTRATIVE FLEET AI · NOT LIVE');
  }
  function investigation(t) {
    worldCamera(t, 13, () => {
      city(t); traffic(t + 8, 1.25);
      if (t < 1.3) { const p = progress(t, 0, 1.3); ctx.save(); ctx.globalAlpha = 1 - p; circle(647, 551, 18 + 95 * p, '#d9755f70'); path([[602, 522], [622, 528]], C.yellow, 7); path([[659, 593], [675, 613]], C.yellow, 7); ctx.restore(); }
      const escape = [[650,565],[986,565],[986,785],[1700,785]];
      if (t < 4) { A.routeVehicle(escape, t * 210, 'car', C.coral, 1.1); for (let i = 0; i < 4; i++) miniFeed(486 + i * 146, 317, false, t); brackets(476 + Math.floor(t * 2) % 4 * 146, 307, 146, 97, C.coral); warning(648, 499, .8); }
      else {
        const a = [620,565], b = [1410,785];
        pin(...a, C.yellow); if (t > 6.8) pin(...b, C.yellow);
        roadLens(582, 344, t); path([[582, 468], a], C.yellow, 3, [6, 7]);
        text('A · 08:42:16', 582, 488, 17, C.ink, 800, 'center');
        if (t > 5.2) { circle(797, 337, 21, C.coral); path([[785, 374], [810, 374], [821, 390], [775, 390], [785, 374]], C.ink, 3); text('COLOUR / BODY', 798, 425, 14, C.ink, 800, 'center'); }
        if (t > 6.8) {
          roadLens(1315, 674, t); text('B · 08:43:02', 1315, 830, 17, C.ink, 800, 'center');
          const link = [[620,565],[803,644],[1050,627],[1315,550],[1410,785]];
          path(link, C.yellow, 4, [10, 10]); A.packets(link, t, C.yellow, 4, 82);
          // Deliberately dashed straight observation links, NOT an invented tracked route.
          text('POSSIBLE SIGHTINGS', 1000, 692, 17, C.ink, 800, 'center');
        }
        if (t > 9) { person(1748, 705, 1.55, 'police', t, false, progress(t, 9, 10)); miniFeed(1595, 408, false, t, true); miniFeed(1740, 408, false, t, true); if (t >= 10) { brackets(1587, 400, 142, 93, C.mint); statusTag('Lead selected for investigation', 1515, 758); } }
        if (t > 10.7) { lens(181, 697, 77, () => { rect(-80,-80,160,160,C.pale); person(0, 89, .9, 'citizen', 0, false); brackets(-35,-51,70,96,C.yellow); }, C.yellow); text('Watchlist / missing person', 181, 803, 17, C.ink, 800, 'center'); text('Candidate review only', 181, 827, 16, C.slate, 500, 'center'); }
      }
    }, .025, -12);
    title(3, t < 4 ? 'Which way did that vehicle go?' : 'Connect evidence. Never assume identity.', t < 4 ? 'Anna Salai · a fictional, non-graphic incident.' : 'Visible attributes + time + place → a lead for an officer.', 'SIMULATED · POSSIBLE MATCH, NOT CONFIRMED');
  }
  function roadDefect(t, repaired = false) {
    const size = progress(t, .2, 3.1);
    if (repaired) { ellipse(1070, 819, 107, 33, '#526d70'); path([[983, 819],[1157,819]], '#6d8380', 3); return; }
    path([[972, 819], [1010, 803], [1043, 824], [1071, 801], [1107, 822], [1161, 806]], '#153440', 2 + size * 5);
    if (t > 1.3) { ellipse(1070, 819, 87 * size, 25 * size, '#20323b'); ellipse(1063, 814, 61 * size, 16 * size, '#927458'); ellipse(1070, 823, 56 * size, 13 * size, '#263e45'); }
  }
  function maintenance(t, frame) {
    const flags = sampleWorkflow(frame);
    worldCamera(t, 13, () => {
      street(t, { weather: t > 1.4 && t < 4 ? .8 : 0, camera: -Math.sin(t / 13 * Math.PI) * 16 });
      roadDefect(t, flags.repaired);
      if (t < 4) {
        const carX = mix(310, 858, progress(t, 0, 2.7)); vehicle(carX, 819, .95, 'car', Math.min(t, 2.7), C.coral);
        if (t > 2.2) { path([[carX + 29, 733],[carX + 37, 722]], C.yellow, 4); path([[carX + 49, 746],[carX + 63, 740]], C.yellow, 4); vehicle(carX - 265, 820, .9, 'car', t, C.yellow); warning(1070, 748); }
        if (t > 1.4) { ellipse(1190, 882, 88, 12, '#76aab0'); A.rain(t, .7 * progress(t, 1.4, 2)); }
        person(1517, 728, 1.14, 'citizen', t, false, progress(t, 2.6, 3.5));
        if (t > 2.8) { rect(1557, 531, 176, 133, C.paper, 14, C.ink); text('REPORT', 1576, 563, 17, C.ink, 800); for (let i=0;i<3;i++) path([[1577,584+i*19],[1703-i*17,584+i*19]], C.pale, 6); }
      } else {
        if (t < 7) { const bx = mix(-160, 1430, progress(t,4,6.8)); vehicle(bx, 910, 1.05,'bus',t); if (t > 4.7) { brackets(963, 778, 213, 76); roadLens(831, 471, t, { defect:true }); path([[831, 598],[831, 664],[1070, 778]],C.teal,3,[6,8]); text('HIGH SEVERITY · 08:47', 831, 622, 17,C.ink,800,'center'); pin(1125,772,C.yellow,.8); } }
        if (t >= 6.5 && t < 10.6) {
          const truckX = mix(140, 674, progress(t, 6.5, 7.5)); vehicle(truckX, 818, 1.1, 'truck', Math.min(t,7.5));
          const px = mix(762,1008,progress(t,7,8)); person(px,847,1.05,'crew',t,t<8,.3);
          if (t > 7.5) { person(1179, 836, .95, 'crew', t, false, .45 + Math.sin(t * 8) * .16); path([[1160, 761],[1100 + Math.sin(t*8)*9, 820]], C.ink, 5); ellipse(1100+Math.sin(t*8)*9,824,23,7,C.yellow); }
          barrier(882,795,.6); barrier(1250,795,.6);
          if (t > 8) { const repaired = progress(t,8,9); ctx.save(); ctx.beginPath(); ctx.rect(970,780,220*repaired,100); ctx.clip(); roadDefect(t,true); ctx.restore(); }
        }
        if (t >= 9.6) {
          vehicle(mix(-150,1640,progress(t,9.6,12.8)), 910, 1.05, 'bus', t);
          roadLens(802, 470, t, { comparison: true }); text('LATER PASS · BEFORE / AFTER',802,622,17,C.ink,800,'center');
          person(1367,734,1.2,'municipality',t,false,.9);
          rect(1394,617,43,59,C.paper,5,C.ink,2);
          if(flags.verified) { check(1414,643,.56); check(1070,754,1.3); }
        }
      }
      if (t > 11.8) { statusTag('Complaint-driven → Detection-driven', 77, 891); pin(1693, 840,C.blue,.7); text('Waterlogging · 08:40',1666,874,16,C.paper,500,'right'); }
      else if (t >= 4) statusTag(t < 6.5 ? 'Detect + geotag' : t < 8 ? 'Prioritize + assign a crew' : t < 9.6 ? 'Repair the actual road' : 'Observe again. Official confirms closure.',77,891);
    }, .018, -8);
    title(4,t < 4 ? 'A crack should not need a complaint.' : 'Detection is the beginning—not closure.',t < 4 ? 'Weather, wear, braking traffic… and only then a report.' : 'Detect → prioritize → assign → repair → re-observe → verify.', 'AI REINSPECTION SIMULATED · HUMAN CLOSURE');
  }
  function crossingMark(x, opacity = 1, painted = 1) {
    ctx.save(); ctx.globalAlpha *= opacity;
    for (let i = 0; i < 7; i++) { const p = clamp(painted * 7 - i); rect(x - 104 + i * 31, 771, 20, 177 * p, C.paper, 2); }
    ctx.restore();
  }
  function crossings(t, frame) {
    const flags = sampleWorkflow(frame);
    worldCamera(t, 9, () => {
      street(t, { location:'crossings', camera: mix(32,-34,progress(t,1,5)) });
      const faded = t < 4 ? mix(.53,.16,progress(t,0,3.2)) : .16;
      crossingMark(576,faded); crossingMark(1442,faded);
      if(t >= 5.8) { crossingMark(576,1,progress(t,5.8,7)); crossingMark(1442,1,progress(t,6.1,7)); }
      // Cars brake before the crossing; only then do pedestrians enter it.
      vehicle(mix(-150,378,progress(t,0,2)),817,.85,'car',Math.min(t,2),C.coral);
      vehicle(mix(2000,1630,progress(t,0,2.7)),916,.85,'car',Math.min(t,2.7),C.blue,-1);
      const walk = flags.verified ? (t - 8.2) * 156 : 0;
      person(562,740+walk,.9,'citizen',t,flags.verified,.2);
      person(1415,738+walk,.66,'citizen',t+.3,flags.verified,0);
      person(1465,736+walk,.98,'representative',t,flags.verified,.2);
      if(t < 4) { warning(572,691,.7); warning(1438,693,.7); }
      if(t >= 4 && t < 6.2) { roadLens(837,484,t,{crossing:true}); brackets(456,765,239,183); ctx.save(); ctx.globalAlpha=.45; for(let i=0;i<7;i++) rect(472+i*31,778,20,162,C.mint,2); ctx.restore(); path([[837,609],[725,663],[590,765]],C.teal,3,[6,7]); }
      if(t >= 5.4 && t < 7.8) { vehicle(960,816,.85,'truck',0); const x=mix(466,671,progress(t,5.6,7)); person(x,838,.85,'crew',t,true,.5); path([[x+24,778],[x+40,833]],C.ink,4); rect(x+23,830,46,10,C.paper,3); person(1500,818,.9,'crew',t,false,.5); }
      if(t>=7.2) { vehicle(mix(-200,1720,progress(t,7.2,9)),910,.78,'bus',t); person(1160,734,1,'municipality',t,false,.6); }
      if(flags.verified) { check(577,692,.85); check(1442,693,.85); check(1201,656,.7); }
      statusTag(t<4 ? 'Landmark or neighbourhood: the same risk.' : t<5.8 ? 'Assess fading. Record place + condition.' : t<7.2 ? 'Assign. Repaint.' : t<8.2 ? 'Later observation + official review' : 'Verified markings. A safer crossing.',76,891);
      if(t>8.3) { barrier(1760,715,.45); rect(1830,667,39,31,C.yellow,5); path([[1849,698],[1849,735]],C.ink,4); }
    },.012,30);
    title(5,t<4 ? 'A faded crossing is a missing promise.' : 'See the condition. Restore the crossing.', 'Phoenix Mall & a neighbourhood school · illustrative Chennai locations.', 'SIMULATED VISION · VERIFIED MAINTENANCE');
  }
  const diversionA = [[45,565],[386,565],[386,785],[1586,785],[1586,565],[1930,565]];
  const diversionB = [[45,515],[334,515],[334,835],[1534,835],[1534,515],[1930,515]];
  function planning(t, frame) {
    const flags=sampleWorkflow(frame);
    worldCamera(t,10,()=>{
      city(t);
      // The metro construction lives on the road, not in a dashboard model.
      rect(1014,305,411,86,'#b3c4b8',5); for(let i=0;i<5;i++){rect(1040+i*78,378,15,48,C.ink,3); rect(1027+i*78,371,42,13,C.paper,3);}
      path([[1024,336],[1415,336]],C.ink,9); text('PROPOSED METRO WORK',1220,358,15,C.ink,800,'center');
      const barrierScale=t<4 ? progress(t,.3,1.2) : t<4.65 ? 1-progress(t,4,4.65) : progress(t,5,5.5);
      if(barrierScale>0) { rect(825,481,300,118,'#d9755f24',7); barrier(851,533,barrierScale*.9,Math.PI/2); barrier(1100,533,barrierScale*.9,Math.PI/2); }
      if(t<4) {
        for(let i=0;i<10;i++){ const x=mix(-100-i*118,770-i*77,progress(t,0,2.2)); topVehicle(x,515,0,i===4?'bus':'car',[C.coral,C.yellow,C.blue][i%3],.9); }
        path(diversionA,C.coral,7,[12,8]); for(let i=0;i<11;i++) A.routeVehicle(diversionA,clamp((t-.8)*230-i*103,0,1800),'car',i%2?C.coral:C.yellow,.85);
        if(t>2) { warning(938,776,.8); statusTag('Longer detours. More delay. More fuel.',72,891,C.ink); }
      } else if(t<4.7) {
        const rewind=1-progress(t,4,4.7); for(let i=0;i<11;i++) A.routeVehicle(diversionA,clamp(650*rewind-i*65,0,1800),'car',C.yellow,.85);
        circle(965,663,53,C.paper); text('↶',965,686,71,C.teal,800,'center');
      } else {
        path(diversionA,t<7?C.yellow:C.mint,8,t<7?[12,8]:[]);
        if(t<8.5) path(diversionB,'#c58e7360',6,[10,10]);
        for(let i=0;i<13;i++) A.routeVehicle(diversionA,((t-4.7)*174+i*190)%A.atRoute(diversionA,0).length,i===3?'bus':'car',[C.blue,C.yellow,C.mint][i%3],.86);
        // Historical and latest observation windows merge into a scenario lens.
        lens(690,345,83,()=>{rect(-86,-86,172,172,C.paper); for(let i=0;i<6;i++){rect(-62+i*22,48-(i%3+1)*24,13,(i%3+1)*24,C.blue,3);} text('HISTORY',0,-40,14,C.ink,800,'center');});
        lens(1304,676,77,()=>{rect(-82,-82,164,164,C.paper);topVehicle(0,-7,0,'bus',C.teal,1);text('LATEST WINDOW',0,48,12,C.ink,800,'center');});
        path([[777,345],[958,345],[958,447]],C.teal,3,[7,8]); A.packets([[777,345],[958,345],[958,447]],t,C.teal,3);
        person(1750,452,1.1,'municipality',t,false,.6); rect(1770,336,43,61,C.paper,5,C.ink);
        if(flags.approved){ check(1792,359,.58);check(1666,355,.85); statusTag('Human-approved restriction',1420,894); }
        else statusTag(t<6.7?'Compare two diversion scenarios':'Select a plan—not a guaranteed forecast',72,891);
        if(t>9){const p=progress(t,9,10);const x=mix(1670,1900,p);rect(x,704,61,43,C.mint,7);check(x+30,725,.5);}
      }
    }, .025,-20);
    title(6,t<4 ? 'One closed road. A much bigger ripple.' : 'Try the diversion before the disruption.',t<4 ? 'A metro-work barrier pushes traffic onto neighbouring streets.' : 'Historical flows + latest observations + network capacity.', 'DEMO SCENARIO ESTIMATE · NOT A FORECAST');
  }
  function citizen(t,frame) {
    const flags=sampleWorkflow(frame);
    worldCamera(t,14,()=>{
      street(t,{camera:mix(0,35,progress(t,0,9))});
      // Real street closure and the stale generic consumer map occupy the same shot.
      rect(757,765,581,153,'#536065',18); barrier(778,789,1.15);barrier(1309,789,1.15);
      for(let i=0;i<4;i++){ellipse(928+i*73,843+(i%2)*30,38,13,'#b99a73');path([[889+i*73,829],[905+i*73,822],[922+i*73,831]],C.ink,3);}
      vehicle(1037,822,.78,'truck',0);person(1176,835,1,'crew',t,false,.5+Math.sin(t*6)*.15);
      vehicle(mix(-170,503,progress(t,0,3)),822,.95,'car',Math.min(t,3),C.yellow);
      person(1433,744,1.25,'citizen',t,false,.7);
      const px=mix(1610,1627,progress(t,9,11));phone(px,602,1.13,{updated:flags.published,t,stale:!flags.published});
      if(t<9){
        path([[1000,745],[1000,680],[1464,680]],C.coral,3,[8,10]); circle(1310,680,19,C.paper); path([[1303,673],[1317,687]],C.coral,3);path([[1303,687],[1317,673]],C.coral,3);
        if(t>3){ rect(488,379,245,167,C.paper,15); text('OLD INFORMATION',510,411,17,C.ink,800); const rows=['Road status','Hazard notice','Bus information']; rows.forEach((label,i)=>{circle(511,439+i*33,5,C.coral);text(label,527,445+i*33,17,C.slate);path([[688,433+i*33],[697,447+i*33]],C.coral,2);}); }
        statusTag('Maps can lag local changes.',76,891,C.ink);
      }else{
        const route=[[670,681],[825,610],[1045,620],[1300,620],[1499,603]];
        camera(608,645,.64,false,false);rect(636,697,113,74,C.paper,7);brackets(645,706,96,57);barrier(692,733,.45);
        person(864,730,1.12,'municipality',t,false,.6);
        if(flags.approved){check(898,646,.65);eye(1110,629,.9);path(route,C.teal,3);A.packets(route,t,C.mint,6,210);}
        if(flags.published){check(1504,361,.7);text('APPROVED · 09:15',1627,342,19,C.ink,800,'center');pin(1040,746,C.coral,.8);statusTag('Closed route excluded · no ETA for this road',76,891);}
        else statusTag(flags.approved?'Government approval enters the shared record':'Recorded observation → government decision',76,891);
      }
    },.012,0);
    title(7,t<9 ? 'The street changed. Did your map?' : 'An approved change reaches your journey.',t<9 ? 'Construction beside home, but yesterday’s information on screen.' : 'Government validates → shared city record → Drishti map.',t<9 ? 'ILLUSTRATIVE SITUATION · NO LIVE BUS FEED' : 'DRISHTI’S MAP ONLY · NOT GOOGLE MAPS');
  }
  function connected(t) {
    t = Math.min(t, 16.2); // Hold the complete, fully illuminated end card for 24 frames.
    const finale=progress(t,12,15.5);
    worldCamera(t,17,()=>{
      city(t); traffic(t*.8);
      const hubs=[[441,358],[1417,365],[1500,861]]; const center=[947,650];
      const routes=[[[487,378],[701,408],[826,544],center],[[1372,395],[1186,423],[1050,558],center],[[1452,853],[1215,883],[1066,749],center],[[504,858],[709,887],[862,764],center]];
      routes.forEach((r,i)=>{const active=t>=[0,4,7.5,0][i]; path(r,active?C.teal:'#b0bdb0',5,finale>.1?[]:[13,12]);if(active)A.packets(r,t,C.mint,4,145);});
      circle(...center,103,C.paper);circle(...center,87,C.ink);eye(...center,1.45);signal(...center,t,C.teal,110);
      lens(hubs[0][0],hubs[0][1],91,()=>{rect(-100,-100,200,200,C.paper);person(0,109,1.1,'police',t,false,.7);});
      miniFeed(190,307,false,t,true);if(t>1)check(298,394,.7);
      lens(hubs[1][0],hubs[1][1],91,()=>{rect(-100,-100,200,200,C.paper);person(0,109,1.1,'municipality',t,false,.5);});
      if(t>4){person(1716,449,.85,'crew',t,true,.4);path([[1630,430],[1745,430]],C.teal,7);check(1623,351,.7);}
      if(t>7.5) {phone(1638,741,.77,{updated:true,t});person(1762,870,1.05,'citizen',t,false,.6);check(1554,555,.7);}
      vehicle(480,881,.85,'bus',t);camera(562,750,.75,false,false);
      if(t>8.5){path([[1562,874],[1287,910],[984,756]],C.yellow,3,[8,9]);A.packets([[1562,874],[1287,910],[984,756]],-t,C.yellow,3,120);}
    },-.03,0);
    if(t<12) title(8,'Different responsibilities. One connected view.',t<4?'Police: observations become reviewed investigation leads.':t<7.5?'Municipality: repair, verification and planning decisions.':'Citizens: approved changes out; useful reports back.','PRODUCT VISION · HUMAN DECISIONS');
    if(t>=12){
      // The illustrated city remains visible under the final wordmark—not a blank slide.
      ctx.save();ctx.globalAlpha=finale*.92;rect(0,0,1920,1080,C.ink);ctx.restore();
      const a=progress(t,12.25,14);ctx.save();ctx.globalAlpha=a;
      eye(960,327,2.2);text('DRISHTI',960,482,113,C.paper,800,'center');text('One city. One connected view.',960,554,40,C.mint,500,'center');
      const words=['DETECT','UNDERSTAND','ACT','VERIFY','INFORM'];const xs=[395,661,961,1220,1494];
      words.forEach((word,i)=>{const on=t>=12.3+i*.62;circle(xs[i],680,24,on?C.mint:'#47636a');if(on)check(xs[i],680,.7);if(i<4)path([[xs[i]+31,680],[xs[i+1]-31,680]],t>=12.3+(i+1)*.62?C.mint:'#47636a',3);text(word,xs[i],739,22,on?C.paper:'#93aaa9',800,'center');});
      text('PRODUCT VISION + PROTOTYPE · SIMULATED AI · HUMAN REVIEW',960,845,18,C.mint,800,'center');ctx.restore();
    }
  }
  const scenes={opening,coverage,investigation,maintenance,crossings,planning,citizen,connected};
  return { draw: (id,t,frame)=>scenes[id](t,frame), art:A };
}