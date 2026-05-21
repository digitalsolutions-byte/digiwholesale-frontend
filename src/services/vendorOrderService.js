import api from './apiInstance';

/**
 * Creates a new purchase order for a vendor
 * @param {Object} data 
 * @returns {Promise}
 */
export const createVendorOrder = async (data) => {
    try {
        const response = await api.post('/api/vendor-order', data);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to create vendor order');
    }
};

/**
 * Returns vendor orders matching vendor name or mobile
 * @param {string} query 
 * @returns {Promise}
 */
export const getVendorOrderSuggestions = async (query) => {
    try {
        const response = await api.get(`/api/vendor-order/suggestion?q=${query}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch suggestions');
    }
};

/**
 * Returns paginated list of all vendor orders
 * @param {number} page 
 * @param {number} limit 
 * @returns {Promise}
 */
export const getAllVendorOrders = async (page = 1, limit = 20) => {
    try {
        const response = await api.get(`/api/vendor-order?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch vendor orders');
    }
};

/**
 * Returns a single vendor order by ID
 * @param {string} id 
 * @returns {Promise}
 */
export const getVendorOrderById = async (id) => {
    try {
        const response = await api.get(`/api/vendor-order/${id}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch vendor order details');
    }
};

/**
 * Updates the status of a vendor order
 * @param {string} id 
 * @param {string} status 
 * @returns {Promise}
 */
export const updateVendorOrderStatus = async (id, status) => {
    try {
        const response = await api.put(`/api/vendor-order/${id}/status`, { status });
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to update status');
    }
};

/**
 * Reports damaged or missing items on a RECEIVED order
 * @param {string} id 
 * @param {Array} items 
 * @returns {Promise}
 */
export const updateVendorOrderIssues = async (id, items) => {
    try {
        const response = await api.put(`/api/vendor-order/issues/${id}`, { items });
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to record issues');
    }
};

/**
 * Deletes a vendor order
 * @param {string} id 
 * @returns {Promise}
 */
export const deleteVendorOrder = async (id) => {
    try {
        const response = await api.delete(`/api/vendor-order/${id}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to delete order');
    }
};

/**
 * Filter vendor orders by date range and/or keyword
 * @param {Object} filters 
 * @returns {Promise}
 */
export const searchVendorOrders = async (filters) => {
    try {
        const response = await api.post('/api/vendor-order/search', filters);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Search failed');
    }
};
