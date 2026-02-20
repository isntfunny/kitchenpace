'use client';

import {
    DashboardQuickActions,
    DashboardRecentRecipes,
    DashboardShoppingList,
    DashboardStats,
    DashboardToday,
    DashboardWelcome,
} from '@/components/dashboard';
import { Header } from '@/components/features/Header';
import { css } from 'styled-system/css';
import { grid } from 'styled-system/patterns';

const statsData = [
    {
        id: '1',
        label: 'Erstellte Rezepte',
        value: 24,
        icon: '📝',
        change: '+3',
        changeType: 'positive' as const,
        color: '#e07b53',
    },
    {
        id: '2',
        label: 'Favoriten',
        value: 156,
        icon: '❤️',
        change: '+12',
        changeType: 'positive' as const,
        color: '#fd79a8',
    },
    {
        id: '3',
        label: 'Gekochte Gerichte',
        value: 89,
        icon: '🍳',
        change: '+5',
        changeType: 'positive' as const,
        color: '#00b894',
    },
    {
        id: '4',
        label: 'Streak Tage',
        value: 12,
        icon: '🔥',
        change: '2 Tage',
        changeType: 'neutral' as const,
        color: '#f8b500',
    },
];

const quickActionsData = [
    {
        id: '1',
        label: 'Neues Rezept',
        icon: '➕',
        description: 'Rezept erstellen',
        color: '#e07b53',
        href: '/recipe/new',
    },
    {
        id: '2',
        label: 'Suchen',
        icon: '🔍',
        description: 'Rezepte finden',
        color: '#74b9ff',
        href: '/search',
    },
    {
        id: '3',
        label: 'Einkaufen',
        icon: '🛒',
        description: 'Einkaufsliste',
        color: '#00b894',
        href: '/shopping',
    },
    {
        id: '4',
        label: 'Planen',
        icon: '📅',
        description: 'Meal Plan',
        color: '#a29bfe',
        href: '/plan',
    },
    {
        id: '5',
        label: 'Favoriten',
        icon: '❤️',
        description: 'Gespeicherte',
        color: '#fd79a8',
        href: '/favorites',
    },
    {
        id: '6',
        label: 'Entdecken',
        icon: '✨',
        description: 'Inspiration',
        color: '#f8b500',
        href: '/discover',
    },
];

const todayData = [
    {
        id: '1',
        time: '12:00',
        title: 'Vorbereitung',
        description: 'Gemüse schneiden, Zwiebeln würfeln',
        status: 'completed' as const,
        lane: 'Vorbereitung',
        duration: '15 Min.',
    },
    {
        id: '2',
        time: '12:15',
        title: 'Zwiebeln anschwitzen',
        description: 'In Olivenöl golden dünsten',
        status: 'completed' as const,
        lane: 'Kochen',
        duration: '5 Min.',
    },
    {
        id: '3',
        time: '12:20',
        title: 'Reis hinzufügen',
        description: 'Kurz anrösten, dann Brühe zugießen',
        status: 'in_progress' as const,
        lane: 'Kochen',
        duration: '20 Min.',
    },
    {
        id: '4',
        time: '12:40',
        title: 'Gemüse zugeben',
        description: 'Paprika, Erbsen, Möhren',
        status: 'pending' as const,
        lane: 'Kochen',
        duration: '10 Min.',
    },
    {
        id: '5',
        time: '12:50',
        title: 'Servieren',
        description: 'Mit frischem Petersilie garnieren',
        status: 'pending' as const,
        lane: 'Servieren',
        duration: '5 Min.',
    },
];

const shoppingData = [
    {
        id: '1',
        name: 'Jasminreis',
        quantity: '500g',
        category: 'Backen',
        checked: true,
        recipe: 'Gemüsepfanne',
    },
    {
        id: '2',
        name: 'Paprika rot',
        quantity: '2 Stück',
        category: 'Gemüse',
        checked: true,
        recipe: 'Gemüsepfanne',
    },
    {
        id: '3',
        name: 'Zwiebeln',
        quantity: '3 Stück',
        category: 'Gemüse',
        checked: true,
        recipe: 'Gemüsepfanne',
    },
    {
        id: '4',
        name: 'Erbsen (tiefgekühlt)',
        quantity: '200g',
        category: 'Gemüse',
        checked: false,
        recipe: 'Gemüsepfanne',
    },
    {
        id: '5',
        name: 'Möhren',
        quantity: '2 Stück',
        category: 'Gemüse',
        checked: false,
        recipe: 'Gemüsepfanne',
    },
    {
        id: '6',
        name: 'Gemüsebrühe',
        quantity: '1 Liter',
        category: 'Getränke',
        checked: false,
        recipe: 'Gemüsepfanne',
    },
    {
        id: '7',
        name: 'Olivenöl',
        quantity: '100ml',
        category: 'Sonstiges',
        checked: false,
        recipe: 'Gemüsepfanne',
    },
    {
        id: '8',
        name: 'Petersilie',
        quantity: '1 Bund',
        category: 'Gemüse',
        checked: false,
        recipe: 'Gemüsepfanne',
    },
];

const recentRecipesData = [
    {
        id: '1',
        title: 'Mediterranes Gemüsepfanne',
        image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&q=80',
        rating: 4.8,
        time: '45 Min.',
        category: 'Hauptgericht',
        status: 'planned' as const,
    },
    {
        id: '2',
        title: 'Klassisches Carbonara',
        image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400&q=80',
        rating: 4.9,
        time: '25 Min.',
        category: 'Hauptgericht',
        status: 'cooked' as const,
    },
    {
        id: '3',
        title: 'Thailändischer Gurkensalat',
        image: 'https://images.unsplash.com/photo-1511690656952-34342d5c2895?w=400&q=80',
        rating: 4.6,
        time: '15 Min.',
        category: 'Vorspeise',
        status: 'favorite' as const,
    },
    {
        id: '4',
        title: 'Schokoladen Mousse',
        image: 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=400&q=80',
        rating: 4.9,
        time: '20 Min.',
        category: 'Dessert',
        status: 'cooked' as const,
    },
    {
        id: '5',
        title: 'Avocado Toast',
        image: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=400&q=80',
        rating: 4.7,
        time: '10 Min.',
        category: 'Frühstück',
        status: 'favorite' as const,
    },
    {
        id: '6',
        title: 'Griechischer Salat',
        image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80',
        rating: 4.8,
        time: '15 Min.',
        category: 'Vorspeise',
        status: 'cooked' as const,
    },
];

export default function Home() {
    return (
        <div
            className={css({
                minH: '100vh',
                color: 'text',
                bg: '#fafafa',
            })}
        >
            <Header />

            <main
                className={css({
                    maxW: '1400px',
                    mx: 'auto',
                    px: { base: '4', md: '6' },
                    py: { base: '4', md: '6' },
                })}
            >
                <div
                    className={css({
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6',
                    })}
                >
                    <DashboardWelcome userName="Alex" />

                    <DashboardStats stats={statsData} />

                    <DashboardQuickActions actions={quickActionsData} />

                    <div
                        className={grid({
                            columns: { base: 1, lg: 12 },
                            gap: '6',
                        })}
                    >
                        <div
                            className={css({
                                lg: { gridColumn: 'span 8' },
                            })}
                        >
                            <DashboardToday items={todayData} />

                            <div
                                className={css({
                                    marginTop: '6',
                                })}
                            >
                                <DashboardRecentRecipes recipes={recentRecipesData} />
                            </div>
                        </div>

                        <div
                            className={css({
                                lg: { gridColumn: 'span 4' },
                            })}
                        >
                            <DashboardShoppingList items={shoppingData} />

                            <div
                                className={css({
                                    marginTop: '6',
                                    background: 'white',
                                    borderRadius: '2xl',
                                    padding: '6',
                                    border: '1px solid',
                                    borderColor: 'rgba(0,0,0,0.06)',
                                })}
                            >
                                <h3
                                    className={css({
                                        fontSize: 'xl',
                                        fontWeight: '700',
                                        color: 'text',
                                        mb: '4',
                                    })}
                                >
                                    Diese Woche 🍽️
                                </h3>
                                <div
                                    className={css({
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '3',
                                    })}
                                >
                                    {[
                                        'Montag',
                                        'Dienstag',
                                        'Mittwoch',
                                        'Donnerstag',
                                        'Freitag',
                                        'Samstag',
                                        'Sonntag',
                                    ].map((day, index) => (
                                        <div
                                            key={day}
                                            className={css({
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '3',
                                                borderRadius: 'lg',
                                                background:
                                                    index === new Date().getDay() - 1
                                                        ? 'rgba(224,123,83,0.1)'
                                                        : 'transparent',
                                                border:
                                                    index === new Date().getDay() - 1
                                                        ? '1px solid'
                                                        : 'none',
                                                borderColor: 'rgba(224,123,83,0.2)',
                                            })}
                                        >
                                            <span
                                                className={css({
                                                    fontSize: 'sm',
                                                    fontWeight:
                                                        index === new Date().getDay() - 1
                                                            ? '600'
                                                            : '400',
                                                    color:
                                                        index === new Date().getDay() - 1
                                                            ? 'primary'
                                                            : 'text-muted',
                                                })}
                                            >
                                                {day}
                                            </span>
                                            <span
                                                className={css({
                                                    fontSize: 'sm',
                                                    color: 'text',
                                                })}
                                            >
                                                {index < recentRecipesData.length
                                                    ? recentRecipesData[index].title
                                                    : '—'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    className={css({
                                        width: '100%',
                                        marginTop: '4',
                                        padding: '3',
                                        fontSize: 'sm',
                                        fontWeight: '600',
                                        color: 'primary',
                                        background: 'transparent',
                                        border: '1px dashed',
                                        borderColor: 'rgba(224,123,83,0.3)',
                                        borderRadius: 'xl',
                                        cursor: 'pointer',
                                        _hover: {
                                            background: 'rgba(224,123,83,0.05)',
                                        },
                                    })}
                                >
                                    Woche planen →
                                </button>
                            </div>

                            <div
                                className={css({
                                    marginTop: '6',
                                    background: 'linear-gradient(135deg, #e07b53 0%, #f8b500 100%)',
                                    borderRadius: '2xl',
                                    padding: '6',
                                    color: 'white',
                                })}
                            >
                                <h3
                                    className={css({
                                        fontSize: 'lg',
                                        fontWeight: '700',
                                        mb: '2',
                                    })}
                                >
                                    Probiere etwas Neues! 🎯
                                </h3>
                                <p
                                    className={css({
                                        fontSize: 'sm',
                                        opacity: 0.9,
                                        mb: '4',
                                    })}
                                >
                                    Entdecke neue Rezepte basierend auf deinen Favoriten.
                                </p>
                                <button
                                    className={css({
                                        padding: '2.5 5',
                                        fontSize: 'sm',
                                        fontWeight: '600',
                                        color: '#e07b53',
                                        background: 'white',
                                        border: 'none',
                                        borderRadius: 'lg',
                                        cursor: 'pointer',
                                        _hover: {
                                            transform: 'translateY(-2px)',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                        },
                                        transition: 'all 200ms ease',
                                    })}
                                >
                                    Entdecken
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <footer
                className={css({
                    py: '8',
                    mt: '8',
                    textAlign: 'center',
                    fontFamily: 'body',
                    fontSize: 'sm',
                    color: 'text-muted',
                    bg: 'white',
                    borderTop: '1px solid',
                    borderColor: 'rgba(0,0,0,0.06)',
                })}
            >
                <div
                    className={css({
                        maxWidth: '600px',
                        margin: '0 auto',
                        padding: '0 4',
                    })}
                >
                    <div
                        className={css({
                            fontWeight: '600',
                            color: 'text',
                            marginBottom: '2',
                        })}
                    >
                        KüchenTakt
                    </div>
                    <div>© 2026 KüchenTakt · Kochen mit System</div>
                </div>
            </footer>
        </div>
    );
}
