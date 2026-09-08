import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AIReviewWorkbench, AnnotatedFrame } from '../src/components/AIReviewWorkbench';
import { cityStore } from '../src/services/city';
import { createCitySeed } from '../src/data/demo/citySeed';
import { navigation } from '../src/navigation/config';

afterEach(() => cityStore.reset());
describe('review workbench markup', () => {
  it('exposes review only in operational workspaces', () => {
    expect(navigation.municipal.some(item => item.id === 'review')).toBe(true);
    expect(navigation.police.some(item => item.id === 'review')).toBe(true);
    expect(navigation.citizen.some(item => item.id === 'review')).toBe(false);
  });
  it('renders a municipal queue, explicit simulation context and gated confirmation', () => {
    const html = renderToStaticMarkup(<AIReviewWorkbench role="municipal" openRecord={() => {}}/>);
    expect(html).toContain('EDGE-M01'); expect(html).not.toContain('EDGE-P01');
    expect(html).toContain('YOLO output'); expect(html).toContain('OpenCV / YOLO are not running here');
    expect(html).toContain('Original proposal'); expect(html).toContain('Review status');
    expect(html).toContain('Play frames'); expect(html).toContain('Next frame'); expect(html).toContain('Supplied frames');
    expect(html).toMatch(/<button class="primary" disabled=""[^>]*>/);
    expect(html).toContain('Request verification'); expect(html).toContain('Reject candidate');
    expect(html).toContain('Decision reason'); expect(html).toContain('Peak demo confidence');
  });
  it('never overlays a photo before it has loaded', () => {
    const frame = createCitySeed().edgeDetections['EDGE-M01'].frames[0];
    const html = renderToStaticMarkup(<AnnotatedFrame frame={frame} annotated onReady={() => {}}/>);
    expect(html).toContain('<img'); expect(html).not.toContain('class="review-box"');
  });
  it('shows a missing frame without substituting another image', () => {
    const frame = { ...createCitySeed().edgeDetections['EDGE-M01'].frames[0], image: '' };
    const html = renderToStaticMarkup(<AnnotatedFrame frame={frame} annotated onReady={() => {}}/>);
    expect(html).toContain('Evidence image unavailable'); expect(html).not.toContain('<img');
  });
});