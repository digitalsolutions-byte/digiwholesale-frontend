import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';

const ALLOWED_FIELDS = [
    { id: 'shopName', label: 'Shop Name' },
    { id: 'ownerName', label: 'Owner Name' },
    { id: 'CustomerType', label: 'Customer Type' },
    { id: 'orderMode', label: 'Order Mode' },
    { id: 'mobileNo1', label: 'Mobile No 1' },
    { id: 'mobileNo2', label: 'Mobile No 2' },
    { id: 'landlineNo', label: 'Landline No' },
    { id: 'emailId', label: 'Email ID' },
    { id: 'businessEmail', label: 'Business Email' },
    { id: 'address', label: 'Address' },
    { id: 'IsGSTRegistered', label: 'GST Registration Status' },
    { id: 'GSTNumber', label: 'GST Number' },
    { id: 'gstType', label: 'GST Type' },
    { id: 'GSTCertificateImg', label: 'GST Certificate Image' },
    { id: 'PANCard', label: 'PAN Card Number' },
    { id: 'AadharCard', label: 'Aadhar Card Number' },
    { id: 'PANCardImg', label: 'PAN Card Image' },
    { id: 'AadharCardImg', label: 'Aadhar Card Image' },
    { id: 'zone', label: 'Region/Zone' },
    { id: 'specificLab', label: 'Specific Lab' },
    { id: 'plant', label: 'Plant' },
    { id: 'fittingCenter', label: 'Fitting Center' },
    { id: 'creditDays', label: 'Credit Days' },
    { id: 'creditLimit', label: 'Credit Limit' },
    { id: 'courierName', label: 'Courier Name' },
    { id: 'courierTime', label: 'Courier Time' },
    { id: 'brandCategories', label: 'Brand Categories' },
    { id: 'salesPerson', label: 'Sales Person' }
];

const CorrectionRequestModal = ({ isOpen, onClose, onSubmit, customerName, loading, initialFields = [], showTargetRole = false }) => {
    const [selectedFields, setSelectedFields] = useState(initialFields);
    const [remark, setRemark] = useState('');
    const [targetRole, setTargetRole] = useState('Sales');

    React.useEffect(() => {
        if (isOpen && initialFields.length > 0) {
            setSelectedFields(initialFields);
        }
    }, [isOpen, initialFields]);

    if (!isOpen) return null;

    const toggleField = (fieldId) => {
        setSelectedFields(prev =>
            prev.includes(fieldId)
                ? prev.filter(id => id !== fieldId)
                : [...prev, fieldId]
        );
    };

    const handleSelectAll = () => {
        if (selectedFields.length === ALLOWED_FIELDS.length) {
            setSelectedFields([]);
        } else {
            setSelectedFields(ALLOWED_FIELDS.map(f => f.id));
        }
    };

    const handleSubmit = () => {
        if (!remark.trim()) {
            alert('Please provide a remark for the correction request');
            return;
        }
        onSubmit({ fieldsToCorrect: initialFields, remark, targetRole });
    };

    const formatFieldLabel = (fieldId) => {
        const field = ALLOWED_FIELDS.find(f => f.id === fieldId);
        if (field) return field.label;

        let label = fieldId.replace(/RefId$/, '')
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .replace(/^./, str => str.toUpperCase());

        if (fieldId.includes('.') || fieldId.includes('[')) {
            const parts = fieldId.split(/[.[\]]+/).filter(Boolean);
            if (parts[0] === 'address' && !isNaN(parts[1]) && parts[2]) {
                label = `Address ${parseInt(parts[1]) + 1} - ${parts[2].replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase())}`;
            } else if (parts[0] === 'brandCategories' && !isNaN(parts[1]) && parts[2]) {
                label = `Brand ${parseInt(parts[1]) + 1} - ${parts[2].replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase())}`;
            }
        }
        return label;
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 flex flex-col max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-5 flex items-start justify-between border-b border-gray-100 bg-gradient-to-r from-[#1F618D]/5 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#2980B9] flex items-center justify-center shadow-sm">
                            <Icon icon="mdi:comment-alert-outline" className="text-white text-xl" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-gray-800 uppercase tracking-wider">Send for Correction</h2>
                            <p className="text-gray-500 font-medium text-xs mt-0.5">Reviewing: <span className="text-[#2980B9] font-bold">{customerName}</span></p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors mt-0.5">
                        <Icon icon="mdi:close" className="text-lg text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-5 flex-1 overflow-y-auto custom-scrollbar space-y-5">
                    {/* Fields Marked */}
                    <div className="p-4 bg-red-50/60 rounded-xl border border-red-100">
                        <div className="flex items-center gap-2 mb-3">
                            <Icon icon="mdi:alert-circle-outline" className="text-red-500 text-sm" />
                            <h3 className="text-[11px] font-black text-red-700 uppercase tracking-widest">Fields Marked for Correction</h3>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {initialFields.map((fieldId) => (
                                <span key={fieldId} className="px-2.5 py-1 bg-white border border-red-200 text-red-700 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                                    {formatFieldLabel(fieldId)}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Remark */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Icon icon="mdi:message-text-outline" className="text-gray-400 text-sm" />
                            Detailed Remark <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                            placeholder="Explain what needs to be corrected and why..."
                            className="w-full h-28 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 outline-none focus:border-[#2980B9] focus:bg-white focus:ring-2 focus:ring-[#2980B9]/10 transition-all resize-none placeholder:text-gray-300"
                        />
                    </div>

                    {/* Target Role (if applicable) */}
                    {showTargetRole && (
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                <Icon icon="mdi:account-switch-outline" className="text-gray-400 text-sm" />
                                Send Correction To
                            </label>
                            <div className="flex gap-2">
                                {['Sales', 'Finance'].map(role => (
                                    <button
                                        key={role}
                                        type="button"
                                        onClick={() => setTargetRole(role)}
                                        className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                                            targetRole === role
                                                ? 'bg-[#2980B9] text-white border-[#2980B9] shadow-sm'
                                                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        {role === 'Sales' ? 'Sales Executive' : 'Finance Team'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 flex items-center gap-3 border-t border-gray-100 bg-gray-50/50">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold uppercase tracking-wider hover:bg-white hover:border-gray-300 transition-all disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !remark.trim()}
                        className="flex-1 py-2.5 px-6 rounded-xl text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 bg-[#2980B9] hover:bg-[#1F618D] active:scale-[0.98] shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {loading && <Icon icon="mdi:loading" className="animate-spin text-base" />}
                        <Icon icon="mdi:send" className="text-sm" />
                        Send Correction Request
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CorrectionRequestModal;
