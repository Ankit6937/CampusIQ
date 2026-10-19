import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', timeout: 30000 });

// Every failed request gets a readable message (err.friendly) and the server's field errors (err.fieldErrors)
api.interceptors.response.use(
  (r) => r,
  (err) => {
    err.friendly = err.response?.data?.message || (err.code === 'ERR_NETWORK' ? 'Cannot reach the API. Is the backend running on port 5000?' : err.message);
    err.fieldErrors = err.response?.data?.errors || {};
    return Promise.reject(err);
  }
);

export default api;
export const get = (url, params) => api.get(url, { params }).then((r) => r.data);
export const post = (url, body) => api.post(url, body).then((r) => r.data);
export const put = (url, body) => api.put(url, body).then((r) => r.data);
export const del = (url) => api.delete(url).then((r) => r.data);
