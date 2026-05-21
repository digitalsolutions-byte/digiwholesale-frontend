import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useFormik, FormikProvider, FieldArray } from 'formik';
import * as Yup from 'yup';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';

import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import SearchableSelect from '../components/ui/SearchableSelect';
import CustomToggle from '../components/ui/CustomToggle';

import { getAllCustomers, getCustomerById } from '../services/customerService';
import {
    getOrderProductConfigs,
    getTints,
    getFrameTypes,
    getProductNames,
    resolveProductBase,
    createOrder,
    getCategoriesByBrand
} from '../services/orderService';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { PATHS } from '../routes/paths';
import { getOrderById, updateOrder } from '../services/orderService';

const OrderWizard = () => {
    const user = useSelector((state) => state.auth.user);
    const [activeStep, setActiveStep] = useState(0);
    const [customers, setCustomers] = useState([]);
    const [configs, setConfigs] = useState({});
    console.log('configs', configs)
    const [loadingConfigs, setLoadingConfigs] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [shipToAddresses, setShipToAddresses] = useState([]);
    const [productNames, setProductNames] = useState([]);
    const [loadingProductNames, setLoadingProductNames] = useState(false);
    const [resolutionResult, setResolutionResult] = useState(null);
    const [resolvingBase, setResolvingBase] = useState(false);
    const navigate = useNavigate();
    const isMappingData = useRef(false);
    const { id } = useParams();
    const { pathname } = useLocation();

    const isEditMode = pathname.includes('/edit/');
    const isViewMode = pathname.includes('/view/');
    const isReadOnly = isViewMode;

    const [fetchingOrder, setFetchingOrder] = useState(!!id);

    const steps = ['Customer Details', 'Product Details', 'Advanced Details'];

    // Initial Form Values
    const initialValues = {
        // Customer Details
        customerId: '',
        shipToId: '',
        orderReference: '',
        consumerCardName: '',
        opticianName: '',
        customerBalance: '0.00',

        // Product Details
        powerMode: 'both', // single | both
        productMode: 'rx', // stock | rx
        hasPrism: 'no', // yes | no
        powerTable: {
            R: { sph: '', cyl: '', axis: '', add: '', dia: '70' },
            L: { sph: '', cyl: '', axis: '', add: '', dia: '70' }
        },
        selectedSide: 'R', // Used when powerMode is 'single'
        prismTable: {
            R: { prism: '', base: '' },
            L: { prism: '', base: '' }
        },
        brandId: '',
        categoryId: '',
        treatmentId: '',
        indexId: '',
        productName: '',
        lensTypeId: '',
        coatingId: '',
        tintId: '',
        tintDetails: '',
        remarks: '',
        hasMirror: 'no', // yes | no
        centrationData: {
            R: { pd: '', corridor: '', fittingHeight: '' },
            L: { pd: '', corridor: '', fittingHeight: '' }
        },

        // Advanced Details
        hasFlatFitting: 'no', // yes | no
        dbl: '',
        frameType: '',
        frameLength: '',
        frameHeight: '',
        pantoscopicAngle: '',
        bowAngle: '',
        bvd: '',
        directCustomer: '',
        shippingCharges: '',
        otherCharges: ''
    };

    const validationSchema = Yup.object().shape({
        // Step 1: Customer Details
        customerId: Yup.string().required('Customer selection is required'),

        // Step 2: Product Details
        brandId: Yup.string().required('Brand is required'),
        categoryId: Yup.string().required('Category is required'),
        productName: Yup.string().required('Product selection is required'),
        indexId: Yup.string().required('Lens Index is required'),

        // Step 3: Advanced Details
        pantoscopicAngle: Yup.number().typeError('Must be a number').required('Pantoscopic Angle is required'),
        bowAngle: Yup.number().typeError('Must be a number').required('Bow Angle is required'),
        bvd: Yup.number().typeError('Must be a number').required('BVD is required'),

        // Conditional Frame Details
        frameType: Yup.string().when('hasFlatFitting', {
            is: 'yes',
            then: (schema) => schema.required('Frame Type is required'),
            otherwise: (schema) => schema.notRequired()
        }),
        dbl: Yup.string().when('hasFlatFitting', {
            is: 'yes',
            then: (schema) => schema.required('DBL is required'),
            otherwise: (schema) => schema.notRequired()
        }),
        frameLength: Yup.string().when('hasFlatFitting', {
            is: 'yes',
            then: (schema) => schema.required('Frame Length is required'),
            otherwise: (schema) => schema.notRequired()
        }),
        frameHeight: Yup.string().when('hasFlatFitting', {
            is: 'yes',
            then: (schema) => schema.required('Frame Height is required'),
            otherwise: (schema) => schema.notRequired()
        }),
    });

    const formik = useFormik({
        initialValues,
        validationSchema,
        onSubmit: async (values) => {
            try {
                // Clicking Primary submit button always means "Place Order" / "Submit for Processing"
                const payload = formatOrderPayload(values, 'Submitted');
                let res;
                if (isEditMode) {
                    res = await updateOrder(id, payload);
                } else {
                    res = await createOrder(payload);
                }

                if (res.success) {
                    toast.success(isEditMode ? 'Order updated and submitted successfully! 🚀' : 'Order placed successfully! 🚀');
                    navigate(PATHS.CUSTOMER_CARE.ALL_ORDERS);
                }
            } catch (error) {
                toast.error(error.message || 'Failed to process order');
            }
        }
    });

    // Map Backend Data to Formik Values
    useEffect(() => {
        if (id) {
            const fetchOrderData = async () => {
                try {
                    setFetchingOrder(true);
                    const response = await getOrderById(id);
                    if (response.success && response.data) {
                        const order = response.data;
                        isMappingData.current = true;

                        // Deep mapping from backend order structure to Formik values
                        const mappedValues = {
                            ...initialValues,
                            customerId: order.customer?.customerId?._id || order.customer?.customerId || '',
                            shipToId: order.customer?.customerShipToId || '',
                            orderReference: order.orderReference || '',
                            consumerCardName: order.consumerCardName || '',
                            opticianName: order.opticianName || '',
                            customerBalance: order.customer?.customerId?.customerBalance || '0.00',

                            powerMode: order.powers?.length === 1 ? 'single' : 'both',
                            productMode: order.productMode?.toLowerCase() === 'rx' ? 'rx' : 'stock',
                            hasPrism: (order.hasPrism || order.prisms?.length > 0) ? 'yes' : 'no',
                            selectedSide: order.powers?.[0]?.side || 'R',

                            brandId: order.brand?.id || '',
                            categoryId: order.category?.id || '',
                            treatmentId: order.treatment?.id || '',
                            indexId: (order.index !== undefined && order.index !== null) ? order.index.toString() : '',
                            productName: order.productName?.id || '',
                            lensTypeId: order.productType?.id || '',
                            coatingId: order.coating?.id || '',
                            tintId: order.tint?.id || '',
                            tintDetails: order.tintDetails || '',
                            remarks: order.remarks || '',
                            hasMirror: order.mirror ? 'yes' : 'no',

                            hasFlatFitting: order.fitting?.hasFlatFitting ? 'yes' : 'no',
                            dbl: order.fitting?.dbl || '',
                            frameType: order.fitting?.frameType || '',
                            frameLength: order.fitting?.frameLength || '',
                            frameHeight: order.fitting?.frameHeight || '',

                            pantoscopicAngle: order.lensData?.pantoscopeAngle || '',
                            bowAngle: order.lensData?.bowAngle || '',
                            bvd: order.lensData?.bvd || '',

                            directCustomer: order.directCustomer || '',
                            shippingCharges: order.shippingCharges || '',
                            otherCharges: order.otherCharges || ''
                        };

                        // Map Power Table
                        if (order.powers) {
                            order.powers.forEach(p => {
                                mappedValues.powerTable[p.side] = {
                                    sph: p.sph?.toString() || '',
                                    cyl: p.cyl?.toString() || '',
                                    axis: p.axis?.toString() || '',
                                    add: p.add?.toString() || '',
                                    dia: p.diameter?.toString() || '70'
                                };
                            });
                        }

                        // Map Prism Table
                        if (order.prisms) {
                            order.prisms.forEach(p => {
                                mappedValues.prismTable[p.side] = {
                                    prism: p.prism || '',
                                    base: p.base || ''
                                };
                            });
                        }

                        // Map Centration Data (API uses 'centration' singular)
                        const centData = order.centration || order.centrations;
                        if (centData) {
                            centData.forEach(c => {
                                mappedValues.centrationData[c.side] = {
                                    pd: c.pd?.toString() || '',
                                    corridor: c.corridor?.toString() || '',
                                    fittingHeight: c.fittingHeight?.toString() || ''
                                };
                            });
                        }

                        // Inject the current order's product into the options list 
                        // so the searchable select can resolve the label immediately
                        if (order.productName) {
                            setProductNames(prev => {
                                const exists = prev.find(p => p.value === order.productName.id);
                                if (exists) return prev;
                                return [{
                                    value: order.productName.id,
                                    label: order.productName.name,
                                    price: 0 // Will be updated when search runs
                                }, ...prev];
                            });
                        }

                        await formik.setValues(mappedValues);

                        // Also trigger customer details fetch for ship-to addresses
                        if (mappedValues.customerId) {
                            handleCustomerChange(mappedValues.customerId);
                        }

                        // Release mapping lock after state updates have propagated
                        setTimeout(() => {
                            isMappingData.current = false;
                        }, 500);
                    }
                } catch (error) {
                    toast.error('Failed to fetch order details');
                } finally {
                    setFetchingOrder(false);
                }
            };
            fetchOrderData();
        }
    }, [id]);

    const formatOrderPayload = (values, status) => {
        const mapEyeData = (side, data) => ({
            side,
            sph: parseFloat(data.sph) || 0,
            cyl: parseFloat(data.cyl) || 0,
            axis: parseFloat(data.axis) || 0,
            add: parseFloat(data.add) || 0,
            diameter: parseFloat(data.dia) || 70
        });

        const powers = [];
        if (values.powerMode === 'both') {
            powers.push(mapEyeData('R', values.powerTable.R));
            powers.push(mapEyeData('L', values.powerTable.L));
        } else {
            const side = values.selectedSide;
            powers.push(mapEyeData(side, values.powerTable[side]));
        }

        const prisms = [];
        if (values.hasPrism === 'yes') {
            if (values.powerMode === 'both') {
                prisms.push({ side: 'R', ...values.prismTable.R });
                prisms.push({ side: 'L', ...values.prismTable.L });
            } else {
                const side = values.selectedSide;
                prisms.push({ side, ...values.prismTable[side] });
            }
        }

        const centration = [];
        if (values.powerMode === 'both') {
            centration.push({ side: 'R', ...values.centrationData.R });
            centration.push({ side: 'L', ...values.centrationData.L });
        } else {
            const side = values.selectedSide;
            centration.push({ side, ...values.centrationData[side] });
        }

        const getFieldData = (field, id) => {
            const configSource = field === 'tints' ? configs.tints : configs[field];
            const item = (configSource || []).find(i => i._id === id || i.id === id);
            return item ? { id: item._id || item.id, name: item.name || item.productName || item.value } : null;
        };

        const getProductNameData = (id) => {
            const item = productNames.find(p => p.value === id);
            return item ? { id, name: item.label } : { id: id || '', name: '' };
        };

        return {
            customer: {
                customerId: values.customerId,
                customerShipToId: values.shipToId
            },
            orderReference: values.orderReference,
            consumerCardName: values.consumerCardName,
            opticianName: values.opticianName,
            powerType: values.powerMode === 'both' ? 'Both' : 'Single',
            powers,
            productMode: values.productMode === 'stock' ? 'Stock Lens' : 'Rx',
            prisms,
            brand: getFieldData('brand', values.brandId),
            category: getFieldData('category', values.categoryId),
            treatment: getFieldData('treatment', values.treatmentId),
            index: parseFloat(values.indexId) || 0,
            productName: getProductNameData(values.productName),
            coating: getFieldData('coating', values.coatingId),
            tint: getFieldData('tints', values.tintId),
            tintDetails: values.tintDetails,
            remarks: values.remarks,
            mirror: values.hasMirror === 'yes',
            centration,
            fitting: {
                hasFlatFitting: values.hasFlatFitting === 'yes',
                dbl: parseFloat(values.dbl) || null,
                frameType: values.frameType,
                frameLength: parseFloat(values.frameLength) || null,
                frameHeight: parseFloat(values.frameHeight) || null
            },
            lensData: {
                pantoscopeAngle: parseFloat(values.pantoscopicAngle) || null,
                bowAngle: parseFloat(values.bowAngle) || null,
                bvd: parseFloat(values.bvd) || null
            },
            directCustomer: values.directCustomer,
            shippingCharges: parseFloat(values.shippingCharges) || 0,
            otherCharges: parseFloat(values.otherCharges) || 0,
            status
        };
    };

    const handleSaveDraft = async () => {
        try {
            const payload = formatOrderPayload(formik.values, 'Draft');
            let res;
            if (isEditMode) {
                res = await updateOrder(id, payload);
            } else {
                res = await createOrder(payload);
            }

            if (res.success) {
                toast.success(isEditMode ? 'Draft details updated! 💾' : 'Order saved as draft! 💾');
                // For updates, we can either stay or go back. User requested "edit details and update draft status"
                // but if they just update details and keep draft, they might want to stay in the wizard.
                // However, traditionally for dashboard apps, we return to the list.
                if (isEditMode) navigate(PATHS.CUSTOMER_CARE.ALL_ORDERS);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to save draft');
        }
    };

    // Load initial data
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoadingConfigs(true);
            try {
                const [custRes, prodConfigs, tints, frameTypes] = await Promise.all([
                    getAllCustomers(1, 1000),
                    getOrderProductConfigs(),
                    getTints(),
                    getFrameTypes()
                ]);

                if (custRes.success) setCustomers(custRes.data.customers || []);

                setConfigs({
                    ...prodConfigs,
                    tints,
                    frameTypes
                });
            } catch (error) {
                console.error('Failed to load data:', error);
                toast.error('Failed to initialize page');
            } finally {
                setLoadingConfigs(false);
            }
        };
        fetchInitialData();
    }, []);

    // Handle Product Name Search
    // Local store for search timer
    const searchTimeout = useRef(null);

    const searchProducts = (search = '') => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        searchTimeout.current = setTimeout(async () => {
            const brandName = configs.brand.find(b => b._id === formik.values.brandId)?.name || '';
            const categoryName = configs.category.find(c => c._id === formik.values.categoryId)?.name || '';

            console.log('Searching products:', { search, brand: brandName, category: categoryName });
            setLoadingProductNames(true);
            try {
                const data = await getProductNames(search, 1, 100, brandName, categoryName);
                const items = data?.data?.data || data || [];
                console.log(items, 'data')
                setProductNames(items.map(p => ({
                    value: p._id || p.id || p.productName || '',
                    label: p.productName || p.name || '',
                    price: p.price || p.mrp || 0
                })));
            } catch (error) {
                console.error('Failed to fetch product names:', error);
            } finally {
                setLoadingProductNames(false);
            }
        }, 500);
    };

    // Initial search: Only trigger when filters change
    useEffect(() => {
        searchProducts('');
    }, [formik.values.brandId, formik.values.categoryId]);

    // Dynamic Category Loading
    useEffect(() => {
        const fetchCategories = async () => {
            if (!formik.values.brandId) {
                setConfigs(prev => ({ ...prev, category: [] }));
                return;
            }

            const brandName = configs.brand.find(b => b._id === formik.values.brandId)?.name || '';
            if (brandName) {
                setLoadingConfigs(true);
                try {
                    const filteredCats = await getCategoriesByBrand(brandName);
                    setConfigs(prev => ({ ...prev, category: filteredCats }));

                    // Only reset downstream if we are NOT currently mapping initial data
                    if (!isMappingData.current) {
                        formik.setFieldValue('categoryId', '');
                        formik.setFieldValue('productName', '');
                    }
                } catch (err) {
                    console.error('Failed to filter categories:', err);
                } finally {
                    setLoadingConfigs(false);
                }
            }
        };
        fetchCategories();
    }, [formik.values.brandId]);

    // Clear Product when Category changes
    const prevCatRef = useRef(formik.values.categoryId);
    useEffect(() => {
        if (prevCatRef.current !== formik.values.categoryId) {
            if (!isMappingData.current) {
                formik.setFieldValue('productName', '');
            }
            prevCatRef.current = formik.values.categoryId;
        }
    }, [formik.values.categoryId, formik.setFieldValue]);

    useEffect(() => {
        console.log('Selected Product Name:', formik.values.productName);
    }, [formik.values.productName]);
    const handleResolveBase = async () => {
        setResolvingBase(true);
        setResolutionResult(null);
        try {
            const powers = [];
            const rSide = formik.values.powerTable.R;
            powers.push({
                side: 'R',
                sph: parseFloat(rSide.sph) || 0,
                cyl: parseFloat(rSide.cyl) || 0,
                diameter: parseFloat(rSide.dia) || 70
            });

            if (formik.values.powerMode === 'both') {
                const lSide = formik.values.powerTable.L;
                powers.push({
                    side: 'L',
                    sph: parseFloat(lSide.sph) || 0,
                    cyl: parseFloat(lSide.cyl) || 0,
                    diameter: parseFloat(lSide.dia) || 70
                });
            }
            console.log('formik.values.productName', formik.values.productName)
            const brandNameResolve = configs.brand?.find(b => b._id === formik.values.brandId)?.name || '';
            const categoryNameResolve = configs.category?.find(c => c._id === formik.values.categoryId)?.name || '';
            const productNameResolve = productNames.find(p => p.value === formik.values.productName)?.label || '';

            const payload = {
                powers,
                productMode: formik.values.productMode === 'stock' ? 'Stock Lens' : 'Rx',
                brand: brandNameResolve,
                category: categoryNameResolve,
                productName: productNameResolve
            };

            const res = await resolveProductBase(payload);
            console.log('Resolve API Response:', res); // Debug log for user demo
            if (res.success) {
                // Normalize result: ensure it has a resolved array
                const data = res.data;
                const normalized = Array.isArray(data) ? { resolved: data } : (data?.resolved ? data : { resolved: [] });
                setResolutionResult(normalized);
                toast.success('Supplier & base resolved! 🔍');
            }
        } catch (error) {
            toast.error(error.message || 'Failed to resolve base curve');
        } finally {
            setResolvingBase(false);
        }
    };

    // Auto-Resolve Trigger
    // useEffect(() => {
    //     const canResolve = formik.values.brandId && formik.values.categoryId && formik.values.productName;
    //     if (!canResolve) return;

    //     const timer = setTimeout(() => {
    //         // handleResolveBase();
    //     }, 800);
    //     return () => clearTimeout(timer);
    // }, [
    //     formik.values.brandId,
    //     formik.values.categoryId,
    //     formik.values.productName,
    //     formik.values.powerTable.R.sph,
    //     formik.values.powerTable.R.cyl,
    //     formik.values.powerTable.R.dia,
    //     formik.values.powerTable.L.sph,
    //     formik.values.powerTable.L.cyl,
    //     formik.values.powerTable.L.dia,
    //     formik.values.powerMode
    // ]);

    // Handle Customer Change
    const handleCustomerChange = async (customerId) => {
        formik.setFieldValue('customerId', customerId);
        if (!customerId) {
            setSelectedCustomer(null);
            setShipToAddresses([]);
            return;
        }

        try {
            const res = await getCustomerById(customerId);
            if (res.success) {
                const customer = res.data;
                setSelectedCustomer(customer);
                setShipToAddresses(customer.customerShipToDetails || []);
            }
        } catch (error) {
            console.error('Failed to fetch customer details:', error);
        }
    };

    const customerOptions = useMemo(() =>
        customers.map(c => ({ value: c._id, label: `${c.shopName} (${c.customerCode || 'N/A'})` }))
        , [customers]);

    const shipToOptions = useMemo(() =>
        shipToAddresses.map(addr => ({
            value: addr._id,
            label: `${addr.branchName} - ${addr.city}`
        }))
        , [shipToAddresses]);

    // Simplified wrapInput for OrderWizard
    const wrapInput = (Component, props) => {
        const getIn = (obj, path) => {
            if (!obj || !path) return undefined;
            const keys = path.split(/[.[\]]+/).filter(Boolean);
            let current = obj;
            for (const key of keys) {
                if (!current || typeof current !== 'object') return undefined;
                current = current[key];
            }
            return current;
        };

        const fieldError = getIn(formik.errors, props.name);
        const fieldTouched = getIn(formik.touched, props.name);
        const fieldValue = getIn(formik.values, props.name);

        return (
            <Component
                {...props}
                error={fieldTouched && fieldError ? { message: fieldError } : null}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={fieldValue ?? ''}
                disabled={props.disabled || isReadOnly}
            />
        );
    };

    const isStepValid = (stepIdx = activeStep) => {
        const { values, errors } = formik;
        switch (stepIdx) {
            case 0: // Customer Details
                return !!values.customerId && !errors.customerId;
            case 1: // Product Details
                return !!values.brandId && !!values.categoryId && !!values.productName && !!values.indexId &&
                    !errors.brandId && !errors.categoryId && !errors.productName && !errors.indexId;
            case 2: // Advanced Details
                const techValid = !!values.pantoscopicAngle && !!values.bowAngle && !!values.bvd &&
                    !errors.pantoscopicAngle && !errors.bowAngle && !errors.bvd;
                if (values.hasFlatFitting === 'yes') {
                    return techValid && !!values.frameType && !!values.dbl && !!values.frameLength && !!values.frameHeight;
                }
                return techValid;
            default:
                return false;
        }
    };

    const handleNext = async () => {
        // Define fields for each step to validate partially
        const stepFields = [
            ['customerId'], // Step 1
            ['brandId', 'categoryId', 'productName', 'indexId'], // Step 2
            ['pantoscopicAngle', 'bowAngle', 'bvd'] // Step 3
        ];

        // Handle conditional fields for Step 3
        if (formik.values.hasFlatFitting === 'yes') {
            stepFields[2].push('frameType', 'dbl', 'frameLength', 'frameHeight');
        }

        const currentFields = stepFields[activeStep] || [];

        // Mark current fields as touched
        const touchedFields = { ...formik.touched };
        currentFields.forEach(field => {
            touchedFields[field] = true;
        });
        formik.setTouched(touchedFields);

        // Validate only fields of the current step
        const errors = await formik.validateForm();
        const hasErrorsInCurrentStep = currentFields.some(field => !!errors[field]);

        if (!hasErrorsInCurrentStep) {
            if (activeStep < steps.length - 1) {
                setActiveStep(prev => prev + 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                formik.handleSubmit();
            }
        } else {
            // Find the first error message to show in toast
            const firstErrorField = currentFields.find(f => errors[f]);
            toast.warn(`Please fix: ${errors[firstErrorField]}`);
        }
    };

    const handleBack = () => {
        if (activeStep > 0) {
            setActiveStep(prev => prev - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const renderCustomerDetails = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 p-10 bg-white rounded-b-2xl  border-gray-50">
            <div className="col-span-1">
                <SearchableSelect
                    label="Select Customer"
                    name="customerId"
                    value={formik.values.customerId}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    options={customerOptions}
                    placeholder="Search by Shop Name or Code"
                    disabled={isReadOnly}
                />
            </div>
            {wrapInput(SearchableSelect, {
                label: "Select Ship To",
                name: "shipToId",
                placeholder: "Select Ship To Address",
                options: shipToOptions,
                disabled: !formik.values.customerId
            })}

            <div className="flex flex-wrap col-span-full items-center justify-center gap-4 py-2">
                <p className="text-sm font-black text-erp-accent uppercase tracking-widest bg-erp-accent/5/50 px-4 py-2 rounded-xl border border-orange-100/50 inline-block">
                    Customer Balance: <span className="text-gray-900 ml-2">₹ {selectedCustomer?.customerBalance || '0.00'}</span>
                </p>
                <p className="text-sm font-black text-erp-accent uppercase tracking-widest bg-erp-accent/5/50 px-4 py-2 rounded-xl border border-orange-100/50 inline-block">
                    Customer Credit Limit: <span className="text-gray-900 ml-2">₹ {selectedCustomer?.creditLimit || '0.00'}</span>
                </p>
                <p className="text-sm font-black text-erp-accent uppercase tracking-widest bg-erp-accent/5/50 px-4 py-2 rounded-xl border border-orange-100/50 inline-block">
                    Customer Credit Used: <span className="text-gray-900 ml-2">₹ {selectedCustomer?.creditUsed || '0.00'}</span>
                </p>
            </div>

            {wrapInput(Input, {
                label: "Order Reference",
                name: "orderReference",
                placeholder: "Enter Order Reference"
            })}
            {wrapInput(Input, {
                label: "Consumer Card Name",
                name: "consumerCardName",
                placeholder: "Enter Consumer Card Name"
            })}
            {wrapInput(Input, {
                label: "Optician's Name",
                name: "opticianName",
                placeholder: "Enter Optician's Name"
            })}
        </div>
    );

    const renderProductDetails = () => (
        <div className="p-10 space-y-12 bg-white rounded-b-2xl  border-gray-50">
            {/* Toggles Row */}
            <div className="flex flex-wrap gap-10 items-end justify-between ">
                <CustomToggle
                    label="Power Details"
                    value={formik.values.powerMode}
                    onChange={(v) => formik.setFieldValue('powerMode', v)}
                    options={[{ label: 'Single', value: 'single' }, { label: 'Both', value: 'both' }]}
                    containerClassName="w-64 "
                />

                <CustomToggle
                    label="Product Type"
                    value={formik.values.productMode}
                    onChange={(v) => formik.setFieldValue('productMode', v)}
                    options={[{ label: 'Stock Lens', value: 'stock' }, { label: 'Rx', value: 'rx' }]}
                    containerClassName="w-64"
                />
                <CustomToggle
                    label="Has Prism"
                    value={formik.values.hasPrism}
                    onChange={(v) => formik.setFieldValue('hasPrism', v)}
                    options={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }]}
                    containerClassName="w-64"
                />


            </div>

            {/* Power Tables Row */}
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Main Power Table */}
                <div className="flex-1 bg-gray-50/50 border border-gray-200/50 rounded-2xl overflow-hidden shadow-sm">
                    <div className="grid grid-cols-6 bg-gray-100/80 border-b border-gray-200">
                        {['SIDE', 'SPH', 'CYLD', 'AXIS', 'ADD', 'DIAMETER'].map(h => (
                            <div key={h} className="py-2.5 text-[10px] font-black uppercase text-gray-400   text-center border-r border-gray-200 last:border-r-0 ">{h}</div>
                        ))}
                    </div>
                    {['R', 'L'].map((side, sIdx) => {
                        const isDisabled = formik.values.powerMode === 'single' && formik.values.selectedSide !== side;
                        // Find resolution for this eye
                        const eyeResolve = resolutionResult?.resolved?.resolved?.find(r => r.side === side);

                        return (
                            <div key={side} className={`grid grid-cols-6 border-b border-gray-100 last:border-b-0 items-center ${side === 'L' ? 'bg-erp-accent/5/20' : ''} ${isDisabled ? 'opacity-30' : ''}`}>
                                <div
                                    className={`py-4 flex flex-col items-center justify-center border-r border-gray-100 gap-1 overflow-hidden transition-all duration-300 ${formik.values.powerMode === 'single' ? 'cursor-pointer hover:bg-erp-accent/5/50' : ''}`}
                                    onClick={() => {
                                        if (formik.values.powerMode === 'single') {
                                            formik.setFieldValue('selectedSide', side);
                                        }
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        {formik.values.powerMode === 'single' && (
                                            <div className={`w-4 h-4 rounded-sm border transition-all flex items-center justify-center ${formik.values.selectedSide === side
                                                ? 'bg-erp-accent border-erp-accent shadow-sm'
                                                : 'bg-white border-gray-200'
                                                }`}>
                                                {formik.values.selectedSide === side && <Icon icon="mdi:check" className="text-white text-[10px]" />}
                                            </div>
                                        )}
                                        <span className={`font-black  text-sm ${formik.values.powerMode === 'single' && formik.values.selectedSide === side
                                            ? 'text-erp-accent'
                                            : 'text-gray-500'
                                            }`}>{side}</span>
                                    </div>
                                    {eyeResolve && (
                                        <div className="flex flex-col items-center animate-in zoom-in-50 duration-500">
                                            <span className="px-1.5 py-0.5 bg-black text-white text-[7px] font-black uppercase tracking-tighter rounded-sm whitespace-nowrap mb-0.5">
                                                {eyeResolve.blankCode}
                                            </span>
                                            {eyeResolve.baseCurve && (
                                                <span className="text-[7px] text-erp-accent/80 font-black  tracking-tighter mb-0.5">
                                                    Base: {eyeResolve.baseCurve}
                                                </span>
                                            )}
                                            <span className="text-[7px] text-erp-accent/90 font-extrabold uppercase tracking-tighter truncate max-w-[50px]">
                                                {eyeResolve.supplier}
                                            </span>
                                        </div>
                                    )}
                                    {resolvingBase && (
                                        <div className="animate-pulse flex gap-0.5 mt-1">
                                            <div className="w-1 h-1 bg-amber-400 rounded-full"></div>
                                            <div className="w-1 h-1 bg-amber-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                            <div className="w-1 h-1 bg-amber-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                        </div>
                                    )}
                                </div>
                                {['sph', 'cyl', 'axis', 'add', 'dia'].map(field => (
                                    <div key={field} className="p-1.5">
                                        <input
                                            type="text"
                                            name={`powerTable.${side}.${field}`}
                                            value={formik.values.powerTable[side][field]}
                                            onChange={formik.handleChange}
                                            disabled={isDisabled}
                                            className="w-full h-10 border border-gray-200 rounded-lg bg-white text-center font-bold text-gray-700 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-erp-accent/10 transition-all disabled:cursor-not-allowed"
                                            placeholder="0.00"
                                        />
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>

                {/* Prism Table */}
                {formik.values.hasPrism === 'yes' && (
                    <div className="w-full lg:w-72 bg-gray-50/50 border border-gray-200/50 rounded-2xl overflow-hidden shadow-sm animate-in slide-in-from-right-4 duration-300">
                        <div className="grid grid-cols-3 bg-gray-100/80 border-b border-gray-200">
                            {['SIDE', 'PRISM', 'BASE SEL.'].map(h => (
                                <div key={h} className="py-2.5 text-[10px] font-black uppercase text-gray-400   text-center border-r border-gray-200 last:border-r-0 ">{h}</div>
                            ))}
                        </div>
                        {['R', 'L'].map((side) => {
                            const isDisabled = formik.values.powerMode === 'single' && formik.values.selectedSide !== side;
                            return (
                                <div key={side} className={`grid grid-cols-3 border-b border-gray-100 last:border-b-0 items-center ${isDisabled ? 'opacity-30' : ''}`}>
                                    <div
                                        className={`py-4 flex flex-col items-center justify-center border-r border-gray-100 gap-1 overflow-hidden transition-all duration-300 ${formik.values.powerMode === 'single' ? 'cursor-pointer hover:bg-erp-accent/5/50' : ''}`}
                                        onClick={() => {
                                            if (formik.values.powerMode === 'single') {
                                                formik.setFieldValue('selectedSide', side);
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            {formik.values.powerMode === 'single' && (
                                                <div className={`w-4 h-4 rounded-sm border transition-all flex items-center justify-center ${formik.values.selectedSide === side
                                                    ? 'bg-erp-accent border-erp-accent shadow-sm'
                                                    : 'bg-white border-gray-200'
                                                    }`}>
                                                    {formik.values.selectedSide === side && <Icon icon="mdi:check" className="text-white text-[10px]" />}
                                                </div>
                                            )}
                                            <span className={`font-black  text-sm ${formik.values.powerMode === 'single' && formik.values.selectedSide === side
                                                ? 'text-erp-accent'
                                                : 'text-gray-500'
                                                }`}>{side}</span>
                                        </div>
                                    </div>
                                    <div className="p-1.5">
                                        <input
                                            type="text"
                                            name={`prismTable.${side}.prism`}
                                            value={formik.values.prismTable[side].prism}
                                            onChange={formik.handleChange}
                                            disabled={isDisabled}
                                            className="w-full h-10 border border-gray-200 rounded-lg bg-white text-center font-bold text-gray-700 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-erp-accent/10 transition-all disabled:cursor-not-allowed"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="p-1.5">
                                        <input
                                            type="text"
                                            name={`prismTable.${side}.base`}
                                            value={formik.values.prismTable[side].base}
                                            onChange={formik.handleChange}
                                            disabled={isDisabled}
                                            className="w-full h-10 border border-gray-200 rounded-lg bg-white text-center font-bold text-gray-700 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-erp-accent/10 transition-all disabled:cursor-not-allowed"
                                            placeholder="Base"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Rest of the Product Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-8">
                {wrapInput(SearchableSelect, {
                    label: "Select Brand",
                    name: "brandId",
                    options: (Array.isArray(configs.brand) ? configs.brand : []).map(b => ({ value: b._id, label: b.name })),
                    placeholder: "Select Brand"
                })}
                {wrapInput(SearchableSelect, {
                    label: "Select Category",
                    name: "categoryId",
                    options: (Array.isArray(configs.category) ? configs.category : []).map(c => ({ value: c._id, label: c.name })),
                    placeholder: "Select Category",
                    disabled: !formik.values.brandId
                })}
                <div className="md:col-span-1">
                    <SearchableSelect
                        label="Product Name"
                        name="productName"
                        value={formik.values.productName}
                        onChange={(e) => formik.setFieldValue('productName', e.target.value)}
                        onSearch={(q) => searchProducts(q)}
                        options={productNames}
                        loading={loadingProductNames}
                        placeholder="Search Product Name (e.g. Polarised)..."
                        disabled={!formik.values.brandId || !formik.values.categoryId || isReadOnly}
                    />

                </div>



                {wrapInput(Select, {
                    label: "Treatment",
                    name: "treatmentId",
                    placeholder: "Treatment",
                    options: (Array.isArray(configs.treatment) ? configs.treatment : []).map(t => ({ value: t._id, label: t.name }))
                })}
                {wrapInput(Select, {
                    label: "Index",
                    name: "indexId",
                    placeholder: "Index",
                    options: (Array.isArray(configs.index) ? configs.index : []).map(i => {
                        const val = i.value?.toString() || i.toString() || '';
                        return { value: val, label: val };
                    })
                })}

                {wrapInput(Select, {
                    label: "Coating",
                    name: "coatingId",
                    placeholder: "Coating",
                    options: (Array.isArray(configs.coating) ? configs.coating : []).map(c => ({ value: c._id, label: c.name }))
                })}
                {wrapInput(Select, {
                    label: "Tint",
                    name: "tintId",
                    placeholder: "Tint",
                    options: (Array.isArray(configs.tints) ? configs.tints : []).map(t => ({ value: t._id, label: t.name }))
                })}
                {wrapInput(Input, {
                    label: "Tint Details",
                    name: "tintDetails",
                    placeholder: "Tint Details"
                })}
                {wrapInput(Input, {
                    label: "Remarks",
                    name: "remarks",
                    placeholder: "Enter Remarks"
                })}
                {formik.values.productName && (
                    <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest"> Price:</span>
                        <span className="text-sm font-black text-erp-accent/80">
                            ₹{productNames.find(p => p.value === formik.values.productName)?.price || '0.00'}
                        </span>
                    </div>
                )}
                {/* <div className="col-span-full mt-4 p-6 bg-gray-50 rounded-2xl border border-gray-200 shadow-inner">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="space-y-1">
                            <h5 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                                <Icon icon="mdi:truck-delivery" className="text-erp-accent" />
                                Identify Suppliers & Base Type
                            </h5>
                            <p className="text-[10px] text-gray-400 font-bold uppercase   italic">Demo Tool: Check which supplier and base curve will be used for this selection.</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleResolveBase}
                            disabled={resolvingBase}
                            className="bg-erp-accent text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-lg shadow-orange-500/10 active:scale-95 disabled:opacity-50"
                        >
                            {resolvingBase ? <Icon icon="mdi:loading" className="animate-spin text-lg" /> : <Icon icon="mdi:account-search" className="text-lg" />}
                            Know Suppliers
                        </button>
                    </div>

                    {resolutionResult && (
                        <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-top-6 duration-700">
                            {Array.isArray(resolutionResult.resolved?.resolved) && (
                                <div className="space-y-3">
                                    <h6 className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-2">Product Resolution:</h6>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {resolutionResult.resolved.resolved.map((item, idx) => (
                                            <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-erp-accent flex items-center justify-center font-black text-white italic shadow-sm">
                                                        {item.side}
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase  ">Blank Code</p>
                                                        <p className="text-xs font-black text-gray-800">{item.blankCode}</p>
                                                    </div>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase  ">Base Curve</p>
                                                    <p className="text-xs font-black text-erp-accent/80 ">BC {item.baseCurve}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase  ">Supplier</p>
                                                    <p className="text-xs font-black text-gray-900 flex items-center gap-1 justify-end">
                                                        <Icon icon="mdi:check-decagram" className="text-green-500 text-[10px]" />
                                                        {item.supplier}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {Array.isArray(resolutionResult.resolved?.suppliers) && (
                                <div className="space-y-3">
                                    <h6 className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-2">Supplier Priorities:</h6>
                                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                        <div className="grid grid-cols-3 bg-gray-50 border-b border-gray-100 py-2 px-4">
                                            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Supplier Name</div>
                                            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Priority</div>
                                            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Status</div>
                                        </div>
                                        {resolutionResult.resolved.suppliers.map((sup, sidx) => (
                                            <div key={sidx} className="grid grid-cols-3 py-2.5 px-4 border-b border-gray-50 last:border-0 hover:bg-erp-accent/5/10 transition-colors items-center">
                                                <div className="text-xs font-bold text-gray-700">{sup.name}</div>
                                                <div className="text-center">
                                                    <span className="px-2 py-0.5 bg-gray-100 rounded-full text-[9px] font-black text-gray-500">
                                                        Rank {sup.priority}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${sup.active ? 'text-green-500' : 'text-red-400'}`}>
                                                        {sup.active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div> */}
            </div>

            {/* Mirror Toggle */}
            <div className="flex items-center gap-10">
                <CustomToggle
                    label="Mirror"
                    value={formik.values.hasMirror}
                    onChange={(v) => formik.setFieldValue('hasMirror', v)}
                    options={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }]}
                    containerClassName="w-64"
                />
            </div>

            {/* Centration Table */}
            <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-erp-accent ">Centration Data:</h4>
                <div className="bg-gray-50/50 border border-gray-200/50 rounded-2xl overflow-hidden shadow-sm max-w-4xl">
                    <div className="grid grid-cols-4 bg-gray-100/80 border-b border-gray-200">
                        {['SIDE', 'PD', 'CORRIDOR', 'FITTING HEIGHT'].map(h => (
                            <div key={h} className="py-2.5 text-[10px] font-black uppercase text-gray-400   text-center border-r border-gray-200 last:border-r-0 ">{h}</div>
                        ))}
                    </div>
                    {['R', 'L'].map((side) => {
                        const isDisabled = formik.values.powerMode === 'single' && formik.values.selectedSide !== side;
                        return (
                            <div key={side} className={`grid grid-cols-4 border-b border-gray-100 last:border-b-0 items-center ${isDisabled ? 'opacity-30' : ''}`}>
                                <div className="py-4 font-black text-gray-500 text-center border-r border-gray-100 ">{side}</div>
                                {['pd', 'corridor', 'fittingHeight'].map(field => (
                                    <div key={field} className="p-1.5">
                                        <input
                                            type="text"
                                            name={`centrationData.${side}.${field}`}
                                            value={formik.values.centrationData[side][field]}
                                            onChange={formik.handleChange}
                                            disabled={isDisabled}
                                            className="w-full h-10 border border-gray-200 rounded-lg bg-white text-center font-bold text-gray-700 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-erp-accent/10 transition-all disabled:cursor-not-allowed"
                                            placeholder="---"
                                        />
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    const renderAdvancedDetails = () => (
        <div className="p-10 space-y-12 bg-white rounded-b-2xl border-t border-gray-50">
            {/* Fitting Selection */}
            <div className="space-y-6">
                <h4 className="text-xs font-black uppercase tracking-widest text-erp-accent ">Advanced Fitting Data</h4>
                <CustomToggle
                    label="Has Flat Fitting"
                    value={formik.values.hasFlatFitting}
                    onChange={(v) => formik.setFieldValue('hasFlatFitting', v)}
                    options={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }]}
                    containerClassName="w-64"
                />

                {/* Conditional Frame Specifications */}
                {formik.values.hasFlatFitting === 'yes' && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-x-12 gap-y-8 p-10  border border-orange-100 rounded-3xl">
                        <div className="col-span-full">
                            <h3 className="text-[10px] font-black text-erp-accent/80 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                {/* <Icon icon="mdi:frame-outline" className="text-lg" /> */}
                                Frame Specifications
                            </h3>
                        </div>
                        {wrapInput(Select, {
                            label: "Frame Type",
                            name: "frameType",
                            options: (Array.isArray(configs.frameTypes) ? configs.frameTypes : []).map(f => ({ value: f.name || f, label: f.name || f })),
                            placeholder: "Select Frame Type"
                        })}
                        {wrapInput(Input, { label: "DBL", name: "dbl", placeholder: "mm" })}
                        {wrapInput(Input, { label: "Frame Length", name: "frameLength", placeholder: "mm" })}
                        {wrapInput(Input, { label: "Frame Height", name: "frameHeight", placeholder: "mm" })}
                    </div>
                )}

                {/* Technical Centration Specs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-8 p-10 bg-gray-50/50 border border-gray-100 rounded-3xl">
                    <div className="col-span-full">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                            {/* <Icon icon="mdi:ruler-square" className="text-lg" /> */}
                            Technical Centration & Angles
                        </h3>
                    </div>
                    {wrapInput(Input, { label: "Pantoscopic Angle", name: "pantoscopicAngle", placeholder: "Eg. 7°" })}
                    {wrapInput(Input, { label: "Bow Angle", name: "bowAngle", placeholder: "Eg. 5°" })}
                    {wrapInput(Input, { label: "BVD", name: "bvd", placeholder: "Eg. 12mm" })}
                </div>
            </div>

            <hr className="border-gray-50" />

            {/* Miscellaneous Data */}
            <div className="space-y-6">
                <h4 className="text-xs font-black uppercase tracking-widest text-erp-accent ">Shipping & Others</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-8">
                    {wrapInput(Input, { label: "Direct Customer", name: "directCustomer", placeholder: "Direct Customer" })}
                    {wrapInput(Input, { label: "Shipping Charges", name: "shippingCharges", placeholder: "Shipping Charges" })}
                    {wrapInput(Input, { label: "Other Charges", name: "otherCharges", placeholder: "Other Charges" })}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen p-6 bg-gray-50/50">


            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">
                            {isViewMode ? 'Order Details' : isEditMode ? 'Edit Order' : 'Create New Order'}
                        </h1>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-erp-accent"></span>
                            {isViewMode ? 'Viewing recorded order data' : isEditMode ? 'Modifying existing draft' : 'Configure and submit order to lab'}
                        </p>
                    </div>
                    {isReadOnly && (
                        <button
                            onClick={() => navigate(PATHS.CUSTOMER_CARE.ALL_ORDERS)}
                            className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
                        >
                            <Icon icon="mdi:arrow-left" className="text-lg" />
                            Back to List
                        </button>
                    )}
                </div>

                {fetchingOrder ? (
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl p-20 flex flex-col items-center justify-center gap-6">
                        <div className="w-16 h-16 border-4 border-erp-accent/20 border-t-erp-accent rounded-full animate-spin"></div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] animate-pulse">Safely Fetching Order Details...</p>
                    </div>
                ) : (
                    <FormikProvider value={formik}>
                        <form onSubmit={formik.handleSubmit} className="space-y-6 pb-20">
                            {steps.map((label, idx) => {
                                const isActive = activeStep === idx;
                                const isCompleted = idx < activeStep;

                                return (
                                    <div
                                        key={idx}
                                        className={`bg-white rounded-2xl border transition-all duration-300 ${isActive
                                            ? 'shadow-md border-erp-accent/20'
                                            : 'shadow-sm border-gray-100'
                                            }`}
                                    >
                                        {/* Accordion Header */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (idx <= activeStep || isStepValid(activeStep) || isReadOnly) {
                                                    setActiveStep(idx);
                                                } else {
                                                    toast.warning(`Please complete the current step first.`);
                                                }
                                            }}
                                            className="w-full flex items-center justify-between p-6 cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${isActive
                                                    ? 'bg-erp-accent text-white'
                                                    : isCompleted
                                                        ? 'bg-green-500 text-white'
                                                        : 'bg-gray-100 text-gray-400 group-hover:bg-erp-accent/5'
                                                    }`}>
                                                    {isCompleted ? <Icon icon="mdi:check" className="text-xl" /> : <span className="font-black  text-lg">{idx + 1}</span>}
                                                </div>
                                                <div className="text-left">
                                                    <h3 className={`font-black uppercase tracking-widest text-sm transition-colors ${isActive ? 'text-erp-accent' : 'text-gray-700'
                                                        }`}>
                                                        {label}
                                                    </h3>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase  ">
                                                        {isActive ? 'Currently Editing' : isCompleted ? 'Entry Complete' : 'Pending Details'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${isActive ? 'bg-erp-accent/5 rotate-180' : 'bg-gray-50'}`}>
                                                <Icon icon="mdi:chevron-down" className={`text-xl ${isActive ? 'text-erp-accent' : 'text-gray-400'}`} />
                                            </div>
                                        </button>

                                        {/* Accordion Content */}
                                        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isActive ? 'max-h-[3000px] opacity-100 pb-12' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                                            <div className="px-8 md:px-12 pt-0">
                                                <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-100 to-transparent mb-12" />
                                                {idx === 0 && renderCustomerDetails()}
                                                {idx === 1 && renderProductDetails()}
                                                {idx === 2 && renderAdvancedDetails()}

                                                {/* Navigation Buttons inside Step Content */}
                                                {!isReadOnly && isActive && (
                                                    <div className="mt-12 flex items-center justify-between pt-8 border-t border-gray-50">
                                                        <div className="flex gap-4">
                                                            {idx > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={handleBack}
                                                                    className="flex items-center px-6 py-3 bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all"
                                                                >
                                                                    <Icon icon="mdi:chevron-left" className="mr-2 text-lg" />
                                                                    Back
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={handleSaveDraft}
                                                                className="flex items-center px-6 py-3 bg-white border border-gray-200 text-gray-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all shadow-sm"
                                                            >
                                                                <Icon icon="mdi:content-save-outline" className="mr-2 text-lg text-gray-400" />
                                                                {isEditMode ? 'Update Draft' : 'Save Draft'}
                                                            </button>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={handleNext}
                                                            className="flex items-center px-8 py-3 bg-erp-accent text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all active:scale-95"
                                                        >
                                                            <span>
                                                                {idx === steps.length - 1 ? (isEditMode ? 'Submit & Process' : 'Place Order') : 'Next Step'}
                                                            </span>
                                                            <Icon icon={idx === steps.length - 1 ? "mdi:check-circle" : "mdi:arrow-right"} className="ml-2 text-lg" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Submission Buttons - Styled like RegisterCustomer Footer */}
                            {!isReadOnly && (
                                <div className="flex justify-center gap-6 pt-10">
                                    <button
                                        type="submit"
                                        className="flex items-center px-10 py-4 bg-erp-accent text-white text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                                        disabled={formik.isSubmitting}
                                    >
                                        <Icon icon="mdi:check-circle" className="mr-2 text-xl" />
                                        {formik.isSubmitting ? 'Processing...' : isEditMode ? 'Submit & Process Order' : 'Place Final Order'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveDraft}
                                        className="flex items-center px-10 py-4 bg-white border-2 border-gray-200 text-gray-600 text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95"
                                    >
                                        <Icon icon="mdi:content-save-outline" className="mr-2 text-xl text-gray-400" />
                                        {isEditMode ? 'Update Draft' : 'Save As Draft'}
                                    </button>
                                </div>
                            )}
                        </form>
                    </FormikProvider>
                )}
            </div>
        </div>
    );
};

export default OrderWizard;


