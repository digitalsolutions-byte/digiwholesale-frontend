import api, { handleServiceError } from './apiInstance';

export const getGstReport = async (params = {}) => {
  try {
    const response = await api.get('/api/v1/reports/gst', { params });
    return response.data?.data || response.data;
  } catch (error) {
    throw handleServiceError(error, 'Failed to fetch GST report');
  }
};

export const downloadGstWorkbook = async (params = {}) => {
  try {
    const response = await api.get('/api/v1/reports/gst/export', {
      params,
      responseType: 'blob',
    });

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `GST_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    throw handleServiceError(error, 'Failed to download GST Excel workbook');
  }
};
