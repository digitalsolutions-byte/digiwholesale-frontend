import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Icon } from '@iconify/react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { FileUploadField } from './shared';
import { selectCurrentUser } from '../../store/slices/authSlice';

export const BusinessInformation = ({ formik, wrapInput, configs, isReadOnlyMode, isApprovalMode, handleFileUpload, uploading }) => {
    const reduxUser = useSelector(selectCurrentUser);
    const user = reduxUser ?? (() => {
        try { return JSON.parse(localStorage.getItem('user')); }
        catch { return null; }
    })();

    const deptName = (user?.Department?.name || user?.department || '').toUpperCase();
    const empType = (user?.EmployeeType || user?.role || '').toUpperCase();

    // Check if user is Admin, Accounts (Finance), or Customer Support
    const isAdmin = ['SUPERADMIN', 'ADMIN', 'PLATFORM_OWNER'].includes(empType);
    const isAccounts = ['FINANCE', 'F&A', 'F&A CFO', 'ACCOUNTING', 'ACCOUNTS'].some(d => deptName.includes(d));
    const isCustomerSupport = deptName.includes('CUSTOMER SUPPORT') || deptName.includes('SUPPORT');

    const canManualEditFinancials = isAdmin || isAccounts || isCustomerSupport;

    const hasExistingCheques = formik.values.chequeDetails?.some(c => c.chequeNumber || c.chequeImage);
    const hasExistingRemark = !!formik.values.chequeRemark?.trim();

    const hasBlankCheques = formik.values.hasBlankCheques !== undefined
        ? Boolean(formik.values.hasBlankCheques)
        : Boolean(hasExistingCheques || hasExistingRemark);

    const isChequeComplete = (c) => Boolean(c?.chequeNumber?.trim()) && Boolean(c?.chequeImage?.trim());
    const hasAll3Cheques = (formik.values.chequeDetails || []).length >= 3 &&
        [0, 1, 2].every(i => isChequeComplete(formik.values.chequeDetails?.[i]));
    const hasRemark = Boolean(formik.values.chequeRemark?.trim());
    const isRequirementSatisfied = hasAll3Cheques || hasRemark;

    const handleToggleBlankCheques = (active) => {
        if (isReadOnlyMode) return;
        formik.setFieldValue('hasBlankCheques', active);
        if (!active) {
            formik.setFieldValue('chequeRemark', '');
            formik.setFieldValue('chequeDetails', [
                { chequeImage: '', chequeNumber: '' },
                { chequeImage: '', chequeNumber: '' },
                { chequeImage: '', chequeNumber: '' }
            ]);
        }
    };

    useEffect(() => {
        // Auto-calculation only runs for Sales team; Admin, Accounts, and Customer Support can enter manually
        if (!isReadOnlyMode && !isApprovalMode && !canManualEditFinancials) {
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
    }, [formik.values.minSalesValue, formik.values.creditDaysRefId, configs.creditDays, isReadOnlyMode, isApprovalMode, canManualEditFinancials]);

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
                {wrapInput(Input, {
                    label: canManualEditFinancials ? 'Final Discount (%)' : 'Final Discount (%) (Auto-Calculated)',
                    name: 'finalDiscount',
                    placeholder: canManualEditFinancials ? 'Enter Final Discount' : 'Auto-Calculated',
                    type: 'number',
                    disabled: isReadOnlyMode ? true : !canManualEditFinancials,
                    className: (!canManualEditFinancials || isReadOnlyMode) ? 'bg-gray-100 text-gray-500' : ''
                })}
                {wrapInput(Input, { label: 'Proposed Discount (%)', name: 'proposedDiscount', placeholder: 'Enter Proposed Discount', type: 'number' })}
                {wrapInput(Input, {
                    label: canManualEditFinancials ? 'Credit Limit' : 'Credit Limit (Auto-Calculated)',
                    name: 'creditLimit',
                    placeholder: canManualEditFinancials ? 'Enter Credit Limit' : 'Auto-Calculated',
                    type: 'number',
                    disabled: isReadOnlyMode ? true : !canManualEditFinancials,
                    className: (!canManualEditFinancials || isReadOnlyMode) ? 'bg-gray-100 text-gray-500' : ''
                })}
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50/80 rounded-2xl border border-gray-200/80">
                    <div>
                        <h3 className="text-base font-bold text-gray-800 uppercase tracking-tight flex items-center gap-2">
                            <Icon icon="mdi:checkbook" className="text-erp-accent text-xl" /> Do you have blank cheques?
                        </h3>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                            {hasBlankCheques
                                ? (hasAll3Cheques
                                    ? 'All 3 blank cheques provided. You may optionally enter a remark.'
                                    : hasRemark
                                        ? 'Remark provided. (You can also provide blank cheques if available).'
                                        : 'Please fill all 3 blank cheques or provide a remark below.')
                                : 'Turn on if the customer provides blank cheques.'}
                        </p>
                    </div>

                    {/* Toggle Button */}
                    <button
                        type="button"
                        role="switch"
                        aria-checked={hasBlankCheques}
                        onClick={() => handleToggleBlankCheques(!hasBlankCheques)}
                        disabled={isReadOnlyMode}
                        className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all duration-200 select-none ${
                            hasBlankCheques
                                ? 'bg-blue-50/70 border-blue-200 text-[#2980B9]'
                                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                        } ${isReadOnlyMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                    >
                        <span className="text-xs font-bold uppercase tracking-wider">
                            {hasBlankCheques ? 'ON' : 'OFF'}
                        </span>
                        <div
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out ${
                                hasBlankCheques ? 'bg-[#2980B9]' : 'bg-gray-300'
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                                    hasBlankCheques ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </div>
                    </button>
                </div>

                {hasBlankCheques && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {(formik.values.chequeDetails || []).map((cheque, index) => (
                                <div key={index} className="p-4 bg-white rounded-xl border border-gray-200 space-y-3 shadow-sm">
                                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                                        <div className="w-6 h-6 rounded-full bg-[#2980B9] text-white text-[11px] font-black flex items-center justify-center">{index + 1}</div>
                                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Cheque {index + 1}</span>
                                        {isChequeComplete(cheque) ? (
                                            <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 flex items-center gap-1">
                                                <Icon icon="mdi:check-circle" className="text-xs" /> Complete
                                            </span>
                                        ) : (cheque?.chequeNumber?.trim() || cheque?.chequeImage?.trim()) ? (
                                            <span className="ml-auto text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60 flex items-center gap-1">
                                                <Icon icon="mdi:alert-circle-outline" className="text-xs" /> Incomplete
                                            </span>
                                        ) : null}
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

                        {/* Remark (Required if < 3 cheques provided, otherwise Optional) */}
                        <div className={`p-4 bg-white rounded-xl border transition-all duration-200 space-y-2 shadow-sm ${
                            !isRequirementSatisfied && formik.submitCount > 0 ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-200'
                        }`}>
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                    <Icon icon="mdi:comment-text-outline" className="text-erp-accent text-lg" />
                                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Cheque Remark</span>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                    hasAll3Cheques
                                        ? 'bg-gray-100 text-gray-500'
                                        : hasRemark
                                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60'
                                            : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                }`}>
                                    {hasAll3Cheques ? 'Optional' : hasRemark ? 'Requirement Met ✓' : 'Required if < 3 cheques'}
                                </span>
                            </div>
                            {wrapInput(Input, {
                                label: hasAll3Cheques ? 'Remark (Optional)' : 'Remark (Required if 3 cheques are not provided)*',
                                name: 'chequeRemark',
                                placeholder: hasAll3Cheques ? 'Enter optional remark for blank cheques' : 'Enter reason or remark for not submitting 3 blank cheques',
                                className: 'bg-white focus:bg-white transition-colors'
                            })}
                            {!isRequirementSatisfied && (
                                <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1.5 pt-1">
                                    <Icon icon="mdi:information-outline" className="text-sm flex-shrink-0" />
                                    Requirement: Either fill all 3 blank cheques (number and photo) or enter a remark.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};