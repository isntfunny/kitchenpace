// Named styles of the meal plan settings form (KUC-138).
import { fieldLabel, input } from '@app/components/atoms/recipes';

import { css, cx } from 'styled-system/css';

export const section = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '3',
    py: '4',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderColor: 'border.muted',
    _first: { borderTop: 0, pt: 0 },
});
export const legend = cx(fieldLabel, css({ mb: '2' }));
export const field = css({ display: 'flex', flexDirection: 'column', gap: '1.5', fontSize: 'sm' });
export const select = cx(input, css({ width: '100%' }));
export const timeInput = cx(input, css({ w: '120px' }));
export const hint = css({ fontSize: 'xs', color: 'foreground.muted' });
export const startSelf = css({ alignSelf: 'flex-start' });
