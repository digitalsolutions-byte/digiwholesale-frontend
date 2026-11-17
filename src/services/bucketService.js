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

/**
 * Upload multiple invoice/challan/PDF files to GCS bucket.
 * @param {File[]} files - Array of File objects
 * @returns {Promise<Array>} - Array of { url, originalName, mimetype, size, uploadedAt }
 */
export const uploadMultipleDocuments = async (files) => {
    try {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));

        const response = await api.post('/api/bucket/upload-image/upload-multiple', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        return response.data?.data?.files || [];
    } catch (error) {
        throw handleServiceError(error, 'Failed to upload documents');
    }
};
