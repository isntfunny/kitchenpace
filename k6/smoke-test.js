import { check, sleep, group } from 'k6';
import http from 'k6/http';

import {
    extractRecipeSlugsFromPayload,
    extractUserSlugsFromHtml,
    fetchRecipesPageSlugs,
} from './helpers.js';

// Smoke test configuration - quick verification test
export const options = {
    vus: 1,
    iterations: 1,
    duration: '30s',
    thresholds: {
        http_req_duration: ['p(95)<2000'],
        http_req_failed: ['rate<0.1'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export function setup() {
    let recipes = [];
    let users = [];

    // Try filter API first for recipe slugs
    const filterResponse = http.get(`${BASE_URL}/api/recipes/filter?limit=10`, {
        responseType: 'text',
    });
    if (filterResponse.status === 200) {
        try {
            const payload = JSON.parse(filterResponse.body);
            recipes = extractRecipeSlugsFromPayload(payload);
        } catch (_) {}
    }

    // Fetch /recipes HTML once — used for recipe fallback + user slugs
    const page = fetchRecipesPageSlugs(BASE_URL, http);
    if (recipes.length === 0) {
        recipes = page.recipes;
    }
    if (users.length === 0) {
        users = page.users;
    }

    // If still no user slugs, try a recipe detail page
    if (users.length === 0 && recipes.length > 0) {
        const recipeResponse = http.get(`${BASE_URL}/recipe/${recipes[0]}`, {
            responseType: 'text',
        });
        if (recipeResponse.status === 200 && recipeResponse.body) {
            users = extractUserSlugsFromHtml(recipeResponse.body);
        }
    }

    console.log(`Smoke test setup: ${recipes.length} recipe(s), ${users.length} user(s) found`);

    return { recipes, users };
}

export default function (data) {
    group('Smoke Test - Home Page', () => {
        const response = http.get(`${BASE_URL}/`);

        check(response, {
            'Home page loads successfully': (r) => r.status === 200,
            'Home page loads within 2 seconds': (r) => r.timings.duration < 2000,
        });

        console.log(
            `Home page status: ${response.status}, duration: ${response.timings.duration}ms`,
        );
    });

    sleep(1);

    group('Smoke Test - Recipes Page', () => {
        const response = http.get(`${BASE_URL}/recipes`);

        check(response, {
            'Recipes page loads successfully': (r) => r.status === 200,
            'Recipes page loads within 2 seconds': (r) => r.timings.duration < 2000,
        });

        console.log(
            `Recipes page status: ${response.status}, duration: ${response.timings.duration}ms`,
        );
    });

    sleep(1);

    if (data.recipes && data.recipes.length > 0) {
        const slug = data.recipes[Math.floor(Math.random() * data.recipes.length)];

        group('Smoke Test - Recipe Detail Page', () => {
            const response = http.get(`${BASE_URL}/recipe/${slug}`);

            check(response, {
                'Recipe detail page loads successfully': (r) => r.status === 200,
                'Recipe detail page loads within 2 seconds': (r) => r.timings.duration < 2000,
            });

            console.log(
                `Recipe detail (/${slug}) status: ${response.status}, duration: ${response.timings.duration}ms`,
            );
        });

        sleep(1);
    } else {
        console.warn('No recipe slugs found — skipping recipe detail smoke test');
    }

    if (data.users && data.users.length > 0) {
        const slug = data.users[Math.floor(Math.random() * data.users.length)];

        group('Smoke Test - User Profile Page', () => {
            const response = http.get(`${BASE_URL}/user/${slug}`);

            check(response, {
                'User profile page loads successfully': (r) => r.status === 200,
                'User profile page loads within 2 seconds': (r) => r.timings.duration < 2000,
            });

            console.log(
                `User profile (/${slug}) status: ${response.status}, duration: ${response.timings.duration}ms`,
            );
        });

        sleep(1);
    } else {
        console.warn('No user slugs found — skipping user profile smoke test');
    }

    console.log('Smoke test completed successfully!');
}
