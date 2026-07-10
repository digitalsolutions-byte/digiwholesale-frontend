import api from './apiInstance';

export const getSales = async (page = 1, limit = 20, filters = {}) => {
    try {
        const queryParams = new URLSearchParams({ page, limit, ...filters });
        const response = await api.get(`/api/sale?${queryParams.toString()}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch sales');
    }
};

export const getSaleById = async (id) => {
    try {
        const response = await api.get(`/api/sale/${id}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch sale details');
    }
};

export const createSale = async (saleData) => {
    try {
        const response = await api.post('/api/sale', saleData);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to create sale');
    }
};

export const updateSale = async (id, saleData) => {
    try {
        const response = await api.put(`/api/sale/${id}`, saleData);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to update sale');
    }
};

export const deleteSale = async (id) => {
    try {
        const response = await api.delete(`/api/sale/${id}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to delete sale');
    }
};
