#!/bin/bash

# KitchenPace k6 Load Test Runner
# 
# This script saves results to JSON + CSV + generates HTML report.
# For LIVE monitoring with web dashboard instead, use:
#   ./k6/run-dashboard.sh [scenario] [environment] [base-url]
#
# Usage: ./run-load-test.sh [scenario] [environment] [base-url]
#
# Scenarios:
#   light     - Only 10 users (quick test)
#   medium    - Only 100 users
#   heavy     - Only 1000 users
#   granular  - Slow ramp: 10→20→30→50→100→200→500→1000 (finds breaking point)
#   all       - All phases: light → medium → heavy (default)
# 
# Examples:
#   ./run-load-test.sh                      # Run all scenarios
#   ./run-load-test.sh heavy                # Only heavy load test
#   ./run-load-test.sh granular             # Granular ramp-up to find limits
#   ./run-load-test.sh light dev            # Light test against dev
#   ./run-load-test.sh heavy prod https://kitchenpace.app

set -e

# Configuration
SCENARIO="${1:-all}"
ENVIRONMENT="${2:-dev}"
BASE_URL="${3:-http://localhost:3000}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_DIR="k6/results"
JSON_FILE="${RESULTS_DIR}/results_${TIMESTAMP}.json"
CSV_FILE="${RESULTS_DIR}/results_${TIMESTAMP}.csv"
SUMMARY_FILE="${RESULTS_DIR}/summary_${TIMESTAMP}.json"
HTML_REPORT="${RESULTS_DIR}/report_${TIMESTAMP}.html"

echo "======================================"
echo "KitchenPace k6 Load Test"
echo "======================================"
echo "Scenario: $SCENARIO"
echo "Environment: $ENVIRONMENT"
echo "Target URL: $BASE_URL"
echo "Timestamp: $TIMESTAMP"
echo "======================================"
echo ""

# Show scenario description and estimated duration
case $SCENARIO in
    light)
        echo "📊 LIGHT SCENARIO"
        echo "   Load: 10 concurrent users"
        echo "   Duration: ~2 minutes"
        ;;
    medium)
        echo "📊 MEDIUM SCENARIO"
        echo "   Load: 100 concurrent users"
        echo "   Duration: ~4 minutes"
        ;;
    heavy)
        echo "📊 HEAVY SCENARIO"
        echo "   Load: 1000 concurrent users"
        echo "   Duration: ~7 minutes"
        ;;
    granular)
        echo "📊 GRANULAR SCENARIO (Breaking Point Analysis)"
        echo "   Ramp: 10→20→30→50→100→200→500→1000 users"
        echo "   Each level held for 2-3 minutes to observe behavior"
        echo "   Duration: ~27 minutes"
        echo ""
        echo "   💡 This is perfect for finding the exact load limit!"
        ;;
    all)
        echo "📊 ALL SCENARIOS (Sequential)"
        echo "   Phase 1: 10 users (light)"
        echo "   Phase 2: 100 users (medium)"
        echo "   Phase 3: 1000 users (heavy)"
        echo "   Duration: ~13 minutes"
        ;;
    *)
        echo "⚠️  Unknown scenario: $SCENARIO"
        echo "   Valid options: light, medium, heavy, granular, all"
        exit 1
        ;;
esac

echo ""
echo "ℹ️  This script saves results to JSON + CSV + HTML"
echo "   For LIVE web dashboard instead, run:"
echo "   ./k6/run-dashboard.sh $SCENARIO $ENVIRONMENT $BASE_URL"
echo ""

# Create results directory
mkdir -p "$RESULTS_DIR"

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo "Error: k6 is not installed."
    echo "Please install k6: https://k6.io/docs/get-started/installation/"
    exit 1
fi

# Check k6 version
K6_VERSION=$(k6 version | head -1)
echo "Using: $K6_VERSION"
echo ""

# Run the test with multiple outputs (json, csv, and summary)
k6 run \
  --out "json=${JSON_FILE}" \
  --out "csv=${CSV_FILE}" \
  --summary-export="${SUMMARY_FILE}" \
  --env BASE_URL="$BASE_URL" \
  --env SCENARIO="$SCENARIO" \
  k6/load-test.js

echo ""
echo "======================================"
echo "Load Test Complete!"
echo "======================================"
echo "Results saved to:"
echo "  - JSON Data: $JSON_FILE"
echo "  - CSV Data: $CSV_FILE"
echo "  - Summary: $SUMMARY_FILE"
echo "======================================"

# Generate HTML report from JSON data if node is available
if command -v node &> /dev/null; then
    echo ""
    echo "Generating HTML report..."
    node k6/generate-report.js "$JSON_FILE" "$HTML_REPORT" "$TIMESTAMP"
    if [ -f "$HTML_REPORT" ]; then
        echo "  - HTML Report: $HTML_REPORT"
    fi
fi

# Display summary if available
if [ -f "$SUMMARY_FILE" ]; then
    echo ""
    echo "Quick Summary:"
    cat "$SUMMARY_FILE" | grep -E '(http_reqs|http_req_duration|errors|vus)' | head -20
fi

echo ""
echo "To analyze results:"
echo "  1. View JSON: cat $JSON_FILE | jq ."
echo "  2. Import CSV into Excel/Google Sheets"
if [ -f "$HTML_REPORT" ]; then
    echo "  3. Open HTML report: file://$(pwd)/${HTML_REPORT}"
fi
echo ""

# Alternative: Suggest using web-dashboard for real-time view
echo "For real-time dashboard in future runs, use:"
echo "  ./k6/run-dashboard.sh $SCENARIO $ENVIRONMENT $BASE_URL"
echo ""
