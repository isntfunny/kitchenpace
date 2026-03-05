import { ChefHat, Edit3, Settings, User } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { fetchUserDraftRecipes, fetchUserRecipes, fetchUserStats } from '@app/app/actions/user';
import { Button } from '@app/components/atoms/Button';
import { SmartImage } from '@app/components/atoms/SmartImage';
import { Heading, Text } from '@app/components/atoms/Typography';
import SignOutButton from '@app/components/auth/SignOutButton';
import {
    DashboardQuickActions,
    DashboardRecentRecipes,
    DashboardShoppingList,
    DashboardStats,
    DashboardToday,
    DashboardWelcome,
} from '@app/components/dashboard';
import { PageShell } from '@app/components/layouts/PageShell';
import { getServerAuthSession, logMissingSession } from '@app/lib/auth';
import { getOrCreateProfile } from '@app/lib/profile';
import { css } from 'styled-system/css';
import { grid } from 'styled-system/patterns';

const TODAY_TIMELINE = [
    {
        id: 'mise-en-place',
        time: '08:00',
        title: 'Mise en Place vorbereiten',
        description: 'Gemüse putzen, Kräuter schneiden und Mise en Place bereitlegen.',
        status: 'in_progress' as const,
        lane: 'vorbereitung',
        duration: '15 min',
    },
    {
        id: 'simmer',
        time: '08:30',
        title: 'Aromatische Basis köcheln lassen',
        description: 'Fond reduzieren und mit Gewürzen abstimmen.',
        status: 'pending' as const,
        lane: 'kochen',
        duration: '30 min',
    },
    {
        id: 'backofen',
        time: '09:10',
        title: 'Ofen aufheizen & backen',
        description: 'Sobald die Sauce fertig ist, Eintopf überbacken.',
        status: 'pending' as const,
        lane: 'backen',
        duration: '20 min',
    },
    {
        id: 'anrichten',
        time: '09:45',
        title: 'Anrichten & Servieren',
        description: 'Finale Würze, Kräuter und Teller füllen.',
        status: 'pending' as const,
        lane: 'servieren',
        duration: '10 min',
    },
];

const SHOPPING_LIST_ITEMS = [
    { id: '1', name: 'Rote Paprika', quantity: '3 Stück', category: 'Gemüse', checked: false },
    { id: '2', name: 'Frischer Thymian', quantity: '2 Bund', category: 'Gemüse', checked: false },
    { id: '3', name: 'Olivenöl', quantity: '500 ml', category: 'Gewürze', checked: true },
    { id: '4', name: 'Rinderfond', quantity: '1 l', category: 'Sonstiges', checked: false },
    { id: '5', name: 'Zitronen', quantity: '2 Stück', category: 'Obst', checked: false },
    { id: '6', name: 'Feta', quantity: '200 g', category: 'Milchprodukte', checked: true },
];

export const metadata: Metadata = {
    title: 'Mein Profil',
    description:
        'Dein persönliches KüchenTakt Profil inklusive Insights, Schnellaktionen und Kontoeinstellungen.',
};

export const dynamic = 'force-dynamic';

const RecipeCategories = ['Hauptgericht', 'Beilage', 'Dessert', 'Getränk'];
const RecipeStatuses: Array<'cooked' | 'favorite' | 'planned' | 'new'> = [
    'cooked',
    'favorite',
    'planned',
    'new',
];
const RecipeTimes = ['25 min', '35 min', '45 min', '55 min', '30 min', '40 min'];

const ProfilePage = async () => {
    const session = await getServerAuthSession('profile/page');

    if (!session?.user?.id) {
        logMissingSession(session, 'profile/page');
        redirect('/auth/signin');
    }

    const profile = await getOrCreateProfile(session.user.id, session.user.email ?? '');

    if (!profile) {
        redirect('/auth/signin');
    }

    const stats = await fetchUserStats(session.user.id);
    const draftRecipes = await fetchUserDraftRecipes(session.user.id);
    const userRecipes = await fetchUserRecipes(session.user.id);

    const quickActions = [
        {
            id: 'new-recipe',
            label: 'Neues Rezept',
            description: 'Starte einen frischen Entwurf.',
            icon: '🧾',
            color: '#e07b53',
            href: '/recipe/create',
        },
        {
            id: 'drafts',
            label: 'Entwürfe verwalten',
            description: `${stats.draftCount} offene Entwürfe`,
            icon: '✍️',
            color: '#6c5ce7',
            href: '/my-recipes',
        },
        {
            id: 'favorites',
            label: 'Favoriten entdecken',
            description: `${stats.favoriteCount} gespeicherte Rezepte`,
            icon: '💛',
            color: '#fd79a8',
            href: '/favorites',
        },
        {
            id: 'cook-history',
            label: 'Kochhistorie',
            description: `${stats.cookedCount} Sessions`,
            icon: '🔥',
            color: '#00b894',
            href: '/my-recipes',
        },
    ];

    const dashboardStats = [
        {
            id: 'recipes',
            label: 'Rezepte veröffentlicht',
            value: stats.recipeCount,
            icon: '📄',
            change: '+6 % im letzten Monat',
            changeType: 'positive' as const,
            color: '#e07b53',
        },
        {
            id: 'drafts',
            label: 'Entwürfe',
            value: stats.draftCount,
            icon: '✏️',
            change: '0 neue',
            changeType: 'neutral' as const,
            color: '#6c5ce7',
        },
        {
            id: 'favorites',
            label: 'Favoriten',
            value: stats.favoriteCount,
            icon: '💛',
            change: '+2 neue',
            changeType: 'positive' as const,
            color: '#fd79a8',
        },
        {
            id: 'cooked',
            label: 'Gekochte Gerichte',
            value: stats.cookedCount,
            icon: '🍳',
            change: '+1 heute',
            changeType: 'positive' as const,
            color: '#00b894',
        },
        {
            id: 'ratings',
            label: 'Bewertungen',
            value: stats.ratingCount,
            icon: '⭐',
            change: '+3 Sterne',
            changeType: 'positive' as const,
            color: '#f8b500',
        },
    ];

    const publishedRecipes = userRecipes.filter((recipe) => recipe.status === 'PUBLISHED');
    const recipeSource = publishedRecipes.length > 0 ? publishedRecipes : userRecipes;
    const dashboardRecipes =
        recipeSource.length === 0
            ? [
                  {
                      id: 'no-recipe',
                      slug: 'placeholder',
                      title: 'Noch keine veröffentlichten Rezepte',
                      image: '/placeholder.jpg',
                      imageKey: null,
                      rating: 0,
                      time: '—',
                      category: 'Hauptgericht',
                      status: 'new' as const,
                  },
              ]
            : recipeSource.slice(0, 6).map((recipe, index) => ({
                  id: recipe.id,
                  slug: recipe.slug,
                  title: recipe.title,
                  image: null,
                  imageKey: recipe.imageKey ?? null,
                  rating: Math.min(5, Math.max(0, recipe.rating ?? 0)),
                  time: RecipeTimes[index % RecipeTimes.length],
                  category: RecipeCategories[index % RecipeCategories.length],
                  status: RecipeStatuses[index % RecipeStatuses.length],
              }));

    return (
        <PageShell>
            <div
                className={css({
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6',
                    paddingBottom: '12',
                })}
            >
                <section
                    className={css({
                        py: { base: '4', md: '6' },
                    })}
                >
                    <div
                        className={css({
                            mb: '6',
                        })}
                    >
                        <div
                            className={css({
                                p: { base: '4', md: '6' },
                                borderRadius: '2xl',
                                bg: 'surface',
                                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                            })}
                        >
                            <div
                                className={css({
                                    display: 'flex',
                                    flexDir: { base: 'column', sm: 'row' },
                                    gap: '6',
                                    alignItems: { base: 'center', sm: 'flex-start' },
                                })}
                            >
                                <div
                                    className={css({
                                        flexShrink: 0,
                                    })}
                                >
                                    {profile.photoUrl ? (
                                        <SmartImage
                                            src={profile.photoUrl}
                                            alt={profile.nickname ?? 'Profilfoto'}
                                            width={120}
                                            height={120}
                                            className={css({
                                                borderRadius: 'full',
                                                objectFit: 'cover',
                                                border: '4px solid',
                                                borderColor: 'surface.elevated',
                                                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                            })}
                                        />
                                    ) : (
                                        <div
                                            className={css({
                                                width: '120px',
                                                height: '120px',
                                                borderRadius: 'full',
                                                background: 'primary',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '3xl',
                                                fontWeight: '700',
                                                color: 'white',
                                                border: '4px solid',
                                                borderColor: 'surface.elevated',
                                                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                            })}
                                        >
                                            <ChefHat size={48} />
                                        </div>
                                    )}
                                </div>

                                <div
                                    className={css({
                                        flex: 1,
                                        textAlign: { base: 'center', sm: 'left' },
                                    })}
                                >
                                    <Text size="sm" color="muted" className={css({ mb: '1' })}>
                                        KüchenTakt Profil
                                    </Text>
                                    <Heading as="h1" size="xl" className={css({ mb: '2' })}>
                                        {profile.nickname ?? 'Neuer KüchenFan'}
                                    </Heading>
                                    <Text color="muted" className={css({ mb: '3', maxW: '50ch' })}>
                                        {profile.teaser ??
                                            'Lass andere wissen, was dich in der Küche begeistert.'}
                                    </Text>
                                    <div
                                        className={css({
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '2',
                                            justifyContent: { base: 'center', sm: 'flex-start' },
                                            fontSize: 'sm',
                                            color: 'text-muted',
                                        })}
                                    >
                                        <span>{session.user.email ?? '–'}</span>
                                    </div>
                                </div>

                                <div
                                    className={css({
                                        display: 'flex',
                                        flexDir: { base: 'row', sm: 'column' },
                                        gap: '2',
                                        alignItems: 'center',
                                    })}
                                >
                                    <Link href="/profile/edit">
                                        <Button variant="primary" size="sm">
                                            <Edit3 size={16} />
                                            Bearbeiten
                                        </Button>
                                    </Link>
                                    <SignOutButton label="Abmelden" />
                                    {profile.userId && (
                                        <Link href={`/user/${profile.userId}`}>
                                            <Button type="button" variant="ghost" size="sm">
                                                <User size={16} />
                                                Öffentliches Profil
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <DashboardWelcome
                    userName={profile.nickname ?? 'KüchenFan'}
                    userPhoto={profile.photoUrl ?? undefined}
                />

                <section
                    className={css({
                        marginTop: '4',
                    })}
                >
                    <div
                        className={grid({
                            columns: { base: 1, lg: 12 },
                            gap: '4',
                        })}
                    >
                        <div className={css({ lg: { gridColumn: 'span 8' } })}>
                            <div
                                className={css({
                                    marginBottom: '6',
                                    gap: '3',
                                    display: 'flex',
                                    flexDirection: 'column',
                                })}
                            >
                                <div>
                                    <Heading as="h2" size="lg" className={css({ mb: '1' })}>
                                        Schnellaktionen
                                    </Heading>
                                    <Text color="muted">
                                        Sprungmarken zu den wichtigsten Stationen deiner Kochreise.
                                    </Text>
                                </div>
                                <DashboardQuickActions actions={quickActions} />
                            </div>

                            <div
                                className={grid({
                                    columns: { base: 1, sm: 2 },
                                    gap: '4',
                                })}
                            >
                                <Link
                                    href="/profile/edit"
                                    className={css({
                                        p: '5',
                                        borderRadius: '2xl',
                                        bg: 'surface',
                                        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                                        textDecoration: 'none',
                                        color: 'inherit',
                                        transition: 'transform 180ms ease',
                                        display: 'flex',
                                        flexDir: 'column',
                                        gap: '3',
                                        _hover: { transform: 'translateY(-4px)' },
                                    })}
                                >
                                    <div
                                        className={css({
                                            w: '12',
                                            h: '12',
                                            borderRadius: 'xl',
                                            bg: 'primary',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                        })}
                                    >
                                        <Edit3 size={24} />
                                    </div>
                                    <div>
                                        <Heading as="h2" size="md" className={css({ mb: '1' })}>
                                            Profil bearbeiten
                                        </Heading>
                                        <Text size="sm" color="muted">
                                            Foto, Teaser oder Nickname aktualisieren.
                                        </Text>
                                    </div>
                                </Link>

                                <Link
                                    href="/profile/manage"
                                    className={css({
                                        p: '5',
                                        borderRadius: '2xl',
                                        bg: 'surface',
                                        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                                        textDecoration: 'none',
                                        color: 'inherit',
                                        transition: 'transform 180ms ease',
                                        display: 'flex',
                                        flexDir: 'column',
                                        gap: '3',
                                        _hover: { transform: 'translateY(-4px)' },
                                    })}
                                >
                                    <div
                                        className={css({
                                            w: '12',
                                            h: '12',
                                            borderRadius: 'xl',
                                            bg: 'secondary',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                        })}
                                    >
                                        <Settings size={24} />
                                    </div>
                                    <div>
                                        <Heading as="h2" size="md" className={css({ mb: '1' })}>
                                            Konto & Sicherheit
                                        </Heading>
                                        <Text size="sm" color="muted">
                                            Passwort, Notifications und Recovery-Optionen verwalten.
                                        </Text>
                                    </div>
                                </Link>
                            </div>

                            {draftRecipes.length > 0 && (
                                <div
                                    className={css({
                                        marginTop: '4',
                                        padding: { base: '4', md: '5' },
                                        borderRadius: '2xl',
                                        background: 'surface',
                                        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                                    })}
                                >
                                    <div
                                        className={css({
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            marginBottom: '4',
                                        })}
                                    >
                                        <Heading as="h2" size="lg">
                                            Meine Entwürfe
                                        </Heading>
                                        <span
                                            className={css({
                                                background: 'primary',
                                                color: 'white',
                                                borderRadius: 'full',
                                                paddingX: '3',
                                                paddingY: '1',
                                                fontSize: 'sm',
                                                fontWeight: '600',
                                            })}
                                        >
                                            {stats.draftCount}
                                        </span>
                                    </div>
                                    <div
                                        className={grid({
                                            columns: { base: 1, sm: 2, md: 3 },
                                            gap: '3',
                                        })}
                                    >
                                        {draftRecipes.map((draft) => (
                                            <Link
                                                key={draft.id}
                                                href={`/recipe/${draft.id}`}
                                                className={css({
                                                    padding: '4',
                                                    borderRadius: 'xl',
                                                    border: '1px solid',
                                                    borderColor: 'border',
                                                    background: 'background',
                                                    textDecoration: 'none',
                                                    color: 'inherit',
                                                    transition: 'all 150ms ease',
                                                    _hover: {
                                                        transform: 'translateY(-2px)',
                                                        borderColor: 'primary',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                                    },
                                                })}
                                            >
                                                <Text
                                                    className={css({
                                                        marginBottom: '1',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        fontWeight: '600',
                                                    })}
                                                >
                                                    {draft.title}
                                                </Text>
                                                <Text size="sm" color="muted">
                                                    Entwurf
                                                </Text>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div
                            className={css({
                                lg: { gridColumn: 'span 4' },
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4',
                            })}
                        >
                            <DashboardStats stats={dashboardStats} />
                            <DashboardToday items={TODAY_TIMELINE} />
                            <DashboardShoppingList items={SHOPPING_LIST_ITEMS} />
                        </div>
                    </div>
                </section>

                <div className={css({ marginTop: '6' })}>
                    <DashboardRecentRecipes recipes={dashboardRecipes} />
                </div>
            </div>
        </PageShell>
    );
};

export default ProfilePage;
