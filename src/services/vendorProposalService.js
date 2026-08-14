import api from './apiInstance';

export const vendorProposalService = {
    // 1. Create Proposal & Send to Vendors
    createProposal: async (payload) => {
        const response = await api.post('/api/vendor-proposal/create', payload);
        return response.data;
    },

    // 2. Get All Proposals
    getProposals: async (params = {}) => {
        const response = await api.get('/api/vendor-proposal/get-all', { params });
        return response.data;
    },

    // 3. Get Single Proposal Details
    getProposalDetails: async (id) => {
        const response = await api.get(`/api/vendor-proposal/get-details/${id}`);
        return response.data;
    },

    // 4. Submit Vendor Quotation
    submitQuotation: async (proposalId, quotationId, payload) => {
        const response = await api.patch(`/api/vendor-proposal/${proposalId}/quotation/${quotationId}`, payload);
        return response.data;
    },

    // 5. Finalize & Place Order
    finalizeProposal: async (proposalId, payload) => {
        const response = await api.post(`/api/vendor-proposal/${proposalId}/finalize`, payload);
        return response.data;
    },

    // 6. Cancel Proposal
    cancelProposal: async (proposalId, payload) => {
        const response = await api.patch(`/api/vendor-proposal/${proposalId}/cancel`, payload);
        return response.data;
    },

    // 7. Resend to Specific Vendor
    resendToVendor: async (proposalId, quotationId) => {
        const response = await api.post(`/api/vendor-proposal/${proposalId}/resend/${quotationId}`);
        return response.data;
    }
};
