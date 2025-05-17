import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Service-specific BASE_URLs
const AUTH_BASE_URL = __ENV.AUTH_BASE_URL || 'http://52.204.141.213:30000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

// Define metrics specific to auth testing
const errorRate = new Rate('auth_errors');
const authLatency = new Trend('auth_latency');

// Create a single test user
const TEST_USER = {
  username: `testuser_${Date.now()}`,
  email: `testuser_${Date.now()}@example.com`,
  password: "Password1",
  full_name: "Test User",
  address: "123 Test Street",
  phone_number: `+1${Date.now().toString().slice(-10)}`
};

export const options = {
  scenarios: {
    auth: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },    // Ramp up to 50 VUs
        { duration: '1m', target: 100 },    // Ramp up to 100 VUs
        { duration: '1m', target: 100 },    // Stay at 100 VUs
        { duration: '30s', target: 0 },     // Ramp down to 0
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'auth_errors': ['rate<0.2'],
    'auth_latency': ['p(95)<5000'],
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

// Register one user and repeatedly login
export function singleUserLoginTest() {
  const startTime = new Date();
  
  // Register the test user
  const registerRes = http.post(`${AUTH_BASE_URL}/user/register`, JSON.stringify(TEST_USER), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  check(registerRes, { 'register status is 201': (r) => r.status === 201 });
  console.log(`Created test user: ${TEST_USER.username}`);
  
  if (registerRes.status === 201) {
    // Login with the test user
    const loginRes = http.post(`${AUTH_BASE_URL}/user/login`, JSON.stringify({
      username: TEST_USER.username,
      password: TEST_USER.password,
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
    singleUserLoginTest();
  } catch (error) {
    console.error('Error in auth test:', error);
  }
}
