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

/**
 * Creates vendor purchase items
 * @param {Object} data 
 * @returns {Promise}
 */
export const createVendorPurchaseItems = async (data) => {
    try {
        const response = await api.post('/api/purchase/create-vendor-purchase-items', data);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to create vendor purchase items');
    }
};

/**
 * Searches product names for autofill
 * @param {string} query 
 * @returns {Promise}
 */
export const searchProductNames = async (query) => {
    try {
        const response = await api.get(`/api/digi/product/names?search=${query}&page=1&limit=100`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to search product names');
    }
};

/**
 * Returns all purchase items (purchase orders)
 * @param {string} search
 * @param {number} page
 * @param {number} limit
 * @returns {Promise}
 */
export const getAllPurchaseItems = async (search = '', page = 1, limit = 50) => {
    try {
        const queryParams = new URLSearchParams({ page, limit });
        if (search) queryParams.append('search', search);
        
        const response = await api.get(`/api/purchase/get-all-purchase-items?${queryParams.toString()}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch purchase items');
    }
};

/**
 * Returns the details of a specific purchase item (order)
 * @param {string} id
 * @returns {Promise}
 */
export const getPurchaseItemDetails = async (id) => {
    try {
        const response = await api.get(`/api/purchase/get-purchase-items-details/${id}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch purchase item details');
    }
};

/**
 * Returns all purchase items for a specific vendor
 * @param {string} vendorId
 * @returns {Promise}
 */
export const getVendorPurchaseOrders = async (vendorId) => {
    try {
        const response = await api.get(`/api/purchase/vendor-orders/${vendorId}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch vendor purchase orders');
    }
};

/**
 * Updates a purchase item (status, remark, etc)
 * @param {string} id 
 * @param {Object} payload 
 * @returns {Promise}
 */
export const updatePurchaseItem = async (id, payload) => {
    try {
        const response = await api.patch(`/api/purchase/update-vendor-purchase-items/${id}`, payload);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to update purchase item');
    }
};

/**
 * Deletes a purchase item
 * @param {string} id 
 * @returns {Promise}
 */
export const deletePurchaseItem = async (id) => {
    try {
        const response = await api.delete(`/api/purchase/delete-vendor-purchase-items/${id}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to delete purchase item');
    }
};

/**
 * Creates a purchase inward record (goods received)
 * POST /api/purchase-inward/create
 * @param {Object} data - { purchaseOrderId, remarks, items: [{ orderNumber, itemIndex, receivedQty, condition, vendorRefId, remarks }] }
 * @returns {Promise}
 */
export const createPurchaseInward = async (data) => {
    try {
        const response = await api.post('/api/purchase-inward/create', data);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to create purchase inward');
    }
};

/**
 * Gets all purchase inward items
 * GET /api/purchase-inward/get-all-items
 * @param {number} page
 * @param {number} limit
 * @returns {Promise}
 */
export const getAllInwardItems = async (page = 1, limit = 100) => {
    try {
        const response = await api.get(`/api/purchase-inward/get-all-items?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch inward items');
    }
};

/**
 * Gets a single purchase inward by ID
 * GET /api/purchase-inward/:id
 * @param {string} id
 * @returns {Promise}
 */
export const getInwardById = async (id) => {
    try {
        const response = await api.get(`/api/purchase-inward/${id}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch inward details');
    }
};

