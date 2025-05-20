import http from 'k6/http';
import { check, group, sleep, fail } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Service URLs
const AUTH_BASE_URL = __ENV.AUTH_BASE_URL || 'http://52.204.141.213:30000';
const PRODUCTS_BASE_URL = __ENV.PRODUCTS_BASE_URL || 'http://52.204.141.213:30002';
const ORDERS_BASE_URL = __ENV.ORDERS_BASE_URL || 'http://52.204.141.213:30001';
const TENANTS_BASE_URL = __ENV.TENANTS_BASE_URL || 'http://52.204.141.213:30003';
const WISHLIST_BASE_URL = __ENV.WISHLIST_BASE_URL || 'http://52.204.141.213:30004';

// Metrics
export let errorRate = new Rate('http_errors');
export let cacheMissRate = new Rate('cache_miss');
export let loginTrend = new Trend('login_duration');
export let productTrend = new Trend('product_duration');
export let orderTrend = new Trend('order_duration');
export let wishlistTrend = new Trend('wishlist_duration');
export let tenantTrend = new Trend('tenant_duration');
export let successfulLogins = new Counter('successful_logins');

// Load profile
export let options = {
  stages: [
    { duration: '2m', target: 50 },    // ramp up to 50 VUs
    { duration: '2m', target: 100 },   // ramp up to 100 VUs
    { duration: '4m', target: 100 },   // hold at 100 VUs
    { duration: '2m', target: 0 },     // ramp down
  ],
  thresholds: {
    http_errors: ['rate<0.05'],
    cache_miss: ['rate<0.2'],
    http_req_duration: ['p(95)<2000'],
  },
};

// Helpers
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomString(length) {
  let chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; ++i) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}
function randomBool(probability = 0.5) {
  return Math.random() < probability;
}

// Simulate a user login and return token
function userLogin() {
  let username = `user${randomString(8)}`;
  let email = `${username}@example.com`;
  let password = 'Password1';

  // Register
  http.post(`${AUTH_BASE_URL}/user/register`, JSON.stringify({
    username, email, password, full_name: "Test User", address: "123 Test St", phone_number: `+1${randomInt(1000000000,9999999999)}`
  }), { headers: { 'Content-Type': 'application/json' } });

  // Login
  let res = http.post(`${AUTH_BASE_URL}/user/login`, JSON.stringify({ username, password }), { headers: { 'Content-Type': 'application/json' } });
  let success = check(res, { 'login success': (r) => r.status === 200 });
  loginTrend.add(res.timings.duration);
  errorRate.add(!success);
  if (success) {
    successfulLogins.add(1);
    try {
      return JSON.parse(res.body).token;
    } catch (_) { return null; }
  }
  return null;
}

// Simulate product browsing, with cache-miss and cache-failure simulation
function productScenario(token) {
  let headers = { 'Authorization': `Bearer ${token}` };
  let cacheBypass = randomBool(0.1); // 10% chance to bypass cache
  let url = `${PRODUCTS_BASE_URL}/product`;
  if (cacheBypass) {
    url += '?cache_bypass=1';
    headers['X-Bypass-Cache'] = '1';
  }
  let res = http.get(url, { headers });
  let success = check(res, { 'get products': (r) => r.status === 200 });
  productTrend.add(res.timings.duration);
  errorRate.add(!success);

  // Simulate cache miss/failure by checking for a custom header or error
  if (cacheBypass || (res.headers['X-Cache'] && res.headers['X-Cache'] === 'MISS')) {
    cacheMissRate.add(1);
  } else {
    cacheMissRate.add(0);
  }

  // Randomly view a product
  if (success && res.json().length > 0) {
    let products = res.json();
    let productId = products[randomInt(0, products.length - 1)].id;
    let res2 = http.get(`${PRODUCTS_BASE_URL}/product/${productId}`, { headers });
    productTrend.add(res2.timings.duration);
    errorRate.add(res2.status !== 200);
    if (cacheBypass || (res2.headers['X-Cache'] && res2.headers['X-Cache'] === 'MISS')) {
      cacheMissRate.add(1);
    } else {
      cacheMissRate.add(0);
    }
  }
  sleep(randomInt(1, 3));
}

// Simulate order placement
function orderScenario(token) {
  let headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  let res = http.post(`${ORDERS_BASE_URL}/order`, JSON.stringify({
    total_amount: randomInt(1000, 100000),
    shipping_provider: 'JNE',
    shipping_code: `SHIP${randomInt(1000,9999)}`,
    shipping_status: 'PENDING'
  }), { headers });
  let success = check(res, { 'order placed': (r) => r.status === 201 });
  orderTrend.add(res.timings.duration);
  errorRate.add(!success);
  sleep(randomInt(1, 2));
}

// Simulate wishlist actions
function wishlistScenario(token) {
  let headers = { 'Authorization': `Bearer ${token}` };
  let res = http.get(`${WISHLIST_BASE_URL}/wishlist`, { headers });
  let success = check(res, { 'get wishlist': (r) => r.status === 200 });
  wishlistTrend.add(res.timings.duration);
  errorRate.add(!success);
  sleep(randomInt(1, 2));
}

// Simulate tenant actions
function tenantScenario(token) {
  let headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  let res = http.post(`${TENANTS_BASE_URL}/tenant`, JSON.stringify({
    name: `Tenant${randomString(6)}`
  }), { headers });
  let success = check(res, { 'tenant created': (r) => r.status === 201 });
  tenantTrend.add(res.timings.duration);
  errorRate.add(!success);
  sleep(randomInt(1, 2));
}

// Simulate a random user journey
function userJourney(token) {
  // Each user will do a random number of actions in a random order
  let actions = [
    () => productScenario(token),
    () => orderScenario(token),
    () => wishlistScenario(token),
    () => tenantScenario(token),
  ];
  // Shuffle actions
  for (let i = actions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [actions[i], actions[j]] = [actions[j], actions[i]];
  }
  // Each user does 2-4 actions per session
  let numActions = randomInt(2, 4);
  for (let i = 0; i < numActions; i++) {
    actions[i]();
    sleep(randomInt(1, 4)); // Human-like think time
  }
}

export default function () {
  // 1. Login
  let token = userLogin();
  if (!token) {
    sleep(randomInt(2, 5));
    return;
  }

  // 2. Simulate a random user journey
  userJourney(token);

  // 3. Randomly simulate a Redis outage for some users
  if (randomBool(0.05)) { // 5% of users simulate Redis being down
    // Try to hit a cache-dependent endpoint with cache bypass
    let headers = { 'Authorization': `Bearer ${token}`, 'X-Bypass-Cache': '1' };
    let res = http.get(`${PRODUCTS_BASE_URL}/product?cache_bypass=1`, { headers });
    // If the system handles Redis outage gracefully, it should still return 200 or a handled error
    let handled = check(res, { 'handled redis outage': (r) => r.status === 200 || r.status === 503 });
    errorRate.add(!handled);
    cacheMissRate.add(1);
    sleep(randomInt(1, 3));
  }
}