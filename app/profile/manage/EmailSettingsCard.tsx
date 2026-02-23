'use client';

import { css } from 'styled-system/css';

export function EmailSettingsCard() {
    return (
        <div
            className={css({
                background: 'surface.elevated',
                borderRadius: '2xl',
                padding: '6',
                boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
            })}
        >
            <h3
                className={css({
                    fontSize: 'lg',
                    fontWeight: '700',
                    color: 'text',
                    mb: '4',
                })}
            >
                E-Mail-Einstellungen
            </h3>
            <div
                className={css({
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3',
                })}
            >
                <label
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4',
                        borderRadius: 'xl',
                        border: '1px solid',
                        borderColor: 'rgba(224,123,83,0.2)',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                        _hover: {
                            borderColor: '#e07b53',
                            background: 'rgba(224,123,83,0.03)',
                        },
                    })}
                >
                    <div>
                        <p
                            className={css({
                                fontSize: 'sm',
                                fontWeight: '600',
                            })}
                        >
                            Neue Rezepte von anderen Kochbegeisterten
                        </p>
                    </div>
                    <input
                        type="checkbox"
                        defaultChecked
                        className={css({
                            width: '20px',
                            height: '20px',
                            accentColor: '#e07b53',
                        })}
                    />
                </label>

                <label
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4',
                        borderRadius: 'xl',
                        border: '1px solid',
                        borderColor: 'rgba(224,123,83,0.2)',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                        _hover: {
                            borderColor: '#e07b53',
                            background: 'rgba(224,123,83,0.03)',
                        },
                    })}
                >
                    <div>
                        <p
                            className={css({
                                fontSize: 'sm',
                                fontWeight: '600',
                            })}
                        >
                            Wöchentlicher Koch-Newsletter
                        </p>
                    </div>
                    <input
                        type="checkbox"
                        defaultChecked
                        className={css({
                            width: '20px',
                            height: '20px',
                            accentColor: '#e07b53',
                        })}
                    />
                </label>

                <label
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4',
                        borderRadius: 'xl',
                        border: '1px solid',
                        borderColor: 'rgba(224,123,83,0.2)',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                        _hover: {
                            borderColor: '#e07b53',
                            background: 'rgba(224,123,83,0.03)',
                        },
                    })}
                >
                    <div>
                        <p
                            className={css({
                                fontSize: 'sm',
                                fontWeight: '600',
                            })}
                        >
                            Erinnerungen an geplante Mahlzeiten
                        </p>
                    </div>
                    <input
                        type="checkbox"
                        className={css({
                            width: '20px',
                            height: '20px',
                            accentColor: '#e07b53',
                        })}
                    />
                </label>
            </div>
        </div>
    );
}
