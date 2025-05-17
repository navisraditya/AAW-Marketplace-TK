import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Service-specific BASE_URLs
const AUTH_BASE_URL = __ENV.AUTH_BASE_URL || 'http://52.204.141.213:30000';
const PRODUCTS_BASE_URL = __ENV.PRODUCTS_BASE_URL || 'http://52.204.141.213:30002';
const ORDERS_BASE_URL = __ENV.ORDERS_BASE_URL || 'http://52.204.141.213:30001';
const TENANTS_BASE_URL = __ENV.TENANTS_BASE_URL || 'http://52.204.141.213:30003';

function randomUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const errorRate = new Rate('errors');
const authLatency = new Trend('auth_latency');
const productLatency = new Trend('product_latency');
const orderLatency = new Trend('order_latency');
const cartLatency = new Trend('cart_latency');
const wishlistLatency = new Trend('wishlist_latency');
const tenantLatency = new Trend('tenant_latency');

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
    auth: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '10s', target: 1000 },  // Spike up
        { duration: '20s', target: 5 },     // Spike down
        { duration: '30s', target: 100 },   // Regular load test starts
        { duration: '1m', target: 300 },
        { duration: '1m', target: 500 },
        { duration: '1m', target: 700 },
        { duration: '1m', target: 1000 },
        { duration: '4m', target: 1000 },   // Extended steady state
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    products: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '10s', target: 1000 },  // Spike up
        { duration: '20s', target: 5 },     // Spike down
        { duration: '30s', target: 100 },   // Regular load test starts
        { duration: '1m', target: 300 },
        { duration: '1m', target: 500 },
        { duration: '1m', target: 700 },
        { duration: '1m', target: 1000 },
        { duration: '4m', target: 1000 },   // Extended steady state
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    orders: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '10s', target: 1000 },  // Spike up
        { duration: '20s', target: 5 },     // Spike down
        { duration: '30s', target: 100 },   // Regular load test starts
        { duration: '1m', target: 300 },
        { duration: '1m', target: 500 },
        { duration: '1m', target: 700 },
        { duration: '1m', target: 1000 },
        { duration: '4m', target: 1000 },   // Extended steady state
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    cart: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '10s', target: 1000 },  // Spike up
        { duration: '20s', target: 5 },     // Spike down
        { duration: '30s', target: 100 },   // Regular load test starts
        { duration: '1m', target: 300 },
        { duration: '1m', target: 500 },
        { duration: '1m', target: 700 },
        { duration: '1m', target: 1000 },
        { duration: '4m', target: 1000 },   // Extended steady state
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    wishlist: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '10s', target: 1000 },  // Spike up
        { duration: '20s', target: 5 },     // Spike down
        { duration: '30s', target: 100 },   // Regular load test starts
        { duration: '1m', target: 300 },
        { duration: '1m', target: 500 },
        { duration: '1m', target: 700 },
        { duration: '1m', target: 1000 },
        { duration: '4m', target: 1000 },   // Extended steady state
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    tenant: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '10s', target: 1000 },  // Spike up
        { duration: '20s', target: 5 },     // Spike down
        { duration: '30s', target: 100 },   // Regular load test starts
        { duration: '1m', target: 300 },
        { duration: '1m', target: 500 },
        { duration: '1m', target: 700 },
        { duration: '1m', target: 1000 },
        { duration: '4m', target: 1000 },   // Extended steady state
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'errors': ['rate<0.2'],
    'auth_latency': ['p(95)<5000'],
    'product_latency': ['p(95)<5000'],
    'order_latency': ['p(95)<5000'],
    'cart_latency': ['p(95)<5000'],
    'wishlist_latency': ['p(95)<5000'],
    'tenant_latency': ['p(95)<5000'],
  },
};

// Add request timeout and retry configuration
const requestTimeout = '30s';
const maxRetries = 3;

function makeRequest(method, url, body = null, baseUrl = '', retryCount = 0) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
    timeout: requestTimeout,
  };

  let response;
  try {
    if (method === 'GET') {
      response = http.get(baseUrl + url, params);
    } else if (method === 'POST') {
      response = http.post(baseUrl + url, JSON.stringify(body), params);
    } else if (method === 'PUT') {
      response = http.put(baseUrl + url, JSON.stringify(body), params);
    } else if (method === 'DELETE') {
      response = http.del(baseUrl + url, null, params);
    }

    if (response.status >= 500 && retryCount < maxRetries) {
      sleep(1);
      return makeRequest(method, url, body, baseUrl, retryCount + 1);
    }
  } catch (error) {
    if (retryCount < maxRetries) {
      sleep(1);
      return makeRequest(method, url, body, baseUrl, retryCount + 1);
    }
    throw error;
  }

  return response;
}

// Replace makeAuthRequest with makeRequest
function makeAuthRequest(method, url, body = null, baseUrl = '') {
  return makeRequest(method, url, body, baseUrl);
}

export function authTest() {
  const startTime = new Date();

  const uniqueSuffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const username = `user${uniqueSuffix}`;
  const email = `user${uniqueSuffix}@example.com`;
  const phone_number = `+1${uniqueSuffix.padStart(10, '0')}`;

  const registerRes = http.post(`${AUTH_BASE_URL}/user/register`, JSON.stringify({
    username: username,
    email: email,
    password: "Password1",
    full_name: "John Doe",
    address: "123 Main Street, Anytown, USA",
    phone_number: phone_number
  }), { headers: { 'Content-Type': 'application/json' } });
  check(registerRes, { 'register status is 201': (r) => r.status === 201 });

  const loginRes = http.post(`${AUTH_BASE_URL}/user/login`, JSON.stringify({
    email: email,
    password: 'Password1',
  }), { headers: { 'Content-Type': 'application/json' } });
  check(loginRes, { 'login status is 200': (r) => r.status === 200 });

  const verifyTokenRes = http.post(`${AUTH_BASE_URL}/user/verify-token`, JSON.stringify({ token: AUTH_TOKEN }), { headers: { 'Content-Type': 'application/json' } });
  check(verifyTokenRes, { 'verify token status is 200': (r) => r.status === 200 });

  const verifyAdminTokenRes = http.post(`${AUTH_BASE_URL}/user/verify-admin-token`, JSON.stringify({ token: AUTH_TOKEN }), { headers: { 'Content-Type': 'application/json' } });
  check(verifyAdminTokenRes, { 'verify admin token status is 200': (r) => r.status === 200 });
  authLatency.add(new Date() - startTime);
  errorRate.add(registerRes.status !== 201 || loginRes.status !== 200);
  sleep(1);
}

export function productTest() {
  const startTime = new Date();

  try {
    const productsRes = makeRequest('GET', '/product', null, PRODUCTS_BASE_URL);
    check(productsRes, { 'products status is 200': (r) => r.status === 200 });

    sleep(0.5); // Add small delay between requests

    const categoriesRes = makeRequest('GET', '/product/category', null, PRODUCTS_BASE_URL);
    check(categoriesRes, { 'categories status is 200': (r) => r.status === 200 });

    sleep(0.5);

    const productId = PRODUCT_ID;
    const productByIdRes = makeRequest('GET', `/product/${productId}`, null, PRODUCTS_BASE_URL);
    check(productByIdRes, { 'product by id status': (r) => [200, 404].includes(r.status) });

    sleep(0.5);

    const manyProductsRes = makeRequest('POST', `/product/many`, JSON.stringify({ ids: [randomUUID(), randomUUID()] }), PRODUCTS_BASE_URL, { headers: { 'Content-Type': 'application/json' } });
    check(manyProductsRes, { 'many products status': (r) => [200, 404].includes(r.status) });

    sleep(0.5);

    const byCategoryRes = makeRequest('GET', `/product/category/${CATEGORY_ID}`, null, PRODUCTS_BASE_URL);
    check(byCategoryRes, { 'by category status': (r) => [200, 404].includes(r.status) });

    sleep(0.5);

    const createProductRes = makeRequest('POST', `/product`, {
      tenant_id: TENANT_ID,
      name: `Product ${randomInt(1, 10000)}`,
      description: 'A test product',
      price: randomInt(1000, 100000),
      quantity_available: randomInt(1, 100),
      category_id: CATEGORY_ID,
    }, PRODUCTS_BASE_URL);
    check(createProductRes, { 'create product status': (r) => [201, 200, 400].includes(r.status) });

    sleep(0.5);

    const createCategoryRes = makeRequest('POST', `/product/category`, {
      name: `Category ${randomInt(1, 10000)}`,
      tenant_id: TENANT_ID,
    }, PRODUCTS_BASE_URL);
    check(createCategoryRes, { 'create category status': (r) => [201, 200, 400].includes(r.status) });

    sleep(0.5);

    const editProductRes = makeRequest('PUT', `/product/${productId}`, {
      name: `Product Updated ${randomInt(1, 10000)}`,
      price: randomInt(1000, 100000),
      user_id: USER_ID
    }, PRODUCTS_BASE_URL);
    check(editProductRes, { 'edit product status': (r) => [200, 404].includes(r.status) });

    sleep(0.5);

    const editCategoryRes = makeRequest('PUT', `/product/category/${CATEGORY_ID}`, {
      name: `Category Updated ${randomInt(1, 10000)}`,
    }, PRODUCTS_BASE_URL);
    check(editCategoryRes, { 'edit category status': (r) => [200, 404].includes(r.status) });

    sleep(0.5);

    const deleteProductRes = makeRequest('DELETE', `/product/${productId}`, null, PRODUCTS_BASE_URL);
    check(deleteProductRes, { 'delete product status': (r) => [200, 404].includes(r.status) });

    sleep(0.5);

    const deleteCategoryRes = makeRequest('DELETE', `/product/category/${CATEGORY_ID}`, null, PRODUCTS_BASE_URL);
    check(deleteCategoryRes, { 'delete category status': (r) => [200, 404].includes(r.status) });
  } catch (error) {
    console.error('Error in productTest:', error);
  }

  productLatency.add(new Date() - startTime);
  errorRate.add(productsRes?.status !== 200);
  sleep(1);
}

export function tenantTest() {
  const startTime = new Date();

  const tenantId = TENANT_ID;
  const getTenantRes = makeAuthRequest('GET', `/tenant/${tenantId}`, null, TENANTS_BASE_URL);
  check(getTenantRes, { 'get tenant status': (r) => [200, 404].includes(r.status) });

  const createTenantRes = makeAuthRequest('POST', `/tenant`, {
    owner_id: randomUUID(),
    user_id: USER_ID
  }, TENANTS_BASE_URL);
  check(createTenantRes, { 'create tenant status': (r) => [201, 200, 400].includes(r.status) });

  const editTenantRes = makeAuthRequest('PUT', `/tenant/${tenantId}`, {
    owner_id: randomUUID(),
    user_id: USER_ID
  }, TENANTS_BASE_URL);
  check(editTenantRes, { 'edit tenant status': (r) => [200, 404].includes(r.status) });

  const deleteTenantRes = makeAuthRequest('DELETE', `/tenant`, {
    id: tenantId,
    user_id: USER_ID
  }, TENANTS_BASE_URL);
  check(deleteTenantRes, { 'delete tenant status': (r) => [200, 404].includes(r.status) });
  tenantLatency.add(new Date() - startTime);
  errorRate.add(getTenantRes.status !== 200);
  sleep(1);
}

export function orderTest() {
  const startTime = new Date();

  const ordersRes = makeAuthRequest('GET', `/order`, null, ORDERS_BASE_URL);
  check(ordersRes, { 'orders status is 200': (r) => r.status === 200 });

  const orderId = randomUUID();
  const orderDetailRes = makeAuthRequest('GET', `/order/${orderId}`, null, ORDERS_BASE_URL);
  check(orderDetailRes, { 'order detail status': (r) => [200, 404].includes(r.status) });

  const placeOrderRes = makeAuthRequest('POST', `/order`, {
    tenant_id: TENANT_ID,
    user_id: USER_ID,
    total_amount: randomInt(1000, 100000),
    shipping_provider: 'JNE',
    shipping_code: `SHIP${randomInt(1000,9999)}`,
    shipping_status: 'PENDING',
  }, ORDERS_BASE_URL);
  check(placeOrderRes, { 'place order status': (r) => [201, 200, 400].includes(r.status) });

  const payOrderRes = makeAuthRequest('POST', `/order/${orderId}/pay`, {
    payment_method: 'BANK_TRANSFER',
    payment_reference: `REF${randomInt(1000,9999)}`,
    amount: randomInt(1000, 100000),
  }, ORDERS_BASE_URL);
  check(payOrderRes, { 'pay order status': (r) => [200, 404].includes(r.status) });

  const cancelOrderRes = makeAuthRequest('POST', `/order/${orderId}/cancel`, {
    reason: 'Test cancel',
  }, ORDERS_BASE_URL);
  check(cancelOrderRes, { 'cancel order status': (r) => [200, 404].includes(r.status) });
  orderLatency.add(new Date() - startTime);
  errorRate.add(ordersRes.status !== 200);
  sleep(1);
}

export function cartTest() {
  const startTime = new Date();

  const cartRes = makeAuthRequest('GET', `/cart`, null, PRODUCTS_BASE_URL);
  check(cartRes, { 'cart status is 200': (r) => r.status === 200 });

  const addItemRes = makeAuthRequest('POST', `/cart`, {
    tenant_id: TENANT_ID,
    user_id: USER_ID,
    product_id: PRODUCT_ID,
    quantity: randomInt(1, 10),
  }, PRODUCTS_BASE_URL);
  check(addItemRes, { 'add item status': (r) => [201, 200, 400].includes(r.status) });

  const editCartRes = makeAuthRequest('PUT', `/cart`, {
    id: randomUUID(),
    quantity: randomInt(1, 10),
  }, PRODUCTS_BASE_URL);
  check(editCartRes, { 'edit cart status': (r) => [200, 404].includes(r.status) });

  const deleteCartRes = makeAuthRequest('DELETE', `/cart`, {
    id: randomUUID(),
  }, PRODUCTS_BASE_URL);
  check(deleteCartRes, { 'delete cart status': (r) => [200, 404].includes(r.status) });
  cartLatency.add(new Date() - startTime);
  errorRate.add(cartRes.status !== 200);
  sleep(1);
}

export function wishlistTest() {
  const startTime = new Date();

  const wishlistRes = makeAuthRequest('GET', `/wishlist`, {
    user_id: USER_ID
  }, PRODUCTS_BASE_URL);
  check(wishlistRes, { 'wishlist status is 200': (r) => r.status === 200 });

  const wishlistId = randomUUID();
  const wishlistByIdRes = makeAuthRequest('GET', `/wishlist/${wishlistId}`, {
    user_id: USER_ID
  }, PRODUCTS_BASE_URL);
  check(wishlistByIdRes, { 'wishlist by id status': (r) => [200, 404].includes(r.status) });

  const createWishlistRes = makeAuthRequest('POST', `/wishlist`, {
    tenant_id: TENANT_ID,
    user_id: USER_ID,
    name: `Wishlist ${randomInt(1, 10000)}`,
  }, PRODUCTS_BASE_URL);
  check(createWishlistRes, { 'create wishlist status': (r) => [201, 200, 400].includes(r.status) });

  const updateWishlistRes = makeAuthRequest('PUT', `/wishlist/${wishlistId}`, {
    name: `Wishlist Updated ${randomInt(1, 10000)}`,
    user_id: USER_ID
  }, PRODUCTS_BASE_URL);
  check(updateWishlistRes, { 'update wishlist status': (r) => [200, 404].includes(r.status) });

  const removeProductRes = makeAuthRequest('DELETE', `/wishlist/remove`, {
    wishlist_id: wishlistId,
    product_id: PRODUCT_ID,
    user_id: USER_ID
  }, PRODUCTS_BASE_URL);
  check(removeProductRes, { 'remove product status': (r) => [200, 404].includes(r.status) });

  const deleteWishlistRes = makeAuthRequest('DELETE', `/wishlist/${wishlistId}`, {
    user_id: USER_ID
  }, PRODUCTS_BASE_URL);
  check(deleteWishlistRes, { 'delete wishlist status': (r) => [200, 404].includes(r.status) });

  const addProductRes = makeAuthRequest('POST', `/wishlist/add`, {
    wishlist_id: wishlistId,
    product_id: PRODUCT_ID,
    user_id: USER_ID
  }, PRODUCTS_BASE_URL);
  check(addProductRes, { 'add product status': (r) => [201, 200, 400].includes(r.status) });
  wishlistLatency.add(new Date() - startTime);
  errorRate.add(wishlistRes.status !== 200);
  sleep(1);
}

export function setup() {
  // Use predefined IDs for setup
  let productIds = [PRODUCT_ID];
  let userId = USER_ID;
  let orderIds = [];
  let cartIds = [];
  let wishlistIds = [];
  return { productIds, userId, orderIds, cartIds, wishlistIds };
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function productBrowsingAndCartFlow(data) {
  let productId = pickId(PRODUCT_ID, randomUUID);
  http.get(`${PRODUCTS_BASE_URL}/product/${productId}`);
  http.post(`${PRODUCTS_BASE_URL}/cart`, JSON.stringify({ product_id: productId, user_id: pickId(USER_ID, randomUUID), quantity: 1, tenant_id: pickId(TENANT_ID, randomUUID) }), { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_TOKEN}` } });
  if (data.cartIds.length > 0) {
    let cartId = data.cartIds[0];
    http.put(`${PRODUCTS_BASE_URL}/cart`, JSON.stringify({ id: cartId, quantity: 2 }), { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_TOKEN}` } });
  }
  if (data.cartIds.length > 0) {
    let cartId = data.cartIds[0];
    http.del(`${PRODUCTS_BASE_URL}/cart`, JSON.stringify({ id: cartId }), { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_TOKEN}` } });
  }
}

function orderPlacementAndPaymentFlow(data) {
  http.get(`${PRODUCTS_BASE_URL}/cart?user_id=${USER_ID}`);

  let placeOrderRes = http.post(`${ORDERS_BASE_URL}/order`, JSON.stringify({
    tenant_id: TENANT_ID,
    user_id: USER_ID,
    total_amount: Math.floor(Math.random() * 100000) + 1000,
    shipping_provider: 'JNE',
    shipping_code: `SHIP${Math.floor(Math.random() * 10000)}`,
    shipping_status: 'PENDING',
  }), { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_TOKEN}` } });
  let orderId = null;
  try {
    orderId = JSON.parse(placeOrderRes.body).id;
  } catch (e) {}

  if (orderId) {
    http.post(`${ORDERS_BASE_URL}/order/${orderId}/pay`, JSON.stringify({
      payment_method: 'BANK_TRANSFER',
      payment_reference: `REF${Math.floor(Math.random() * 10000)}`,
      amount: Math.floor(Math.random() * 100000) + 1000,
    }), { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_TOKEN}` } });

    if (Math.random() < 0.5) {
      http.post(`${ORDERS_BASE_URL}/order/${orderId}/cancel`, JSON.stringify({ reason: 'Test cancel' }), { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_TOKEN}` } });
    }
  }
}

function wishlistFlow(data) {
  let productId = PRODUCT_ID;
  http.get(`${PRODUCTS_BASE_URL}/product/${productId}`);
  http.post(`${PRODUCTS_BASE_URL}/wishlist/add`, JSON.stringify({ wishlist_id: data.wishlistIds[0], product_id: productId }), { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_TOKEN}` } });
  http.del(`${PRODUCTS_BASE_URL}/wishlist/remove`, JSON.stringify({ wishlist_id: data.wishlistIds[0], product_id: productId }), { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_TOKEN}` } });
}

export default function(data) {
  try {
    let flows = [productBrowsingAndCartFlow, orderPlacementAndPaymentFlow, wishlistFlow];
    let flow = flows[Math.floor(Math.random() * flows.length)];
    flow(data);
    sleep(Math.random() * 2 + 1); // Random sleep between 1-3 seconds
  } catch (error) {
    console.error('Error in default function:', error);
  }
} 