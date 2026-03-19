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
            nextRecipe: { select: { id: true, title: true, slug: true, imageKey: true } },
        },
        take: 5,
    });
}

async function fetchUpcomingStreams() {
    const now = new Date();
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    return prisma.twitchStream.findMany({
        where: { plannedAt: { gt: now, lt: twoWeeksFromNow }, isLive: false },
        orderBy: { plannedAt: 'asc' },
        select: {
            id: true,
            plannedAt: true,
            plannedTimezone: true,
            user: {
                select: {
                    profile: { select: { nickname: true, slug: true, photoKey: true } },
                },
            },
            nextRecipe: { select: { title: true, slug: true } },
        },
        take: 5,
    });
}

export async function CurrentlyLiveSection() {
    const [liveRaw, upcomingRaw] = await Promise.all([fetchLiveStreams(), fetchUpcomingStreams()]);

    const liveStreams = liveRaw
        .filter((s) => s.user.profile?.twitchUsername)
        .map((s) => ({
            id: s.id,
            title: s.title,
            viewerCount: s.viewerCount,
            channel: s.user.profile!.twitchUsername!,
            userName: s.user.profile!.nickname ?? s.user.profile!.twitchUsername!,
            userSlug: s.user.profile!.slug ?? '',
            photoKey: s.user.profile!.photoKey ?? null,
            recipeTitle: s.nextRecipe?.title ?? null,
            recipeSlug: s.nextRecipe?.slug ?? null,
            recipeImageKey: s.nextRecipe?.imageKey ?? null,
        }));

    const upcomingStreams = upcomingRaw
        .filter((s) => s.plannedAt && s.user.profile)
        .map((s) => ({
            id: s.id,
            plannedAtFormatted: formatPlannedTime(s.plannedAt!, s.plannedTimezone),
            userName: s.user.profile!.nickname ?? 'Küchenfreund',
            userSlug: s.user.profile!.slug ?? '',
            photoKey: s.user.profile!.photoKey ?? null,
            recipeTitle: s.nextRecipe?.title ?? null,
            recipeSlug: s.nextRecipe?.slug ?? null,
        }));

    return (
        <CurrentlyLiveSectionClient liveStreams={liveStreams} upcomingStreams={upcomingStreams} />
    );
}
