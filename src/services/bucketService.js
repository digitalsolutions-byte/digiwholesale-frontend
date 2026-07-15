import api, { handleServiceError } from './apiInstance';

export const uploadImage = async (imageFile) => {
    try {
        const formData = new FormData();
        formData.append('image', imageFile);

        const response = await api.post('/api/bucket/upload-image/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        // Assuming response.data contains the URL directly or in a specific field
        // Adjust based on actual API response structure
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to upload image');
    }
};
