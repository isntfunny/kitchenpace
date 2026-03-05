# KitchenPace Load Test - Setup Summary

## Created Files

### Core Test Files

- `k6/load-test.js` - Main load test script with selectable scenarios
- `k6/smoke-test.js` - Quick smoke test for verifying setup
- `k6/run-load-test.sh` - Save results to JSON + CSV + HTML report
- `k6/run-dashboard.sh` - Live web dashboard mode

### Configuration Files

- `k6/package.json` - npm scripts for various test scenarios
- `k6/.env.example` - Environment configuration template
- `k6/.gitignore` - Git ignore rules for results
- `k6/docker-compose.yml` - Docker setup for InfluxDB + Grafana monitoring

### Documentation

- `k6/README.md` - Comprehensive usage guide

### Grafana Integration

- `k6/grafana-datasources/datasource.yml` - InfluxDB datasource config
- `k6/grafana-dashboards/` - Dashboard directory (empty, for custom dashboards)

### Results Directory

- `k6/results/` - Output directory for test results (gitignored)

## Test Features

### User Behavior Simulation

- ✅ Opens homepage first
- ✅ Random navigation (40% recipes, 30% recipe details, 15% user profiles)
- ✅ Search functionality (10% of users)
- ✅ Filter usage (5% of users)
- ✅ Realistic think times between actions

### Load Phases

1. **Light**: 10 VUs for 4 minutes
2. **Medium**: 100 VUs for 7 minutes
3. **Heavy**: 1000 VUs for 11 minutes

### Output

- HTML report with graphs
- JSON data export
- Summary statistics
- Custom metrics (recipe views, user views, searches, filters)

## Quick Commands

```bash
# Install k6 first: https://k6.io/docs/get-started/installation/

# LIVE WEB DASHBOARD (opens browser with real-time metrics)
./k6/run-dashboard.sh                    # All scenarios
./k6/run-dashboard.sh heavy              # Only heavy load
./k6/run-dashboard.sh granular           # Find breaking point
./k6/run-dashboard.sh prod https://kitchenpace.app  # Production
npm run test:load:dashboard              # Via npm

# SAVE RESULTS TO FILES (JSON + CSV + HTML report)
npm run test:load                        # All scenarios
npm run test:load:light                  # Only 10 users (~2 min)
npm run test:load:heavy                  # Only 1000 users (~7 min)
npm run test:load:granular               # Find breaking point (~27 min)
npm run test:load:prod                   # Production

# Quick smoke test
npm run test:load:smoke
```

## Scenario Selection

Choose which load test to run:

| Scenario   | Command                      | Users   | Duration | Use Case                |
| ---------- | ---------------------------- | ------- | -------- | ----------------------- |
| `light`    | `npm run test:load:light`    | 10      | ~2 min   | Quick verification      |
| `medium`   | `npm run test:load:medium`   | 100     | ~4 min   | Moderate load           |
| `heavy`    | `npm run test:load:heavy`    | 1000    | ~7 min   | Stress test             |
| `granular` | `npm run test:load:granular` | 10→1000 | ~27 min  | **Find breaking point** |
| `all`      | `npm run test:load`          | 10→1000 | ~13 min  | Complete test           |

### The Granular Scenario (Recommended for Analysis)

Find exactly where your system breaks:

```bash
# Watch the dashboard as load increases step by step
./k6/run-dashboard.sh granular
```

**Pattern:** 10→20→30→50→100→200→500→1000 users, each held for 2-3 minutes

You'll see the exact user count where errors start appearing!

## Two Modes Explained

### 1. Live Web Dashboard Mode

- **Command:** `./k6/run-dashboard.sh [scenario]` or `npm run test:load:dashboard`
- **What it does:** Opens a browser with real-time metrics during the test
- **Pros:** See results instantly, beautiful charts, no files needed
- **Cons:** Dashboard closes when test ends, no persistent data
- **Best for:** Development, quick tests, monitoring while running

### 2. Save Results Mode

- **Command:** `./k6/run-load-test.sh [scenario]` or `npm run test:load`
- **What it does:** Saves JSON + CSV data, generates HTML report after test
- **Pros:** Keep results forever, analyze later, share reports, CI/CD ready
- **Cons:** No live view during test
- **Best for:** CI/CD pipelines, detailed analysis, historical comparison

## Integration

Added to root `package.json`:

- `test:load` - Run all scenarios
- `test:load:light` - Only 10 users
- `test:load:medium` - Only 100 users
- `test:load:heavy` - Only 1000 users
- `test:load:granular` - Find breaking point
- `test:load:smoke` - Quick smoke test
- `test:load:prod` - Production load test

## Next Steps

1. Install k6: https://k6.io/docs/get-started/installation/
2. Update `k6/load-test.js` with actual recipe slugs and user IDs from your database
3. Run smoke test to verify: `npm run test:load:smoke`
4. Run full test: `npm run test:load`
5. Open generated HTML report in browser

## Troubleshooting

### "invalid output type 'html'"

Your version of k6 doesn't support the HTML output type natively. Use one of these alternatives:

**Option 1: Use web-dashboard (recommended - LIVE only)**

⚠️ **Wichtig:** Web-Dashboard funktioniert nur WÄHREND des Tests, nicht nachträglich!

```bash
# Während der Test läuft - öffnet automatisch Browser
k6 run --out web-dashboard k6/load-test.js
```

Das Dashboard zeigt Live-Metriken und schließt sich, wenn der Test endet.

**Option 2: Generate HTML report from JSON (für nachträgliche Analyse)**

Wenn der Test schon beendet ist und du die Ergebnisse analysieren willst:

```bash
# Run test with JSON output
k6 run --out json=k6/results/results.json k6/load-test.js

# Generate HTML report nachträglich
node k6/generate-report.js k6/results/results.json k6/results/report.html
```

**Option 3: Use CSV output**

```bash
k6 run --out csv=k6/results/results.csv k6/load-test.js
# Then import the CSV into Excel or Google Sheets
```

### "thresholds on metrics have been crossed"

Der Test zeigt Fehler weil die Performance-Thresholds überschritten wurden. Das ist **erwartet** bei hoher Last (1000 User)!

Die Ergebnisse werden trotzdem gespeichert in:

- `k6/results/results_*.json`
- `k6/results/results_*.csv`
- `k6/results/summary_*.json`

Du kannst danach trotzdem den HTML Report generieren:

```bash
node k6/generate-report.js k6/results/results_TIMESTAMP.json k6/results/report_TIMESTAMP.html
```

## Customization

Edit `k6/load-test.js` to:

- Change user behavior probabilities
- Adjust load levels and durations
- Update sample data (recipe slugs, user IDs)
- Add custom metrics
- Modify thresholds
