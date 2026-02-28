import { ChefHat, Edit3, Settings, User } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { fetchUserDraftRecipes, fetchUserStats } from '@/app/actions/user';
import { Button } from '@/components/atoms/Button';
import { SmartImage } from '@/components/atoms/SmartImage';
import { Heading, Text } from '@/components/atoms/Typography';
import SignOutButton from '@/components/auth/SignOutButton';
import { PageShell } from '@/components/layouts/PageShell';
import { getServerAuthSession, logMissingSession } from '@/lib/auth';
import { getOrCreateProfile } from '@/lib/profile';
import { css } from 'styled-system/css';
import { grid } from 'styled-system/patterns';

export const metadata: Metadata = {
    title: 'Mein Profil',
    description:
        'Dein persönliches KüchenTakt Profil. Verwalte deine Favoriten, erstellte Rezepte und Kontoeinstellungen.',
};

export const dynamic = 'force-dynamic';

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

    return (
        <PageShell>
            <section
                className={css({
                    py: { base: '4', md: '6' },
                })}
            >
                {/* Header Section */}
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
                            {/* Profile Image */}
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

                            {/* Profile Info */}
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

                            {/* Actions */}
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

                {/* Main Content Grid */}
                <div
                    className={grid({
                        columns: { base: 1, lg: 12 },
                        gap: '4',
                    })}
                >
                    {/* Left Column - Settings Cards */}
                    <div className={css({ lg: { gridColumn: 'span 8' } })}>
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
                                        Passwort ändern, Recovery und Accountverwaltung.
                                    </Text>
                                </div>
                            </Link>
                        </div>

                        {/* Draft Recipes */}
                        {draftRecipes.length > 0 && (
                            <div
                                className={css({
                                    mt: '4',
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
                                        justifyContent: 'space-between',
                                        mb: '4',
                                    })}
                                >
                                    <Heading as="h2" size="lg">
                                        Meine Entwürfe
                                    </Heading>
                                    <span
                                        className={css({
                                            bg: 'primary',
                                            color: 'white',
                                            borderRadius: 'full',
                                            px: '3',
                                            py: '1',
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
                                                p: '4',
                                                borderRadius: 'xl',
                                                border: '1px solid',
                                                borderColor: 'border',
                                                bg: 'background',
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
                                                    mb: '1',
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

                    {/* Right Column - Stats */}
                    <div className={css({ lg: { gridColumn: 'span 4' } })}>
                        <div
                            className={css({
                                p: { base: '4', md: '5' },
                                borderRadius: '2xl',
                                bg: 'surface',
                                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                            })}
                        >
                            <Heading as="h2" size="md" className={css({ mb: '4' })}>
                                Statistiken
                            </Heading>
                            <div
                                className={css({
                                    display: 'flex',
                                    flexDir: 'column',
                                    gap: '3',
                                })}
                            >
                                <div
                                    className={css({
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        p: '3',
                                        borderRadius: 'xl',
                                        bg: 'background',
                                    })}
                                >
                                    <Text color="muted">Rezepte erstellt</Text>
                                    <span
                                        className={css({
                                            fontSize: 'lg',
                                            fontWeight: '700',
                                            color: 'text',
                                        })}
                                    >
                                        {stats.recipeCount}
                                    </span>
                                </div>
                                <div
                                    className={css({
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        p: '3',
                                        borderRadius: 'xl',
                                        bg: 'background',
                                    })}
                                >
                                    <Text color="muted">Entwürfe</Text>
                                    <span
                                        className={css({
                                            fontSize: 'lg',
                                            fontWeight: '700',
                                            color: 'text',
                                        })}
                                    >
                                        {stats.draftCount}
                                    </span>
                                </div>
                                <div
                                    className={css({
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        p: '3',
                                        borderRadius: 'xl',
                                        bg: 'background',
                                    })}
                                >
                                    <Text color="muted">Favoriten</Text>
                                    <span
                                        className={css({
                                            fontSize: 'lg',
                                            fontWeight: '700',
                                            color: 'text',
                                        })}
                                    >
                                        {stats.favoriteCount}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </PageShell>
    );
};

export default ProfilePage;
