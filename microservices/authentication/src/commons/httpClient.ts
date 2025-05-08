import axios from 'axios';
import axiosRetry from 'axios-retry';

// Axios instance with timeout configuration
const axiosInstance = axios.create({
  timeout: 5000, // 5 seconds timeout
});

// Retry mechanism configuration
axiosRetry(axiosInstance, {
  retries: 3, // Retry up to 3 times
  retryDelay: (retryCount) => retryCount * 1000, // Exponential backoff
  retryCondition: (error) => {
    return error.response?.status >= 500; // Retry only on server errors
  },
});

// Export the Axios instance
export const httpClient = axiosInstance;