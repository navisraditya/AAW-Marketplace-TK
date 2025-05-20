import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Service-specific BASE_URLs
const AUTH_BASE_URL = __ENV.AUTH_BASE_URL || 'http://image.png:30000';
const PRODUCTS_BASE_URL = __ENV.PRODUCTS_BASE_URL || 'http://52.204.141.213:30002';
const ORDERS_BASE_URL = __ENV.ORDERS_BASE_URL || 'http://52.204.141.213:30001';
const TENANTS_BASE_URL = __ENV.TENANTS_BASE_URL || 'http://52.204.141.213:30003';
const WISHLIST_BASE_URL = __ENV.WISHLIST_BASE_URL || 'http://52.204.141.213:30004';

// Define metrics
const errorRate = new Rate('errors');
const authLatency = new Trend('auth_latency');
const orderLatency = new Trend('order_latency');
const productLatency = new Trend('product_latency');
const tenantLatency = new Trend('tenant_latency');
const wishlistLatency = new Trend('wishlist_latency');

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

// Test user credentials
const TEST_USER = {
  username: `testuser${Date.now()}`,
  email: `testuser${Date.now()}@example.com`,
  password: "Password1",
  full_name: "Test User",
  address: "123 Test Street",
  phone_number: `+1${Date.now().toString().slice(-10)}`
};

// Auth Tests
export function authTests() {
  const startTime = new Date();
  console.log('Starting auth tests...');

  // Register
  console.log('Testing registration...');
  const registerRes = http.post(`${AUTH_BASE_URL}/user/register`, JSON.stringify(TEST_USER), {
    headers: { 'Content-Type': 'application/json' }
  });
  check(registerRes, { 'register status is 201': (r) => r.status === 201 });
  console.log(`Registration status: ${registerRes.status}`);

  // Login
  console.log('Testing login...');
  const loginRes = http.post(`${AUTH_BASE_URL}/user/login`, JSON.stringify({
    username: TEST_USER.username,
    password: TEST_USER.password
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  check(loginRes, { 'login status is 200': (r) => r.status === 200 });
  console.log(`Login status: ${loginRes.status}`);

  let token = '';
  if (loginRes.status === 200) {
    try {
      const loginData = JSON.parse(loginRes.body);
      token = loginData.token;
      console.log('Successfully obtained auth token');

      // Verify Token
      console.log('Testing token verification...');
      const verifyTokenRes = http.post(`${AUTH_BASE_URL}/user/verify-token`, JSON.stringify({
        token: token
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      check(verifyTokenRes, { 'verify token status is 200': (r) => r.status === 200 });
      console.log(`Verify token status: ${verifyTokenRes.status}`);

      // Verify Admin Token
      console.log('Testing admin token verification...');
      const verifyAdminTokenRes = http.post(`${AUTH_BASE_URL}/user/verify-admin-token`, JSON.stringify({
        token: token
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      check(verifyAdminTokenRes, { 'verify admin token status is 200': (r) => r.status === 200 });
      console.log(`Verify admin token status: ${verifyAdminTokenRes.status}`);
    } catch (e) {
      console.error('Failed to parse login response:', e);
    }
  }

  const duration = new Date() - startTime;
  authLatency.add(duration);
  console.log(`Auth tests completed in ${duration}ms`);
  
  return token;
}

// Product Tests
export function productTests(token) {
  const startTime = new Date();
  console.log('Starting product tests...');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Get All Products
  console.log('Testing get all products...');
  const getAllProductsRes = http.get(`${PRODUCTS_BASE_URL}/product`, { headers });
  check(getAllProductsRes, { 'get all products status is 200': (r) => r.status === 200 });
  console.log(`Get all products status: ${getAllProductsRes.status}`);

  // Get Product by ID
  const productId = 'fa6f5f96-327a-435b-85a0-3f72804f426b'; // Using predefined ID
  console.log(`Testing get product by ID: ${productId}`);
  const getProductByIdRes = http.get(`${PRODUCTS_BASE_URL}/product/${productId}`, { headers });
  check(getProductByIdRes, { 'get product by ID status is 200': (r) => r.status === 200 });
  console.log(`Get product by ID status: ${getProductByIdRes.status}`);

  // Get All Categories
  console.log('Testing get all categories...');
  const getAllCategoriesRes = http.get(`${PRODUCTS_BASE_URL}/product/category`, { headers });
  check(getAllCategoriesRes, { 'get all categories status is 200': (r) => r.status === 200 });
  console.log(`Get all categories status: ${getAllCategoriesRes.status}`);

  // Create Category
  console.log('Testing create category...');
  const createCategoryRes = http.post(`${PRODUCTS_BASE_URL}/product/category`, JSON.stringify({
    name: `Test Category ${Date.now()}`
  }), { headers });
  check(createCategoryRes, { 'create category status is 201': (r) => r.status === 201 });
  console.log(`Create category status: ${createCategoryRes.status}`);

  let categoryId = '';
  if (createCategoryRes.status === 201) {
    try {
      const categoryData = JSON.parse(createCategoryRes.body);
      categoryId = categoryData.id;
    } catch (e) {
      console.error('Failed to parse category response:', e);
    }
  }

  // Create Product
  console.log('Testing create product...');
  const createProductRes = http.post(`${PRODUCTS_BASE_URL}/product`, JSON.stringify({
    name: `Test Product ${Date.now()}`,
    description: 'A test product',
    price: randomInt(1000, 100000),
    quantity_available: randomInt(1, 100),
    category_id: categoryId
  }), { headers });
  check(createProductRes, { 'create product status is 201': (r) => r.status === 201 });
  console.log(`Create product status: ${createProductRes.status}`);

  let newProductId = '';
  if (createProductRes.status === 201) {
    try {
      const productData = JSON.parse(createProductRes.body);
      newProductId = productData.id;
    } catch (e) {
      console.error('Failed to parse product response:', e);
    }
  }

  // Edit Product
  if (newProductId) {
    console.log(`Testing edit product: ${newProductId}`);
    const editProductRes = http.put(`${PRODUCTS_BASE_URL}/product/${newProductId}`, JSON.stringify({
      name: `Updated Product ${Date.now()}`,
      description: 'An updated test product',
      price: randomInt(1000, 100000),
      quantity_available: randomInt(1, 100),
      category_id: categoryId
    }), { headers });
    check(editProductRes, { 'edit product status is 200': (r) => r.status === 200 });
    console.log(`Edit product status: ${editProductRes.status}`);
  }

  // Edit Category
  if (categoryId) {
    console.log(`Testing edit category: ${categoryId}`);
    const editCategoryRes = http.put(`${PRODUCTS_BASE_URL}/product/category/${categoryId}`, JSON.stringify({
      name: `Updated Category ${Date.now()}`
    }), { headers });
    check(editCategoryRes, { 'edit category status is 200': (r) => r.status === 200 });
    console.log(`Edit category status: ${editCategoryRes.status}`);
  }

  // Delete Product
  if (newProductId) {
    console.log(`Testing delete product: ${newProductId}`);
    const deleteProductRes = http.del(`${PRODUCTS_BASE_URL}/product/${newProductId}`, null, { headers });
    check(deleteProductRes, { 'delete product status is 200': (r) => r.status === 200 });
    console.log(`Delete product status: ${deleteProductRes.status}`);
  }

  // Delete Category
  if (categoryId) {
    console.log(`Testing delete category: ${categoryId}`);
    const deleteCategoryRes = http.del(`${PRODUCTS_BASE_URL}/product/category/${categoryId}`, null, { headers });
    check(deleteCategoryRes, { 'delete category status is 200': (r) => r.status === 200 });
    console.log(`Delete category status: ${deleteCategoryRes.status}`);
  }

  const duration = new Date() - startTime;
  productLatency.add(duration);
  console.log(`Product tests completed in ${duration}ms`);
}

// Order Tests
export function orderTests(token) {
  const startTime = new Date();
  console.log('Starting order tests...');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Get All Orders
  console.log('Testing get all orders...');
  const getAllOrdersRes = http.get(`${ORDERS_BASE_URL}/order`, { headers });
  check(getAllOrdersRes, { 'get all orders status is 200': (r) => r.status === 200 });
  console.log(`Get all orders status: ${getAllOrdersRes.status}`);

  // Place Order
  console.log('Testing place order...');
  const placeOrderRes = http.post(`${ORDERS_BASE_URL}/order`, JSON.stringify({
    total_amount: randomInt(1000, 100000),
    shipping_provider: 'JNE',
    shipping_code: `SHIP${randomInt(1000,9999)}`,
    shipping_status: 'PENDING'
  }), { headers });
  check(placeOrderRes, { 'place order status is 201': (r) => r.status === 201 });
  console.log(`Place order status: ${placeOrderRes.status}`);

  let orderId = '';
  if (placeOrderRes.status === 201) {
    try {
      const orderData = JSON.parse(placeOrderRes.body);
      orderId = orderData.id;
    } catch (e) {
      console.error('Failed to parse order response:', e);
    }
  }

  // Get Order Detail
  if (orderId) {
    console.log(`Testing get order detail: ${orderId}`);
    const getOrderDetailRes = http.get(`${ORDERS_BASE_URL}/order/${orderId}`, { headers });
    check(getOrderDetailRes, { 'get order detail status is 200': (r) => r.status === 200 });
    console.log(`Get order detail status: ${getOrderDetailRes.status}`);
  }

  // Pay Order
  if (orderId) {
    console.log(`Testing pay order: ${orderId}`);
    const payOrderRes = http.post(`${ORDERS_BASE_URL}/order/${orderId}/pay`, JSON.stringify({
      payment_method: 'BANK_TRANSFER',
      payment_reference: `PAY${Date.now()}`,
      amount: randomInt(1000, 100000)
    }), { headers });
    check(payOrderRes, { 'pay order status is 200': (r) => r.status === 200 });
    console.log(`Pay order status: ${payOrderRes.status}`);
  }

  // Cancel Order
  if (orderId) {
    console.log(`Testing cancel order: ${orderId}`);
    const cancelOrderRes = http.post(`${ORDERS_BASE_URL}/order/${orderId}/cancel`, null, { headers });
    check(cancelOrderRes, { 'cancel order status is 200': (r) => r.status === 200 });
    console.log(`Cancel order status: ${cancelOrderRes.status}`);
  }

  const duration = new Date() - startTime;
  orderLatency.add(duration);
  console.log(`Order tests completed in ${duration}ms`);
}

// Tenant Tests
export function tenantTests(token) {
  const startTime = new Date();
  console.log('Starting tenant tests...');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Create Tenant
  console.log('Testing create tenant...');
  const createTenantRes = http.post(`${TENANTS_BASE_URL}/tenant`, JSON.stringify({
    name: `Test Tenant ${Date.now()}`
  }), { headers });
  check(createTenantRes, { 'create tenant status is 201': (r) => r.status === 201 });
  console.log(`Create tenant status: ${createTenantRes.status}`);

  let tenantId = '';
  if (createTenantRes.status === 201) {
    try {
      const tenantData = JSON.parse(createTenantRes.body);
      tenantId = tenantData.id;
    } catch (e) {
      console.error('Failed to parse tenant response:', e);
    }
  }

  // Get Tenant
  if (tenantId) {
    console.log(`Testing get tenant: ${tenantId}`);
    const getTenantRes = http.get(`${TENANTS_BASE_URL}/tenant/${tenantId}`, { headers });
    check(getTenantRes, { 'get tenant status is 200': (r) => r.status === 200 });
    console.log(`Get tenant status: ${getTenantRes.status}`);
  }

  // Edit Tenant
  if (tenantId) {
    console.log(`Testing edit tenant: ${tenantId}`);
    const editTenantRes = http.put(`${TENANTS_BASE_URL}/tenant/${tenantId}`, JSON.stringify({
      name: `Updated Tenant ${Date.now()}`
    }), { headers });
    check(editTenantRes, { 'edit tenant status is 200': (r) => r.status === 200 });
    console.log(`Edit tenant status: ${editTenantRes.status}`);
  }

  // Delete Tenant
  if (tenantId) {
    console.log(`Testing delete tenant: ${tenantId}`);
    const deleteTenantRes = http.del(`${TENANTS_BASE_URL}/tenant`, JSON.stringify({
      tenant_id: tenantId
    }), { headers });
    check(deleteTenantRes, { 'delete tenant status is 200': (r) => r.status === 200 });
    console.log(`Delete tenant status: ${deleteTenantRes.status}`);
  }

  const duration = new Date() - startTime;
  tenantLatency.add(duration);
  console.log(`Tenant tests completed in ${duration}ms`);
}

// Wishlist Tests
export function wishlistTests(token) {
  const startTime = new Date();
  console.log('Starting wishlist tests...');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Get All User Wishlist
  console.log('Testing get all user wishlist...');
  const getAllWishlistRes = http.get(`${WISHLIST_BASE_URL}/wishlist`, { headers });
  check(getAllWishlistRes, { 'get all wishlist status is 200': (r) => r.status === 200 });
  console.log(`Get all wishlist status: ${getAllWishlistRes.status}`);

  // Create Wishlist
  console.log('Testing create wishlist...');
  const createWishlistRes = http.post(`${WISHLIST_BASE_URL}/wishlist`, JSON.stringify({
    name: `Test Wishlist ${Date.now()}`
  }), { headers });
  check(createWishlistRes, { 'create wishlist status is 201': (r) => r.status === 201 });
  console.log(`Create wishlist status: ${createWishlistRes.status}`);

  let wishlistId = '';
  if (createWishlistRes.status === 201) {
    try {
      const wishlistData = JSON.parse(createWishlistRes.body);
      wishlistId = wishlistData.id;
    } catch (e) {
      console.error('Failed to parse wishlist response:', e);
    }
  }

  // Get Wishlist by ID
  if (wishlistId) {
    console.log(`Testing get wishlist by ID: ${wishlistId}`);
    const getWishlistByIdRes = http.get(`${WISHLIST_BASE_URL}/wishlist/${wishlistId}`, { headers });
    check(getWishlistByIdRes, { 'get wishlist by ID status is 200': (r) => r.status === 200 });
    console.log(`Get wishlist by ID status: ${getWishlistByIdRes.status}`);
  }

  // Add Product to Wishlist
  if (wishlistId) {
    console.log(`Testing add product to wishlist: ${wishlistId}`);
    const addProductRes = http.post(`${WISHLIST_BASE_URL}/wishlist/product`, JSON.stringify({
      wishlist_id: wishlistId,
      product_id: 'fa6f5f96-327a-435b-85a0-3f72804f426b' // Using predefined product ID
    }), { headers });
    check(addProductRes, { 'add product to wishlist status is 201': (r) => r.status === 201 });
    console.log(`Add product to wishlist status: ${addProductRes.status}`);
  }

  // Update Wishlist
  if (wishlistId) {
    console.log(`Testing update wishlist: ${wishlistId}`);
    const updateWishlistRes = http.put(`${WISHLIST_BASE_URL}/wishlist/${wishlistId}`, JSON.stringify({
      name: `Updated Wishlist ${Date.now()}`
    }), { headers });
    check(updateWishlistRes, { 'update wishlist status is 200': (r) => r.status === 200 });
    console.log(`Update wishlist status: ${updateWishlistRes.status}`);
  }

  // Remove Product from Wishlist
  if (wishlistId) {
    console.log(`Testing remove product from wishlist: ${wishlistId}`);
    const removeProductRes = http.del(`${WISHLIST_BASE_URL}/wishlist/product`, JSON.stringify({
      id: 'fa6f5f96-327a-435b-85a0-3f72804f426b' // Using predefined product ID
    }), { headers });
    check(removeProductRes, { 'remove product from wishlist status is 200': (r) => r.status === 200 });
    console.log(`Remove product from wishlist status: ${removeProductRes.status}`);
  }

  // Delete Wishlist
  if (wishlistId) {
    console.log(`Testing delete wishlist: ${wishlistId}`);
    const deleteWishlistRes = http.del(`${WISHLIST_BASE_URL}/wishlist/${wishlistId}`, null, { headers });
    check(deleteWishlistRes, { 'delete wishlist status is 200': (r) => r.status === 200 });
    console.log(`Delete wishlist status: ${deleteWishlistRes.status}`);
  }

  const duration = new Date() - startTime;
  wishlistLatency.add(duration);
  console.log(`Wishlist tests completed in ${duration}ms`);
}

// Main test function
export default function() {
  try {
    console.log(`\n=== Starting new test iteration ===`);
    
    // First authenticate
    const token = authTests();
    
    if (token) {
      // Run all tests in sequence
      productTests(token);
      orderTests(token);
      tenantTests(token);
      wishlistTests(token);
    } else {
      console.log('Skipping all tests due to authentication failure');
    }
  } catch (error) {
    console.error('Error in default function:', error);
  } finally {
    const sleepTime = Math.random() * 2 + 1;
    console.log(`Sleeping for ${sleepTime.toFixed(2)} seconds...`);
    sleep(sleepTime);
  }
} 