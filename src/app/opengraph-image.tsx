import { ChefHat } from 'lucide';
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

type IconNode = [string, Record<string, string>][];

export const alt = 'KüchenTakt - Deine Rezepte im Takt';
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
    return new ImageResponse(
        <div
            style={{
                background: 'linear-gradient(135deg, #f8f5f0 0%, #e8e2d9 100%)',
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'system-ui',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    marginBottom: 20,
                    color: '#f05454',
                }}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="120"
                    height="120"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    {(ChefHat as unknown as IconNode)
                        .filter(([tag]) => tag === 'path')
                        .map(([, attrs], i) => <path key={i} d={attrs.d} />)}
                </svg>
            </div>
            <div
                style={{
                    fontSize: 64,
                    fontWeight: 800,
                    color: '#2d3436',
                    marginBottom: 16,
                    textAlign: 'center',
                }}
            >
                KüchenTakt
            </div>
            <div
                style={{
                    fontSize: 28,
                    color: '#636e72',
                    textAlign: 'center',
                }}
            >
                Deine Rezepte im Takt
            </div>
        </div>,
        {
            ...size,
        },
    );
}
