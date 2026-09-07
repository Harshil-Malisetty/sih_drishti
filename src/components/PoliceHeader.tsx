import { useId, type ComponentProps } from 'react';
import { ShieldCheck } from 'lucide-react';
import { policeJurisdictions } from '../domain/policeJurisdictions';
import { usePoliceJurisdiction } from '../services/PoliceJurisdiction';
import { AppHeader } from './ui';

export function PoliceHeader(props: ComponentProps<typeof AppHeader>) {
  const id = useId();
  const { jurisdictionId, chooseJurisdiction } = usePoliceJurisdiction();
  return <div className="police-header">
    <AppHeader {...props}/>
    <section className="jurisdiction-bar" aria-label="Police jurisdiction">
      <div className="jurisdiction-select"><label htmlFor={id}>Jurisdiction</label><select id={id} value={jurisdictionId} onChange={event => chooseJurisdiction(event.target.value as typeof jurisdictionId)}>
        <option value="all">Citywide</option>
        {policeJurisdictions.map(area => <option value={area.id} key={area.id}>{area.name}</option>)}
      </select></div>
    </section>
  </div>;
}

export function PoliceAreaIntro({ title, text, eyebrow }: { title: string; text: string; eyebrow: string }) {
  const { jurisdiction } = usePoliceJurisdiction();
  return <section className="police-area-intro">
    <div className="police-area-copy"><span>{eyebrow}</span><h1>{title}</h1><p>{text}</p></div>
    {jurisdiction&&<dl className="police-area-coverage"><dt>Coverage</dt><dd>{jurisdiction.areas}</dd></dl>}
  </section>;
}

export function PoliceEmptyState({ title, text }: { title: string; text: string }) {
  const { areaName } = usePoliceJurisdiction();
  return <div className="police-empty" role="status"><ShieldCheck aria-hidden="true"/><div><strong>{title}</strong><p>{text}</p><span>{areaName} · Change jurisdiction above to review another area.</span></div></div>;
}