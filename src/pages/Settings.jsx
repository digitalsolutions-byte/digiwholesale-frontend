import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import { Box, alpha, useTheme } from '@mui/material';
import * as dropdownService from '../services/dropdownService';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import SearchableSelect from '../components/ui/SearchableSelect';
import Input from '../components/ui/Input';

const TABS = [
    { id: 'plants', label: 'Plants', icon: 'lucide:factory', entityName: 'Plant' },
    { id: 'labs', label: 'Labs', icon: 'lucide:flask-conical', entityName: 'Lab' },
    { id: 'fitting-centers', label: 'Fitting Centers', icon: 'lucide:map-pin', entityName: 'Fitting Center' },
    { id: 'couriers', label: 'Courier Names', icon: 'lucide:truck', entityName: 'Courier Name' },
    { id: 'brands', label: 'Brands', icon: 'lucide:award', entityName: 'Brand' },
    { id: 'categories', label: 'Categories', icon: 'lucide:tags', entityName: 'Category' },
    { id: 'specific-labs', label: 'Specific Labs', icon: 'lucide:microscope', entityName: 'Specific Lab' },
];

export default function Settings() {
    const theme = useTheme();
    const [activeTab, setActiveTab] = useState('plants');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Brands list for Category tab
    const [brands, setBrands] = useState([]);
    const [selectedBrandFilter, setSelectedBrandFilter] = useState('');

    // Modal state for Add/Edit
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({ name: '', description: '', brand: '', isActive: true });
    const [formErrors, setFormErrors] = useState({});
    const [submitLoading, setSubmitLoading] = useState(false);

    // Delete Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Dynamic API selectors based on active tab
    const getTabConfig = useCallback((tab) => {
        switch (tab) {
            case 'plants':
                return {
                    fetch: dropdownService.getPlants,
                    create: dropdownService.createPlant,
                    update: dropdownService.updatePlant,
                    delete: dropdownService.deletePlant,
                };
            case 'labs':
                return {
                    fetch: dropdownService.getLabs,
                    create: dropdownService.createLab,
                    update: dropdownService.updateLab,
                    delete: dropdownService.deleteLab,
                };
            case 'fitting-centers':
                return {
                    fetch: dropdownService.getFittingCenters,
                    create: dropdownService.createFittingCenter,
                    update: dropdownService.updateFittingCenter,
                    delete: dropdownService.deleteFittingCenter,
                };
            case 'couriers':
                return {
                    fetch: dropdownService.getCourierNames,
                    create: dropdownService.createCourierName,
                    update: dropdownService.updateCourierName,
                    delete: dropdownService.deleteCourierName,
                };
            case 'brands':
                return {
                    fetch: dropdownService.getBrands,
                    create: dropdownService.createBrand,
                    update: dropdownService.updateBrand,
                    delete: dropdownService.deleteBrand,
                };
            case 'categories':
                return {
                    fetch: async (params) => {
                        // If a brand filter is selected, fetch using the brand-specific endpoint
                        if (selectedBrandFilter) {
                            const res = await dropdownService.getCategoriesByBrand(selectedBrandFilter);
                            // Normalize specific brand get categories response format to match standard array structure
                            return { success: true, data: res.data?.categories || [] };
                        }
                        return dropdownService.getCategories(params);
                    },
                    create: dropdownService.createCategory,
                    update: dropdownService.updateCategory,
                    delete: dropdownService.deleteCategory,
                };
            case 'specific-labs':
                return {
                    fetch: dropdownService.getSpecificLabs,
                    create: dropdownService.createSpecificLab,
                    update: dropdownService.updateSpecificLab,
                    delete: dropdownService.deleteSpecificLab,
                };
            default:
                return {};
        }
    }, [selectedBrandFilter]);

    // Fetch master list of Brands (for Category dropdown/filter)
    const fetchBrandsList = async () => {
        try {
            const res = await dropdownService.getBrands();
            if (res.success) {
                setBrands(res.data || []);
            }
        } catch (err) {
            console.error('Failed to load brands:', err);
        }
    };

    // Load data items
    const loadItems = useCallback(async () => {
        setLoading(true);
        try {
            const config = getTabConfig(activeTab);
            if (config.fetch) {
                const res = await config.fetch();
                if (res.success) {
                    setItems(res.data || []);
                } else {
                    setItems([]);
                }
            }
        } catch (error) {
            console.error(`Error loading items for ${activeTab}:`, error);
            toast.error(error.message || `Failed to load settings data.`);
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [activeTab, getTabConfig]);

    useEffect(() => {
        loadItems();
        if (activeTab === 'categories') {
            fetchBrandsList();
        }
    }, [activeTab, loadItems]);

    // Filter items locally based on search input
    const filteredItems = items.filter((item) => {
        const matchesSearch =
            item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    // Handle Open Add Modal
    const handleAddClick = () => {
        setEditingItem(null);
        setFormData({
            name: '',
            description: '',
            brand: selectedBrandFilter || '',
            isActive: true
        });
        setFormErrors({});
        setModalOpen(true);
    };

    // Handle Open Edit Modal
    const handleEditClick = (item) => {
        setEditingItem(item);
        setFormData({
            name: item.name || '',
            description: item.description || '',
            brand: item.brand?._id || item.brand || '',
            isActive: item.isActive ?? true
        });
        setFormErrors({});
        setModalOpen(true);
    };

    // Toggle isActive switch directly from table row
    const handleToggleActive = async (item) => {
        try {
            const config = getTabConfig(activeTab);
            if (config.update) {
                const updatedStatus = !item.isActive;
                const res = await config.update(item._id, { isActive: updatedStatus });
                if (res.success) {
                    toast.success(`${item.name} is now ${updatedStatus ? 'Active' : 'Inactive'}`);
                    loadItems();
                }
            }
        } catch (error) {
            toast.error(error.message || 'Failed to update active status');
        }
    };

    // Confirm item delete
    const handleDeleteClick = (item) => {
        setItemToDelete(item);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        setDeleteLoading(true);
        try {
            const config = getTabConfig(activeTab);
            if (config.delete) {
                const res = await config.delete(itemToDelete._id);
                if (res.success) {
                    toast.success('Deleted successfully');
                    setDeleteModalOpen(false);
                    setItemToDelete(null);
                    loadItems();
                }
            }
        } catch (error) {
            // Check specifically for blocked category dependencies error message
            toast.error(error.message || 'Deletion failed');
        } finally {
            setDeleteLoading(false);
        }
    };

    // Handle Form Submit (Add/Edit)
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setFormErrors({});

        // Simple validation
        const errors = {};
        if (!formData.name.trim()) {
            errors.name = { message: 'Name is required' };
        }
        if (activeTab === 'categories' && !formData.brand) {
            errors.brand = { message: 'Brand is required' };
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setSubmitLoading(true);
        try {
            const config = getTabConfig(activeTab);
            let response;
            
            const submitPayload = {
                name: formData.name.trim(),
                description: formData.description.trim(),
                isActive: formData.isActive
            };

            if (activeTab === 'categories') {
                submitPayload.brand = formData.brand;
            }

            if (editingItem) {
                response = await config.update(editingItem._id, submitPayload);
            } else {
                response = await config.create(submitPayload);
            }

            if (response.success) {
                toast.success(editingItem ? 'Updated successfully' : 'Created successfully');
                setModalOpen(false);
                loadItems();
            }
        } catch (error) {
            console.error('Submit failed:', error);
            const msg = error.response?.data?.message || error.message || 'Operation failed';
            
            // Map validation/duplicate error messages back into form validation state
            if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('already exists')) {
                setFormErrors({ name: { message: msg } });
            } else {
                setFormErrors({ general: msg });
            }
        } finally {
            setSubmitLoading(false);
        }
    };

    const currentTabConfig = TABS.find(t => t.id === activeTab);

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans animate-in fade-in duration-200">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
                        <Icon icon="lucide:settings" className="text-[#2980B9] text-2xl" />
                        Wholesaler Master Settings
                    </h1>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                        Isolated dropdown configurations — manage plants, labs, fitting locations, courier partners, and inventory taxonomy
                    </p>
                </div>
                <button
                    onClick={handleAddClick}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#2980B9] hover:bg-[#2471A3] text-white text-xs font-semibold rounded-xl transition-all shadow-xs active:scale-95"
                >
                    <Icon icon="lucide:plus" className="text-base" />
                    Add New {currentTabConfig?.entityName}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                {/* Left Side Tab Navigation */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden p-3 space-y-1 lg:col-span-1">
                    <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100/80 mb-2">
                        Settings Categories
                    </div>
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    setSearchTerm('');
                                    setSelectedBrandFilter('');
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-bold transition-all ${
                                    isActive
                                        ? 'bg-[#eaf4fb] text-[#1F618D]'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                            >
                                <Icon icon={tab.icon} className={`text-base ${isActive ? 'text-[#1F618D]' : 'text-slate-400'}`} />
                                <span className="flex-1">{tab.label}</span>
                                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#1F618D]" />}
                            </button>
                        );
                    })}
                </div>

                {/* Right Side Content Pane */}
                <div className="lg:col-span-3 space-y-4">
                    {/* Filters bar */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row gap-3 items-center">
                        <div className="flex-1 w-full relative">
                            <Icon icon="lucide:search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                            <input
                                type="text"
                                placeholder={`Search in ${currentTabConfig?.label}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#2980B9] focus:bg-white transition-all"
                            />
                        </div>

                        {/* Extra brand filter strictly for Categories tab */}
                        {activeTab === 'categories' && (
                            <div className="w-full sm:w-60">
                                <SearchableSelect
                                    placeholder="Filter by Brand"
                                    options={brands.map(b => ({ value: b._id, label: b.name }))}
                                    value={selectedBrandFilter}
                                    onChange={(e) => {
                                        setSelectedBrandFilter(e.target.value);
                                    }}
                                    name="brandFilter"
                                />
                            </div>
                        )}

                        <button
                            onClick={loadItems}
                            className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 shrink-0 text-slate-500 hover:text-slate-700"
                            title="Refresh list"
                        >
                            <Icon icon="lucide:refresh-cw" className={`text-sm ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {/* Table list */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="py-4 px-5">Name</th>
                                        {activeTab === 'categories' && <th className="py-4 px-5">Brand</th>}
                                        <th className="py-4 px-5">Description</th>
                                        <th className="py-4 px-5 text-center">Status</th>
                                        <th className="py-4 px-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={activeTab === 'categories' ? 5 : 4} className="py-12 text-center text-slate-400 font-semibold">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Icon icon="lucide:loader-2" className="animate-spin text-lg text-[#2980B9]" />
                                                    <span>Loading {currentTabConfig?.label}...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={activeTab === 'categories' ? 5 : 4} className="py-12 text-center text-slate-400">
                                                <Icon icon="lucide:inbox" className="text-3xl mx-auto mb-2 text-slate-300" />
                                                <p className="font-semibold text-slate-600">No {activeTab} configured yet.</p>
                                                <p className="text-[11px] mt-1">Click the button above to add the first item.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredItems.map((item) => (
                                            <tr key={item._id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="px-5 py-4 font-bold text-slate-800">
                                                    {item.name}
                                                </td>
                                                {activeTab === 'categories' && (
                                                    <td className="px-5 py-4 font-semibold text-[#1F618D]">
                                                        {item.brand?.name || item.brand || '—'}
                                                    </td>
                                                )}
                                                <td className="px-5 py-4 text-slate-500 max-w-sm truncate">
                                                    {item.description || '—'}
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <button
                                                        onClick={() => handleToggleActive(item)}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
                                                            item.isActive
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                                                        }`}
                                                    >
                                                        <span className={`w-1.5 h-1.5 rounded-full ${item.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                        {item.isActive ? 'Active' : 'Inactive'}
                                                    </button>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleEditClick(item)}
                                                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-[#2980B9] transition-all"
                                                            title="Edit"
                                                        >
                                                            <Icon icon="lucide:pencil" className="text-base" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(item)}
                                                            className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-all"
                                                            title="Delete"
                                                        >
                                                            <Icon icon="lucide:trash-2" className="text-base" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add / Edit Modal Dialog – rendered via Portal so fixed backdrop covers full screen */}
            {modalOpen && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setModalOpen(false)}
                >
                    <div
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <Icon icon={editingItem ? 'lucide:pencil' : 'lucide:plus'} className="text-[#2980B9]" />
                                {editingItem ? 'Edit' : 'Add New'} {currentTabConfig?.entityName}
                            </h3>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-all"
                            >
                                <Icon icon="lucide:x" className="text-lg" />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                            {formErrors.general && (
                                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
                                    <Icon icon="lucide:alert-circle" className="text-base shrink-0" />
                                    <span>{formErrors.general}</span>
                                </div>
                            )}

                            {/* Name Input */}
                            <Input
                                label={`${currentTabConfig?.entityName} Name *`}
                                placeholder={`Enter ${currentTabConfig?.entityName.toLowerCase()} name`}
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                error={formErrors.name}
                                required
                            />

                            {/* Brand Dropdown (Strictly for Categories Tab) */}
                            {activeTab === 'categories' && (
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide ml-0.5">
                                        Brand *
                                    </label>
                                    <SearchableSelect
                                        placeholder="Select Brand"
                                        options={brands.map(b => ({ value: b._id, label: b.name }))}
                                        value={formData.brand}
                                        onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                                        error={formErrors.brand}
                                        name="categoryBrand"
                                    />
                                </div>
                            )}

                            {/* Description Input */}
                            <Input
                                label="Description"
                                placeholder={`Enter optional description`}
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                error={formErrors.description}
                            />

                            {/* Active Status Toggle */}
                            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="space-y-0.5">
                                    <div className="text-xs font-bold text-slate-800">Status</div>
                                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Define if this item is active for selection</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        formData.isActive ? 'bg-[#2980B9]' : 'bg-slate-200'
                                    }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                            formData.isActive ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="flex-1 py-3 px-6 text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border border-slate-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitLoading}
                                    className="flex-1 py-3 px-6 text-xs font-bold text-white bg-[#2980B9] hover:bg-[#2471A3] rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                                >
                                    {submitLoading && <Icon icon="lucide:loader-2" className="animate-spin text-sm" />}
                                    Save {currentTabConfig?.entityName}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Confirmation modal for Deletion */}
            <ConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setItemToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                loading={deleteLoading}
                title={`Delete ${currentTabConfig?.entityName}?`}
                message={`Are you sure you want to permanently delete "${itemToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                type="danger"
            />
        </div>
    );
}
