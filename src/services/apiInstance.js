import axios from 'axios';
import { store } from '../store/store';
import { setCredentials, logOut } from '../store/slices/authSlice';
import { toast } from 'react-toastify';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.request.use(
    (config) => {
        let token = null;
        try {
            // Try to get token from Redux store first
            token = store.getState().auth.token;
            console.log("token", token);
        } catch (error) {
            console.warn('Could not get token from Redux store', error);
        }

        // Fallback to localStorage
        if (!token) {
            token = localStorage.getItem('token');
        }

        if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(token => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return api(originalRequest);
                    })
                    .catch(err => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = localStorage.getItem('refreshToken');

            if (!refreshToken) {
                store.dispatch(logOut());
                window.location.href = '/login';
                return Promise.reject(error);
            }

            try {
                // Use raw axios to avoid interceptors for the refresh call
                const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/employee/auth/refresh`, { refreshToken });

                if (response.data.success) {
                    const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;
                    const user = JSON.parse(localStorage.getItem('user'));

                    store.dispatch(setCredentials({ user, token: accessToken, refreshToken: newRefreshToken }));

                    processQueue(null, accessToken);
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                processQueue(refreshError, null);
                store.dispatch(logOut());
                window.location.href = '/login';
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        // Normalize backend error structure so that error.response.data.message is always populated
        if (error.response && error.response.data && typeof error.response.data === 'object') {
            const data = error.response.data;
            if (data.error && typeof data.error === 'object' && data.error.message) {
                data.message = data.error.message;
            }
        }

        return Promise.reject(error);
    }
);

export const handleServiceError = (error, defaultMessage) => {
    const backendMessage = error.response?.data?.message || error.response?.data?.error?.message || error.message;
    const msg = backendMessage || defaultMessage;
    const err = new Error(msg);
    err.response = {
        data: {
            message: msg
        }
    };
    return err;
};

export default api;
