import api from './apiInstance';

/**
 * Registers a new vendor
 * @param {Object} data 
 * @returns {Promise}
 */
export const createVendor = async (data) => {
    try {
        const response = await api.post('/api/vendor', data);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to create vendor');
    }
};

/**
 * Returns vendors matching name or mobile
 * @param {string} query 
 * @returns {Promise}
 */
export const getVendorSuggestions = async (query) => {
    try {
        const response = await api.get(`/api/vendor/suggestion?q=${query}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch suggestions');
    }
};

/**
 * Returns paginated list of all vendors
 * @param {number} page 
 * @param {number} limit 
 * @returns {Promise}
 */
export const getAllVendors = async (page = 1, limit = 20) => {
    try {
        const response = await api.get(`/api/vendor?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch vendors');
    }
};

/**
 * Returns a single vendor record by ID
 * @param {string} id 
 * @returns {Promise}
 */
export const getVendorById = async (id) => {
    try {
        const response = await api.get(`/api/vendor/${id}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch vendor details');
    }
};

/**
 * Updates vendor details
 * @param {string} id 
 * @param {Object} data 
 * @returns {Promise}
 */
export const updateVendor = async (id, data) => {
    try {
        const response = await api.put(`/api/vendor/${id}`, data);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to update vendor');
    }
};

/**
 * Permanently deletes a vendor
 * @param {string} id 
 * @returns {Promise}
 */
export const deleteVendor = async (id) => {
    try {
        const response = await api.delete(`/api/vendor/${id}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to delete vendor');
    }
};

/**
 * Filter vendors by date range and/or keyword
 * @param {Object} filters 
 * @returns {Promise}
 */
export const searchVendors = async (filters) => {
    try {
        const response = await api.post('/api/vendor/search', filters);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Search failed');
    }
};
