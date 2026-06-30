import axios, { AxiosInstance, AxiosError } from "axios";

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api/v1";

const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Request Interceptor
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem("accessToken");

    if (!config.headers) {
      config.headers = {} as any;
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log("=================================");
    console.log("REQUEST:", config.url);
    console.log("TOKEN:", token);
    console.log("AUTH:", config.headers.Authorization);
    console.log("=================================");

    return config;
  });

  // Response Interceptor
  client.interceptors.response.use(
    (response) => response,

    async (error: AxiosError) => {
      console.log("FAILED URL:", error.config?.url);
      console.log("STATUS:", error.response?.status);

      const originalRequest: any = error.config;

      if (
        error.response?.status === 401 &&
        originalRequest &&
        !originalRequest._retry
      ) {
        originalRequest._retry = true;

        const refreshToken = localStorage.getItem("refreshToken");

        if (!refreshToken) {
          localStorage.clear();
          window.location.href = "/login";
          return Promise.reject(error);
        }

        try {
          const refreshRes = await axios.post(
            `${BASE_URL}/auth/refresh`,
            {
              refreshToken,
            }
          );

          const {
            accessToken,
            refreshToken: newRefreshToken,
          } = refreshRes.data.data;

          localStorage.setItem("accessToken", accessToken);
          localStorage.setItem("refreshToken", newRefreshToken);

          // Update axios defaults
          client.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

          // Update failed request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;

          return client(originalRequest);
        } catch (e) {
          localStorage.clear();
          window.location.href = "/login";
          return Promise.reject(e);
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
};

export const api = createApiClient();

export default api;