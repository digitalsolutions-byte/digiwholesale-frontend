import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import { getTenantById, updateTenant } from '../../services/tenantService';
import { uploadImage } from '../../services/bucketService';
import { PATHS } from '../../routes/paths';

const ALL_PAGES_LIST = [
    { key: 'DASHBOARD', permissions: ['VIEW_REPORTS'] },
    { key: 'NEW_ORDER', permissions: ['ADD_ORDER', 'UPDATE_ORDER'] },
    { key: 'ALL_ORDERS', permissions: ['UPDATE_ORDER', 'DELETE_ORDER', 'APPROVE_ORDER'] },
    { key: 'PENDING_ORDERS', permissions: ['UPDATE_ORDER'] },
    { key: 'REGISTER_CUSTOMER', permissions: ['ADD_CUSTOMER'] },
    { key: 'CUSTOMER_LIST', permissions: ['UPDATE_CUSTOMER', 'DELETE_CUSTOMER'] },
    { key: 'SHIP_TO', permissions: ['UPDATE_CUSTOMER'] },
    { key: 'APPROVALS', permissions: ['APPROVE_ORDER'] },
    { key: 'CORRECTIONS', permissions: ['UPDATE_ORDER'] },
    { key: 'RETURN_REFUND', permissions: ['UPDATE_ORDER'] },
    { key: 'EXCHANGE_REQUESTS', permissions: ['UPDATE_ORDER'] },
    { key: 'DRAFTS', permissions: ['ADD_DRAFT', 'UPDATE_DRAFT', 'DELETE_DRAFT'] },
    { key: 'DAILY_REPORT', permissions: ['VIEW_REPORTS', 'EXPORT_REPORTS'] },
    { key: 'MAIN_REPORT', permissions: ['VIEW_REPORTS', 'EXPORT_REPORTS'] },
    { key: 'ADD_REPAIR', permissions: ['ADD_REPAIR'] },
    { key: 'REPAIR_LIST', permissions: ['UPDATE_REPAIR', 'DELETE_REPAIR'] },
    { key: 'ADD_VENDOR', permissions: ['ADD_VENDOR'] },
    { key: 'VENDOR_LIST', permissions: ['UPDATE_VENDOR', 'DELETE_VENDOR'] },
    { key: 'INVENTORY', permissions: ['UPDATE_INVENTORY'] }
];

const PREMIUM_PAGES = ['DASHBOARD', 'NEW_ORDER', 'ALL_ORDERS', 'CUSTOMER_LIST', 'SHIP_TO', 'DRAFTS', 'DAILY_REPORT', 'INVENTORY'];

// Sleek Minimal Image & Document Upload Component
const FileUploadBox = ({ label, required, value, onChange, section, fieldName }) => {
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const res = await uploadImage(file);
            const uploadedUrl = res.data?.url || res.url || res.data || res;
            if (typeof uploadedUrl === 'string') {
                onChange(section, fieldName, uploadedUrl);
                toast.success(`${label} uploaded successfully!`);
            } else if (res.success && res.data) {
                const targetUrl = typeof res.data === 'string' ? res.data : res.data.url;
                onChange(section, fieldName, targetUrl);
                toast.success(`${label} uploaded successfully!`);
            }
        } catch (err) {
            console.error('File Upload Error:', err);
            toast.error(err.message || 'Failed to upload file.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>

            {value ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        {typeof value === 'string' && (value.endsWith('.pdf') || value.includes('pdf')) ? (
                            <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 font-bold shrink-0">
                                <Icon icon="lucide:file-text" className="text-lg" />
                            </div>
                        ) : (
                            <img
                                src={value}
                                alt={label}
                                className="w-9 h-9 object-cover rounded-lg border border-gray-200 shrink-0 bg-white"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                }}
                            />
                        )}
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                                <Icon icon="lucide:check-circle" className="text-emerald-600 text-sm shrink-0" />
                                <span className="truncate">{label} Uploaded</span>
                            </div>
                            <a
                                href={value}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-[#2980B9] font-medium hover:underline inline-flex items-center gap-1 mt-0.5"
                            >
                                <span>View File</span>
                                <Icon icon="lucide:external-link" className="text-[10px]" />
                            </a>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => onChange(section, fieldName, '')}
                        className="p-1.5 bg-white hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-lg transition-colors border border-gray-200 shrink-0"
                        title="Remove file"
                    >
                        <Icon icon="lucide:trash-2" className="text-sm" />
                    </button>
                </div>
            ) : (
                <label className="relative flex flex-col items-center justify-center p-3.5 border border-dashed border-gray-300 hover:border-[#2980B9] rounded-xl cursor-pointer bg-gray-50/50 hover:bg-gray-50 transition-all text-center group">
                    <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileChange}
                        disabled={uploading}
                        className="hidden"
                    />
                    {uploading ? (
                        <div className="flex items-center gap-2 text-xs font-semibold text-[#2980B9]">
                            <Icon icon="lucide:loader-2" className="animate-spin text-base" />
                            <span>Uploading file...</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-[#2980B9]/10 flex items-center justify-center text-gray-400 group-hover:text-[#2980B9] transition-colors">
                                <Icon icon="lucide:upload-cloud" className="text-base" />
                            </div>
                            <div className="text-left">
                                <div className="text-xs font-semibold text-gray-700 group-hover:text-[#2980B9]">Click to upload</div>
                                <div className="text-[10px] text-gray-400 font-medium">PNG, JPG, PDF up to 5MB</div>
                            </div>
                        </div>
                    )}
                </label>
            )}
        </div>
    );
};

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
            storeTiming: '10 AM – 8 PM',
            commissionPercentage: 5,
            expiryDate: '',
            emailApi: '',
            showAds: false,
            hasGST: true,
            hasAI: false,
            storeLogo: ''
        },
        owner: {
            ownerName: '',
            email: '',
            mobile: ''
        },
        loyalty: {
            rsPerPoint: 100,
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
                            storeTiming: t.storeInformation?.storeTiming || '10 AM – 8 PM',
                            commissionPercentage: t.storeInformation?.commissionPercentage ?? 5,
                            expiryDate: t.storeInformation?.expiryDate ? t.storeInformation.expiryDate.split('T')[0] : '',
                            emailApi: t.storeInformation?.emailApi || '',
                            showAds: !!t.storeInformation?.showAds,
                            hasGST: t.storeInformation?.hasGST ?? true,
                            hasAI: !!t.storeInformation?.hasAI,
                            storeLogo: t.storeInformation?.storeLogo || ''
                        },
                        owner: {
                            ownerName: t.owner?.ownerName || '',
                            email: t.owner?.email || '',
                            mobile: t.owner?.mobile || ''
                        },
                        loyalty: {
                            rsPerPoint: t.loyalty?.rsPerPoint ?? 100,
                            pointValue: t.loyalty?.pointValue ?? 0,
                            referPoints: t.loyalty?.referPoints ?? 0
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

    const handlePlanSelect = (plan) => {
        setFormData(prev => ({
            ...prev,
            subscription: {
                ...prev.subscription,
                planType: plan,
                selectedPages: plan === 'CUSTOM' ? prev.subscription.selectedPages : [],
                autoPermissions: plan === 'CUSTOM' ? prev.subscription.autoPermissions : []
            }
        }));
    };

    const togglePageCustom = (pageKey) => {
        setFormData(prev => {
            const currentSelected = prev.subscription.selectedPages || [];
            const currentAuto = prev.subscription.autoPermissions || [];

            const exists = currentSelected.includes(pageKey);
            const newPages = exists
                ? currentSelected.filter(p => p !== pageKey)
                : [...currentSelected, pageKey];

            const target = ALL_PAGES_LIST.find(p => p.key === pageKey);
            let newPerms = [...currentAuto];
            if (target && target.permissions) {
                if (exists) {
                    newPerms = newPerms.filter(pm => !target.permissions.includes(pm));
                } else {
                    target.permissions.forEach(pm => {
                        if (!newPerms.includes(pm)) newPerms.push(pm);
                    });
                }
            }

            return {
                ...prev,
                subscription: {
                    ...prev.subscription,
                    selectedPages: newPages,
                    autoPermissions: newPerms
                }
            };
        });
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
                    <Icon icon="lucide:loader-2" className="animate-spin text-4xl text-[#2980B9]" />
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
                <button onClick={() => navigate(-1)} className="mt-4 text-[#2980B9] font-bold hover:underline">Go Back</button>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#2980B9] shadow-inner">
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
                        <Icon icon="lucide:store" className="text-[#2980B9] text-lg" />
                        Store Information
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Store Name *</label>
                            <input
                                type="text"
                                required
                                value={formData.storeInformation.storeName}
                                onChange={(e) => handleNestedChange('storeInformation', 'storeName', e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[#2980B9]"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Address *</label>
                            <input
                                type="text"
                                required
                                value={formData.storeInformation.address}
                                onChange={(e) => handleNestedChange('storeInformation', 'address', e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[#2980B9]"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Store Timing</label>
                            <input
                                type="text"
                                value={formData.storeInformation.storeTiming}
                                onChange={(e) => handleNestedChange('storeInformation', 'storeTiming', e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[#2980B9]"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Commission %</label>
                            <input
                                type="number"
                                value={formData.storeInformation.commissionPercentage}
                                onChange={(e) => handleNestedChange('storeInformation', 'commissionPercentage', Number(e.target.value))}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[#2980B9]"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Expiry Date</label>
                            <input
                                type="date"
                                value={formData.storeInformation.expiryDate}
                                onChange={(e) => handleNestedChange('storeInformation', 'expiryDate', e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[#2980B9]"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Sender Email API</label>
                            <input
                                type="text"
                                placeholder="resend_api_key_xxx"
                                value={formData.storeInformation.emailApi}
                                onChange={(e) => handleNestedChange('storeInformation', 'emailApi', e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[#2980B9]"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <FileUploadBox
                                label="Store Logo"
                                value={formData.storeInformation.storeLogo}
                                onChange={handleNestedChange}
                                section="storeInformation"
                                fieldName="storeLogo"
                            />
                        </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.storeInformation.hasGST}
                                onChange={(e) => handleNestedChange('storeInformation', 'hasGST', e.target.checked)}
                                className="w-4 h-4 rounded text-[#2980B9] focus:ring-[#2980B9]"
                            />
                            <span className="text-xs font-bold text-gray-700">GST Invoice Enabled</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.storeInformation.showAds}
                                onChange={(e) => handleNestedChange('storeInformation', 'showAds', e.target.checked)}
                                className="w-4 h-4 rounded text-[#2980B9] focus:ring-[#2980B9]"
                            />
                            <span className="text-xs font-bold text-gray-700">Show Ads / Banner</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.storeInformation.hasAI}
                                onChange={(e) => handleNestedChange('storeInformation', 'hasAI', e.target.checked)}
                                className="w-4 h-4 rounded text-[#2980B9] focus:ring-[#2980B9]"
                            />
                            <span className="text-xs font-bold text-gray-700">AI Features Enabled</span>
                        </label>
                    </div>
                </div>

                {/* Owner Information */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <h2 className="text-sm font-black uppercase tracking-wider text-gray-700 flex items-center gap-2 border-b pb-3 border-gray-100">
                        <Icon icon="lucide:user" className="text-[#2980B9] text-lg" />
                        Owner Contact Info
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Owner Name *</label>
                            <input
                                type="text"
                                required
                                value={formData.owner.ownerName}
                                onChange={(e) => handleNestedChange('owner', 'ownerName', e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[#2980B9]"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Owner Email *</label>
                            <input
                                type="email"
                                required
                                value={formData.owner.email}
                                onChange={(e) => handleNestedChange('owner', 'email', e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[#2980B9]"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Owner Mobile *</label>
                            <input
                                type="text"
                                required
                                value={formData.owner.mobile}
                                onChange={(e) => handleNestedChange('owner', 'mobile', e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[#2980B9]"
                            />
                        </div>
                    </div>
                </div>

                {/* Loyalty & Referral Program Rules */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <h2 className="text-sm font-black uppercase tracking-wider text-gray-700 flex items-center gap-2 border-b pb-3 border-gray-100">
                        <Icon icon="lucide:gift" className="text-[#2980B9] text-lg" />
                        Loyalty &amp; Referral Rules
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Spend Per 1 Point (₹)</label>
                            <input
                                type="number"
                                value={formData.loyalty.rsPerPoint}
                                onChange={(e) => handleNestedChange('loyalty', 'rsPerPoint', Number(e.target.value))}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[#2980B9]"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Point Redeem Value (₹)</label>
                            <input
                                type="number"
                                value={formData.loyalty.pointValue}
                                onChange={(e) => handleNestedChange('loyalty', 'pointValue', Number(e.target.value))}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[#2980B9]"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Referral Bonus Points</label>
                            <input
                                type="number"
                                value={formData.loyalty.referPoints}
                                onChange={(e) => handleNestedChange('loyalty', 'referPoints', Number(e.target.value))}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[#2980B9]"
                            />
                        </div>
                    </div>
                </div>

                {/* KYC & Documents */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <h2 className="text-sm font-black uppercase tracking-wider text-gray-700 flex items-center gap-2 border-b pb-3 border-gray-100">
                        <Icon icon="lucide:file-check" className="text-[#2980B9] text-lg" />
                        KYC &amp; Registration Documents
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FileUploadBox
                            label="GST Certificate"
                            value={formData.documents.gstCertificate}
                            onChange={handleNestedChange}
                            section="documents"
                            fieldName="gstCertificate"
                        />
                        <FileUploadBox
                            label="PAN Card"
                            value={formData.documents.panCard}
                            onChange={handleNestedChange}
                            section="documents"
                            fieldName="panCard"
                        />
                        <FileUploadBox
                            label="Aadhaar Card"
                            value={formData.documents.aadhaarCard}
                            onChange={handleNestedChange}
                            section="documents"
                            fieldName="aadhaarCard"
                        />
                    </div>
                </div>

                {/* Subscription & Plan Configuration */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <h2 className="text-sm font-black uppercase tracking-wider text-gray-700 flex items-center gap-2 border-b pb-3 border-gray-100">
                        <Icon icon="lucide:layers" className="text-[#2980B9] text-lg" />
                        Subscription Plan &amp; Page Permissions
                    </h2>

                    <div className="flex flex-wrap items-center gap-3">
                        {['PRO', 'PREMIUM', 'CUSTOM'].map((plan) => {
                            const isSelected = formData.subscription.planType === plan;
                            return (
                                <button
                                    key={plan}
                                    type="button"
                                    onClick={() => handlePlanSelect(plan)}
                                    className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all border ${
                                        isSelected
                                            ? 'bg-[#2980B9] text-white border-[#2980B9] shadow-md'
                                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                    }`}
                                >
                                    {plan === 'PRO' && 'PRO Plan (All Standard Pages)'}
                                    {plan === 'PREMIUM' && 'PREMIUM Plan (Core Pages)'}
                                    {plan === 'CUSTOM' && 'CUSTOM Plan (Select Specific Pages)'}
                                </button>
                            );
                        })}
                    </div>

                    {formData.subscription.planType === 'CUSTOM' && (
                        <div className="pt-4 border-t border-gray-100 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-600">Select Allowed Pages for CUSTOM Plan</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const allSelected = formData.subscription.selectedPages?.length === ALL_PAGES_LIST.length;
                                        setFormData(prev => ({
                                            ...prev,
                                            subscription: {
                                                ...prev.subscription,
                                                selectedPages: allSelected ? [] : ALL_PAGES_LIST.map(p => p.key)
                                            }
                                        }));
                                    }}
                                    className="text-xs font-bold text-[#2980B9] hover:underline"
                                >
                                    {formData.subscription.selectedPages?.length === ALL_PAGES_LIST.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                {ALL_PAGES_LIST.map((page) => {
                                    const checked = (formData.subscription.selectedPages || []).includes(page.key);
                                    return (
                                        <label key={page.key} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => togglePageCustom(page.key)}
                                                className="w-4 h-4 rounded text-[#2980B9] focus:ring-[#2980B9]"
                                            />
                                            <span className="text-xs font-semibold text-gray-700">{page.key}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* WhatsApp Integration Setup */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <h2 className="text-sm font-black uppercase tracking-wider text-gray-700 flex items-center gap-2 border-b pb-3 border-gray-100">
                        <Icon icon="lucide:message-square" className="text-[#2980B9] text-lg" />
                        WhatsApp Integration Setup
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Utility Messaging Provider</label>
                            <select
                                value={formData.whatsappConfig.utilityProvider}
                                onChange={(e) => handleNestedChange('whatsappConfig', 'utilityProvider', e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[#2980B9]"
                            >
                                <option value="META">Meta Official API</option>
                                <option value="TWILIO">Twilio API</option>
                                <option value="OTHER">Other Provider</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Promotional Messaging Provider</label>
                            <select
                                value={formData.whatsappConfig.promotionProvider}
                                onChange={(e) => handleNestedChange('whatsappConfig', 'promotionProvider', e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[#2980B9]"
                            >
                                <option value="META">Meta Official API</option>
                                <option value="TWILIO">Twilio API</option>
                                <option value="OTHER">Other Provider</option>
                            </select>
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
                        className="flex items-center gap-2 px-8 py-3 text-xs font-black uppercase tracking-wider text-white bg-[#2980B9] hover:bg-[#2471A3] active:scale-95 disabled:opacity-50 rounded-xl shadow-md transition-all"
                    >
                        {submitting ? <Icon icon="lucide:loader-2" className="animate-spin text-base" /> : <Icon icon="lucide:save" className="text-base" />}
                        <span>{submitting ? 'Saving...' : 'Save Wholesaler Changes'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
