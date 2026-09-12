import { sampleScene, type ScenePose } from './sceneTiming';

type Brush = CanvasRenderingContext2D;
const INK = '#343c3a';
const paths = new Map<string, Path2D>();

function shape(brush: Brush, data: string, fill: string, stroke = '', width = 2) {
  let path = paths.get(data);
  if (!path) { path = new Path2D(data); paths.set(data, path); }
  if (fill) { brush.fillStyle = fill; brush.fill(path); }
  if (stroke) { brush.strokeStyle = stroke; brush.lineWidth = width; brush.stroke(path); }
}

function oval(brush: Brush, centerX: number, centerY: number, radiusX: number, radiusY: number, color: string, rotation = 0) {
  brush.beginPath();
  brush.ellipse(centerX, centerY, radiusX, radiusY, rotation, 0, Math.PI * 2);
  brush.fillStyle = color;
  brush.fill();
}

function line(brush: Brush, data: string, color: string, width = 2) {
  shape(brush, data, '', color, width);
}

function text(brush: Brush, value: string, left: number, top: number, size: number, color: string, weight = 600) {
  brush.font = `${weight} ${size}px Georgia, serif`;
  brush.fillStyle = color;
  brush.fillText(value, left, top);
}

function noise(seed: number) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function layer(width: number, height: number, paint: (brush: Brush) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const brush = canvas.getContext('2d');
  if (!brush) throw new Error('This browser cannot create the illustration canvas.');
  brush.lineCap = 'round';
  brush.lineJoin = 'round';
  paint(brush);
  return canvas;
}

function arch(brush: Brush, left: number, top: number, width: number, height: number) {
  brush.save();
  brush.translate(left, top);
  brush.scale(width / 60, height / 120);
  shape(brush, 'M0 120V35C0 -9 60 -9 60 35V120Z', '#64817a', '#cecbb8', 5);
  shape(brush, 'M8 119V37C8 5 52 5 52 37V119Z', '#455f5b');
  shape(brush, 'M12 116V43Q18 15 28 16V116Z', '#82968a');
  line(brush, 'M30 15V120M8 53H52M8 86H52', '#c4c7b0', 3);
  brush.restore();
}

function civicBuilding(brush: Brush) {
  brush.save();
  brush.translate(-100, 103);
  shape(brush, 'M0 560V222L158 210V167H445V143H657V172H971V213L1204 239V560Z', '#e4e4cf', '#687c71', 3);
  shape(brush, 'M0 555V247H1185V555Z', '#d4d9c2');
  shape(brush, 'M0 250H1203V272H0ZM0 430H1203V444H0Z', '#f6f0da', '#879387');
  shape(brush, 'M0 267H1203V282H0ZM0 443H1203V452H0Z', '#9aa594');
  for (let index = 0; index < 12; index++) {
    const left = 24 + index * 99;
    arch(brush, left, 305, 58, 112);
    arch(brush, left, 462, 58, 96);
    brush.fillStyle = '#f0edd6'; brush.fillRect(left - 13, 291, 13, 134);
    brush.fillStyle = '#a0ad98'; brush.fillRect(left - 5, 294, 4, 127);
    brush.fillStyle = '#f0edd6'; brush.fillRect(left - 13, 450, 13, 115);
  }
  shape(brush, 'M384 566V267H740V566Z', '#eae7ce', '#829181', 2);
  shape(brush, 'M353 273L561 176L770 273Z', '#f7efd9', '#839181', 3);
  shape(brush, 'M383 263L561 192L737 263Z', '#c1c9b1');
  shape(brush, 'M430 250L562 204L696 250Z', '#e8e6cd');
  for (let index = 0; index < 4; index++) {
    const left = 405 + index * 93;
    brush.fillStyle = '#aebba4'; brush.fillRect(left + 10, 295, 28, 244);
    brush.fillStyle = '#f9f0d8'; brush.fillRect(left, 291, 25, 247);
    brush.fillStyle = '#d1d6be'; brush.fillRect(left + 16, 293, 7, 244);
    brush.fillStyle = '#f7eed7'; brush.fillRect(left - 7, 287, 41, 13); brush.fillRect(left - 7, 538, 41, 13);
  }
  arch(brush, 500, 400, 99, 157);
  shape(brush, 'M508 181V66H607V181Z', '#edebd5', '#7c8d7e', 3);
  shape(brush, 'M491 71L557 26L624 71Z', '#f5ecd7', '#7c8d7e', 3);
  shape(brush, 'M512 22H604V35H512Z', '#d1d5bd');
  oval(brush, 557, 111, 31, 32, '#74897a');
  oval(brush, 557, 111, 25, 26, '#faf2da');
  line(brush, 'M557 90V111L572 120', '#3f5750', 3);
  line(brush, 'M557 26V-48', '#536d63', 3);
  shape(brush, 'M559 -48Q591 -57 609 -45V-23Q586 -31 559 -20Z', '#dc855a');
  shape(brush, 'M559 -40Q587 -48 609 -38V-31Q585 -37 559 -29Z', '#eee8d2');
  shape(brush, 'M559 -31Q586 -39 609 -31V-23Q586 -31 559 -20Z', '#557c55');
  shape(brush, 'M363 559H761V575H363ZM345 576H782V588H345ZM328 589H802V600H328Z', '#bdc5ad', '#899882', 2);
  text(brush, 'GREATER CHENNAI CORPORATION', 408, 322, 13, '#506b60');
  for (let index = 0; index < 290; index++) {
    const left = noise(index + 30) * 1190;
    const top = 230 + noise(index + 90) * 300;
    brush.fillStyle = index % 2 ? '#62776910' : '#fffbe320';
    brush.fillRect(left, top, 8 + noise(index) * 22, 2);
  }
  brush.restore();
}

function tree(brush: Brush, left: number, bottom: number, scale: number, seed: number) {
  brush.save(); brush.translate(left, bottom); brush.scale(scale, scale);
  shape(brush, 'M-22 0L-14 -159L-61 -254L-38 -246L1 -182L29 -267L46 -277L15 -150L29 0Z', '#77745a', '#43574a', 3);
  line(brush, 'M-9 -9L-3 -138M7 -156L-35 -235', '#9a9270', 5);
  for (let index = 0; index < 52; index++) {
    const angle = noise(index + seed) * Math.PI * 2;
    const radius = Math.sqrt(noise(index + seed + 70));
    const colors = ['#496e53', '#61845d', '#7b9468', '#91a477', '#53795a'];
    oval(brush, Math.cos(angle) * radius * 140, -272 + Math.sin(angle) * radius * 100, 35 + noise(index + seed + 40) * 38, 27 + noise(index + seed + 50) * 23, colors[index % colors.length], angle / 4);
  }
  for (let index = 0; index < 90; index++) {
    const leftLeaf = (noise(index + seed + 200) - 0.5) * 270;
    const topLeaf = -330 + noise(index + seed + 300) * 120;
    line(brush, `M${leftLeaf} ${topLeaf}l8 -4`, '#c0bd7b55', 2);
  }
  brush.restore();
}

function cornerShop(brush: Brush) {
  brush.save(); brush.translate(1520, 125);
  shape(brush, 'M0 532V44L283 0L465 70V559Z', '#cb805c', '#77564b', 3);
  shape(brush, 'M283 0L465 70V559L283 532Z', '#ad654f');
  shape(brush, 'M-8 41L282 -5L479 65V86L283 16L-8 62Z', '#e5a87a', '#765d4e', 2);
  shape(brush, 'M-8 161L284 135L472 185V204L284 155L-8 180Z', '#efb688');
  shape(brush, 'M20 101L105 90V148L20 158ZM150 80L252 63V132L150 144Z', '#5a786d', '#815e4e', 3);
  line(brush, 'M60 98V151M199 73V137', '#a5b699', 4);
  shape(brush, 'M310 73L361 92V153L310 140ZM391 105L443 124V178L391 166Z', '#485f59', '#815345', 3);
  shape(brush, 'M22 248L256 232V503L22 513Z', '#738373', '#704f45', 4);
  for (let index = 0; index < 23; index++) line(brush, `M26 ${261 + index * 10}L253 ${245 + index * 10}`, '#526c62', 2);
  shape(brush, 'M-15 220L279 193L328 268L-46 300Z', '#497466', '#344e46', 3);
  for (let index = 0; index < 7; index++) shape(brush, `M${index * 42 - 10} ${220 - index * 3.8}l22 -2 45 76 -28 2Z`, '#aec3a0');
  shape(brush, 'M-46 300L328 268V283L-46 314Z', '#3c6358');
  shape(brush, 'M7 190L257 166V211L7 236Z', '#efe1b8', '#7b5b47', 3);
  brush.save(); brush.transform(1, -0.09, 0, 1, 0, 0); text(brush, 'MALAR STORES', 27, 223, 24, '#3c645c'); brush.restore();
  shape(brush, 'M0 514L285 504L483 559L460 579L-18 546Z', '#bca991', '#7b6e5e', 2);
  shape(brush, 'M311 236L431 270V433L311 415Z', '#c18a69');
  shape(brush, 'M326 270L408 291V372L326 355Z', '#e4bd8c');
  line(brush, 'M339 295L396 310M339 310L386 323M339 325L393 340', '#a47658', 4);
  line(brush, 'M283 27V192M288 301V497', '#8f5c4b', 4);
  for (let index = 0; index < 120; index++) {
    const left = noise(index + 560) * 267;
    const top = 65 + noise(index + 960) * 450;
    brush.fillStyle = '#f6cf9e20'; brush.fillRect(left, top, noise(index) * 15 + 2, 3);
  }
  brush.restore();
}

function street(brush: Brush) {
  shape(brush, 'M0 644Q1220 620 1800 658L2200 590L3400 653V1080H0Z', '#a8b0a0');
  shape(brush, 'M0 737L1725 731L2230 625L2450 630L2150 752L3400 796V1080H0Z', '#788786');
  shape(brush, 'M0 809L1725 786L2169 710L2289 716L1910 835L3400 867V1080H0Z', '#81918e');
  shape(brush, 'M0 653L1480 638L1590 683L0 704Z', '#c9c9b2');
  shape(brush, 'M0 703L1590 683L1583 713L0 737Z', '#aeb79f', '#7d8e7f', 2);
  for (let index = 0; index < 34; index++) {
    const left = index * 47;
    shape(brush, `M${left} ${703 - left * 0.013}l25 -0.4 -4 31 -25 0.4Z`, index % 2 ? '#d4d5bc' : '#667a6d');
  }
  for (let index = 0; index < 11; index++) {
    const left = index * 350 - 70;
    shape(brush, `M${left} 967l183 -1 17 -8 -180 1Z`, '#d6d3b1');
  }
  for (let index = 0; index < 13; index++) line(brush, `M${index * 145} 688l-110 36`, '#9aa78f', 1.5);
  shape(brush, 'M2020 763C2052 721 2120 728 2154 736C2200 718 2250 746 2312 741C2386 739 2448 771 2414 792C2320 832 2170 823 2110 803C2072 817 1991 792 2020 763Z', '#5f8581');
  shape(brush, 'M2070 764Q2160 743 2240 765T2390 779Q2260 794 2120 784Z', '#9fbab0');
  line(brush, 'M2095 786Q2170 797 2235 786M2245 761L2320 762M2266 807L2311 804', '#c3d2bc', 3);
  for (let index = 0; index < 1250; index++) {
    const left = noise(index + 700) * 3400;
    const top = 746 + noise(index + 1300) * 334;
    brush.fillStyle = index % 3 ? '#e8e5cd0b' : '#324f4912';
    brush.fillRect(left, top, 2 + noise(index + 400) * 8, 1.5);
  }
  line(brush, 'M2330 891l31 12 12 20 28 -6 36 21M2373 923l-15 22', '#546e66', 2);
}

function streetFurniture(brush: Brush) {
  brush.save(); brush.translate(1158, 0);
  shape(brush, 'M-10 698L-5 199L6 199L14 699Z', '#697f75', '#435d53', 3);
  shape(brush, 'M-6 696L-2 212H2L5 696Z', '#b6c2a7');
  shape(brush, 'M-25 698H29V714H-25Z', '#677d6c');
  line(brush, 'M0 255L-55 237L-71 207', '#4e685e', 12);
  shape(brush, 'M-143 172L-43 194L-48 225L-148 202Z', '#dde5cf', '#4c635b', 3);
  shape(brush, 'M-155 168L-37 189L-47 201L-160 181Z', '#f1f0d8', '#4c635b', 2);
  shape(brush, 'M-148 184L-133 187L-135 204L-149 200Z', '#283f3b');
  oval(brush, -144, 194, 4, 7, '#718e85');
  oval(brush, -58, 211, 2.5, 2.5, '#c38960');
  line(brush, 'M-36 215Q-12 230 -3 254V364', '#3e564b', 2);
  shape(brush, 'M-20 520H21V577H-20Z', '#9caf96', '#5e7767', 2);
  line(brush, 'M-11 532H9M-11 539H9', '#6b8271', 2);
  brush.restore();
  brush.save(); brush.translate(1955, 0);
  line(brush, 'M0 700V427', '#6b7a67', 8);
  shape(brush, 'M-94 429L78 417V459L-94 471Z', '#426e5c', '#bfd0a4', 3);
  brush.save(); brush.transform(1, -0.07, 0, 1, 0, 0); text(brush, 'EVR SALAI', -77, 450, 19, '#f3edce'); brush.restore();
  brush.restore();
  brush.save(); brush.translate(1435, 650);
  shape(brush, 'M-28 -11H29L22 47H-18Z', '#c07d5e', '#8c6450', 2);
  for (let index = 0; index < 8; index++) {
    const angle = index * 0.8;
    shape(brush, `M0 1Q${Math.cos(angle) * 80} -80 ${Math.cos(angle) * 37} -92Q${Math.cos(angle) * 24} -37 0 1`, '#4c7858');
  }
  brush.restore();
}

function distantCity(brush: Brush) {
  const sky = brush.createLinearGradient(0, 0, 0, 720);
  sky.addColorStop(0, '#b9d6cd'); sky.addColorStop(0.68, '#dce2c5'); sky.addColorStop(1, '#eee8c9');
  brush.fillStyle = sky; brush.fillRect(0, 0, 3400, 1080);
  shape(brush, 'M160 126Q190 100 233 111Q257 67 314 100Q351 79 385 113Q426 109 456 131Q300 146 160 126Z', '#f5efd6');
  shape(brush, 'M1205 78Q1250 58 1289 70Q1325 26 1380 66Q1425 47 1462 74L1530 87Q1380 101 1205 78Z', '#eef0d7');
  shape(brush, 'M2330 170Q2390 119 2448 153Q2490 116 2540 149Q2592 132 2630 170Z', '#f1efd2');
  for (let index = 0; index < 24; index++) {
    const left = index * 155;
    const height = 90 + noise(index + 4) * 135;
    shape(brush, `M${left} 650V${650 - height}h${95 + noise(index) * 65}V650Z`, index % 2 ? '#a5bda5' : '#b7c8ab');
    for (let row = 0; row < 3; row++) for (let column = 0; column < 3; column++) {
      brush.fillStyle = '#e3e5c733'; brush.fillRect(left + column * 28 + 10, 680 - height + row * 34, 12, 15);
    }
  }
  brush.save(); brush.translate(2470, 610);
  shape(brush, 'M-70 0L-48 -154H-34L-22 -198H23L35 -154H47L73 0Z', '#9bad94');
  for (let index = 0; index < 5; index++) {
    const width = 55 - index * 8;
    shape(brush, `M${-width} ${-index * 33}h${width * 2}l-6 -8H${-width + 6}Z`, '#c6cfaf');
  }
  brush.restore();
}

function hand(brush: Brush, open: number) {
  brush.save(); brush.scale(0.85, 0.85);
  if (open > 0.3) {
    shape(brush, 'M-9 -4Q-17 2 -20 13L-26 24Q-25 31 -20 27L-12 18L-13 42Q-12 48 -8 45L-4 28L-4 49Q-2 54 2 49L4 28L7 45Q10 50 13 44L11 26L15 37Q19 41 20 34L15 12Q13 4 8 -3Z', '#bc805e', '#694d40', 2);
    line(brush, 'M-7 13Q0 10 10 14M-5 25L2 22', '#956144', 1.3);
  } else {
    shape(brush, 'M-9 -3Q-12 13 -9 23L-4 37Q0 40 2 34L0 20L6 32Q10 36 12 28L10 10Q17 19 19 13L11 -3Z', '#bc805e', '#694d40', 2);
  }
  brush.restore();
}

function official(brush: Brush, pose: ScenePose, stride = 0) {
  brush.save(); brush.translate(710, 905); brush.scale(1.38, 1.38);
  oval(brush, 10, 5, 94, 13, '#415c4530');
  brush.save(); brush.translate(stride * 17, -Math.max(0, stride) * 9);
  shape(brush, 'M-40 -26L-47 -3Q-65 0 -69 10Q-54 17 -26 10L-19 -27Z', '#835d49', INK, 2);
  line(brush, 'M-64 7Q-45 4 -29 7', '#283e39', 4);
  brush.restore();
  brush.save(); brush.translate(-stride * 17, -Math.max(0, -stride) * 9);
  shape(brush, 'M25 -26L30 -1Q52 3 59 11Q47 19 22 10L9 -24Z', '#a16f50', INK, 2);
  line(brush, 'M28 4L49 10', '#283e39', 4);
  brush.restore();
  brush.translate(pose.concern * 3, pose.breath);
  shape(brush, 'M-47 -201Q-66 -136 -61 -70L-68 -16Q-10 0 63 -17L43 -195Z', '#347e77', INK, 2.8);
  shape(brush, 'M-39 -186L-48 -24L-22 -18L-9 -186Z', '#438e81');
  shape(brush, 'M-4 -187L-19 -16L7 -14L18 -187Z', '#76aa94');
  shape(brush, 'M18 -189L9 -16L30 -16L37 -172Z', '#4c9383');
  shape(brush, 'M-67 -32Q-4 -16 62 -30L64 -14Q-1 3 -69 -16Z', '#d6bf80', '#7c8666', 1.5);
  line(brush, 'M-59 -25Q2 -10 57 -23', '#a28d59', 2);
  line(brush, 'M-39 -163L-48 -52M-6 -149L-15 -37M27 -157L25 -46', '#1f625f', 2);
  shape(brush, 'M-25 -302Q-50 -305 -64 -280L-65 -244L-44 -236L-48 -201Q-4 -173 46 -204L41 -249L66 -248L64 -276Q49 -306 24 -302Z', '#d89977', INK, 2.5);
  shape(brush, 'M-26 -299Q-39 -276 -25 -258L30 -255L43 -294L23 -307Z', '#bc805e', '#885b46', 1.5);
  shape(brush, 'M-13 -330L-17 -294Q-2 -275 22 -296L15 -333Z', '#bc805e', '#694d40', 2);
  shape(brush, 'M-10 -331L14 -331L15 -311Q0 -305 -13 -311Z', '#956345');
  shape(brush, 'M31 -299L-48 -225L-46 -195Q-2 -175 47 -204L43 -260L52 -289Z', '#4e9988', INK, 2);
  shape(brush, 'M28 -300L38 -301L-38 -204L-48 -214Z', '#e0c68b', '#8b8c61', 1.3);
  line(brush, 'M17 -258Q-3 -218 -31 -203M31 -245Q17 -220 -4 -208', '#28786f', 2);
  shape(brush, 'M37 -296Q64 -259 59 -185L70 -97L48 -81Q30 -168 37 -221L27 -276Z', '#438f81', INK, 2);
  shape(brush, 'M58 -179L71 -97L61 -90L49 -175Z', '#d4ba78');
  for (let index = 0; index < 6; index++) line(brush, `M${49 + index * 3} -85l1 10`, '#bdac72', 1.6);
  shape(brush, 'M-63 -251Q-70 -207 -61 -169Q-45 -149 -10 -158L-12 -173L-42 -181L-41 -239Z', '#bc805e', '#694d40', 2);
  shape(brush, 'M-53 -201L-8 -210L6 -135L-42 -125Z', '#3d555c', '#263e42', 2);
  shape(brush, 'M-46 -198L-11 -204L0 -141L-33 -133Z', '#56737a');
  line(brush, 'M-37 -185L-17 -189M-34 -178L-14 -182', '#bac1ac', 1.4);
  shape(brush, 'M-43 -178Q-20 -181 -10 -173L-5 -165Q-5 -159 -10 -160L-21 -167Q-4 -155 -14 -153L-31 -163L-44 -163Z', '#bc805e', '#694d40', 1.6);
  brush.save(); brush.translate(50, -278); brush.rotate(-0.16 - pose.gesture * 0.97 + pose.concern * 0.13);
  shape(brush, 'M-12 -5Q-18 38 -10 74Q0 87 12 74L14 -1Z', '#bc805e', '#694d40', 2);
  shape(brush, 'M-15 -7Q-18 8 -17 25Q0 32 16 25L15 -3Z', '#d89977', '#694d40', 2);
  line(brush, 'M-14 23Q0 29 14 23', '#b9785d', 2);
  brush.translate(0, 75); brush.rotate(-0.12 - pose.gesture * 1.27);
  shape(brush, 'M-10 -5Q-15 32 -8 66L9 66Q13 28 11 -5Z', '#bc805e', '#694d40', 2);
  line(brush, 'M-5 7Q-7 27 -3 48', '#d39971', 3);
  line(brush, 'M-10 58L10 58M-9 63L10 63', '#e2be73', 3.5);
  brush.translate(0, 69); brush.rotate(-pose.gesture * 0.25); hand(brush, pose.gesture); brush.restore();
  brush.save(); brush.translate(pose.turn * 6, -359 + pose.concern * 3); brush.rotate(-0.025 + pose.concern * 0.065);
  oval(brush, -33, -16, 36, 40, '#303d39', -0.2);
  oval(brush, -48, -3, 24, 26, '#303d39');
  line(brush, 'M-59 -19Q-39 -26 -29 -6M-62 -8Q-47 -14 -33 5', '#546052', 2);
  shape(brush, 'M-32 -42Q-7 -62 22 -42Q39 -29 37 -4L44 13L34 19Q31 49 7 52Q-18 49 -29 26L-36 -4Z', '#c38a64', '#584638', 2.3);
  shape(brush, 'M-32 -28Q-27 -6 -19 2L-14 34Q-4 49 7 52Q-18 49 -29 26L-36 -4Z', '#ad7353');
  shape(brush, 'M-37 -9Q-46 -20 -45 -34Q-42 -58 -11 -60Q19 -60 32 -42L36 -25Q13 -35 5 -45Q-3 -20 -30 -12L-31 8Z', '#303d39', '#303d39', 2);
  line(brush, 'M-35 -37Q-15 -55 7 -51M-30 -25Q-12 -30 -5 -41M14 -48L28 -34', '#586457', 2);
  oval(brush, -30, 8, 8, 12, '#c38a64');
  line(brush, 'M-33 5Q-25 1 -29 13', '#986448', 1.5);
  oval(brush, -29, 25, 4, 6, '#e5c17c');
  oval(brush, -29, 30, 3, 2, '#f4df9e');
  oval(brush, 8, -17, 2.6, 3.1, '#9b4c42');
  const eyeHeight = 4.6 * (1 - pose.blink) + 0.25;
  oval(brush, -6, -1, 9, eyeHeight, '#f5ead4', -0.05);
  oval(brush, 24, 0, 7, eyeHeight, '#f5ead4', 0.06);
  if (pose.blink < 0.75) {
    oval(brush, -4 + pose.turn * 4, -1, 3.3, eyeHeight, '#343c36');
    oval(brush, 25 + pose.turn * 2, 0, 2.8, eyeHeight, '#343c36');
    oval(brush, -5 + pose.turn * 4, -2, 1, 1.2, '#fff8e8');
  }
  line(brush, 'M-15 -3Q-6 -9 3 -3M17 -3Q24 -7 31 -1', '#4d4537', 1.7);
  line(brush, `M-17 ${-13 - pose.concern * 2}Q-7 ${-18 + pose.concern * 3} 2 ${-12 + pose.concern * 3}`, '#434136', 3);
  line(brush, `M18 ${-12 + pose.concern * 3}Q24 -15 31 -10`, '#434136', 2.7);
  line(brush, 'M17 4L14 14Q19 18 24 14', '#996245', 1.6);
  oval(brush, 2, 18, 10, 5, '#c77f6060', -0.1);
  if (pose.mouth > 0.1) {
    oval(brush, 15, 29, 7 - pose.mouth * 2, 2 + pose.mouth * 7, '#674239', 0.08);
    shape(brush, 'M10 26Q16 28 20 26L19 29H11Z', '#f5ddbd');
  } else {
    line(brush, `M6 29Q15 ${34 - pose.concern * 7} 24 28`, '#815047', 2);
  }
  line(brush, 'M11 39Q16 41 22 38', '#dba27b', 2);
  brush.restore();
  line(brush, 'M-14 -292Q1 -270 25 -296', '#e1bb73', 2);
  oval(brush, 5, -281, 3.5, 4, '#e6c785');
  brush.restore();
}

function walker(brush: Brush, left: number, bottom: number, scale: number, seconds: number, color: string, stopped = false) {
  const phase = stopped ? 0.25 : Math.sin(seconds * 6);
  brush.save(); brush.translate(left, bottom); brush.scale(scale, scale);
  oval(brush, 0, 3, 25, 5, '#405d4530');
  line(brush, `M-8 -53Q${-8 - phase * 10} -27 ${-6 + phase * 19} -3`, '#465d58', 12);
  line(brush, `M8 -53Q${9 + phase * 13} -24 ${7 - phase * 19} -3`, '#394b49', 12);
  line(brush, `M${-6 + phase * 19} -3l11 1M${7 - phase * 19} -3l12 1`, '#303e39', 6);
  shape(brush, 'M-15 -107Q0 -117 16 -105L20 -54Q0 -48 -21 -55Z', color, '#465246', 1.5);
  line(brush, `M-15 -100Q${-24 - phase * 6} -79 ${-18 - phase * 11} -68`, '#a67c58', 9);
  line(brush, `M16 -99Q${22 + phase * 7} -77 ${20 + phase * 10} -65`, '#bc9068', 9);
  oval(brush, 0, -128, 13, 18, '#b98a60', -0.1);
  shape(brush, 'M-14 -128Q-18 -150 3 -150Q18 -147 14 -134Q1 -141 -14 -128Z', '#41483b');
  shape(brush, 'M10 -133L17 -123L10 -121Z', '#b98a60');
  brush.restore();
}

function autoRickshaw(brush: Brush, left: number, top: number) {
  brush.save(); brush.translate(left, top); brush.scale(0.86, 0.86);
  oval(brush, 65, 92, 84, 8, '#3b544b28');
  shape(brush, 'M-23 67L-15 7Q-13 -8 7 -8H79L118 34L136 72L130 89H-23Z', '#d6ad4c', '#54634c', 2);
  shape(brush, 'M-16 8L-6 -11H77L86 7Z', '#405a4c');
  shape(brush, 'M-8 13H28V56H-13ZM41 13H75L109 48H41Z', '#516f64');
  shape(brush, 'M48 17H74L96 41H49Z', '#b6c6a5');
  oval(brush, 3, 87, 16, 20, '#344841'); oval(brush, 106, 87, 16, 20, '#344841');
  oval(brush, 3, 87, 7, 10, '#8d9c7d'); oval(brush, 106, 87, 7, 10, '#8d9c7d');
  line(brush, 'M-18 69H130', '#617854', 8);
  oval(brush, 128, 56, 6, 8, '#f4dfac'); brush.restore();
}

function cyclist(brush: Brush, seconds: number) {
  const move = Math.min(1, Math.max(0, (seconds - 3.4) / 2.1));
  const left = 2605 - move * 210;
  const pedal = seconds < 5.5 ? Math.sin(seconds * 6) : 0;
  brush.save(); brush.translate(left, 752); brush.scale(-0.95, 0.95);
  oval(brush, 0, 3, 109, 10, '#3b5a4425');
  for (const wheel of [-68, 66]) {
    oval(brush, wheel, -35, 37, 37, '#344b45'); oval(brush, wheel, -35, 31, 31, '#9bad99');
    for (let spoke = 0; spoke < 8; spoke++) {
      const angle = spoke * Math.PI / 4 + (seconds < 5.5 ? seconds * 3 : 16.5);
      line(brush, `M${wheel} -35l${Math.cos(angle) * 30} ${Math.sin(angle) * 30}`, '#617d6c', 1.4);
    }
  }
  line(brush, 'M-68 -35L-29 -88L0 -35H-68M-29 -88H41L0 -35M41 -88L66 -35M38 -92L37 -104L53 -108', '#c28b58', 5);
  line(brush, 'M-33 -88L-35 -98M-46 -100H-22', '#3c5147', 5);
  line(brush, `M-20 -97L${6 + pedal * 14} -65L${-5 + pedal * 18} -38`, '#3d5756', 15);
  line(brush, `M-10 -97L${18 - pedal * 14} -70L${18 - pedal * 18} ${-37 + move * 24}`, '#506b64', 15);
  shape(brush, 'M-34 -110L-29 -158Q-2 -172 17 -145L28 -118L-9 -92Z', '#cf916c', '#5c6553', 2);
  line(brush, 'M11 -144L29 -116L45 -108', '#b9885e', 12);
  oval(brush, 10, -179, 17, 22, '#b5885f', -0.3);
  shape(brush, 'M-9 -181Q-10 -209 15 -204Q32 -200 30 -180L17 -184L-9 -177Z', '#e7d7a0', '#6e7960', 2);
  line(brush, 'M-4 -180L9 -160L24 -180', '#586b54', 2);
  line(brush, `M${18 - pedal * 18} ${-34 + move * 24}l15 1`, '#334b45', 6);
  brush.restore();
}

function bus(brush: Brush, amount: number) {
  if (amount <= 0) return;
  brush.save(); brush.translate(2030 - amount * 2300, 257);
  shape(brush, 'M-10 750V156Q-5 68 104 62H2435Q2482 63 2488 108V750Z', '#b55545', '#364e47', 5);
  shape(brush, 'M14 162Q18 84 106 82H2426Q2463 82 2466 124V233H14Z', '#ecdfb5');
  shape(brush, 'M5 232H2479V488H5Z', '#294d49');
  for (let index = 0; index < 9; index++) {
    const left = 114 + index * 249;
    shape(brush, `M${left} 247h222v209H${left}Z`, '#789e92', '#d8d3ac', 9);
    shape(brush, `M${left + 9} 256h94l-62 191h-32Z`, '#9db7a1');
    oval(brush, left + 145, 381, 29, 33, '#526f64');
    shape(brush, `M${left + 99} 451q2 -50 45 -50q43 2 48 50Z`, '#57786e');
  }
  shape(brush, 'M0 489H2485V522H0Z', '#ede0b9');
  shape(brush, 'M0 684H2485V729H0Z', '#92483e');
  line(brush, 'M10 647H2465', '#d07758', 5);
  text(brush, 'M E T R O P O L I T A N   T R A N S P O R T', 195, 609, 34, '#f0d7ad');
  text(brush, 'CHENNAI', 156, 178, 42, '#495f50');
  for (const wheel of [420, 2050]) {
    oval(brush, wheel, 736, 102, 108, '#2e4140'); oval(brush, wheel, 736, 57, 62, '#8b9b8c'); oval(brush, wheel, 736, 24, 27, '#4d665c');
    for (let index = 0; index < 6; index++) {
      const angle = index * Math.PI / 3 - amount * 12;
      oval(brush, wheel + Math.cos(angle) * 40, 736 + Math.sin(angle) * 42, 6, 6, '#4a5e53');
    }
  }
  brush.restore();
}

export const filmArtwork = { official, walker, autoRickshaw, civicBuilding, cornerShop, tree, shape, oval, line, text, noise };

export function createSceneRenderer(canvas: HTMLCanvasElement) {
  const brush = canvas.getContext('2d', { alpha: false });
  if (!brush) throw new Error('Canvas 2D is unavailable in this browser.');
  const backdrop = layer(3400, 1080, distantCity);
  const environment = layer(3400, 1080, context => {
    street(context);
    civicBuilding(context);
    tree(context, 1240, 673, 0.95, 13);
    tree(context, 2890, 704, 1.5, 45);
    shape(context, 'M2250 640V403H2490V649Z', '#d7c697', '#83917a', 2);
    shape(context, 'M2250 407L2370 349L2505 401Z', '#b07d60');
    for (let index = 0; index < 4; index++) arch(context, 2268 + index * 57, 465, 35, 91);
    cornerShop(context);
    streetFurniture(context);
    tree(context, 120, 710, 1.47, 32);
    shape(context, 'M0 705Q193 674 284 707L282 748L0 753Z', '#668c64');
    for (let index = 0; index < 35; index++) oval(context, noise(index + 10) * 265, 686 + noise(index + 110) * 42, 12, 8, ['#8e5273', '#b26680', '#cb8490'][index % 3]);
    line(context, 'M1900 338Q2280 439 2850 302M1900 349Q2280 450 2850 313', '#61786a', 2);
  });
  const grain = layer(480, 270, context => {
    const image = context.createImageData(480, 270);
    for (let pixel = 0; pixel < image.data.length; pixel += 4) {
      const value = noise(pixel + 100);
      image.data[pixel] = value > 0.5 ? 255 : 30;
      image.data[pixel + 1] = value > 0.5 ? 248 : 54;
      image.data[pixel + 2] = value > 0.5 ? 214 : 43;
      image.data[pixel + 3] = 7 + value * 9;
    }
    context.putImageData(image, 0, 0);
  });

  function render(seconds: number) {
    if (!brush) return;
    const pose = sampleScene(seconds);
    brush.setTransform(canvas.width / 1920, 0, 0, canvas.height / 1080, 0, 0);
    brush.lineCap = 'round'; brush.lineJoin = 'round';
    brush.drawImage(backdrop, -pose.cameraX * 0.21, 0);
    brush.save(); brush.translate(960, 540); brush.scale(pose.zoom, pose.zoom); brush.translate(-960 - pose.cameraX, -540);
    brush.drawImage(environment, 0, 0);
    walker(brush, 394 + seconds * 16, 677, 0.67, seconds, '#ac8264');
    walker(brush, 986 - seconds * 14, 680, 0.59, seconds + 2, '#6c858b');
    autoRickshaw(brush, 940 + seconds * 59, 646);
    walker(brush, 2310, 716, 0.87, seconds, '#95728b', true);
    cyclist(brush, seconds);
    official(brush, pose);
    brush.restore();
    brush.save(); brush.translate(-pose.cameraX * 1.35, 0);
    shape(brush, 'M-40 -30H369Q333 42 276 42Q225 127 151 105Q105 177 24 126L-40 145Z', '#355c4b');
    shape(brush, 'M-40 -30H291Q266 34 223 32Q172 99 118 74Q70 129 5 103Z', '#4d7758');
    line(brush, 'M-10 12Q145 12 309 -12', '#536e4e', 13);
    brush.restore();
    bus(brush, pose.bus);
    brush.drawImage(grain, 0, 0, 1920, 1080);
  }

  return { render };
}