const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  "https://agribook-backend.onrender.com"
).replace(/\/+$/, "");

async function apiRequest(endpoint, options = {}) {
  const headers = {
    ...(options.body && !(options.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";

  const result = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof result === "object" && result !== null
        ? result.detail || JSON.stringify(result)
        : result;

    throw new Error(message || `HTTP error ${response.status}`);
  }

  return result;
}

export const farmerAPI = {
  getAll: () => apiRequest("/api/farmers"),

  register: (farmer) =>
    apiRequest("/api/farmers/register", {
      method: "POST",
      body: JSON.stringify(farmer),
    }),

  login: (credentials) =>
    apiRequest("/api/farmers/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),
};

export const cropAPI = {
  getAll: () => apiRequest("/api/crops"),

  create: (crop) =>
    apiRequest("/api/crops", {
      method: "POST",
      body: JSON.stringify(crop),
    }),
};

export const bookingAPI = {
  getAll: () => apiRequest("/api/bookings"),

  create: (booking) =>
    apiRequest("/api/bookings", {
      method: "POST",
      body: JSON.stringify(booking),
    }),

  updateStatus: (bookingId, status) =>
    apiRequest(`/api/admin/bookings/${bookingId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};

export const queueAPI = {
  getSummary: () => apiRequest("/api/queue/summary"),
};

export const adminAPI = {
  getDashboard: () => apiRequest("/api/admin/dashboard"),
};

export const healthAPI = {
  check: () => apiRequest("/api/health"),
};

export default API_BASE_URL;