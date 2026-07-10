import api from './apiInstance';

/**
 * Fetches all return-refund requests with pagination and status filter
 * @param {number} page 
 * @param {number} limit 
 * @param {string} status 
 * @returns {Promise}
 */
export const getAllReturnRefunds = async (page = 1, limit = 20, status = 'Pending') => {
    try {
        const response = await api.get(`/api/return-refund?page=${page}&limit=${limit}&status=${status}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch return-refund requests');
    }
};

/**
 * Fetches a single return-refund request by ID
 * @param {string} id 
 * @returns {Promise}
 */
export const getReturnRefundById = async (id) => {
    try {
        const response = await api.get(`/api/return-refund/${id}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch return-refund details');
    }
};

/**
 * Creates a new return-refund request
 * @param {FormData} formData 
 * @returns {Promise}
 */
export const createReturnRefund = async (formData) => {
    try {
        const response = await api.post('/api/return-refund', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to create return-refund request');
    }
};

/**
 * Updates status of a return-refund request
 * @param {string} id 
 * @param {Object} statusData { status, remark }
 * @returns {Promise}
 */
export const updateReturnRefundStatus = async (id, statusData) => {
    try {
        const response = await api.patch(`/api/return-refund/${id}/status`, statusData);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to update status');
    }
};

/**
 * Updates a full return-refund record
 * @param {string} id 
 * @param {Object} data 
 * @returns {Promise}
 */
export const updateReturnRefund = async (id, data) => {
    try {
        const response = await api.put(`/api/return-refund/${id}`, data);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to update return-refund');
    }
};

/**
 * Deletes a return-refund record
 * @param {string} id 
 * @returns {Promise}
 */
export const deleteReturnRefund = async (id) => {
    try {
        const response = await api.delete(`/api/return-refund/${id}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to delete return-refund');
    }
};

/**
 * Filters return-refund records using search criteria
 * @param {Object} searchParams { startDate, endDate, keyword, status }
 * @returns {Promise}
 */
export const searchReturnRefunds = async (searchParams) => {
    try {
        const response = await api.post('/api/return-refund/search', searchParams);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to search return-refunds');
    }
};
