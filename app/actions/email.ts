'use server';

import { queue } from '@/lib/trigger';

/**
 * Example usage of email queue functions
 *
 * These functions can be called from anywhere in your app to queue emails
 * for processing by the BullMQ worker.
 */

// Simple email send
export async function sendTestEmail(to: string) {
    await queue.sendEmail({
        to,
        subject: 'Test Email',
        html: '<h1>Hello World!</h1><p>This is a test email.</p>',
    });
    return { success: true };
}

// Templated email - uses predefined templates
export async function sendWelcomeEmail(to: string, name: string) {
    await queue.sendTemplatedEmail({
        to,
        templateType: 'welcome',
        variables: {
            name,
            appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        },
    });
    return { success: true };
}

// Password reset email
export async function sendPasswordResetEmailAction(to: string, name: string, resetLink: string) {
    await queue.sendTemplatedEmail({
        to,
        templateType: 'passwordReset',
        variables: {
            name,
            resetLink,
        },
    });
    return { success: true };
}

// Batch email - for newsletters, notifications, etc.
export async function sendBatchTest() {
    const emails = [
        {
            to: 'user1@example.com',
            subject: 'Subject 1',
            html: '<p>Content 1</p>',
        },
        {
            to: 'user2@example.com',
            subject: 'Subject 2',
            html: '<p>Content 2</p>',
        },
        {
            to: 'user3@example.com',
            subject: 'Subject 3',
            html: '<p>Content 3</p>',
        },
    ];

    await queue.sendBatchEmails({
        emails,
        concurrency: 5, // Send 5 emails at a time
    });
    return { success: true };
}

// Example: Send notification when someone comments on a recipe
export async function notifyNewComment(
    recipeAuthorEmail: string,
    recipeAuthorName: string,
    recipeName: string,
    commenterName: string,
    comment: string,
    recipeUrl: string,
) {
    await queue.sendTemplatedEmail({
        to: recipeAuthorEmail,
        templateType: 'newRecipeComment',
        variables: {
            authorName: recipeAuthorName,
            recipeName,
            commenterName,
            comment,
            recipeUrl,
        },
    });
    return { success: true };
}
