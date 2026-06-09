import api from './apiInstance';

/**
 * Fetches all exchange requests with pagination and status filter
 * @param {number} page 
 * @param {number} limit 
 * @param {string} status 
 * @returns {Promise}
 */
export const getAllExchanges = async (page = 1, limit = 20, status = 'Pending') => {
    try {
        const response = await api.get(`/api/exchange?page=${page}&limit=${limit}&status=${status}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch exchange requests');
    }
};

/**
 * Fetches a single exchange request by ID
 * @param {string} id 
 * @returns {Promise}
 */
export const getExchangeById = async (id) => {
    try {
        const response = await api.get(`/api/exchange/${id}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch exchange details');
    }
};

/**
 * Creates a new exchange request
 * @param {FormData} formData 
 * @returns {Promise}
 */
export const createExchange = async (formData) => {
    try {
        const response = await api.post('/api/exchange', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to create exchange request');
    }
};

/**
 * Updates status of an exchange request
 * @param {string} id 
 * @param {Object} statusData { status, remark }
 * @returns {Promise}
 */
export const updateExchangeStatus = async (id, statusData) => {
    try {
        const response = await api.patch(`/api/exchange/${id}/status`, statusData);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to update status');
    }
};

/**
 * Assigns a new product to an exchange request (Step 2)
 * Backend fetches product details, snapshots them, and calculates priceDifference.
 * @param {string} id - Exchange request ID
 * @param {Object} selectProductData - { productId, priceDifferenceMode, remarks }
 * @returns {Promise}
 */
export const selectProductForExchange = async (id, selectProductData) => {
    try {
        const response = await api.patch(`/api/exchange/${id}/select-product`, selectProductData);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to select product for exchange');
    }
};

/**
 * Updates a full exchange record (only allowed in Pending status)
 * @param {string} id 
 * @param {Object} data 
 * @returns {Promise}
 */
export const updateExchange = async (id, data) => {
    try {
        const response = await api.put(`/api/exchange/${id}`, data);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to update exchange');
    }
};

/**
 * Deletes an exchange record
 * @param {string} id 
 * @returns {Promise}
 */
export const deleteExchange = async (id) => {
    try {
        const response = await api.delete(`/api/exchange/${id}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to delete exchange');
    }
};

/**
 * Filters exchange records using search criteria
 * @param {Object} searchParams { startDate, endDate, keyword, status }
 * @returns {Promise}
 */
export const searchExchanges = async (searchParams) => {
    try {
        const response = await api.post('/api/exchange/search', searchParams);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to search exchanges');
    }
};
