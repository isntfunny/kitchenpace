# KitchenPace Lean Release Guide

Practical release and launch protocol for a founder-led team with limited budget.

## Goals

- Ship safely without slowing the team down.
- Catch obvious breakage before users do.
- Keep launch feedback organized enough to act on.
- Make rollback decisions fast and unemotional.

## Lean Operating Principles

- Prefer small releases over big-bang launches.
- Only launch what the team can observe and support.
- Use existing tools first: GitHub, shared docs, Sentry, product analytics, email.
- Treat launch as a 2-week learning window, not a one-day event.

## Release Types

| Type   | Use when                                                            | Approval                                                   |
| ------ | ------------------------------------------------------------------- | ---------------------------------------------------------- |
| Patch  | Copy fixes, low-risk bug fix, non-critical UI fix                   | Founder + release captain                                  |
| Minor  | Noticeable feature change, onboarding change, recipe flow UX change | Founder + release captain + QA owner                       |
| Hotfix | Production bug affecting core flows                                 | Whoever is on point can ship, founder informed immediately |

## Core User Flows That Must Work

These are the only flows that can block launch.

1. Visitor can load home page and recipe detail page.
2. User can sign up or sign in.
3. User can create or edit a recipe.
4. Recipe flow diagram renders on desktop and mobile.
5. Search can return recipe results.
6. Errors are visible in monitoring.

## Internal Go/No-Go Checklist

Run this 24 hours before launch and again 30 minutes before release.

### Go if all are true

- [ ] Production build succeeds from current release branch.
- [ ] Database migrations are tested on staging or a recent copy.
- [ ] Homepage, auth, recipe detail, recipe creation, and search pass smoke test.
- [ ] Mobile check completed on at least 1 real phone and 1 desktop browser.
- [ ] Error tracking is live and tested with a known test error.
- [ ] Founder can access admin/support accounts.
- [ ] Backup or rollback path is confirmed for app and database.
- [ ] Release notes are written in plain language.
- [ ] One person is assigned as release captain for the day.

### No-Go triggers

- [ ] Sign-in/sign-up is broken or flaky.
- [ ] Recipe pages fail to load for some users.
- [ ] New migration cannot be safely rolled back or repaired.
- [ ] P0 or P1 bugs are open without workaround.
- [ ] Monitoring is down, missing, or clearly incomplete.
- [ ] Team does not have capacity to watch the app for the next 4-6 hours.

If any no-go item is true, delay launch. Fix, retest, and pick the next release slot.

## Soft Launch Plan

Keep the first release intentionally small.

### Audience

- 10-30 friendly users: friends, family, past coworkers, waitlist contacts.
- Prefer people who will actually click around and reply.

### Soft launch window

- Day 1-3: invite the first 10 users.
- Day 4-7: expand to 20-30 users if no major issues appear.
- Public launch only after core flows stay stable for 3 straight days.

### What to ask testers

- Create an account.
- Open 2-3 recipes.
- Try search.
- Try one recipe flow on mobile.
- Reply with: what confused you, what broke, what felt useful.

### Success criteria to exit soft launch

- No unresolved P0 bugs.
- P1 bugs have either been fixed or have a clear workaround.
- At least 5 users complete the main flow without founder assistance.
- Founder sees enough product signal to explain why users would come back.

## Daily Release Roles

One person may hold multiple roles. Name the person for each role before every release.

| Role            | Main job                                            | Typical owner                   |
| --------------- | --------------------------------------------------- | ------------------------------- |
| Release captain | Runs checklist, decides hold/ship, posts status     | Founder                         |
| Deployer        | Merges, deploys, watches build/migrations           | Technical founder or lead dev   |
| QA owner        | Runs smoke tests on staging/prod                    | Developer or trusted contractor |
| Support owner   | Watches email, DMs, bug form, captures user reports | Founder                         |
| Scribe          | Writes incident notes, bug list, release notes      | Whoever is least busy           |

### Release-day handoff

- 30 min before: release captain confirms scope and checklist.
- At release: deployer ships, QA owner starts smoke test immediately.
- First 2 hours after: support owner and release captain stay reachable.
- End of day: scribe posts what shipped, what broke, what changed tomorrow.

## Bug Triage Process

Keep one backlog only. Do not split bugs across DMs, email, and notes without logging them.

### Intake fields

- Date/time
- Reporter
- URL or screen
- Steps to reproduce
- Expected result
- Actual result
- Screenshot if available
- Severity
- Owner
- Status

### Severity levels

| Severity | Meaning                                                           | Response target           |
| -------- | ----------------------------------------------------------------- | ------------------------- |
| P0       | App unusable, data loss, auth failure, broken payments, site down | Stop work and respond now |
| P1       | Core flow broken for many users, no workaround                    | Same day                  |
| P2       | Important but workaround exists, partial breakage                 | 1-3 days                  |
| P3       | Minor UI/content bug, low-risk polish                             | Batch into later release  |

### Triage rules

- P0/P1 go to top of the queue immediately.
- If a bug affects launch messaging or trust, raise severity by one level.
- If it is a feature request disguised as a bug, relabel it before estimating.
- Close duplicate reports under one master bug.

### Bug review cadence during launch

- 10:00: quick review of new bugs.
- 14:00: decide what ships today.
- 18:00: confirm fixes, defer non-critical work.

## Lean Launch Day Protocol

### T-60 to T-30 minutes

- Freeze non-release changes.
- Confirm release branch/commit.
- Confirm rollback target.
- Check monitoring dashboards.

### T-30 to T-0

- Deploy to production.
- Run smoke test on live site.
- Verify Sentry, logs, and analytics are receiving events.

### T+0 to T+120 minutes

- Watch sign-in, recipe page loads, search, and creation flows.
- Reply to first user issues manually and quickly.
- Do not ship non-critical improvements during this window.

### T+120 minutes onward

- Fix P0/P1 only.
- Batch P2/P3 into end-of-day review.
- Post a short internal update every 2-3 hours.

## Rollback And Incident Plan

Rollback is a product decision, not a personal failure.

### Roll back immediately if

- Users cannot sign in or sign up.
- Recipe detail pages fail widely.
- Data corruption or destructive writes are suspected.
- Error volume spikes sharply and the cause is unclear.
- The team cannot explain whether user data is safe.

### Rollback steps

1. Release captain declares incident in the team channel.
2. Deployer pauses further releases.
3. Roll back app to the last known good version.
4. If database changes are involved, use the pre-decided repair path; do not improvise under pressure.
5. QA owner reruns smoke tests on the rolled-back version.
6. Support owner posts a short user-facing note if users were affected.
7. Scribe records timeline, impact, root cause guess, and next action.

### Incident severity

- SEV1: Site down, auth broken, data risk. Founder and deployer drop everything.
- SEV2: Major feature broken, workaround exists. Fix same day.
- SEV3: Limited bug or degraded experience. Schedule normally.

### User-facing incident note template

```text
We found an issue affecting [feature]. We have paused changes and are rolling back to a stable version now. If you were affected, please retry in [time window]. We will post another update once confirmed fixed.
```

## First 2 Weeks Operating Rhythm

This is the minimum viable operating cadence for a small team.

### Daily rhythm

| Time  | Action                                                        |
| ----- | ------------------------------------------------------------- |
| 09:00 | 15-minute launch standup: bugs, metrics, today’s ship/no-ship |
| 10:00 | Triage new user feedback and monitoring alerts                |
| 13:00 | Ship window for safe fixes                                    |
| 16:00 | Review production health and support inbox                    |
| 17:30 | Post end-of-day note: shipped, blocked, top learnings         |

### Week 1 focus

- Protect uptime and core flows.
- Fix P0/P1 fast.
- Personally onboard early users if needed.
- Write down repeated confusion points.
- Ignore vanity metrics unless they reveal a product problem.

### Week 2 focus

- Keep shipping bug fixes, but start bundling small UX improvements.
- Review which support questions repeat.
- Tighten onboarding, empty states, and copy.
- Decide whether retention signal is strong enough for broader promotion.

## Minimum Metrics To Watch

Do not over-instrument. Track only what helps decisions.

- Site uptime
- Sign-up success rate
- Sign-in failure count
- Recipe detail page errors
- Recipe creation success/failure count
- Search usage and no-result rate
- Number of active bug reports by severity
- Number of user replies with qualitative feedback

## Lean Tooling Stack

Use the cheapest workable setup.

- Monitoring: Sentry
- Analytics: simple product analytics or basic event logging
- Status tracking: GitHub issues or one shared Notion page
- Support inbox: founder email + one tagged folder
- Release log: one markdown file in repo or shared doc

## Weekly Review Template

Answer these every Friday for the first month.

1. What broke repeatedly?
2. What did users understand immediately?
3. Where did users need founder help?
4. Which bug classes are still escaping before release?
5. Should next week optimize reliability, onboarding, or acquisition?

## Practical Defaults For KitchenPace

- Release no more than once per day during the first week unless shipping a hotfix.
- Prefer weekday morning releases so the team can observe them.
- Do not launch a new major feature and a risky schema change on the same day.
- Keep the founder available for support during the first 2 hours after each release.
- If unsure whether to ship, choose stability and push 24 hours.

## Definition Of A Good Lean Launch

A good launch is not quiet because nobody came. It is quiet because the app stayed usable, the team learned quickly, and fixes shipped without drama.
