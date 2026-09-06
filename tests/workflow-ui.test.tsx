import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MunicipalWorkflow } from '../src/components/MunicipalWorkflow';
import { PoliceTrafficControl } from '../src/components/PoliceTrafficControl';
import { WorkflowHistory, WorkflowProgress } from '../src/components/operations';
import { cityStore } from '../src/services/city';
import { municipalService, policeTrafficService, workflowService } from '../src/services';

afterEach(() => cityStore.reset());

describe('plain-language workflow presentation', () => {
  it('presents one municipal handoff at a time through review and closure', async () => {
    const render = () => renderToStaticMarkup(<MunicipalWorkflow issueId="DEF-8292"/>);
    expect(render()).toContain('Confirm issue &amp; assign team');
    expect(render()).not.toContain('Qualify issue');
    await municipalService.confirmAndAssign('DEF-8292', 'stormwater-team', 'Demo field lead', 'Municipal admin');
    expect(render()).toContain('Accept &amp; start work');
    await municipalService.acceptAndStart('DEF-8292');
    expect(render()).toContain('Send for admin check');
    await workflowService.submitDemoResolution({ kind: 'municipal', id: 'DEF-8292' }, 'Drain cleared', 'No standing water');
    expect(render()).toContain('Approve &amp; close');
    expect(render()).toContain('Send back to team');
    const review = Object.values(cityStore.getSnapshot().reviews).find(item => item.decision === 'Pending')!;
    await workflowService.approveAndClose(review.id, 'Municipal admin', 'Work checked');
    expect(render()).toContain('Work approved and case closed.');
    expect(render()).not.toContain('Approve &amp; close');
    expect(render()).toContain('Full activity log');
  });

  it('keeps police submission hidden until the follow-up check, then requests a supervisor', async () => {
    const render = () => renderToStaticMarkup(<PoliceTrafficControl id="ANOM-ANNA-1" onBack={() => {}}/>);
    expect(render()).toContain('About 3.1 times the usual traffic');
    expect(render()).toContain('Confirm &amp; assign team');
    expect(render()).not.toMatch(/Flag for dispatch|Trigger \/ baseline/);
    await policeTrafficService.confirmAndAssign('ANOM-ANNA-1', 'central-response', 'Demo response lead', 'Traffic officer');
    const dispatch = Object.values(cityStore.getSnapshot().dispatches)[0];
    expect(render()).toContain('Team has left');
    await policeTrafficService.advanceDispatch(dispatch.id, 'En route', 'Demo response lead');
    expect(render()).toContain('Team has arrived');
    await policeTrafficService.advanceDispatch(dispatch.id, 'On scene', 'Demo response lead');
    expect(render()).toContain('Add demo traffic check');
    expect(render()).not.toContain('Send for supervisor check');
    await policeTrafficService.recordFollowUp('ANOM-ANNA-1', 'Demo response lead');
    expect(render()).toContain('Send for supervisor check');
    expect(render()).not.toContain('Add demo traffic check');
    await workflowService.submitDemoResolution({ kind: 'anomaly', id: 'ANOM-ANNA-1' }, 'Traffic cleared', 'Normal traffic');
    expect(render()).toContain('Supervisor check');
    expect(render()).toContain('Approve &amp; close');
  });

  it('keeps the complete audit trail collapsed, not deleted', () => {
    const html = renderToStaticMarkup(<WorkflowHistory items={[{ at: cityStore.getSnapshot().now, action: 'Team assigned', actor: 'Demo supervisor' }]}/>);
    expect(html).toContain('Full activity log · 1 update');
    expect(html).toContain('Team assigned');
    expect(html).toContain('Demo supervisor');
    expect(html).not.toContain('<details open');
  });

  it('identifies the active step and person responsible accessibly', () => {
    const html = renderToStaticMarkup(<WorkflowProgress steps={['Assign team', 'Fix issue', 'Admin check', 'Done']} current={1} owner="Field lead" next="Complete the work."/>);
    expect(html.match(/<li /g)).toHaveLength(4);
    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
    expect(html).toContain('<strong>Field lead</strong>');
    expect(html).toContain('Complete the work.');
  });
});