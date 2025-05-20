import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Service URLs
const AUTH_BASE_URL = __ENV.AUTH_BASE_URL || 'http://52.204.141.213:30000';
const PRODUCTS_BASE_URL = __ENV.PRODUCTS_BASE_URL || 'http://52.204.141.213:30002';
const ORDERS_BASE_URL = __ENV.ORDERS_BASE_URL || 'http://52.204.141.213:30001';
const WISHLIST_BASE_URL = __ENV.WISHLIST_BASE_URL || 'http://52.204.141.213:30004';

// UUID Tracking System
const uuidTracker = {
  auth: {
    userId: null,
    token: null
  },
  products: {
    productIds: [],
    categoryIds: []
  },
  orders: {
    orderIds: []
  },
//   cart: {
//     cartIds: []
//   },
  wishlist: {
    wishlistIds: [],
    productIds: []
  }
};

// Helper function to store UUID
function storeUUID(service, type, uuid) {
  if (Array.isArray(uuidTracker[service][type])) {
    uuidTracker[service][type].push(uuid);
  } else {
    uuidTracker[service][type] = uuid;
  }
}

// Helper function to get random UUID from stored list
function getRandomUUID(service, type) {
  const uuids = uuidTracker[service][type];
  if (Array.isArray(uuids) && uuids.length > 0) {
    return uuids[Math.floor(Math.random() * uuids.length)];
  }
  return null;
}

// Metrics per scenario
const errorRates = {
  auth: new Rate('auth_errors'),
  products: new Rate('products_errors'),
  orders: new Rate('orders_errors'),
  wishlist: new Rate('wishlist_errors'),
};
const cacheMissRates = {
  products: new Rate('products_cache_miss'),
};
const trends = {
  auth: new Trend('auth_duration'),
  products: new Trend('products_duration'),
  orders: new Trend('orders_duration'),
  wishlist: new Trend('wishlist_duration'),
};
const successfulLogins = new Counter('successful_logins');

export let options = {
  scenarios: {
    auth: {
      executor: 'ramping-vus',
      startVUs: 500,
      stages: [
        { duration: '5s', target: 500},    // Initial spike
        { duration: '55s', target: 0},   // Quick ramp-down
        { duration: '4m', target: 500},    // Slow ramp-up
        { duration: '4m', target: 500},    // Maintain max load
        { duration: '1m', target: 0},       // Aggressive ramp-down
      ],
      exec: 'authScenario',
    },
    products: {
      executor: 'ramping-vus',
      startVUs: 500,
      stages: [
        { duration: '5s', target: 500},    // Initial spike
        { duration: '55s', target: 0},   // Quick ramp-down
        { duration: '4m', target: 500},    // Slow ramp-up
        { duration: '4m', target: 500},    // Maintain max load
        { duration: '1m', target: 0},       // Aggressive ramp-down
      ],
      exec: 'productsScenario',
    },
    orders: {
      executor: 'ramping-vus',
      startVUs: 500,
      stages: [
        { duration: '5s', target: 500},    // Initial spike
        { duration: '55s', target: 0},   // Quick ramp-down
        { duration: '4m', target: 500},    // Slow ramp-up
        { duration: '4m', target: 500},    // Maintain max load
        { duration: '1m', target: 0},       // Aggressive ramp-down
      ],
      exec: 'ordersScenario',
    },
    // cart: {
    //   executor: 'ramping-vus',
    //   startVUs: 500,
    //   stages: [
    //     { duration: '5s', target: 100 },    // Initial spike
    //     { duration: '55s', target: 5 },     // Quick ramp-down
    //     { duration: '4m', target: 100 },    // Slow ramp-up
    //     { duration: '4m', target: 100 },    // Maintain max load
    //     { duration: '1m', target: 0 },       // Aggressive ramp-down
    //   ],
    //   exec: 'cartScenario',
    // },
    wishlist: {
      executor: 'ramping-vus',
      startVUs: 500,
      stages: [
        { duration: '5s', target: 500},    // Initial spike
        { duration: '55s', target: 0},   // Quick ramp-down
        { duration: '4m', target: 500},    // Slow ramp-up
        { duration: '4m', target: 500},    // Maintain max load
        { duration: '1m', target: 0},       // Aggressive ramp-down
      ],
      exec: 'wishlistScenario',
    },
  },
  thresholds: {
    'auth_errors': ['rate<0.05'],
    'products_errors': ['rate<0.05'],
    'orders_errors': ['rate<0.05'],
    'wishlist_errors': ['rate<0.05'],
    'products_cache_miss': ['rate<0.2'],
    'auth_duration': ['p(95)<2000'],
    'products_duration': ['p(95)<2000'],
    'orders_duration': ['p(95)<2000'],
    'wishlist_duration': ['p(95)<2000'],
  },
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomString(length) {
  let chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; ++i) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}
function randomBool(prob = 0.5) {
  return Math.random() < prob;
}

function getUserId() {
  // Return a UUID v4 for user ID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Helper function to check if status code is an error
function isErrorStatus(status) {
  return status >= 400 && status < 600;
}

// Helper function to check if status code is 500 or 0 (network error)
function isServerError(status) {
  return status === 500 || status === 0;
}



// MULAI RUN TEST

// Setup function to seed data before running tests
export function setup() {
  console.log('Starting data seeding...');
  
  // Seed Users
  let userSeedRes = http.get(`${AUTH_BASE_URL}/user/seed-user`);
  console.log(`User seeding status: ${userSeedRes.status}`);
  check(userSeedRes, {
    'user seeding successful': (r) => r.status === 200 || r.status === 201
  });

  // Seed Products
  let productSeedRes = http.get(`${PRODUCTS_BASE_URL}/product/seed-seed`);
  console.log(`Product seeding status: ${productSeedRes.status}`);
  check(productSeedRes, {
    'product seeding successful': (r) => r.status === 200 || r.status === 201
  });

  // Seed Orders
  let orderSeedRes = http.get(`${ORDERS_BASE_URL}/order/seed-seed`);
  console.log(`Order seeding status: ${orderSeedRes.status}`);
  check(orderSeedRes, {
    'order seeding successful': (r) => r.status === 200 || r.status === 201
  });

  console.log('Data seeding completed');
  return {};
}

// --- Scenario Functions ---

export function authScenario() {
  let username = `user${randomString(8)}`;
  let email = `${username}@example.com`;
  let password = 'Password1';
  let full_name = 'Test User';
  let address = '123 Test St';
  let phone_number = `+1${randomInt(1000000000,9999999999)}`;
  let start = Date.now();
  let actionsLog = [];
  let errors = 0;

  // Register
  let regRes = http.post(`${AUTH_BASE_URL}/user/register`, JSON.stringify({
    username, email, password, full_name, address, phone_number
  }), { headers: { 'Content-Type': 'application/json' } });
  actionsLog.push(`Register: status ${regRes.status}`);
  let regOk = !isServerError(regRes.status);
  if (!regOk) errors++;

  // Login
  let loginRes = http.post(`${AUTH_BASE_URL}/user/login`, JSON.stringify({ username, password }), { headers: { 'Content-Type': 'application/json' } });
  actionsLog.push(`Login: status ${loginRes.status}`);
  let loginOk = !isServerError(loginRes.status);
  if (!loginOk) errors++;
  let token = '';
  if (loginOk) {
    successfulLogins.add(1);
    try { 
      token = JSON.parse(loginRes.body).token;
      storeUUID('auth', 'token', token);
      // Extract user ID from token or response if available
      if (loginRes.body.userId) {
        storeUUID('auth', 'userId', loginRes.body.userId);
      }
    } catch (_) {}
  }

  // Verify token
  if (token) {
    let verifyRes = http.post(`${AUTH_BASE_URL}/user/verify-token`, JSON.stringify({ token }), { headers: { 'Content-Type': 'application/json' } });
    actionsLog.push(`Verify token: status ${verifyRes.status}`);
    if (verifyRes.status === 500) errors++;
    check(verifyRes, { 'verify token 200': (r) => r.status === 200 });
  }

  errorRates.auth.add(!(regOk && loginOk));
  trends.auth.add(Date.now() - start);
  actionsLog.push(`Total errors: ${errors}`);
  console.log(`[authScenario] Actions: \n${actionsLog.join('\n')}`);
  sleep(randomInt(1, 3));
}

export function productsScenario() {
  let token = getRandomUUID('auth', 'token') || `fake-token-${randomString(8)}`;
  let headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  let start = Date.now();
  let actionsLog = [];
  let errors = 0;

  // Create product
  let productRes = http.post(`${PRODUCTS_BASE_URL}/product`, JSON.stringify({
    name: `Product ${randomString(5)}`,
    description: 'Test product',
    price: randomInt(1000, 10000),
    quantity_available: randomInt(1, 100)
  }), { headers });
  
  if (productRes.status === 201) {
    try {
      const productData = JSON.parse(productRes.body);
      storeUUID('products', 'productIds', productData.id);
    } catch (_) {}
  }

  // Create category
  let categoryRes = http.post(`${PRODUCTS_BASE_URL}/product/category`, JSON.stringify({
    name: `Category ${randomString(5)}`
  }), { headers });
  
  if (categoryRes.status === 201) {
    try {
      const categoryData = JSON.parse(categoryRes.body);
      storeUUID('products', 'categoryIds', categoryData.id);
    } catch (_) {}
  }

  // Use stored UUIDs for other operations
  let productId = getRandomUUID('products', 'productIds') || randomString(8);
  let categoryId = getRandomUUID('products', 'categoryIds') || randomString(8);

  let actions = [
    () => { let r = http.get(`${PRODUCTS_BASE_URL}/product`, { headers }); actionsLog.push(`Get all products: status ${r.status}`); if (isServerError(r.status)) errors++; errorRates.products.add(isServerError(r.status)); },
    () => { let r = http.post(`${PRODUCTS_BASE_URL}/product/many`, JSON.stringify({ productIds: [productId, randomString(8)] }), { headers }); actionsLog.push(`Get many products: status ${r.status}`); if (isServerError(r.status)) errors++; errorRates.products.add(isServerError(r.status)); },
    () => { let r = http.get(`${PRODUCTS_BASE_URL}/product/${productId}`, { headers }); actionsLog.push(`Get product by ID: status ${r.status}`); if (isServerError(r.status)) errors++; errorRates.products.add(isServerError(r.status)); },
    () => { let r = http.get(`${PRODUCTS_BASE_URL}/product/category/${categoryId}`, { headers }); actionsLog.push(`Get product by category: status ${r.status}`); if (isServerError(r.status)) errors++; errorRates.products.add(isServerError(r.status)); },
    () => { let r = http.post(`${PRODUCTS_BASE_URL}/product`, JSON.stringify({ name: `Product ${randomString(5)}`, description: 'desc', price: randomInt(1000, 10000), quantity_available: randomInt(1, 10), category_id: categoryId }), { headers }); actionsLog.push(`Create product: status ${r.status}`); if (isServerError(r.status)) errors++; errorRates.products.add(isServerError(r.status)); },
    () => { let r = http.put(`${PRODUCTS_BASE_URL}/product/${productId}`, JSON.stringify({ name: `Edit Product ${randomString(5)}`, description: 'desc', price: randomInt(1000, 10000), quantity_available: randomInt(1, 10), category_id: categoryId }), { headers }); actionsLog.push(`Edit product: status ${r.status}`); if (isServerError(r.status)) errors++; errorRates.products.add(isServerError(r.status)); },
    () => { let r = http.del(`${PRODUCTS_BASE_URL}/product/${productId}`, null, { headers }); actionsLog.push(`Delete product: status ${r.status}`); if (isServerError(r.status)) errors++; errorRates.products.add(isServerError(r.status)); },
    () => { let r = http.get(`${PRODUCTS_BASE_URL}/product/category`, { headers }); actionsLog.push(`Get all categories: status ${r.status}`); if (isServerError(r.status)) errors++; errorRates.products.add(isServerError(r.status)); },
    () => { let r = http.post(`${PRODUCTS_BASE_URL}/product/category`, JSON.stringify({ name: `Category ${randomString(5)}` }), { headers }); actionsLog.push(`Create category: status ${r.status}`); if (isServerError(r.status)) errors++; errorRates.products.add(isServerError(r.status)); },
    () => { let r = http.put(`${PRODUCTS_BASE_URL}/product/category/${categoryId}`, JSON.stringify({ name: `EditCat ${randomString(5)}` }), { headers }); actionsLog.push(`Edit category: status ${r.status}`); if (isServerError(r.status)) errors++; errorRates.products.add(isServerError(r.status)); },
    () => { let r = http.del(`${PRODUCTS_BASE_URL}/product/category/${categoryId}`, null, { headers }); actionsLog.push(`Delete category: status ${r.status}`); if (isServerError(r.status)) errors++; errorRates.products.add(isServerError(r.status)); },
  ];
  let n = randomInt(2, 4);
  for (let i = 0; i < n; i++) {
    let action = actions[randomInt(0, actions.length - 1)];
    action();
    sleep(randomInt(1, 2));
  }
  actionsLog.push(`Total errors: ${errors}`);
  console.log(`[productsScenario] Actions: \n${actionsLog.join('\n')}`);
}

export function ordersScenario() {
  let token = getRandomUUID('auth', 'token') || `fake-token-${randomString(8)}`;
  let headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  let start = Date.now();
  let actionsLog = [];
  let errors = 0;

  // Verify token and get user ID from auth service
  let verifyRes = http.post(`${AUTH_BASE_URL}/user/verify-token`, JSON.stringify({ token }), { headers });
  let userId = null;
  if (verifyRes.status === 200) {
    try {
      const userData = JSON.parse(verifyRes.body);
      userId = userData.id;
      storeUUID('auth', 'userId', userId);
    } catch (_) {}
  }

  // Create order with verified user ID
  let orderRes = http.post(`${ORDERS_BASE_URL}/order`, JSON.stringify({
    user_id: userId || getRandomUUID('auth', 'userId') || randomString(8),
    items: [{
      product_id: getRandomUUID('products', 'productIds') || randomString(8),
      quantity: randomInt(1, 5)
    }]
  }), { headers });

  if (orderRes.status === 201) {
    try {
      const orderData = JSON.parse(orderRes.body);
      storeUUID('orders', 'orderIds', orderData.id);
    } catch (_) {}
  }

  // Use stored order ID for other operations
  let orderId = getRandomUUID('orders', 'orderIds') || randomString(8);

  let actions = [
    () => { let r = http.get(`${ORDERS_BASE_URL}/order?user=${orderId}`, { headers }); actionsLog.push(`Get all orders: status ${r.status}`); if (isServerError(r.status)) errors++; errorRates.orders.add(isServerError(r.status)); },
    () => { let r = http.get(`${ORDERS_BASE_URL}/order/${orderId}?user=${orderId}`, { headers }); actionsLog.push(`Get order detail: status ${r.status}`); if (isServerError(r.status)) errors++; errorRates.orders.add(isServerError(r.status)); },
    () => { let r = http.post(`${ORDERS_BASE_URL}/order/${orderId}/pay`, JSON.stringify({ payment_method: 'BANK_TRANSFER', payment_reference: `PAY${randomInt(1000,9999)}`, amount: randomInt(1000, 100000) }), { headers }); actionsLog.push(`Pay order: status ${r.status}`); if (isServerError(r.status)) errors++; errorRates.orders.add(isServerError(r.status)); },
    () => { let r = http.post(`${ORDERS_BASE_URL}/order/${orderId}/cancel`, JSON.stringify({ user: orderId }), { headers }); actionsLog.push(`Cancel order: status ${r.status}`); if (isServerError(r.status)) errors++; errorRates.orders.add(isServerError(r.status)); },
  ];
  let n = randomInt(2, 4);
  for (let i = 0; i < n; i++) {
    let action = actions[randomInt(0, actions.length - 1)];
    action();
    sleep(randomInt(1, 2));
  }
  trends.orders.add(Date.now() - start);
  actionsLog.push(`Total errors: ${errors}`);
  console.log(`[ordersScenario] Actions: \n${actionsLog.join('\n')}`);
}

// export function cartScenario() {
//   let token = `fake-token-${randomString(8)}`;
//   let headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
//   let start = Date.now();
//   let userId = getUserId();
//   let cartId = randomString(8);
//   let productId = randomString(8);
//   let actionsLog = [];
//   let errors = 0;

//   let actions = [
//     () => { let r = http.get(`${PRODUCTS_BASE_URL}/cart`, { headers }); actionsLog.push(`Get cart: status ${r.status}`); if (r.status === 500) errors++; errorRates.cart.add(r.status === 500); },
//     () => { let r = http.post(`${PRODUCTS_BASE_URL}/cart`, JSON.stringify({ user: userId, product_id: productId, quantity: randomInt(1, 5) }), { headers }); actionsLog.push(`Add to cart: status ${r.status}`); if (r.status === 500) errors++; errorRates.cart.add(r.status === 500); },
//     () => { let r = http.put(`${PRODUCTS_BASE_URL}/cart`, JSON.stringify({ id: cartId, user: userId, quantity: randomInt(1, 5) }), { headers }); actionsLog.push(`Edit cart: status ${r.status}`); if (r.status === 500) errors++; errorRates.cart.add(r.status === 500); },
//     () => { let r = http.del(`${PRODUCTS_BASE_URL}/cart`, JSON.stringify({ id: cartId, user: userId }), { headers }); actionsLog.push(`Delete from cart: status ${r.status}`); if (r.status === 500) errors++; errorRates.cart.add(r.status === 500); },
//   ];
//   let n = randomInt(2, 4);
//   for (let i = 0; i < n; i++) {
//     let action = actions[randomInt(0, actions.length - 1)];
//     action();
//     sleep(randomInt(1, 2));
//   }
//   trends.cart.add(Date.now() - start);
//   actionsLog.push(`Total errors: ${errors}`);
//   console.log(`[cartScenario] Actions: \n${actionsLog.join('\n')}`);
// }

export function wishlistScenario() {
  let token = getRandomUUID('auth', 'token') || `fake-token-${randomString(8)}`;
  let headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  let start = Date.now();
  let actionsLog = [];
  let errors = 0;

  // Verify token and get user ID from auth service
  let verifyRes = http.post(`${AUTH_BASE_URL}/user/verify-token`, JSON.stringify({ token }), { headers });
  let userId = null;
  if (verifyRes.status === 200) {
    try {
      const userData = JSON.parse(verifyRes.body);
      userId = userData.id;
      storeUUID('auth', 'userId', userId);
    } catch (_) {}
  }

  // Create wishlist with verified user ID
  let wishlistRes = http.post(`${WISHLIST_BASE_URL}/wishlist`, JSON.stringify({
    user_id: userId || getRandomUUID('auth', 'userId') || randomString(8),
    name: `Wishlist ${randomString(5)}`
  }), { headers });

  if (wishlistRes.status === 201) {
    try {
      const wishlistData = JSON.parse(wishlistRes.body);
      storeUUID('wishlist', 'wishlistIds', wishlistData.id);
    } catch (_) {}
  }

  // Use stored UUIDs for other operations
  let wishlistId = getRandomUUID('wishlist', 'wishlistIds') || randomString(8);
  let productId = getRandomUUID('products', 'productIds') || randomString(8);

  let actions = [
    () => { let r = http.get(`${WISHLIST_BASE_URL}/wishlist?user=${wishlistId}`, { headers }); actionsLog.push(`Get all wishlists: status ${r.status}`); if (isServerError(r.status)) errors++; errorRates.wishlist.add(isServerError(r.status)); },
    () => { let r = http.get(`${WISHLIST_BASE_URL}/wishlist/${wishlistId}?user=${wishlistId}`, { headers }); actionsLog.push(`Get wishlist by ID: status ${r.status}`); if (isServerError(r.status)) errors++; errorRates.wishlist.add(isServerError(r.status)); },
    () => { let r = http.put(`${WISHLIST_BASE_URL}/wishlist/${wishlistId}`, JSON.stringify({ name: `Updated Wishlist ${randomString(5)}` }), { headers }); actionsLog.push(`Update wishlist: status ${r.status}`); if (isServerError(r.status)) errors++; errorRates.wishlist.add(isServerError(r.status)); },
    () => { let r = http.del(`${WISHLIST_BASE_URL}/wishlist/${wishlistId}`, null, { headers }); actionsLog.push(`Delete wishlist: status ${r.status}`); if (isServerError(r.status)) errors++; errorRates.wishlist.add(isServerError(r.status)); },
    () => { let r = http.post(`${WISHLIST_BASE_URL}/wishlist/product`, JSON.stringify({ user: wishlistId, wishlist_id: wishlistId, product_id: productId }), { headers }); actionsLog.push(`Add product to wishlist: status ${r.status}`); if (isServerError(r.status)) errors++; errorRates.wishlist.add(isServerError(r.status)); },
    () => { let r = http.del(`${WISHLIST_BASE_URL}/wishlist/product`, JSON.stringify({ user: wishlistId, id: productId }), { headers }); actionsLog.push(`Remove product from wishlist: status ${r.status}`); if (isServerError(r.status)) errors++; errorRates.wishlist.add(isServerError(r.status)); },
  ];
  let n = randomInt(2, 4);
  for (let i = 0; i < n; i++) {
    let action = actions[randomInt(0, actions.length - 1)];
    action();
    sleep(randomInt(1, 2));
  }
  trends.wishlist.add(Date.now() - start);
  actionsLog.push(`Total errors: ${errors}`);
  console.log(`[wishlistScenario] Actions: \n${actionsLog.join('\n')}`);
}