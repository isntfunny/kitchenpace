import { css } from 'styled-system/css';

export const articleProseClass = css({
    fontSize: 'base',
    lineHeight: '1.8',
    '& h1': { fontSize: '2xl', fontWeight: 'bold', mb: '4' },
    '& h2': { fontSize: 'xl', fontWeight: 'bold', mt: '6', mb: '3' },
    '& p': { mb: '4' },
});
