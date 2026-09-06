import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { createCitySeed } from '../src/data/demo/citySeed';
import { completionEvidenceByKind, evidenceSequences } from '../src/data/demo/evidence';
import { selectCitizenContext, selectIssues, selectWatchlist } from '../src/domain/selectors';
import { cityStore } from '../src/services/city';
import { municipalService, workflowService } from '../src/services';
import sources from '../public/evidence/image-sources.json';

const registry = new Map(sources.map(source => [source.filename, source]));
const local = (url: string) => new URL(`../public${url}`, import.meta.url);

describe('evidence provenance and semantic coverage', () => {
  it('publishes only genuine photographic assets with a synchronized credits register', () => {
    expect(sources.every(source => source.kind === 'photo')).toBe(true);
    const files = readdirSync(new URL('../public/evidence/', import.meta.url)).filter(file => file.endsWith('.webp')).sort();
    expect(files).toEqual(sources.map(source => source.filename.split('/').at(-1)).sort());
    expect(JSON.parse(readFileSync(new URL('../public/evidence/photo-sources.json', import.meta.url), 'utf8'))).toEqual(sources);
    expect(existsSync(new URL('../public/evidence/synthetic-sources.json', import.meta.url))).toBe(false);
    expect(existsSync(new URL('../scripts/generate-demo-evidence.mjs', import.meta.url))).toBe(false);
    const credits = readFileSync(new URL('../public/evidence/credits.html', import.meta.url), 'utf8');
    for (const source of sources) expect(credits).toContain(`id="${source.id}"`);
  });
  it('has unique source entries and decodable, bounded local WebP assets with matching hashes', async () => {
    expect(registry.size).toBe(sources.length);
    for (const source of sources) {
      expect(source.sourceUrl).toBeTruthy();
      expect(source.license).toBeTruthy();
      expect(source.attribution).toBeTruthy();
      expect(source.note).toBeTruthy();
      const buffer = readFileSync(local(source.filename));
      expect(createHash('sha256').update(buffer).digest('hex')).toBe(source.sha256);
      const metadata = await sharp(buffer).metadata();
      expect(metadata.format).toBe('webp');
      expect(metadata.width).toBeLessThanOrEqual(960);
      expect(metadata.height).toBeLessThanOrEqual(720);
      expect(metadata.exif).toBeUndefined();
      expect(buffer.length).toBeLessThan(350_000);
    }
  });

  it('retains per-observation image slots and a separate completion image mapping', () => {
    const issues = selectIssues(createCitySeed());
    for (const issue of issues) {
      const images = issue.observations!.map(observation => observation.image!);
      expect(new Set(images).size).toBe(images.length);
      images.forEach(image => expect(registry.has(image)).toBe(true));
      expect(issue.image).toBe(images.at(-1));
    }
    const pothole = issues.find(issue => issue.kind === 'pothole')!;
    expect(pothole.observations!.map(observation => observation.image)).toEqual(evidenceSequences.pothole);
    expect(pothole.observations!.at(-2)).toMatchObject({ label: 'Repair in progress', busId: '' });
    expect(pothole.observations!.at(-1)).toMatchObject({ label: 'Repair verified', relativeSize: 8 });
    expect(pothole.image).toContain('pothole-verified');
    const history = pothole.observations!.map(observation => Date.parse(observation.observedAt!));
    expect(history).toEqual([...history].sort((a, b) => a - b));
  });

  it('uses actual reference photos without fabricating distinct sightings from duplicate image slots', () => {
    for (const match of selectWatchlist(createCitySeed())) {
      const frames = match.observations!.map(observation => observation.image!);
      expect(new Set([match.referenceImage, ...frames]).size).toBe(4);
      const photos = [match.referenceImage, ...frames].map(frame => registry.get(frame)!);
      photos.forEach(source => {
        expect(source.kind).toBe('photo');
        expect(source.note).toMatch(/not.*(?:missing|flagged|sightings)/i);
        expect(source.relationship).toBe('independent-reference');
      });
      expect(new Set(photos.map(source => source.sha256)).size).toBe(match.subjectType === 'Missing Person' ? 1 : 2);
      expect(match.image).toBe(frames.at(-1));
      expect(match.busId).toBe(match.observations!.at(-1)!.busId);
    }
  });

  it('uses Indian incident photos and a clearly separate Indian plate reference', () => {
    const incident = createCitySeed().incidents['INC-24091'];
    const frames = incident.track!.stages.map(stage => stage.image!);
    expect(new Set(frames).size).toBe(5);
    expect(frames).not.toContain(incident.plateImage);
    [...frames, incident.plateImage!].forEach(frame => expect(registry.get(frame)?.kind).toBe('photo'));
    frames.forEach(frame => {
      expect(registry.get(frame)?.country).toBe('India');
      expect(registry.get(frame)?.location).toBe('Rabindra Sadan, Kolkata');
    });
    expect(registry.get(incident.plateImage!)?.note).toContain('not an OCR result');
    expect(incident.registrationNumber).toBe('TN XX XX 1234');
  });

  it('contains only photographs taken in India and removes retired foreign-gallery assets', () => {
    expect(sources).toHaveLength(53);
    for (const source of sources) {
      expect(source.country).toBe('India');
      expect(source.location).toBeTruthy();
      expect(source.locationEvidence.length).toBeGreaterThan(20);
      expect(`${source.title} ${source.sourceDescription} ${source.sourceCategories.join(' ')}`).toMatch(/India|Chennai|Bengaluru|Kolkata|Ponnani|Kerala|Guntur|Haridwar|Uttarkashi|Kanhangad|Odisha|Cochin|Jamshedpur|Udaipur|Spiti|Adyar|Tuticorin/i);
      expect(source.title).not.toMatch(/Wetherby|Brattleboro|Canton-Randolph|Leamington|Frankfurt|Kemistintie|Altnaharra|Japan|chiyoda|Omagh/i);
    }
    for (const file of ['guardrail-work-4.webp','pothole-work-prepare.webp','pothole-work-pour.webp','pothole-work-finish.webp']) expect(existsSync(new URL(`../public/evidence/${file}`, import.meta.url))).toBe(false);
    expect(existsSync(new URL('../src/data/demo/photoSeries.ts', import.meta.url))).toBe(false);
  });

  it('selects completion evidence by issue type instead of reusing a car illustration', async () => {
    expect(new Set(Object.values(completionEvidenceByKind)).size).toBe(8);
    Object.values(completionEvidenceByKind).forEach(image => expect(registry.has(image)).toBe(true));
    cityStore.reset();
    try {
      const issueId = 'DEF-8292';
      await municipalService.qualify(issueId, 'Demo admin');
      await municipalService.assign(issueId, 'stormwater-team', 'Drainage lead');
      await municipalService.acknowledge(issueId);
      await municipalService.startFieldWork(issueId);
      const resolution = await workflowService.submitDemoResolution({ kind: 'municipal', id: issueId }, 'Drainage cleared', 'Standing water removed');
      expect(resolution.evidence[0].image).toBe(completionEvidenceByKind.waterlogging);
      expect(resolution.evidence[0].description).toContain('not a photograph of work at this site');
    } finally { cityStore.reset(); }
  });

  it('keeps public citizen projections free of raw images and investigative metadata', () => {
    const context = JSON.stringify(selectCitizenContext(createCitySeed()));
    for (const token of ['"image"', '"plateImage"', '"referenceImage"', '"confidence"', 'TN XX', 'MP-0241', 'MTC-']) expect(context).not.toContain(token);
  });
});