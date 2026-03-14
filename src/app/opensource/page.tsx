'use client';

import { useMemo, useState } from 'react';

import { PageShell } from '@app/components/layouts/PageShell';
import licensesRaw from '@app/data/licenses.json';
import { css } from 'styled-system/css';

// ─── Types ─────────────────────────────────────────────────────────────────

type Package = {
    nameVersion: string;
    name: string;
    version: string;
    license: string;
    licenseGroup: string;
    repository?: string;
    publisher?: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeLicense(lic: string): string {
    if (!lic || lic.startsWith('Custom:')) return 'Sonstige';
    if (lic.includes('MIT')) return 'MIT';
    if (lic.includes('Apache')) return 'Apache-2.0';
    if (lic.includes('ISC')) return 'ISC';
    if (lic.includes('BSD')) return 'BSD';
    if (lic.includes('MPL')) return 'MPL';
    if (lic.includes('GPL')) return 'GPL';
    if (lic.includes('LGPL')) return 'LGPL';
    if (lic.includes('Unlicense') || lic === '0BSD' || lic === 'UNLICENSED')
        return 'Public Domain / Unlicense';
    return 'Sonstige';
}

const LICENSE_ORDER = [
    'MIT',
    'Apache-2.0',
    'ISC',
    'BSD',
    'MPL',
    'GPL',
    'LGPL',
    'Public Domain / Unlicense',
    'Sonstige',
];

function buildPackages(): Package[] {
    return Object.entries(
        licensesRaw as Record<
            string,
            { licenses: string; repository?: string; publisher?: string }
        >,
    )
        .map(([key, val]) => {
            const atIdx = key.lastIndexOf('@');
            const name = atIdx > 0 ? key.slice(0, atIdx) : key;
            const version = atIdx > 0 ? key.slice(atIdx + 1) : '';
            return {
                nameVersion: key,
                name,
                version,
                license: val.licenses ?? 'Unknown',
                licenseGroup: normalizeLicense(val.licenses ?? ''),
                repository: val.repository,
                publisher: val.publisher,
            };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
}

const ALL_PACKAGES = buildPackages();

const LICENSE_COUNTS = ALL_PACKAGES.reduce<Record<string, number>>((acc, pkg) => {
    acc[pkg.licenseGroup] = (acc[pkg.licenseGroup] ?? 0) + 1;
    return acc;
}, {});

// ─── Components ─────────────────────────────────────────────────────────────

function LicenseBadge({ license }: { license: string }) {
    const colors: Record<string, string> = {
        MIT: '#00b894',
        'Apache-2.0': '#0984e3',
        ISC: '#6c5ce7',
        BSD: '#e17055',
        MPL: '#fdcb6e',
        GPL: '#d63031',
        LGPL: '#e84393',
        'Public Domain / Unlicense': '#636e72',
        Sonstige: '#b2bec3',
    };
    const color = colors[license] ?? '#b2bec3';
    return (
        <span
            className={css({
                display: 'inline-flex',
                alignItems: 'center',
                px: '2',
                py: '0.5',
                borderRadius: 'full',
                fontSize: '10px',
                fontWeight: '600',
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
            })}
            style={{ background: color + '22', color }}
        >
            {license}
        </span>
    );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function OpenSourcePage() {
    const [search, setSearch] = useState('');
    const [activeGroup, setActiveGroup] = useState<string | null>(null);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return ALL_PACKAGES.filter((pkg) => {
            if (activeGroup && pkg.licenseGroup !== activeGroup) return false;
            if (!q) return true;
            return pkg.name.toLowerCase().includes(q) || pkg.license.toLowerCase().includes(q);
        });
    }, [search, activeGroup]);

    return (
        <PageShell>
            <div
                className={css({
                    maxW: '900px',
                    mx: 'auto',
                    py: { base: '6', md: '10' },
                    px: { base: '0', md: '4' },
                })}
            >
                {/* Header */}
                <div className={css({ mb: '8' })}>
                    <h1
                        className={css({
                            fontFamily: 'heading',
                            fontSize: { base: '2xl', md: '3xl' },
                            fontWeight: '700',
                            mb: '2',
                        })}
                    >
                        Open-Source-Bibliotheken
                    </h1>
                    <p className={css({ color: 'text-muted', fontSize: 'sm', lineHeight: '1.7' })}>
                        KüchenTakt basiert auf {ALL_PACKAGES.length} Open-Source-Paketen. Wir danken
                        allen Entwickler·innen, die diese Projekte ermöglichen.
                    </p>
                </div>

                {/* License filter pills */}
                <div
                    className={css({
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '2',
                        mb: '5',
                    })}
                >
                    <button
                        onClick={() => setActiveGroup(null)}
                        className={css({
                            px: '3',
                            py: '1',
                            borderRadius: 'full',
                            fontSize: 'xs',
                            fontWeight: '600',
                            border: '1px solid',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                        })}
                        style={
                            activeGroup === null
                                ? {
                                      background: 'var(--colors-palette-orange)',
                                      color: '#fff',
                                      borderColor: 'var(--colors-palette-orange)',
                                  }
                                : {
                                      background: 'transparent',
                                      color: 'var(--colors-text-muted)',
                                      borderColor: 'var(--colors-border)',
                                  }
                        }
                    >
                        Alle ({ALL_PACKAGES.length})
                    </button>
                    {LICENSE_ORDER.filter((g) => LICENSE_COUNTS[g]).map((group) => (
                        <button
                            key={group}
                            onClick={() => setActiveGroup(activeGroup === group ? null : group)}
                            className={css({
                                px: '3',
                                py: '1',
                                borderRadius: 'full',
                                fontSize: 'xs',
                                fontWeight: '600',
                                border: '1px solid',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                            })}
                            style={
                                activeGroup === group
                                    ? {
                                          background: 'var(--colors-palette-orange)',
                                          color: '#fff',
                                          borderColor: 'var(--colors-palette-orange)',
                                      }
                                    : {
                                          background: 'transparent',
                                          color: 'var(--colors-text-muted)',
                                          borderColor: 'var(--colors-border)',
                                      }
                            }
                        >
                            {group} ({LICENSE_COUNTS[group]})
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className={css({ mb: '5' })}>
                    <input
                        type="search"
                        placeholder="Paket suchen…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={css({
                            w: '100%',
                            px: '4',
                            py: '2.5',
                            borderRadius: 'md',
                            border: '1px solid',
                            borderColor: 'border',
                            background: 'surface-raised',
                            color: 'text',
                            fontSize: 'sm',
                            outline: 'none',
                            _focus: { borderColor: 'palette.orange' },
                        })}
                    />
                </div>

                {/* Result count */}
                <p className={css({ fontSize: 'xs', color: 'text-muted', mb: '3' })}>
                    {filtered.length} Pakete angezeigt
                </p>

                {/* Table */}
                <div
                    className={css({
                        borderRadius: 'lg',
                        border: '1px solid',
                        borderColor: 'border',
                        overflow: 'hidden',
                    })}
                >
                    <div
                        className={css({
                            overflowX: 'auto',
                        })}
                    >
                        <table
                            className={css({
                                width: '100%',
                                borderCollapse: 'collapse',
                                fontSize: 'xs',
                            })}
                        >
                            <thead>
                                <tr
                                    className={css({
                                        background: 'surface-raised',
                                        borderBottom: '1px solid',
                                        borderColor: 'border',
                                    })}
                                >
                                    {['Paket', 'Version', 'Lizenz', 'Autor·in'].map((h) => (
                                        <th
                                            key={h}
                                            className={css({
                                                textAlign: 'left',
                                                px: '4',
                                                py: '3',
                                                fontWeight: '600',
                                                color: 'text',
                                                whiteSpace: 'nowrap',
                                                fontSize: 'xs',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.06em',
                                            })}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((pkg, i) => (
                                    <tr
                                        key={pkg.nameVersion}
                                        className={css({
                                            borderBottom: '1px solid',
                                            borderColor: 'border',
                                            _last: { borderBottom: 'none' },
                                            _hover: { background: 'surface-raised' },
                                            transition: 'background 0.1s',
                                        })}
                                        style={
                                            i % 2 === 0 ? {} : { background: 'rgba(0,0,0,0.015)' }
                                        }
                                    >
                                        <td
                                            className={css({
                                                px: '4',
                                                py: '2.5',
                                                fontWeight: '500',
                                                color: 'text',
                                                maxW: '280px',
                                            })}
                                        >
                                            {pkg.repository ? (
                                                <a
                                                    href={pkg.repository}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={css({
                                                        color: 'palette.orange',
                                                        textDecoration: 'underline',
                                                        textUnderlineOffset: '2px',
                                                        _hover: { opacity: '0.8' },
                                                        wordBreak: 'break-word',
                                                    })}
                                                >
                                                    {pkg.name}
                                                </a>
                                            ) : (
                                                <span className={css({ wordBreak: 'break-word' })}>
                                                    {pkg.name}
                                                </span>
                                            )}
                                        </td>
                                        <td
                                            className={css({
                                                px: '4',
                                                py: '2.5',
                                                color: 'text-muted',
                                                whiteSpace: 'nowrap',
                                                fontFamily: 'mono',
                                            })}
                                        >
                                            {pkg.version}
                                        </td>
                                        <td
                                            className={css({
                                                px: '4',
                                                py: '2.5',
                                                whiteSpace: 'nowrap',
                                            })}
                                        >
                                            <LicenseBadge license={pkg.licenseGroup} />
                                        </td>
                                        <td
                                            className={css({
                                                px: '4',
                                                py: '2.5',
                                                color: 'text-muted',
                                                maxW: '200px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            })}
                                        >
                                            {pkg.publisher ?? '—'}
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className={css({
                                                px: '4',
                                                py: '10',
                                                textAlign: 'center',
                                                color: 'text-muted',
                                                fontSize: 'sm',
                                            })}
                                        >
                                            Keine Pakete gefunden.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </PageShell>
    );
}
