import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Service-specific BASE_URLs
const AUTH_BASE_URL = __ENV.AUTH_BASE_URL || 'http://52.204.141.213:30000';

// Define metrics
const errorRate = new Rate('auth_errors');
const authLatency = new Trend('auth_latency');

export const options = {
  scenarios: {
    auth: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 25 },    // Ramp up to 25 VUs
        { duration: '1m', target: 50 },     // Ramp up to 50 VUs
        { duration: '1m', target: 50 },     // Stay at 50 VUs
        { duration: '30s', target: 0 },     // Ramp down to 0
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'auth_errors': ['rate<0.2'],    // Error rate should be less than 20%
    'auth_latency': ['p(95)<5000'], // 95% of requests should be under 5s
  },
};

// Register and login test
export function registerAndLoginTest() {
  const startTime = new Date();
  
  // Generate unique user data
  const uniqueSuffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const testUser = {
    username: `testuser_${uniqueSuffix}`,
    email: `testuser_${uniqueSuffix}@example.com`,
    password: "Password1",
    full_name: "Test User",
    address: "123 Test Street",
    phone_number: `+1${uniqueSuffix.slice(-10)}`
  };

  // Register
  const registerRes = http.post(`${AUTH_BASE_URL}/user/register`, JSON.stringify(testUser), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  check(registerRes, { 'register status is 201': (r) => r.status === 201 });
  
  // If registration successful, try to login
  if (registerRes.status === 201) {
    const loginRes = http.post(`${AUTH_BASE_URL}/user/login`, JSON.stringify({
      username: testUser.username,
      password: testUser.password,
    }), { headers: { 'Content-Type': 'application/json' } });
    
    check(loginRes, { 'login status is 200': (r) => r.status === 200 });
  }

  authLatency.add(new Date() - startTime);
  errorRate.add(registerRes.status !== 201);
  
  // Add small random sleep between 1-3 seconds
  sleep(Math.random() * 2 + 1);
}

// Main test function
export default function() {
  try {
    registerAndLoginTest();
  } catch (error) {
    console.error('Error in auth test:', error);
  }
}
