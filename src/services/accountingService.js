import api, { handleServiceError } from './apiInstance';

// --- CHART OF ACCOUNTS ---
export const getAccountTree = async () => {
  try {
    const response = await api.get('/api/v1/accounts/tree');
    return response.data;
  } catch (error) {
    throw handleServiceError(error, 'Failed to fetch Chart of Accounts tree');
  }
};

export const getAccountsList = async (params = {}) => {
  try {
    const response = await api.get('/api/v1/accounts', { params });
    return response.data;
  } catch (error) {
    throw handleServiceError(error, 'Failed to fetch accounts list');
  }
};

export const createAccount = async (data) => {
  try {
    const response = await api.post('/api/v1/accounts', data);
    return response.data;
  } catch (error) {
    throw handleServiceError(error, 'Failed to create account');
  }
};

export const updateAccount = async (id, data) => {
  try {
    const response = await api.put(`/api/v1/accounts/${id}`, data);
    return response.data;
  } catch (error) {
    throw handleServiceError(error, 'Failed to update account');
  }
};

// --- CUSTOMER LEDGERS & KHATA ---
export const getCustomerLedgers = async (params = {}) => {
  try {
    const response = await api.get('/api/v1/ledgers/customers', { params });
    return response.data;
  } catch (error) {
    throw handleServiceError(error, 'Failed to fetch customer ledgers');
  }
};

export const getCustomerStatement = async (customerId, params = {}) => {
  try {
    const response = await api.get(`/api/v1/ledgers/customer/${customerId}`, { params });
    return response.data;
  } catch (error) {
    throw handleServiceError(error, 'Failed to load customer statement');
  }
};

export const upsertCustomerLedger = async (data) => {
  try {
    const response = await api.post('/api/v1/ledgers/customer/upsert', data);
    return response.data;
  } catch (error) {
    throw handleServiceError(error, 'Failed to save customer ledger settings');
  }
};

// --- VENDOR LEDGERS & STATEMENTS ---
export const getVendorLedgers = async (params = {}) => {
  try {
    const response = await api.get('/api/v1/ledgers/vendors', { params });
    return response.data;
  } catch (error) {
    throw handleServiceError(error, 'Failed to fetch vendor ledgers');
  }
};

export const getVendorStatement = async (vendorId, params = {}) => {
  try {
    const response = await api.get(`/api/v1/ledgers/vendor/${vendorId}`, { params });
    return response.data;
  } catch (error) {
    throw handleServiceError(error, 'Failed to load vendor statement');
  }
};

export const upsertVendorLedger = async (data) => {
  try {
    const response = await api.post('/api/v1/ledgers/vendor/upsert', data);
    return response.data;
  } catch (error) {
    throw handleServiceError(error, 'Failed to save vendor ledger settings');
  }
};

// --- PAYMENTS & VOUCHERS ---
export const executeCustomerPayment = async (data) => {
  try {
    const response = await api.post('/api/v1/payments/customer', data);
    return response.data;
  } catch (error) {
    throw handleServiceError(error, 'Failed to process customer payment');
  }
};

export const executeVendorPayment = async (data) => {
  try {
    const response = await api.post('/api/v1/payments/vendor', data);
    return response.data;
  } catch (error) {
    throw handleServiceError(error, 'Failed to process vendor payout');
  }
};

export const updateChequeStatus = async (paymentId, data) => {
  try {
    const response = await api.patch(`/api/v1/payments/${paymentId}/cheque-status`, data);
    return response.data;
  } catch (error) {
    throw handleServiceError(error, 'Failed to update cheque status');
  }
};

export const getPaymentsList = async (params = {}) => {
  try {
    const response = await api.get('/api/v1/payments', { params });
    return response.data;
  } catch (error) {
    throw handleServiceError(error, 'Failed to fetch payments list');
  }
};

export const getPaymentById = async (id) => {
  try {
    const response = await api.get(`/api/v1/payments/${id}`);
    return response.data;
  } catch (error) {
    throw handleServiceError(error, 'Failed to fetch payment details');
  }
};

// --- AGING REPORT ---
export const getAgingReport = async (params = {}) => {
  try {
    const response = await api.get('/api/v1/reports/aging', { params });
    return response.data;
  } catch (error) {
    throw handleServiceError(error, 'Failed to generate aging report');
  }
};


export const adjustDueFromAdvance = async (data) => {
  try {
    const response = await api.post('/api/v1/payments/adjust-advance', data);
    return response.data;
  } catch (error) {
    throw handleServiceError(error, 'Failed to adjust due from advance');
  }
};
