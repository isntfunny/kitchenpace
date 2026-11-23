import assert from 'node:assert/strict';
import { test } from 'node:test';

import sharp from 'sharp';

import { buildImagePlaceholder, PLACEHOLDER_SIZE } from '../../src/lib/recipe-image-placeholder';

async function photo(width: number, height: number, orientation?: number): Promise<Buffer> {
    const image = sharp({
        create: { width, height, channels: 3, background: { r: 200, g: 120, b: 40 } },
    }).jpeg();
    return (orientation ? image.withMetadata({ orientation }) : image).toBuffer();
}

test('the preview is a tiny WebP data URL that keeps the image size', async () => {
    const result = await buildImagePlaceholder(await photo(1600, 900));

    assert.match(result.dataUrl, /^data:image\/webp;base64,/);
    assert.ok(result.dataUrl.length < 600, `data URL has ${result.dataUrl.length} chars`);
    assert.deepEqual([result.width, result.height], [1600, 900]);

    const preview = await sharp(Buffer.from(result.dataUrl.split(',')[1]!, 'base64')).metadata();
    assert.equal(preview.width, PLACEHOLDER_SIZE);
    assert.equal(preview.height, 9);
});

test('a rotated phone photo reports the size it is shown at', async () => {
    const result = await buildImagePlaceholder(await photo(1600, 900, 6));

    assert.deepEqual([result.width, result.height], [900, 1600]);
});
