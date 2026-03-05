#!/usr/bin/env node

/**
 * Generate HTML report from k6 JSON results
 * Usage: node generate-report.js <input.json> <output.html> [timestamp]
 */

const fs = require('fs');
const path = require('path');

function generateReport(jsonFile, htmlFile, timestamp) {
    if (!fs.existsSync(jsonFile)) {
        console.error(`Error: JSON file not found: ${jsonFile}`);
        process.exit(1);
    }

    console.log(`Reading JSON data from: ${jsonFile}`);

    // Read and parse JSON lines (k6 outputs one JSON object per line)
    const lines = fs.readFileSync(jsonFile, 'utf8').trim().split('\n');
    const data = lines
        .map((line) => {
            try {
                return JSON.parse(line);
            } catch (e) {
                return null;
            }
        })
        .filter(Boolean);

    // Calculate metrics
    const httpRequests = data.filter((d) => d.type === 'Point' && d.metric === 'http_req_duration');
    const errors = data.filter((d) => d.type === 'Point' && d.metric === 'errors');
    const checks = data.filter((d) => d.type === 'Point' && d.metric === 'checks');

    // Group by URL
    const urlStats = {};
    httpRequests.forEach((req) => {
        const url = req.data.tags?.name || req.data.tags?.url || 'unknown';
        if (!urlStats[url]) {
            urlStats[url] = { count: 0, times: [], errors: 0 };
        }
        urlStats[url].count++;
        urlStats[url].times.push(req.data.value);
    });

    // Calculate statistics for each URL
    const urlSummary = Object.entries(urlStats).map(([url, stats]) => {
        const times = stats.times.sort((a, b) => a - b);
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const min = times[0];
        const max = times[times.length - 1];
        const p50 = times[Math.floor(times.length * 0.5)];
        const p95 = times[Math.floor(times.length * 0.95)];
        const p99 = times[Math.floor(times.length * 0.99)];

        return {
            url,
            count: stats.count,
            avg: avg.toFixed(2),
            min: min.toFixed(2),
            max: max.toFixed(2),
            p50: p50.toFixed(2),
            p95: p95.toFixed(2),
            p99: p99.toFixed(2),
        };
    });

    // Overall statistics
    const allTimes = httpRequests.map((r) => r.data.value).sort((a, b) => a - b);
    const totalRequests = httpRequests.length;
    const totalErrors = errors.filter((e) => e.data.value > 0).length;
    const errorRate = totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(2) : 0;

    const overallStats =
        allTimes.length > 0
            ? {
                  avg: (allTimes.reduce((a, b) => a + b, 0) / allTimes.length).toFixed(2),
                  min: allTimes[0].toFixed(2),
                  max: allTimes[allTimes.length - 1].toFixed(2),
                  p50: allTimes[Math.floor(allTimes.length * 0.5)].toFixed(2),
                  p95: allTimes[Math.floor(allTimes.length * 0.95)].toFixed(2),
                  p99: allTimes[Math.floor(allTimes.length * 0.99)].toFixed(2),
              }
            : { avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };

    // Generate HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KitchenPace Load Test Report - ${timestamp || new Date().toISOString()}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
            margin-bottom: 30px;
            border-radius: 10px;
        }
        h1 { font-size: 2.5em; margin-bottom: 10px; }
        .subtitle { opacity: 0.9; font-size: 1.1em; }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .metric-card {
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .metric-card h3 {
            color: #667eea;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }
        .metric-value {
            font-size: 2.5em;
            font-weight: bold;
            color: #333;
        }
        .metric-unit {
            font-size: 0.5em;
            color: #666;
        }
        .error-rate { color: ${errorRate > 5 ? '#e74c3c' : errorRate > 1 ? '#f39c12' : '#27ae60'}; }
        .section {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        .section h2 {
            color: #667eea;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #eee;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        th {
            background: #f8f9fa;
            font-weight: 600;
            color: #667eea;
        }
        tr:hover { background: #f8f9fa; }
        .status-success { color: #27ae60; }
        .status-warning { color: #f39c12; }
        .status-error { color: #e74c3c; }
        .chart-container {
            height: 300px;
            margin: 20px 0;
            background: #f8f9fa;
            border-radius: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
        }
        .footer {
            text-align: center;
            padding: 30px;
            color: #666;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🚀 KitchenPace Load Test Report</h1>
            <div class="subtitle">Generated on ${new Date().toLocaleString()}</div>
        </header>

        <div class="metrics-grid">
            <div class="metric-card">
                <h3>Total Requests</h3>
                <div class="metric-value">${totalRequests.toLocaleString()}</div>
            </div>
            <div class="metric-card">
                <h3>Error Rate</h3>
                <div class="metric-value ${errorRate > 5 ? 'status-error' : errorRate > 1 ? 'status-warning' : 'status-success'}">${errorRate}%</div>
            </div>
            <div class="metric-card">
                <h3>Average Response Time</h3>
                <div class="metric-value">${overallStats.avg}<span class="metric-unit">ms</span></div>
            </div>
            <div class="metric-card">
                <h3>95th Percentile</h3>
                <div class="metric-value">${overallStats.p95}<span class="metric-unit">ms</span></div>
            </div>
        </div>

        <div class="section">
            <h2>📊 Response Time Statistics</h2>
            <table>
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Value (ms)</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Minimum</td>
                        <td>${overallStats.min}</td>
                        <td class="status-success">✓</td>
                    </tr>
                    <tr>
                        <td>Average</td>
                        <td>${overallStats.avg}</td>
                        <td class="${parseFloat(overallStats.avg) < 1000 ? 'status-success' : 'status-warning'}">${parseFloat(overallStats.avg) < 1000 ? '✓ Good' : '⚠ Slow'}</td>
                    </tr>
                    <tr>
                        <td>Maximum</td>
                        <td>${overallStats.max}</td>
                        <td class="${parseFloat(overallStats.max) < 5000 ? 'status-success' : 'status-error'}">${parseFloat(overallStats.max) < 5000 ? '✓' : '✗ Too High'}</td>
                    </tr>
                    <tr>
                        <td>50th Percentile (Median)</td>
                        <td>${overallStats.p50}</td>
                        <td class="status-success">✓</td>
                    </tr>
                    <tr>
                        <td>95th Percentile</td>
                        <td>${overallStats.p95}</td>
                        <td class="${parseFloat(overallStats.p95) < 5000 ? 'status-success' : 'status-error'}">${parseFloat(overallStats.p95) < 5000 ? '✓ Good' : '✗ Too High'}</td>
                    </tr>
                    <tr>
                        <td>99th Percentile</td>
                        <td>${overallStats.p99}</td>
                        <td class="${parseFloat(overallStats.p99) < 5000 ? 'status-success' : 'status-warning'}">${parseFloat(overallStats.p99) < 5000 ? '✓' : '⚠ High'}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>🔗 Endpoint Performance</h2>
            <table>
                <thead>
                    <tr>
                        <th>Endpoint</th>
                        <th>Requests</th>
                        <th>Avg (ms)</th>
                        <th>Min (ms)</th>
                        <th>Max (ms)</th>
                        <th>p50 (ms)</th>
                        <th>p95 (ms)</th>
                    </tr>
                </thead>
                <tbody>
                    ${urlSummary
                        .map(
                            (url) => `
                    <tr>
                        <td>${url.url}</td>
                        <td>${url.count}</td>
                        <td>${url.avg}</td>
                        <td>${url.min}</td>
                        <td>${url.max}</td>
                        <td>${url.p50}</td>
                        <td>${url.p95}</td>
                    </tr>
                    `,
                        )
                        .join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>📈 Performance Summary</h2>
            <p><strong>Test Status:</strong> <span class="${errorRate > 10 || parseFloat(overallStats.p95) > 5000 ? 'status-error' : 'status-success'}">${errorRate > 10 || parseFloat(overallStats.p95) > 5000 ? '❌ FAILED' : '✅ PASSED'}</span></p>
            <br>
            <p><strong>Thresholds:</strong></p>
            <ul style="margin-left: 20px; margin-top: 10px;">
                <li>Error Rate &lt; 10%: <span class="${errorRate < 10 ? 'status-success' : 'status-error'}">${errorRate < 10 ? '✓ PASS' : '✗ FAIL'}</span> (${errorRate}%)</li>
                <li>95th Percentile &lt; 5000ms: <span class="${parseFloat(overallStats.p95) < 5000 ? 'status-success' : 'status-error'}">${parseFloat(overallStats.p95) < 5000 ? '✓ PASS' : '✗ FAIL'}</span> (${overallStats.p95}ms)</li>
                <li>Average Response &lt; 1000ms: <span class="${parseFloat(overallStats.avg) < 1000 ? 'status-success' : 'status-warning'}">${parseFloat(overallStats.avg) < 1000 ? '✓ PASS' : '⚠ WARNING'}</span> (${overallStats.avg}ms)</li>
            </ul>
        </div>

        <div class="footer">
            <p>Generated by k6 Load Testing Framework</p>
            <p>KitchenPace Performance Testing Suite</p>
        </div>
    </div>
</body>
</html>`;

    fs.writeFileSync(htmlFile, html);
    console.log(`HTML report generated: ${htmlFile}`);
}

// Main
const jsonFile = process.argv[2];
const htmlFile = process.argv[3];
const timestamp = process.argv[4];

if (!jsonFile || !htmlFile) {
    console.log('Usage: node generate-report.js <input.json> <output.html> [timestamp]');
    process.exit(1);
}

generateReport(jsonFile, htmlFile, timestamp);
