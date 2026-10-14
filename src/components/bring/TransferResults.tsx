import Link from 'next/link';

import type { TransferOutcome } from '@app/lib/bring/types';

export function TransferResults({ outcomes }: { outcomes: TransferOutcome[] }) {
    return (
        <>
            {' '}
            {outcomes.length > 0 && (
                <div role="status">
                    <p>
                        {outcomes.filter((item) => item.status === 'added').length} hinzugefügt ·{' '}
                        {outcomes.filter((item) => item.status === 'existing').length} bereits
                        vorhanden · {outcomes.filter((item) => item.status === 'failed').length}{' '}
                        offen
                    </p>
                    <ul>
                        {outcomes.map((item) => (
                            <li key={item.id}>
                                {item.name}:{' '}
                                {item.status === 'added'
                                    ? 'hinzugefügt'
                                    : item.status === 'existing'
                                      ? 'bereits vorhanden, Menge beibehalten'
                                      : 'nicht bestätigt — bitte erneut versuchen'}
                            </li>
                        ))}
                    </ul>
                    <Link href="/shopping-list">Liste ansehen und Mengen bearbeiten</Link>
                </div>
            )}
        </>
    );
}
