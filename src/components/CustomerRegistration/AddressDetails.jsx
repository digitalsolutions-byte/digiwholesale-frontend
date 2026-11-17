import React, { useEffect } from 'react';
import { FieldArray } from 'formik';
import { Icon } from '@iconify/react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';

export const AddressDetails = ({ formik, wrapInput, configs, isReadOnlyMode }) => {

    const handleCopyToShipTo = async () => {
        const billTo = formik.values.billToAddress;
        const currentShipList = formik.values.customerShipToDetails || [];
        const updatedList = currentShipList.length > 0
            ? currentShipList.map((addr, idx) => (idx === 0 ? { ...addr, ...billTo } : addr))
            : [{ ...billTo }];

        // Update with validation enabled so Formik state syncs immediately
        await formik.setFieldValue('customerShipToDetails', updatedList, true);

        // Immediately clear any stale errors for customerShipToDetails
        if (formik.errors?.customerShipToDetails) {
            const nextErrors = { ...formik.errors };
            delete nextErrors.customerShipToDetails;
            formik.setErrors(nextErrors);
        }
    };

    const renderAddressFields = (prefix, idx = null) => {
        const namePrefix = idx !== null ? `${prefix}[${idx}]` : prefix;

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 mt-4">
                {wrapInput(Input, {
                    label: "Branch Name*",
                    name: `${namePrefix}.branchName`,
                    placeholder: "Enter Branch Name"
                })}
                {wrapInput(Input, {
                    label: "Contact Person Name*",
                    name: `${namePrefix}.contactPerson`,
                    placeholder: "Enter Contact Person"
                })}
                {wrapInput(Input, {
                    label: "Contact Number*",
                    name: `${namePrefix}.contactNumber`,
                    placeholder: "Enter Contact Number",
                    maxLength: 10,
                    onChange: (e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        formik.setFieldValue(`${namePrefix}.contactNumber`, val);
                    }
                })}
                {wrapInput(Input, {
                    label: "Address (Street/Locality)*",
                    name: `${namePrefix}.address`,
                    placeholder: "Enter Full Address"
                })}
                {wrapInput(Input, {
                    label: "City*",
                    name: `${namePrefix}.city`,
                    placeholder: "Enter City"
                })}
                {wrapInput(Select, {
                    label: "State*",
                    name: `${namePrefix}.state`,
                    options: (Array.isArray(configs.states) ? configs.states : []).map(z => ({ value: z.name, label: z.name }))
                })}
                {wrapInput(Select, {
                    label: "Country*",
                    name: `${namePrefix}.country`,
                    options: [{ value: 'India', label: 'India' }]
                })}
                {wrapInput(Select, {
                    label: "Billing Currency*",
                    name: `${namePrefix}.billingCurrency`,
                    options: [{ value: 'INR', label: 'INR' }, { value: 'USD', label: 'USD' }]
                })}
                {wrapInput(Select, {
                    label: "Billing Mode*",
                    name: `${namePrefix}.billingMode`,
                    options: [{ value: 'Credit', label: 'Credit' }, { value: 'Advance', label: 'Advance' }]
                })}
                {wrapInput(Input, {
                    label: "Pincode*",
                    name: `${namePrefix}.zipCode`,
                    placeholder: "Enter Pincode",
                    maxLength: 6,
                    onChange: (e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        formik.setFieldValue(`${namePrefix}.zipCode`, val);
                    }
                })}
            </div>
        );
    };

    return (
        <div className="space-y-12">
            {/* Bill To Section */}
            <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-erp-accent font-bold text-lg">Bill To Address*</h3>
                </div>
                {renderAddressFields('billToAddress')}
            </div>

            <div className="w-full h-px bg-gray-200 my-8"></div>

            {/* Ship To Section */}
            <FieldArray name="customerShipToDetails">
                {({ push, remove }) => (
                    <div className="space-y-12">
                        {formik.values.customerShipToDetails.map((addr, index) => (
                            <div key={index} className="relative pt-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-erp-dark font-bold text-lg">Ship To Address {index + 1}*</h3>
                                    <div className="flex gap-4 items-center">
                                        {index === 0 && !isReadOnlyMode && (
                                            <button type="button" onClick={handleCopyToShipTo} className="text-erp-accent text-sm font-bold flex items-center gap-1 hover:underline">
                                                <Icon icon="mdi:content-copy" /> Copy from Bill To
                                            </button>
                                        )}
                                        {index > 0 && !isReadOnlyMode && (
                                            <button type="button" onClick={() => remove(index)} className="text-erp-danger text-sm font-bold flex items-center gap-1 hover:underline">
                                                <Icon icon="mdi:delete" /> Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {renderAddressFields('customerShipToDetails', index)}
                            </div>
                        ))}

                        {!isReadOnlyMode && (
                            <div className="flex justify-center mt-4">
                                <Button
                                    type="button"
                                    variant="outlined"
                                    onClick={() => push({
                                        branchName: '', contactPerson: '', contactNumber: '', address: '',
                                        city: '', state: '', country: 'India', zipCode: '',
                                        billingCurrency: 'INR', billingMode: 'Credit'
                                    })}
                                    className="text-erp-accent border border-erp-accent rounded-full px-10 py-3 flex items-center gap-2 w-fit hover:text-white hover:bg-erp-accent/80"
                                >
                                    <Icon icon="mdi:plus" /> Add Ship To Address
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </FieldArray>
        </div>
    );
};


