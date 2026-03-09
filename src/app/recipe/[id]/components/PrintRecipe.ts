import { formatScaledAmount } from '@app/lib/format';

import type { Recipe } from '../data';

export function printRecipe(recipe: Recipe, servings: number) {
    const totalTime = recipe.prepTime + recipe.cookTime;

    const steps = recipe.flow.nodes
        .filter((n) => n.id !== 'start' && n.type !== 'prep')
        .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);

    const ingredientRows = recipe.ingredients
        .map(
            (ing) =>
                `<tr><td style="padding:4px 12px 4px 0">${ing.name}${ing.notes ? ` <small style="color:#888">(${ing.notes})</small>` : ''}</td><td style="padding:4px 0;text-align:right;white-space:nowrap">${formatScaledAmount(ing.amount, servings, recipe.servings)} ${ing.unit}</td></tr>`,
        )
        .join('');

    const stepRows = steps
        .map(
            (node) =>
                `<li style="margin-bottom:12px"><strong>${node.label}</strong>${node.duration ? ` <span style="color:#888;font-size:0.85em">~${node.duration} Min.</span>` : ''}${node.description ? `<br><span style="color:#444;font-size:0.9em">${node.description.replace(/@\[([^\]]+)\]\([^)]*\)/g, '<strong>$1</strong>')}</span>` : ''}</li>`,
        )
        .join('');

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${recipe.title} — KüchenTakt</title>
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
${recipe.image ? `<img class="hero" src="${recipe.image}" alt="${recipe.title}" />` : ''}
<h1>${recipe.title}</h1>
<div class="meta">${recipe.category} · ${recipe.difficulty} · ${totalTime} Min. gesamt (${recipe.prepTime} Arbeit + ${recipe.cookTime} Kochen) · ${servings} Portionen</div>
${recipe.description ? `<p style="color:#444;line-height:1.5">${recipe.description}</p>` : ''}
<h2>Zutaten</h2>
<table>${ingredientRows}</table>
<h2>Zubereitung</h2>
<ol>${stepRows}</ol>
<div class="footer">KüchenTakt · kuechentakt.app</div>
</body></html>`;

    const w = window.open('', '_blank');
    if (w) {
        w.document.write(html);
        w.document.close();
        w.setTimeout(() => w.print(), 300);
    }
}
