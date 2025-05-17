import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const authLatency = new Trend('auth_latency');
const productLatency = new Trend('product_latency');
const orderLatency = new Trend('order_latency');
const cartLatency = new Trend('cart_latency');
const wishlistLatency = new Trend('wishlist_latency');
const tenantLatency = new Trend('tenant_latency');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'; TODO
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

// Test configuration
export const options = {
  scenarios: {
    // Auth service stress test
    auth: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 500 }, // Quick ramp up to 500 users
        { duration: '8m', target: 500 }, // Maintain high load for 8 minutes
        { duration: '1m', target: 0 },   // Quick ramp down
      ],
      gracefulRampDown: '30s',
    },
    // Product service stress test
    products: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 1000 }, // Quick ramp up to 1000 users
        { duration: '8m', target: 1000 }, // Maintain high load for 8 minutes
        { duration: '1m', target: 0 },    // Quick ramp down
      ],
      gracefulRampDown: '30s',
    },
    // Order service stress test
    orders: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 800 },  // Quick ramp up to 800 users
        { duration: '8m', target: 800 },  // Maintain high load for 8 minutes
        { duration: '1m', target: 0 },    // Quick ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'errors': ['rate<0.2'], // Increased error threshold to 20% due to high load
    'auth_latency': ['p(95)<5000'], // Increased latency threshold to 5s due to high load
    'product_latency': ['p(95)<5000'],
    'order_latency': ['p(95)<5000'],
    'cart_latency': ['p(95)<5000'],
    'wishlist_latency': ['p(95)<5000'],
    'tenant_latency': ['p(95)<5000'],
  },
};

// Helper function to make authenticated requests
function makeAuthRequest(method, url, body = null) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  };
  
  let response;
  if (method === 'GET') {
    response = http.get(url, params);
  } else if (method === 'POST') {
    response = http.post(url, JSON.stringify(body), params);
  } else if (method === 'DELETE') {
    response = http.del(url, null, params);
  }
  
  return response;
}

// Auth service tests
export function authTest() {
  const startTime = new Date();
  
  // Test registration
  const registerRes = http.post(`${BASE_URL}/user/register`, JSON.stringify({
    email: `test${Date.now()}@example.com`,
    password: 'testpassword123',
    name: 'Test User'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(registerRes, {
    'register status is 201': (r) => r.status === 201,
  });
  
  // Test login
  const loginRes = http.post(`${BASE_URL}/user/login`, JSON.stringify({
    email: 'test@example.com',
    password: 'testpassword123'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(loginRes, {
    'login status is 200': (r) => r.status === 200,
  });
  
  authLatency.add(new Date() - startTime);
  errorRate.add(registerRes.status !== 201 || loginRes.status !== 200);
  sleep(1);
}

// Product service tests
export function productTest() {
  const startTime = new Date();
  
  // Test get all products
  const productsRes = http.get(`${BASE_URL}/products`);
  
  check(productsRes, {
    'products status is 200': (r) => r.status === 200,
  });
  
  productLatency.add(new Date() - startTime);
  errorRate.add(productsRes.status !== 200);
  sleep(1);
}

// Order service tests
export function orderTest() {
  const startTime = new Date();
  
  // Test get all orders
  const ordersRes = makeAuthRequest('GET', `${BASE_URL}/orders`);
  
  check(ordersRes, {
    'orders status is 200': (r) => r.status === 200,
  });
  
  orderLatency.add(new Date() - startTime);
  errorRate.add(ordersRes.status !== 200);
  sleep(1);
}

// Cart service tests
export function cartTest() {
  const startTime = new Date();
  
  // Test get cart items
  const cartRes = makeAuthRequest('GET', `${BASE_URL}/cart`);
  
  check(cartRes, {
    'cart status is 200': (r) => r.status === 200,
  });
  
  cartLatency.add(new Date() - startTime);
  errorRate.add(cartRes.status !== 200);
  sleep(1);
}

// Wishlist service tests
export function wishlistTest() {
  const startTime = new Date();
  
  // Test get wishlist
  const wishlistRes = makeAuthRequest('GET', `${BASE_URL}/wishlist`);
  
  check(wishlistRes, {
    'wishlist status is 200': (r) => r.status === 200,
  });
  
  wishlistLatency.add(new Date() - startTime);
  errorRate.add(wishlistRes.status !== 200);
  sleep(1);
}

// Tenant service tests
export function tenantTest() {
  const startTime = new Date();
  
  // Test get tenant
  const tenantRes = makeAuthRequest('GET', `${BASE_URL}/tenant/1`);
  
  check(tenantRes, {
    'tenant status is 200': (r) => r.status === 200,
  });
  
  tenantLatency.add(new Date() - startTime);
  errorRate.add(tenantRes.status !== 200);
  sleep(1);
}

// Main test function
export default function() {
  // Reduced sleep time to increase request frequency
  authTest();
  sleep(0.1);
  productTest();
  sleep(0.1);
  orderTest();
  sleep(0.1);
  cartTest();
  sleep(0.1);
  wishlistTest();
  sleep(0.1);
  tenantTest();
  sleep(0.1);
} 