import api from './apiInstance';

export const getSystemConfigs = async () => {
    try {
        const response = await api.get('/api/system/config/all');
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch system configurations');
    }
};

export const getSettings = async () => {
    try {
        const response = await api.get('/api/settings');
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch settings');
    }
};
