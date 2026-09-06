import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { EventThumbnail, eventPhaseLabel, type EventCategory } from '../src/components/EventThumbnail';
import { DefectCard, IncidentCard, WatchlistCard } from '../src/components/cards';
import { MunicipalTasks } from '../src/components/MunicipalTasks';
import { CitizenReportInbox } from '../src/components/CitizenReports';
import PolicePages from '../src/pages/PolicePages';
import { PoliceMapView } from '../src/components/PoliceMapView';
import MunicipalOperations from '../src/pages/MunicipalOperations';
import { cityStore } from '../src/services/city';
import { createCitySeed } from '../src/data/demo/citySeed';
import { selectMunicipalTasks } from '../src/domain/operations';
import { selectPoliceSummary, selectWatchlist } from '../src/domain/selectors';
import { demoDate, formatDemoDate, formatDemoTime } from '../src/domain/time';

// These tests render dashboard markup, not Leaflet's browser-only implementation.
vi.mock('leaflet', () => ({ default: {} }));
vi.mock('../src/components/PoliceMapView', () => ({ PoliceMapView: vi.fn(() => null) }));
// Seed workflow/selection state to SSR detail screens without adding production exports.
vi.mock('react', async importOriginal => {
  const react = await importOriginal<typeof import('react')>();
  return { ...react, useState: vi.fn(react.useState) };
});
const noop = () => {};
const categories: EventCategory[] = ['pothole', 'waterlogging', 'obstruction', 'zebra-crossing', 'divider', 'signboard', 'guardrail', 'school-crossing', 'traffic', 'incident', 'person', 'vehicle', 'project'];
const read = (file: string) => readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
beforeEach(() => cityStore.reset());
afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(useState).mockReset();
  vi.mocked(PoliceMapView).mockClear();
  cityStore.reset();
});

describe('dashboard category artwork', () => {
  it.each(categories)('renders %s as decorative vector artwork, never evidence', category => {
    const html = renderToStaticMarkup(<EventThumbnail category={category}/>);
    expect(html).toContain(`data-category="${category}" aria-hidden="true"`);
    expect(html).toContain('focusable="false"');
    expect(html).toContain('viewBox="0 0 96 88"');
    expect(html).not.toMatch(/<img|<image|<title|role="img"/);
  });

  it('has distinct scenes for all supported categories', () => {
    const artwork = categories.map(category => renderToStaticMarkup(<EventThumbnail category={category}/>).replace(`data-category="${category}"`, ''));
    expect(new Set(artwork).size).toBe(categories.length);
  });

  it('uses structured issue and watchlist categories even with unrelated titles and no photos', () => {
    const state = cityStore.getSnapshot();
    const issue = { ...state.issues['DEF-8292'], defectType: 'Renamed road record', image: '' };
    const defect = renderToStaticMarkup(<DefectCard item={issue} onClick={noop}/>);
    expect(defect).toContain('data-category="waterlogging"');
    expect(defect).not.toContain('<img');
    for (const subjectType of ['Missing Person', 'Flagged Vehicle'] as const) {
      const match = { ...Object.values(state.watchlist)[0], subjectType, subjectName: 'Unrelated title', image: '' };
      const html = renderToStaticMarkup(<WatchlistCard item={match} onClick={noop}/>);
      expect(html).toContain(`data-category="${subjectType === 'Missing Person' ? 'person' : 'vehicle'}"`);
      expect(html).not.toContain('<img');
    }
    const incident = renderToStaticMarkup(<IncidentCard item={{ ...Object.values(state.incidents)[0], image: '' }} onClick={noop}/>);
    expect(incident).toContain('data-category="incident"');
    expect(incident).not.toContain('<img');
  });

  it('defaults tasks to Needs action without losing the other filters or records', () => {
    const state = cityStore.getSnapshot();
    const tasks = selectMunicipalTasks(state);
    const html = renderToStaticMarkup(<MunicipalTasks onOpen={noop}/>);
    expect(html).toContain('Needs your attention');
    expect(html).toContain('<button aria-pressed="true">Needs action');
    for (const filter of ['All', 'Awaiting verification', 'Projects']) expect(html).toContain(`<button aria-pressed="false">${filter}`);
    expect(html).toContain(`${tasks.length} total`);
    const visible = tasks.filter(task => task.actionRequired).slice(0, 3);
    expect(html.match(/class="event-thumbnail"/g)).toHaveLength(visible.length);
    visible.forEach(task => expect(html).toContain(task.title));
    expect(cityStore.getSnapshot()).toBe(state);
  });

  it('gives both report inboxes category scenes with and without submitted photos', () => {
    for (const category of ['pothole', 'waterlogging', 'obstruction', 'traffic-obstruction'] as const) {
      cityStore.dispatch({ type: 'submitCitizenReport', input: { roadSegmentId: 'anna', category, description: 'A road problem near the junction for assessment.', ...(category === 'pothole' ? { image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZ9kAAAAASUVORK5CYII=' } : {}) } });
    }
    const municipal = renderToStaticMarkup(<CitizenReportInbox recipient="municipal" openRecord={noop}/>);
    const police = renderToStaticMarkup(<CitizenReportInbox recipient="police" openRecord={noop}/>);
    expect(municipal.match(/class="event-thumbnail"/g)).toHaveLength(3);
    expect(police).toContain('data-category="traffic"');
    expect(municipal + police).not.toContain('<img');
  });
});

describe('initial operational dashboards', () => {
  it('renders police event scenes and plain traffic copy without a duplicate review action', () => {
    const html = renderToStaticMarkup(<PolicePages page="overview" navigate={noop} exit={noop}/>);
    expect(html).toContain('10 buses reporting');
    expect(html).toContain('3.1× usual traffic');
    expect(html).toContain('Needs officer check');
    expect(html).not.toMatch(/6-bus|6-BUS|Review incident|× baseline|Candidate/);
    for (const category of ['person', 'traffic', 'incident']) expect(html).toContain(`data-category="${category}"`);
    const activity = html.slice(html.indexOf('class="activity-list event-activity"'));
    expect(activity.match(/class="event-thumbnail"/g)).toHaveLength(4);
    expect(activity).not.toContain('<img');
  });

  it('removes municipal coverage but keeps all initial event rows illustrated and the planning line chart', () => {
    const html = renderToStaticMarkup(<MunicipalOperations page="overview" navigate={noop} exit={noop}/>);
    expect(html).not.toContain('MUNICIPAL FLEET OBSERVATION COVERAGE');
    // Completed example + three tasks + three priority locations + priority issue.
    expect(html.match(/class="event-thumbnail"/g)).toHaveLength(8);
    const source = read('pages/MunicipalOperations.tsx');
    expect(source).not.toMatch(/corridorCoverage|<BarChart|charts\/bar/);
    expect(source).toContain('<LineChart');
  });

  it('uses the same Sensing fleet predicate as the reporting count, with unique marker identities', () => {
    const state = cityStore.getSnapshot();
    const fleet = Object.values(state.buses).filter(bus => bus.status === 'Sensing');
    expect(fleet).toHaveLength(10);
    expect(selectPoliceSummary(state).reportingBuses).toBe(fleet.length);
    expect(new Set(fleet.map(bus => bus.id)).size).toBe(10);
    // Co-located observations are valid; retain exact coordinates and separate bus identities.
    expect(new Set(fleet.map(bus => `${bus.id} · Route ${bus.route} · ${state.roadSegments[bus.roadSegmentId]?.name}`)).size).toBe(10);
    expect(Object.values(state.buses).some(bus => bus.status === 'In transit')).toBe(true);
    const source = read('pages/PolicePages.tsx');
    expect(source).toContain("buses.filter(bus=>bus.status==='Sensing').map");
    expect(source).not.toMatch(/buses\.slice|6-bus|6-BUS/);
  });

  it('only translates phase presentation, preserving plain labels and unknown future phases', () => {
    expect(eventPhaseLabel('Candidate')).toBe('Needs officer check');
    expect(eventPhaseLabel('Admin review')).toBe('Needs verification');
    for (const phase of ['En route', 'On scene', 'Closed', 'Future phase']) expect(eventPhaseLabel(phase)).toBe(phase);
  });
});

describe('police display timestamps', () => {
  const anchor = '2031-01-01T00:03:50.431+05:30';
  const cleanDate = (value: string) => formatDemoDate(demoDate(value));
  const expectClean = (html: string) => expect(html).not.toMatch(/\b\d{2}:\d{2}:\d{2}(?:\.\d+)?\b|Invalid Date/);
  const openWorkflow = (kind: 'match' | 'map' | 'evidence' | 'incident', id: string, selection = id) => {
    vi.mocked(useState).mockReturnValueOnce([[{ kind, id }], noop]).mockReturnValueOnce([selection, noop]);
  };

  it.each([undefined, anchor])('formats overview and watchlist cards without changing projections (anchor %s)', entry => {
    const state = createCitySeed(entry);
    vi.spyOn(cityStore, 'getSnapshot').mockReturnValue(state);
    const before = structuredClone(state);
    const matches = selectWatchlist(state);
    const html = ['overview', 'watchlist'].map(page => renderToStaticMarkup(<PolicePages page={page} navigate={noop} exit={noop}/>)).join('');
    const match = matches.find(item => item.subjectType === 'Missing Person')!;
    expect(html).toContain(formatDemoTime(demoDate(match.timestamp)));
    expect(html).toContain('Missing Person · demo');
    expectClean(html);
    expect(state).toEqual(before);
    expect(selectWatchlist(state)).toEqual(matches);
  });

  it.each(['match', 'map', 'observation'] as const)('formats %s details, map labels and trails without losing provenance or coordinates', screen => {
    const state = createCitySeed(anchor);
    vi.spyOn(cityStore, 'getSnapshot').mockReturnValue(state);
    const before = structuredClone(state);
    const matches = selectWatchlist(state);
    const match = matches.find(item => item.subjectType === 'Missing Person')!;
    const observation = match.observations![0];
    openWorkflow(screen === 'match' ? 'match' : 'map', match.id, screen === 'observation' ? observation.id : match.id);
    if (screen === 'match') vi.mocked(useState).mockReturnValueOnce([observation.id, noop]);
    const html = renderToStaticMarkup(<PolicePages page="watchlist" navigate={noop} exit={noop}/>);
    expect(html).toContain(cleanDate(observation.timestamp));
    expectClean(html);
    const map = vi.mocked(PoliceMapView).mock.calls.at(-1)![0];
    expect(map.trail).toEqual(match.observations!.map(item => ({
      id: item.id, latitude: item.latitude, longitude: item.longitude,
      label: `${item.busId} · ${cleanDate(item.timestamp)}`,
    })));
    if (screen === 'match') {
      expect(html).toContain('Fictional target · synthetic scenes · no real identity or registration');
      expect(html).toContain('Synthetic demo data only.');
      expect(map.markers).toEqual(match.observations!.map(item => ({
        id: item.id, type: 'watchlist', latitude: item.latitude, longitude: item.longitude,
        label: `${cleanDate(item.timestamp)} · ${item.location}`,
      })));
    }
    expect(state).toEqual(before);
    expect(selectWatchlist(state)).toEqual(matches);
  });

  it.each(['incident', 'evidence'] as const)('formats incident stages in %s while retaining precise source timestamps', screen => {
    const state = createCitySeed(anchor);
    vi.spyOn(cityStore, 'getSnapshot').mockReturnValue(state);
    const before = structuredClone(state);
    const incident = state.incidents['INC-24091'];
    openWorkflow(screen, incident.id);
    const html = renderToStaticMarkup(<PolicePages page="incidents" navigate={noop} exit={noop}/>);
    for (const stage of incident.track!.stages) {
      expect(stage.timestamp).toMatch(/2030.*\d{2}:\d{2}:\d{2}\.431/);
      expect(html).toContain(cleanDate(stage.timestamp));
      expect(html).not.toContain(stage.timestamp);
    }
    expectClean(html);
    if (screen === 'evidence') expect(html).toContain('synthetic demonstration frame');
    expect(state).toEqual(before);
  });
});