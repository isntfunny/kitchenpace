import type { ReactNode } from 'react';

import { css } from 'styled-system/css';

import { articleProseClass } from './shared';

interface InlineLayoutProps {
    mdxContent: ReactNode;
}

export function InlineLayout({ mdxContent }: InlineLayoutProps) {
    return (
        <div className={css({ maxW: '768px', mx: 'auto', px: '4', py: '8' })}>
            <article className={articleProseClass}>{mdxContent}</article>
        </div>
    );
}
