'use client';

import { Check } from 'lucide-react';
import { Checkbox } from 'radix-ui';

import { css } from 'styled-system/css';

interface CheckboxItemProps {
    label: string;
    defaultChecked?: boolean;
}

function CheckboxItem({ label, defaultChecked = false }: CheckboxItemProps) {
    return (
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
            <p
                className={css({
                    fontSize: 'sm',
                    fontWeight: '600',
                })}
            >
                {label}
            </p>
            <Checkbox.Root
                defaultChecked={defaultChecked}
                className={css({
                    width: '20px',
                    height: '20px',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    border: '2px solid',
                    borderColor: 'rgba(224,123,83,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    _hover: {
                        borderColor: '#e07b53',
                    },
                    '&[data-state="checked"]': {
                        backgroundColor: '#e07b53',
                        borderColor: '#e07b53',
                    },
                })}
            >
                <Checkbox.Indicator>
                    <Check color="white" size={14} />
                </Checkbox.Indicator>
            </Checkbox.Root>
        </label>
    );
}

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
                <CheckboxItem label="Neue Rezepte von anderen Kochbegeisterten" defaultChecked />
                <CheckboxItem label="Wöchentlicher Koch-Newsletter" defaultChecked />
                <CheckboxItem label="Erinnerungen an geplante Mahlzeiten" />
            </div>
        </div>
    );
}
