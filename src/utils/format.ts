export const cx=(...v:(string|false|undefined)[])=>v.filter(Boolean).join(' ');
export const initials=(value:string)=>value.split(/[- ]/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
