// Run against a built preview: node scripts/qa-watchlist.mjs
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const sources = JSON.parse(await readFile(new URL('../public/evidence/image-sources.json', import.meta.url)));
const output = '/tmp/drishti-watchlist-qa';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined) });
try {
  for (const width of [390, 760, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1100 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.QA_URL || 'http://127.0.0.1:4181/');
    await page.getByRole('button', { name: 'Police', exact: true }).click();
    await page.getByRole('button', { name: 'Enter demo workspace' }).click();
    await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('button', { name: 'Watchlist' }).click();
    for (const kind of ['person', 'vehicle']) {
      if (kind === 'vehicle') await page.getByRole('button', { name: 'Flagged Vehicles', exact: true }).click();
      await page.locator('.watch-card').click();
      const comparison = page.locator('.watchlist-compare');
      await comparison.waitFor();
      for (const index of [2, 0, 1, 2]) {
        await page.locator('.evidence-trail button').nth(index).click();
        await page.locator('.evidence-subject-box').waitFor();
        const metrics = await comparison.evaluate(element => {
          const image = element.querySelector('.evidence-scene img');
          const scene = image.parentElement;
          const box = scene.querySelector('.evidence-subject-box');
          return {
            src: image.getAttribute('src'),
            image: image.getBoundingClientRect().toJSON(),
            scene: scene.getBoundingClientRect().toJSON(),
            frame: scene.parentElement.getBoundingClientRect().toJSON(),
            box: box.getBoundingClientRect().toJSON(),
            naturalRatio: image.naturalWidth / image.naturalHeight,
            overflow: document.documentElement.scrollWidth > window.innerWidth,
          };
        });
        assert.equal(metrics.src, `/evidence/${kind}-pass-${index + 1}.webp`);
        const region = sources.find(source => source.filename === metrics.src).subjectRegion;
        assert.equal(metrics.overflow, false, `${kind}/${width}: horizontal overflow`);
        for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(metrics.image[key] - metrics.scene[key]) < 1, `${kind}/${width}: scene must match image ${key}`);
        assert.ok(Math.abs(metrics.image.width / metrics.image.height - metrics.naturalRatio) < .01, 'Image must not stretch');
        assert.ok(metrics.image.y >= metrics.frame.y - 1 && metrics.image.bottom <= metrics.frame.bottom + 1, 'Image must fit frame');
        assert.ok(Math.abs(metrics.box.x - metrics.image.x - region.x * metrics.image.width) < 1);
        assert.ok(Math.abs(metrics.box.y - metrics.image.y - region.y * metrics.image.height) < 1);
        assert.ok(Math.abs(metrics.box.width - region.width * metrics.image.width) < 1);
        assert.ok(Math.abs(metrics.box.height - region.height * metrics.image.height) < 1);
      }
      const text = await page.locator('body').innerText();
      assert.doesNotMatch(text, /Portrait details|original illustration|Production privacy|authentication is not implemented|Source date:/);
      assert.equal(await comparison.locator('img').count(), 2);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `${output}/${kind}-${width}.png`, fullPage: true });
      await page.getByRole('button', { name: 'Go back', exact: true }).click();
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(`Watchlist: both subjects, all scene selections, 3 viewport widths passed. Screenshots: ${output}`);
} finally {
  await browser.close();
}