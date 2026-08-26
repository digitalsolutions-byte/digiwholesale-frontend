/**
 * createGlassTryOnApi.js
 * 
 * Adapter pattern that wraps any host-provided service.
 * Isolates the module UI and state from host API implementation details.
 */

export const createGlassTryOnApi = (hostService = {}) => ({
    getGlasses: async (params) => {
        if (typeof hostService.getGlasses === 'function') {
            return await hostService.getGlasses(params);
        }
        return { success: true, data: [] };
    },

    saveTryOnSnapshot: async (data) => {
        if (typeof hostService.saveTryOnSnapshot === 'function') {
            return await hostService.saveTryOnSnapshot(data);
        }
        return { success: true, data: { id: 'local-snapshot' } };
    },

    getSampleFaces: async () => {
        if (typeof hostService.getSampleFaces === 'function') {
            return await hostService.getSampleFaces();
        }
        return { success: true, data: [] };
    },
});
