import api, { handleServiceError } from './apiInstance';

export const getSystemConfigs = async () => {
    try {
        const response = await api.get('/api/system/config/all');
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch system configurations');
    }
};

export const getSettings = async () => {
    try {
        const response = await api.get('/api/settings');
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch settings');
    }
};
