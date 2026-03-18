import Link from 'next/link';

import { AnimatedChefHat } from '@app/components/motion/AnimatedChefHat';

import { css } from 'styled-system/css';

export function Footer() {
    return (
        <footer
            className={css({
                py: 'page.y.md',
                mt: 'page.y.md',
                textAlign: 'center',
                fontFamily: 'body',
                fontSize: 'sm',
                color: 'text.muted',
                background: 'surface.card',
                boxShadow: 'shadow.medium',
            })}
        >
            <div
                className={css({
                    maxWidth: '600px',
                    margin: '0 auto',
                    padding: '0 4',
                })}
            >
                <div
                    className={css({
                        fontSize: '2xl',
                        marginBottom: '3',
                        color: 'palette.orange',
                    })}
                >
                    <AnimatedChefHat />
                </div>
                <div
                    className={css({
                        fontWeight: '600',
                        color: 'text',
                        marginBottom: '2',
                    })}
                >
                    KüchenTakt
                </div>
                <div className={css({ marginBottom: '3' })}>
                    © {new Date().getFullYear()} KüchenTakt · Produkte mit Gefühl entdecken
                </div>
                <div
                    className={css({
                        display: 'flex',
                        gap: '4',
                        justifyContent: 'center',
                        fontSize: 'xs',
                        color: 'text.muted',
                    })}
                >
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
            </div>
        </footer>
    );
}
