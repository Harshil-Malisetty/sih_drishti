import { afterEach, describe, expect, it } from 'vitest';
import { citizenService, demoService, incidentsService, municipalService } from '../src/services';
import { cityStore } from '../src/services/city';
import { createCitySeed } from '../src/data/demo/citySeed';
import { createCityStore } from '../src/domain/cityStore';
import { reportCategories } from '../src/domain/citizenReports';
import type { CitizenReportInput } from '../src/types/city';
import { expectIntegrity } from './helpers';

const input: CitizenReportInput = { roadSegmentId: 'anna', category: 'pothole', description: 'Pothole by the Teynampet bus stop.' };
afterEach(() => demoService.reset());

describe('Citizen submission service and shared role intake', () => {
  it.each([undefined, ''])('completes a report without a photo (%s) and exposes that exact receipt to Municipal', async image => {
    const receipt = await citizenService.submitReport({ ...input, image });
    expect(receipt).toMatchObject({ status: 'Pending', image: '', ...input });
    expect(await municipalService.getCitizenReports()).toEqual([receipt]);
    expect(await incidentsService.getCitizenReports()).toEqual([]);
    const accepted = await municipalService.reviewCitizenReport(receipt.id, 'Accepted', 'Inspect and qualify');
    expect(await municipalService.getRoadDefect(accepted.issueId!)).toMatchObject({ citizenReportId: receipt.id, image: '', workflowStage: 'Detected' });
    await expect(municipalService.assign(accepted.issueId!, 'roads-engineering-team', 'Supervisor')).rejects.toThrow(/Qualify/);
    await municipalService.qualify(accepted.issueId!, 'Municipal reviewer');
    expect(JSON.stringify(await citizenService.getMobilityContext())).not.toContain(input.description);
    await municipalService.assign(accepted.issueId!, 'roads-engineering-team', 'Supervisor');
    await municipalService.acknowledge(accepted.issueId!);
    expect(await municipalService.startFieldWork(accepted.issueId!)).toMatchObject({ workflowStage: 'In progress' });
    expectIntegrity(cityStore.getSnapshot());
  });

  it.each(Object.keys(reportCategories) as CitizenReportInput['category'][])('routes %s deterministically, without creating fleet evidence', async category => {
    const receipt = await citizenService.submitReport({ ...input, category });
    const police = category === 'traffic-obstruction';
    const consumer = police ? incidentsService : municipalService;
    const other = police ? municipalService : incidentsService;
    expect(await consumer.getCitizenReports()).toEqual([receipt]);
    expect(await other.getCitizenReports()).toEqual([]);
    await expect(other.reviewCitizenReport(receipt.id, 'Accepted', 'Wrong workspace')).rejects.toThrow(/responsible/);
    const accepted = await consumer.reviewCitizenReport(receipt.id, 'Accepted', 'Assess reported corridor');
    if (police) {
      expect(accepted.issueId).toBeUndefined();
      expect(await incidentsService.getIncident(accepted.incidentId!)).toMatchObject({ citizenReportId: receipt.id, detectionSource: 'Citizen report', busId: '', registrationConfidence: 0, status: 'Open' });
      const publicId = `obstruction-${receipt.roadSegmentId}-${receipt.submittedAt}`;
      expect((await citizenService.getMobilityContext()).conditions.some(item => item.id === publicId)).toBe(false);
      await expect(incidentsService.resolveCitizenReport(accepted.incidentId!, 'Officer', 'Clear')).rejects.toThrow(/Assess/);
      const team = Object.values(cityStore.getSnapshot().teams).find(item => item.departmentId === 'traffic-police')!;
      await incidentsService.assign(accepted.incidentId!, team.id, 'Traffic officer');
      expect(await incidentsService.getIncident(accepted.incidentId!)).toMatchObject({ status: 'Investigating' });
      expect((await citizenService.getMobilityContext()).conditions.some(item => item.id === publicId)).toBe(true);
      await incidentsService.resolveCitizenReport(accepted.incidentId!, 'Officer', 'Obstruction cleared after review');
      expect((await citizenService.getMobilityContext()).conditions.some(item => item.id === publicId)).toBe(false);
    } else {
      expect(accepted.incidentId).toBeUndefined();
      expect(await municipalService.getRoadDefect(accepted.issueId!)).toMatchObject({ citizenReportId: receipt.id, departmentId: category === 'waterlogging' ? 'stormwater' : 'roads-engineering', busIds: [], detectionCount: 0 });
    }
    expectIntegrity(cityStore.getSnapshot());
  });

  it('strips caller-supplied lifecycle, recipient and police-only fields', async () => {
    const receipt = await citizenService.submitReport({ ...input, issueId: 'DEF-8301', incidentId: 'INC-24091', reviewNote: 'Forged', recipient: 'police', status: 'Accepted', registrationNumber: 'PRIVATE', confidence: 99 } as CitizenReportInput);
    expect(Object.keys(receipt).sort()).toEqual(['id', 'roadSegmentId', 'category', 'description', 'image', 'submittedAt', 'status'].sort());
    expect(receipt.status).toBe('Pending');
    receipt.description = 'Changed outside store';
    const list = await municipalService.getCitizenReports();
    expect(list[0].description).toBe(input.description);
    list[0].description = 'Changed read';
    expect((await municipalService.getCitizenReports())[0].description).toBe(input.description);
  });

  it('returns distinct receipts for simultaneous service submissions', async () => {
    const receipts = await Promise.all([citizenService.submitReport(input), citizenService.submitReport({ ...input, description: 'Another pothole by the next junction.' })]);
    expect(new Set(receipts.map(item => item.id)).size).toBe(2);
    expect(receipts[0].description).toBe(input.description);
    expect(await municipalService.getCitizenReports()).toEqual(receipts);
  });

  it('supports non-planning road segments and rejects duplicate triage', async () => {
    const receipt = await citizenService.submitReport({ ...input, roadSegmentId: 'gst-saidapet' });
    expect(cityStore.getSnapshot().roadSegments[receipt.roadSegmentId].planningEnabled).toBe(false);
    await municipalService.reviewCitizenReport(receipt.id, 'Dismissed', 'Duplicate road issue');
    await expect(municipalService.reviewCitizenReport(receipt.id, 'Accepted', 'Retry')).rejects.toThrow(/already/);
    expect((await municipalService.getCitizenReports())[0].issueId).toBeUndefined();
    expectIntegrity(cityStore.getSnapshot());
  });

  it('keeps queue-full rejection atomic and allows retry after triage', async () => {
    for (let i = 0; i < 20; i++) await citizenService.submitReport(input);
    const before = cityStore.getSnapshot();
    await expect(citizenService.submitReport(input)).rejects.toThrow(/queue is full/);
    expect(cityStore.getSnapshot()).toBe(before);
    await municipalService.reviewCitizenReport(Object.keys(before.citizenReports)[0], 'Dismissed', 'Duplicate');
    expect((await citizenService.submitReport(input)).status).toBe('Pending');
  });

  it('rejects missing road geometry before accepting a report', () => {
    const seed = createCitySeed(); seed.roadSegments.anna.points = [];
    const store = createCityStore(seed), before = store.getSnapshot();
    expect(() => store.dispatch({ type: 'submitCitizenReport', input })).toThrow(/geometry/);
    expect(store.getSnapshot()).toBe(before);
  });
});