import { ChefHat, Edit3, Settings, User } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { fetchUserActivityFeedItems } from '@app/app/actions/community';
import {
    fetchUserCookHistory,
    fetchUserDraftRecipes,
    fetchUserLastFavorites,
    fetchUserStats,
    fetchUserTopRecipes,
    fetchUserViewHistory,
    type CookHistoryEntry,
    type DraftRecipe,
    type FavoriteEntry,
    type TopRecipeEntry,
    type ViewHistoryEntry,
} from '@app/app/actions/user';
import { Button } from '@app/components/atoms/Button';
import { SmartImage } from '@app/components/atoms/SmartImage';
import { Heading, Text } from '@app/components/atoms/Typography';
import { LiveUserActivityList } from '@app/components/features/LiveActivityFeed';
import { QuickLinksCard } from '@app/components/features/QuickLinksCard';
import { PageShell } from '@app/components/layouts/PageShell';
import { FadeInSection } from '@app/components/motion/FadeInSection';
import { getServerAuthSession, logMissingSession } from '@app/lib/auth';
import { PALETTE } from '@app/lib/palette';
import { getOrCreateProfile } from '@app/lib/profile';
import { css } from 'styled-system/css';
import { grid } from 'styled-system/patterns';

export const metadata: Metadata = {
    title: 'Mein Profil',
    description: 'Dein persönliches KüchenTakt Profil mit Aktivitäten, Rezepten und Einstellungen.',
};

export const dynamic = 'force-dynamic';

function formatTimeAgo(date: Date): string {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 2) return 'Gerade eben';
    if (minutes < 60) return `Vor ${minutes} Min.`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Vor ${hours} Std.`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `Vor ${days} Tag${days === 1 ? '' : 'en'}`;
    return new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
}

// ---- Shared card styles ----
const cardCss = css({
    p: { base: '4', md: '5' },
    borderRadius: '2xl',
    bg: 'surface',
    boxShadow: 'shadow.medium',
});

// ---- Recipe mini card ----
function RecipeMiniCard({
    id,
    title,
    slug,
    meta,
}: {
    id: string;
    title: string;
    slug: string;
    meta?: string;
}) {
    return (
        <Link
            href={`/recipe/${slug}`}
            className={css({
                display: 'block',
                textDecoration: 'none',
                color: 'inherit',
                bg: 'background',
                borderRadius: 'xl',
                border: '1px solid',
                borderColor: 'border',
                overflow: 'hidden',
                transition: 'all 160ms ease',
                _hover: {
                    borderColor: 'primary',
                    transform: 'translateY(-2px)',
                    boxShadow: 'shadow.medium',
                },
            })}
        >
            <div
                className={css({
                    position: 'relative',
                    aspectRatio: '3/2',
                    bg: 'surface.elevated',
                    overflow: 'hidden',
                })}
            >
                <SmartImage
                    recipeId={id}
                    alt={title}
                    fill
                    className={css({ objectFit: 'cover' })}
                />
            </div>
            <div className={css({ p: '3' })}>
                <p
                    className={css({
                        fontWeight: '600',
                        fontSize: 'sm',
                        lineClamp: '2',
                        lineHeight: '1.4',
                        mb: '1',
                    })}
                >
                    {title}
                </p>
                {meta && (
                    <p className={css({ fontSize: 'xs', color: 'text-muted' })}>{meta}</p>
                )}
            </div>
        </Link>
    );
}

// ---- Section header ----
function SectionHeader({
    title,
    count,
    href,
}: {
    title: string;
    count?: number;
    href?: string;
}) {
    return (
        <div
            className={css({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: '3',
            })}
        >
            <div className={css({ display: 'flex', alignItems: 'center', gap: '2' })}>
                <Heading as="h2" size="lg">
                    {title}
                </Heading>
                {count !== undefined && count > 0 && (
                    <span
                        className={css({
                            bg: 'primary',
                            color: 'white',
                            borderRadius: 'full',
                            px: '2',
                            py: '1',
                            fontSize: 'xs',
                            fontWeight: '700',
                        })}
                    >
                        {count}
                    </span>
                )}
            </div>
            {href && (
                <Link href={href} className={css({ textDecoration: 'none' })}>
                    <Button variant="ghost" size="sm">
                        Alle →
                    </Button>
                </Link>
            )}
        </div>
    );
}

// ---- Draft section ----
function DraftSection({ drafts }: { drafts: DraftRecipe[] }) {
    if (drafts.length === 0) return null;
    return (
        <section>
            <SectionHeader title="Aktuelle Entwürfe" count={drafts.length} href="/profile/recipes" />
            <div
                className={grid({
                    columns: { base: 2, sm: 3, md: 4 },
                    gap: '3',
                })}
            >
                {drafts.slice(0, 8).map((draft) => (
                    <Link
                        key={draft.id}
                        href={`/recipe/${draft.id}/edit`}
                        className={css({
                            display: 'flex',
                            flexDir: 'column',
                            gap: '1',
                            p: '3',
                            borderRadius: 'xl',
                            border: '1px solid',
                            borderColor: 'border',
                            bg: 'background',
                            textDecoration: 'none',
                            color: 'inherit',
                            transition: 'all 160ms ease',
                            _hover: {
                                borderColor: 'primary',
                                transform: 'translateY(-2px)',
                                boxShadow: 'shadow.medium',
                            },
                        })}
                    >
                        <span
                            className={css({
                                display: 'inline-block',
                                bg: 'primary',
                                color: 'white',
                                borderRadius: 'md',
                                px: '2',
                                py: '1',
                                fontSize: 'xs',
                                fontWeight: '600',
                                mb: '1',
                                alignSelf: 'flex-start',
                            })}
                        >
                            Entwurf
                        </span>
                        <p
                            className={css({
                                fontWeight: '600',
                                fontSize: 'sm',
                                lineClamp: '2',
                                lineHeight: '1.4',
                            })}
                        >
                            {draft.title}
                        </p>
                        <p className={css({ fontSize: 'xs', color: 'text-muted', mt: 'auto', pt: '1' })}>
                            {formatTimeAgo(draft.updatedAt)}
                        </p>
                    </Link>
                ))}
            </div>
        </section>
    );
}

// ---- Top recipes section ----
function TopRecipesSection({ recipes }: { recipes: TopRecipeEntry[] }) {
    return (
        <section>
            <SectionHeader title="Meine besten Rezepte" href="/profile/recipes" />
            {recipes.length === 0 ? (
                <div
                    className={css({
                        p: '6',
                        borderRadius: 'xl',
                        border: '1px dashed',
                        borderColor: 'border',
                        textAlign: 'center',
                    })}
                >
                    <ChefHat
                        size={36}
                        className={css({ color: 'primary', mx: 'auto', mb: '2' })}
                    />
                    <Text size="sm" color="muted">
                        Noch keine veröffentlichten Rezepte.
                    </Text>
                    <div className={css({ mt: '3' })}>
                        <Link href="/recipe/create" className={css({ textDecoration: 'none' })}>
                            <Button variant="primary" size="sm">
                                Erstes Rezept erstellen
                            </Button>
                        </Link>
                    </div>
                </div>
            ) : (
                <div
                    className={grid({
                        columns: { base: 2, sm: 3 },
                        gap: '3',
                    })}
                >
                    {recipes.map((recipe) => (
                        <RecipeMiniCard
                            key={recipe.id}
                            id={recipe.id}
                            title={recipe.title}
                            slug={recipe.slug}
                            meta={
                                recipe.ratingCount > 0
                                    ? `★ ${recipe.rating.toFixed(1)} · ${recipe.ratingCount} Bewertung${recipe.ratingCount === 1 ? '' : 'en'}`
                                    : undefined
                            }
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

// ---- History list section (cook / favorites / views) ----
function HistorySection({
    title,
    href,
    items,
}: {
    title: string;
    href?: string;
    items: Array<{
        id: string;
        recipeId: string;
        recipeTitle: string;
        recipeSlug: string;
        recipeImageKey: string | null;
        date: Date;
    }>;
}) {
    if (items.length === 0) return null;
    return (
        <section>
            <SectionHeader title={title} href={href} />
            <div
                className={grid({
                    columns: { base: 2, sm: 3 },
                    gap: '3',
                })}
            >
                {items.map((item) => (
                    <RecipeMiniCard
                        key={item.id}
                        id={item.recipeId}
                        title={item.recipeTitle}
                        slug={item.recipeSlug}
                        meta={formatTimeAgo(item.date)}
                    />
                ))}
            </div>
        </section>
    );
}

// ---- Main page ----
export default async function ProfilePage() {
    const session = await getServerAuthSession('profile/page');

    if (!session?.user?.id) {
        logMissingSession(session, 'profile/page');
        redirect('/auth/signin');
    }

    const profile = await getOrCreateProfile(session.user.id, session.user.email ?? '');

    if (!profile) {
        redirect('/auth/signin');
    }

    const [stats, draftRecipes, topRecipes, cookHistory, lastFavorites, viewHistory, activityFeed] =
        await Promise.all([
            fetchUserStats(session.user.id),
            fetchUserDraftRecipes(session.user.id),
            fetchUserTopRecipes(session.user.id),
            fetchUserCookHistory(session.user.id),
            fetchUserLastFavorites(session.user.id),
            fetchUserViewHistory(session.user.id),
            fetchUserActivityFeedItems(session.user.id),
        ]);

    const cookItems = cookHistory.map((e: CookHistoryEntry) => ({
        id: e.id,
        recipeId: e.recipeId,
        recipeTitle: e.recipeTitle,
        recipeSlug: e.recipeSlug,
        recipeImageKey: e.recipeImageKey,
        date: e.cookedAt,
    }));

    const favoriteItems = lastFavorites.map((e: FavoriteEntry) => ({
        id: e.id,
        recipeId: e.recipeId,
        recipeTitle: e.recipeTitle,
        recipeSlug: e.recipeSlug,
        recipeImageKey: e.recipeImageKey,
        date: e.createdAt,
    }));

    const viewItems = viewHistory.map((e: ViewHistoryEntry) => ({
        id: e.id,
        recipeId: e.recipeId,
        recipeTitle: e.recipeTitle,
        recipeSlug: e.recipeSlug,
        recipeImageKey: e.recipeImageKey,
        date: e.viewedAt,
    }));

    const memberSince = new Date(profile.createdAt).toLocaleDateString('de-DE', {
        month: 'long',
        year: 'numeric',
    });

    return (
        <PageShell>
            <div
                className={css({
                    display: 'flex',
                    flexDir: 'column',
                    gap: '6',
                    pb: '12',
                })}
            >
                {/* ── Profile Hero ─────────────────────────────── */}
                <FadeInSection y={16} duration={0.4}>
                <div className={cardCss}>
                    <div
                        className={css({
                            display: 'flex',
                            flexDir: { base: 'column', sm: 'row' },
                            gap: '5',
                            alignItems: { base: 'center', sm: 'flex-start' },
                        })}
                    >
                        {/* Avatar */}
                        <div className={css({ flexShrink: 0 })}>
                            {profile.photoUrl ? (
                                <SmartImage
                                    src={profile.photoUrl}
                                    alt={profile.nickname ?? 'Profilfoto'}
                                    width={96}
                                    height={96}
                                    className={css({
                                        borderRadius: 'full',
                                        objectFit: 'cover',
                                        border: '3px solid',
                                        borderColor: 'primary',
                                        boxShadow: { base: '0 4px 16px rgba(224,123,83,0.25)', _dark: '0 4px 16px rgba(224,123,83,0.3)' },
                                    })}
                                />
                            ) : (
                                <div
                                    className={css({
                                        w: '24',
                                        h: '24',
                                        borderRadius: 'full',
                                        background:
                                            `linear-gradient(135deg, ${PALETTE.orange} 0%, #c4623d 100%)`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '3px solid',
                                        borderColor: 'primary',
                                        boxShadow: { base: '0 4px 16px rgba(224,123,83,0.25)', _dark: '0 4px 16px rgba(224,123,83,0.3)' },
                                    })}
                                >
                                    <ChefHat size={40} color="white" />
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div
                            className={css({
                                flex: 1,
                                textAlign: { base: 'center', sm: 'left' },
                                minW: 0,
                            })}
                        >
                            <Text size="sm" color="muted" className={css({ mb: '1' })}>
                                KüchenTakt Profil
                            </Text>
                            <Heading as="h1" size="xl" className={css({ mb: '1' })}>
                                {profile.nickname ?? 'Neuer KüchenFan'}
                            </Heading>
                            {profile.teaser && (
                                <Text
                                    color="muted"
                                    className={css({ mb: '2', maxW: '48ch', lineClamp: '2' })}
                                >
                                    {profile.teaser}
                                </Text>
                            )}
                            <div
                                className={css({
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '3',
                                    fontSize: 'xs',
                                    color: 'text-muted',
                                    justifyContent: { base: 'center', sm: 'flex-start' },
                                })}
                            >
                                <span>{session.user.email}</span>
                                <span>·</span>
                                <span>Mitglied seit {memberSince}</span>
                            </div>

                            {/* Stats Pills */}
                            <div
                                className={css({
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '2',
                                    mt: '3',
                                    justifyContent: { base: 'center', sm: 'flex-start' },
                                })}
                            >
                                {[
                                    { label: 'Rezepte', value: stats.recipeCount },
                                    { label: 'Favoriten', value: stats.favoriteCount },
                                    { label: 'Mal zubereitet', value: stats.cookedCount },
                                    { label: 'Bewertungen', value: stats.ratingCount },
                                    { label: 'Entwürfe', value: stats.draftCount },
                                ].map(({ label, value }) => (
                                    <span
                                        key={label}
                                        className={css({
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '1',
                                            bg: 'surface.elevated',
                                            border: '1px solid',
                                            borderColor: 'border',
                                            borderRadius: 'full',
                                            px: '3',
                                            py: '1',
                                            fontSize: 'xs',
                                            fontWeight: '500',
                                        })}
                                    >
                                        <span
                                            className={css({
                                                fontWeight: '700',
                                                color: 'primary',
                                            })}
                                        >
                                            {value}
                                        </span>{' '}
                                        {label}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div
                            className={css({
                                display: 'flex',
                                flexDir: { base: 'row', sm: 'column' },
                                flexWrap: 'wrap',
                                gap: '2',
                                alignItems: 'stretch',
                                justifyContent: 'center',
                                flexShrink: 0,
                            })}
                        >
                            <Link href="/profile/edit">
                                <Button variant="primary" size="sm">
                                    <Edit3 size={15} />
                                    Profil bearbeiten
                                </Button>
                            </Link>
                            <Link href="/profile/settings">
                                <Button variant="secondary" size="sm">
                                    <Settings size={15} />
                                    Einstellungen
                                </Button>
                            </Link>
                            {profile.userId && (
                                <Link href={`/user/${profile.slug}`}>
                                    <Button variant="ghost" size="sm">
                                        <User size={15} />
                                        Öffentlich
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
                </FadeInSection>

                {/* ── 2-col layout ─────────────────────────────── */}
                <div
                    className={css({
                        display: 'grid',
                        gridTemplateColumns: { base: '1fr', lg: '1fr 300px' },
                        gap: '6',
                        alignItems: 'start',
                    })}
                >
                    {/* ── Left: data sections ── */}
                    <div className={css({ display: 'flex', flexDir: 'column', gap: '8' })}>
                        <DraftSection drafts={draftRecipes} />
                        <TopRecipesSection recipes={topRecipes} />
                        <HistorySection
                            title="Zuletzt zubereitet"
                            items={cookItems}
                            href="/profile/recipes"
                        />
                        <HistorySection
                            title="Zuletzt geliked"
                            items={favoriteItems}
                            href="/profile/favorites"
                        />
                        <HistorySection
                            title="Zuletzt angesehen"
                            items={viewItems}
                        />
                    </div>

                    {/* ── Right: sidebar ── */}
                    <div
                        className={css({
                            display: 'flex',
                            flexDir: 'column',
                            gap: '4',
                            position: { lg: 'sticky' },
                            top: { lg: '6' },
                        })}
                    >
                        <QuickLinksCard userSlug={profile.slug} />

                        <div className={cardCss}>
                            <Heading as="h2" size="md" className={css({ mb: '3' })}>
                                Meine Aktivitäten
                            </Heading>
                            <LiveUserActivityList initialActivities={activityFeed} />
                        </div>
                    </div>
                </div>
            </div>
        </PageShell>
    );
}
