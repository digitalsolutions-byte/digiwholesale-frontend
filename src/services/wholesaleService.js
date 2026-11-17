import api, { handleServiceError } from './apiInstance';


export const getIncomingRetailerOrders = async ({ page = 1, limit = 20, status = '', search = '', fromDate = '', toDate = '' } = {}) => {
    try {
        const params = new URLSearchParams({ page, limit });
        if (status) params.append('status', status);
        if (search) params.append('search', search);
        if (fromDate) params.append('fromDate', fromDate);
        if (toDate) params.append('toDate', toDate);

        const response = await api.get(`/api/ext/internal/orders?${params.toString()}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch incoming retailer orders');
    }
};

/**
 * PUT /api/ext/internal/orders/:id/status
 *
 * Updates the status of a specific incoming retailer order.
 * Valid transitions: Submitted → Processing | Cancelled
 *                   Processing → Completed | Cancelled
 *
 * @param {string} id            - ExternalOrder _id
 * @param {string} status        - 'Submitted' | 'Processing' | 'Completed' | 'Cancelled'
 * @param {string} cancelReason  - required when status === 'Cancelled'
 * @returns {Promise<{ success, message, order }>}
 */
export const updateRetailerOrderStatus = async (id, status, cancelReason = '') => {
    try {
        const payload = { status };
        if (cancelReason) payload.cancelReason = cancelReason;

        const response = await api.put(`/api/ext/internal/orders/${id}/status`, payload);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to update retailer order status');
    }
};
