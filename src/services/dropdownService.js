import api, { handleServiceError } from './apiInstance';

// --- PLANTS ---
export const getPlants = async (params = {}) => {
    try {
        const response = await api.get('/api/product/plants', { params });
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch plants');
    }
};

export const getPlantById = async (id) => {
    try {
        const response = await api.get(`/api/product/plants/${id}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch plant');
    }
};

export const createPlant = async (data) => {
    try {
        const response = await api.post('/api/product/plants', data);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to create plant');
    }
};

export const updatePlant = async (id, data) => {
    try {
        const response = await api.put(`/api/product/plants/${id}`, data);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to update plant');
    }
};

export const deletePlant = async (id) => {
    try {
        const response = await api.delete(`/api/product/plants/${id}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to delete plant');
    }
};

// --- LABS ---
export const getLabs = async (params = {}) => {
    try {
        const response = await api.get('/api/product/labs', { params });
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch labs');
    }
};

export const getLabById = async (id) => {
    try {
        const response = await api.get(`/api/product/labs/${id}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch lab');
    }
};

export const createLab = async (data) => {
    try {
        const response = await api.post('/api/product/labs', data);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to create lab');
    }
};

export const updateLab = async (id, data) => {
    try {
        const response = await api.put(`/api/product/labs/${id}`, data);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to update lab');
    }
};

export const deleteLab = async (id) => {
    try {
        const response = await api.delete(`/api/product/labs/${id}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to delete lab');
    }
};

// --- FITTING CENTERS ---
export const getFittingCenters = async (params = {}) => {
    try {
        const response = await api.get('/api/product/fitting-centers', { params });
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch fitting centers');
    }
};

export const getFittingCenterById = async (id) => {
    try {
        const response = await api.get(`/api/product/fitting-centers/${id}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch fitting center');
    }
};

export const createFittingCenter = async (data) => {
    try {
        const response = await api.post('/api/product/fitting-centers', data);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to create fitting center');
    }
};

export const updateFittingCenter = async (id, data) => {
    try {
        const response = await api.put(`/api/product/fitting-centers/${id}`, data);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to update fitting center');
    }
};

export const deleteFittingCenter = async (id) => {
    try {
        const response = await api.delete(`/api/product/fitting-centers/${id}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to delete fitting center');
    }
};

// --- COURIER NAMES ---
export const getCourierNames = async (params = {}) => {
    try {
        const response = await api.get('/api/product/courier-names', { params });
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch couriers');
    }
};

export const getCourierNameById = async (id) => {
    try {
        const response = await api.get(`/api/product/courier-names/${id}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch courier details');
    }
};

export const createCourierName = async (data) => {
    try {
        const response = await api.post('/api/product/courier-names', data);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to create courier');
    }
};

export const updateCourierName = async (id, data) => {
    try {
        const response = await api.put(`/api/product/courier-names/${id}`, data);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to update courier');
    }
};

export const deleteCourierName = async (id) => {
    try {
        const response = await api.delete(`/api/product/courier-names/${id}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to delete courier');
    }
};

// --- BRANDS ---
export const getBrands = async (params = {}) => {
    try {
        const response = await api.get('/api/product/brands', { params });
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch brands');
    }
};

export const getBrandById = async (id) => {
    try {
        const response = await api.get(`/api/product/brands/${id}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch brand details');
    }
};

export const createBrand = async (data) => {
    try {
        const response = await api.post('/api/product/brands', data);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to create brand');
    }
};

export const updateBrand = async (id, data) => {
    try {
        const response = await api.put(`/api/product/brands/${id}`, data);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to update brand');
    }
};

export const deleteBrand = async (id) => {
    try {
        const response = await api.delete(`/api/product/brands/${id}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to delete brand');
    }
};

// --- CATEGORIES ---
export const getCategories = async (params = {}) => {
    try {
        const response = await api.get('/api/product/categories', { params });
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch categories');
    }
};

export const getCategoriesByBrand = async (brandId) => {
    try {
        const response = await api.get(`/api/product/categories/brand/${brandId}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch brand categories');
    }
};

export const getCategoryById = async (id) => {
    try {
        const response = await api.get(`/api/product/categories/${id}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch category details');
    }
};

export const createCategory = async (data) => {
    try {
        const response = await api.post('/api/product/categories', data);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to create category');
    }
};

export const updateCategory = async (id, data) => {
    try {
        const response = await api.put(`/api/product/categories/${id}`, data);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to update category');
    }
};

export const deleteCategory = async (id) => {
    try {
        const response = await api.delete(`/api/product/categories/${id}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to delete category');
    }
};

// --- SPECIFIC LABS ---
export const getSpecificLabs = async (params = {}) => {
    try {
        const response = await api.get('/api/product/specific-labs', { params });
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch specific labs');
    }
};

export const getSpecificLabById = async (id) => {
    try {
        const response = await api.get(`/api/product/specific-labs/${id}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch specific lab details');
    }
};

export const createSpecificLab = async (data) => {
    try {
        const response = await api.post('/api/product/specific-labs', data);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to create specific lab');
    }
};

export const updateSpecificLab = async (id, data) => {
    try {
        const response = await api.put(`/api/product/specific-labs/${id}`, data);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to update specific lab');
    }
};

export const deleteSpecificLab = async (id) => {
    try {
        const response = await api.delete(`/api/product/specific-labs/${id}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to delete specific lab');
    }
};
