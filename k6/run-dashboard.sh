#!/bin/bash

# KitchenPace k6 Load Test Runner - LIVE WEB DASHBOARD MODE
# 
# This script runs the load test with the k6 web dashboard.
# Opens a browser automatically with real-time metrics while test runs.
# Note: Dashboard closes when test ends. For saving results, use run-load-test.sh instead.
#
# Usage: ./run-dashboard.sh [scenario] [environment] [base-url]
# 
# Scenarios:
#   light     - Only 10 users (quick test)
#   medium    - Only 100 users
#   heavy     - Only 1000 users
#   granular  - Slow ramp: 10→20→30→50→100→200→500→1000 (finds breaking point)
#   all       - All phases: light → medium → heavy (default)
#
# Examples:
#   ./run-dashboard.sh                      # Run all scenarios
#   ./run-dashboard.sh heavy                # Only heavy load test
#   ./run-dashboard.sh granular             # Granular ramp-up to find limits
#   ./run-dashboard.sh light dev            # Light test against dev
#   ./run-dashboard.sh heavy prod https://kitchenpace.app

set -e

# Configuration
SCENARIO="${1:-all}"
ENVIRONMENT="${2:-dev}"
BASE_URL="${3:-http://localhost:3000}"

echo "======================================"
echo "KitchenPace k6 Load Test - LIVE DASHBOARD"
echo "======================================"
echo "Scenario: $SCENARIO"
echo "Environment: $ENVIRONMENT"
echo "Target URL: $BASE_URL"
echo "======================================"
echo ""

# Show scenario description
case $SCENARIO in
    light)
        echo "📊 LIGHT SCENARIO: 10 concurrent users"
        echo "   Duration: ~2 minutes"
        ;;
    medium)
        echo "📊 MEDIUM SCENARIO: 100 concurrent users"
        echo "   Duration: ~4 minutes"
        ;;
    heavy)
        echo "📊 HEAVY SCENARIO: 1000 concurrent users"
        echo "   Duration: ~7 minutes"
        ;;
    granular)
        echo "📊 GRANULAR SCENARIO: Finding breaking point"
        echo "   Ramp: 10→20→30→50→100→200→500→1000"
        echo "   Duration: ~27 minutes"
        ;;
    all)
        echo "📊 ALL SCENARIOS: light → medium → heavy"
        echo "   Duration: ~13 minutes"
        ;;
    *)
        echo "⚠️  Unknown scenario: $SCENARIO"
        echo "   Valid options: light, medium, heavy, granular, all"
        exit 1
        ;;
esac

echo ""
echo "🚀 This will open a WEB DASHBOARD in your browser"
echo "   Dashboard shows LIVE metrics during test execution"
echo "   Dashboard closes automatically when test ends"
echo ""
echo "💡 For saving results to files instead, use:"
echo "   ./k6/run-load-test.sh $SCENARIO"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo "Error: k6 is not installed."
    echo "Please install k6: https://k6.io/docs/get-started/installation/"
    exit 1
fi

echo "Starting load test with LIVE DASHBOARD..."
echo "⏳ Dashboard will open automatically..."
echo ""

# Run the test with web dashboard
k6 run \
  --out web-dashboard \
  --env K6_WEB_DASHBOARD_PERIOD=2s \
  --env BASE_URL="$BASE_URL" \
  --env SCENARIO="$SCENARIO" \
  k6/load-test.js

echo ""
echo "======================================"
echo "Load Test Complete!"
echo "======================================"
echo ""
echo "💾 To save results to JSON + CSV + HTML report, use:"
echo "   ./k6/run-load-test.sh $SCENARIO $ENVIRONMENT $BASE_URL"
echo ""
