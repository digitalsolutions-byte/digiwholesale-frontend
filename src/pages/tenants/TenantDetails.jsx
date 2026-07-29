import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import { getTenantById, updateTenant } from '../../services/tenantService';
import { PATHS } from '../../routes/paths';

export default function TenantDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [tenant, setTenant] = useState(null);

    const [formData, setFormData] = useState({
        storeInformation: {
            storeName: '',
            address: '',
            storeTiming: '',
            commissionPercentage: 0,
            expiryDate: '',
            emailApi: '',
            showAds: false,
            hasGST: false,
            hasAI: false,
            storeLogo: ''
        },
        owner: {
            ownerName: '',
            email: '',
            mobile: ''
        },
        loyalty: {
            rsPerPoint: 0,
            pointValue: 0,
            referPoints: 0
        },
        documents: {
            gstCertificate: '',
            panCard: '',
            aadhaarCard: ''
        },
        subscription: {
            planType: 'PRO',
            expiresAt: '',
            isActive: true,
            selectedPages: [],
            autoPermissions: []
        },
        whatsappConfig: {
            utilityProvider: 'META',
            promotionProvider: 'META'
        }
    });

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            try {
                const res = await getTenantById(id);
                if (res.success && res.data?.tenant) {
                    const t = res.data.tenant;
                    setTenant(t);
                    setFormData({
                        storeInformation: {
                            storeName: t.storeInformation?.storeName || '',
                            address: t.storeInformation?.address || '',
                            storeTiming: t.storeInformation?.storeTiming || '',
                            commissionPercentage: t.storeInformation?.commissionPercentage || 0,
                            expiryDate: t.storeInformation?.expiryDate ? t.storeInformation.expiryDate.split('T')[0] : '',
                            emailApi: t.storeInformation?.emailApi || '',
                            showAds: !!t.storeInformation?.showAds,
                            hasGST: !!t.storeInformation?.hasGST,
                            hasAI: !!t.storeInformation?.hasAI,
                            storeLogo: t.storeInformation?.storeLogo || ''
                        },
                        owner: {
                            ownerName: t.owner?.ownerName || '',
                            email: t.owner?.email || '',
                            mobile: t.owner?.mobile || ''
                        },
                        loyalty: {
                            rsPerPoint: t.loyalty?.rsPerPoint || 0,
                            pointValue: t.loyalty?.pointValue || 0,
                            referPoints: t.loyalty?.referPoints || 0
                        },
                        documents: {
                            gstCertificate: t.documents?.gstCertificate || '',
                            panCard: t.documents?.panCard || '',
                            aadhaarCard: t.documents?.aadhaarCard || ''
                        },
                        subscription: {
                            planType: t.subscription?.planType || 'PRO',
                            expiresAt: t.subscription?.expiresAt ? t.subscription.expiresAt.split('T')[0] : '',
                            isActive: t.subscription?.isActive ?? true,
                            selectedPages: t.subscription?.selectedPages || [],
                            autoPermissions: t.subscription?.autoPermissions || []
                        },
                        whatsappConfig: {
                            utilityProvider: t.whatsappConfig?.utilityProvider || 'META',
                            promotionProvider: t.whatsappConfig?.promotionProvider || 'META'
                        }
                    });
                }
            } catch (error) {
                console.error('Error fetching tenant details:', error);
                toast.error(error.message || 'Failed to load tenant details.');
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id]);

    const handleNestedChange = (section, field, value) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await updateTenant(id, formData);
            if (res.success) {
                toast.success('Wholesaler tenant details updated successfully!');
                navigate(PATHS.TENANTS.LIST);
            }
        } catch (error) {
            console.error('Update Tenant Error:', error);
            toast.error(error.message || 'Failed to update tenant details.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[500px]">
                <div className="flex flex-col items-center gap-3">
                    <Icon icon="lucide:loader-2" className="animate-spin text-4xl text-erp-accent" />
                    <p className="text-sm font-semibold text-gray-500">Loading wholesaler profile...</p>
                </div>
            </div>
        );
    }

    if (!tenant) {
        return (
            <div className="p-12 text-center text-gray-500">
                <Icon icon="lucide:alert-circle" className="text-4xl text-gray-400 mx-auto mb-3" />
                <p>Wholesaler tenant record not found.</p>
                <button onClick={() => navigate(-1)} className="mt-4 text-erp-accent font-bold hover:underline">Go Back</button>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner">
                        <Icon icon="lucide:building" className="text-2xl" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-black text-gray-800 uppercase tracking-wide">{formData.storeInformation.storeName}</h1>
                            <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-100">
                                {tenant.tenantId}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">Wholesaler Tenant Settings & Plan Configuration</p>
                    </div>
                </div>
                <button
                    onClick={() => navigate(PATHS.TENANTS.LIST)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all"
                >
                    <Icon icon="lucide:arrow-left" className="text-base" /> Back to List
                </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-6">
                {/* Store Information */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <h2 className="text-sm font-black uppercase tracking-wider text-gray-700 flex items-center gap-2 border-b pb-3 border-gray-100">
                        <Icon icon="lucide:store" className="text-erp-accent text-lg" />
                        Store Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Store Name</label>
                            <input
                                type="text"
                                value={formData.storeInformation.storeName}
                                onChange={(e) => handleNestedChange('storeInformation', 'storeName', e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-erp-accent"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Address</label>
                            <input
                                type="text"
                                value={formData.storeInformation.address}
                                onChange={(e) => handleNestedChange('storeInformation', 'address', e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-erp-accent"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Store Timing</label>
                            <input
                                type="text"
                                value={formData.storeInformation.storeTiming}
                                onChange={(e) => handleNestedChange('storeInformation', 'storeTiming', e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-erp-accent"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Commission %</label>
                            <input
                                type="number"
                                value={formData.storeInformation.commissionPercentage}
                                onChange={(e) => handleNestedChange('storeInformation', 'commissionPercentage', Number(e.target.value))}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-erp-accent"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Expiry Date</label>
                            <input
                                type="date"
                                value={formData.storeInformation.expiryDate}
                                onChange={(e) => handleNestedChange('storeInformation', 'expiryDate', e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-erp-accent"
                            />
                        </div>
                    </div>
                </div>

                {/* Owner Information */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <h2 className="text-sm font-black uppercase tracking-wider text-gray-700 flex items-center gap-2 border-b pb-3 border-gray-100">
                        <Icon icon="lucide:user" className="text-erp-accent text-lg" />
                        Owner Contact Info
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Owner Name</label>
                            <input
                                type="text"
                                value={formData.owner.ownerName}
                                onChange={(e) => handleNestedChange('owner', 'ownerName', e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-erp-accent"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Owner Email</label>
                            <input
                                type="email"
                                value={formData.owner.email}
                                onChange={(e) => handleNestedChange('owner', 'email', e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-erp-accent"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Owner Mobile</label>
                            <input
                                type="text"
                                value={formData.owner.mobile}
                                onChange={(e) => handleNestedChange('owner', 'mobile', e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-erp-accent"
                            />
                        </div>
                    </div>
                </div>

                {/* Submit Controls */}
                <div className="flex justify-end gap-4 pt-4">
                    <button
                        type="button"
                        onClick={() => navigate(PATHS.TENANTS.LIST)}
                        className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center gap-2 px-8 py-3 text-xs font-black uppercase tracking-wider text-white bg-erp-accent hover:bg-erp-accent/90 active:scale-95 disabled:opacity-50 rounded-xl shadow-md transition-all"
                    >
                        {submitting ? <Icon icon="lucide:loader-2" className="animate-spin text-base" /> : <Icon icon="lucide:save" className="text-base" />}
                        <span>{submitting ? 'Saving...' : 'Save Wholesaler Changes'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
