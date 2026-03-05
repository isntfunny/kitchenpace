# KitchenPace Load Testing with k6

This directory contains k6 load testing scripts for the KitchenPace application.

## Test Scenarios

The load test simulates real user behavior by:

1. **Opening the homepage** - Every virtual user starts here
2. **Random navigation** - Users randomly navigate to different pages:
    - Recipe list page (`/recipes`)
    - Individual recipe pages (`/recipe/{id}`)
    - User profiles (`/user/{id}`)
3. **Search functionality** - 10% of users perform searches with random terms
4. **Filter usage** - 5% of users apply filters (category, time, rating)

## Load Phases

The test runs three progressive phases:

1. **Light Load** (10 concurrent users)
    - Duration: 4 minutes (ramp up, hold, ramp down)
    - Simulates normal traffic

2. **Medium Load** (100 concurrent users)
    - Duration: 7 minutes
    - Simulates peak traffic

3. **Heavy Load** (1000 concurrent users)
    - Duration: 11 minutes
    - Stress test for high traffic scenarios

**Total Test Duration:** ~24 minutes

## Quick Start

### Prerequisites

Install k6:

```bash
# macOS
brew install k6

# Ubuntu/Debian
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows (with chocolatey)
choco install k6
```

### Run the Test

#### Option 1: Real-time Web Dashboard (Recommended for Development)

**Öffnet automatisch einen Browser mit Live-Dashboard während des Tests:**

```bash
# Using the convenience script
./k6/run-dashboard.sh

# Or directly with k6
k6 run --out web-dashboard k6/load-test.js --env BASE_URL=http://localhost:3000

# Against production
./k6/run-dashboard.sh prod https://kitchenpace.app
```

✅ **Vorteile:**

- Siehst Live-Metriken während der Test läuft
- Autmatischer Browser-Tab
- Keine Dateien nötig
- Sofortige Fehlererkennung

#### Option 2: Shell Script (Für Reports & CI/CD)

**Speichert JSON + CSV + HTML Report für spätere Analyse:**

```bash
# Run against local development server
./k6/run-load-test.sh

# Run against production
./k6/run-load-test.sh prod https://kitchenpace.app

# Run against custom URL
./k6/run-load-test.sh dev http://localhost:3001
```

✅ **Vorteile:**

- Behält Ergebnisse zum späteren Analysieren
- Funktioniert auch auf Servern ohne Browser
- Perfekt für CI/CD Pipelines

#### Option 3: npm Scripts

```bash
# Quick smoke test
npm run test:smoke

# Run specific scenarios
npm run test:load:light      # Only 10 users (~2 min)
npm run test:load:medium     # Only 100 users (~4 min)
npm run test:load:heavy      # Only 1000 users (~7 min)
npm run test:load:granular   # Slow ramp to find breaking point (~27 min)

# Run with JSON output (generates report afterward)
npm run test:json

# Generate HTML report from JSON results
npm run report
```

#### Option 4: Direct k6 Command

```bash
# Basic run
k6 run k6/load-test.js --env BASE_URL=http://localhost:3000

# With HTML report
k6 run --out html=k6/results/report.html k6/load-test.js --env BASE_URL=http://localhost:3000

# With JSON output
k6 run --out json=k6/results/results.json k6/load-test.js --env BASE_URL=http://localhost:3000

# With InfluxDB + Grafana (for real-time monitoring)
k6 run --out influxdb=http://localhost:8086/k6 k6/load-test.js --env BASE_URL=http://localhost:3000
```

## Output Files

After running the test, you'll find:

- `k6/results/results_{timestamp}.json` - Raw test data in JSON format
- `k6/results/results_{timestamp}.csv` - Test data in CSV format (import to Excel)
- `k6/results/summary_{timestamp}.json` - Summary statistics
- `k6/results/report_{timestamp}.html` - Generated HTML report (requires `generate-report.js`)

### Viewing Results

**Option 1: Real-time Web Dashboard (Recommended)**

```bash
# Run test with live dashboard
k6 run --out web-dashboard k6/load-test.js

# This will open a browser window automatically with real-time metrics
```

**Option 2: Generated HTML Report**

```bash
# After running with JSON output, generate HTML report
node k6/generate-report.js k6/results/results.json k6/results/report.html

# Open the report
open k6/results/report.html        # macOS
xdg-open k6/results/report.html    # Linux
start k6/results/report.html       # Windows
```

**Option 3: View Raw Data**

```bash
# Pretty print JSON results
cat k6/results/results.json | jq .

# Or open CSV in Excel/Google Sheets
open k6/results/results.csv
```

## Metrics Collected

### Default k6 Metrics

- `http_req_duration` - HTTP request duration
- `http_reqs` - Total HTTP requests
- `vus` - Virtual users
- `iterations` - Test iterations completed

### Custom Metrics

- `page_load_time` - Page load duration
- `errors` - Error rate
- `recipe_views` - Number of recipe pages viewed
- `user_views` - Number of user profiles viewed
- `search_queries` - Number of searches performed
- `filter_uses` - Number of times filters were applied

## Scenario Selection

You can run specific scenarios instead of all at once:

### Available Scenarios

| Scenario   | Users   | Duration | Description                                         |
| ---------- | ------- | -------- | --------------------------------------------------- |
| `light`    | 10      | ~2 min   | Quick test to verify everything works               |
| `medium`   | 100     | ~4 min   | Moderate load test                                  |
| `heavy`    | 1000    | ~7 min   | High stress test                                    |
| `granular` | 10→1000 | ~27 min  | **Find breaking point** - slow ramp with hold times |
| `all`      | 10→1000 | ~13 min  | All phases sequentially (default)                   |

### Usage

```bash
# Run specific scenario with live dashboard
./k6/run-dashboard.sh heavy

# Run granular analysis with file output
./k6/run-load-test.sh granular

# Or with npm
npm run test:load:granular
```

### The Granular Scenario (Finding Breaking Point)

Perfect for finding **exactly** where your system breaks:

```bash
./k6/run-dashboard.sh granular
```

**Ramp Pattern:**

1. 10 users for 2 min (baseline)
2. 20 users for 2 min
3. 30 users for 2 min
4. 50 users for 2 min
5. 100 users for 2 min
6. 200 users for 2 min
7. 500 users for 3 min
8. 1000 users for 3 min

Watch the dashboard - you'll see exactly at which user count the error rate spikes!

## Thresholds

The test enforces these performance thresholds:

- **95th percentile response time** < 10 seconds
- **Error rate** < 30%

Note: Thresholds are relaxed to prevent test failure - you can analyze the actual results afterward.

## Test Configuration

Edit `k6/load-test.js` to customize:

### Adjust Load Levels

```javascript
export const options = {
    scenarios: {
        light: {
            stages: [
                { duration: '1m', target: 10 }, // Ramp to 10 users
                { duration: '2m', target: 10 }, // Hold for 2 minutes
                { duration: '1m', target: 0 }, // Ramp down
            ],
        },
        // ... adjust other stages
    },
};
```

### Change Test Duration

Modify the `duration` values in the stages array for each scenario.

### Adjust User Think Times

Each virtual user has a **personality profile** that affects their reading speed:

```javascript
const userProfiles = [
    { name: 'speed', weight: 0.2, minMs: 200, maxMs: 800 }, // 20% speed surfers
    { name: 'normal', weight: 0.5, minMs: 1500, maxMs: 3500 }, // 50% normal readers
    { name: 'careful', weight: 0.2, minMs: 4000, maxMs: 8000 }, // 20% careful readers
    { name: 'slow', weight: 0.1, minMs: 8000, maxMs: 15000 }, // 10% slow/distracted
];
```

**Key features:**

- **Millisecond precision**: Not just seconds, but precise ms timing
- **Consistent per user**: VU #5 is always a "speed" user across all iterations
- **Gaussian distribution**: Most users cluster around average, few extremes
- **Profile-based scaling**: Actions are faster/slower based on user type

To modify timing for a specific action:

```javascript
variableSleep(3000, 8000); // Base: 3-8s, but scaled by user profile
```

### Adjust User Behavior

Modify the probabilities in the `runTest()` function:

```javascript
if (rand < 0.4) {
    // 40% chance to browse recipes
    navigateRecipes();
} else if (rand < 0.7) {
    // 30% chance to view a recipe
    viewRandomRecipe();
}
// ... etc
```

### Update Sample Data

Edit the sample arrays at the top of the file:

```javascript
const sampleRecipeSlugs = ['slug1', 'slug2', 'slug3'];
const sampleUserIds = ['user1', 'user2', 'user3'];
const searchTerms = ['term1', 'term2'];
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Load Test

on:
    schedule:
        - cron: '0 2 * * *' # Run daily at 2 AM
    workflow_dispatch:

jobs:
    load-test:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v3

            - name: Setup k6
              uses: grafana/setup-k6-action@v1

            - name: Run load test
              run: |
                  k6 run --out html=results/report.html k6/load-test.js \
                    --env BASE_URL=${{ secrets.PROD_URL }}

            - name: Upload results
              uses: actions/upload-artifact@v3
              with:
                  name: load-test-results
                  path: results/
```

## Advanced Usage

### Real-time Monitoring with InfluxDB + Grafana

1. Start InfluxDB and Grafana:

```bash
docker run -d -p 8086:8086 influxdb:1.8
```

2. Run test with InfluxDB output:

```bash
k6 run --out influxdb=http://localhost:8086/k6 k6/load-test.js
```

3. View results in Grafana at `http://localhost:3000`

### Distributed Load Testing with k6 Cloud

```bash
k6 cloud k6/load-test.js --env BASE_URL=https://kitchenpace.app
```

### Running Specific Scenarios Only

```bash
# Run only light load test
k6 run --env K6_SCENARIO=light k6/load-test.js

# Run only heavy load test
k6 run --env K6_SCENARIO=heavy k6/load-test.js
```

## Troubleshooting

### High Error Rates

If you see high error rates:

1. Check if the server is running: `curl http://localhost:3000`
2. Verify the BASE_URL is correct
3. Check server logs for errors
4. Increase thresholds if testing a slow environment

### Out of Memory

For very high load (1000+ users):

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
k6 run k6/load-test.js
```

### Connection Timeouts

If experiencing timeouts:

1. Check network connectivity
2. Increase k6 timeout settings
3. Verify firewall rules
4. Check server capacity

## Best Practices

1. **Always test in a non-production environment first**
2. **Monitor server resources** during tests (CPU, memory, DB connections)
3. **Start with small loads** and gradually increase
4. **Run tests during off-peak hours** if testing production
5. **Review and act on results** - fix performance issues before increasing load

## Support

For issues or questions:

- k6 Documentation: https://k6.io/docs/
- Grafana k6: https://grafana.com/docs/k6/
- KitchenPace Issues: Create an issue in the project repository
