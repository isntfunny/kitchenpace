interface OnboardingArrowProps {
    placement: string;
}

export function OnboardingArrow({ placement }: OnboardingArrowProps) {
    const getPositionStyles = () => {
        switch (placement) {
            case 'right-start':
            case 'right':
            case 'right-end':
                return { left: '-8px', top: '20px' };
            case 'left-start':
            case 'left':
            case 'left-end':
                return { right: '-8px', top: '20px' };
            case 'bottom-start':
            case 'bottom':
            case 'bottom-end':
                return { top: '-8px', left: '20px' };
            case 'top-start':
            case 'top':
            case 'top-end':
                return { bottom: '-8px', left: '20px' };
            default:
                return { left: '-8px', top: '20px' };
        }
    };

    const getRotation = () => {
        switch (placement) {
            case 'right-start':
            case 'right':
            case 'right-end':
                return 'rotate(45deg)';
            case 'left-start':
            case 'left':
            case 'left-end':
                return 'rotate(-135deg)';
            case 'bottom-start':
            case 'bottom':
            case 'bottom-end':
                return 'rotate(-45deg)';
            case 'top-start':
            case 'top':
            case 'top-end':
                return 'rotate(135deg)';
            default:
                return 'rotate(45deg)';
        }
    };

    return (
        <div
            style={{
                position: 'absolute',
                width: '16px',
                height: '16px',
                backgroundColor: 'var(--colors-surface)',
                transform: getRotation(),
                border: '1px solid rgba(224, 123, 83, 0.3)',
                ...getPositionStyles(),
            }}
        />
    );
}
