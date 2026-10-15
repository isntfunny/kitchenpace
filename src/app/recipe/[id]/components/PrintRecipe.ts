import {
    scaleQuantity,
    scaleMentionOverride,
    portionFactor,
} from '@app/lib/ingredients/quantities';

import type { Recipe } from '../data';

const escapeHtml = (value: string) =>
    value.replace(
        /[&<>"']/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
    );

export function printRecipe(recipe: Recipe, servings: number) {
    const factor = portionFactor(servings, recipe.servings);
    const totalTime = recipe.prepTime + recipe.cookTime;

    const steps = recipe.flow.nodes
        .filter((n) => n.id !== 'start' && n.type !== 'prep')
        .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);

    const ingredientRows = recipe.ingredients
        .map((ing) => {
            const raw = ing.rawAmount ?? String(ing.amount);
            const quantity = raw.trim()
                ? [scaleQuantity(raw, factor), ing.unit].filter(Boolean).join(' ')
                : '';
            return `<tr><td style="padding:4px 12px 4px 0">${escapeHtml(ing.name)}${ing.notes ? ` <small style="color:#888">(${escapeHtml(ing.notes)})</small>` : ''}</td><td style="padding:4px 0;text-align:right;white-space:nowrap">${escapeHtml(quantity)}</td></tr>`;
        })
        .join('');
    const description = (text: string) => {
        let result = '',
            last = 0;
        for (const match of text.matchAll(/@\[(.*?)(?:\|(.*?))?\]\((.*?)\)/g)) {
            result += escapeHtml(text.slice(last, match.index));
            const [, name, override, id] = match;
            const candidates = recipe.ingredients.filter((ing) => ing.ingredientId === id);
            const ing =
                recipe.ingredients.find((ing) => ing.id === id) ??
                (candidates.length === 1 ? candidates[0] : undefined);
            const raw = ing?.rawAmount ?? (ing ? String(ing.amount) : '');
            const quantity = override
                ? scaleMentionOverride(override, factor)
                : raw.trim()
                  ? [scaleQuantity(raw, factor), ing?.unit].filter(Boolean).join(' ')
                  : '';
            result += `<strong>${escapeHtml(name)}${quantity ? ` (${escapeHtml(quantity)})` : ''}</strong>`;
            last = match.index! + match[0].length;
        }
        return result + escapeHtml(text.slice(last));
    };
    const stepRows = steps
        .map(
            (node) =>
                `<li style="margin-bottom:12px"><strong>${escapeHtml(node.label)}</strong>${node.duration ? ` <span style="color:#888;font-size:0.85em">~${node.duration} Min.</span>` : ''}${node.description ? `<br><span style="color:#444;font-size:0.9em">${description(node.description)}</span>` : ''}</li>`,
        )
        .join('');

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(recipe.title)} — KochTakt</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 700px; margin: 0 auto; padding: 40px 24px; color: #222; }
  h1 { font-size: 1.8em; margin-bottom: 4px; }
  .meta { color: #666; font-size: 0.9em; margin-bottom: 24px; }
  h2 { font-size: 1.2em; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-top: 28px; }
  table { width: 100%; border-collapse: collapse; }
  tr:nth-child(even) { background: #f9f7f4; }
  ol { padding-left: 20px; line-height: 1.6; }
  .footer { margin-top: 40px; text-align: center; color: #aaa; font-size: 0.8em; border-top: 1px solid #eee; padding-top: 16px; }
  .hero { width: 100%; max-height: 300px; object-fit: cover; border-radius: 12px; margin-bottom: 20px; }
  @media print { body { padding: 0; } .hero { max-height: 250px; } }
</style></head><body>
${recipe.image ? `<img class="hero" src="${escapeHtml(recipe.image)}" alt="${escapeHtml(recipe.title)}" />` : ''}
<h1>${escapeHtml(recipe.title)}</h1>
<div class="meta">${escapeHtml(recipe.category)} · ${escapeHtml(recipe.difficulty)} · ${totalTime} Min. gesamt (${recipe.prepTime} Arbeit + ${recipe.cookTime} Kochen) · ${servings} Portionen</div>
${recipe.description ? `<p style="color:#444;line-height:1.5">${escapeHtml(recipe.description)}</p>` : ''}
<h2>Zutaten</h2>
<table>${ingredientRows}</table>
<h2>Zubereitung</h2>
<ol>${stepRows}</ol>
<div class="footer">KochTakt · kochtakt.app</div>
</body></html>`;

    const w = window.open('', '_blank');
    if (w) {
        w.document.write(html);
        w.document.close();
        w.setTimeout(() => w.print(), 300);
    }
}
