import api from './apiInstance';

/**
 * Fetches all repairs with pagination
 * @param {number} page 
 * @param {number} limit 
 * @returns {Promise}
 */
export const getAllRepairs = async (page = 1, limit = 100) => {
    try {
        const response = await api.get(`/api/repair?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch repairs');
    }
};

/**
 * Searches repairs with filters
 * @param {Object} filters { keyword, startDate, endDate }
 * @returns {Promise}
 */
export const searchRepairs = async (filters) => {
    try {
        const response = await api.post('/api/repair/search', filters);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Search failed');
    }
};

/**
 * Creates a new repair record
 * @param {FormData} formData 
 * @returns {Promise}
 */
export const createRepair = async (formData) => {
    try {
        const response = await api.post('/api/repair', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to create repair');
    }
};

/**
 * Updates repair status
 * @param {string} id - MongoDB _id or repairNumber
 * @param {string} status 
 * @returns {Promise}
 */
export const updateRepairStatus = async (id, status) => {
    try {
        const response = await api.patch(`/api/repair/${id}/status`, { status });
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to update repair status');
    }
};

/**
 * Fetches a single repair record by ID
 * @param {string} id 
 * @returns {Promise}
 */
export const getRepairById = async (id) => {
    try {
        const response = await api.get(`/api/repair/${id}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch repair details');
    }
};

/**
 * Updates an existing repair record
 * @param {string} id 
 * @param {Object} data 
 * @returns {Promise}
 */
export const updateRepair = async (id, data) => {
    try {
        const response = await api.put(`/api/repair/${id}`, data);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to update repair');
    }
};

/**
 * Permanently deletes a repair record
 * @param {string} id - MongoDB _id
 * @returns {Promise}
 */
export const deleteRepair = async (id) => {
    try {
        const response = await api.delete(`/api/repair/${id}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to delete repair');
    }
};

