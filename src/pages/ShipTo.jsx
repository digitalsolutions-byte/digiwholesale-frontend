import React, { useState, useEffect, useMemo } from 'react';
import { useFormik, FieldArray, FormikProvider } from 'formik';
import * as Yup from 'yup';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import SearchableSelect from '../components/ui/SearchableSelect';
import Select from '../components/ui/Select';
import {
    getAllCustomers,
    getCustomerById,
    updateShipToDetails,
    getCustomerConfigs
} from '../services/customerService';
import { getStatesByZone, getCitiesByState } from '../services/locationService';
import { useSearchParams } from 'react-router-dom';

const ShipTo = () => {
    const [searchParams] = useSearchParams();
    const urlCustomerId = searchParams.get('customerId');
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [configs, setConfigs] = useState({ states: [], billingCurrencies: [] });
    const [loading, setLoading] = useState(false);
    const [fetchingCustomer, setFetchingCustomer] = useState(false);
    const [initialLoadDone, setInitialLoadDone] = useState(false);

    // Effect to handle URL params
    useEffect(() => {
        if (initialLoadDone && urlCustomerId && urlCustomerId !== formik.values.customerId) {
            handleCustomerChange(urlCustomerId);
        }
    }, [initialLoadDone, urlCustomerId]);

    // Load initial data
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                const [custRes, configRes] = await Promise.all([
                    getAllCustomers(1, 1000), // Get a large list for search
                    getCustomerConfigs()
                ]);
                if (custRes.success) {
                    setCustomers(custRes.data.customers || []);
                }
                setConfigs(configRes);
            } catch (error) {
                console.error('Failed to load initial data:', error);
                toast.error('Failed to load customers list');
            } finally {
                setLoading(false);
                setInitialLoadDone(true);
            }
        };
        fetchInitialData();
    }, []);

    const formik = useFormik({
        initialValues: {
            customerId: '',
            shipToDetails: []
        },
        validationSchema: Yup.object({
            customerId: Yup.string().required('Please select a customer'),
            shipToDetails: Yup.array().of(
                Yup.object().shape({
                    branchName: Yup.string().required('Required'),
                    customerContactName: Yup.string().required('Required'),
                    customerContactNumber: Yup.string()
                        .matches(/^[0-9]{10}$/, 'Must be 10 digits')
                        .required('Required'),
                    address: Yup.string().required('Required'),
                    city: Yup.string().required('Required'),
                    state: Yup.string().required('Required'),
                    zipCode: Yup.string().required('Required'),
                })
            )
        }),
        onSubmit: async (values) => {
            try {
                const response = await updateShipToDetails(values.customerId, {
                    shipToDetails: values.shipToDetails
                });
                if (response.success) {
                    toast.success('Ship-to details updated successfully');
                    // Refresh data
                    handleCustomerChange(values.customerId);
                }
            } catch (error) {
                toast.error(error.message || 'Failed to update details');
            }
        }
    });

    const handleCustomerChange = async (customerId) => {
        if (!customerId) {
            setSelectedCustomer(null);
            formik.setFieldValue('shipToDetails', []);
            formik.setFieldValue('customerId', '');
            return;
        }

        setFetchingCustomer(true);
        formik.setFieldValue('customerId', customerId);
        try {
            const res = await getCustomerById(customerId);
            if (res.success) {
                const customer = res.data;
                setSelectedCustomer(customer);

                // Map existing ship-to details
                const existingShipTo = (customer.customerShipToDetails || []).map(addr => ({
                    _id: addr._id,
                    branchName: addr.branchName || '',
                    customerContactName: addr.customerContactName || addr.contactPerson || '',
                    customerContactNumber: addr.customerContactNumber || addr.contactNumber || '',
                    address: addr.address || '',
                    city: addr.city || '',
                    state: addr.state || '',
                    country: addr.country || 'India',
                    billingCurrency: addr.billingCurrency || 'INR',
                    billingMode: addr.billingMode || 'Credit',
                    zipCode: addr.zipCode || addr.pincode || '',
                }));

                formik.setFieldValue('shipToDetails', existingShipTo.length > 0 ? existingShipTo : [{
                    branchName: '',
                    customerContactName: '',
                    customerContactNumber: '',
                    address: '',
                    city: '',
                    state: '',
                    country: 'India',
                    billingCurrency: 'INR',
                    billingMode: 'Credit',
                    zipCode: '',
                }]);
            }
        } catch (error) {
            toast.error('Failed to fetch customer details');
        } finally {
            setFetchingCustomer(false);
        }
    };

    const handleCopyFromBillTo = () => {
        if (!selectedCustomer?.billToAddress) {
            toast.warning('No Bill-To address found for this customer');
            return;
        }
        const billTo = selectedCustomer.billToAddress;
        const newShipTo = {
            branchName: billTo.branchName || '',
            customerContactName: billTo.customerContactName || billTo.contactPerson || '',
            customerContactNumber: billTo.customerContactNumber || billTo.contactNumber || '',
            address: billTo.address || '',
            city: billTo.city || '',
            state: billTo.state || '',
            country: billTo.country || 'India',
            billingCurrency: billTo.billingCurrency || 'INR',
            billingMode: billTo.billingMode || 'Credit',
            zipCode: billTo.zipCode || billTo.pincode || '',
        };

        // Add to the list
        formik.setFieldValue('shipToDetails', [...formik.values.shipToDetails, newShipTo]);
        toast.info('Copied from Bill-To address');
    };

    const customerOptions = useMemo(() =>
        customers.map(c => ({
            value: c._id,
            label: `${c.shopName} (${c.customerCode || 'N/A'})`
        }))
        , [customers]);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* Header / Selection Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
                    <div className="flex-1 w-full">
                        <SearchableSelect
                            label="Select Customer"
                            name="customerId"
                            value={formik.values.customerId}
                            onChange={(e) => handleCustomerChange(e.target.value)}
                            options={customerOptions}
                            placeholder="Search by Shop Name or Code"
                            loading={loading}
                        />
                    </div>

                    {selectedCustomer && (
                        <div className="flex flex-wrap gap-6 bg-erp-accent/5 rounded-2xl p-4 border border-erp-accent/10 flex-1 w-full">
                            <div>
                                <p className="text-xs text-erp-accent/80 font-bold uppercase  ">Customer ID</p>
                                <p className="text-gray-900 font-semibold">{selectedCustomer.customerCode || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-erp-accent/80 font-bold uppercase  ">Shop Name</p>
                                <p className="text-gray-900 font-semibold">{selectedCustomer.shopName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-erp-accent/80 font-bold uppercase  ">Contact</p>
                                <p className="text-gray-900 font-semibold">{selectedCustomer.mobileNo1 || selectedCustomer.businessEmail}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {fetchingCustomer ? (
                <div className="flex justify-center py-20">
                    <Icon icon="mdi:loading" className="animate-spin text-4xl text-erp-accent" />
                </div>
            ) : selectedCustomer ? (
                <FormikProvider value={formik}>
                    <form onSubmit={formik.handleSubmit} className="space-y-8">
                        <FieldArray name="shipToDetails">
                            {({ push, remove }) => (
                                <div className="space-y-8">
                                    {formik.values.shipToDetails.map((addr, index) => (
                                        <div key={index} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-10 relative overflow-hidden">
                                            {/* Zebra Stripe/Accent */}
                                            <div className="absolute top-0 left-0 w-2 h-full bg-[#fef3c6]" />

                                            <div className="flex justify-between items-center mb-8">
                                                <h3 className="text-erp-accent font-bold text-xl flex items-center gap-2">
                                                    Ship To Address {index + 1}
                                                    {addr._id && <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full uppercase">Existing</span>}
                                                </h3>
                                                <div className="flex gap-4">
                                                    {/* {index === 0 && (
                                                        <button 
                                                            type="button" 
                                                            onClick={handleCopyFromBillTo}
                                                            className="text-blue-500 hover:text-blue-600 font-bold text-sm flex items-center gap-1 transition-colors"
                                                        >
                                                            <Icon icon="mdi:content-copy" className="text-lg" />
                                                            Copy from Bill To
                                                        </button>
                                                    )} */}
                                                    {formik.values.shipToDetails.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => remove(index)}
                                                            className="text-red-500 hover:text-red-600 font-bold text-sm flex items-center gap-1 transition-colors"
                                                        >
                                                            <Icon icon="mdi:delete-outline" className="text-lg" />
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-x-12 gap-y-8">
                                                <Input
                                                    label="Branch Name*"
                                                    name={`shipToDetails[${index}].branchName`}
                                                    value={addr.branchName}
                                                    onChange={formik.handleChange}
                                                    onBlur={formik.handleBlur}
                                                    placeholder="Enter Branch Name"
                                                    error={formik.touched.shipToDetails?.[index]?.branchName && formik.errors.shipToDetails?.[index]?.branchName ? { message: formik.errors.shipToDetails[index].branchName } : null}
                                                />
                                                <Input
                                                    label="Contact Person Name*"
                                                    name={`shipToDetails[${index}].customerContactName`}
                                                    value={addr.customerContactName}
                                                    onChange={formik.handleChange}
                                                    onBlur={formik.handleBlur}
                                                    placeholder="Enter Contact Person"
                                                    error={formik.touched.shipToDetails?.[index]?.customerContactName && formik.errors.shipToDetails?.[index]?.customerContactName ? { message: formik.errors.shipToDetails[index].customerContactName } : null}
                                                />
                                                <Input
                                                    label="Contact Number*"
                                                    name={`shipToDetails[${index}].customerContactNumber`}
                                                    value={addr.customerContactNumber}
                                                    onChange={formik.handleChange}
                                                    onBlur={formik.handleBlur}
                                                    placeholder="Enter Contact Number"
                                                    maxLength={10}
                                                    error={formik.touched.shipToDetails?.[index]?.customerContactNumber && formik.errors.shipToDetails?.[index]?.customerContactNumber ? { message: formik.errors.shipToDetails[index].customerContactNumber } : null}
                                                />
                                                <Input
                                                    label="Address (Street/Locality)*"
                                                    name={`shipToDetails[${index}].address`}
                                                    value={addr.address}
                                                    onChange={formik.handleChange}
                                                    onBlur={formik.handleBlur}
                                                    placeholder="Enter Full Address"
                                                    error={formik.touched.shipToDetails?.[index]?.address && formik.errors.shipToDetails?.[index]?.address ? { message: formik.errors.shipToDetails[index].address } : null}
                                                />
                                                <Input
                                                    label="City*"
                                                    name={`shipToDetails[${index}].city`}
                                                    value={addr.city}
                                                    onChange={formik.handleChange}
                                                    onBlur={formik.handleBlur}
                                                    placeholder="Enter City"
                                                    error={formik.touched.shipToDetails?.[index]?.city && formik.errors.shipToDetails?.[index]?.city ? { message: formik.errors.shipToDetails[index].city } : null}
                                                />
                                                <SearchableSelect
                                                    label="State*"
                                                    name={`shipToDetails[${index}].state`}
                                                    value={addr.state}
                                                    onChange={formik.handleChange}
                                                    options={(configs.states || []).map(s => ({ value: s.name, label: s.name }))}
                                                    error={formik.touched.shipToDetails?.[index]?.state && formik.errors.shipToDetails?.[index]?.state ? { message: formik.errors.shipToDetails[index].state } : null}
                                                />
                                                <Select
                                                    label="Country*"
                                                    name={`shipToDetails[${index}].country`}
                                                    value={addr.country}
                                                    onChange={formik.handleChange}
                                                    options={[{ value: 'India', label: 'India' }]}
                                                />
                                                <Select
                                                    label="Billing Currency*"
                                                    name={`shipToDetails[${index}].billingCurrency`}
                                                    value={addr.billingCurrency}
                                                    onChange={formik.handleChange}
                                                    options={[{ value: 'INR', label: 'INR' }, { value: 'USD', label: 'USD' }]}
                                                />
                                                <Select
                                                    label="Billing Mode*"
                                                    name={`shipToDetails[${index}].billingMode`}
                                                    value={addr.billingMode}
                                                    onChange={formik.handleChange}
                                                    options={[{ value: 'Credit', label: 'Credit' }, { value: 'Advance', label: 'Advance' }]}
                                                />
                                                <Input
                                                    label="Pincode*"
                                                    name={`shipToDetails[${index}].zipCode`}
                                                    value={addr.zipCode}
                                                    onChange={formik.handleChange}
                                                    onBlur={formik.handleBlur}
                                                    placeholder="Enter Pincode"
                                                    error={formik.touched.shipToDetails?.[index]?.zipCode && formik.errors.shipToDetails?.[index]?.zipCode ? { message: formik.errors.shipToDetails[index].zipCode } : null}
                                                />
                                            </div>
                                        </div>
                                    ))}

                                    <div className="flex justify-center pt-4">
                                        <button
                                            type="button"
                                            onClick={() => push({
                                                branchName: '',
                                                customerContactName: '',
                                                customerContactNumber: '',
                                                address: '',
                                                city: '',
                                                state: '',
                                                country: 'India',
                                                billingCurrency: 'INR',
                                                billingMode: 'Credit',
                                                zipCode: '',
                                            })}
                                            className="bg-erp-accent cursor-pointer text-white rounded-full px-12 py-4 font-bold flex items-center gap-2  transition-all shadow-lg hover:shadow-yellow-200"
                                        >
                                            <Icon icon="mdi:plus-circle-outline" className="text-2xl" />
                                            Add Another Ship To
                                        </button>
                                    </div>
                                </div>
                            )}
                        </FieldArray>

                        <div className="flex justify-center gap-6 pt-12 border-t border-gray-100">
                            <Button
                                type="submit"
                                className="rounded-full px-20 py-4 font-bold text-lg shadow-xl min-w-[250px] cursor-pointer"
                                disabled={formik.isSubmitting}
                            >
                                {formik.isSubmitting ? (
                                    <div className="flex items-center gap-2">
                                        <Icon icon="mdi:loading" className="animate-spin" />
                                        Updating...
                                    </div>
                                ) : 'Save All Changes'}
                            </Button>
                            <button
                                type="button"
                                onClick={() => handleCustomerChange(formik.values.customerId)}
                                className="px-12 py-4 rounded-full border-2  cursor-pointer border-gray-200 text-gray-500 font-bold hover:bg-gray-50 transition-colors"
                            >
                                Reset Form
                            </button>
                        </div>
                    </form>
                </FormikProvider>
            ) : (
                <div className="bg-white rounded-[3rem] border-2 border-dashed border-gray-200 p-20 flex flex-col items-center justify-center text-gray-400">
                    <Icon icon="mdi:account-search-outline" className="text-6xl mb-4" />
                    <p className="text-xl font-medium">Please select a customer to manage their ship-to details</p>
                </div>
            )}
        </div>
    );
};

export default ShipTo;


