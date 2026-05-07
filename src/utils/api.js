import api from '../services/apiInstance';

// Re-exporting the main API instance to ensure all new modules 
// (Vendor, Repair, Reports) have access to the established interceptors 
// and base URL configuration.

export default api;
