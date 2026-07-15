import api, { handleServiceError } from './apiInstance';

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
        throw handleServiceError(error, 'Failed to create vendor order');
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
        throw handleServiceError(error, 'Failed to fetch suggestions');
    }
};

/**
 * Returns paginated list of all vendor orders
 * @param {number} page 
 * @param {number} limit 
 * @returns {Promise}
 */
export const getAllVendorOrders = async (page = 1, limit = 10) => {
    try {
        const response = await api.get(`/api/vendor-order?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch vendor orders');
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
        throw handleServiceError(error, 'Failed to fetch vendor order details');
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
        throw handleServiceError(error, 'Failed to update status');
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
        throw handleServiceError(error, 'Failed to record issues');
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
        throw handleServiceError(error, 'Failed to delete order');
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
        throw handleServiceError(error, 'Search failed');
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
        throw handleServiceError(error, 'Failed to create vendor purchase items');
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
        throw handleServiceError(error, 'Failed to search product names');
    }
};

/**
 * Returns all purchase items (purchase orders)
 * @param {string} search
 * @param {number} page
 * @param {number} limit
 * @returns {Promise}
 */
export const getAllPurchaseItems = async (search = '', page = 1, limit = 10) => {
    try {
        const queryParams = new URLSearchParams({ page, limit });
        if (search) queryParams.append('search', search);

        const response = await api.get(`/api/purchase/get-all-purchase-items?${queryParams.toString()}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch purchase items');
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
        throw handleServiceError(error, 'Failed to fetch purchase item details');
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
        throw handleServiceError(error, 'Failed to fetch vendor purchase orders');
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
        throw handleServiceError(error, 'Failed to update purchase item');
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
        throw handleServiceError(error, 'Failed to delete purchase item');
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
        throw handleServiceError(error, 'Failed to create purchase inward');
    }
};

/**
 * Gets all purchase inward items
 * GET /api/purchase-inward/get-all-items
 * @param {number} page
 * @param {number} limit
 * @returns {Promise}
 */
export const getAllInwardItems = async (page = 1, limit = 10) => {
    try {
        const response = await api.get(`/api/purchase-inward/get-all-items?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch inward items');
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
        throw handleServiceError(error, 'Failed to fetch inward details');
    }
};

/**
 * Creates a purchase QC record (quality check after inward)
 * POST /api/purchase-qc/create
 * @param {Object} data - { purchaseOrderId, purchaseInwardId, notifyVendor, remarks, items: [{ itemId, passedQty, failedQty, failureReason, remarks }] }
 * @returns {Promise}
 */
export const createPurchaseQC = async (data) => {
    try {
        const response = await api.post('/api/purchase-qc/create', data);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to create purchase QC');
    }
};

/**
 * Gets all purchase QC items
 * GET /api/purchase-qc/get-all-items
 * @param {number} page
 * @param {number} limit
 * @returns {Promise}
 */
export const getAllQCItems = async (page = 1, limit = 10) => {
    try {
        const response = await api.get(`/api/purchase-qc/get-all-items?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch QC items');
    }
};

/**
 * Gets a single purchase QC record by ID
 * GET /api/purchase-qc/:id
 * @param {string} id
 * @returns {Promise}
 */
export const getQCById = async (id) => {
    try {
        const response = await api.get(`/api/purchase-qc/${id}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch QC details');
    }
};

/**
 * Updates a vendor purchase order (items, remarks, status, etc.)
 * PATCH /api/purchase/update-vendor-purchase-items/:id
 * @param {string} purchaseOrderId - The _id of the purchase order document
 * @param {Object} payload - { orders: [{ orderNumber, cgst, sgst, remarks, status, items: [...] }] }
 * @returns {Promise}
 */
export const updateVendorPurchaseOrder = async (purchaseOrderId, payload) => {
    try {
        const response = await api.patch(`/api/purchase/update-vendor-purchase-items/${purchaseOrderId}`, payload);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to update vendor purchase order');
    }
};

/**
 * Updates the status of a specific item in a purchase-return
 * PATCH /api/purchase-return/:returnId/items-status
 * @param {string} returnId - The _id of the purchase-return document
 * @param {Object} payload - { itemId, status, remarks }
 *   status values: "VendorNotified" | "Replaced" | "Closed" | "Pending" | "PartiallyReplaced"
 * @returns {Promise}
 */
export const updatePurchaseReturnItemStatus = async (returnId, payload) => {
    try {
        const response = await api.patch(`/api/purchase-return/${returnId}/items-status`, payload);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to update return item status');
    }
};

/**
 * Updates vendor reference IDs for items in a purchase order
 * PATCH /api/purchase/:purchaseOrderId/vendor-ref-id
 * @param {string} purchaseOrderId - The _id of the purchase order
 * @param {Object} payload - { refIds: [{ itemId, vendorRefId }] }
 * @returns {Promise}
 */
export const updateVendorRefIds = async (purchaseOrderId, payload) => {
    try {
        const response = await api.patch(`/api/purchase/${purchaseOrderId}/vendor-ref-id`, payload);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to update vendor reference IDs');
    }
};

/**
 * Gets all purchase return records
 * GET /api/purchase-return/get-all-items
 * @param {number} page
 * @param {number} limit
 * @param {string} search - optional vendor name search
 * @returns {Promise}
 */
export const getAllPurchaseReturns = async (page = 1, limit = 10, search = '') => {
    try {
        const queryParams = new URLSearchParams({ page, limit });
        if (search) queryParams.append('search', search);
        const response = await api.get(`/api/purchase-return/get-all-items?${queryParams.toString()}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch purchase returns');
    }
};

/**
 * Gets the QC failed items report
 * GET /api/purchase-qc/failed-report
 * @param {number} page
 * @param {number} limit
 * @returns {Promise}
 */
export const getQCFailedReport = async (page = 1, limit = 10) => {
    try {
        const response = await api.get(`/api/purchase-qc/failed-report?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch QC failed report');
    }
};

/**
 * Gets all inwarded purchase items
 * GET /api/purchase/items/all-inwarded
 * @param {number} page
 * @param {number} limit
 * @returns {Promise}
 */
export const getAllInwardedPurchaseItems = async (page = 1, limit = 10) => {
    try {
        const response = await api.get(`/api/purchase/items/all-inwarded?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch all inwarded items');
    }
};

/**
 * Gets all pending-inward purchase items
 * GET /api/purchase/items/pending-inward
 * @param {number} page
 * @param {number} limit
 * @returns {Promise}
 */
export const getPendingInwardItems = async (page = 1, limit = 10) => {
    try {
        const response = await api.get(`/api/purchase/items/pending-inward?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch pending inward items');
    }
};

/**
 * Gets all qc-pending purchase items
 * GET /api/purchase/items/qc-pending
 * @param {number} page
 * @param {number} limit
 * @returns {Promise}
 */
export const getQcPendingItems = async (page = 1, limit = 10) => {
    try {
        const response = await api.get(`/api/purchase/items/qc-pending?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch QC pending items');
    }
};

/**
 * Gets all qc-passed purchase items
 * GET /api/purchase/items/qc-passed
 * @param {number} page
 * @param {number} limit
 * @returns {Promise}
 */
export const getQcPassedItems = async (page = 1, limit = 10) => {
    try {
        const response = await api.get(`/api/purchase/items/qc-passed?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch QC passed items');
    }
};



/**
 * Gets paginated list of replacement orders
 * GET /api/purchase/replacement-orders
 * @param {number} page
 * @param {number} limit
 * @returns {Promise}
 */
export const getReplacementOrders = async (page = 1, limit = 10) => {
    try {
        const response = await api.get(`/api/purchase/replacement-orders?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch replacement orders');
    }
};

/**
 * Gets details of a specific replacement order
 * GET /api/purchase/replacement-orders/:id
 * @param {string} id
 * @returns {Promise}
 */
export const getReplacementOrderDetail = async (id) => {
    try {
        const response = await api.get(`/api/purchase/replacement-orders/${id}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch replacement order details');
    }
};

/**
 * Creates a replacement order via POST /api/purchase/replacement-orders
 * @param {Object} data
 * @returns {Promise}
 */
export const submitReplacementOrder = async (data) => {
    try {
        const response = await api.post('/api/purchase/create-replacement-order', data);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to submit replacement order');
    }
};
