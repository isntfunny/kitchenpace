import { sendNotifuseWelcomeEmail } from '../../src/lib/notifuse/email';
import { hatchet } from '../hatchet';
import { prisma } from '../queues/prisma';

export const helloWorldWorkflow = hatchet.workflow({
    name: 'hello-world',
});

const fetchRecipes = helloWorldWorkflow.task({
    name: 'fetch-top-recipes',
    fn: async (input: { email?: string }) => {
        const topRecipes = await prisma.recipe.findMany({
            take: 3,
            orderBy: { createdAt: 'desc' },
            select: { title: true, slug: true, createdAt: true },
        });

        console.log('[HelloWorld] Top 3 recipes:', topRecipes);

        return { topRecipes, email: input.email };
    },
});

helloWorldWorkflow.task({
    name: 'send-email',
    parents: [fetchRecipes],
    fn: async (input, context) => {
        const { email, topRecipes } = context.parentOutput(fetchRecipes);

        if (!email) {
            console.log('[HelloWorld] No email provided, skipping notification');
            return { sent: false, reason: 'no email' };
        }

        const result = await sendNotifuseWelcomeEmail({
            email,
            dashboardLink: `https://kitchenpace.com`,
        });

        console.log('[HelloWorld] Email sent to', email, result);

        return { sent: true, email, messageId: result?.message_id, topRecipes };
    },
});
