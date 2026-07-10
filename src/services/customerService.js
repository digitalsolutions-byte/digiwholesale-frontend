import api from './apiInstance';

export const getCustomerConfigs = async () => {
    try {
        const endpoints = [
            '/api/product/business-types',
            '/api/product/gst-types',
            '/api/product/plants',
            '/api/product/fitting-centers',
            '/api/product/credit-days',
            '/api/product/courier-names',
            '/api/product/courier-times',
            '/api/product/countries',
            '/api/product/states',
            '/api/product/billing-currencies',
            '/api/employee/sales-persons',
            '/api/product/brands',
            '/api/product/categories'
        ];

        const responses = await Promise.all(endpoints.map(url => api.get(url).catch(err => ({ error: err }))));

        return {
            businessTypes: responses[0]?.data?.data || [],
            gstTypes: responses[1]?.data?.data || [],
            plants: responses[2]?.data?.data || [],
            fittingCenters: responses[3]?.data?.data || [],
            creditDays: responses[4]?.data?.data || [],
            courierNames: responses[5]?.data?.data || [],
            courierTimes: responses[6]?.data?.data || [],
            countries: responses[7]?.data?.data || [],
            states: responses[8]?.data?.data || [],
            billingCurrencies: responses[9]?.data?.data || [],
            salesPersons: responses[10]?.data?.data || [],
            brands: responses[11]?.data?.data || [],
            categories: responses[12]?.data?.data || []
        };
    } catch (error) {
        console.error('Error fetching customer configs:', error);
        throw error;
    }
};

export const getBrandCategories = async (brandId) => {
    try {
        const response = await api.get(`/api/product/categories/brand/${brandId}`);
        return response.data?.data || [];
    } catch (error) {
        console.error('Error fetching brand categories:', error);
        return [];
    }
};

export const registerCustomer = async (customerData) => {
    try {
        const response = await api.post('/api/customer/management/register', customerData);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Registration failed');
    }
};

export const addShipTo = async (shipToData) => {
    try {
        const response = await api.post('/api/customer/management/add-ship-to', shipToData);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to add ship-to details');
    }
};

export const getAllCustomers = async (page = 1, limit = 10, filters = {}) => {
    try {
        const queryParams = new URLSearchParams({ page, limit, ...filters });
        const response = await api.get(`/api/customer/management/get-all-customers?${queryParams.toString()}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch customers');
    }
};

export const getCustomerById = async (id) => {
    try {
        const response = await api.get(`/api/customer/management/get-customer/${id}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch customer details');
    }
};

export const getDraftCustomerById = async (id) => {
    try {
        const response = await api.get(`/api/customer/management/get-draft-customer/${id}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch draft customer details');
    }
};

export const getAllRegions = async () => {
    try {
        const response = await api.get('/api/location/all-zone');
        return response.data?.data || response.data || [];
    } catch (error) {
        console.error('Error fetching regions:', error);
        return [];
    }
};

export const getAllCities = async () => {
    try {
        const response = await api.get('/api/location/get-all-city');
        return response.data?.data || [];
    } catch (error) {
        console.error('Error fetching all cities:', error);
        return [];
    }
};

export const getCitiesByRegion = async (regionId) => {
    try {
        const response = await api.get(`/api/location/get-city-by-region/${regionId}`);
        return response.data?.data || [];
    } catch (error) {
        console.error('Error fetching cities:', error);
        return [];
    }
};

export const getAllZones = async () => {
    try {
        const response = await api.get('/api/location/all-zone');
        return response.data?.data || response.data || [];
    } catch (error) {
        console.error('Error fetching zones:', error);
        return [];
    }
};

export const draftRegisterCustomer = async (customerData) => {
    try {
        const response = await api.post('/api/customer/management/draft-register', customerData);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Draft saving failed');
    }
};

export const updateDraftCustomer = async (id, customerData) => {
    try {
        const response = await api.put(`/api/customer/management/update-draft-customer/${id}`, customerData);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Draft update failed');
    }
};

export const getMyDraftCustomers = async (page = 1, limit = 10) => {
    try {
        const response = await api.get(`/api/customer/management/get-my-draft-customers?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch my draft customers');
    }
};

export const getAllDraftCustomers = async (page = 1, limit = 10) => {
    try {
        const response = await api.get(`/api/customer/management/get-all-draft-customers?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch all draft customers');
    }
};

export const deactivateDraftCustomer = async (id) => {
    try {
        const response = await api.delete(`/api/customer/management/deactivate-draft-customer/${id}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to deactivate draft customer');
    }
};

export const deactivateCustomer = async (id) => {
    try {
        const response = await api.delete(`/api/customer/management/deactivate-customer/${id}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to deactivate customer');
    }
};

export const getPendingFinanceApprovals = async (page = 1, limit = 10) => {
    try {
        const response = await api.get(`/api/customer/management/customer/pending-finance?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch pending finance approvals');
    }
};

export const getCorrectionRequiredCustomers = async (page = 1, limit = 10) => {
    try {
        const response = await api.get(`/api/customer/management/customer/correction-required?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch correction required customers');
    }
};

export const sendCustomerForCorrection = async (customerId, correctionData) => {
    try {
        const response = await api.put(`/api/customer/management/${customerId}/send-for-correction`, correctionData);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to send customer for correction');
    }
};

export const resubmitCustomerCorrection = async (customerId, correctionData) => {
    try {
        const response = await api.put(`/api/customer/management/${customerId}/resubmit-correction`, correctionData);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to resubmit customer correction');
    }
};

export const resubmitCustomerCorrectionFinance = async (customerId, correctionData) => {
    try {
        const response = await api.put(`/api/customer/management/${customerId}/finance-resubmit`, correctionData);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to resubmit customer correction');
    }
};

export const approveCustomerFinance = async (customerId, approvalData) => {
    try {
        const response = await api.put(`/api/customer/management/${customerId}/finance-complete`, approvalData);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to approve customer');
    }
};

export const salesHeadApproveCustomer = async (customerId, approvalData) => {
    try {
        const response = await api.put(`/api/customer/management/${customerId}/sales-head-approve`, approvalData);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed sales-head approval');
    }
};

export const financeApproveCustomer = async (customerId, approvalData) => {
    try {
        const response = await api.put(`/api/customer/management/${customerId}/finance-approve`, approvalData);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed finance approval');
    }
};

export const getPendingStageCustomers = async (stages, page = 1, limit = 10) => {
    try {
        const response = await api.get(`/api/customer/management/pending-stage?stage=${stages}&page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch pending stage customers');
    }
};

export const userCustomerLogin = async (credentials) => {
    try {
        const response = await api.post('/api/customer/management/login', credentials);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Customer login failed');
    }
};

export const acceptTermsConditions = async () => {
    try {
        const response = await api.put('/api/customer/management/accept-terms-conditions');
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to accept terms & conditions');
    }
};

export const updateShipToDetails = async (customerId, shipToData) => {
    try {
        const response = await api.put(`/api/customer/management/update-ship-to-details/${customerId}`, shipToData);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to update ship-to details');
    }
};
