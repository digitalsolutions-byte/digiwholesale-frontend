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

export const getPdcChequeAlerts = async () => {
  try {
    const response = await api.get('/api/v1/payments/pdc-alerts');
    return response.data;
  } catch (error) {
    throw handleServiceError(error, 'Failed to fetch PDC alerts');
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

export const downloadPaymentReceipt = async (paymentId, fileName = 'PaymentReceipt') => {
  try {
    const response = await api.get(`/api/v1/payments/${paymentId}/receipt`, {
      responseType: 'blob'
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${fileName}-${paymentId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    throw handleServiceError(error, 'Failed to download payment receipt');
  }
};

export const sendPaymentDueReminder = async (data) => {
  try {
    const response = await api.post('/api/v1/payments/due-reminder', data);
    return response.data;
  } catch (error) {
    throw handleServiceError(error, 'Failed to send payment due reminder');
  }
};

export const resendPaymentReceipt = async (paymentId, channel = 'both') => {
  try {
    const response = await api.post(`/api/v1/payments/${paymentId}/resend-receipt`, { channel });
    return response.data;
  } catch (error) {
    throw handleServiceError(error, 'Failed to resend payment receipt');
  }
};


export const getCustomerOrdersForLedger = async (customerId) => {
  try {
    const response = await api.get(`/api/v1/ledgers/customer/${customerId}/orders`);
    return response.data;
  } catch (error) {
    throw handleServiceError(error, 'Failed to fetch customer orders for ledger');
  }
};

export const downloadOrderChallan = async (orderId, fileName = 'Challan', regenerate = true) => {
  try {
    const response = await api.get(`/api/order/bulk-orders/${orderId}/challan`, {
      params: regenerate ? { regenerate: 'true' } : {},
      responseType: 'blob'
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${fileName}-${orderId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    throw handleServiceError(error, 'Failed to download delivery challan');
  }
};

export const downloadOrderInvoice = async (orderId, orderNumber, fileName = 'Invoice') => {
  try {
    const response = await api.get(`/api/order/bulk-orders/${orderId}/invoice`, {
      responseType: 'blob'
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${fileName}-${orderNumber || orderId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    throw handleServiceError(error, 'Failed to download invoice');
  }
};

export const downloadCustomerLedgerStatement = async (customerId, fileName = 'CustomerLedgerStatement', regenerate = true, filters = {}) => {
  try {
    const params = regenerate ? { regenerate: 'true' } : {};
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    const response = await api.get(`/api/v1/ledgers/customer/${customerId}/statement-pdf`, {
      params,
      responseType: 'blob'
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${fileName}-${customerId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    throw handleServiceError(error, 'Failed to download ledger statement');
  }
};

export const downloadVendorLedgerStatement = async (vendorId, fileName = 'VendorLedgerStatement', regenerate = true, filters = {}) => {
  try {
    const params = regenerate ? { regenerate: 'true' } : {};
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    const response = await api.get(`/api/v1/ledgers/vendor/${vendorId}/statement-pdf`, {
      params,
      responseType: 'blob'
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${fileName}-${vendorId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    throw handleServiceError(error, 'Failed to download vendor ledger statement');
  }
};

export const getVendorOrdersForLedger = async (vendorId) => {
  try {
    const response = await api.get(`/api/v1/ledgers/vendor/${vendorId}/orders`);
    return response.data;
  } catch (error) {
    throw handleServiceError(error, 'Failed to fetch vendor orders for ledger');
  }
};

