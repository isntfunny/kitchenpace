# Bring! integration — KUC-89

User approved the in-chat design and explicitly requested a worktree and implementation.

## Product

Bring! owns shopping lists. KochTakt connects one Bring account per signed-in user, displays existing lists, edits item specifications, completes/restores/removes items, and imports selected recipe ingredients at the chosen serving count. The first connection requires explicit default-list selection. Disconnect removes credentials without altering remote lists.

The recipe ingredient card has “Auf die Einkaufsliste” immediately below servings. A responsive dialog retains selections while connecting inline. Anonymous users preserve the pending selection in session storage through sign-in. /shopping-list provides a list picker, add form, open and purchased items, and refresh. /profile/integrations contains connection management. Personal/mobile navigation, profile quick links and ingredient landing pages expose entries.

## Boundaries

Use the same Bring REST v2 endpoints as discord-timeout-game. Implement a narrow fetch adapter because the installed reference library does not check mutation HTTP status or impose timeouts. Encode form bodies with URLSearchParams. Only exact catalog matches map ingredient names; free text remains unchanged otherwise. Unknown amounts remain text. Existing items are skipped during bulk imports; deliberate editing is separate. No automatic summing of existing remote quantities.

Credentials encrypted using AES-256-GCM with a separate 32-byte BRING_ENCRYPTION_KEY (base64) provisioned via Infisical. Encryption binds records to KochTakt user IDs. No credentials or remote error bodies in logs/responses. All operations authenticate locally and check list membership remotely. Fresh remote login per server operation initially avoids stale global sessions; add caching only after measurement.

Operation IDs persist bulk outcomes and prevent replay after an ambiguous response. Partial failures can be retried with a new operation ID after reading current items; existing items are never overwritten. Pending operations are not silently replayed. Requests validate item count/length and apply user rate limits. Data is private/no-store. Poll only visible list views and refresh on focus.

No list creation/renaming/deletion or membership management, no dual local list synchronization, no production deployment. Live acceptance needs a dedicated Bring test account and configured encryption key. Automated tests use synthetic HTTP responses and local fixtures, never production accounts.
