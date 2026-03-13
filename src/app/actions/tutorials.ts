'use server';

import { RECIPE_CREATION_TUTORIAL_KEY } from '@app/components/recipe/tutorial/shared';
import { getServerAuthSession } from '@app/lib/auth';
import { prisma } from '@shared/prisma';

import { awardTrophy } from './trophies';

export async function completeRecipeCreationTutorial() {
    const session = await getServerAuthSession('completeRecipeCreationTutorial');
    if (!session?.user?.id) {
        throw new Error('Nicht angemeldet.');
    }

    await prisma.userTutorialCompletion.upsert({
        where: {
            userId_tutorialKey: {
                userId: session.user.id,
                tutorialKey: RECIPE_CREATION_TUTORIAL_KEY,
            },
        },
        create: {
            userId: session.user.id,
            tutorialKey: RECIPE_CREATION_TUTORIAL_KEY,
        },
        update: {
            completedAt: new Date(),
        },
    });

    await awardTrophy('finished-tutorial');
}
