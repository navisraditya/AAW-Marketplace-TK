import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Service-specific BASE_URLs
const AUTH_BASE_URL = __ENV.AUTH_BASE_URL || 'http://52.204.141.213:30000';
const PRODUCTS_BASE_URL = __ENV.PRODUCTS_BASE_URL || 'http://52.204.141.213:30002';
const ORDERS_BASE_URL = __ENV.ORDERS_BASE_URL || 'http://52.204.141.213:30001';
const TENANTS_BASE_URL = __ENV.TENANTS_BASE_URL || 'http://52.204.141.213:30003';

// Define metrics
const errorRate = new Rate('errors');
const authLatency = new Trend('auth_latency');
const productLatency = new Trend('product_latency');
const orderLatency = new Trend('order_latency');
const cartLatency = new Trend('cart_latency');
const wishlistLatency = new Trend('wishlist_latency');
const tenantLatency = new Trend('tenant_latency');

// Helper functions
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';
const PREDEFINED_TENANT_ID = '47dd6b24-0b23-46b0-a662-776158d089ba';
const PREDEFINED_USER_ID = 'fa50dd45-c9be-4991-90da-0bef80ff7cd3';
const PREDEFINED_CATEGORY_ID = '3de4fe08-f501-49e3-9a29-72ab6170f09d';
const PREDEFINED_PRODUCT_ID = 'fa6f5f96-327a-435b-85a0-3f72804f426b';

function pickId(predefinedId, randomFunc) {
  return Math.random() < 0.5 ? predefinedId : randomFunc();
}

const TENANT_ID = pickId(PREDEFINED_TENANT_ID, randomUUID);
const USER_ID = pickId(PREDEFINED_USER_ID, randomUUID);
const CATEGORY_ID = pickId(PREDEFINED_CATEGORY_ID, randomUUID);
const PRODUCT_ID = pickId(PREDEFINED_PRODUCT_ID, randomUUID);

export const options = {
  scenarios: {
    load_test: {
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
    'http_req_duration': ['p(95)<5000'],
    'http_req_failed': ['rate<0.2'],
  },
};

// Auth test function
export function authTest() {
  const startTime = new Date();
  console.log('Starting auth test...');

  const uniqueSuffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const username = `user${uniqueSuffix}`;
  const email = `user${uniqueSuffix}@example.com`;
  const phone_number = `+1${uniqueSuffix.padStart(10, '0')}`;

  console.log(`Attempting to register user: ${username}`);
  const registerRes = http.post(`${AUTH_BASE_URL}/user/register`, JSON.stringify({
    username: username,
    email: email,
    password: "Password1",
    full_name: `User ${uniqueSuffix}`,
    address: "123 Test Street",
    phone_number: phone_number
  }), { headers: { 'Content-Type': 'application/json' } });
  check(registerRes, { 'register status is 201': (r) => r.status === 201 });
  console.log(`Registration status: ${registerRes.status}`);

  if (registerRes.status === 201) {
    console.log(`Attempting to login user: ${username}`);
    const loginRes = http.post(`${AUTH_BASE_URL}/user/login`, JSON.stringify({
      username: username,
      password: 'Password1',
    }), { headers: { 'Content-Type': 'application/json' } });
    check(loginRes, { 'login status is 200': (r) => r.status === 200 });
    console.log(`Login status: ${loginRes.status}`);
  }

  const duration = new Date() - startTime;
  authLatency.add(duration);
  errorRate.add(registerRes.status !== 201);
  console.log(`Auth test completed in ${duration}ms`);
  sleep(1);
}

// Product test function
export function productTest() {
  const startTime = new Date();
  let productsRes;
  console.log('Starting product test...');

  try {
    console.log('Fetching products list...');
    productsRes = http.get(`${PRODUCTS_BASE_URL}/product`);
    check(productsRes, { 'products status is 200': (r) => r.status === 200 });
    console.log(`Products fetch status: ${productsRes.status}`);

    console.log('Fetching categories...');
    const categoriesRes = http.get(`${PRODUCTS_BASE_URL}/product/category`);
    check(categoriesRes, { 'categories status is 200': (r) => r.status === 200 });
    console.log(`Categories fetch status: ${categoriesRes.status}`);

    const productName = `Product ${randomInt(1, 10000)}`;
    console.log(`Creating new product: ${productName}`);
    const createProductRes = http.post(`${PRODUCTS_BASE_URL}/product`, JSON.stringify({
      name: productName,
      description: 'A test product',
      price: randomInt(1000, 100000),
      quantity_available: randomInt(1, 100),
    }), { headers: { 'Content-Type': 'application/json' } });
    check(createProductRes, { 'create product status': (r) => [201, 200, 400].includes(r.status) });
    console.log(`Product creation status: ${createProductRes.status}`);

  } catch (error) {
    console.error('Error in productTest:', error);
    productsRes = { status: 500 };
  }

  const duration = new Date() - startTime;
  productLatency.add(duration);
  errorRate.add(productsRes?.status !== 200);
  console.log(`Product test completed in ${duration}ms`);
  sleep(1);
}

// Order test function
export function orderTest() {
  const startTime = new Date();
  let ordersRes;
  console.log('Starting order test...');

  try {
    console.log('Fetching orders list...');
    ordersRes = http.get(`${ORDERS_BASE_URL}/order`);
    check(ordersRes, { 'orders status is 200': (r) => r.status === 200 });
    console.log(`Orders fetch status: ${ordersRes.status}`);

    const orderAmount = randomInt(1000, 100000);
    console.log(`Creating new order with amount: ${orderAmount}`);
    const placeOrderRes = http.post(`${ORDERS_BASE_URL}/order`, JSON.stringify({
      total_amount: orderAmount,
      shipping_provider: 'JNE',
      shipping_code: `SHIP${randomInt(1000,9999)}`,
      shipping_status: 'PENDING',
    }), { headers: { 'Content-Type': 'application/json' } });
    check(placeOrderRes, { 'place order status': (r) => [201, 200, 400].includes(r.status) });
    console.log(`Order creation status: ${placeOrderRes.status}`);

  } catch (error) {
    console.error('Error in orderTest:', error);
    ordersRes = { status: 500 };
  }

  const duration = new Date() - startTime;
  orderLatency.add(duration);
  errorRate.add(ordersRes?.status !== 200);
  console.log(`Order test completed in ${duration}ms`);
  sleep(1);
}

// Main test function
export default function() {
  try {
    const tests = [authTest, productTest, orderTest];
    const randomTest = tests[Math.floor(Math.random() * tests.length)];
    console.log(`\n=== Starting new test iteration ===`);
    randomTest();
  } catch (error) {
    console.error('Error in default function:', error);
  } finally {
    const sleepTime = Math.random() * 2 + 1;
    console.log(`Sleeping for ${sleepTime.toFixed(2)} seconds...`);
    sleep(sleepTime);
  }
} 