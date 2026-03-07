import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import * as lucideIcons from 'lucide';
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

import { getFileBuffer, BUCKET, s3Client } from '@app/lib/s3';
import { createLogger } from '@shared/logger';
import { prisma } from '@shared/prisma';

const log = createLogger('og-category');
const IS_DEV = process.env.NODE_ENV === 'development';

const WIDTH = 1200;
const HEIGHT = 630;
const PANEL_Y = 0;
const PANEL_H = 470; // image area height
const FOOTER_H = HEIGHT - PANEL_H; // 160px bottom bar
const SKEW_PX = 60; // how far the diagonal cut shifts

// Get SVG elements from lucide icon by name
// lucide icons are exported as arrays of [element, attributes] tuples
function getLucideIconSvgElements(iconName: string | null | undefined): Array<[string, Record<string, string>]> {
    if (!iconName) return [];

    // Convert kebab-case to camelCase for lucide exports
    const camelName = iconName.replace(/-./g, (x) => x[1].toUpperCase());

    // Get the icon from lucide, fallback to utensils
    const icon = (lucideIcons as Record<string, any>)[camelName] || lucideIcons.Utensils;

    try {
        // Lucide icons are arrays of [element, attributes] tuples
        if (Array.isArray(icon)) {
            return icon;
        }
        return [];
    } catch {
        return [];
    }
}

// Build SVG path elements string from lucide icon elements
function buildLucideSvgPaths(elements: Array<[string, Record<string, string>]>): string {
    return elements
        .filter(([element]) => element === 'path')
        .map(([, attrs]) => `<path d="${attrs.d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`)
        .join('');
}

// ─── S3 cache helpers ─────────────────────────────────────────────────────────

function cacheKey(slug: string): string {
    return `cache/og-category-${slug}.png`;
}

async function getFromS3Cache(key: string): Promise<Buffer | null> {
    try {
        const response = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
        if (!response.Body) return null;
        const chunks: Uint8Array[] = [];
        for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    } catch {
        return null;
    }
}

async function saveToS3Cache(key: string, buffer: Buffer): Promise<void> {
    try {
        await s3Client.send(
            new PutObjectCommand({
                Bucket: BUCKET,
                Key: key,
                Body: buffer,
                ContentType: 'image/png',
                CacheControl: 'public, max-age=86400',
            }),
        );
    } catch (error) {
        log.warn('Failed to cache OG image', { key, error: error instanceof Error ? error.message : String(error) });
    }
}

// ─── Image composition ────────────────────────────────────────────────────────

interface PanelDef {
    /** left edge of the panel (px) */
    x: number;
    /** width at top of the panel (px) */
    widthTop: number;
    /** SVG polygon clip-path points */
    clipPoints: string;
}

function buildPanels(count: number): PanelDef[] {
    if (count === 0) return [];

    if (count === 1) {
        return [
            {
                x: 0,
                widthTop: WIDTH,
                clipPoints: `0,0 ${WIDTH},0 ${WIDTH},${PANEL_H} 0,${PANEL_H}`,
            },
        ];
    }

    if (count === 2) {
        const mid = Math.round(WIDTH * 0.55);
        // All cuts lean the same way: wider at top, narrower at bottom (\)
        return [
            {
                x: 0,
                widthTop: mid + SKEW_PX,
                clipPoints: `0,0 ${mid + SKEW_PX},0 ${mid - SKEW_PX},${PANEL_H} 0,${PANEL_H}`,
            },
            {
                x: mid - SKEW_PX - 4,
                widthTop: WIDTH - mid + SKEW_PX + 4,
                clipPoints: `${mid + SKEW_PX + 4},0 ${WIDTH},0 ${WIDTH},${PANEL_H} ${mid - SKEW_PX + 4},${PANEL_H}`,
            },
        ];
    }

    // 3 panels: ~40% / ~35% / ~25% with diagonal cuts (all lean same direction \)
    const cut1 = Math.round(WIDTH * 0.40);
    const cut2 = Math.round(WIDTH * 0.73);
    return [
        {
            x: 0,
            widthTop: cut1 + SKEW_PX,
            clipPoints: `0,0 ${cut1 + SKEW_PX},0 ${cut1 - SKEW_PX},${PANEL_H} 0,${PANEL_H}`,
        },
        {
            x: cut1 - SKEW_PX - 4,
            widthTop: cut2 - cut1 + SKEW_PX * 2 + 8,
            clipPoints: `${cut1 + SKEW_PX + 4},0 ${cut2 + SKEW_PX},0 ${cut2 - SKEW_PX},${PANEL_H} ${cut1 - SKEW_PX + 4},${PANEL_H}`,
        },
        {
            x: cut2 - SKEW_PX - 4,
            widthTop: WIDTH - cut2 + SKEW_PX + 4,
            clipPoints: `${cut2 + SKEW_PX + 4},0 ${WIDTH},0 ${WIDTH},${PANEL_H} ${cut2 - SKEW_PX + 4},${PANEL_H}`,
        },
    ];
}

async function loadRecipeImage(imageKey: string, width: number, height: number): Promise<Buffer> {
    const buf = await getFileBuffer(imageKey);
    return sharp(buf).resize(width, height, { fit: 'cover', position: 'attention' }).png().toBuffer();
}

function buildSvgOverlay(
    panels: PanelDef[],
    categoryName: string,
    recipeCount: number,
    color: string,
): Buffer {
    // Diagonal category-colored border lines between panels
    const borderLines = [];
    if (panels.length >= 2) {
        // Parse the cut points from panel clip paths to draw borders
        const cuts = panels.length === 3
            ? [Math.round(WIDTH * 0.40), Math.round(WIDTH * 0.73)]
            : [Math.round(WIDTH * 0.55)];

        for (const cut of cuts) {
            borderLines.push(
                `<line x1="${cut + SKEW_PX}" y1="0" x2="${cut - SKEW_PX}" y2="${PANEL_H}" stroke="${color}" stroke-width="8" stroke-linecap="round" />`
            );
        }
    }

    // Escape XML special characters in category name
    const safeName = categoryName
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const countText = `${recipeCount} Rezept${recipeCount !== 1 ? 'e' : ''}`;

    const svg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <!-- Diagonal white borders between panels -->
  ${borderLines.join('\n  ')}

  <!-- Brand footer -->
  <rect x="0" y="${PANEL_H}" width="${WIDTH}" height="${FOOTER_H}" fill="#fceadd" />

  <!-- Category color accent bar -->
  <rect x="0" y="${PANEL_H}" width="${WIDTH}" height="8" fill="#e07b53" />

  <!-- Category name -->
  <text x="60" y="${PANEL_H + 70}" fill="#2d3436" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="800" letter-spacing="-0.5">
    ${safeName}
  </text>

  <!-- Recipe count -->
  <text x="60" y="${PANEL_H + 110}" fill="#636e72" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="400">
    ${countText}
  </text>

  <!-- KüchenTakt branding -->
  <text x="${WIDTH - 60}" y="${PANEL_H + 90}" fill="#e07b53" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="600" text-anchor="end">
    KüchenTakt
  </text>
</svg>`;

    return Buffer.from(svg);
}

async function generateOgImage(
    imageKeys: string[],
    categoryName: string,
    recipeCount: number,
    color: string,
): Promise<Buffer> {
    const panels = buildPanels(imageKeys.length);

    // Start with a warm background (visible if < 3 images)
    const base = sharp({
        create: {
            width: WIDTH,
            height: HEIGHT,
            channels: 4,
            background: { r: 248, g: 245, b: 240, alpha: 1 },
        },
    }).png();

    // Compose recipe images with diagonal clip masks
    const compositeInputs: sharp.OverlayOptions[] = [];

    for (let i = 0; i < panels.length; i++) {
        const panel = panels[i];
        const imageKey = imageKeys[i];
        if (!imageKey) continue;

        try {
            // Load and resize image to cover the panel area
            const resized = await loadRecipeImage(imageKey, WIDTH, PANEL_H);

            // Create SVG clip mask for the diagonal cut
            const clipSvg = Buffer.from(
                `<svg width="${WIDTH}" height="${PANEL_H}">
                    <polygon points="${panel.clipPoints}" fill="white" />
                </svg>`,
            );

            // Apply the clip mask to the image
            const clipped = await sharp(resized)
                .composite([{ input: clipSvg, blend: 'dest-in' }])
                .png()
                .toBuffer();

            compositeInputs.push({ input: clipped, top: PANEL_Y, left: 0 });
        } catch (err) {
            log.warn('Failed to load recipe image for OG', {
                imageKey,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }

    // Add the SVG overlay with borders, footer, text
    const overlaySvg = buildSvgOverlay(panels, categoryName, recipeCount, color);
    compositeInputs.push({ input: overlaySvg, top: 0, left: 0 });

    return base.composite(compositeInputs).png().toBuffer();
}

// ─── Fallback (no recipe images) ──────────────────────────────────────────────

function generateFallbackOg(categoryName: string, recipeCount: number, color: string, iconName?: string | null): Promise<Buffer> {
    const safeName = categoryName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const countLine =
        recipeCount > 0
            ? `<text x="${WIDTH / 2}" y="${HEIGHT / 2 + (iconName ? 90 : 50)}" fill="#636e72" font-family="system-ui, -apple-system, sans-serif" font-size="28" text-anchor="middle">${recipeCount} Rezept${recipeCount !== 1 ? 'e' : ''}</text>`
            : '';

    const iconElements = getLucideIconSvgElements(iconName);
    const iconPaths = buildLucideSvgPaths(iconElements);

    // Large background icon (very subtle)
    const bgIconSize = 800;
    const bgIconSvg = iconPaths ? `<g opacity="0.06" transform="translate(${WIDTH / 2 - bgIconSize / 2}, ${HEIGHT / 2 - bgIconSize / 2})"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${bgIconSize}" height="${bgIconSize}">${iconPaths.replace(/currentColor/g, color)}</svg></g>` : '';

    // Foreground icon
    const iconSvg = iconPaths ? `<g transform="translate(${WIDTH / 2 - 60}, ${HEIGHT / 2 - 140})"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="120" height="120">${iconPaths.replace(/currentColor/g, color)}</svg></g>` : '';

    // Generate decorative circles that fade out (only if no icon)
    const circles = !iconName ? Array.from({ length: 5 }, (_, i) => {
        const radius = 80 + i * 40;
        const opacity = (1 - i / 5) * 0.15;
        return `<circle cx="${WIDTH * 0.25}" cy="${HEIGHT * 0.3}" r="${radius}" fill="${color}" opacity="${opacity}" />`;
    }).join('\n  ') : '';

    const svg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fceadd" />
      <stop offset="100%" stop-color="#f8f5f0" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${color}" />
      <stop offset="100%" stop-color="${color}e6" />
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)" />

  <!-- Large subtle background icon -->
  ${bgIconSvg}

  <!-- Decorative background circles -->
  ${circles}

  <!-- Top accent shape -->
  <rect x="0" y="0" width="${WIDTH}" height="8" fill="url(#accentGrad)" />

  <!-- Bottom accent bar -->
  <rect x="0" y="${HEIGHT - 8}" width="${WIDTH}" height="8" fill="url(#accentGrad)" />

  <!-- Category icon -->
  ${iconSvg}

  <!-- Category name -->
  <text x="${WIDTH / 2}" y="${iconName ? HEIGHT / 2 + 30 : recipeCount > 0 ? HEIGHT / 2 - 20 : HEIGHT / 2}" fill="#2d3436" font-family="system-ui, -apple-system, sans-serif" font-size="64" font-weight="800" text-anchor="middle">
    ${safeName}
  </text>

  ${countLine}

  <!-- KüchenTakt branding -->
  <text x="${WIDTH / 2}" y="${recipeCount > 0 ? HEIGHT / 2 + 105 : HEIGHT / 2 + 70}" fill="${color}" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="600" text-anchor="middle">
    KüchenTakt
  </text>
</svg>`;

    return sharp(Buffer.from(svg)).png().toBuffer();
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
) {
    const { slug } = await params;

    try {
        // Check S3 cache first (skip in dev for fast iteration)
        if (!IS_DEV) {
            const cached = await getFromS3Cache(cacheKey(slug));
            if (cached) {
                return new NextResponse(new Uint8Array(cached), {
                    headers: {
                        'Content-Type': 'image/png',
                        'Cache-Control': 'public, max-age=86400',
                        'X-Cache': 'HIT',
                    },
                });
            }
        }

        // Fetch category
        const category = await prisma.category.findUnique({
            where: { slug },
            select: { id: true, name: true, color: true, icon: true },
        });

        if (!category) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        }

        // Get top 3 recipes with images
        const recipes = await prisma.recipe.findMany({
            where: {
                publishedAt: { not: null },
                categories: { some: { categoryId: category.id } },
                imageKey: { not: null },
            },
            orderBy: [{ viewCount: 'desc' }, { rating: 'desc' }],
            take: 3,
            select: { imageKey: true },
        });

        const imageKeys = recipes.map((r) => r.imageKey).filter((k): k is string => k !== null);

        // Count recipes
        const recipeCount = await prisma.recipeCategory.count({
            where: {
                categoryId: category.id,
                recipe: { publishedAt: { not: null } },
            },
        });

        const color = category.color ?? '#e07b53';

        // Generate
        const buffer =
            imageKeys.length > 0
                ? await generateOgImage(imageKeys, category.name, recipeCount, color)
                : await generateFallbackOg(category.name, recipeCount, color, category.icon);

        // Cache to S3 (fire-and-forget, skip in dev)
        if (!IS_DEV) {
            saveToS3Cache(cacheKey(slug), buffer);
        }

        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': IS_DEV ? 'no-store' : 'public, max-age=86400',
                'X-Cache': 'MISS',
            },
        });
    } catch (error) {
        log.error('Category OG generation failed', {
            slug,
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
    }
}
