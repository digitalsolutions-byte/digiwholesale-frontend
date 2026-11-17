import React from 'react';
import { FieldArray } from 'formik';
import { Icon } from '@iconify/react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { BrandRow } from './BrandRow';

export const CustomerRegn = ({ wrapInput, configs, formValues, formik, dispatch, isReadOnlyMode }) => {
    const noVerifyWrap = (Component, props) => wrapInput(Component, props, true);

    return (
        <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                <Input
                    label="Login Email (Prefilled)"
                    name="emailId"
                    value={formik.values.emailId}
                    disabled
                    className="bg-gray-50"
                />
                {noVerifyWrap(Input, { label: 'Password*', name: 'customerpassword', type: 'password', placeholder: 'Enter Password' })}
                {noVerifyWrap(Input, { label: 'Final Discount (%)', name: 'finalDiscount', placeholder: 'Enter Final Discount', type: 'number' })}
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800 uppercase tracking-tight flex items-center gap-2">
                        <Icon icon="mdi:tag-multiple" className="text-[#2980B9]" /> Brand Selection*
                    </h3>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                    <Select
                        label="Add Brand"
                        name="brandSelect"
                        placeholder="Select Brand to Add"
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
                    <div className="flex flex-wrap gap-2 pt-2">
                        {(formik.values.brands || []).length > 0 ? (
                            formik.values.brands.map((b, index) => (
                                <div key={b.brandId || index} className="flex items-center gap-2 px-3 py-1.5 bg-[#2980B9]/10 text-[#2980B9] border border-[#2980B9]/20 rounded-lg text-xs font-bold uppercase tracking-wider">
                                    <Icon icon="mdi:tag-outline" className="text-sm" />
                                    <span>{b.brandName || b.name}</span>
                                    {!isReadOnlyMode && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const updated = (formik.values.brands || []).filter((_, i) => i !== index);
                                                formik.setFieldValue('brands', updated);
                                            }}
                                            className="hover:bg-[#2980B9]/20 p-0.5 rounded-full transition-colors"
                                        >
                                            <Icon icon="mdi:close" className="text-sm" />
                                        </button>
                                    )}
                                </div>
                            ))
                        ) : (
                            <span className="text-xs text-gray-400 font-medium italic">No brands selected yet. Select brands from the dropdown above.</span>
                        )}
                    </div>
                </div>

                <FieldArray name="brandCategories">
                    {({ push, remove }) => (
                        <div className="space-y-4">
                            {formik.values.brandCategories.map((bc, index) => (
                                <BrandRow
                                    key={index}
                                    index={index}
                                    bc={bc}
                                    remove={remove}
                                    configs={configs}
                                    formik={formik}
                                    wrapInput={wrapInput}
                                    isReadOnlyMode={isReadOnlyMode}
                                />
                            ))}
                            {!isReadOnlyMode && (
                                <Button
                                    variant="outlined"
                                    onClick={() => push({ brandId: '', brandName: '', categories: [] })}
                                    className="bg-gray-50 border-dashed border-2 border-gray-200 text-gray-500 hover:border-[#2980B9] hover:text-[#2980B9] w-full py-4 rounded-2xl flex items-center justify-center gap-2"
                                >
                                    <Icon icon="mdi:plus-circle" /> Add Brand & Category Pair
                                </Button>
                            )}
                        </div>
                    )}
                </FieldArray>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                {noVerifyWrap(Select, {
                    label: 'Zone*',
                    name: 'zoneRefId',
                    options: (Array.isArray(configs.zones) ? configs.zones : []).map(z => ({ value: z._id, label: z.zone }))
                })}
                {noVerifyWrap(Select, {
                    label: 'Select Sales Person*',
                    name: 'salesPersonRefId',
                    options: (configs.salesPersons || []).map(s => ({ value: s._id, label: s.employeeName }))
                })}
                {noVerifyWrap(Select, {
                    label: 'Fitting Centre*',
                    name: 'fittingCenterRefId',
                    options: (configs.fittingCenters || []).map(f => ({ value: f._id, label: f.name }))
                })}
                {noVerifyWrap(Select, {
                    label: 'Plant*',
                    name: 'plantRefId',
                    options: (configs.plants || []).map(p => ({ value: p._id, label: p.name }))
                })}
                {noVerifyWrap(Input, { label: 'Credit Limit*', name: 'creditLimit', placeholder: 'Enter Limit' })}
                {noVerifyWrap(Select, {
                    label: 'Credit Days*',
                    name: 'creditDaysRefId',
                    options: (configs.creditDays || []).map(d => ({ value: d._id, label: d.days?.toString() || '' }))
                })}
                {noVerifyWrap(Select, {
                    label: 'Courier Name*',
                    name: 'courierNameRefId',
                    options: (configs.courierNames || []).map(n => ({ value: n._id, label: n.name }))
                })}
                {noVerifyWrap(Select, {
                    label: 'Courier Time*',
                    name: 'courierTimeRefId',
                    options: (configs.courierTimes || []).map(t => ({ value: t._id, label: t.time }))
                })}
            </div>
        </div>
    );
};


