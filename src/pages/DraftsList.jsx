import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import Button from '../components/ui/Button';
import { getMyDraftCustomers, deactivateDraftCustomer } from '../services/customerService';
import { getMyDraftEmployees, deactivateDraftEmployee } from '../services/employeeService';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { PATHS } from '../routes/paths';

const DraftsList = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('customers');
    const [drafts, setDrafts] = useState([]);

    const [loading, setLoading] = useState(false);
    const [selectedDraftForDeactivate, setSelectedDraftForDeactivate] = useState(null);
    const [deactivateLoading, setDeactivateLoading] = useState(false);

    const fetchDrafts = useCallback(async () => {
        setLoading(true);
        try {
            let response;
            if (activeTab === 'customers') {
                response = await getMyDraftCustomers(1, 50);
            } else {
                response = await getMyDraftEmployees(1, 50);
            }
            let data = [];
            if (activeTab === 'customers') {
                data = response?.data?.customers || response?.data || response || [];
            } else {
                data = response?.data?.users || response?.data || response || [];
            }

            setDrafts(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching drafts:', error);
            toast.error(`Failed to load ${activeTab} drafts`);
            setDrafts([]);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        fetchDrafts();
    }, [fetchDrafts]);

    const handleEditDraft = (draft) => {
        const draftId = draft._id;
        if (activeTab === 'customers') {
            navigate(`${PATHS.CUSTOMER.REGISTER}?step=0&draftId=${draftId}`);
        } else {
            navigate(`${PATHS.STAFF.REGISTER}?draftId=${draftId}`);
        }
    };

    const handleDeactivateClick = (draft) => {
        setSelectedDraftForDeactivate(draft);
    };

    const handleConfirmDeactivate = async () => {
        if (!selectedDraftForDeactivate) return;

        setDeactivateLoading(true);
        try {
            if (activeTab === 'customers') {
                await deactivateDraftCustomer(selectedDraftForDeactivate._id);
            } else {
                await deactivateDraftEmployee(selectedDraftForDeactivate._id);
            }
            toast.success(`${activeTab === 'customers' ? 'Customer' : 'Employee'} draft deactivated successfully`);
            await fetchDrafts();
        } catch (error) {
            console.error('Error deactivating draft:', error);
            toast.error(error.message || 'Failed to deactivate draft');
        } finally {
            setDeactivateLoading(false);
            setSelectedDraftForDeactivate(null);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3 uppercase tracking-tighter">
                        <Icon icon="mdi:file-edit-outline" className="text-erp-accent" />
                        Saved Drafts
                    </h1>
                    <p className="text-gray-500 font-medium">Manage and continue your pending registrations</p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-2xl w-fit">
                    <button
                        onClick={() => setActiveTab('customers')}
                        className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'customers'
                            ? 'bg-white text-erp-accent/80 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Customers
                    </button>
                    <button
                        onClick={() => setActiveTab('employees')}
                        className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'employees'
                            ? 'bg-white text-erp-accent/80 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Staff
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Icon icon="mdi:loading" className="text-5xl text-erp-accent animate-spin" />
                    <span className="text-gray-400 font-bold uppercase tracking-widest text-xs animate-pulse">Loading Drafts...</span>
                </div>
            ) : drafts.length === 0 ? (
                <div className="bg-white rounded-[40px] p-20 border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center gap-6 shadow-sm">
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center">
                        <Icon icon="mdi:file-search-outline" className="text-5xl text-gray-200" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-400 uppercase tracking-tight">No Drafts Found</h3>
                        <p className="text-gray-450 text-sm">You don't have any saved drafts in this category.</p>
                    </div>
                    <Button
                        variant="outlined"
                        onClick={() => navigate(activeTab === 'customers' ? PATHS.CUSTOMER.REGISTER : PATHS.STAFF.REGISTER)}
                        className="px-10 rounded-full"
                    >
                        Start New Registration
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {drafts.map((draft) => (
                        <div
                            key={draft._id}
                            className="bg-white/80 backdrop-blur-sm rounded-[32px] p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Icon
                                    icon={activeTab === 'customers' ? "mdi:store" : "mdi:account-badge-outline"}
                                    className="text-6xl text-erp-accent"
                                />
                            </div>

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="mb-4">
                                    <h3 className="text-lg font-black text-gray-800 truncate uppercase tracking-tight">
                                        {activeTab === 'customers'
                                            ? (draft.shopName || draft.data?.shopName || 'Untitled Shop')
                                            : (draft.employeeName || draft.data?.employeeName || 'Untitled Staff')
                                        }
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                                            {activeTab === 'customers' ? (draft.data?.businessType?.name || draft.data?.businessType || draft.data?.CustomerType || 'Customer') : 'Staff'}
                                        </span>
                                        <span className="text-gray-400 text-[10px] font-bold">
                                            Updated: {new Date(draft.updatedAt || draft.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-auto flex items-center justify-between pt-6 border-t border-gray-50">
                                    <div className="flex flex-col">
                                        <span className="text-gray-400 text-[10px] font-bold uppercase  ">Reference</span>
                                        <span className="text-gray-600 font-mono text-xs">{draft._id.slice(-8).toUpperCase()}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleDeactivateClick(draft)}
                                            className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                            title="Deactivate Draft"
                                        >
                                            <Icon icon="mdi:trash-can-outline" className="text-xl" />
                                        </button>
                                        <Button
                                            onClick={() => handleEditDraft(draft)}
                                            className="rounded-2xl max-w-[120px] px-6 py-2 group-hover:bg-erp-accent group-hover:scale-105 transition-all"
                                        >
                                            Continue
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ConfirmationModal
                isOpen={!!selectedDraftForDeactivate}
                onClose={() => setSelectedDraftForDeactivate(null)}
                onConfirm={handleConfirmDeactivate}
                loading={deactivateLoading}
                title="Deactivate Draft"
                message={`Are you sure you want to deactivate this ${activeTab === 'customers' ? 'customer' : 'employee'} draft? This action cannot be undone.`}
                confirmText="Deactivate"
                type="danger"
            />
        </div>
    );
};

export default DraftsList;


