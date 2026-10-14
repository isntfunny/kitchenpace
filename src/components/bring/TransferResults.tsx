import { Check, CircleAlert, Minus } from 'lucide-react';
import Link from 'next/link';

import { Text } from '@app/components/atoms/Typography';
import type { TransferOutcome } from '@app/lib/bring/types';

import { css } from 'styled-system/css';

import { link, row, stack } from './styles';

export function TransferResults({ outcomes }: { outcomes: TransferOutcome[] }) {
    if (!outcomes.length) return null;
    return (
        <div
            role="status"
            className={`${stack} ${css({ p: '4', borderRadius: 'xl', bg: 'surface.muted' })}`}
        >
            <Text size="sm">
                {outcomes.filter((item) => item.status === 'added').length} hinzugefügt ·{' '}
                {outcomes.filter((item) => item.status === 'existing').length} bereits vorhanden ·{' '}
                {outcomes.filter((item) => item.status === 'failed').length} offen
            </Text>
            <ul
                className={css({
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2',
                    fontSize: 'sm',
                })}
            >
                {outcomes.map((item) => {
                    const Icon =
                        item.status === 'added'
                            ? Check
                            : item.status === 'existing'
                              ? Minus
                              : CircleAlert;
                    return (
                        <li key={item.id} className={row}>
                            <Icon
                                size={18}
                                aria-hidden
                                className={css({
                                    flexShrink: 0,
                                    color:
                                        item.status === 'failed' ? 'status.danger' : 'text-muted',
                                })}
                            />
                            <span className={css({ flex: 1, minW: 0, overflowWrap: 'anywhere' })}>
                                {item.name}:{' '}
                                {item.status === 'added'
                                    ? 'hinzugefügt'
                                    : item.status === 'existing'
                                      ? 'bereits vorhanden, Menge beibehalten'
                                      : 'nicht bestätigt — bitte erneut versuchen'}
                            </span>
                        </li>
                    );
                })}
            </ul>
            <Link className={link} href="/shopping-list">
                Liste ansehen und Mengen bearbeiten
            </Link>
        </div>
    );
}
