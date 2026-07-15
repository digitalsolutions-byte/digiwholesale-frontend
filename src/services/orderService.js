import api from './apiInstance';

export const getAllOrders = async (page = 1, limit = 10, filters = {}) => {
    try {
        const queryParams = new URLSearchParams({ page, limit, ...filters });
        const response = await api.get(`/api/order/get-all-orders?${queryParams.toString()}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch orders');
    }
};

export const getOrderById = async (id) => {
    try {
        const response = await api.get(`/api/order/${id}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch order details');
    }
};

export const updateOrderStatus = async (id, status) => {
    try {
        const response = await api.put(`/api/order/update-status/${id}`, { status });
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to update order status');
    }
};

export const getOrderProductConfigs = async () => {
    try {
        const fields = ['brand', 'category', 'treatment', 'index', 'productType', 'coating'];
        const responses = await Promise.all(
            fields.map(field => api.get(`/api/order/product-fields/${field}`).catch(() => ({ data: { data: [] } })))
        );

        const configs = {};
        fields.forEach((field, index) => {
            configs[field] = responses[index]?.data?.data || [];
        });
        return configs;
    } catch (error) {
        console.error('Error fetching order product configs:', error);
        return {};
    }
};

export const getTints = async () => {
    try {
        const response = await api.get('/api/order/product/get-tint');
        return response.data?.data || [];
    } catch (error) {
        console.error('Error fetching tints:', error);
        return [];
    }
};

export const getFrameTypes = async () => {
    try {
        const response = await api.get('/api/order/product/get-frame-types');
        return response.data?.data || [];
    } catch (error) {
        console.error('Error fetching frame types:', error);
        return [];
    }
};

export const getProductNames = async (search = '', page = 1, limit = 10) => {
    try {
        const queryParams = new URLSearchParams({
            search,
            page,
            limit
        });
        const response = await api.get(`/api/digi/product/names?${queryParams.toString()}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching product names:', error);
        return { success: false, data: [] };
    }
};

export const getProductById = async (id) => {
    try {
        const response = await api.get(`/api/digi/product/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching product by ID:', error);
        return null;
    }
};

export const getCategoriesByBrand = async (brandName) => {
    try {
        const response = await api.get(`/api/order/product-fields/category?brand=${encodeURIComponent(brandName)}`);
        return response.data?.data || [];
    } catch (error) {
        console.error('Error fetching categories by brand:', error);
        return [];
    }
};

export const resolveProductBase = async (payload) => {
    try {
        const response = await api.post('/api/order/resolve-product', payload);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to resolve product base');
    }
};

export const createOrder = async (payload) => {
    try {
        const response = await api.post('/api/order/create', payload);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to create order');
    }
};

export const updateOrder = async (id, payload) => {
    try {
        const response = await api.patch(`/api/order/${id}/draft`, payload);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to update order');
    }
};

export const cancelOrder = async (id, payload) => {
    try {
        const response = await api.post(`/api/order/${id}/cancel`, payload);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to cancel order');
    }
};

export const draftOrder = async (id) => {
    try {
        const response = await api.patch(`/api/order/${id}/draft`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to draft order');
    }
};

export const getDraftOrders = async (page = 1, limit = 10, search = '') => {
    try {
        const queryParams = new URLSearchParams({ page, limit });
        if (search) queryParams.append('search', search);
        const response = await api.get(`/api/order/draft-orders?${queryParams.toString()}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch draft orders');
    }
};

export const deleteOrder = async (id) => {
    try {
        const response = await api.delete(`/api/order/${id}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to delete order');
    }
};

export const createBulkOrders = async (payload) => {
    try {
        const response = await api.post('/api/order/create-bulk-orders', payload);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to create bulk orders');
    }
};

export const getOrderSuggestions = async (search = '') => {
    try {
        const response = await api.get(`/api/order/suggestions?search=${encodeURIComponent(search)}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching order suggestions:', error);
        return { success: false, data: { orders: [] } };
    }
};

export const getRxOrders = async (search = '') => {
    try {
        const queryParams = search ? `?search=${encodeURIComponent(search)}` : '';
        const response = await api.get(`/api/order/rx-orders${queryParams}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch RX orders');
    }
};



export const updateBulkOrderStatus = async (orderId, status, orderNumber = null) => {
    try {
        const payload = orderNumber ? { orderNumber, status } : { status };
        const response = await api.patch(`/api/order/bulk-orders/${orderId}/status`, payload);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to update order status');
    }
};
