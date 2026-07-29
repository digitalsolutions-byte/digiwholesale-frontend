import api from './apiInstance';

/**
 * Register a new wholesaler as a tenant on the platform.
 * Automatically creates a SUPERADMIN employee account for the wholesaler.
 * Requires PLATFORM_OWNER JWT token.
 * 
 * @param {Object} tenantData 
 * @returns {Promise<Object>} API Response
 */
export const registerTenant = async (tenantData) => {
    try {
        const response = await api.post('/api/tenants/register', tenantData);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

/**
 * Fetch a paginated list of all registered tenants.
 * Requires PLATFORM_OWNER JWT token.
 * 
 * @param {Object} params - { page, limit, status, search }
 * @returns {Promise<Object>} API Response
 */
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

/**
 * Get complete details of a single tenant by MongoDB _id.
 * Requires PLATFORM_OWNER JWT token.
 * 
 * @param {string} id - MongoDB _id of the tenant
 * @returns {Promise<Object>} API Response
 */
export const getTenantById = async (id) => {
    try {
        const response = await api.get(`/api/tenants/${id}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

/**
 * Update tenant information.
 * Requires PLATFORM_OWNER JWT token.
 * 
 * @param {string} id - MongoDB _id of the tenant
 * @param {Object} updateData 
 * @returns {Promise<Object>} API Response
 */
export const updateTenant = async (id, updateData) => {
    try {
        const response = await api.put(`/api/tenants/${id}`, updateData);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

/**
 * Suspend a tenant's workspace.
 * Requires PLATFORM_OWNER JWT token.
 * 
 * @param {string} id - MongoDB _id of the tenant
 * @param {string} reason - Optional reason for suspension
 * @returns {Promise<Object>} API Response
 */
export const suspendTenant = async (id, reason = '') => {
    try {
        const response = await api.patch(`/api/tenants/${id}/suspend`, { reason });
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

/**
 * Reactivate a previously suspended tenant.
 * Requires PLATFORM_OWNER JWT token.
 * 
 * @param {string} id - MongoDB _id of the tenant
 * @returns {Promise<Object>} API Response
 */
export const activateTenant = async (id) => {
    try {
        const response = await api.patch(`/api/tenants/${id}/activate`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

/**
 * Permanently delete a tenant and all associated employee accounts.
 * Requires PLATFORM_OWNER JWT token.
 * 
 * @param {string} id - MongoDB _id of the tenant
 * @returns {Promise<Object>} API Response
 */
export const deleteTenant = async (id) => {
    try {
        const response = await api.delete(`/api/tenants/${id}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};
