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
import { ObservationProgression } from '../src/components/PotholeLifecycle';
import { cityStore } from '../src/services/city';
import { createCitySeed } from '../src/data/demo/citySeed';
import { selectMunicipalTasks } from '../src/domain/operations';
import { selectIssues, selectPoliceSummary, selectWatchlist } from '../src/domain/selectors';
import { demoDate, formatDemoDate, formatDemoTime } from '../src/domain/time';
import * as evidenceMedia from '../src/components/EvidenceMedia';
import photoSources from '../public/evidence/photo-sources.json';
import { PoliceHeader, PoliceAreaIntro } from '../src/components/PoliceHeader';
import { PoliceJurisdictionProvider } from '../src/services/PoliceJurisdiction';
import { policeJurisdictions } from '../src/domain/policeJurisdictions';

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
const categoryPhotos: Record<EventCategory, string> = {
  pothole: '/evidence/pothole-detected.webp',
  waterlogging: '/evidence/water-persistent.webp',
  obstruction: '/evidence/road-debris.webp',
  'zebra-crossing': '/evidence/crossing-worn.webp',
  divider: '/evidence/divider-stage-2.webp',
  signboard: '/evidence/sign-missing.webp',
  guardrail: '/evidence/guardrail-damaged.webp',
  'school-crossing': '/evidence/school-stage-4.webp',
  traffic: '/evidence/water-completed.webp',
  incident: '/evidence/incident-frame-4.webp',
  person: '/evidence/person-reference.webp',
  vehicle: '/evidence/vehicle-reference.webp',
  project: '/evidence/pothole-repair.webp',
};
// Scope image/drawing assertions to thumbnails: card actions still use SVG glyphs.
const expectPhotoThumbnails = (html: string) => {
  const roots = [...html.matchAll(/<span class="event-thumbnail" data-category="([^"]*)" aria-hidden="true">[\s\S]*?<\/span>/g)];
  expect(roots.length).toBeGreaterThan(0);
  for (const [root, category] of roots) {
    expect(categories).toContain(category);
    expect(root.match(/<img\b/g)).toHaveLength(1);
    const path = root.match(/src="([^"]+)"/)?.[1];
    expect(photoSources.find(source => source.filename === path)?.kind).toBe('photo');
    expect(root).toContain('alt=""');
    expect(root).toContain('loading="lazy"');
    expect(root).not.toMatch(/<svg|<path|<image|<title|role="img"|data:image/);
  }
  return roots;
};
const read = (file: string) => readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
// Detailed provenance lives on the credits page, not inside workflow markup.
const withoutCredits = (html: string) => html.replace(/<div class="evidence-credit">[\s\S]*?<\/div>/g, '');
const expectCompactCredits = (html: string) => {
  const credits = [...html.matchAll(/<div class="evidence-credit">/g)];
  expect(credits.length).toBeGreaterThan(0);
  expect(html).toMatch(/href="\/evidence\/credits.html#[^"]+"[^>]*>Photo credits<\/a>/);
  expect(html).not.toMatch(/Portrait details|original illustration|Production privacy|authentication is not implemented|Source date:/);
  const visible = withoutCredits(html);
  expect(visible).not.toMatch(/Source date:|Original capture|source-photo-caption|photo-source-caption|real-photo-gallery|photo-collection|documented repair|Fictional demo incident|Fictional missing-person demo case|Fictional flagged-vehicle demo case/i);
  return visible;
};
beforeEach(() => cityStore.reset());
afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(useState).mockReset();
  vi.mocked(PoliceMapView).mockClear();
  cityStore.reset();
});

describe('dashboard category photographs', () => {
  it.each(categories)('renders %s as a decorative local photo, never a case capture', category => {
    const html = renderToStaticMarkup(<EventThumbnail category={category}/>);
    expect(html).toContain(`data-category="${category}" aria-hidden="true"`);
    expect(expectPhotoThumbnails(html)).toHaveLength(1);
    expect(html).not.toMatch(/title=|aria-label=|<figcaption/);
  });

  it.each(categories)('maps %s to an existing WebP photograph with source provenance', category => {
    const path = categoryPhotos[category];
    const source = photoSources.find(item => item.filename === path);
    expect(source).toBeDefined();
    expect(source?.kind).toBe('photo');
    expect(source?.id).toBe(path.split('/').at(-1)!.replace('.webp', ''));
    expect(source?.sourceUrl).toMatch(/^https:\/\//);
    expect(source?.attribution).toBeTruthy();
    expect(source?.license).toBeTruthy();
    expect(source?.note).toMatch(/\bnot\b/i);
    expect(evidenceMedia.getEvidenceSource(path)).toEqual(source);
    const bytes = readFileSync(new URL(`../public${path}`, import.meta.url));
    expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
    expect(bytes.toString('ascii', 8, 12)).toBe('WEBP');
  });

  it('uses a scene-derived photographic reference with compact external attribution', () => {
    expect(evidenceMedia.evidenceLabel(categoryPhotos.person)).toBe('Reference photo');
    expect(evidenceMedia.getEvidenceSource(categoryPhotos.person)?.relationship).toBe('subject-crop');
    const html = renderToStaticMarkup(<evidenceMedia.EvidenceCredit src={categoryPhotos.person}/>);
    expectCompactCredits(html);
    const watchlist = renderToStaticMarkup(<PolicePages page="watchlist" navigate={noop} exit={noop}/>);
    expect(watchlist).toContain('MP-0241 · Nila Raman');
    expect(watchlist).not.toContain('Fictional demo person');
  });

  it('uses a distinct relevant photographic path for each category', () => {
    expect(new Set(Object.values(categoryPhotos)).size).toBe(categories.length);
    const images = categories.map(category => renderToStaticMarkup(<EventThumbnail category={category}/>).match(/src="([^"]+)"/)![1]);
    expect(images).toEqual(categories.map(category => categoryPhotos[category]));
  });

  it.each(['/evidence/person-pass-1.webp', '/evidence/person-pass-3.webp', '/evidence/vehicle-pass-2.webp'])('aligns the loaded scene overlay with its own source coordinates: %s', src => {
    vi.mocked(useState).mockReturnValueOnce([src, noop]).mockReturnValueOnce(['', noop]);
    const html = renderToStaticMarkup(<evidenceMedia.EvidenceScene src={src} alt="Highlighted subject" label="SUBJECT"/>);
    const region = evidenceMedia.getEvidenceSource(src)!.subjectRegion!;
    expect(html).toContain('class="evidence-subject-box" aria-hidden="true"');
    for (const declaration of [`left:${region.x * 100}%`, `top:${region.y * 100}%`, `width:${region.width * 100}%`, `height:${region.height * 100}%`]) expect(html).toContain(declaration);
  });

  it('hides highlights before loading, after a scene switch, and on image failure', () => {
    const src = '/evidence/person-pass-3.webp';
    for (const loaded of ['', '/evidence/person-pass-1.webp']) {
      vi.mocked(useState).mockReturnValueOnce([loaded, noop]).mockReturnValueOnce(['', noop]);
      const html = renderToStaticMarkup(<evidenceMedia.EvidenceScene src={src} alt="Scene" label="PERSON"/>);
      expect(html).toContain(`<img src="${src}"`);
      expect(html).not.toContain('evidence-subject-box');
    }
    vi.mocked(useState).mockReturnValueOnce([src, noop]).mockReturnValueOnce([src, noop]);
    const html = renderToStaticMarkup(<evidenceMedia.EvidenceScene src={src} alt="Scene" label="PERSON"/>);
    expect(html).toContain('role="status"');
    expect(html).not.toMatch(/<img|evidence-subject-box/);
  });

  it('shows a completed-condition photo for closed records and the right incident photo for each case', () => {
    const closed = renderToStaticMarkup(<EventThumbnail category="pothole" completed/>);
    expect(closed).toContain('src="/evidence/pothole-verified.webp"');
    expect(closed).not.toContain('pothole-detected');
    const motorcycle = cityStore.getSnapshot().incidents['INC-24088'];
    const card = renderToStaticMarkup(<IncidentCard item={motorcycle} onClick={noop}/>);
    expect(card).toContain(`src="${motorcycle.image}"`);
    expect(card).not.toContain('incident-frame-4');
  });

  it.each(['unknown', '', 'constructor', '__proto__', 'toString'])('does not invent an image or drawing for unsupported category %s', category => {
    const html = renderToStaticMarkup(<EventThumbnail category={category as EventCategory}/>);
    expect(html).toBe(`<span class="event-thumbnail" data-category="${category}" aria-hidden="true"></span>`);
  });

  it('fills thumbnail frames with photos while preserving the full person composition', () => {
    const styles = read('styles-event-cards.css');
    expect(styles).toMatch(/\.event-thumbnail > img\.event-thumbnail-photo\s*\{[^}]*object-fit:\s*cover;/);
    expect(styles).toMatch(/\.event-thumbnail\[data-category="person"\] > img\.event-thumbnail-photo\s*\{\s*object-fit:\s*contain;/);
  });

  it('uses category reference photos even with unrelated titles and no case photos', () => {
    const state = cityStore.getSnapshot();
    const issue = { ...state.issues['DEF-8292'], defectType: 'Renamed road record', image: '' };
    const defect = renderToStaticMarkup(<DefectCard item={issue} onClick={noop}/>);
    expect(defect).toContain('data-category="waterlogging"');
    expect(expectPhotoThumbnails(defect)).toHaveLength(1);
    for (const subjectType of ['Missing Person', 'Flagged Vehicle'] as const) {
      const match = { ...Object.values(state.watchlist)[0], subjectType, subjectName: 'Unrelated title', image: '' };
      const html = renderToStaticMarkup(<WatchlistCard item={match} onClick={noop}/>);
      expect(html).toContain(`data-category="${subjectType === 'Missing Person' ? 'person' : 'vehicle'}"`);
      expect(expectPhotoThumbnails(html)).toHaveLength(1);
    }
    const incident = renderToStaticMarkup(<IncidentCard item={{ ...Object.values(state.incidents)[0], image: '' }} onClick={noop}/>);
    expect(incident).toContain('data-category="incident"');
    expect(expectPhotoThumbnails(incident)).toHaveLength(1);
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
    expect(expectPhotoThumbnails(html)).toHaveLength(visible.length);
    visible.forEach(task => expect(html).toContain(task.title));
    expect(cityStore.getSnapshot()).toBe(state);
  });

  it('gives both report inboxes category photos independent of submitted photos', () => {
    for (const category of ['pothole', 'waterlogging', 'obstruction', 'traffic-obstruction'] as const) {
      cityStore.dispatch({ type: 'submitCitizenReport', input: { roadSegmentId: 'anna', category, description: 'A road problem near the junction for assessment.', ...(category === 'pothole' ? { image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZ9kAAAAASUVORK5CYII=' } : {}) } });
    }
    const municipal = renderToStaticMarkup(<CitizenReportInbox recipient="municipal" openRecord={noop}/>);
    const police = renderToStaticMarkup(<CitizenReportInbox recipient="police" openRecord={noop}/>);
    expect(municipal.match(/class="event-thumbnail"/g)).toHaveLength(3);
    expect(police).toContain('data-category="traffic"');
    expect(expectPhotoThumbnails(municipal)).toHaveLength(3);
    expect(expectPhotoThumbnails(police)).toHaveLength(1);
    expect(municipal + police).not.toContain('data:image/');
  });
});

describe('initial operational dashboards', () => {
  it('keeps the jurisdiction section icon-free, with a labelled native selector and no demo metadata', () => {
    const html = renderToStaticMarkup(<PoliceJurisdictionProvider initialJurisdiction="all"><PoliceHeader title="Police Command & Control"/><PoliceAreaIntro title="Operational overview" eyebrow="POLICE OPERATIONS" text="Updated 12:30"/></PoliceJurisdictionProvider>);
    expect(html).toContain('<select');
    expect(html).toContain('>Jurisdiction</label>');
    expect(html).toContain('value="all" selected="">Citywide');
    expect(html.match(/<option /g)).toHaveLength(6);
    expect(html).not.toMatch(/<svg|All jurisdictions|Demo jurisdictions|5 operational areas|police-area-foot|police-area-label/);
    expect(html).not.toContain('>Coverage</dt>');
  });

  it.each(policeJurisdictions)('shows useful corridor context when $id is selected', area => {
    const html = renderToStaticMarkup(<PoliceJurisdictionProvider initialJurisdiction={area.id}><PoliceHeader title="Police Command & Control"/><PoliceAreaIntro title="Operational overview" eyebrow="POLICE OPERATIONS" text="Updated 12:30"/></PoliceJurisdictionProvider>);
    expect(html).toContain(`value="${area.id}" selected=""`);
    expect(html).toContain(area.areas);
    expect(html).toContain('>Coverage</dt>');
    expect(html).not.toMatch(/<svg|Demo jurisdictions|5 operational areas/);
  });

  it('renders police category photos and plain traffic copy without a duplicate review action', () => {
    const html = renderToStaticMarkup(<PolicePages page="overview" navigate={noop} exit={noop}/>);
    expect(html).toContain('10 buses reporting');
    expect(html).toContain('3.1× usual traffic');
    expect(html).toContain('Needs officer check');
    expect(html).not.toMatch(/6-bus|6-BUS|Review incident|× baseline|Candidate/);
    for (const category of ['person', 'traffic', 'incident']) expect(html).toContain(`data-category="${category}"`);
    const activity = html.slice(html.indexOf('class="activity-list event-activity"'));
    expect(activity.match(/class="event-thumbnail"/g)).toHaveLength(4);
    expect(expectPhotoThumbnails(activity)).toHaveLength(4);
    expectPhotoThumbnails(html);
  });

  it('removes municipal coverage but keeps category photos in all initial event rows and the planning line chart', () => {
    const html = renderToStaticMarkup(<MunicipalOperations page="overview" navigate={noop} exit={noop}/>);
    expect(html).not.toContain('MUNICIPAL FLEET OBSERVATION COVERAGE');
    // Completed example + three tasks + three priority locations + priority issue.
    expect(html.match(/class="event-thumbnail"/g)).toHaveLength(8);
    expect(expectPhotoThumbnails(html)).toHaveLength(8);
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

describe('compact municipal evidence', () => {
  it('keeps a visible lifecycle chart and stage picker for every seeded condition history', () => {
    const state = cityStore.getSnapshot();
    const before = structuredClone(state);
    const defects = selectIssues(state).filter(issue => (issue.observations?.length || 0) > 1);
    expect(defects.length).toBeGreaterThan(0);
    for (const defect of defects) {
      for (let index = 0; index < defect.observations!.length; index++) {
        vi.mocked(useState).mockReturnValueOnce([index, noop]);
        const html = renderToStaticMarkup(<ObservationProgression defect={defect}/>);
        const visible = expectCompactCredits(html);
        const observation = defect.observations![index];
        expect(visible).toContain('<section class="lifecycle-chart"');
        expect(visible).toContain('class="lifecycle-plot"');
        expect(visible).toContain('class="lifecycle-dates evidence-stage-picker"');
        expect(visible).toContain(`Demo day ${observation.day}`);
        expect(visible).toContain(`src="${observation.image || defect.image}"`);
        expect(visible.match(/aria-pressed="true"/g)).toHaveLength(1);
        expect(visible.match(/aria-pressed=/g)).toHaveLength(defect.observations!.length);
        expect(visible).toContain('Reference photos · demo timeline');
        expect(visible).not.toMatch(/demo-workflow-history|REAL PHOTO COLLECTION|Original capture/);
      }
    }
    expect(state).toEqual(before);
  });

  it('keeps the original four-step workflow ahead of the compact evidence disclosure', () => {
    const defect = selectIssues(cityStore.getSnapshot()).find(issue => (issue.observations?.length || 0) > 1)!;
    vi.mocked(useState).mockReturnValueOnce([[{ kind: 'detail', id: defect.id }], noop]);
    const html = renderToStaticMarkup(<MunicipalOperations page="defects" navigate={noop} exit={noop}/>);
    const visible = expectCompactCredits(html);
    for (const phase of ['Assign team', 'Fix issue', 'Admin check', 'Done']) expect(visible).toContain(phase);
    expect(visible.indexOf('Get this fixed')).toBeLessThan(visible.indexOf('Road evidence &amp; observation history'));
    expect(visible).toContain(`View ${defect.observations!.length} stages`);
    expect(visible).toContain('class="road-frame"');
    expect(visible).not.toMatch(/DEMO WORKFLOW RECORD|Real photos &amp; demo workflow history|View real photo collection/);
  });

  it('keeps citizen photos and report dates in municipal details', () => {
    const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZ9kAAAAASUVORK5CYII=';
    cityStore.dispatch({ type: 'submitCitizenReport', input: { roadSegmentId: 'anna', category: 'pothole', description: 'A pothole needs assessment near the junction.', image: photo } });
    const report = Object.values(cityStore.getSnapshot().citizenReports)[0];
    cityStore.dispatch({ type: 'reviewCitizenReport', reportId: report.id, decision: 'Accepted', note: 'Assess this pothole', reviewerRole: 'municipal' });
    const defect = selectIssues(cityStore.getSnapshot()).find(issue => issue.citizenReportId === report.id)!;
    vi.mocked(useState).mockReturnValueOnce([[{ kind: 'detail', id: defect.id }], noop]);
    const html = renderToStaticMarkup(<MunicipalOperations page="defects" navigate={noop} exit={noop}/>);
    expect(html).toContain(`src="${photo}" alt="Citizen-submitted photo"`);
    expect(html).toContain(formatDemoDate(defect.firstSeen));
    expect(html).not.toContain('Reference photos · demo timeline');
    expect(html).not.toContain('Photo credits');
  });

  it('retains an explicit unavailable state without substituting a photograph', () => {
    const empty = renderToStaticMarkup(<evidenceMedia.EvidenceImage src="" alt="Evidence"/>);
    expect(empty).toContain('Evidence image unavailable');
    expect(empty).not.toContain('<img');
    vi.mocked(useState).mockReturnValueOnce(['/evidence/pothole-detected.webp', noop]);
    const failed = renderToStaticMarkup(<evidenceMedia.EvidenceImage src="/evidence/pothole-detected.webp" alt="Evidence"/>);
    expect(failed).toContain('no substitute image is shown');
    expect(failed).not.toContain('<img');
  });
});

describe('police display timestamps', () => {
  const anchor = '2031-01-01T00:03:50.431+05:30';
  const cleanDate = (value: string) => formatDemoDate(demoDate(value));
  const expectClean = (html: string) => expect(html).not.toMatch(/\b\d{2}:\d{2}:\d{2}(?:\.\d+)?\b|Invalid Date/);
  const openWorkflow = (kind: 'match' | 'map' | 'evidence' | 'incident', id: string, selection = id) => {
    vi.mocked(useState).mockReturnValueOnce(['all', noop]).mockReturnValueOnce([[{ kind, id }], noop]).mockReturnValueOnce([selection, noop]);
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
    expectClean(withoutCredits(html));
    const map = vi.mocked(PoliceMapView).mock.calls.at(-1)![0];
    expect(map.trail).toEqual(match.observations!.map(item => ({
      id: item.id, latitude: item.latitude, longitude: item.longitude,
      label: `${item.busId} · ${cleanDate(item.timestamp)}`,
    })));
    if (screen === 'match') {
      expect(html).toContain('Possible missing-person match');
      const visible = expectCompactCredits(html);
      expect(visible).toContain('Sample comparison');
      expect(visible).not.toContain('People/vehicles pictured');
      expect(html).not.toContain('illustrated');
      expect(html).not.toMatch(/synthetic scenes|Synthetic demo data/);
      expect(map.markers).toEqual(match.observations!.map(item => ({
        id: item.id, type: 'watchlist', latitude: item.latitude, longitude: item.longitude,
        label: `${cleanDate(item.timestamp)} · ${item.location}`,
      })));
    }
    expect(state).toEqual(before);
    expect(selectWatchlist(state)).toEqual(matches);
  });

  it.each(['incident', 'evidence'] as const)('formats demo incident stages in %s while retaining precise scenario timestamps', screen => {
    const state = createCitySeed(anchor);
    vi.spyOn(cityStore, 'getSnapshot').mockReturnValue(state);
    const before = structuredClone(state);
    const incident = state.incidents['INC-24091'];
    openWorkflow(screen, incident.id);
    const html = renderToStaticMarkup(<PolicePages page="incidents" navigate={noop} exit={noop}/>);
    const timeline = html.slice(html.indexOf('class="operational-timeline"'));
    for (const stage of incident.track!.stages) {
      expect(stage.timestamp).toMatch(/2030.*\d{2}:\d{2}:\d{2}\.431/);
      expect(timeline).toContain(cleanDate(stage.timestamp));
      expect(timeline).not.toContain(stage.timestamp);
    }
    expectClean(timeline);
    expect(html).toContain('Conceptual demo timeline');
    expect(html).not.toContain('synthetic demonstration frame');
    expect(expectCompactCredits(html)).toContain('Reference photos · demo timeline');
    expect(state).toEqual(before);
  });

  it.each(['Missing Person', 'Flagged Vehicle'] as const)('keeps the compact %s comparison and interactive demo observations', subjectType => {
    const state = createCitySeed(anchor);
    vi.spyOn(cityStore, 'getSnapshot').mockReturnValue(state);
    const before = structuredClone(state);
    const match = selectWatchlist(state).find(item => item.subjectType === subjectType)!;
    for (const observation of match.observations!) {
      const select = vi.fn();
      openWorkflow('match', match.id);
      vi.mocked(useState).mockReturnValueOnce([observation.id, select]);
      const html = renderToStaticMarkup(<PolicePages page="watchlist" navigate={noop} exit={noop}/>);
      const visible = expectCompactCredits(html);
      expect(visible).toContain('compare watchlist-compare');
      expect(visible).toContain(`src="${match.referenceImage}"`);
      expect(visible).toContain(`src="${observation.image}" alt="${subjectType === 'Missing Person' ? 'Group photo with the reference woman highlighted' : 'Street photo with the reference car highlighted'}"`);
      expect(visible).toContain('class="evidence-scene"');
      expect(visible).toContain('SUBJECT IN SCENE');
      expect(visible).toContain('Observation trail');
      expect(visible).toContain(cleanDate(observation.timestamp));
      expect(visible.match(/aria-pressed="true"/g)).toHaveLength(1);
      expect(visible.match(/class="evidence-context"/g)).toHaveLength(1);
      expect(html).toContain('>Dismiss match</button>');
      expect(html).toContain('>Verify match</button>');
      const map = vi.mocked(PoliceMapView).mock.calls.at(-1)![0];
      expect(map.selected).toBe(observation.id);
      map.onSelect?.(match.observations![0].id);
      map.onTrailSelect?.(match.observations![1].id);
      expect(select.mock.calls).toEqual([[match.observations![0].id], [match.observations![1].id]]);
    }
    expect(state).toEqual(before);
  });

  it.each([0, 1, 2, 3, 4])('shows compact incident stage %s as conceptual demo history with collapsed source dates', index => {
    const state = createCitySeed(anchor);
    vi.spyOn(cityStore, 'getSnapshot').mockReturnValue(state);
    const incident = state.incidents['INC-24091'];
    const stage = incident.track!.stages[index];
    openWorkflow('evidence', incident.id);
    vi.mocked(useState).mockReturnValueOnce([index, noop]);
    const html = renderToStaticMarkup(<PolicePages page="incidents" navigate={noop} exit={noop}/>);
    const visible = expectCompactCredits(html);
    expect(visible).toContain(`src="${stage.image}" alt="Traffic reference photo"`);
    expect(visible).toContain(`${cleanDate(stage.timestamp)} · ${stage.label}`);
    expect(visible).toContain('aria-label="Conceptual demo stages"');
    expect(visible.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(visible.match(/aria-pressed=/g)).toHaveLength(incident.track!.stages.length);
    expect(visible).not.toMatch(/Camera processing stages|synthetic demonstration frame|eight-second|OCR demonstration/);
    expect(visible).toContain('class="plate-evidence"');
    expect(visible).toContain('Plate reference');
    expectClean(visible);
  });

  it('keeps the motorcycle reference in the original compact evidence frame', () => {
    openWorkflow('evidence', 'INC-24088');
    const html = renderToStaticMarkup(<PolicePages page="incidents" navigate={noop} exit={noop}/>);
    const visible = expectCompactCredits(html);
    expect(visible).toContain(`src="${cityStore.getSnapshot().incidents['INC-24088'].image}"`);
    expect(visible).toContain('class="evidence"');
    expect(visible.match(/<img src="\/evidence\//g)).toHaveLength(1);
  });

  it.each(['incident', 'evidence'] as const)('preserves citizen-submitted photos in %s without source-photo or fictional-case relabelling', screen => {
    const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZ9kAAAAASUVORK5CYII=';
    cityStore.dispatch({ type: 'submitCitizenReport', input: { roadSegmentId: 'anna', category: 'traffic-obstruction', description: 'A fallen branch obstructs the junction and requires assessment.', image: photo } });
    const report = Object.values(cityStore.getSnapshot().citizenReports)[0];
    cityStore.dispatch({ type: 'reviewCitizenReport', reportId: report.id, decision: 'Accepted', note: 'Assess the reported obstruction', reviewerRole: 'police' });
    const incident = Object.values(cityStore.getSnapshot().incidents).find(item => item.citizenReportId)!;
    openWorkflow(screen, incident.id);
    const html = renderToStaticMarkup(<PolicePages page="incidents" navigate={noop} exit={noop}/>);
    expect(html).toContain(`src="${photo}" alt="Citizen-submitted photo"`);
    expect(html).not.toMatch(/Original capture date|Fictional demo incident|Real source-photo reference|Wetherby|Rolls-Royce/);
  });
});