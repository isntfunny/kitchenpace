'use client';

import { Check, Mail } from 'lucide-react';
import { Checkbox } from 'radix-ui';

import { Heading, Text } from '@/components/atoms/Typography';
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
                p: '3',
                borderRadius: 'xl',
                border: '1px solid',
                borderColor: 'border',
                bg: 'background',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                _hover: {
                    borderColor: 'primary',
                },
            })}
        >
            <Text size="sm" className={css({ fontWeight: '500' })}>
                {label}
            </Text>
            <Checkbox.Root
                defaultChecked={defaultChecked}
                className={css({
                    width: '20px',
                    height: '20px',
                    bg: 'background',
                    borderRadius: '6px',
                    border: '2px solid',
                    borderColor: 'border',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    _hover: {
                        borderColor: 'primary',
                    },
                    '&[data-state="checked"]': {
                        bg: 'primary',
                        borderColor: 'primary',
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
                p: { base: '4', md: '5' },
                borderRadius: '2xl',
                bg: 'surface',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            })}
        >
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3',
                    mb: '4',
                })}
            >
                <div
                    className={css({
                        w: '10',
                        h: '10',
                        borderRadius: 'lg',
                        bg: 'secondary',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                    })}
                >
                    <Mail size={20} />
                </div>
                <Heading as="h2" size="lg">
                    E-Mail-Einstellungen
                </Heading>
            </div>

            <div
                className={css({
                    display: 'flex',
                    flexDir: 'column',
                    gap: '2',
                })}
            >
                <CheckboxItem label="Neue Rezepte von anderen Kochbegeisterten" defaultChecked />
                <CheckboxItem label="Wöchentlicher Koch-Newsletter" defaultChecked />
                <CheckboxItem label="Erinnerungen an geplante Mahlzeiten" />
            </div>
        </div>
    );
}
