import { detectContext } from '@app/lib/fits-now/context';

/**
 * Server component that injects a `data-period` attribute on <html> via an
 * inline script. The attribute is a space-separated list of active food-cultural
 * period slugs (e.g. "adventszeit weihnachtszeit plaetzchenzeit").
 *
 * Panda CSS conditions like `_osterzeit` target `[data-period~="osterzeit"]`,
 * so semantic tokens such as `period.accent` automatically adapt.
 *
 * Unlike the theme attribute (which needs localStorage), the period is purely
 * date-based and determined server-side — no flash, no client JS needed for
 * the initial value.
 */
export async function PeriodAttribute() {
    const { context } = await detectContext();
    const periods = context.periods.join(' ');

    if (!periods) return null;

    const script = `document.documentElement.setAttribute('data-period',${JSON.stringify(periods)});`;

    return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
