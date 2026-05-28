# Activity/Events System Vollausbau

**Datum:** 2026-03-25
**Typ:** Review + Refactoring + Feature-Erweiterung

---

## Zusammenfassung

Vollständiges Review und Ausbau des Activity/Events-Systems. Konsolidierung duplizierter Codepfade, Anschluss fehlender Events und Erweiterung um neue ActivityTypes.

---

## Ist-Zustand: Vollständige User-Interaction-Tabelle

| #   | User-Aktion             | Activity erstellt?                | Notification erstellt?           | Status                                                        |
| --- | ----------------------- | --------------------------------- | -------------------------------- | ------------------------------------------------------------- |
| 1   | Rezept veröffentlichen  | `RECIPE_CREATED`                  | `RECIPE_PUBLISHED` (an Follower) | 3 verschiedene Codepfade — konsolidieren                      |
| 2   | Rezept favorisieren     | `RECIPE_FAVORITED`                | `RECIPE_LIKE` (an Autor)         | OK via `fireEvent()`                                          |
| 3   | Rezept entfavorisieren  | `RECIPE_UNFAVORITED`              | —                                | OK via `fireEvent()`                                          |
| 4   | Rezept bewerten         | `RECIPE_RATED` (upsert 30min)     | `RECIPE_RATING` (an Autor)       | OK via `fireEvent()`                                          |
| 5   | Rezept nachgekocht      | `RECIPE_COOKED`                   | `RECIPE_COOKED` (an Autor)       | OK via `fireEvent()`                                          |
| 6   | User folgen             | `USER_FOLLOWED`                   | `NEW_FOLLOWER`                   | OK via `fireEvent()`                                          |
| 7   | User entfolgen          | —                                 | —                                | Kein Event (beabsichtigt)                                     |
| 8   | Kommentar schreiben     | `RECIPE_COMMENTED` definiert      | `RECIPE_COMMENT` definiert       | NICHT ANGEBUNDEN — später mit Comment-Feature                 |
| 9   | User registrieren       | `USER_REGISTERED` definiert       | `SYSTEM` definiert               | NICHT ANGEBUNDEN — wird angeschlossen                         |
| 10  | Email verifizieren      | `USER_ACTIVATED` definiert        | —                                | Bleibt inaktiv                                                |
| 11  | Rezept löschen (bulk)   | —                                 | —                                | Kein Event (beabsichtigt)                                     |
| 12  | Cook-Image löschen      | —                                 | —                                | Kein Event (beabsichtigt)                                     |
| 13  | Neue Zutat erstellen    | —                                 | `SYSTEM` (an Mods)               | Direkt, Admin-Sonderfall — bleibt so                          |
| 14  | Content melden (Report) | —                                 | —                                | Kein Event an User (beabsichtigt)                             |
| 15  | Profil ändern           | —                                 | —                                | Kein Event (beabsichtigt)                                     |
| 16  | Stream planen           | —                                 | —                                | NICHT ANGEBUNDEN — wird angeschlossen                         |
| 17  | Stream live gehen       | `STREAM_STARTED`                  | —                                | Existiert, aber kein Food-Filter + direkter createActivityLog |
| 18  | Trophy erhalten         | —                                 | Nur ephemerer Toast              | NICHT ANGEBUNDEN — wird angeschlossen                         |
| 19  | Wochenplan erstellen    | `MEAL_PLAN_CREATED` definiert     | —                                | Feature nicht implementiert — bleibt inaktiv                  |
| 20  | Einkaufsliste erstellen | `SHOPPING_LIST_CREATED` definiert | —                                | Feature nicht implementiert — bleibt inaktiv                  |
| 21  | QR-Upload Foto          | —                                 | `SYSTEM` (an Uploader)           | Direkt, Sonderfall — bleibt so                                |
| 22  | Admin: User bannen      | ModerationLog                     | `SYSTEM` (an User)               | Direkt, Admin-Sonderfall — bleibt so                          |
| 23  | Admin: User entbannen   | ModerationLog                     | `SYSTEM` (an User)               | Direkt, Admin-Sonderfall — bleibt so                          |
| 24  | Mod: Content genehmigen | ModerationLog                     | `SYSTEM` (an Autor)              | Direkt, Admin-Sonderfall — bleibt so                          |
| 25  | Mod: Content ablehnen   | ModerationLog                     | `SYSTEM` (an Autor)              | Direkt, Admin-Sonderfall — bleibt so                          |

---

## Scope der Änderungen

### Im Scope

| #   | Änderung                                                                                       | Typ                      |
| --- | ---------------------------------------------------------------------------------------------- | ------------------------ |
| 1   | Rezept-Publish konsolidieren — 3 Codepfade zu 1x `fireEvent('recipePublished')`                | Refactoring              |
| 2   | `userRegistered` Activity — im Auth-Flow anschliessen, nur Activity-Log (keine Notification)   | Neues Event anschliessen |
| 3   | `TROPHY_AWARDED` — neuer ActivityType, bei `awardTrophy()` feuern                              | Neues Event              |
| 4   | `STREAM_PLANNED` — neuer ActivityType, bei `planStream()` feuern                               | Neues Event              |
| 5   | `STREAM_STARTED` Food-Filter — nur feuern wenn Twitch-Kategorie "Food & Drink"                 | Filter                   |
| 6   | `STREAM_STARTED` durch `fireEvent()` leiten — aktuell direkter `createActivityLog()` im Worker | Refactoring              |
| 7   | Shared href-Utility — `recipeHref()` / `userHref()` extrahieren                                | Refactoring              |
| 8   | `trophiesPublic` Privacy-Feld — neues Profile-Feld für Trophy-Activity-Sichtbarkeit            | Privacy                  |

### Explizit NICHT im Scope

- `RECIPE_COMMENTED` — wird mit Comment-Feature gebaut. **Bekannter Bug:** In `config.ts` ist `recipeCommented.notification.type` fälschlich `'RECIPE_RATING'` statt `'RECIPE_COMMENT'`, und `NotificationTypeValue` Union fehlt `'RECIPE_COMMENT'`. Beides muss beim Comment-Feature gefixt werden.
- `MEAL_PLAN_CREATED`, `SHOPPING_LIST_CREATED` — Features nicht implementiert
- `userActivated` — bleibt inaktiv
- Admin/Mod-Notifications (ban, unban, approve, reject, ingredient) — bleiben direkte `createUserNotification()` Aufrufe
- `WEEKLY_PLAN_REMINDER` — Feature nicht implementiert
- `RECIPE_UNFAVORITED` — Event-Definition in `config.ts` ist leer (`{}`), Activity wird daher vermutlich nicht erzeugt. Prüfen und ggf. später fixen.

---

## Event-Definitionen (neu/geändert)

### Neue Events

| Event           | ActivityType                 | Notification | Activity-Strategie | Metadata                                                                                                                                                                                                                 |
| --------------- | ---------------------------- | ------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `trophyAwarded` | `TROPHY_AWARDED` (neu)       | —            | append             | `{ trophyId, trophyName, tier }` — Hinweis: `tier` kommt aus dem DB-Record (`prisma.userTrophy`), nicht aus der Runtime-Registry `TROPHIES`. Nach `awardTrophy()` muss der Tier-Wert aus dem DB-Ergebnis gelesen werden. |
| `streamPlanned` | `STREAM_PLANNED` (neu)       | —            | append             | `{ recipeId, recipeTitle, plannedAt, timezone }`                                                                                                                                                                         |
| `streamStarted` | `STREAM_STARTED` (existiert) | —            | append             | `{ twitchStreamId, title, gameName, recipeId, recipeTitle }` — Muss neu in `EventDataMap` und `EVENT_DEFINITIONS` aufgenommen werden. `STREAM_STARTED` ist bereits in `ACTIVITY_STRATEGIES` (persist.ts) registriert.    |

### Geänderte Events

| Event             | Änderung                                                                                                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `streamStarted`   | Food-Filter: nur feuern wenn `gameName === 'Food & Drink'`. Durch `fireEvent()` leiten statt direktem `createActivityLog()`. Metadata um `recipeId`/`recipeTitle` erweitern (aus neuestem PlannedStream). |
| `userRegistered`  | Anschliessen im Auth-Flow. Notification-Teil deaktivieren (nur Activity-Log).                                                                                                                             |
| `recipePublished` | Wird zum einzigen Codepfad für Rezept-Publish-Events (Konsolidierung).                                                                                                                                    |

### Privacy-Filterung

| ActivityType       | Privacy-Feld                                                                                                | Default |
| ------------------ | ----------------------------------------------------------------------------------------------------------- | ------- |
| `RECIPE_RATED`     | `ratingsPublic`                                                                                             | `true`  |
| `RECIPE_FAVORITED` | `favoritesPublic`                                                                                           | `true`  |
| `USER_FOLLOWED`    | `followsPublic`                                                                                             | `true`  |
| `RECIPE_COOKED`    | `cookedPublic`                                                                                              | `true`  |
| `TROPHY_AWARDED`   | `trophiesPublic` (neu)                                                                                      | `true`  |
| `STREAM_PLANNED`   | — (immer sichtbar)                                                                                          | —       |
| `STREAM_STARTED`   | — (immer sichtbar)                                                                                          | —       |
| `USER_REGISTERED`  | `showInActivity` (bestehendes Blanket-Filter, greift automatisch — kein zusätzlicher per-Type-Filter nötig) | —       |

---

## Architektur-Details

### 1. Rezept-Publish Konsolidierung

**Problem:** Drei Codepfade erzeugen `RECIPE_CREATED` Activities:

1. `recipeMutations.ts` — `createRecipe()` und `updateRecipe()` rufen direkt `createActivityLog()` auf
2. `recipeBulkActions.ts` — `updateRecipeStatus()` ruft direkt `createActivityLog()` auf, aber `bulkUpdateRecipeStatus()` nutzt `fireEvent()`
3. `recipeFormHelpers.ts` — `sendNotificationsToFollowers()` nutzt `fireEvent()` mit `skipActivity: true`

**Lösung:** Ein einziger Codepfad:

- `fireEvent('recipePublished')` erzeugt Activity + Follower-Notifications
- `recipeMutations.ts`: `createActivityLog()` Aufrufe entfernen, stattdessen `fireEvent('recipePublished')` nach erfolgreichem Publish
- `recipeBulkActions.ts`: `createActivityLog()` durch `fireEvent('recipePublished')` ersetzen
- `recipeFormHelpers.ts`: `sendNotificationsToFollowers()` prüfen — wenn `fireEvent` Follower-Notifications abdeckt, Funktion entfernen

**Knackpunkt:** `fireEvent` hat aktuell `recipientId` (1 Empfänger). Für Follower-Notifications brauchen wir entweder:

- (a) Multi-Recipient-Support in `fireEvent` (neues Feld `recipientIds: string[]` oder `broadcastToFollowers: true`)
- (b) `sendNotificationsToFollowers()` als separaten Aufruf behalten, aber Activity-Erzeugung in `fireEvent` konsolidieren

Empfehlung: Option (b) — `fireEvent` erzeugt die Activity, `sendNotificationsToFollowers()` bleibt für Follower-Benachrichtigungen. So bleibt `fireEvent` schlank und die Follower-Logik (alle Follower laden, pro Follower Notification + Preference-Check) ist klar getrennt.

### 2. TROPHY_AWARDED

- Prisma: `TROPHY_AWARDED` zu `ActivityType` enum
- Event-Config: `trophyAwarded` Definition ohne Notification
- `awardTrophy()` in `src/app/actions/trophies.ts`: `fireEvent('trophyAwarded')` aufrufen
- Activity-Utils: Icon `trophy` (neu in `ActivityIconName` Union + `ACTIVITY_ICON_MAP`), Farbe Gold, Template `"{user} hat die Trophäe '{trophyName}' ({tier}) erhalten"`
- Activity-Feed Hydration: Trophy-Name aus Metadata lesen (kein extra DB-Lookup nötig da Name in Metadata gespeichert)
- **Wichtig:** `ACTIVITY_DECOR` Eintrag ist Pflicht — ohne ihn filtert `activity-feed.ts` den Type stumm aus dem Feed (Zeile ~98: `if (!ACTIVITY_DECOR[log.type]) return false`)

### 3. STREAM_PLANNED

- Prisma: `STREAM_PLANNED` zu `ActivityType` enum
- Event-Config: `streamPlanned` Definition ohne Notification
- `planStream()` in `src/app/actions/twitch.ts`: `fireEvent('streamPlanned')` nach erfolgreichem `PlannedStream.create`
- Activity-Utils: Icon `calendar` (bereits in `ActivityIconName`), Farbe Twitch-Purple, Template `"{user} plant '{recipeTitle}' live zu kochen"`
- **Wichtig:** `ACTIVITY_DECOR` Eintrag ist Pflicht (gleicher Grund wie bei Trophy)
- Metadata enthält `plannedAt` — ActivityItem kann das Datum formatiert anzeigen

### 4. STREAM_STARTED Food-Filter

- `worker/queues/twitch-processor.ts` `processStreamOnline()`:
    - Twitch-API liefert bereits `gameName` — prüfen ob `gameName === 'Food & Drink'`
    - Wenn nicht Food & Drink: `TwitchStream.isLive` trotzdem updaten, aber KEINEN Activity-Log erzeugen
    - `createActivityLog()` ersetzen durch `fireEvent('streamStarted')`
    - Rezept aus neuestem `PlannedStream` des Users in Metadata aufnehmen

### 5. userRegistered Activity

- **Achtung:** Es gibt keine dedizierte Register-Route. Das Projekt nutzt better-auth mit einem Catch-all-Handler unter `src/app/api/auth/[...all]/route.ts`. Die Registrierung wird intern von better-auth über `betterAuth({ emailAndPassword: { enabled: true } })` in `src/lib/auth-server.ts` abgewickelt.
- **Integration:** Über better-auth's `databaseHooks` in der `betterAuth()` Config: `databaseHooks: { user: { create: { after: async (user) => { fireEvent('userRegistered', ...) } } } }`
- Event-Config anpassen: Notification-Teil entfernen (kein Welcome-Notification)
- Nur Activity-Log im globalen Feed

### 6. Shared href-Utility

Neue Funktionen in `src/lib/activity-utils.ts`:

```typescript
export function recipeHref(slug?: string | null, id?: string | null): string {
    if (slug) return `/recipe/${slug}`;
    if (id) return `/recipe/${id}`;
    return '/';
}

export function userHref(slug?: string | null, id?: string | null): string {
    if (slug) return `/user/${slug}`;
    if (id) return `/user/${id}`;
    return '/';
}
```

Refactoring in:

- `src/components/notifications/utils.ts` — `resolveNotificationHref()` nutzt `recipeHref()` / `userHref()`
- `src/components/features/activity/ActivityItem.tsx` — Link-Logik nutzt `recipeHref()` / `userHref()`

### 7. trophiesPublic Privacy-Feld

- Prisma: `trophiesPublic Boolean @default(true)` zu Profile-Model
- Migration: Default `true` für alle bestehenden Profile
- `src/lib/activity-feed.ts`: Privacy-Filter erweitern:
    ```
    if (user.profile?.trophiesPublic === false) hidden.add('TROPHY_AWARDED');
    ```
- Profile-Einstellungen UI: Toggle für "Trophäen im Activity-Feed anzeigen"

---

## Notification-System Bindungs-Übersicht (nach Änderungen)

| NotificationType (Enum) | Gefeuert? | Quelle                                                            |
| ----------------------- | --------- | ----------------------------------------------------------------- |
| `NEW_FOLLOWER`          | Ja        | `fireEvent('userFollowed')`                                       |
| `RECIPE_LIKE`           | Ja        | `fireEvent('recipeFavorited')`                                    |
| `RECIPE_COMMENT`        | Nein      | Später mit Comment-Feature                                        |
| `RECIPE_RATING`         | Ja        | `fireEvent('recipeRated')`                                        |
| `RECIPE_COOKED`         | Ja        | `fireEvent('recipeCooked')`                                       |
| `RECIPE_PUBLISHED`      | Ja        | `fireEvent('recipePublished')` + `sendNotificationsToFollowers()` |
| `WEEKLY_PLAN_REMINDER`  | Nein      | Feature nicht implementiert                                       |
| `SYSTEM`                | Ja        | Diverse direkte Aufrufe (Admin, Moderation, QR-Upload)            |

---

## Betroffene Dateien

| Datei                                               | Änderung                                                                                                 |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                              | `TROPHY_AWARDED`, `STREAM_PLANNED` zu ActivityType enum; `trophiesPublic` zu Profile                     |
| `src/lib/events/config.ts`                          | Event-Definitionen: `trophyAwarded`, `streamPlanned` (neu); `streamStarted`, `userRegistered` (anpassen) |
| `src/lib/activity-utils.ts`                         | Decor für `TROPHY_AWARDED` + `STREAM_PLANNED`; shared `recipeHref()` / `userHref()`                      |
| `src/lib/activity-feed.ts`                          | Privacy-Filter für `TROPHY_AWARDED` (`trophiesPublic`); Hydration für neue Types                         |
| `src/components/features/activity/ActivityItem.tsx` | Rendering neue Types + href-Utility nutzen                                                               |
| `src/components/notifications/utils.ts`             | `resolveNotificationHref()` refactoren mit href-Utility                                                  |
| `src/components/recipe/recipeMutations.ts`          | `createActivityLog()` entfernen → `fireEvent('recipePublished')`                                         |
| `src/components/recipe/recipeBulkActions.ts`        | `createActivityLog()` entfernen → `fireEvent('recipePublished')`                                         |
| `src/components/recipe/recipeFormHelpers.ts`        | Prüfen ob `sendNotificationsToFollowers()` vereinfacht werden kann                                       |
| `src/app/actions/trophies.ts`                       | `fireEvent('trophyAwarded')` hinzufügen                                                                  |
| `src/app/actions/twitch.ts`                         | `fireEvent('streamPlanned')` in `planStream()`                                                           |
| `src/lib/auth-server.ts`                            | `fireEvent('userRegistered')` in better-auth `databaseHooks.user.create.after`                           |
| `worker/queues/twitch-processor.ts`                 | Food-Filter + `fireEvent('streamStarted')` statt direktem `createActivityLog()`                          |

---

## Risiken & Mitigierung

| Risiko                                                                    | Mitigierung                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rezept-Publish Konsolidierung bricht Follower-Notifications               | `sendNotificationsToFollowers()` als separaten Aufruf behalten; nur Activity-Erzeugung konsolidieren. Hinweis: `bulkUpdateRecipeStatus` nutzt bereits dieses Muster (fireEvent + sendNotificationsToFollowers).                                                                           |
| `fireEvent` im Worker (twitch-processor) hat keinen Auth-Kontext          | `fireEvent` akzeptiert bereits `actorId` direkt — kein Session-Zugriff nötig                                                                                                                                                                                                              |
| `fireEvent` im Worker: `revalidatePath` ist ein No-Op                     | Worker läuft ausserhalb des Next.js Request-Kontexts. `revalidatePaths` darf im Worker-Aufruf NICHT gesetzt werden.                                                                                                                                                                       |
| `fireEvent().activity` ist immer `null`                                   | Activity-Erzeugung ist fire-and-forget (Promise nicht awaited, nur `.catch()`). Das ist kein neues Problem — die bisherigen direkten `createActivityLog()` Aufrufe nutzen das Ergebnis auch nicht. Aber Implementierer müssen wissen, dass `fireEvent` keinen Activity-Record zurückgibt. |
| Worker-Refactoring ändert Realtime-Event-Shape                            | Aktuell publiziert der Worker ein manuell konstruiertes Realtime-Event. Nach Umstellung auf `fireEvent` → `createActivityLog` wird das Event über `serializeActivityLog()` serialisiert — andere Payload-Struktur. Frontend-Listener (ActivityItem SSE) müssen getestet werden.           |
| Food-Filter blockiert legitimate Streams                                  | Twitch-Kategorie "Food & Drink" ist die einzige relevante Kategorie; andere Kategorien sind für KitchenPace nicht relevant                                                                                                                                                                |
| Migration `trophiesPublic` auf bestehende Profile                         | Default `true` — kein Breaking Change                                                                                                                                                                                                                                                     |
| `STREAM_STARTED` feuert im Worker async — `fireEvent` ist fire-and-forget | Bereits bestehende Architektur, kein neues Risiko                                                                                                                                                                                                                                         |
