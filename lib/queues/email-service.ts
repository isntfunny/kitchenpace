export interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
    const emailHost = process.env.EMAIL_HOST;
    const emailUser = process.env.EMAIL_USER;
    const emailFrom = process.env.EMAIL_FROM;
    const emailPort = process.env.EMAIL_PORT || '587';
    const hasSmtpConfig = Boolean(emailHost && emailUser && process.env.EMAIL_PASS);

    console.log('[Email] Starting email send process', {
        to,
        subject,
        from: emailFrom,
        host: emailHost,
        port: emailPort,
        secure: emailPort === '465',
    });

    if (!hasSmtpConfig) {
        console.warn('[Email] No SMTP configured - email logged only (simulated send)', {
            to,
            bodyPreview: html.substring(0, 200),
            bodyLength: html.length,
        });
        return true;
    }

    try {
        const nodemailer = await import('nodemailer');

        const transporter = nodemailer.createTransport({
            host: emailHost,
            port: parseInt(emailPort, 10),
            secure: emailPort === '465',
            auth: {
                user: emailUser,
                pass: process.env.EMAIL_PASS,
            },
            connectionTimeout: 10000,
            socketTimeout: 10000,
        });

        await transporter.verify();

        const result = await transporter.sendMail({
            from: emailFrom,
            to,
            subject,
            html,
        });

        console.log('[Email] Email sent successfully', {
            to,
            messageId: result.messageId,
            accepted: result.accepted,
            rejected: result.rejected,
        });

        if (result.rejected && result.rejected.length > 0) {
            console.warn('[Email] Some recipients were rejected', {
                rejected: result.rejected,
                to,
            });
        }

        return true;
    } catch (error) {
        console.error('[Email] Failed to send email', {
            to,
            subject,
            error: error instanceof Error ? error.message : String(error),
        });
        return false;
    }
}

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetLink = `${appUrl}/auth/new-password?token=${resetToken}`;

    const html = `
        <body style="margin:0;padding:0;background:#fff8f2;font-family:'Inter',system-ui,sans-serif;color:#2d3436;">
            <table role="presentation" width="100%" style="background:#fff8f2;padding:24px 0;">
                <tr>
                    <td align="center">
                        <table role="presentation" width="600" style="background:#ffffff;border-radius:32px;box-shadow:0 30px 60px rgba(0,0,0,0.08);overflow:hidden;">
                            <tr>
                                <td style="background:linear-gradient(135deg,#e07b53,#f8b500);padding:48px 32px;text-align:center;color:#fff;font-family:'Playfair Display',Georgia,serif;">
                                    <p style="margin:0;text-transform:uppercase;letter-spacing:0.2em;font-size:12px;opacity:0.8;">KitchenPace</p>
                                    <h1 style="margin:12px 0 4px;font-size:32px;font-weight:700;">Passwort zurücksetzen</h1>
                                    <p style="margin:0;font-size:16px;">Du hast uns gebeten, dein Passwort zurückzusetzen.</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:40px 48px 32px;">
                                    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
                                        Kein Problem. Klicke auf den Button unten, um ein neues Passwort festzulegen. Der Link bleibt <strong>1 Stunde</strong> gültig.
                                    </p>
                                    <p style="text-align:center;margin:32px 0;">
                                        <a href="${resetLink}" style="background:#e07b53;color:#fff;text-decoration:none;font-weight:600;padding:14px 32px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 10px 30px rgba(224,123,83,0.4);">
                                            Passwort zurücksetzen
                                        </a>
                                    </p>
                                    <hr style="border:none;border-top:1px solid #f0e4da;margin:32px 0;">
                                    <p style="margin:12px 0;font-size:14px;color:#636e72;">
                                        Du hast keinen Reset angefordert? Dann kannst du diese Nachricht einfach ignorieren.
                                    </p>
                                    <div style="margin-top:32px;padding:16px;border-radius:20px;background:#fff4eb;border:1px solid rgba(224,123,83,0.3);">
                                        <p style="margin:0;font-size:14px;font-weight:600;">Sicherheitshinweis</p>
                                        <p style="margin:4px 0 0;font-size:13px;line-height:1.5;color:#4a4a4a;">
                                            Hilf uns, dein Konto zu schützen: benutze ein einzigartiges Passwort mit mindestens 6 Zeichen und aktiviere auf deinem Gerät die neueste Browser-Version.
                                        </p>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:24px 48px 32px;border-top:1px solid #f0e4da;background:#faf9f7;font-size:13px;color:#7d7d7d;text-align:center;">
                                    <p style="margin:0;">KitchenPace · Deine Küche, dein Tempo</p>
                                    <p style="margin:4px 0 0;">Wenn du Fragen hast, antworte einfach auf diese E-Mail.</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
    `;

    return sendEmail({
        to: email,
        subject: 'KitchenPace - Passwort zurücksetzen',
        html,
    });
}

export async function sendActivationEmail(
    email: string,
    activationToken: string,
): Promise<boolean> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const activationLink = `${appUrl}/auth/activate?token=${activationToken}`;

    const html = `
        <body style="margin:0;padding:0;background:#fff8f2;font-family:'Inter',system-ui,sans-serif;color:#2d3436;">
            <table role="presentation" width="100%" style="background:#fff8f2;padding:24px 0;">
                <tr>
                    <td align="center">
                        <table role="presentation" width="600" style="background:#ffffff;border-radius:32px;box-shadow:0 30px 60px rgba(0,0,0,0.08);overflow:hidden;">
                            <tr>
                                <td style="background:linear-gradient(135deg,#e07b53,#f8b500);padding:48px 32px;text-align:center;color:#fff;font-family:'Playfair Display',Georgia,serif;">
                                    <p style="margin:0;text-transform:uppercase;letter-spacing:0.2em;font-size:12px;opacity:0.8;">KitchenPace</p>
                                    <h1 style="margin:12px 0 4px;font-size:32px;font-weight:700;">Willkommen!</h1>
                                    <p style="margin:0;font-size:16px;">Bitte bestätige deine E-Mail-Adresse.</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:40px 48px 32px;">
                                    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
                                        Vielen Dank für deine Registrierung bei KitchenPace! Bitte klicke auf den Button unten, um dein Konto zu aktivieren.
                                    </p>
                                    <p style="text-align:center;margin:32px 0;">
                                        <a href="${activationLink}" style="background:#e07b53;color:#fff;text-decoration:none;font-weight:600;padding:14px 32px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 10px 30px rgba(224,123,83,0.4);">
                                            Konto aktivieren
                                        </a>
                                    </p>
                                    <hr style="border:none;border-top:1px solid #f0e4da;margin:32px 0;">
                                    <p style="margin:12px 0;font-size:14px;color:#636e72;">
                                        Der Link ist <strong>24 Stunden</strong> gültig. Solltest du dich nicht registriert haben, kannst du diese Nachricht ignorieren.
                                    </p>
                                    <div style="margin-top:32px;padding:16px;border-radius:20px;background:#fff4eb;border:1px solid rgba(224,123,83,0.3);">
                                        <p style="margin:0;font-size:14px;font-weight:600;">Probleme mit dem Button?</p>
                                        <p style="margin:4px 0 0;font-size:13px;line-height:1.5;color:#4a4a4a;">
                                            Kopiere diesen Link in deinen Browser:<br>
                                            <a href="${activationLink}" style="color:#e07b53;">${activationLink}</a>
                                        </p>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:24px 48px 32px;border-top:1px solid #f0e4da;background:#faf9f7;font-size:13px;color:#7d7d7d;text-align:center;">
                                    <p style="margin:0;">KitchenPace · Deine Küche, dein Tempo</p>
                                    <p style="margin:4px 0 0;">Wenn du Fragen hast, antworte einfach auf diese E-Mail.</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
    `;

    return sendEmail({
        to: email,
        subject: 'KitchenPace - Bitte aktiviere dein Konto',
        html,
    });
}
