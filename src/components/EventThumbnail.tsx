import type { IssueKind } from '../types/city';
import '../styles-event-cards.css';

export type EventCategory = IssueKind | 'traffic' | 'incident' | 'person' | 'vehicle' | 'project';

// Presentation only: workflow values and transitions remain unchanged.
const phaseLabels: Record<string, string> = {
  Candidate: 'Needs officer check',
  Detected: 'Needs assessment',
  Qualified: 'Ready to assign',
  Requested: 'Response requested',
  Dispatched: 'Response sent',
  Acknowledged: 'Team confirmed',
  'Admin review': 'Needs verification',
  'Pending Verification': 'Needs verification',
  Verified: 'Verified',
};
export const eventPhaseLabel = (phase: string) => phaseLabels[phase] || phase;

function Car({ x = 28, y = 39, color = '#648b83' }: { x?: number; y?: number; color?: string }) {
  return <g transform={`translate(${x} ${y})`}>
    <path d="M0 12 5 3h21l7 9v13H0Z" fill={color}/>
    <path d="m8 6-3 7h23l-5-7Z" fill="#e5eeeb"/>
    <rect x="3" y="18" width="6" height="3" rx="1" fill="#f8eccb"/>
    <rect x="24" y="18" width="6" height="3" rx="1" fill="#f8eccb"/>
    <rect x="2" y="24" width="6" height="5" rx="2" fill="#52615f"/>
    <rect x="25" y="24" width="6" height="5" rx="2" fill="#52615f"/>
  </g>;
}

function Person({ x = 46, y = 33 }: { x?: number; y?: number }) {
  return <g transform={`translate(${x} ${y})`}>
    <circle cx="0" cy="0" r="5" fill="#bd987e"/>
    <path d="M-6 11q6-7 12 0l2 13H-8Z" fill="#6d888b"/>
    <path d="m-4 25-2 12m10-12 3 12m-13-24-6 10m18-10 5 9" fill="none" stroke="#52615f" strokeWidth="3" strokeLinecap="round"/>
  </g>;
}

function CategoryScene({ category }: { category: EventCategory }) {
  switch (category) {
    case 'pothole': return <>
      <path d="m24 57 10-9 14 3 9-4 16 10-7 11-23 4-20-7Z" fill="#9aaca7"/>
      <path d="m30 57 12-5 15 1 9 7-9 6-20-2Z" fill="#596e68"/>
      <path d="m24 54-8-7m52 17 9 6m-27 1-4 7" stroke="#879a94" strokeWidth="2" fill="none"/>
    </>;
    case 'waterlogging': return <>
      <path d="M12 55q12-9 29-3t40 1l6 19H8Z" fill="#9ebfc5"/>
      <path d="M19 59h16m8 8h25m-7-10h15M24 70h10" stroke="#e7f2f1" strokeWidth="2" strokeLinecap="round"/>
      <path d="m74 26-5 8a6 6 0 0 0 10 0Z" fill="#7ea6b1"/>
    </>;
    case 'obstruction': return <>
      <path d="m20 65 8-19 14 4 4 15Zm28 2 7-15 19 5 5 11Z" fill="#a59d8b"/>
      <path d="m37 49 6-9 10 5-4 12Z" fill="#c3b89e"/>
      <path d="m22 72 56-3" stroke="#798c82" strokeWidth="3"/>
    </>;
    case 'zebra-crossing':
    case 'school-crossing': return <>
      {[0, 1, 2, 3, 4].map(index => <path key={index} d={`m${13 + index * 15} 55-6 17h9l5-17Z`} fill="#faf9ee"/>)}
      {category === 'school-crossing' ? <><Person x={48} y={29}/><path d="M76 51V22" stroke="#70877d" strokeWidth="3"/><path d="m76 13 11 18H65Z" fill="#c4a56d"/><path d="M76 21v4m0 3v1" stroke="#fff9e9" strokeWidth="2"/></> : <path d="M14 42h64" stroke="#9daea6" strokeWidth="2"/>}
    </>;
    case 'divider': return <>
      <path d="m20 70 39-35h13L36 75Z" fill="#f0e8d4"/>
      <path d="m36 75 36-40v8L39 79Z" fill="#83988d"/>
      <path d="m31 60 9 3m5-15 8 3m-30 19 9 3" stroke="#b9a071" strokeWidth="5"/>
      <path d="m49 52 5-4-1 8" fill="none" stroke="#596e68" strokeWidth="2"/>
    </>;
    case 'signboard': return <>
      <path d="M43 70V22m21 47V23" stroke="#7e9189" strokeWidth="4"/>
      <rect x="23" y="20" width="59" height="28" rx="4" fill="#63887e"/>
      <path d="M33 33h35m-7-6 7 6-7 6" stroke="#edf3eb" strokeWidth="3" fill="none"/>
      <path d="m26 45 13-5" stroke="#c2d0c6" strokeWidth="2"/>
    </>;
    case 'guardrail': return <>
      <path d="M18 50v21m29-18v18m30-24v22" stroke="#798e88" strokeWidth="4"/>
      <path d="m12 44 27 4 16 10 29-13v10L56 66 37 56l-25-3Z" fill="#a5b8b0" stroke="#768e84" strokeWidth="2"/>
      <path d="m16 48 22 4m22 8 19-9" stroke="#e9f0ea" strokeWidth="2"/>
    </>;
    case 'person': return <>
      <path d="M22 36V24h13m27 0h12v12M22 62v12h13m27 0h12V62" stroke="#8aaca0" strokeWidth="2" fill="none"/>
      <Person/>
    </>;
    case 'vehicle': return <><Car/><path d="M19 46V34h12m35 0h12v12M19 65v10h12m35 0h12V65" stroke="#8aaca0" strokeWidth="2" fill="none"/></>;
    case 'traffic': return <>
      <Car x={10} y={34} color="#7e9690"/><Car x={47} y={49} color="#b49d76"/>
      <path d="M82 43V15" stroke="#61796f" strokeWidth="3"/>
      <rect x="76" y="12" width="12" height="26" rx="4" fill="#536d64"/>
      <circle cx="82" cy="19" r="3" fill="#ca9584"/><circle cx="82" cy="30" r="3" fill="#d9c49a"/>
    </>;
    case 'incident': return <>
      <Car x={16} y={40} color="#849b96"/>
      <path d="m70 34 19 33H51Z" fill="#c6a472" stroke="#eee5d2" strokeWidth="3" strokeLinejoin="round"/>
      <path d="M70 46v9m0 4v2" stroke="#fff9ec" strokeWidth="3" strokeLinecap="round"/>
    </>;
    case 'project': return <>
      <path d="M21 47v25m53-25v25" stroke="#7b8c80" strokeWidth="4"/>
      <rect x="14" y="42" width="68" height="17" rx="2" fill="#dfc698"/>
      <path d="m20 57 12-13m6 13 12-13m6 13 12-13" stroke="#ac8b58" strokeWidth="6"/>
      <path d="m44 38 7-19 7 19Z" fill="#b59463"/><path d="M39 38h24" stroke="#7f8e80" strokeWidth="3"/>
    </>;
  }
}

/** Decorative category artwork, never a captured observation or evidence image. */
export function EventThumbnail({ category }: { category: EventCategory }) {
  return <span className="event-thumbnail" data-category={category} aria-hidden="true">
    <svg className="event-thumbnail-scene" viewBox="0 0 96 88" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
      <rect width="96" height="88" rx="12" fill="#edf2ed"/>
      <circle cx="76" cy="16" r="8" fill="#e1e9d9"/>
      <path d="M0 36h12V21h14v15h9V13h17v23h12V26h13v10h19v17H0Z" fill="#dce6dc"/>
      <path d="M0 46h96v42H0Z" fill="#cdd9d2"/>
      <path d="M0 48h96M7 80h15m15 0h15m15 0h15" stroke="#f1f4eb" strokeWidth="2"/>
      <CategoryScene category={category}/>
    </svg>
  </span>;
}