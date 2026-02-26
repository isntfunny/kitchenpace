import { ChefHat } from 'lucide-react';
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'KüchenTakt - Deine Rezepte im Takt';
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
    return new ImageResponse(
        (
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
                        fontSize: 100,
                        marginBottom: 20,
                        color: '#f05454',
                    }}
                >
                    <ChefHat size={120} />
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
            </div>
        ),
        {
            ...size,
        },
    );
}
