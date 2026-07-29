import React, { useEffect } from 'react';
import { FieldArray } from 'formik';
import { Icon } from '@iconify/react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { BrandRow } from './BrandRow';
import { FileUploadField } from './shared';

export const BusinessInformation = ({ formik, wrapInput, configs, isReadOnlyMode, isApprovalMode, handleFileUpload, uploading }) => {

    useEffect(() => {
        if (!isReadOnlyMode && !isApprovalMode) {
            const minSales = Number(formik.values.minSalesValue) || 0;

            // Calculate Final Discount Percent
            let newDiscount = 0;
            if (minSales >= 1000) {
                newDiscount = Math.min(20, (minSales / 1000) * 0.5);
            }
            if (formik.values.finalDiscount !== newDiscount) {
                formik.setFieldValue('finalDiscount', newDiscount);
            }

            // Calculate Credit Limit
            let newCreditLimit = 0;
            const creditDaysObj = (configs.creditDays || []).find(d => d._id === formik.values.creditDaysRefId);
            if (minSales > 0 && creditDaysObj) {
                const days = Number(creditDaysObj.days) || 0;
                newCreditLimit = minSales * ((days + 30) / 30);
            }
            if (formik.values.creditLimit !== newCreditLimit) {
                formik.setFieldValue('creditLimit', newCreditLimit);
            }
        }
    }, [formik.values.minSalesValue, formik.values.creditDaysRefId, configs.creditDays, isReadOnlyMode, isApprovalMode]);

    return (
        <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                {wrapInput(Select, {
                    label: 'Business Category*',
                    name: 'businessTypeRefId',
                    options: (configs.businessTypes || []).map(b => ({ value: b._id, label: b.name }))
                })}
                {wrapInput(Input, { label: 'Min. Sales Value (/Month sales)', name: 'minSalesValue', placeholder: 'Enter Min Sales Value', type: 'number' })}
                {wrapInput(Input, { label: 'Currently Dealt Brands', name: 'currentlyDealtBrands', placeholder: 'E.g., Lenskart, Titan, etc.' })}
                
                {/* Brand Selection Multi-Select */}
                <div className="col-span-1 md:col-span-2 bg-gray-50/60 p-5 rounded-xl border border-gray-200 space-y-3">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Assigned Brands*</span>
                    <Select
                        label="Select Brand to Add"
                        name="brandSelect"
                        placeholder="Choose Brand..."
                        disabled={isReadOnlyMode}
                        options={(configs.brands || [])
                            .filter(b => !(formik.values.brands || []).some(sb => sb.brandId === b._id))
                            .map(b => ({ value: b._id, label: b.name }))}
                        onChange={(e) => {
                            const brandId = e.target.value;
                            if (!brandId) return;
                            const brand = (configs.brands || []).find(b => b._id === brandId);
                            if (brand) {
                                const currentBrands = formik.values.brands || [];
                                formik.setFieldValue('brands', [
                                    ...currentBrands,
                                    { brandId: brand._id, brandName: brand.name }
                                ]);
                            }
                            e.target.value = '';
                        }}
                    />

                    {/* Selected Brands Chips */}
                    <div className="flex flex-wrap gap-2 pt-1">
                        {(formik.values.brands || []).length > 0 ? (
                            formik.values.brands.map((b, index) => (
                                <div key={b.brandId || index} className="flex items-center gap-1.5 px-3 py-1 bg-[#2980B9] text-white rounded-md text-xs font-bold uppercase tracking-wider shadow-sm">
                                    <Icon icon="mdi:tag" className="text-sm" />
                                    <span>{b.brandName || b.name}</span>
                                    {!isReadOnlyMode && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const updated = (formik.values.brands || []).filter((_, i) => i !== index);
                                                formik.setFieldValue('brands', updated);
                                            }}
                                            className="hover:bg-white/20 p-0.5 rounded transition-colors ml-1"
                                        >
                                            <Icon icon="mdi:close" className="text-sm" />
                                        </button>
                                    )}
                                </div>
                            ))
                        ) : (
                            <span className="text-xs text-gray-400 font-medium italic">No brands assigned yet. Select brands from the dropdown above.</span>
                        )}
                    </div>
                </div>

                {wrapInput(Select, {
                    label: 'Credit Days*',
                    name: 'creditDaysRefId',
                    options: (configs.creditDays || []).map(d => ({ value: d._id, label: d.days?.toString() || '' }))
                })}
                {wrapInput(Input, { label: 'Final Discount (%)', name: 'finalDiscount', placeholder: 'Auto-Calculated', type: 'number', disabled: true, className: 'bg-gray-100 text-gray-500' })}
                {wrapInput(Input, { label: 'Proposed Discount (%)', name: 'proposedDiscount', placeholder: 'Enter Proposed Discount', type: 'number' })}
                {wrapInput(Input, { label: 'Credit Limit*', name: 'creditLimit', placeholder: 'Auto-Calculated', type: 'number', disabled: true, className: 'bg-gray-100 text-gray-500' })}
                {wrapInput(Select, {
                    label: 'Billing Mode*',
                    name: 'billingMode',
                    options: [
                        { value: 'Direct', label: 'Direct' },
                        { value: 'DC', label: 'DC' }
                    ]
                })}
                {formik.values.billingMode === 'DC' && wrapInput(Select, {
                    label: 'Billing Cycle*',
                    name: 'billingCycle',
                    options: [
                        { value: '7_days', label: '7 Days' },
                        { value: '15_days', label: '15 Days' },
                        { value: 'end_of_month', label: 'End of Month' }
                    ]
                })}
            </div>
            <div className="space-y-6 pt-6 border-t border-gray-100">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800 uppercase tracking-tight flex items-center gap-2">
                        <Icon icon="mdi:checkbook" className="text-erp-accent" /> 3 Blank Cheques
                    </h3>
                    <span className="text-xs text-gray-500 font-medium">Please provide 3 blank cheques or state the reason.</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {formik.values.chequeDetails.map((cheque, index) => (
                        <div key={index} className="p-4 bg-white rounded-xl border border-gray-200 space-y-3 shadow-sm">
                            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                                <div className="w-6 h-6 rounded-full bg-[#2980B9] text-white text-[11px] font-black flex items-center justify-center">{index + 1}</div>
                                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Cheque {index + 1}</span>
                            </div>
                            {wrapInput(Input, {
                                label: `Cheque ${index + 1} Number`,
                                name: `chequeDetails[${index}].chequeNumber`,
                                placeholder: `Cheque ${index + 1} No.`
                            })}
                            <FileUploadField
                                hideInput
                                enableCamera
                                label="Upload Cheque Photo"
                                name={`dummyChequeUpload${index}`}
                                placeholder="Upload Photo"
                                onFileChange={(e) => handleFileUpload(e, `chequeDetails[${index}].chequeImage`, `cheque${index}`)}
                                uploading={uploading?.[`cheque${index}`]}
                                currentValue={cheque.chequeImage}
                                formik={formik}
                                wrapInput={wrapInput}
                                imgFieldName={`chequeDetails[${index}].chequeImage`}
                                isReadOnlyMode={isReadOnlyMode}
                            />
                        </div>
                    ))}
                </div>

                <div className="pt-4">
                    {wrapInput(Input, {
                        label: 'Remark (If Cheques Not Submitted)',
                        name: 'chequeRemark',
                        placeholder: 'Enter reason for not submitting cheques',
                        className: 'bg-yellow-50 focus:bg-white transition-colors'
                    })}
                </div>
            </div>
        </div>
    );
};


