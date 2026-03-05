/**
 * Cooking Icons Component
 *
 * Diese Komponente mapped Node-Typen zu ihren entsprechenden Icons.
 * Icons können von Flaticon heruntergeladen und in public/icons/cooking/ gespeichert werden.
 *
 * Zum Integrieren neuer Icons:
 * 1. SVG von Flaticon herunterladen
 * 2. In public/icons/cooking/ speichern
 * 3. Icon-Pfad unten unter COOKING_ICONS aktualisieren
 */

export const COOKING_NODE_TYPES = {
    SCHNEIDEN: 'cut',
    KOCHEN: 'cook',
    BRATEN: 'fry',
    BACKEN: 'bake',
    MIXEN: 'mix',
    WARTEN: 'wait',
    WÜRZEN: 'season',
    ANRICHTEN: 'serve',
    KALT_STELLEN: 'chill',
    WIEGEN: 'weigh',
    RÜHREN: 'stir',
} as const;

export const COOKING_ICONS: Record<string, { label: string; url: string; flaticon_id: string }> = {
    cut: {
        label: 'Schneiden',
        url: '/icons/cooking/fleischermesser.svg',
        flaticon_id: '17690288',
    },
    cook: {
        label: 'Kochen',
        url: '/icons/cooking/kochtopf.svg',
        flaticon_id: '17690325',
    },
    fry: {
        label: 'Braten',
        url: '/icons/cooking/bratpfanne.svg',
        flaticon_id: '17690152',
    },
    bake: {
        label: 'Backen',
        url: '/icons/cooking/herd.svg',
        flaticon_id: '5045458',
    },
    mix: {
        label: 'Mixen',
        url: '/icons/cooking/mixer.svg',
        flaticon_id: '5045245',
    },
    wait: {
        label: 'Warten',
        url: '/icons/cooking/uhr.svg',
        flaticon_id: '5045247',
    },
    season: {
        label: 'Würzen',
        url: '/icons/cooking/reibe.svg',
        flaticon_id: '17690228',
    },
    serve: {
        label: 'Anrichten',
        url: '/icons/cooking/platte.svg',
        flaticon_id: '17690166',
    },
    chill: {
        label: 'Kalt stellen',
        url: '/icons/cooking/kuhlschrank.svg',
        flaticon_id: '5045372',
    },
    weigh: {
        label: 'Wiegen',
        url: '/icons/cooking/kuchenwaage.svg',
        flaticon_id: '5045407',
    },
    stir: {
        label: 'Rühren',
        url: '/icons/cooking/ruhrgerat.svg',
        flaticon_id: '5045338',
    },
};

interface CookingIconProps {
    type: string;
    size?: number;
    className?: string;
}

/**
 * CookingIcon Component
 * Rendert SVG-Icons aus dem /public/icons/cooking/ Ordner
 * Falls Icon nicht vorhanden, fallback zu Placeholder
 */
export function CookingIcon({ type, size = 22, className = '' }: CookingIconProps) {
    const icon = COOKING_ICONS[type];

    if (!icon) {
        return <div style={{ width: size, height: size, backgroundColor: '#ccc' }} />;
    }

    return (
        <img
            src={icon.url}
            alt={icon.label}
            width={size}
            height={size}
            className={className}
            style={{ display: 'inline-block' }}
            onError={(e) => {
                // Fallback wenn Icon nicht geladen werden kann
                const img = e.target as HTMLImageElement;
                img.style.display = 'none';
            }}
        />
    );
}

/**
 * Hook für Icon-Label
 */
export function getCookingIconLabel(type: string): string {
    return COOKING_ICONS[type]?.label || type;
}

/**
 * Hook für Icon-URL
 */
export function getCookingIconUrl(type: string): string {
    return COOKING_ICONS[type]?.url || '';
}
