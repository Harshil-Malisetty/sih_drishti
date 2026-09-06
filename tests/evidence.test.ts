import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
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

  it('gives every municipal observation distinct media; the verified surface is not a defect image', () => {
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

  it('keeps watchlist references distinct from sightings and projects the latest frame with its metadata', () => {
    for (const match of selectWatchlist(createCitySeed())) {
      const frames = match.observations!.map(observation => observation.image!);
      expect(new Set([match.referenceImage, ...frames]).size).toBe(4);
      [match.referenceImage, ...frames].forEach(frame => expect(registry.get(frame)?.kind).toBe('synthetic'));
      expect(match.image).toBe(frames.at(-1));
      expect(match.busId).toBe(match.observations!.at(-1)!.busId);
    }
  });

  it('has separate incident frames and OCR evidence, with no real target identities', () => {
    const incident = createCitySeed().incidents['INC-24091'];
    const frames = incident.track!.stages.map(stage => stage.image!);
    expect(new Set(frames).size).toBe(5);
    expect(frames).not.toContain(incident.plateImage);
    [...frames, incident.plateImage!].forEach(frame => expect(registry.get(frame)?.kind).toBe('synthetic'));
    expect(incident.registrationNumber).toBe('TN XX XX 1234');
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