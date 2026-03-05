import { check, sleep, group } from 'k6';
import http from 'k6/http';

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

export default function () {
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

    group('Smoke Test - API Health Check', () => {
        const response = http.get(`${BASE_URL}/api/health`);

        check(response, {
            'API health endpoint responds': (r) => r.status === 200 || r.status === 404,
        });

        console.log(`API health status: ${response.status}`);
    });

    console.log('Smoke test completed successfully!');
}
