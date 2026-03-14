export async function parseDeviceLabel(userAgent: string | null): Promise<string> {
    if (!userAgent) return 'Unbekanntes Gerät';

    const UAParser = (await import('ua-parser-js')).default;
    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser().name ?? 'Unbekannter Browser';
    const os = parser.getOS().name ?? '';

    return os ? `${browser} auf ${os}` : browser;
}

export async function getRequestMetadata(): Promise<{
    userAgent: string | null;
    deviceLabel: string;
    ipAddress: string | null;
}> {
    const { headers } = await import('next/headers');
    const headersList = await headers();
    const userAgent = headersList.get('user-agent');
    const ipAddress =
        headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        headersList.get('x-real-ip') ??
        null;

    return {
        userAgent,
        deviceLabel: await parseDeviceLabel(userAgent),
        ipAddress,
    };
}
