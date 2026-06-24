import api from './apiInstance';

export const createSupervisorUser = async (userData) => {
    try {
        const response = await api.post('/api/employee/management/create-employee', userData);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to create supervisor Employee');
    }
};
export const getAllEmployees = async (page = 1, limit = 10, filters = {}) => {
    try {
        const queryParams = new URLSearchParams({ page, limit, ...filters });
        const response = await api.get(`/api/employee/management/get-all-employees?${queryParams.toString()}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch employees');
    }
};

export const getEmployeeById = async (id) => {
    try {
        const response = await api.get(`/api/employee/management/get-employee/${id}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch employee details');
    }
};

export const getDraftEmployeeById = async (id) => {
    try {
        const response = await api.get(`/api/employee/management/get-draft-employee/${id}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch draft employee details');
    }
};
export const createDraftEmployee = async (userData) => {
    try {
        const response = await api.post('/api/employee/management/create-draft-employee', userData);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to save employee draft');
    }
};

export const updateDraftEmployee = async (id, userData) => {
    try {
        const response = await api.put(`/api/employee/management/update-draft-employee/${id}`, userData);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to update employee draft');
    }
};

export const getAllDraftEmployees = async (page = 1, limit = 10) => {
    try {
        const response = await api.get(`/api/employee/management/get-all-draft-employee?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch all draft employees');
    }
};

export const getMyDraftEmployees = async (page = 1, limit = 10) => {
    try {
        const response = await api.get(`/api/employee/management/get-my-draft-employee?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch my draft employees');
    }
};

export const updateEmployee = async (id, userData) => {
    try {
        const response = await api.put(`/api/employee/management/update-employee/${id}`, userData);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to update employee');
    }
};

export const deleteEmployee = async (id) => {
    try {
        const response = await api.delete(`/api/employee/management/delete-employee/${id}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to delete employee');
    }
};

export const deactivateDraftEmployee = async (id) => {
    try {
        const response = await api.delete(`/api/employee/management/deactivate-draft-employee/${id}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to deactivate draft employee');
    }
};

export const getMultipleEmployees = async (employeeIds, department, page = 1, limit = 10) => {
    try {
        const params = { page, limit };
        if (employeeIds) params.employeeIds = employeeIds;
        if (department) params.department = department;
        
        const queryParams = new URLSearchParams(params);
        const response = await api.get(`/api/employee/management/get-multiple-employees?${queryParams.toString()}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Failed to fetch multiple employees');
    }
};

