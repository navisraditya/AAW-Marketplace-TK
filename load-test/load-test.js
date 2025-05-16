import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

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

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
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
      startVUs: 25,
      stages: [
        // 1 minute: frequent spiking to max VUs (simulate with quick ramps)
        { duration: '10s', target: 100 },
        { duration: '10s', target: 500 },
        { duration: '10s', target: 1000 },
        { duration: '30s', target: 25 },
        // Minutes 2-5: ramp up to max VUs
        { duration: '1m', target: 250 },
        { duration: '1m', target: 500 },
        { duration: '1m', target: 750 },
        { duration: '1m', target: 1000 },
        // Minutes 5-8: stay at max VUs
        { duration: '3m', target: 1000 },
        // Minutes 8-10: ramp down to 0
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    products: {
      executor: 'ramping-vus',
      startVUs: 25,
      stages: [
        { duration: '10s', target: 100 },
        { duration: '10s', target: 500 },
        { duration: '10s', target: 1000 },
        { duration: '30s', target: 25 },
        { duration: '1m', target: 250 },
        { duration: '1m', target: 500 },
        { duration: '1m', target: 750 },
        { duration: '1m', target: 1000 },
        { duration: '3m', target: 1000 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    orders: {
      executor: 'ramping-vus',
      startVUs: 25,
      stages: [
        { duration: '10s', target: 100 },
        { duration: '10s', target: 500 },
        { duration: '10s', target: 1000 },
        { duration: '30s', target: 25 },
        { duration: '1m', target: 250 },
        { duration: '1m', target: 500 },
        { duration: '1m', target: 750 },
        { duration: '1m', target: 1000 },
        { duration: '3m', target: 1000 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    cart: {
      executor: 'ramping-vus',
      startVUs: 25,
      stages: [
        { duration: '10s', target: 100 },
        { duration: '10s', target: 500 },
        { duration: '10s', target: 1000 },
        { duration: '30s', target: 25 },
        { duration: '1m', target: 250 },
        { duration: '1m', target: 500 },
        { duration: '1m', target: 750 },
        { duration: '1m', target: 1000 },
        { duration: '3m', target: 1000 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    wishlist: {
      executor: 'ramping-vus',
      startVUs: 25,
      stages: [
        { duration: '10s', target: 100 },
        { duration: '10s', target: 500 },
        { duration: '10s', target: 1000 },
        { duration: '30s', target: 25 },
        { duration: '1m', target: 250 },
        { duration: '1m', target: 500 },
        { duration: '1m', target: 750 },
        { duration: '1m', target: 1000 },
        { duration: '3m', target: 1000 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    tenant: {
      executor: 'ramping-vus',
      startVUs: 25,
      stages: [
        { duration: '10s', target: 100 },
        { duration: '10s', target: 500 },
        { duration: '10s', target: 1000 },
        { duration: '30s', target: 25 },
        { duration: '1m', target: 250 },
        { duration: '1m', target: 500 },
        { duration: '1m', target: 750 },
        { duration: '1m', target: 1000 },
        { duration: '3m', target: 1000 },
        { duration: '2m', target: 0 },
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
  } else if (method === 'PUT') {
    response = http.put(url, JSON.stringify(body), params);
  } else if (method === 'DELETE') {
    response = http.del(url, null, params);
  }
  return response;
}


export function authTest() {
  const startTime = new Date();

  const registerRes = http.post(`${BASE_URL}/user/register`, JSON.stringify({
    email: `test${Date.now()}@example.com`,
    password: 'testpassword123',
    name: 'Test User',
  }), { headers: { 'Content-Type': 'application/json' } });
  check(registerRes, { 'register status is 201': (r) => r.status === 201 });

  const loginRes = http.post(`${BASE_URL}/user/login`, JSON.stringify({
    email: 'test@example.com',
    password: 'testpassword123',
  }), { headers: { 'Content-Type': 'application/json' } });
  check(loginRes, { 'login status is 200': (r) => r.status === 200 });

  const verifyTokenRes = http.post(`${BASE_URL}/user/verify-token`, JSON.stringify({ token: AUTH_TOKEN }), { headers: { 'Content-Type': 'application/json' } });
  check(verifyTokenRes, { 'verify token status is 200': (r) => r.status === 200 });

  const verifyAdminTokenRes = http.post(`${BASE_URL}/user/verify-admin-token`, JSON.stringify({ token: AUTH_TOKEN }), { headers: { 'Content-Type': 'application/json' } });
  check(verifyAdminTokenRes, { 'verify admin token status is 200': (r) => r.status === 200 });
  authLatency.add(new Date() - startTime);
  errorRate.add(registerRes.status !== 201 || loginRes.status !== 200);
  sleep(1);
}


export function productTest() {
  const startTime = new Date();

  const productsRes = http.get(`${BASE_URL}/products`);
  check(productsRes, { 'products status is 200': (r) => r.status === 200 });

  const categoriesRes = http.get(`${BASE_URL}/products/category`);
  check(categoriesRes, { 'categories status is 200': (r) => r.status === 200 });

  const productId = PRODUCT_ID;
  const productByIdRes = http.get(`${BASE_URL}/products/${productId}`);
  check(productByIdRes, { 'product by id status': (r) => [200, 404].includes(r.status) });

  const manyProductsRes = http.post(`${BASE_URL}/products/many`, JSON.stringify({ ids: [randomUUID(), randomUUID()] }), { headers: { 'Content-Type': 'application/json' } });
  check(manyProductsRes, { 'many products status': (r) => [200, 404].includes(r.status) });

  const byCategoryRes = http.get(`${BASE_URL}/products/category/${CATEGORY_ID}`);
  check(byCategoryRes, { 'by category status': (r) => [200, 404].includes(r.status) });

  const createProductRes = makeAuthRequest('POST', `${BASE_URL}/products`, {
    tenant_id: TENANT_ID,
    name: `Product ${randomInt(1, 10000)}`,
    description: 'A test product',
    price: randomInt(1000, 100000),
    quantity_available: randomInt(1, 100),
    category_id: CATEGORY_ID,
  });
  check(createProductRes, { 'create product status': (r) => [201, 200, 400].includes(r.status) });

  const createCategoryRes = makeAuthRequest('POST', `${BASE_URL}/products/category`, {
    name: `Category ${randomInt(1, 10000)}`,
    tenant_id: TENANT_ID,
  });
  check(createCategoryRes, { 'create category status': (r) => [201, 200, 400].includes(r.status) });

  const editProductRes = makeAuthRequest('PUT', `${BASE_URL}/products/${productId}`, {
    name: `Product Updated ${randomInt(1, 10000)}`,
    price: randomInt(1000, 100000),
  });
  check(editProductRes, { 'edit product status': (r) => [200, 404].includes(r.status) });

  const editCategoryRes = makeAuthRequest('PUT', `${BASE_URL}/products/category/${CATEGORY_ID}`, {
    name: `Category Updated ${randomInt(1, 10000)}`,
  });
  check(editCategoryRes, { 'edit category status': (r) => [200, 404].includes(r.status) });

  const deleteProductRes = makeAuthRequest('DELETE', `${BASE_URL}/products/${productId}`);
  check(deleteProductRes, { 'delete product status': (r) => [200, 404].includes(r.status) });

  const deleteCategoryRes = makeAuthRequest('DELETE', `${BASE_URL}/products/category/${CATEGORY_ID}`);
  check(deleteCategoryRes, { 'delete category status': (r) => [200, 404].includes(r.status) });
  productLatency.add(new Date() - startTime);
  errorRate.add(productsRes.status !== 200);
  sleep(1);
}


export function tenantTest() {
  const startTime = new Date();

  const tenantId = TENANT_ID;
  const getTenantRes = makeAuthRequest('GET', `${BASE_URL}/tenant/${tenantId}`);
  check(getTenantRes, { 'get tenant status': (r) => [200, 404].includes(r.status) });

  const createTenantRes = makeAuthRequest('POST', `${BASE_URL}/tenant`, {
    owner_id: randomUUID(),
  });
  check(createTenantRes, { 'create tenant status': (r) => [201, 200, 400].includes(r.status) });

  const editTenantRes = makeAuthRequest('PUT', `${BASE_URL}/tenant/${tenantId}`, {
    owner_id: randomUUID(),
  });
  check(editTenantRes, { 'edit tenant status': (r) => [200, 404].includes(r.status) });

  const deleteTenantRes = makeAuthRequest('DELETE', `${BASE_URL}/tenant`, {
    id: tenantId,
  });
  check(deleteTenantRes, { 'delete tenant status': (r) => [200, 404].includes(r.status) });
  tenantLatency.add(new Date() - startTime);
  errorRate.add(getTenantRes.status !== 200);
  sleep(1);
}


export function orderTest() {
  const startTime = new Date();

  const ordersRes = makeAuthRequest('GET', `${BASE_URL}/orders`);
  check(ordersRes, { 'orders status is 200': (r) => r.status === 200 });

  const orderId = randomUUID();
  const orderDetailRes = makeAuthRequest('GET', `${BASE_URL}/orders/${orderId}`);
  check(orderDetailRes, { 'order detail status': (r) => [200, 404].includes(r.status) });

  const placeOrderRes = makeAuthRequest('POST', `${BASE_URL}/orders`, {
    tenant_id: TENANT_ID,
    user_id: USER_ID,
    total_amount: randomInt(1000, 100000),
    shipping_provider: 'JNE',
    shipping_code: `SHIP${randomInt(1000,9999)}`,
    shipping_status: 'PENDING',
  });
  check(placeOrderRes, { 'place order status': (r) => [201, 200, 400].includes(r.status) });

  const payOrderRes = makeAuthRequest('POST', `${BASE_URL}/orders/${orderId}/pay`, {
    payment_method: 'BANK_TRANSFER',
    payment_reference: `REF${randomInt(1000,9999)}`,
    amount: randomInt(1000, 100000),
  });
  check(payOrderRes, { 'pay order status': (r) => [200, 404].includes(r.status) });

  const cancelOrderRes = makeAuthRequest('POST', `${BASE_URL}/orders/${orderId}/cancel`, {
    reason: 'Test cancel',
  });
  check(cancelOrderRes, { 'cancel order status': (r) => [200, 404].includes(r.status) });
  orderLatency.add(new Date() - startTime);
  errorRate.add(ordersRes.status !== 200);
  sleep(1);
}


export function cartTest() {
  const startTime = new Date();

  const cartRes = makeAuthRequest('GET', `${BASE_URL}/cart`);
  check(cartRes, { 'cart status is 200': (r) => r.status === 200 });

  const addItemRes = makeAuthRequest('POST', `${BASE_URL}/cart`, {
    tenant_id: TENANT_ID,
    user_id: USER_ID,
    product_id: PRODUCT_ID,
    quantity: randomInt(1, 10),
  });
  check(addItemRes, { 'add item status': (r) => [201, 200, 400].includes(r.status) });

  const editCartRes = makeAuthRequest('PUT', `${BASE_URL}/cart`, {
    id: randomUUID(),
    quantity: randomInt(1, 10),
  });
  check(editCartRes, { 'edit cart status': (r) => [200, 404].includes(r.status) });

  const deleteCartRes = makeAuthRequest('DELETE', `${BASE_URL}/cart`, {
    id: randomUUID(),
  });
  check(deleteCartRes, { 'delete cart status': (r) => [200, 404].includes(r.status) });
  cartLatency.add(new Date() - startTime);
  errorRate.add(cartRes.status !== 200);
  sleep(1);
}

export function wishlistTest() {
  const startTime = new Date();

  const wishlistRes = makeAuthRequest('GET', `${BASE_URL}/wishlist`);
  check(wishlistRes, { 'wishlist status is 200': (r) => r.status === 200 });

  const wishlistId = randomUUID();
  const wishlistByIdRes = makeAuthRequest('GET', `${BASE_URL}/wishlist/${wishlistId}`);
  check(wishlistByIdRes, { 'wishlist by id status': (r) => [200, 404].includes(r.status) });

  const createWishlistRes = makeAuthRequest('POST', `${BASE_URL}/wishlist`, {
    tenant_id: TENANT_ID,
    user_id: USER_ID,
    name: `Wishlist ${randomInt(1, 10000)}`,
  });
  check(createWishlistRes, { 'create wishlist status': (r) => [201, 200, 400].includes(r.status) });

  const updateWishlistRes = makeAuthRequest('PUT', `${BASE_URL}/wishlist/${wishlistId}`, {
    name: `Wishlist Updated ${randomInt(1, 10000)}`,
  });
  check(updateWishlistRes, { 'update wishlist status': (r) => [200, 404].includes(r.status) });

  const removeProductRes = makeAuthRequest('DELETE', `${BASE_URL}/wishlist/remove`, {
    wishlist_id: wishlistId,
    product_id: PRODUCT_ID,
  });
  check(removeProductRes, { 'remove product status': (r) => [200, 404].includes(r.status) });

  const deleteWishlistRes = makeAuthRequest('DELETE', `${BASE_URL}/wishlist/${wishlistId}`);
  check(deleteWishlistRes, { 'delete wishlist status': (r) => [200, 404].includes(r.status) });

  const addProductRes = makeAuthRequest('POST', `${BASE_URL}/wishlist/add`, {
    wishlist_id: wishlistId,
    product_id: PRODUCT_ID,
  });
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
  http.get(`${BASE_URL}/products/${productId}`);
  http.post(`${BASE_URL}/cart`, JSON.stringify({ product_id: productId, user_id: pickId(USER_ID, randomUUID), quantity: 1, tenant_id: pickId(TENANT_ID, randomUUID) }), { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_TOKEN}` } });
  if (data.cartIds.length > 0) {
    let cartId = data.cartIds[0];
    http.put(`${BASE_URL}/cart`, JSON.stringify({ id: cartId, quantity: 2 }), { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_TOKEN}` } });
  }
  if (data.cartIds.length > 0) {
    let cartId = data.cartIds[0];
    http.del(`${BASE_URL}/cart`, JSON.stringify({ id: cartId }), { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_TOKEN}` } });
  }
}

function orderPlacementAndPaymentFlow(data) {
  http.get(`${BASE_URL}/cart?user_id=${USER_ID}`);

  let placeOrderRes = http.post(`${BASE_URL}/orders`, JSON.stringify({
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
    http.post(`${BASE_URL}/orders/${orderId}/pay`, JSON.stringify({
      payment_method: 'BANK_TRANSFER',
      payment_reference: `REF${Math.floor(Math.random() * 10000)}`,
      amount: Math.floor(Math.random() * 100000) + 1000,
    }), { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_TOKEN}` } });

    if (Math.random() < 0.5) {
      http.post(`${BASE_URL}/orders/${orderId}/cancel`, JSON.stringify({ reason: 'Test cancel' }), { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_TOKEN}` } });
    }
  }
}

function wishlistFlow(data) {
  let productId = PRODUCT_ID;
  http.get(`${BASE_URL}/products/${productId}`);
  http.post(`${BASE_URL}/wishlist/add`, JSON.stringify({ wishlist_id: data.wishlistIds[0], product_id: productId }), { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_TOKEN}` } });
  http.del(`${BASE_URL}/wishlist/remove`, JSON.stringify({ wishlist_id: data.wishlistIds[0], product_id: productId }), { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_TOKEN}` } });
}

export default function(data) {
  let flows = [productBrowsingAndCartFlow, orderPlacementAndPaymentFlow, wishlistFlow];
  let flow = flows[Math.floor(Math.random() * flows.length)];
  flow(data);
  sleep(Math.random());
} 