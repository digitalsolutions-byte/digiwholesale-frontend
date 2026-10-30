import api, { handleServiceError } from './apiInstance';

/**
 * Fetch all unified system notifications across Cheques, Orders, Customer Approvals, and Returns
 */
export const getAllSystemNotifications = async (params = {}) => {
  try {
    const response = await api.get('/api/v1/notifications/all', { params });
    return response.data;
  } catch (error) {
    throw handleServiceError(error, 'Failed to fetch system notifications');
  }
};

