'use client';

import { Check, Copy, Facebook, Share2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { PALETTE } from '@app/lib/palette';
import { css } from 'styled-system/css';

interface ShareButtonProps {
    title: string;
    slug: string;
    imageUrl?: string;
}

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kitchenpace.app';

function buildShareUrl(slug: string) {
    return `${SITE_URL}/recipe/${slug}`;
}

export function ShareButton({ title, slug, imageUrl }: ShareButtonProps) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    function handleNativeShare() {
        const url = buildShareUrl(slug);
        if (typeof navigator !== 'undefined' && navigator.share) {
            navigator
                .share({ title, url })
                .then(() => setOpen(false))
                .catch(() => {});
        } else {
            setOpen((v) => !v);
        }
    }

    function handleCopy() {
        const url = buildShareUrl(slug);
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => {
                setCopied(false);
                setOpen(false);
            }, 1500);
        });
    }

    const url = buildShareUrl(slug);
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);

    const platforms = [
        {
            label: 'WhatsApp',
            href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
            icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
            ),
            color: '#25D366',
        },
        {
            label: 'Pinterest',
            href: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}${imageUrl ? `&media=${encodeURIComponent(imageUrl)}` : ''}`,
            icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
                </svg>
            ),
            color: '#E60023',
        },
        {
            label: 'X',
            href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
            icon: <X size={16} />,
            color: '#000000',
        },
        {
            label: 'Facebook',
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
            icon: <Facebook size={16} />,
            color: '#1877F2',
        },
    ];

    return (
        <div ref={ref} className={css({ position: 'relative', display: 'inline-block' })}>
            <button
                type="button"
                onClick={handleNativeShare}
                className={css({
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    px: '4',
                    py: '2',
                    fontSize: 'md',
                    fontWeight: '500',
                    fontFamily: 'body',
                    bg: 'transparent',
                    color: 'text',
                    borderRadius: 'md',
                    cursor: 'pointer',
                    transition: 'all 150ms ease-in-out',
                    _hover: { bg: 'light' },
                })}
            >
                <Share2 size={16} />
                Teilen
            </button>

            {open && (
                <div
                    className={css({
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: '0',
                        zIndex: '50',
                        bg: 'surface',
                        borderRadius: 'xl',
                        border: '1px solid',
                        borderColor: 'border',
                        boxShadow: {
                            base: '0 8px 32px rgba(0,0,0,0.12)',
                            _dark: '0 8px 32px rgba(0,0,0,0.4)',
                        },
                        minW: '200px',
                        overflow: 'hidden',
                        py: '1',
                    })}
                >
                    <button
                        type="button"
                        onClick={handleCopy}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            w: 'full',
                            px: '4',
                            py: '2.5',
                            fontSize: 'sm',
                            fontFamily: 'body',
                            bg: 'transparent',
                            color: 'text',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'bg 100ms',
                            _hover: { bg: 'surface.muted' },
                        })}
                    >
                        {copied ? <Check size={16} color={PALETTE.emerald} /> : <Copy size={16} />}
                        {copied ? 'Link kopiert!' : 'Link kopieren'}
                    </button>

                    <div
                        className={css({
                            h: '1px',
                            bg: 'border',
                            mx: '3',
                            my: '1',
                        })}
                    />

                    {platforms.map((p) => (
                        <a
                            key={p.label}
                            href={p.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setOpen(false)}
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                w: 'full',
                                px: '4',
                                py: '2.5',
                                fontSize: 'sm',
                                fontFamily: 'body',
                                color: 'text',
                                textDecoration: 'none',
                                transition: 'bg 100ms',
                                _hover: { bg: 'surface.muted' },
                            })}
                        >
                            <span style={{ color: p.color, display: 'flex', alignItems: 'center' }}>
                                {p.icon}
                            </span>
                            {p.label}
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}
