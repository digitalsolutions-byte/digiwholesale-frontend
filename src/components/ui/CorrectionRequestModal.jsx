import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import Button from './Button';

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

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-8 pb-4 flex items-center justify-between border-b border-gray-50">
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Send for Correction</h2>
                        <p className="text-gray-500 font-medium text-sm mt-1">Reviewing: <span className="text-erp-accent font-bold">{customerName}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <Icon icon="mdi:close" className="text-2xl text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="mb-8 p-4 bg-erp-accent/5 rounded-2xl border border-erp-accent/10">
                        <h3 className="text-xs font-black text-amber-800 uppercase tracking-[0.1em] mb-3">Fields Marked for Correction:</h3>
                        <div className="flex flex-wrap gap-2">
                            {initialFields.map((fieldId) => {
                                const field = ALLOWED_FIELDS.find(f => f.id === fieldId);
                                let label = field ? field.label : fieldId;

                                if (!field) {
                                    // Strip RefId and format PascalCase/camelCase to labels
                                    label = fieldId.replace(/RefId$/, '')
                                        .replace(/([A-Z])/g, ' $1')
                                        .trim()
                                        .replace(/^./, str => str.toUpperCase());

                                    if (fieldId.includes('.') || fieldId.includes('[')) {
                                        // Handle both formats: address.0.branchAddress or address[0].branchAddress
                                        const parts = fieldId.split(/[.[\]]+/).filter(Boolean);
                                        if (parts[0] === 'address' && !isNaN(parts[1]) && parts[2]) {
                                            label = `Address ${parseInt(parts[1]) + 1} - ${parts[2].replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase())}`;
                                        } else if (parts[0] === 'brandCategories' && !isNaN(parts[1]) && parts[2]) {
                                            label = `Brand ${parseInt(parts[1]) + 1} - ${parts[2].replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase())}`;
                                        }
                                    }
                                }
                                return (
                                    <span key={fieldId} className="px-3 py-1 bg-white border border-amber-200 text-amber-700 text-xs font-bold rounded-lg shadow-sm">
                                        {label}
                                    </span>
                                )
                            })}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Detailed Remark</h3>
                        <textarea
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                            placeholder="Explain what needs to be corrected and why..."
                            className="w-full h-32 p-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] text-sm font-semibold text-gray-700 outline-none focus:border-amber-500/50 focus:bg-white focus:shadow-md transition-all resize-none placeholder:text-gray-300"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 pt-4 flex gap-4 border-t border-gray-50 bg-gray-50/30">
                    <Button
                        variant="outlined"
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-2xl border-gray-200 text-gray-500 hover:bg-white"
                    >
                        Cancel
                    </Button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !remark.trim()}
                        className={`w-full py-3.5 px-6 font-bold rounded-2xl text-white transition-all focus:outline-none flex items-center justify-center gap-2 bg-erp-accent/50 hover:bg-amber-600 shadow-lg shadow-amber-500/30 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed`}
                    >
                        {loading && <Icon icon="mdi:loading" className="animate-spin text-xl" />}
                        Send Request
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CorrectionRequestModal;


