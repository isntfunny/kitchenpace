import { formatPlannedTime } from '@app/lib/date';
import { prisma } from '@shared/prisma';

import { CurrentlyLiveSectionClient } from './CurrentlyLiveSectionClient';

async function fetchLiveStreams() {
    return prisma.twitchStream.findMany({
        where: { isLive: true },
        select: {
            id: true,
            title: true,
            viewerCount: true,
            user: {
                select: {
                    plannedStreams: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        select: { recipe: { select: { title: true, slug: true, imageKey: true } } },
                    },
                    profile: {
                        select: {
                            twitchUsername: true,
                            nickname: true,
                            slug: true,
                            photoKey: true,
                        },
                    },
                },
            },
        },
        take: 5,
    });
}

async function fetchUpcomingStreams() {
    const now = new Date();
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    return prisma.plannedStream.findMany({
        where: { plannedAt: { gt: now, lt: twoWeeksFromNow } },
        orderBy: { plannedAt: 'asc' },
        select: {
            id: true,
            plannedAt: true,
            plannedTimezone: true,
            recipe: { select: { title: true, slug: true } },
            user: {
                select: {
                    profile: { select: { nickname: true, slug: true, photoKey: true } },
                },
            },
        },
        take: 5,
    });
}

export async function CurrentlyLiveSection() {
    const [liveRaw, upcomingRaw] = await Promise.all([fetchLiveStreams(), fetchUpcomingStreams()]);

    const liveStreams = liveRaw
        .filter((s) => s.user.profile?.twitchUsername)
        .map((s) => {
            const latestPlanned = s.user.plannedStreams[0];
            return {
                id: s.id,
                title: s.title,
                viewerCount: s.viewerCount,
                channel: s.user.profile!.twitchUsername!,
                userName: s.user.profile!.nickname ?? s.user.profile!.twitchUsername!,
                userSlug: s.user.profile!.slug ?? '',
                photoKey: s.user.profile!.photoKey ?? null,
                recipeTitle: latestPlanned?.recipe.title ?? null,
                recipeSlug: latestPlanned?.recipe.slug ?? null,
                recipeImageKey: latestPlanned?.recipe.imageKey ?? null,
            };
        });

    const upcomingStreams = upcomingRaw
        .filter((s) => s.plannedAt && s.user.profile)
        .map((s) => ({
            id: s.id,
            plannedAtFormatted: formatPlannedTime(s.plannedAt!, s.plannedTimezone),
            userName: s.user.profile!.nickname ?? 'Küchenfreund',
            userSlug: s.user.profile!.slug ?? '',
            photoKey: s.user.profile!.photoKey ?? null,
            recipeTitle: s.recipe.title,
            recipeSlug: s.recipe.slug,
        }));

    return (
        <CurrentlyLiveSectionClient liveStreams={liveStreams} upcomingStreams={upcomingStreams} />
    );
}
