import axios from 'axios';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true,
});

let accessToken = typeof window !== 'undefined' ? localStorage.getItem('tech_house_access_token') : null;

export const setAccessToken = (token) => {
  accessToken = token;
  if (token) {
    localStorage.setItem('tech_house_access_token', token);
  } else {
    localStorage.removeItem('tech_house_access_token');
  }
};

http.interceptors.request.use((config) => {
  if (!accessToken && typeof window !== 'undefined') {
    accessToken = localStorage.getItem('tech_house_access_token');
  }
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      originalRequest._retry = true;
      try {
        const { data } = await http.post('/auth/refresh');
        setAccessToken(data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return http(originalRequest);
      } catch (refreshErr) {
        setAccessToken(null);
        localStorage.removeItem('tech_house_user');
        localStorage.removeItem('tech_house_access_token');
      }
    }
    return Promise.reject(error);
  }
);
