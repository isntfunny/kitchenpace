import 'server-only';

import { UAParser } from 'ua-parser-js';

export function parseDeviceLabel(userAgent: string | null): string {
    if (!userAgent) return 'Unbekanntes Gerät';

    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser().name ?? 'Unbekannter Browser';
    const os = parser.getOS().name ?? '';

    return os ? `${browser} auf ${os}` : browser;
}
