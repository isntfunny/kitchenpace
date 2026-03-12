'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

import { Header } from '@app/components/features/Header';
import { css } from 'styled-system/css';

type PageShellProps = {
    children: ReactNode;
};

export function PageShell({ children }: PageShellProps) {
    return (
        <div
            className={css({
                minH: '100vh',
                color: 'text',
                display: 'flex',
                flexDirection: 'column',
            })}
        >
            <Header />
            <main
                className={css({
                    flex: '1',
                    maxWidth: '1400px',
                    marginX: 'auto',
                    width: '100%',
                    paddingX: { base: '4', md: '6' },
                    paddingY: { base: '4', md: '5' },
                })}
            >
                {children}
            </main>
            <footer
                className={css({
                    borderTop: '1px solid',
                    borderColor: 'border',
                    py: '4',
                    px: { base: '4', md: '6' },
                })}
            >
                <div
                    className={css({
                        maxWidth: '1400px',
                        marginX: 'auto',
                        display: 'flex',
                        gap: '5',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        fontSize: 'xs',
                        color: 'text-muted',
                    })}
                >
                    <span>© {new Date().getFullYear()} KüchenTakt</span>
                    <Link
                        href="/impressum"
                        className={css({
                            _hover: { color: 'palette.orange' },
                            transition: 'color 0.15s',
                        })}
                    >
                        Impressum
                    </Link>
                    <Link
                        href="/datenschutz"
                        className={css({
                            _hover: { color: 'palette.orange' },
                            transition: 'color 0.15s',
                        })}
                    >
                        Datenschutz
                    </Link>
                </div>
            </footer>
        </div>
    );
}
