import axios from "axios";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3009/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore.getState();

    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`;
    }

    // Add request timestamp for debugging
    config.metadata = { startTime: new Date() };

    console.log(`🌐 ${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
      data: config.data,
    });

    return config;
  },
  (error) => {
    console.error("❌ Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => {
    const duration = new Date() - response.config.metadata.startTime;
    console.log(
      `✅ ${response.config.method?.toUpperCase()} ${
        response.config.url
      } (${duration}ms)`,
      {
        status: response.status,
        data: response.data,
      }
    );

    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const duration = new Date() - originalRequest.metadata.startTime;

    console.error(
      `❌ ${originalRequest.method?.toUpperCase()} ${
        originalRequest.url
      } (${duration}ms)`,
      {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
      }
    );

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const authStore = useAuthStore.getState();

      // Try to refresh token
      if (
        authStore.refreshToken &&
        !originalRequest.url.includes("/auth/refresh")
      ) {
        try {
          console.log("🔄 Attempting token refresh...");
          await authStore.refreshTokens();

          // Retry original request with new token
          const newToken = useAuthStore.getState().token;
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          console.error("❌ Token refresh failed:", refreshError);
          authStore.logout();
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token or refresh failed, logout
        authStore.logout();
      }
    }

    // Handle other errors
    const errorMessage =
      error.response?.data?.message || error.message || "An error occurred";

    // Don't show toast for certain errors
    const silentErrors = [
      "Network Error",
      "timeout",
      "Request failed with status code 401",
    ];

    if (!silentErrors.some((silent) => errorMessage.includes(silent))) {
      // Show error toast for user-facing errors
      if (error.response?.status >= 400 && error.response?.status < 500) {
        toast.error(errorMessage);
      } else if (error.response?.status >= 500) {
        toast.error("Server error. Please try again later.");
      } else if (error.code === "NETWORK_ERROR") {
        toast.error("Network error. Please check your connection.");
      }
    }

    return Promise.reject(error);
  }
);

// API service methods
const apiService = {
  // Generic HTTP methods
  get: (url, config = {}) => api.get(url, config),
  post: (url, data = {}, config = {}) => api.post(url, data, config),
  put: (url, data = {}, config = {}) => api.put(url, data, config),
  patch: (url, data = {}, config = {}) => api.patch(url, data, config),
  delete: (url, config = {}) => api.delete(url, config),

  // File upload
  upload: (url, formData, config = {}) => {
    return api.post(url, formData, {
      ...config,
      headers: {
        "Content-Type": "multipart/form-data",
        ...config.headers,
      },
      onUploadProgress: config.onProgress,
    });
  },

  // Download file
  download: async (url, filename, config = {}) => {
    try {
      const response = await api.get(url, {
        ...config,
        responseType: "blob",
      });

      // Create download link
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      return response;
    } catch (error) {
      console.error("❌ Download failed:", error);
      throw error;
    }
  },

  // Batch requests
  batch: async (requests) => {
    try {
      const promises = requests.map((request) => {
        const { method, url, data, config } = request;
        return api[method](url, data, config);
      });

      const responses = await Promise.allSettled(promises);

      return responses.map((result, index) => ({
        success: result.status === "fulfilled",
        data: result.status === "fulfilled" ? result.value.data : null,
        error: result.status === "rejected" ? result.reason : null,
        request: requests[index],
      }));
    } catch (error) {
      console.error("❌ Batch request failed:", error);
      throw error;
    }
  },

  // Health check
  healthCheck: async () => {
    try {
      const response = await api.get("/health", { timeout: 5000 });
      return response.data;
    } catch (error) {
      console.error("❌ Health check failed:", error);
      throw error;
    }
  },

  // Cancel request
  cancelToken: () => axios.CancelToken.source(),

  // Check if error is cancellation
  isCancel: (error) => axios.isCancel(error),

  // Request with retry
  withRetry: async (requestFn, maxRetries = 3, delay = 1000) => {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;

        // Don't retry on client errors (4xx)
        if (error.response?.status >= 400 && error.response?.status < 500) {
          throw error;
        }

        if (attempt < maxRetries) {
          console.log(
            `🔄 Retrying request (attempt ${
              attempt + 1
            }/${maxRetries}) in ${delay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        }
      }
    }

    throw lastError;
  },

  // Request with timeout
  withTimeout: (requestFn, timeout = 10000) => {
    return Promise.race([
      requestFn(),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Request timeout after ${timeout}ms`));
        }, timeout);
      }),
    ]);
  },

  // Paginated request
  paginated: async (url, params = {}) => {
    const { page = 1, limit = 20, ...otherParams } = params;

    const response = await api.get(url, {
      params: {
        page,
        limit,
        ...otherParams,
      },
    });

    return {
      data: response.data.data || response.data,
      pagination: {
        page: response.data.page || page,
        limit: response.data.limit || limit,
        total: response.data.total || 0,
        totalPages: response.data.totalPages || 0,
        hasMore: response.data.hasMore || false,
        nextCursor: response.data.nextCursor || null,
      },
    };
  },

  // Search with debouncing
  search: (() => {
    let searchTimeout;

    return (url, query, delay = 300) => {
      return new Promise((resolve, reject) => {
        clearTimeout(searchTimeout);

        searchTimeout = setTimeout(async () => {
          try {
            const response = await api.get(url, {
              params: { query },
            });
            resolve(response.data);
          } catch (error) {
            reject(error);
          }
        }, delay);
      });
    };
  })(),

  // Cache management
  cache: new Map(),

  // Cached request
  cached: async (key, requestFn, ttl = 300000) => {
    // 5 minutes default TTL
    const cached = apiService.cache.get(key);

    if (cached && Date.now() - cached.timestamp < ttl) {
      console.log(`📦 Cache hit for: ${key}`);
      return cached.data;
    }

    try {
      const data = await requestFn();

      apiService.cache.set(key, {
        data,
        timestamp: Date.now(),
      });

      console.log(`💾 Cached response for: ${key}`);
      return data;
    } catch (error) {
      // Return cached data if available, even if expired
      if (cached) {
        console.log(`⚠️ Using expired cache for: ${key}`);
        return cached.data;
      }
      throw error;
    }
  },

  // Clear cache
  clearCache: (pattern) => {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const key of apiService.cache.keys()) {
        if (regex.test(key)) {
          apiService.cache.delete(key);
        }
      }
    } else {
      apiService.cache.clear();
    }
  },

  // Get request stats
  getStats: () => {
    const interceptors = api.interceptors.response.handlers;
    return {
      cacheSize: apiService.cache.size,
      interceptorsCount: interceptors.length,
    };
  },
};

// Cleanup cache periodically
if (typeof window !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    const maxAge = 600000; // 10 minutes

    for (const [key, value] of apiService.cache.entries()) {
      if (now - value.timestamp > maxAge) {
        apiService.cache.delete(key);
      }
    }
  }, 300000); // Clean every 5 minutes
}

export { apiService, api };
export default apiService;
