import { clamp, mix } from './timeline.js';

export const C = {
  paper: '#f5efdf', sky: '#e5eee5', ink: '#163c49', slate: '#47656b', road: '#355360',
  teal: '#267d83', mint: '#a6d8bb', leaf: '#437b68', grass: '#b4cbb0', yellow: '#f0c367',
  coral: '#d9755f', brick: '#ba6354', blue: '#72abb9', white: '#fff9e9', pale: '#d0dacf',
};

// Everything here is original Canvas geometry. No images, remote tiles, SVG or DOM art.
export function createArt(ctx) {
  const group = (x, y, s, fn, angle = 0) => { ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(s, s); fn(); ctx.restore(); };
  function rect(x, y, w, h, fill, radius = 0, stroke, lineWidth = 2) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
  }
  function ellipse(x, y, rx, ry, fill) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }
  const circle = (x, y, r, fill) => ellipse(x, y, r, r, fill);
  function path(points, color, width = 4, dash = [], close = false, fill) {
    ctx.beginPath(); ctx.moveTo(...points[0]); for (const p of points.slice(1)) ctx.lineTo(...p);
    if (close) ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (color) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.setLineDash(dash); ctx.stroke(); ctx.setLineDash([]); }
  }
  function text(str, x, y, size = 26, color = C.ink, weight = 500, align = 'left') {
    ctx.fillStyle = color; ctx.font = `${weight} ${size}px "Film Sans"`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillText(str, x, y);
  }
  function pill(str, x, y, fill = C.ink, color = C.white, size = 21) {
    ctx.font = `800 ${size}px "Film Sans"`; const w = ctx.measureText(str).width + 32;
    rect(x, y, w, 42, fill, 21); text(str, x + 16, y + 28, size, color, 800); return w;
  }
  function check(x, y, s = 1, color = C.teal) { group(x, y, s, () => { circle(0, 0, 24, color); path([[-10, 0], [-2, 9], [13, -10]], C.white, 5); }); }
  function warning(x, y, s = 1) { group(x, y, s, () => { path([[0, -26], [27, 21], [-27, 21]], null, 0, [], true, C.yellow); path([[0, -10], [0, 3]], C.ink, 4); circle(0, 12, 2.5, C.ink); }); }
  function pin(x, y, color = C.coral, scale = 1) { group(x, y, scale, () => { path([[-13, -18], [0, 9], [13, -18]], null, 0, [], true, color); circle(0, -21, 20, color); circle(0, -21, 7, C.white); }); }
  function signal(x, y, t, color = C.teal, max = 48) {
    for (let i = 0; i < 3; i++) { const p = ((t * .65 + i / 3) % 1 + 1) % 1; ctx.save(); ctx.globalAlpha *= (1 - p) * .6; ctx.beginPath(); ctx.arc(x, y, 12 + max * p, 0, Math.PI * 2); ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.stroke(); ctx.restore(); }
  }
  function brackets(x, y, w, h, color = C.yellow) {
    const l = 18;
    path([[x, y + l], [x, y], [x + l, y]], color, 4);
    path([[x + w - l, y], [x + w, y], [x + w, y + l]], color, 4);
    path([[x, y + h - l], [x, y + h], [x + l, y + h]], color, 4);
    path([[x + w - l, y + h], [x + w, y + h], [x + w, y + h - l]], color, 4);
  }
  function eye(x, y, s = 1) {
    group(x, y, s, () => { ctx.beginPath(); ctx.moveTo(-39, 0); ctx.bezierCurveTo(-18, -32, 18, -32, 39, 0); ctx.bezierCurveTo(18, 32, -18, 32, -39, 0); ctx.fillStyle = C.mint; ctx.fill(); circle(0, 0, 16, C.ink); circle(5, -5, 5, C.white); });
  }
  function cloud(x, y, s = 1, fill = C.white) {
    group(x, y, s, () => { ellipse(0, 0, 70, 16, fill); circle(-25, -12, 23, fill); circle(7, -23, 33, fill); circle(38, -9, 22, fill); });
  }
  function palm(x, y, s = 1, t = 0) {
    group(x, y, s, () => {
      const sway = Math.sin(t * .9 + x) * 5;
      path([[0, 0], [-7, -69], [sway, -142]], '#98775c', 13);
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; const dx = Math.cos(a) * 62, dy = Math.sin(a) * 28;
        ctx.beginPath(); ctx.moveTo(sway, -142); ctx.quadraticCurveTo(sway + dx * .7, -177 + dy, sway + dx, -128 + dy); ctx.quadraticCurveTo(sway + dx * .35, -147 + dy, sway, -142); ctx.fillStyle = i % 2 ? C.leaf : C.teal; ctx.fill(); }
      circle(sway - 5, -137, 6, '#98775c'); circle(sway + 5, -135, 5, '#98775c');
    });
  }
  function bush(x, y, s = 1) { group(x, y, s, () => { ellipse(0, 2, 47, 10, '#183b4920'); circle(-24, -10, 25, C.leaf); circle(1, -20, 32, C.grass); circle(27, -8, 23, C.leaf); path([[-9, 3], [-9, -12]], C.white, 2); }); }
  function person(x, y, s = 1, role = 'citizen', t = 0, walking = true, gesture = 0) {
    group(x, y, s, () => {
      const stride = walking ? Math.sin(t * 8) * 18 : 0;
      const bob = walking ? Math.abs(Math.sin(t * 8)) * 3 : 0;
      const shirt = { police: '#c0a67b', municipality: C.teal, crew: C.yellow, citizen: C.coral, representative: C.blue }[role];
      ellipse(0, 2, 27, 7, '#153a4930');
      path([[-9, -47], [-12 + stride, -23], [-14 + stride, -3]], C.ink, 12);
      path([[9, -47], [12 - stride, -22], [13 - stride, -3]], C.ink, 12);
      rect(-23 + stride, -7, 22, 9, C.ink, 4); rect(6 - stride, -7, 22, 9, C.ink, 4);
      ctx.translate(0, -bob);
      rect(-22, -99, 44, 58, shirt, [13, 13, 7, 7]);
      path([[-20, -88], [-30 - stride * .5, -65], [-24 - stride * .6, -48]], shirt, 11);
      const handX = 25 + gesture * 20, handY = -49 - gesture * 45;
      path([[20, -88], [32, -66 - gesture * 23], [handX, handY]], shirt, 11);
      circle(-24 - stride * .6, -48, 6, '#c68c65'); circle(handX, handY, 6, '#c68c65');
      rect(-7, -110, 14, 17, '#c68c65', 4);
      ellipse(0, -124, 20, 25, '#d69f77');
      ctx.beginPath(); ctx.arc(-2, -132, 20, Math.PI, Math.PI * 2); ctx.lineTo(18, -125); ctx.lineTo(8, -138); ctx.lineTo(-18, -126); ctx.fillStyle = C.ink; ctx.fill();
      circle(7, -124, 2, C.ink); path([[6, -111], [12, -113]], '#8b5c4e', 2);
      if (role === 'police') { rect(-24, -145, 48, 11, '#a88f67', 4); rect(-15, -155, 32, 17, '#a88f67', 5); circle(3, -145, 4, C.yellow); rect(-20, -64, 40, 5, C.ink); rect(7, -91, 7, 8, C.yellow); }
      if (role === 'crew') { ellipse(0, -143, 25, 11, C.yellow); rect(-24, -146, 48, 7, C.yellow, 3); path([[-10, -96], [-10, -48]], C.white, 5); path([[10, -96], [10, -48]], C.white, 5); }
      if (role === 'municipality') { path([[-8, -98], [0, -72], [8, -98]], C.white, 2); rect(-6, -74, 12, 17, C.white, 2); }
      if (role === 'citizen') { path([[-12, -100], [15, -48]], C.yellow, 6); rect(10, -62, 21, 22, C.yellow, 6); }
    });
  }
  function wheel(x, y, t, r = 22) {
    circle(x, y, r, C.ink); circle(x, y, r * .58, '#8caaa9'); circle(x, y, r * .23, C.ink);
    for (let i = 0; i < 3; i++) { const a = t * 6 + i * Math.PI * 2 / 3; path([[x, y], [x + Math.cos(a) * r * .47, y + Math.sin(a) * r * .47]], C.paper, 3); }
  }
  function vehicle(x, y, s = 1, kind = 'car', t = 0, color = C.coral, direction = 1) {
    group(x, y, s, () => {
      ctx.scale(direction, 1);
      const bus = kind === 'bus', truck = kind === 'truck', police = kind === 'police';
      const w = bus ? 250 : truck ? 180 : 150;
      ellipse(0, 10, w * .54, 13, '#153a4930');
      if (bus) {
        rect(-125, -115, 250, 111, C.teal, [20, 24, 8, 8]); rect(-125, -43, 250, 28, C.paper); rect(-124, -21, 248, 12, C.coral);
        for (let i = 0; i < 5; i++) { rect(-110 + i * 43, -101, 35, 45, '#163c49', 5); path([[-105 + i * 43, -94], [-81 + i * 43, -94]], '#9bc9c9', 3); if (i < 4) { circle(-94 + i * 43, -78, 7, '#ce9e79'); rect(-105 + i * 43, -70, 20, 13, '#7ea9a7', 4); } }
        rect(102, -94, 16, 79, '#86b6b4', 3, C.ink); path([[110, -90], [110, -21]], C.ink, 2);
        text('MTC', -67, -23, 14, C.ink, 800); text('27B', 48, -121, 14, C.ink, 800); rect(77, -124, 20, 12, C.ink, 3); circle(87, -118, 3, C.yellow);
        wheel(-82, 0, t); wheel(82, 0, t);
      } else if (truck) {
        rect(-90, -69, 112, 61, C.yellow, 5); rect(20, -91, 66, 83, C.teal, [8, 17, 4, 4]); rect(30, -82, 42, 33, C.ink, 5);
        for (let i = 0; i < 3; i++) path([[-78 + i * 30, -64], [-78 + i * 30, -18]], '#bb8b3e', 3);
        path([[-84, -72], [-4, -72]], C.ink, 7); wheel(-55, 0, t, 21); wheel(53, 0, t, 21);
      } else {
        path([[-65, -42], [-42, -79], [24, -79], [57, -44]], null, 0, [], true, police ? C.white : color);
        path([[-38, -71], [-52, -44], [0, -44], [0, -71]], null, 0, [], true, C.ink);
        path([[8, -71], [23, -71], [46, -44], [8, -44]], null, 0, [], true, '#78a8b0');
        rect(-78, -45, 156, 37, police ? C.white : color, [15, 19, 6, 6]); rect(-74, -14, 148, 9, C.ink, 3);
        rect(63, -35, 13, 9, C.yellow, 3); rect(-77, -35, 8, 10, '#efb8a0', 2);
        if (police) { rect(-65, -31, 120, 12, C.blue); rect(-12, -89, 34, 10, C.blue, 3); rect(-12, -89, 17, 10, C.coral, 3); text('POLICE', -33, -22, 10, C.ink, 800); }
        wheel(-48, 0, t, 18); wheel(48, 0, t, 18);
      }
    });
  }
  function topVehicle(x, y, angle = 0, kind = 'car', color = C.coral, s = 1) {
    group(x, y, s, () => {
      const bus = kind === 'bus'; const w = bus ? 110 : 64, h = bus ? 47 : 35;
      rect(-w / 2 + 4, -h / 2 + 8, w, h, '#102b3c28', 10);
      for (const dx of [-w * .32, w * .32]) { rect(dx, -h / 2 - 4, 13, 8, C.ink, 2); rect(dx, h / 2 - 4, 13, 8, C.ink, 2); }
      rect(-w / 2, -h / 2, w, h, kind === 'police' ? C.white : bus ? C.teal : color, 9);
      rect(w / 2 - 19, -h / 2 + 5, 11, h - 10, C.ink, 3); rect(-w / 2 + 8, -h / 2 + 5, 8, h - 10, '#aad6d0', 2);
      if (bus) { for (let i = 0; i < 4; i++) rect(-32 + i * 18, -17, 13, 34, '#76a8a2', 3); rect(-46, -2, 7, 4, C.yellow); }
      else { rect(-13, -h / 2 + 5, 26, h - 10, kind === 'police' ? C.blue : '#f7efdb50', 4); path([[4, -h / 2 + 4], [4, h / 2 - 4]], C.ink, 2); }
      if (kind === 'police') { rect(-1, -17, 7, 16, C.coral, 2); rect(-1, 1, 7, 16, C.blue, 2); }
    }, angle);
  }
  function building(x, base, w, h, kind = 'home', shade = C.paper) {
    group(x, base, 1, () => {
      rect(10, -h + 10, w, h, '#1b48571a', 3);
      rect(0, -h, w, h, shade, 3); rect(w - 18, -h, 18, h, '#193e4e15'); rect(-8, -h - 10, w + 16, 14, C.ink, 3);
      for (let row = 0; row < Math.max(1, Math.floor((h - 75) / 65)); row++) for (let col = 0; col < Math.floor(w / 48); col++) {
        const wx = 16 + col * 48, wy = -h + 25 + row * 64;
        rect(wx, wy, 28, 37, C.blue, 2); rect(wx + 3, wy + 3, 10, 31, '#f8f2d570'); path([[wx - 3, wy + 39], [wx + 31, wy + 39]], C.ink, 4);
      }
      rect(w * .42, -61, 35, 61, C.ink, [16, 16, 0, 0]); circle(w * .42 + 27, -29, 2, C.yellow);
      if (kind === 'shop') { rect(-7, -86, w + 14, 24, C.coral, 3); for (let i = 0; i < w / 25; i++) rect(i * 25, -84, 12, 29, C.paper, [0, 0, 5, 5]); rect(9, -58, w * .37, 42, '#a2c2bf', 3); text('FILTER COFFEE', w / 2, -103, 14, C.ink, 800, 'center'); }
      if (kind === 'school' || kind === 'mall') { const label = kind === 'school' ? 'PUBLIC SCHOOL' : 'PHOENIX MALL'; rect(8, -h + 18, w - 16, 47, C.ink, 4); text(label, w / 2, -h + 49, kind === 'mall' ? 26 : 21, C.white, 800, 'center'); if (kind === 'school') { path([[w / 2, -h - 12], [w / 2, -h - 74]], C.ink, 4); path([[w / 2, -h - 74], [w / 2 + 39, -h - 62], [w / 2, -h - 49]], null, 0, [], true, C.coral); } }
      if (kind === 'home') { rect(w - 70, -h - 39, 45, 28, C.slate, 5); ellipse(w - 47, -h - 39, 22, 5, C.ink); path([[13, -h - 11], [13, -h - 44], [42, -h - 44]], C.ink, 3); }
    });
  }
  function skyline(t, weather = 0) {
    rect(0, 0, 1920, 1080, weather > .5 ? '#d8e2de' : C.sky);
    circle(1580, 280, 74, '#efcf86'); circle(1580, 280, 105, '#f2d69435');
    cloud(230 + t * 2, 290, 1.2); cloud(1320 + t * 1.4, 350, .9); cloud(830 + t * 1.1, 265, .7);
    for (let i = 0; i < 19; i++) { const x = i * 118 - 30 - (t * 2 % 40), h = 100 + ((i * 71) % 180); rect(x, 600 - h, 84, h, '#c4d7cf', [5, 5, 0, 0]); for (let j = 0; j < 4; j++) path([[x + 10, 620 - h + j * 34], [x + 72, 620 - h + j * 34]], '#e0e8da', 5); }
    // Original, simplified Chennai-style red civic building with a clock tower.
    group(850 - t, 597, .85, () => { rect(-120, -175, 240, 175, '#b98270'); rect(-30, -263, 60, 263, '#b98270'); path([[-40, -263], [0, -305], [40, -263]], null, 0, [], true, C.ink); circle(0, -224, 21, C.paper); path([[0, -239], [0, -224], [10, -217]], C.ink, 3); for (let i = 0; i < 7; i++) rect(-105 + i * 32, -147, 20, 65, C.paper, [10, 10, 0, 0]); path([[-126, -178], [126, -178]], C.paper, 8); });
    rect(0, 588, 1920, 142, C.grass);
  }
  function street(t, { location = 'neighbourhood', camera = 0, weather = 0 } = {}) {
    skyline(t, weather);
    const shift = camera;
    group(-shift, 0, 1, () => {
      if (location === 'crossings') {
        building(60, 701, 430, 286, 'mall', '#debd8b'); building(1040, 701, 360, 259, 'school', '#edd9a5'); building(1500, 701, 175, 205, 'home', '#c0d2c3');
      } else {
        building(65, 701, 175, 253, 'home', '#c4d6c9'); building(269, 701, 181, 195, 'shop', '#e8c596'); building(1070, 701, 210, 281, 'home', '#bdd0c8'); building(1330, 701, 204, 210, 'shop', '#e9cfa5'); building(1650, 701, 201, 318, 'home', '#bdc9bb');
        // Bus shelter: route identity recurs with the teal 27B fleet bus.
        rect(535, 611, 208, 10, C.teal, 5); path([[550, 621], [550, 702]], C.ink, 6); path([[728, 621], [728, 702]], C.ink, 6); rect(558, 626, 157, 65, '#e9efe1', 3); rect(578, 681, 130, 9, C.ink, 3); text('27B · ANNA SALAI', 635, 653, 15, C.ink, 800, 'center');
      }
      palm(504, 708, 1.3, t); palm(989, 708, 1.15, t); palm(1591, 708, 1.4, t);
      bush(20, 703, .9); bush(1296, 703, .75); bush(1840, 703, 1.2);
    });
    rect(0, 705, 1920, 49, '#e6dbbf'); path([[0, 753], [1920, 753]], C.paper, 12);
    rect(0, 759, 1920, 203, C.road);
    path([[0, 858], [1920, 858]], '#e9dbb0', 4, [42, 36]);
    rect(0, 962, 1920, 118, '#bdcba8'); path([[0, 961], [1920, 961]], C.paper, 12);
    for (let i = 0; i < 30; i++) { const x = i * 75 - shift * .5; path([[x, 724], [x + 33, 724]], '#c7bca3', 2); }
  }
  function rain(t, strength = 1) {
    ctx.save(); ctx.globalAlpha *= strength * .5;
    for (let i = 0; i < 95; i++) { const x = ((i * 197 + t * 170) % 2100) - 90; const y = ((i * 131 + t * 680) % 940); path([[x, y], [x - 10, y + 27]], '#5c939e', 2); }
    ctx.restore();
  }
  function topBuilding(x, y, w, h, color = '#d8c9a7', kind = 'roof') {
    rect(x + 12, y + 16, w, h, '#13334120', 9); rect(x, y, w, h, color, 7, '#fbf6e0', 4); rect(x + 8, y + 8, w - 16, h - 16, null, 4, '#183e4925', 3);
    if (kind === 'park') { rect(x + 6, y + 6, w - 12, h - 12, C.grass, 5); for (let i = 0; i < 4; i++) { circle(x + 24 + i * (w - 48) / 3, y + h / 2, 21, C.leaf); circle(x + 19 + i * (w - 48) / 3, y + h / 2 - 5, 13, '#6f9975'); } }
    else { for (let i = 0; i < Math.floor(w / 64); i++) { rect(x + 19 + i * 58, y + 21, 37, Math.min(38, h - 40), '#7b9da0', 3); path([[x + 25 + i * 58, y + 24], [x + 25 + i * 58, y + Math.min(55, h - 22)]], '#b4d0c8', 2); } circle(x + w - 22, y + h - 23, 9, '#eaf0df'); }
  }
  const roads = [ [[-100, 540], [2020, 540]], [[-100, 810], [2020, 810]], [[360, 220], [360, 1100]], [[960, 220], [960, 1100]], [[1560, 220], [1560, 1100]] ];
  function city(t = 0) {
    rect(0, 0, 1920, 1080, C.sky); rect(0, 230, 1920, 850, '#dce3cb');
    // Buildings follow real blocks; traffic never floats across a roof.
    const blocks = [[30, 272, 235, 164], [444, 280, 190, 155], [674, 280, 195, 155], [1045, 280, 183, 155], [1262, 280, 204, 155], [1650, 280, 225, 155], [35, 635, 230, 83], [443, 634, 179, 82], [652, 634, 215, 82], [1045, 634, 191, 82], [1265, 634, 201, 82], [1650, 634, 223, 82], [36, 906, 227, 120], [442, 906, 200, 120], [678, 906, 190, 120], [1044, 906, 183, 120], [1264, 906, 202, 120], [1650, 906, 224, 120]];
    blocks.forEach(([x,y,w,h], i) => topBuilding(x,y,w,h,[ '#e2c7a1', '#c7d5bf', '#e4d8b6', '#b4ccd0'][i % 4], i % 5 === 1 ? 'park' : 'roof'));
    for (const r of roads) { path(r, '#faf1da', 137); path(r, C.road, 116); }
    for (const r of roads) path(r, '#e8ddb4', 3, [24, 29]);
    for (const x of [360,960,1560]) for (const y of [540,810]) {
      rect(x - 65, y - 65, 130, 130, C.road, 12);
      for (let k = -2; k <= 2; k++) { rect(x - 110, y + k * 16 - 5, 28, 9, '#eee6cd'); rect(x + 83, y + k * 16 - 5, 28, 9, '#eee6cd'); }
    }
    for (let i = 0; i < 15; i++) { const x = 22 + i * 134; circle(x, 465, 17, '#7f9f7e'); circle(x - 5, 460, 10, '#a4bf96'); }
    text('ANNA SALAI', 660, 594, 15, C.paper, 800, 'center'); text('ILLUSTRATIVE CHENNAI', 1800, 1010, 15, C.ink, 800, 'right');
    // Water edge / drainage hints and an animated city flag.
    path([[1854, 278], [1854, 434]], '#71aeb3', 9); path([[1838, 278], [1838, 434]], '#b6d2c6', 3);
  }
  function atRoute(points, distance) {
    const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
    const length = lengths.reduce((a, b) => a + b, 0);
    let d = clamp(distance, 0, length);
    for (let i = 0; i < lengths.length; i++) {
      if (d <= lengths[i] || i === lengths.length - 1) { const a = points[i], b = points[i + 1], p = lengths[i] ? d / lengths[i] : 0; return { x: mix(a[0], b[0], p), y: mix(a[1], b[1], p), angle: Math.atan2(b[1] - a[1], b[0] - a[0]), length }; }
      d -= lengths[i];
    }
  }
  function routeVehicle(points, distance, kind = 'car', color = C.coral, s = 1) { const p = atRoute(points, distance); topVehicle(p.x, p.y, p.angle, kind, color, s); return p; }
  function packets(points, t, color = C.mint, count = 5, speed = 120) {
    const total = atRoute(points, 0).length;
    for (let i = 0; i < count; i++) { const d = ((t * speed + total * i / count) % total + total) % total; const p = atRoute(points, d); circle(p.x, p.y, 7, color); circle(p.x, p.y, 3, C.white); }
  }
  function traffic(t, density = 1) {
    for (let lane = 0; lane < 4; lane++) {
      const y = [515, 565, 785, 835][lane]; const dir = lane % 2 ? -1 : 1;
      for (let i = 0; i < 5 * density; i++) { const x = ((i * 379 + t * (65 + lane * 8) * dir + lane * 111) % 2250 + 2250) % 2250 - 160; topVehicle(x, y, dir === 1 ? 0 : Math.PI, i === 2 && lane === 0 ? 'bus' : 'car', [C.coral,C.yellow,C.blue,C.mint][i % 4], .85); }
    }
  }
  function camera(x, y, s = 1, offline = false, cone = true) {
    group(x, y, s, () => {
      if (cone) { ctx.save(); ctx.globalAlpha *= offline ? .025 : .15; path([[0, 0], [270, 110], [220, 245]], null, 0, [], true, C.yellow); ctx.restore(); }
      path([[-15, 56], [-15, 8], [0, 8]], C.ink, 6); rect(-16, -13, 57, 29, offline ? '#9aa9a1' : C.ink, 6); path([[38, -10], [54, -17], [54, 14], [38, 9]], null, 0, [], true, C.ink); circle(18, -1, 4, offline ? C.coral : C.mint);
      if (offline) path([[-14, -20], [51, 26]], C.coral, 5);
    });
  }
  function barrier(x, y, s = 1, angle = 0) {
    group(x, y, s, () => { path([[-40, 0], [-47, 41]], C.ink, 7); path([[40, 0], [47, 41]], C.ink, 7); rect(-62, -12, 124, 31, C.paper, 3); for (let i = 0; i < 4; i++) path([[-56 + i * 32, -10], [-40 + i * 32, 17]], C.coral, 13); }, angle);
  }
  function phone(x, y, s = 1, { updated = false, t = 0, stale = false } = {}) {
    group(x, y, s, () => {
      rect(-110 + 12, -206 + 18, 220, 418, '#143d4920', 29); rect(-110, -206, 220, 418, C.ink, 29); rect(-98, -190, 196, 383, C.paper, 22); rect(-36, -182, 72, 13, C.ink, 8);
      text(updated ? 'DRISHTI' : 'MY JOURNEY', 0, -132, 19, C.ink, 800, 'center');
      for (let i = 0; i < 3; i++) { rect(-80 + i * 58, -102, 43, 73, '#cfdbbf', 6); rect(-80 + i * 58, 24, 43, 72, '#cfdbbf', 6); }
      path([[-87, -5], [87, -5]], '#c6c8b7', 17); path([[-12, -108], [-12, 117]], '#c6c8b7', 17);
      if (updated) { path([[-73, -5], [-12, -5], [-12, 111], [75, 111], [75, -5]], C.teal, 6); barrier(39, -5, .3); pin(75, -5, C.teal, .5); circle(-73, -5, 7, C.teal); }
      else { path([[-73, -5], [73, -5]], C.blue, 6, stale ? [7, 5] : []); pin(75, -5, C.blue, .5); }
      rect(-81, 134, 162, 36, updated ? '#c7dfc5' : '#e5d3b4', 8); text(updated ? 'RESTRICTION APPLIED' : 'ROAD STATUS: OLD', 0, 157, 11, C.ink, 800, 'center'); path([[-24, 181], [24, 181]], C.ink, 4);
    });
  }
  return { ctx, group, rect, ellipse, circle, path, text, pill, check, warning, pin, signal, brackets, eye, cloud, palm, bush, person, vehicle, topVehicle, wheel, building, skyline, street, rain, city, atRoute, routeVehicle, packets, traffic, camera, barrier, phone };
}