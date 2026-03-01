interface EmailTemplate {
    subject: string;
    html: string;
}

export const emailTemplates: Record<string, EmailTemplate> = {
    welcome: {
        subject: 'Willkommen bei KitchenPace!',
        html: `
<body style="margin:0;padding:0;background:#fff8f2;font-family:'Inter',system-ui,sans-serif;color:#2d3436;">
    <table role="presentation" width="100%" style="background:#fff8f2;padding:24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" style="background:#ffffff;border-radius:32px;box-shadow:0 30px 60px rgba(0,0,0,0.08);overflow:hidden;">
                    <tr>
                        <td style="background:linear-gradient(135deg,#e07b53,#f8b500);padding:48px 32px;text-align:center;color:#fff;font-family:'Playfair Display',Georgia,serif;">
                            <p style="margin:0;text-transform:uppercase;letter-spacing:0.2em;font-size:12px;opacity:0.8;">KitchenPace</p>
                            <h1 style="margin:12px 0 4px;font-size:32px;font-weight:700;">Willkommen!</h1>
                            <p style="margin:0;font-size:16px;">Deine Küche, dein Tempo</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px 48px 32px;">
                            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
                                Hallo {{name}}!
                            </p>
                            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
                                Wir freuen uns sehr, dich bei KitchenPace begrüßen zu dürfen! Entdecke tausende von Rezepten und organisiere deine Kocherlebnisse wie nie zuvor.
                            </p>
                            <p style="text-align:center;margin:32px 0;">
                                <a href="{{link}}" style="background:#e07b53;color:#fff;text-decoration:none;font-weight:600;padding:14px 32px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 10px 30px rgba(224,123,83,0.4);">
                                    {{linkText}}
                                </a>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:24px 48px 32px;border-top:1px solid #f0e4da;background:#faf9f7;font-size:13px;color:#7d7d7d;text-align:center;">
                            <p style="margin:0;">KitchenPace · Deine Küche, dein Tempo</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
        `,
    },

    passwordReset: {
        subject: 'KitchenPace - Passwort zurücksetzen',
        html: `
<body style="margin:0;padding:0;background:#fff8f2;font-family:'Inter',system-ui,sans-serif;color:#2d3436;">
    <table role="presentation" width="100%" style="background:#fff8f2;padding:24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" style="background:#ffffff;border-radius:32px;box-shadow:0 30px 60px rgba(0,0,0,0.08);overflow:hidden;">
                    <tr>
                        <td style="background:linear-gradient(135deg,#e07b53,#f8b500);padding:48px 32px;text-align:center;color:#fff;font-family:'Playfair Display',Georgia,serif;">
                            <p style="margin:0;text-transform:uppercase;letter-spacing:0.2em;font-size:12px;opacity:0.8;">KitchenPace</p>
                            <h1 style="margin:12px 0 4px;font-size:32px;font-weight:700;">Passwort zurücksetzen</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px 48px 32px;">
                            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
                                Hallo {{name}},
                            </p>
                            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
                                Kein Problem. Klicke auf den Button unten, um ein neues Passwort festzulegen. Der Link bleibt <strong>1 Stunde</strong> gültig.
                            </p>
                            <p style="text-align:center;margin:32px 0;">
                                <a href="{{resetLink}}" style="background:#e07b53;color:#fff;text-decoration:none;font-weight:600;padding:14px 32px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 10px 30px rgba(224,123,83,0.4);">
                                    Passwort zurücksetzen
                                </a>
                            </p>
                            <hr style="border:none;border-top:1px solid #f0e4da;margin:32px 0;">
                            <p style="margin:12px 0;font-size:14px;color:#636e72;">
                                Du hast keinen Reset angefordert? Dann kannst du diese Nachricht einfach ignorieren.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:24px 48px 32px;border-top:1px solid #f0e4da;background:#faf9f7;font-size:13px;color:#7d7d7d;text-align:center;">
                            <p style="margin:0;">KitchenPace · Deine Küche, dein Tempo</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
        `,
    },

    accountActivated: {
        subject: 'KitchenPace - Konto aktiviert!',
        html: `
<body style="margin:0;padding:0;background:#fff8f2;font-family:'Inter',system-ui,sans-serif;color:#2d3436;">
    <table role="presentation" width="100%" style="background:#fff8f2;padding:24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" style="background:#ffffff;border-radius:32px;box-shadow:0 30px 60px rgba(0,0,0,0.08);overflow:hidden;">
                    <tr>
                        <td style="background:linear-gradient(135deg,#e07b53,#f8b500);padding:48px 32px;text-align:center;color:#fff;font-family:'Playfair Display',Georgia,serif;">
                            <p style="margin:0;text-transform:uppercase;letter-spacing:0.2em;font-size:12px;opacity:0.8;">KitchenPace</p>
                            <h1 style="margin:12px 0 4px;font-size:32px;font-weight:700;">Konto aktiviert!</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px 48px 32px;">
                            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
                                Hallo {{name}},
                            </p>
                            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
                                Dein Konto wurde erfolgreich aktiviert! Ab jetzt kannst du alle Funktionen von KitchenPace nutzen.
                            </p>
                            <ul style="margin:24px 0;padding-left:20px;font-size:15px;line-height:1.8;">
                                <li>Entdecke tausende von Rezepten</li>
                                <li>Erstelle deine eigenen Rezept-Flows</li>
                                <li>Speichere deine Favoriten</li>
                                <li>Teile Rezepte mit Freunden</li>
                            </ul>
                            <p style="text-align:center;margin:32px 0;">
                                <a href="{{appUrl}}" style="background:#e07b53;color:#fff;text-decoration:none;font-weight:600;padding:14px 32px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 10px 30px rgba(224,123,83,0.4);">
                                    Jetzt loslegen
                                </a>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:24px 48px 32px;border-top:1px solid #f0e4da;background:#faf9f7;font-size:13px;color:#7d7d7d;text-align:center;">
                            <p style="margin:0;">KitchenPace · Deine Küche, dein Tempo</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
        `,
    },

    newRecipeComment: {
        subject: 'KitchenPace - Neuer Kommentar zu "{{recipeName}}"',
        html: `
<body style="margin:0;padding:0;background:#fff8f2;font-family:'Inter',system-ui,sans-serif;color:#2d3436;">
    <table role="presentation" width="100%" style="background:#fff8f2;padding:24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" style="background:#ffffff;border-radius:32px;box-shadow:0 30px 60px rgba(0,0,0,0.08);overflow:hidden;">
                    <tr>
                        <td style="background:linear-gradient(135deg,#e07b53,#f8b500);padding:48px 32px;text-align:center;color:#fff;font-family:'Playfair Display',Georgia,serif;">
                            <p style="margin:0;text-transform:uppercase;letter-spacing:0.2em;font-size:12px;opacity:0.8;">KitchenPace</p>
                            <h1 style="margin:12px 0 4px;font-size:28px;font-weight:700;">Neuer Kommentar</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px 48px 32px;">
                            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
                                Hallo {{authorName}},
                            </p>
                            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
                                <strong>{{commenterName}}</strong> hat einen Kommentar zu deinem Rezept "{{recipeName}}" hinterlassen:
                            </p>
                            <div style="background:#faf9f7;padding:20px;border-radius:16px;margin:24px 0;border-left:4px solid #e07b53;">
                                <p style="margin:0;font-size:15px;font-style:italic;color:#4a4a4a;">"{{comment}}"</p>
                            </div>
                            <p style="text-align:center;margin:32px 0;">
                                <a href="{{recipeUrl}}" style="background:#e07b53;color:#fff;text-decoration:none;font-weight:600;padding:14px 32px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 10px 30px rgba(224,123,83,0.4);">
                                    Zum Rezept
                                </a>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:24px 48px 32px;border-top:1px solid #f0e4da;background:#faf9f7;font-size:13px;color:#7d7d7d;text-align:center;">
                            <p style="margin:0;">KitchenPace · Deine Küche, dein Tempo</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
        `,
    },

    recipeOfTheDay: {
        subject: 'KitchenPace - Rezept des Tages: {{recipeName}}',
        html: `
<body style="margin:0;padding:0;background:#fff8f2;font-family:'Inter',system-ui,sans-serif;color:#2d3436;">
    <table role="presentation" width="100%" style="background:#fff8f2;padding:24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" style="background:#ffffff;border-radius:32px;box-shadow:0 30px 60px rgba(0,0,0,0.08);overflow:hidden;">
                    <tr>
                        <td style="background:linear-gradient(135deg,#e07b53,#f8b500);padding:48px 32px;text-align:center;color:#fff;font-family:'Playfair Display',Georgia,serif;">
                            <p style="margin:0;text-transform:uppercase;letter-spacing:0.2em;font-size:12px;opacity:0.8;">KitchenPace</p>
                            <h1 style="margin:12px 0 4px;font-size:28px;font-weight:700;">Rezept des Tages</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px 48px 32px;">
                            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
                                Hallo {{name}},
                            </p>
                            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
                                Wir haben heute ein besonders leckeres Rezept für dich ausgewählt:
                            </p>
                            <div style="background:#faf9f7;padding:24px;border-radius:16px;margin:24px 0;text-align:center;">
                                <h2 style="margin:0 0 8px;font-size:24px;color:#2d3436;">{{recipeName}}</h2>
                                <p style="margin:0 0 16px;font-size:14px;color:#636e72;">{{recipeDescription}}</p>
                                <p style="margin:0;font-size:14px;color:#636e72;">
                                    🕐 {{prepTime}} Min. · 🔥 {{difficulty}}
                                </p>
                            </div>
                            <p style="text-align:center;margin:32px 0;">
                                <a href="{{recipeUrl}}" style="background:#e07b53;color:#fff;text-decoration:none;font-weight:600;padding:14px 32px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 10px 30px rgba(224,123,83,0.4);">
                                    Rezept ansehen
                                </a>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:24px 48px 32px;border-top:1px solid #f0e4da;background:#faf9f7;font-size:13px;color:#7d7d7d;text-align:center;">
                            <p style="margin:0;">KitchenPace · Deine Küche, dein Tempo</p>
                            <p style="margin:8px 0 0;font-size:12px;">
                                <a href="{{unsubscribeUrl}}" style="color:#7d7d7d;">Newsletter abbestellen</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
        `,
    },

    weeklyNewsletter: {
        subject: 'KitchenPace - Deine Weekly Highlights',
        html: `
<body style="margin:0;padding:0;background:#fff8f2;font-family:'Inter',system-ui,sans-serif;color:#2d3436;">
    <table role="presentation" width="100%" style="background:#fff8f2;padding:24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" style="background:#ffffff;border-radius:32px;box-shadow:0 30px 60px rgba(0,0,0,0.08);overflow:hidden;">
                    <tr>
                        <td style="background:linear-gradient(135deg,#e07b53,#f8b500);padding:48px 32px;text-align:center;color:#fff;font-family:'Playfair Display',Georgia,serif;">
                            <p style="margin:0;text-transform:uppercase;letter-spacing:0.2em;font-size:12px;opacity:0.8;">KitchenPace</p>
                            <h1 style="margin:12px 0 4px;font-size:32px;font-weight:700;">Weekly Highlights</h1>
                            <p style="margin:0;font-size:16px;">Die besten Rezepte dieser Woche</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px 48px 32px;">
                            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
                                Hallo {{name}},
                            </p>
                            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
                                Diese Woche gibt es wieder spannende neue Rezepte für dich:
                            </p>
                            {{recipes}}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:24px 48px 32px;border-top:1px solid #f0e4da;background:#faf9f7;font-size:13px;color:#7d7d7d;text-align:center;">
                            <p style="margin:0;">KitchenPace · Deine Küche, dein Tempo</p>
                            <p style="margin:8px 0 0;font-size:12px;">
                                <a href="{{unsubscribeUrl}}" style="color:#7d7d7d;">Newsletter abbestellen</a> · 
                                <a href="{{appUrl}}" style="color:#7d7d7d;">Webseite</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
        `,
    },
};

export function getEmailTemplate(templateType: string): EmailTemplate | undefined {
    return emailTemplates[templateType];
}

export function renderEmailTemplate(
    templateType: string,
    variables: Record<string, string>,
): { subject: string; html: string } | null {
    const template = emailTemplates[templateType];
    if (!template) return null;

    let html = template.html;
    let subject = template.subject;

    for (const [key, value] of Object.entries(variables)) {
        html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
        subject = subject.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    return { subject, html };
}
