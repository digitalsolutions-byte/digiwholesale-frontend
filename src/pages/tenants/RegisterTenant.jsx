import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import { registerTenant } from '../../services/tenantService';
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
const FileUploadBox = ({ label, required, value, onChange, fieldName }) => {
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const res = await uploadImage(file);
            const uploadedUrl = res.data?.url || res.url || res.data || res;
            if (typeof uploadedUrl === 'string') {
                onChange(fieldName, uploadedUrl);
                toast.success(`${label} uploaded successfully!`);
            } else if (res.success && res.data) {
                const targetUrl = typeof res.data === 'string' ? res.data : res.data.url;
                onChange(fieldName, targetUrl);
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
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>

            {value ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        {typeof value === 'string' && (value.endsWith('.pdf') || value.includes('pdf')) ? (
                            <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 font-bold shrink-0">
                                <Icon icon="lucide:file-text" className="text-lg" />
                            </div>
                        ) : (
                            <img
                                src={value}
                                alt={label}
                                className="w-9 h-9 object-cover rounded-lg border border-slate-200 shrink-0 bg-white"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                }}
                            />
                        )}
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
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
                        onClick={() => onChange(fieldName, '')}
                        className="p-1.5 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors border border-slate-200 shrink-0"
                        title="Remove file"
                    >
                        <Icon icon="lucide:trash-2" className="text-sm" />
                    </button>
                </div>
            ) : (
                <label className="relative flex flex-col items-center justify-center p-3.5 border border-dashed border-slate-300 hover:border-[#2980B9] rounded-xl cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-all text-center group">
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
                            <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-[#2980B9]/10 flex items-center justify-center text-slate-400 group-hover:text-[#2980B9] transition-colors">
                                <Icon icon="lucide:upload-cloud" className="text-base" />
                            </div>
                            <div className="text-left">
                                <div className="text-xs font-semibold text-slate-700 group-hover:text-[#2980B9]">Click to upload</div>
                                <div className="text-[10px] text-slate-400 font-medium">PNG, JPG, PDF up to 5MB</div>
                            </div>
                        </div>
                    )}
                </label>
            )}
        </div>
    );
};

export default function RegisterTenant() {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        // Store Information
        storeName: '',
        address: '',
        storeTiming: '10 AM – 8 PM',
        commissionPercentage: 5,
        expiryDate: '2027-12-31',
        emailApi: '',
        showAds: false,
        hasGST: true,
        hasAI: false,
        storeLogo: '',

        // Owner Details
        ownerName: '',
        email: '',
        mobile: '',
        password: '',

        // Loyalty & Referral
        rsPerPoint: 100,
        pointValue: 0,
        referPoints: 0,

        // Documents
        gstCertificate: '',
        panCard: '',
        aadhaarCard: '',

        // Subscription
        planType: 'PRO', // PRO, PREMIUM, CUSTOM
        selectedPages: [],
        autoPermissions: [],

        // WhatsApp Config
        utilityProvider: 'META',
        promotionProvider: 'META'
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleFileFieldChange = (fieldName, url) => {
        setFormData(prev => ({
            ...prev,
            [fieldName]: url
        }));
    };

    const handlePlanSelect = (plan) => {
        setFormData(prev => ({
            ...prev,
            planType: plan,
            selectedPages: plan === 'CUSTOM' ? prev.selectedPages : [],
            autoPermissions: plan === 'CUSTOM' ? prev.autoPermissions : []
        }));
    };

    const togglePageCustom = (pageKey) => {
        setFormData(prev => {
            const exists = prev.selectedPages.includes(pageKey);
            const newPages = exists
                ? prev.selectedPages.filter(p => p !== pageKey)
                : [...prev.selectedPages, pageKey];

            // Auto permission sync
            const target = ALL_PAGES_LIST.find(p => p.key === pageKey);
            let newPerms = [...prev.autoPermissions];
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
                selectedPages: newPages,
                autoPermissions: newPerms
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.storeName || !formData.address || !formData.ownerName || !formData.email || !formData.mobile || !formData.password) {
            toast.error('Please fill in all required Wholesaler and Owner details.');
            return;
        }

        if (!formData.gstCertificate && !formData.panCard && !formData.aadhaarCard && !formData.storeLogo) {
            toast.error('Please upload at least one document or logo (GST, PAN, or Aadhaar Card).');
            return;
        }

        if (formData.planType === 'CUSTOM' && formData.selectedPages.length === 0) {
            toast.error('Please select at least one page for the CUSTOM plan.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await registerTenant(formData);
            if (res.success) {
                toast.success(res.message || 'Wholesaler created successfully!');
                navigate(PATHS.TENANTS.LIST);
            }
        } catch (error) {
            console.error('Create Wholesaler Error:', error);
            toast.error(error.message || error.error?.message || 'Failed to create wholesaler.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200 font-sans">
            {/* Header & Breadcrumb */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 tracking-tight">Create Wholesaler</h1>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mt-0.5">
                        <span className="hover:text-slate-600 cursor-pointer" onClick={() => navigate(PATHS.ROOT)}>Home</span>
                        <span>/</span>
                        <span className="hover:text-slate-600 cursor-pointer" onClick={() => navigate(PATHS.TENANTS.LIST)}>Wholesalers</span>
                        <span>/</span>
                        <span className="text-[#2980B9] font-semibold">Create</span>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => navigate(PATHS.TENANTS.LIST)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all"
                >
                    <Icon icon="lucide:arrow-left" className="text-sm" /> Wholesaler List
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* TOP SECTION: Wholesaler Info & Owner Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* 1. Wholesaler Information Card */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2.5">
                                <Icon icon="lucide:building-2" className="text-[#2980B9] text-xl" />
                                <h2 className="text-sm font-bold text-slate-800">Wholesaler Information</h2>
                            </div>
                            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-semibold uppercase">Required</span>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">WHOLESALER NAME *</label>
                                <input
                                    type="text"
                                    name="storeName"
                                    value={formData.storeName}
                                    onChange={handleChange}
                                    placeholder="e.g. Vision Care Optics"
                                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#2980B9] focus:bg-white transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">ADDRESS *</label>
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="Full business address"
                                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#2980B9] focus:bg-white transition-all"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">TIMINGS *</label>
                                    <input
                                        type="text"
                                        name="storeTiming"
                                        value={formData.storeTiming}
                                        onChange={handleChange}
                                        placeholder="10 AM – 8 PM"
                                        className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#2980B9] focus:bg-white transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">COMMISSION (%) *</label>
                                    <input
                                        type="number"
                                        name="commissionPercentage"
                                        value={formData.commissionPercentage}
                                        onChange={handleChange}
                                        min="0"
                                        max="100"
                                        placeholder="% 0"
                                        className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#2980B9] focus:bg-white transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">EXPIRY DATE *</label>
                                <input
                                    type="date"
                                    name="expiryDate"
                                    value={formData.expiryDate}
                                    onChange={handleChange}
                                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#2980B9] focus:bg-white transition-all cursor-pointer"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">EMAIL API KEY</label>
                                <input
                                    type="text"
                                    name="emailApi"
                                    value={formData.emailApi}
                                    onChange={handleChange}
                                    placeholder="API Integration Key..."
                                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#2980B9] focus:bg-white transition-all"
                                />
                            </div>

                            {/* Options */}
                            <div className="flex items-center gap-6 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        name="showAds"
                                        checked={formData.showAds}
                                        onChange={handleChange}
                                        className="w-4 h-4 rounded border-slate-300 text-[#2980B9] focus:ring-0"
                                    />
                                    <span className="text-xs font-medium text-slate-700">Show Ads</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        name="hasGST"
                                        checked={formData.hasGST}
                                        onChange={handleChange}
                                        className="w-4 h-4 rounded border-slate-300 text-[#2980B9] focus:ring-0"
                                    />
                                    <span className="text-xs font-medium text-slate-700">Has GST</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        name="hasAI"
                                        checked={formData.hasAI}
                                        onChange={handleChange}
                                        className="w-4 h-4 rounded border-slate-300 text-[#2980B9] focus:ring-0"
                                    />
                                    <span className="text-xs font-medium text-slate-700">Has AI</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* 2. Owner & Login Details Card */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-5 flex flex-col justify-between">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-2.5">
                                    <Icon icon="lucide:user" className="text-[#2980B9] text-xl" />
                                    <h2 className="text-sm font-bold text-slate-800">Owner & Account Details</h2>
                                </div>
                                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-semibold uppercase">Required</span>
                            </div>

                            <div>
                                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">OWNER NAME *</label>
                                <input
                                    type="text"
                                    name="ownerName"
                                    value={formData.ownerName}
                                    onChange={handleChange}
                                    placeholder="Full name"
                                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#2980B9] focus:bg-white transition-all"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">EMAIL *</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="owner@domain.com"
                                        className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#2980B9] focus:bg-white transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">MOBILE *</label>
                                    <input
                                        type="text"
                                        name="mobile"
                                        value={formData.mobile}
                                        onChange={handleChange}
                                        placeholder="10-digit mobile"
                                        className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#2980B9] focus:bg-white transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">PASSWORD *</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Initial account password"
                                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#2980B9] focus:bg-white transition-all"
                                    required
                                />
                            </div>
                        </div>

                        {/* Loyalty & Referral Sub-card */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 mt-2">
                            <div className="flex items-center gap-2">
                                <Icon icon="lucide:star" className="text-[#2980B9] text-sm" />
                                <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">LOYALTY & REFERRAL</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">RS / POINT</label>
                                    <input
                                        type="number"
                                        name="rsPerPoint"
                                        value={formData.rsPerPoint}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none text-center"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">POINT VALUE</label>
                                    <input
                                        type="number"
                                        name="pointValue"
                                        value={formData.pointValue}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none text-center"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">REFER PTS</label>
                                    <input
                                        type="number"
                                        name="referPoints"
                                        value={formData.referPoints}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none text-center"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* BOTTOM SECTION: Documents, Plan Cards & WhatsApp Config */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* 3. Logo & Documents */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                            <Icon icon="lucide:image" className="text-[#2980B9] text-xl" />
                            <h2 className="text-sm font-bold text-slate-800">Logo & Documents</h2>
                        </div>

                        {/* Store Logo */}
                        <FileUploadBox
                            label="STORE LOGO"
                            value={formData.storeLogo}
                            onChange={handleFileFieldChange}
                            fieldName="storeLogo"
                        />

                        {/* GST Cert */}
                        <FileUploadBox
                            label="GST CERTIFICATE"
                            required
                            value={formData.gstCertificate}
                            onChange={handleFileFieldChange}
                            fieldName="gstCertificate"
                        />

                        {/* PAN Card */}
                        <FileUploadBox
                            label="PAN CARD"
                            required
                            value={formData.panCard}
                            onChange={handleFileFieldChange}
                            fieldName="panCard"
                        />

                        {/* Aadhaar Card */}
                        <FileUploadBox
                            label="AADHAR CARD"
                            required
                            value={formData.aadhaarCard}
                            onChange={handleFileFieldChange}
                            fieldName="aadhaarCard"
                        />

                        <p className="text-[10px] text-slate-400 font-medium pt-1">
                            * At least one of GST / PAN / Aadhar required
                        </p>
                    </div>

                    {/* 4. Pages & Subscription Variant */}
                    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2.5">
                                <Icon icon="lucide:shield-check" className="text-[#2980B9] text-xl" />
                                <h2 className="text-sm font-bold text-slate-800">Subscription Plan</h2>
                            </div>
                            <span className="px-2.5 py-0.5 bg-slate-100 text-[#2980B9] rounded-md text-[10px] font-bold uppercase">
                                {formData.planType}
                            </span>
                        </div>

                        {/* Variant Selection Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* PRO */}
                            <div
                                onClick={() => handlePlanSelect('PRO')}
                                className={`p-3.5 sm:p-4 rounded-xl cursor-pointer transition-all border flex sm:flex-col items-center justify-between sm:justify-center text-left sm:text-center gap-2 ${
                                    formData.planType === 'PRO'
                                        ? 'bg-[#2980B9] text-white border-[#2980B9] shadow-xs'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center sm:flex-col gap-2 sm:gap-1">
                                    <Icon icon="lucide:sparkles" className="text-xl sm:text-lg sm:mx-auto" />
                                    <div>
                                        <div className="text-xs font-bold uppercase tracking-wider">PRO</div>
                                        <div className="text-[10px] sm:text-[9px] opacity-80 font-medium">All features</div>
                                    </div>
                                </div>
                                <div className="text-xs sm:text-[10px] font-bold px-2 py-0.5 rounded bg-white/20 sm:bg-transparent">30 pages</div>
                            </div>

                            {/* PREMIUM */}
                            <div
                                onClick={() => handlePlanSelect('PREMIUM')}
                                className={`p-3.5 sm:p-4 rounded-xl cursor-pointer transition-all border flex sm:flex-col items-center justify-between sm:justify-center text-left sm:text-center gap-2 ${
                                    formData.planType === 'PREMIUM'
                                        ? 'bg-[#2980B9] text-white border-[#2980B9] shadow-xs'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center sm:flex-col gap-2 sm:gap-1">
                                    <Icon icon="lucide:settings" className="text-xl sm:text-lg sm:mx-auto" />
                                    <div>
                                        <div className="text-xs font-bold uppercase tracking-wider">PREMIUM</div>
                                        <div className="text-[10px] sm:text-[9px] opacity-80 font-medium">Core features</div>
                                    </div>
                                </div>
                                <div className="text-xs sm:text-[10px] font-bold px-2 py-0.5 rounded bg-white/20 sm:bg-transparent">11 pages</div>
                            </div>

                            {/* CUSTOM */}
                            <div
                                onClick={() => handlePlanSelect('CUSTOM')}
                                className={`p-3.5 sm:p-4 rounded-xl cursor-pointer transition-all border flex sm:flex-col items-center justify-between sm:justify-center text-left sm:text-center gap-2 ${
                                    formData.planType === 'CUSTOM'
                                        ? 'bg-[#2980B9] text-white border-[#2980B9] shadow-xs'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center sm:flex-col gap-2 sm:gap-1">
                                    <Icon icon="lucide:sliders" className="text-xl sm:text-lg sm:mx-auto" />
                                    <div>
                                        <div className="text-xs font-bold uppercase tracking-wider">CUSTOM</div>
                                        <div className="text-[10px] sm:text-[9px] opacity-80 font-medium">Hand-pick</div>
                                    </div>
                                </div>
                                <div className="text-xs sm:text-[10px] font-bold px-2 py-0.5 rounded bg-white/20 sm:bg-transparent">Custom</div>
                            </div>
                        </div>

                        {/* Included / Selection List */}
                        {formData.planType === 'CUSTOM' ? (
                            <div className="space-y-2 pt-2">
                                <div className="flex justify-between items-center text-[11px] font-semibold text-slate-500">
                                    <span>SELECT PAGES</span>
                                    <span className="text-[#2980B9] font-bold">{formData.selectedPages.length} selected</span>
                                </div>
                                <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                    {ALL_PAGES_LIST.map(p => {
                                        const checked = formData.selectedPages.includes(p.key);
                                        return (
                                            <div
                                                key={p.key}
                                                onClick={() => togglePageCustom(p.key)}
                                                className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                                                    checked ? 'bg-slate-100 border-[#2980B9]/40' : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 font-semibold text-slate-800">
                                                    <input type="checkbox" checked={checked} readOnly className="w-3.5 h-3.5 rounded text-[#2980B9]" />
                                                    <span>{p.key}</span>
                                                </div>
                                                {p.permissions && (
                                                    <div className="flex flex-wrap gap-1 mt-1 pl-5">
                                                        {p.permissions.map(pm => (
                                                            <span key={pm} className="text-[9px] px-1.5 py-0.5 bg-slate-200/70 text-slate-600 font-medium rounded">
                                                                {pm}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3 pt-2">
                                <div>
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1.5">INCLUDED PAGES</span>
                                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto custom-scrollbar p-1">
                                        {(formData.planType === 'PRO' ? ALL_PAGES_LIST.map(p => p.key) : PREMIUM_PAGES).map(p => (
                                            <span key={p} className="text-[10px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200/60 inline-flex items-center">
                                                {p}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1.5">AUTO PERMISSIONS</span>
                                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-1">
                                        {(formData.planType === 'PRO' ? ['ADD_ORDER', 'UPDATE_ORDER', 'DELETE_ORDER', 'APPROVE_ORDER', 'ADD_CUSTOMER', 'UPDATE_CUSTOMER', 'DELETE_CUSTOMER', 'VIEW_REPORTS', 'EXPORT_REPORTS'] : ['ADD_ORDER', 'UPDATE_ORDER', 'VIEW_REPORTS']).map(pm => (
                                            <span key={pm} className="text-[10px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200/60 inline-flex items-center">
                                                {pm}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 5. WhatsApp Config */}
                    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-xs space-y-5">
                        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                            <Icon icon="lucide:message-square" className="text-[#2980B9] text-xl" />
                            <h2 className="text-sm font-bold text-slate-800">WhatsApp Integration</h2>
                        </div>

                        {/* Utility Messages Provider */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase block">UTILITY MESSAGES PROVIDER</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData(p => ({ ...p, utilityProvider: 'META' }))}
                                    className={`py-3 px-3 rounded-xl font-semibold text-xs uppercase flex items-center justify-center gap-2 transition-all ${
                                        formData.utilityProvider === 'META'
                                            ? 'bg-[#2980B9] text-white shadow-xs'
                                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    <Icon icon="logos:whatsapp-icon" className="text-sm flex-shrink-0" />
                                    <span>META</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFormData(p => ({ ...p, utilityProvider: 'NON_META' }))}
                                    className={`py-3 px-3 rounded-xl font-semibold text-xs uppercase flex items-center justify-center gap-2 transition-all ${
                                        formData.utilityProvider === 'NON_META'
                                            ? 'bg-[#2980B9] text-white shadow-xs'
                                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    <Icon icon="lucide:link" className="text-sm flex-shrink-0" />
                                    <span>NON_META</span>
                                </button>
                            </div>
                        </div>

                        {/* Promotion Messages Provider */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase block">PROMOTION MESSAGES PROVIDER</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData(p => ({ ...p, promotionProvider: 'META' }))}
                                    className={`py-3 px-3 rounded-xl font-semibold text-xs uppercase flex items-center justify-center gap-2 transition-all ${
                                        formData.promotionProvider === 'META'
                                            ? 'bg-[#2980B9] text-white shadow-xs'
                                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    <Icon icon="logos:whatsapp-icon" className="text-sm flex-shrink-0" />
                                    <span>META</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFormData(p => ({ ...p, promotionProvider: 'NON_META' }))}
                                    className={`py-3 px-3 rounded-xl font-semibold text-xs uppercase flex items-center justify-center gap-2 transition-all ${
                                        formData.promotionProvider === 'NON_META'
                                            ? 'bg-[#2980B9] text-white shadow-xs'
                                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    <Icon icon="lucide:link" className="text-sm flex-shrink-0" />
                                    <span>NON_META</span>
                                </button>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Bottom Action Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                    <p className="text-xs text-slate-500 font-medium">
                        * Required fields must be completed before registering
                    </p>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 bg-[#2980B9] hover:bg-[#2471A3] text-white font-semibold text-xs rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50"
                    >
                        {submitting ? <Icon icon="lucide:loader-2" className="animate-spin text-base" /> : <Icon icon="lucide:check-circle" className="text-base" />}
                        <span>{submitting ? 'Registering...' : 'Create Wholesaler'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
