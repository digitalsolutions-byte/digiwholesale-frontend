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

    const deptName = (
        user?.Department?.name ||
        user?.department?.name ||
        user?.department ||
        user?.Department ||
        ''
    ).toString().toUpperCase();

    const empType = (
        user?.EmployeeType?.name ||
        user?.employeeType?.name ||
        user?.EmployeeType ||
        user?.employeeType ||
        user?.role ||
        ''
    ).toString().toUpperCase();

    // Check roles
    const isSuperAdminOrPlatformOwner = ['SUPERADMIN', 'PLATFORM_OWNER'].includes(empType);
    const isSalesTeam = deptName.includes('SALES') && !isSuperAdminOrPlatformOwner;
    const isAdmin = isSuperAdminOrPlatformOwner || empType === 'ADMIN' || deptName === 'ADMIN' || deptName.includes('ADMINISTRATION');
    const isAccounts = ['FINANCE', 'F&A', 'F&A CFO', 'ACCOUNTING', 'ACCOUNTS'].some(d => deptName.includes(d));
    const isCustomerSupport = deptName.includes('CUSTOMER SUPPORT') || deptName.includes('SUPPORT');

    // Admin, Accounts, or Customer Support ID can manually enter discount & credit limit; Sales team uses auto-calculation
    const canManualEditFinancials = (isAdmin || isAccounts || isCustomerSupport) && !isSalesTeam;

    const DEFAULT_NO_CHEQUE_REMARK = 'Customer does not have blank cheques.';

    const hasExistingCheques = formik.values.chequeDetails?.some(c => c.chequeNumber || c.chequeImage);

    const hasBlankCheques = formik.values.hasBlankCheques !== undefined
        ? Boolean(formik.values.hasBlankCheques)
        : Boolean(hasExistingCheques || !formik.values.chequeRemark);

    const isChequeComplete = (c) => Boolean(c?.chequeNumber?.trim()) && Boolean(c?.chequeImage?.trim());

    const handleToggleBlankCheques = (active) => {
        if (isReadOnlyMode) return;
        formik.setFieldValue('hasBlankCheques', active);
        if (!active) {
            if (!formik.values.chequeRemark || !formik.values.chequeRemark.trim()) {
                formik.setFieldValue('chequeRemark', DEFAULT_NO_CHEQUE_REMARK);
            }
            formik.setFieldValue('chequeDetails', [
                { chequeImage: '', chequeNumber: '' },
                { chequeImage: '', chequeNumber: '' },
                { chequeImage: '', chequeNumber: '' }
            ]);
        } else {
            if (formik.values.chequeRemark === DEFAULT_NO_CHEQUE_REMARK) {
                formik.setFieldValue('chequeRemark', '');
            }
        }
    };

    useEffect(() => {
        // Auto-calculation remains active for Sales team; Admin, Accounts, and Customer Support can enter manually
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
                {wrapInput(Input, {
                    label: 'Proposed Discount (%)',
                    name: 'proposedDiscount',
                    placeholder: 'Enter Proposed Discount',
                    type: 'number'
                })}
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
                                ? 'Please provide details and upload photos for up to 3 blank cheques.'
                                : 'Blank cheques are optional. An exemption remark has been recorded.'}
                        </p>
                    </div>

                    {/* Yes / No Toggle Pills */}
                    <div className="inline-flex items-center gap-1.5 bg-gray-200/80 p-1.5 rounded-xl border border-gray-300/60">
                        <label className={`flex items-center gap-1.5 px-3.5 py-1 rounded-lg cursor-pointer transition-all ${
                            hasBlankCheques
                                ? 'bg-white shadow-sm text-erp-accent font-bold'
                                : 'text-gray-600 font-medium hover:text-gray-900'
                        }`}>
                            <input
                                type="radio"
                                name="hasBlankChequesToggle"
                                value="yes"
                                checked={hasBlankCheques === true}
                                onChange={() => handleToggleBlankCheques(true)}
                                disabled={isReadOnlyMode}
                                className="w-3.5 h-3.5 accent-[#2980B9] cursor-pointer"
                            />
                            <span className="text-xs font-semibold">Yes</span>
                        </label>

                        <label className={`flex items-center gap-1.5 px-3.5 py-1 rounded-lg cursor-pointer transition-all ${
                            !hasBlankCheques
                                ? 'bg-white shadow-sm text-erp-accent font-bold'
                                : 'text-gray-600 font-medium hover:text-gray-900'
                        }`}>
                            <input
                                type="radio"
                                name="hasBlankChequesToggle"
                                value="no"
                                checked={hasBlankCheques === false}
                                onChange={() => handleToggleBlankCheques(false)}
                                disabled={isReadOnlyMode}
                                className="w-3.5 h-3.5 accent-[#2980B9] cursor-pointer"
                            />
                            <span className="text-xs font-semibold">No</span>
                        </label>
                    </div>
                </div>

                {hasBlankCheques ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {(formik.values.chequeDetails || []).map((cheque, index) => (
                                <div key={index} className="p-4 bg-white rounded-xl border border-gray-200 space-y-3 shadow-sm">
                                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                                        <div className="w-6 h-6 rounded-full bg-[#2980B9] text-white text-[11px] font-black flex items-center justify-center">{index + 1}</div>
                                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Cheque {index + 1}</span>
                                        {isChequeComplete(cheque) && (
                                            <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 flex items-center gap-1">
                                                <Icon icon="mdi:check-circle" className="text-xs" /> Complete
                                            </span>
                                        )}
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
                                        uploading={uploading?.[ `cheque${index}`]}
                                        currentValue={cheque.chequeImage}
                                        formik={formik}
                                        wrapInput={wrapInput}
                                        imgFieldName={`chequeDetails[${index}].chequeImage`}
                                        isReadOnlyMode={isReadOnlyMode}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Optional Remark while Yes is selected */}
                        <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-2 shadow-sm">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                    <Icon icon="mdi:comment-text-outline" className="text-erp-accent text-lg" />
                                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Remark (Optional)</span>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-gray-100 text-gray-500">
                                    Optional
                                </span>
                            </div>
                            {wrapInput(Input, {
                                label: 'Remark (Optional)',
                                name: 'chequeRemark',
                                placeholder: 'Enter reason or remark (optional)',
                                className: 'bg-white focus:bg-white transition-colors'
                            })}
                        </div>
                    </div>
                ) : (
                    /* When No is selected: Cheque cards hidden, Remark field autofilled */
                    <div className="p-5 bg-white rounded-xl border border-gray-200 space-y-3 shadow-sm">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <Icon icon="mdi:comment-text-outline" className="text-erp-accent text-lg" />
                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Cheque Exemption Remark / Reason</span>
                            </div>
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Autofilled
                            </span>
                        </div>
                        {wrapInput(Input, {
                            label: 'Remark / Reason',
                            name: 'chequeRemark',
                            placeholder: 'Enter reason or remark for not providing blank cheques',
                            className: 'bg-yellow-50/60 focus:bg-white transition-colors'
                        })}
                        <p className="text-[11px] text-gray-500 flex items-center gap-1.5 pt-0.5">
                            <Icon icon="mdi:information-outline" className="text-sm text-[#2980B9] flex-shrink-0" />
                            Blank cheques are optional. An exemption remark has been automatically filled above and can be edited if needed.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
