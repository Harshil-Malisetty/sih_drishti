// Run against a built preview: node scripts/qa-review.mjs
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const output = '/tmp/drishti-review-qa';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined) });
const url = process.env.QA_URL || 'http://127.0.0.1:4181/';
const navigation = page => page.getByRole('navigation', { name: 'Primary navigation' });
async function enter(page, role) {
  await page.goto(url);
  await page.getByRole('button', { name: role, exact: true }).click();
  await page.getByRole('button', { name: 'Enter demo workspace' }).click();
  await navigation(page).getByRole('button', { name: 'AI Review', exact: true }).click();
  await page.locator('.review-box').first().waitFor();
}
async function assessAll(page) {
  const count = await page.locator('.review-filmstrip button').count();
  for (let index = 0; index < count; index++) {
    await page.locator('.review-filmstrip button').nth(index).click();
    await expect(page.getByRole('button', { name: 'Supports', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Supports', exact: true }).click();
  }
  await expect(page.locator('.review-frame-assessment')).toContainText(`${count} / ${count} frames assessed`);
}
try {
  for (const width of [390, 760, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1100 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await enter(page, 'Municipal');
    await expect(page.locator('.review-detail-heading')).toContainText('EDGE-M02');
    await expect(page.getByRole('button', { name: 'Confirm candidate', exact: true })).toBeDisabled();
    const metrics = await page.locator('.review-image-plane').evaluate(element => {
      const image = element.querySelector('img'); const box = element.querySelector('.review-box');
      return { image: image.getBoundingClientRect().toJSON(), plane: element.getBoundingClientRect().toJSON(), box: box.getBoundingClientRect().toJSON(), ratio: image.naturalWidth / image.naturalHeight, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert.equal(metrics.overflow, false, `Overflow at ${width}`);
    for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(metrics.image[key] - metrics.plane[key]) < 1, `Image plane ${key}`);
    assert.ok(Math.abs(metrics.image.width / metrics.image.height - metrics.ratio) < .01);
    assert.ok(metrics.box.x >= metrics.image.x && metrics.box.right <= metrics.image.right + 1);
    assert.ok(metrics.box.y >= metrics.image.y && metrics.box.bottom <= metrics.image.bottom + 1);
    await page.locator('.review-detail').screenshot({ path: `${output}/workbench-${width}.png` });
    await page.getByRole('button', { name: 'Show raw image', exact: true }).click();
    await expect(page.locator('.review-box')).toHaveCount(0);
    await page.getByRole('button', { name: 'Show annotations', exact: true }).click();
    await expect(page.locator('.review-box')).toHaveCount(1);
    const first = await page.locator('.review-image-plane img').getAttribute('src');
    await page.getByRole('button', { name: 'Next frame', exact: true }).click();
    await expect(page.locator('.review-image-plane img')).not.toHaveAttribute('src', first);
    await page.getByRole('button', { name: 'Previous frame', exact: true }).click();
    await expect(page.locator('.review-image-plane img')).toHaveAttribute('src', first);
    await page.getByRole('button', { name: 'Play frames', exact: true }).click();
    await expect(page.locator('.review-image-plane img')).not.toHaveAttribute('src', first, { timeout: 6000 });
    await page.getByRole('button', { name: 'Pause frame playback', exact: true }).click();
    await page.locator('.review-canvas').focus();
    const beforeArrow = await page.locator('.review-image-plane img').getAttribute('src');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.review-image-plane img')).not.toHaveAttribute('src', beforeArrow);
    await page.getByLabel('Search', { exact: true }).fill('nothing-matches');
    await expect(page.getByRole('heading', { name: 'No matching candidates' })).toBeVisible();
    await page.getByLabel('Search', { exact: true }).fill('');
    await page.getByLabel('Peak demo confidence').selectOption('low');
    await expect(page.locator('.review-candidate')).toHaveCount(1);
    await expect(page.locator('.review-detail-heading')).toContainText('EDGE-M03');
    await expect(page.getByRole('button', { name: 'Play frames', exact: true })).toBeDisabled();
    await page.getByLabel('Peak demo confidence').selectOption('all');
    await page.getByLabel('Sort candidates').selectOption('Lowest confidence');
    await expect(page.locator('.review-candidate').first()).toContainText('EDGE-M03');
    await page.getByLabel('Sort candidates').selectOption('Priority');
    await expect(page.locator('.review-detail-heading')).toContainText('EDGE-M02');
    await assessAll(page);
    await page.getByLabel('Decision reason').fill('Standing water is visible across the supplied references. Confirm for field assessment.');
    await page.getByRole('button', { name: 'Confirm candidate', exact: true }).click();
    await expect(page.locator('.review-receipt')).toContainText('EDGE-M02 · Confirmed');
    await expect(page.locator('.review-detail-heading')).toContainText('EDGE-M01');
    await expect(page.locator('.review-summary')).toContainText('2 pending');
    await page.locator('.review-receipt').getByRole('button', { name: 'Open case' }).click();
    await expect(page.locator('body')).toContainText('ISS-AI');
    await navigation(page).getByRole('button', { name: 'AI Review', exact: true }).click();
    await expect(page.locator('.review-summary')).toContainText('2 pending');
    await assessAll(page);
    await page.getByRole('combobox', { name: 'Severity', exact: true }).selectOption('Low');
    await page.getByLabel('Decision reason').fill('Road defect retained; lower severity after inspecting all frames.');
    await page.getByRole('button', { name: 'Correct & confirm', exact: true }).click();
    await expect(page.locator('.review-receipt')).toContainText('EDGE-M01 · Corrected');
    await expect(page.locator('.review-detail-heading')).toContainText('EDGE-M03');
    await page.getByLabel('Decision reason').fill('Cannot establish sign damage from this single reference. Request a clearer view.');
    await page.getByRole('button', { name: 'Request verification', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Pending queue complete' })).toBeVisible();
    await page.getByRole('button', { name: 'Needs verification', exact: true }).click();
    await expect(page.locator('.review-audit')).toContainText('Cannot establish sign damage');
    await page.getByLabel('Next pending candidate after saving').uncheck();
    await page.getByLabel('Decision reason').fill('Insufficient evidence for this candidate. Reject as unsubstantiated.');
    await page.getByRole('button', { name: 'Reject candidate', exact: true }).click();
    await expect(page.locator('.review-final')).toContainText('Rejected');
    await expect(page.locator('.review-audit article')).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Confirm candidate', exact: true })).toHaveCount(0);
    await navigation(page).getByRole('button', { name: 'Overview', exact: true }).click();
    await navigation(page).getByRole('button', { name: 'AI Review', exact: true }).click();
    await expect(page.locator('.review-summary')).toContainText('3 reviewed');
    assert.deepEqual(errors, [], `Browser errors at ${width}`);
    await page.close();
  }
  const police = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await enter(police, 'Police');
  await expect(police.locator('.review-candidate')).toHaveCount(2);
  await expect(police.locator('.review-detail-heading')).toContainText('EDGE-P01');
  await police.locator('.review-detail').screenshot({ path: `${output}/police-1440.png` });
  const scopeSelect = police.locator('.jurisdiction-select select');
  const options = await scopeSelect.locator('option').evaluateAll(items => items.map(item => item.value));
  for (const option of options.filter(item => item !== 'all')) {
    await scopeSelect.selectOption(option);
    const count = await police.locator('.review-candidate').count();
    assert.ok(count < 2, 'A single jurisdiction must not expose the entire citywide queue');
  }
  await scopeSelect.selectOption('all');
  await assessAll(police);
  await police.getByLabel('Decision reason').fill('Vehicle scene requires officer assessment; not a determination of fault.');
  await police.getByRole('button', { name: 'Confirm candidate', exact: true }).click();
  await expect(police.locator('.review-receipt')).toContainText('EDGE-P01 · Confirmed');
  await police.locator('.review-receipt').getByRole('button', { name: 'Open case' }).click();
  await expect(police.locator('body')).toContainText('INC-AI');
  await police.close();

  const failed = await browser.newPage({ viewport: { width: 390, height: 1000 } });
  await failed.route('**/evidence/water-*.webp', route => route.abort());
  await failed.goto(url);
  await failed.getByRole('button', { name: 'Municipal', exact: true }).click();
  await failed.getByRole('button', { name: 'Enter demo workspace' }).click();
  await navigation(failed).getByRole('button', { name: 'AI Review', exact: true }).click();
  await expect(failed.locator('.review-image-error')).toBeVisible();
  await expect(failed.locator('.review-box')).toHaveCount(0);
  await expect(failed.getByRole('button', { name: 'Supports', exact: true })).toBeDisabled();
  await expect(failed.getByRole('button', { name: 'Unclear', exact: true })).toBeEnabled();
  await failed.close();
  console.log(`HITL QA passed: frame inspection/playback, filtering, confirmation, correction, hold/reject, next-candidate cycling, persistence, role/scope, missing images; widths 390/760/1440. Screenshots: ${output}`);
} finally { await browser.close(); }