import api, { handleServiceError } from './apiInstance';

export const loginUser = async (loginData) => {
    console.log(loginData);
    try {
        const response = await api.post('/api/employee/auth/login', loginData);
        console.log(response.data, "response");
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Login failed');
    }
};

export const logoutUser = async () => {
    try {
        const response = await api.post('/api/employee/auth/logout');
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Logout failed');
    }
};

export const employeeForgotPassword = async (email) => {
    try {
        const response = await api.post('/api/employee/auth/forgot-password', { email });
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Request failed');
    }
};

export const employeeResetPassword = async ({ uidb36, token, password, confirmPassword }) => {
    try {
        const response = await api.put(
            `/api/employee/auth/reset-password/confirm?uidb36=${uidb36}&token=${encodeURIComponent(token)}`,
            { password, confirmPassword }
        );
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Reset failed');
    }
};

export const customerForgotPassword = async (email) => {
    try {
        const response = await api.post('/api/customer/management/forgot-password', { email });
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Request failed');
    }
};

export const customerResetPassword = async ({ uidb36, token, password, confirmPassword }) => {
    try {
        const response = await api.put(
            `/api/customer/management/reset-password/confirm?uidb36=${uidb36}&token=${encodeURIComponent(token)}`,
            { password, confirmPassword }
        );
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Reset failed');
    }
};
export const refreshAccessToken = async (refreshToken) => {
    try {
        const response = await api.post('/api/employee/auth/refresh', { refreshToken });
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Refresh failed');
    }
};
