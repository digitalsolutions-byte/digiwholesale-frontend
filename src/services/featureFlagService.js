import api from './apiInstance';

export const getMyFeatureFlags = async () => {
    try {
        const response = await api.get('/api/settings/features');
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};
