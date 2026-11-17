import api, { handleServiceError } from './apiInstance';

export const getAllOrders = async (page = 1, limit = 10, filters = {}) => {
    try {
        const queryParams = new URLSearchParams({ page, limit, ...filters });
        const response = await api.get(`/api/order/get-all-orders?${queryParams.toString()}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch orders');
    }
};

export const getOrderById = async (id) => {
    try {
        const response = await api.get(`/api/order/${id}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch order details');
    }
};

export const updateOrderStatus = async (id, status) => {
    try {
        const response = await api.put(`/api/order/update-status/${id}`, { status });
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to update order status');
    }
};

export const getOrderProductConfigs = async (brand = '', category = '') => {
    try {
        const coatingParams = new URLSearchParams();
        if (brand) coatingParams.append('brand', brand);
        if (category) coatingParams.append('category', category);
        const coatingQuery = coatingParams.toString() ? `?${coatingParams.toString()}` : '';

        const categoryQuery = brand ? `?brand=${encodeURIComponent(brand)}` : '';

        const [
            tintsRes,
            frameTypesRes,
            brandsRes,
            categoriesRes,
            treatmentsRes,
            indexesRes,
            productTypesRes,
            coatingsRes,
            plantsRes,
            labsRes,
            fittingCentersRes,
            courierNamesRes,
            specificLabsRes
        ] = await Promise.all([
            api.get('/api/order/product/get-tint').catch(() => ({ data: { data: [] } })),
            api.get('/api/order/product/get-frame-types').catch(() => ({ data: { data: [] } })),
            api.get('/api/order/product-fields/brand').catch(() => ({ data: { data: [] } })),
            api.get(`/api/order/product-fields/category${categoryQuery}`).catch(() => ({ data: { data: [] } })),
            api.get('/api/order/product-fields/treatment').catch(() => ({ data: { data: [] } })),
            api.get('/api/order/product-fields/index').catch(() => ({ data: { data: [] } })),
            api.get('/api/order/product-fields/productType').catch(() => ({ data: { data: [] } })),
            api.get(`/api/order/product-fields/coating${coatingQuery}`).catch(() => ({ data: { data: [] } })),
            api.get('/api/product/plants').catch(() => ({ data: { data: [] } })),
            api.get('/api/product/labs').catch(() => ({ data: { data: [] } })),
            api.get('/api/product/fitting-centers').catch(() => ({ data: { data: [] } })),
            api.get('/api/product/courier-names').catch(() => ({ data: { data: [] } })),
            api.get('/api/product/specific-labs').catch(() => ({ data: { data: [] } })),
        ]);

        const formatOptions = (arr) => (Array.isArray(arr) ? arr : []).map(item =>
            typeof item === 'string'
                ? { _id: item, name: item, value: item }
                : { ...item, _id: item._id || item.id || item.name || item.value, name: item.name || item.label || item.value || item._id, value: item.value ?? item.name ?? item._id }
        );

        return {
            tints: formatOptions(tintsRes?.data?.data || tintsRes?.data),
            frameTypes: formatOptions(frameTypesRes?.data?.data || frameTypesRes?.data),
            brand: formatOptions(brandsRes?.data?.data || brandsRes?.data),
            category: formatOptions(categoriesRes?.data?.data || categoriesRes?.data),
            treatment: formatOptions(treatmentsRes?.data?.data || treatmentsRes?.data),
            index: formatOptions(indexesRes?.data?.data || indexesRes?.data),
            productType: formatOptions(productTypesRes?.data?.data || productTypesRes?.data),
            coating: formatOptions(coatingsRes?.data?.data || coatingsRes?.data),
            plants: formatOptions(plantsRes?.data?.data || plantsRes?.data),
            labs: formatOptions(labsRes?.data?.data || labsRes?.data),
            fittingCenters: formatOptions(fittingCentersRes?.data?.data || fittingCentersRes?.data),
            courierNames: formatOptions(courierNamesRes?.data?.data || courierNamesRes?.data),
            specificLabs: formatOptions(specificLabsRes?.data?.data || specificLabsRes?.data),
        };
    } catch (error) {
        console.error('Error fetching order product configs:', error);
        return {};
    }
};

export const getTints = async () => {
    try {
        const response = await api.get('/api/order/product/get-tint');
        return response.data?.data || response.data || [];
    } catch (error) {
        console.error('Error fetching tints:', error);
        return [];
    }
};

export const getFrameTypes = async () => {
    try {
        const response = await api.get('/api/order/product/get-frame-types');
        return response.data?.data || response.data || [];
    } catch (error) {
        console.error('Error fetching frame types:', error);
        return [];
    }
};

export const getProductNames = async (search = '', page = 1, limit = 100, brand = '', category = '') => {
    try {
        const queryParams = new URLSearchParams({ page, limit });
        if (search) queryParams.append('search', search);
        if (brand) queryParams.append('brand', brand);
        if (category) queryParams.append('category', category);
        const response = await api.get(`/api/order/product-names?${queryParams.toString()}`);
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

export const getCategoriesByBrand = async (brandName = '') => {
    try {
        const url = brandName ? `/api/order/product-fields/category?brand=${encodeURIComponent(brandName)}` : '/api/order/product-fields/category';
        const response = await api.get(url);
        return response.data?.data || response.data || [];
    } catch (error) {
        console.error('Error fetching categories by brand:', error);
        return [];
    }
};

export const getCoatingsByFilter = async (brand = '', category = '') => {
    try {
        const params = new URLSearchParams();
        if (brand) params.append('brand', brand);
        if (category) params.append('category', category);
        const q = params.toString() ? `?${params.toString()}` : '';
        const response = await api.get(`/api/order/product-fields/coating${q}`);
        return response.data?.data || response.data || [];
    } catch (error) {
        console.error('Error fetching coatings by filter:', error);
        return [];
    }
};

export const resolveProductBase = async (payload) => {
    try {
        const response = await api.post('/api/order/resolve-product', payload);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to resolve product base');
    }
};

export const createOrder = async (payload) => {
    try {
        const response = await api.post('/api/order/create', payload);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to create order');
    }
};

export const updateOrder = async (id, payload) => {
    try {
        const response = await api.patch(`/api/order/${id}/draft`, payload);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to update order');
    }
};

export const cancelOrder = async (id, payload) => {
    try {
        const response = await api.post(`/api/order/${id}/cancel`, payload);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to cancel order');
    }
};

export const draftOrder = async (id) => {
    try {
        const response = await api.patch(`/api/order/${id}/draft`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to draft order');
    }
};

export const getDraftOrders = async (page = 1, limit = 10, search = '') => {
    try {
        const queryParams = new URLSearchParams({ page, limit });
        if (search) queryParams.append('search', search);
        const response = await api.get(`/api/order/draft-orders?${queryParams.toString()}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch draft orders');
    }
};

export const deleteOrder = async (id) => {
    try {
        const response = await api.delete(`/api/order/${id}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to delete order');
    }
};

export const createBulkOrders = async (payload) => {
    try {
        const response = await api.post('/api/order/create-bulk-orders', payload);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to create bulk orders');
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
        throw handleServiceError(error, 'Failed to fetch RX orders');
    }
};



export const updateBulkOrderStatus = async (orderId, status, orderNumber = null, remarks = '') => {
    try {
        const payload = { status };
        if (orderNumber) payload.orderNumber = orderNumber;
        if (remarks) payload.remarks = remarks;
        const response = await api.patch(`/api/order/bulk-orders/${orderId}/status`, payload);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to update order status');
    }
};

export const updateOrderTracking = async (orderId, payload) => {
    try {
        const response = await api.patch(`/api/order/bulk-orders/${orderId}/tracking`, payload);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to update order tracking details');
    }
};
