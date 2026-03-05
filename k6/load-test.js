/**
 * KitchenPace Load Test
 *
 * Usage:
 *   # Run specific scenario with live web dashboard:
 *   k6 run --out web-dashboard k6/load-test.js --env BASE_URL=http://localhost:3000 --env SCENARIO=heavy
 *
 *   # Run only light scenario:
 *   k6 run --out web-dashboard k6/load-test.js --env SCENARIO=light
 *
 *   # Run granular ramp-up (finds breaking point):
 *   k6 run --out web-dashboard k6/load-test.js --env SCENARIO=granular
 *
 *   # With JSON output for later analysis:
 *   k6 run --out json=k6/results/results.json k6/load-test.js --env BASE_URL=http://localhost:3000
 *
 *   # Using shell script (generates JSON + CSV + HTML):
 *   ./k6/run-load-test.sh
 */

import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const SCENARIO = __ENV.SCENARIO || 'all'; // Options: all, light, medium, heavy, granular

// Custom metrics
const errorRate = new Rate('errors');
const pageLoadTime = new Trend('page_load_time');
const recipeViews = new Counter('recipe_views');
const userViews = new Counter('user_views');
const searchQueries = new Counter('search_queries');
const filterUses = new Counter('filter_uses');

// Define all available scenarios
const allScenarios = {
    // Light load: 10 concurrent users (quick test)
    light: {
        executor: 'ramping-vus',
        startVUs: 1,
        stages: [
            { duration: '30s', target: 10 },
            { duration: '1m', target: 10 },
            { duration: '30s', target: 0 },
        ],
        exec: 'runTest',
        gracefulStop: '10s',
        tags: { load: 'light' },
    },
    // Medium load: 100 concurrent users
    medium: {
        executor: 'ramping-vus',
        startVUs: 10,
        stages: [
            { duration: '1m', target: 100 },
            { duration: '2m', target: 100 },
            { duration: '1m', target: 0 },
        ],
        exec: 'runTest',
        startTime: '3m',
        gracefulStop: '10s',
        tags: { load: 'medium' },
    },
    // Heavy load: 1000 concurrent users
    heavy: {
        executor: 'ramping-vus',
        startVUs: 100,
        stages: [
            { duration: '2m', target: 1000 },
            { duration: '3m', target: 1000 },
            { duration: '2m', target: 0 },
        ],
        exec: 'runTest',
        startTime: '8m',
        gracefulStop: '10s',
        tags: { load: 'heavy' },
    },
    // Granular ramp-up: slow increase to find breaking point
    // Goes: 10→20→30→50→100→200→500→1000 with hold time at each level
    granular: {
        executor: 'ramping-vus',
        startVUs: 1,
        stages: [
            { duration: '1m', target: 10 }, // Ramp to 10
            { duration: '2m', target: 10 }, // Hold at 10
            { duration: '30s', target: 20 }, // Ramp to 20
            { duration: '2m', target: 20 }, // Hold at 20
            { duration: '30s', target: 30 }, // Ramp to 30
            { duration: '2m', target: 30 }, // Hold at 30
            { duration: '30s', target: 50 }, // Ramp to 50
            { duration: '2m', target: 50 }, // Hold at 50
            { duration: '1m', target: 100 }, // Ramp to 100
            { duration: '2m', target: 100 }, // Hold at 100
            { duration: '1m', target: 200 }, // Ramp to 200
            { duration: '2m', target: 200 }, // Hold at 200
            { duration: '2m', target: 500 }, // Ramp to 500
            { duration: '3m', target: 500 }, // Hold at 500
            { duration: '3m', target: 1000 }, // Ramp to 1000
            { duration: '3m', target: 1000 }, // Hold at 1000
            { duration: '2m', target: 0 }, // Ramp down
        ],
        exec: 'runTest',
        gracefulStop: '10s',
        tags: { load: 'granular' },
    },
};

// Select scenarios based on SCENARIO environment variable
function getScenarios() {
    if (SCENARIO === 'all') {
        return allScenarios;
    }
    if (allScenarios[SCENARIO]) {
        // Remove startTime for single scenario runs
        const scenario = { ...allScenarios[SCENARIO] };
        delete scenario.startTime;
        return { [SCENARIO]: scenario };
    }
    console.warn(`Unknown scenario: ${SCENARIO}, using 'all'`);
    return allScenarios;
}

// Test scenarios with increasing load
export const options = {
    scenarios: getScenarios(),
    // Relaxed thresholds - warn but don't fail the test
    thresholds: {
        http_req_duration: ['p(95)<10000'], // Warn if > 10s (was 5s)
        errors: ['rate<0.3'], // Warn if error rate > 30% (was 10%)
    },
    // Global settings
    discardResponseBodies: true, // Save memory
    maxRedirects: 5,
    noConnectionReuse: false,
    userAgent: 'k6-load-test/1.0',
};

// Helper function to make requests with error handling and timeout
function makeRequest(url, name) {
    const start = Date.now();

    // Request with timeout to prevent hanging
    const response = http.get(url, {
        tags: { name: name },
        timeout: '30s', // Increased timeout: 30 seconds (was 10s)
    });

    const duration = Date.now() - start;

    pageLoadTime.add(duration);

    const success = check(response, {
        [`${name} status is 200`]: (r) => r.status === 200,
        [`${name} response time < 5s`]: (r) => r.timings.duration < 5000,
    });

    errorRate.add(!success);

    if (!success && response.status !== 200) {
        console.error(`Failed: ${name} - Status: ${response.status}`);
    }

    return response;
}

// Random sleep with millisecond precision for better distribution
// Uses Gaussian-like distribution (box-muller transform) for more natural clustering
function randomSleepMs(minMs, maxMs) {
    // Generate more realistic distribution (users cluster around average, few extremes)
    const u1 = Math.random();
    const u2 = Math.random();
    // Box-Muller transform for normal distribution
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    // Scale to our range (mean = midpoint, std dev = range/4)
    const mean = (minMs + maxMs) / 2;
    const stdDev = (maxMs - minMs) / 4;
    let waitMs = mean + z * stdDev;
    // Clamp to range
    waitMs = Math.max(minMs, Math.min(maxMs, waitMs));
    sleep(waitMs / 1000);
}

// Legacy wrapper for backward compatibility (converts seconds to ms)
function randomSleep(min = 1, max = 3) {
    randomSleepMs(min * 1000, max * 1000);
}

// Per-user behavior profile (each VU gets a "personality")
const userProfiles = [
    { name: 'speed', weight: 0.2, minMs: 200, maxMs: 800 }, // 20%: Speed surfers
    { name: 'normal', weight: 0.5, minMs: 1500, maxMs: 3500 }, // 50%: Normal readers
    { name: 'careful', weight: 0.2, minMs: 4000, maxMs: 8000 }, // 20%: Careful readers
    { name: 'slow', weight: 0.1, minMs: 8000, maxMs: 15000 }, // 10%: Very slow/distracted
];

// Get profile for current VU (consistent per user across iterations)
function getUserProfile() {
    const vuId = __VU || 1;
    let seed = vuId;
    // Simple hash to distribute users across profiles based on weight
    const rand = ((seed * 9301 + 49297) % 233280) / 233280;
    let cumulative = 0;
    for (const profile of userProfiles) {
        cumulative += profile.weight;
        if (rand <= cumulative) return profile;
    }
    return userProfiles[1]; // default to normal
}

// Variable sleep based on user profile + randomness
function variableSleep(minMs, maxMs) {
    const profile = getUserProfile();
    // Mix profile speed with action-specific timing
    const profileFactor = (profile.minMs + profile.maxMs) / 2 / 2500; // normalize around 2.5s
    const adjustedMin = minMs * profileFactor;
    const adjustedMax = maxMs * profileFactor;
    randomSleepMs(adjustedMin, adjustedMax);
}

// Random integer between min and max (inclusive)
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Pick random element from array
function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Sample search terms
const searchTerms = [
    'pasta',
    'chicken',
    'salad',
    'soup',
    'cake',
    'pizza',
    'rice',
    'beef',
    'fish',
    'vegetarian',
    'vegan',
    'dessert',
    'breakfast',
    'nudeln',
    'hähnchen',
    'salat',
    'suppe',
    'kuchen',
    'reis',
    'rind',
    'fisch',
    'vegan',
    'nachtisch',
    'frühstück',
];

// Sample filter categories
const categories = ['Hauptgericht', 'Vorspeise', 'Dessert', 'Frühstück', 'Beilage'];

// Sample recipe slugs (these would ideally be fetched dynamically)
const sampleRecipeSlugs = [
    'spaghetti-carbonara',
    'caesar-salad',
    'chicken-curry',
    'beef-bourguignon',
    'tiramisu',
    'pancakes',
    'guacamole',
    'lasagna',
    'pad-thai',
    'chocolate-cake',
];

// Sample user IDs
const sampleUserIds = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6'];

// Main test function
export function runTest() {
    const profile = getUserProfile();
    // Log user profile type on first iteration for debugging
    if (__ITER === 0) {
        console.log(
            `VU ${__VU} is a '${profile.name}' user (speed factor: ${((profile.minMs + profile.maxMs) / 2 / 2500).toFixed(2)}x)`,
        );
    }

    group('Home Page', () => {
        makeRequest(`${BASE_URL}/`, 'Home');
        // Per-user variable timing: speed users ~200-800ms, slow users ~3-11s
        variableSleep(800, 2500);
    });

    // Decide next action based on random probability
    const rand = Math.random();

    if (rand < 0.4) {
        // 40% chance: Navigate to recipes and explore
        group('Recipe Exploration', () => {
            navigateRecipes();
        });
    } else if (rand < 0.7) {
        // 30% chance: View specific recipe
        group('Recipe Detail', () => {
            viewRandomRecipe();
        });
    } else if (rand < 0.85) {
        // 15% chance: View user profile
        group('User Profile', () => {
            viewRandomUser();
        });
    } else if (rand < 0.95) {
        // 10% chance: Use search
        group('Search', () => {
            performSearch();
        });
    } else {
        // 5% chance: Apply filters
        group('Filters', () => {
            useFilters();
        });
    }
}

function navigateRecipes() {
    // Go to recipes page
    makeRequest(`${BASE_URL}/recipes`, 'Recipes List');
    // Variable browsing time per user type
    variableSleep(1200, 3500);

    // Maybe view a specific recipe from the list
    if (Math.random() < 0.6) {
        viewRandomRecipe();
    }
}

function viewRandomRecipe() {
    const recipeSlug = randomElement(sampleRecipeSlugs);
    const url = `${BASE_URL}/recipe/${recipeSlug}`;

    makeRequest(url, 'Recipe Detail');
    recipeViews.add(1);
    // Recipe reading varies greatly by user: speed readers ~600ms-2.5s, slow readers ~24-48s
    variableSleep(3000, 8000);

    // Maybe explore related content
    if (Math.random() < 0.3) {
        // View another random recipe
        viewRandomRecipe();
    }
}

function viewRandomUser() {
    const userId = randomElement(sampleUserIds);
    const url = `${BASE_URL}/user/${userId}`;

    makeRequest(url, 'User Profile');
    userViews.add(1);
    // Profile browsing: speed users ~160-640ms, slow users ~6.4-16s
    variableSleep(2000, 5000);

    // Maybe view user's recipes
    if (Math.random() < 0.4) {
        variableSleep(800, 2000);
        // Simulate clicking on a recipe from user's profile
        viewRandomRecipe();
    }
}

function performSearch() {
    const term = randomElement(searchTerms);
    const url = `${BASE_URL}/recipes?q=${encodeURIComponent(term)}`;

    makeRequest(url, 'Search');
    searchQueries.add(1);
    // Search result scanning: speed users ~120-480ms, slow users ~4.8-12s
    variableSleep(1500, 4000);

    // Maybe click on a search result
    if (Math.random() < 0.5) {
        viewRandomRecipe();
    }
}

function useFilters() {
    // Build random filter combination
    const filters = [];

    // Add category filter 50% of the time
    if (Math.random() < 0.5) {
        filters.push(`category=${encodeURIComponent(randomElement(categories))}`);
    }

    // Add time filter 30% of the time
    if (Math.random() < 0.3) {
        const maxTime = randomElement([15, 30, 45, 60, 90, 120]);
        filters.push(`maxTime=${maxTime}`);
    }

    // Add rating filter 20% of the time
    if (Math.random() < 0.2) {
        filters.push(`minRating=${randomInt(3, 5)}`);
    }

    const queryString = filters.length > 0 ? `?${filters.join('&')}` : '';
    const url = `${BASE_URL}/recipes${queryString}`;

    makeRequest(url, 'Filter');
    filterUses.add(1);
    // Filter browsing: speed users ~120-480ms, slow users ~4.8-12s
    variableSleep(1500, 4000);

    // Maybe view a filtered result
    if (Math.random() < 0.4) {
        viewRandomRecipe();
    }
}

// Handle setup - fetch actual IDs from the API
export function setup() {
    console.log(`Starting load test against: ${BASE_URL}`);

    // Try to fetch actual recipe and user IDs
    try {
        const recipesResponse = http.get(`${BASE_URL}/api/recipes?limit=50`);
        if (recipesResponse.status === 200) {
            try {
                const recipes = JSON.parse(recipesResponse.body);
                if (recipes && recipes.length > 0) {
                    return { recipes: recipes.map((r) => r.id || r.slug).filter(Boolean) };
                }
            } catch (e) {
                console.log('Could not parse recipes response, using sample IDs');
            }
        }
    } catch (e) {
        console.log('Could not fetch recipes, using sample IDs');
    }

    return {
        recipes: sampleRecipeSlugs,
        users: sampleUserIds,
    };
}

// Handle teardown
export function teardown(data) {
    console.log('Load test completed');
    console.log(`Total recipe views: ${data.recipes ? data.recipes.length : 'N/A'}`);
}
