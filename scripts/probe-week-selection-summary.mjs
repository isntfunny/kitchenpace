// Prints the before/after summary of a probe-week-selection.mjs run (KUC-126), e.g.
//   node scripts/probe-week-selection-summary.mjs /tmp/opencode/probe.json
// Reads the JSON only; touches no database.
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
    console.error('usage: node scripts/probe-week-selection-summary.mjs <probe.json>');
    process.exit(1);
}
const probe = JSON.parse(readFileSync(file, 'utf8'));
const { ruleStats, summary, cosStats } = probe;

console.log(
    `Hauptgerichte: ${ruleStats.mains}, Cosinus-Verteilung (Stichprobe): ${JSON.stringify(cosStats)}`,
);
console.log(
    `Sättigendes fehlt: vorher ${ruleStats.before.lackStarch}/${ruleStats.mains}, nachher ${ruleStats.after.lackStarch}/${ruleStats.mains}`,
);
console.log(
    `Gemüse fehlt: vorher ${ruleStats.before.lackVeg}/${ruleStats.mains}, nachher ${ruleStats.after.lackVeg}/${ruleStats.mains}`,
);
console.log(`Regel "Dazu passt": ${JSON.stringify(ruleStats.after.rule)}`);
console.log('');
console.log(
    'Profil | Hauptgerichte im kNN (vorher→nachher) | Arten Top 12 | größte Gruppe | Paar-Kosinus | Geschmacks-Kosinus',
);
for (const [i, after] of summary.after.entries()) {
    const before = summary.before[i];
    const pct = (v) => `${Math.round(v * 100)} %`;
    console.log(
        [
            after.user,
            `${pct(before.mainsShareInKnn)}→${pct(after.mainsShareInKnn)}`,
            `${before.distinctArtsTop12}→${after.distinctArtsTop12}`,
            `${before.maxSameArtTop12}→${after.maxSameArtTop12}`,
            `${before.meanPairCosTop12}→${after.meanPairCosTop12}`,
            `${before.meanTasteCosTop12 ?? '-'}→${after.meanTasteCosTop12 ?? '-'}`,
        ].join(' | '),
    );
}
