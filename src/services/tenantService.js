import api from './apiInstance';


export const registerTenant = async (tenantData) => {
    try {
        const response = await api.post('/api/tenants/register', tenantData);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};


export const getAllTenants = async (params = {}) => {
    try {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.status) queryParams.append('status', params.status);
        if (params.search) queryParams.append('search', params.search);

        const response = await api.get(`/api/tenants?${queryParams.toString()}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};


export const getTenantById = async (id) => {
    try {
        const response = await api.get(`/api/tenants/${id}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};


export const updateTenant = async (id, updateData) => {
    try {
        const response = await api.put(`/api/tenants/${id}`, updateData);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};


export const suspendTenant = async (id, reason = '') => {
    try {
        const response = await api.patch(`/api/tenants/${id}/suspend`, { reason });
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};


export const activateTenant = async (id) => {
    try {
        const response = await api.patch(`/api/tenants/${id}/activate`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const deleteTenant = async (id) => {
    try {
        const response = await api.delete(`/api/tenants/${id}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const getTenantSettings = async (id) => {
    try {
        const response = await api.get(`/api/tenants/${id}/settings`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};


export const updateTenantSettings = async (id, featureFlags) => {
    try {
        const response = await api.patch(`/api/tenants/${id}/settings`, { featureFlags });
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};
