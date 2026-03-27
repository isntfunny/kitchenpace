import type { ReactNode } from 'react';

import { css } from 'styled-system/css';

import { articleProseClass } from './shared';

interface InlineLayoutProps {
    mdxContent: ReactNode;
}

export function InlineLayout({ mdxContent }: InlineLayoutProps) {
    return (
        <div className={css({ maxW: '1200px', mx: 'auto', px: '4', py: '8', width: '100%' })}>
            <article className={articleProseClass}>{mdxContent}</article>
        </div>
    );
}
