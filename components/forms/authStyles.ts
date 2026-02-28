import { css } from 'styled-system/css';

export const authFormStackClass = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '4',
});

export const authInputClass = css({
    display: 'block',
    width: '100%',
    marginTop: '1',
    padding: '3',
    borderRadius: 'xl',
    border: '1px solid',
    borderColor: 'border.muted',
    fontSize: 'md',
    background: 'surface',
    outline: 'none',
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
    _focus: {
        borderColor: 'accent',
        boxShadow: '0 0 0 4px rgba(224,123,83,0.18)',
    },
});

export function getAuthButtonClass(disabled?: boolean) {
    return css({
        marginTop: '2',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2',
        paddingX: '6',
        paddingY: '3',
        borderRadius: 'full',
        fontFamily: 'body',
        fontWeight: '600',
        fontSize: 'md',
        color: 'white',
        background: 'linear-gradient(135deg, #e07b53 0%, #f8b500 100%)',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.7 : 1,
        transition: 'transform 150ms ease, box-shadow 150ms ease',
        _hover: disabled
            ? {}
            : {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 10px 30px rgba(224,123,83,0.35)',
              },
    });
}
