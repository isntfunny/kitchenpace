'use client';

import { SiFacebook, SiPinterest, SiWhatsapp, SiX } from '@icons-pack/react-simple-icons';
import { Check, Copy, Share2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { PALETTE } from '@app/lib/palette';
import { getThumbnailUrl } from '@app/lib/thumbnail-client';

import { css } from 'styled-system/css';

interface ShareButtonProps {
    title: string;
    slug: string;
    imageKey?: string;
}

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kitchenpace.app';

function buildShareUrl(slug: string) {
    return `${SITE_URL}/recipe/${slug}`;
}

export function ShareButton({ title, slug, imageKey }: ShareButtonProps) {
    const imgUrl = imageKey ? getThumbnailUrl(imageKey, '16:9', 1200) : undefined;
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
            icon: <SiWhatsapp size={16} />,
            color: '#25D366',
        },
        {
            label: 'Pinterest',
            href: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}${imgUrl ? `&media=${encodeURIComponent(imgUrl)}` : ''}`,
            icon: <SiPinterest size={16} />,
            color: '#E60023',
        },
        {
            label: 'Facebook',
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
            icon: <SiFacebook size={16} />,
            color: '#1877F2',
        },
        {
            label: 'X',
            href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
            icon: <SiX size={16} />,
            color: '#000000',
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
                    gap: '2',
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
