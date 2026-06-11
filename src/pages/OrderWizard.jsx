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
import ConfirmationModal from '../components/ui/ConfirmationModal';

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
    const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, indexToRemove: null });
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
    const [activeProductIndex, setActiveProductIndex] = useState(0);
    const [expandedProductIndices, setExpandedProductIndices] = useState([]);
    const [activeCategories, setActiveCategories] = useState([]);

    const steps = ['Customer Details', 'Product Details', 'Advanced Details'];

    const productTemplate = {
        qty: 1,
        unit: 'piece',
        price: 0,
        discount: 0,
        powerMode: 'both',
        productMode: 'rx',
        hasPrism: 'no',
        powerTable: {
            R: { sph: '', cyl: '', axis: '', add: '', dia: '70' },
            L: { sph: '', cyl: '', axis: '', add: '', dia: '70' }
        },
        selectedSide: 'R',
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
        hasMirror: 'no',
        centrationData: {
            R: { pd: '', corridor: '', fittingHeight: '' },
            L: { pd: '', corridor: '', fittingHeight: '' }
        },
        gstDetails: {
            gstPercent: '',
            gstType: '',
            gstMode: '',
            gstAmount: '',
            loyaltyPoints: '',
            advance: '',
            transactionType: '',
            remarks: ''
        }
    };

    // Initial Form Values
    const initialValues = {
        // Customer Details
        customerId: '',
        shipToId: '',
        orderReference: '',
        consumerCardName: '',
        opticianName: '',
        customerBalance: '0.00',

        // Product Details Array
        products: Array(5).fill(null).map(() => ({ ...productTemplate })),

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
        products: Yup.array().of(
            Yup.object().shape({
                brandId: Yup.string().required('Brand is required'),
                categoryId: Yup.string().required('Category is required'),
                productName: Yup.string().required('Product selection is required'),
                indexId: Yup.string().required('Lens Index is required'),
            })
        ),

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
                        };

                        // Handle multiple products if backend provides them, otherwise map root level to first product
                        let products = [];
                        if (order.products && order.products.length > 0) {
                            products = order.products.map(prod => {
                                const prodMapped = {
                                    ...productTemplate,
                                    scan: prod.scan || '',
                                    qty: prod.qty || 1,
                                    price: prod.price || 0,
                                    discount: prod.discount || 0,
                                    powerMode: prod.powers?.length === 1 ? 'single' : 'both',
                                    productMode: prod.productMode?.toLowerCase() === 'rx' ? 'rx' : 'stock',
                                    hasPrism: (prod.hasPrism || prod.prisms?.length > 0) ? 'yes' : 'no',
                                    selectedSide: prod.powers?.[0]?.side || 'R',
                                    brandId: prod.brand?.id || '',
                                    categoryId: prod.category?.id || '',
                                    treatmentId: prod.treatment?.id || '',
                                    indexId: (prod.index !== undefined && prod.index !== null) ? prod.index.toString() : '',
                                    productName: prod.productName?.id || '',
                                    lensTypeId: prod.productType?.id || '',
                                    coatingId: prod.coating?.id || '',
                                    tintId: prod.tint?.id || '',
                                    tintDetails: prod.tintDetails || '',
                                    remarks: prod.remarks || '',
                                    hasMirror: prod.mirror ? 'yes' : 'no',
                                    gstDetails: prod.gstDetails || {
                                        gstPercent: '', gstType: '', gstMode: '', gstAmount: '',
                                        loyaltyPoints: '', advance: '', transactionType: '', remarks: ''
                                    }
                                };

                                if (prod.powers) {
                                    prod.powers.forEach(p => {
                                        prodMapped.powerTable[p.side] = {
                                            sph: p.sph?.toString() || '', cyl: p.cyl?.toString() || '',
                                            axis: p.axis?.toString() || '', add: p.add?.toString() || '',
                                            dia: p.diameter?.toString() || '70'
                                        };
                                    });
                                }
                                if (prod.prisms) {
                                    prod.prisms.forEach(p => {
                                        prodMapped.prismTable[p.side] = { prism: p.prism || '', base: p.base || '' };
                                    });
                                }
                                const centData = prod.centration || prod.centrations;
                                if (centData) {
                                    centData.forEach(c => {
                                        prodMapped.centrationData[c.side] = {
                                            pd: c.pd?.toString() || '', corridor: c.corridor?.toString() || '',
                                            fittingHeight: c.fittingHeight?.toString() || ''
                                        };
                                    });
                                }
                                return prodMapped;
                            });
                        } else {
                            // Fallback to single product from root
                            const singleProd = {
                                ...productTemplate,
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
                            };
                            if (order.powers) {
                                order.powers.forEach(p => {
                                    singleProd.powerTable[p.side] = {
                                        sph: p.sph?.toString() || '', cyl: p.cyl?.toString() || '',
                                        axis: p.axis?.toString() || '', add: p.add?.toString() || '', dia: p.diameter?.toString() || '70'
                                    };
                                });
                            }
                            if (order.prisms) {
                                order.prisms.forEach(p => {
                                    singleProd.prismTable[p.side] = { prism: p.prism || '', base: p.base || '' };
                                });
                            }
                            const centData = order.centration || order.centrations;
                            if (centData) {
                                centData.forEach(c => {
                                    singleProd.centrationData[c.side] = {
                                        pd: c.pd?.toString() || '', corridor: c.corridor?.toString() || '', fittingHeight: c.fittingHeight?.toString() || ''
                                    };
                                });
                            }
                            products = [singleProd];
                        }

                        mappedValues.products = products;

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
        const getFieldData = (field, id) => {
            const configSource = field === 'tints' ? configs.tints : configs[field];
            const item = (configSource || []).find(i => i._id === id || i.id === id);
            return item ? { id: item._id || item.id, name: item.name || item.productName || item.value } : null;
        };

        const getProductNameData = (id) => {
            const item = productNames.find(p => p.value === id);
            return item ? { id, name: item.label } : { id: id || '', name: '' };
        };

        const items = [];

        values.products.forEach(prod => {
            const brandData = getFieldData('brand', prod.brandId);
            const categoryData = getFieldData('category', prod.categoryId);
            const productData = getProductNameData(prod.productName);
            const coatingData = getFieldData('coating', prod.coatingId);

            const mapEyeToItem = (side, data) => ({
                productId: prod.productName, // Assuming productId maps to the selected productName _id
                orderType: prod.productMode === 'rx' ? 'RX' : 'STOCK',
                itemName: productData?.name || '',
                category: categoryData?.name?.toUpperCase() || 'LENS',
                Brand: brandData?.name || '',
                price: parseFloat(prod.price) || 0,
                GST: parseFloat(prod.gstDetails?.gstPercent) || 0,
                QTY: parseInt(prod.qty) || 1,
                sph: parseFloat(data.sph) || 0,
                cyl: parseFloat(data.cyl) || 0,
                axis: parseFloat(data.axis) || 0,
                add: parseFloat(data.add) || 0,
                Index: parseFloat(prod.indexId) || 0,
                Coating: coatingData?.name || ''
            });

            if (prod.powerMode === 'both') {
                items.push(mapEyeToItem('R', prod.powerTable.R));
                items.push(mapEyeToItem('L', prod.powerTable.L));
            } else {
                items.push(mapEyeToItem(prod.selectedSide, prod.powerTable[prod.selectedSide]));
            }
        });

        return {
            orders: [
                {
                    orderNumber: values.orderReference || undefined,
                    items,
                    status: status.toLowerCase()
                }
            ],
            // Sending root-level fields in case other parts of the system expect the old structure
            customer: {
                customerId: values.customerId,
                customerShipToId: values.shipToId
            },
            orderReference: values.orderReference,
            consumerCardName: values.consumerCardName,
            opticianName: values.opticianName,
            status: status
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

    const searchProductsForIndex = (search = '', index) => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        searchTimeout.current = setTimeout(async () => {
            const product = formik.values.products[index];
            const brandId = product?.brandId || '';
            const categoryId = product?.categoryId || '';
            const brandName = configs.brand?.find(b => b._id === brandId)?.name || '';
            const categoryName = configs.category?.find(c => c._id === categoryId)?.name || '';

            console.log('Searching products for index:', index, { search, brand: brandName, category: categoryName });
            setLoadingProductNames(true);
            try {
                const data = await getProductNames(search, 1, 100);
                const items = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
                console.log('Fetched products:', items);
                setProductNames(items.map(p => ({
                    value: p._id || p.id || p.productName || '',
                    label: p.productName || p.name || '',
                    price: p.price || p.mrp || 0,
                    raw: p
                })));
            } catch (error) {
                console.error('Failed to fetch product names:', error);
            } finally {
                setLoadingProductNames(false);
            }
        }, 300);
    };

    const handleProductSelection = (index, selectedValue) => {
        const option = productNames.find(p => p.value === selectedValue);
        const prefix = `products.${index}.`;

        if (option && option.raw) {
            const rawProd = option.raw;
            formik.setFieldValue(`${prefix}productId`, rawProd._id || rawProd.id || '');
            formik.setFieldValue(`${prefix}productName`, rawProd.productName || rawProd.name || '');
            formik.setFieldValue(`${prefix}itemName`, rawProd.productName || rawProd.name || '');
            formik.setFieldValue(`${prefix}category`, rawProd.category || '');
            formik.setFieldValue(`${prefix}Brand`, rawProd.brand || '');
            formik.setFieldValue(`${prefix}price`, rawProd.price || 0);
            formik.setFieldValue(`${prefix}MRP`, rawProd.mrp || rawProd.MRP || 0);
            if (rawProd.qty !== undefined) formik.setFieldValue(`${prefix}qty`, rawProd.qty);

            // Map brandId and categoryId if they exist in configs
            const matchedCategory = configs.category?.find(c => c.name?.toUpperCase() === rawProd.category?.toUpperCase());
            if (matchedCategory) {
                formik.setFieldValue(`${prefix}categoryId`, matchedCategory._id);
            }
            const matchedBrand = configs.brand?.find(b => b.name?.toUpperCase() === rawProd.brand?.toUpperCase());
            if (matchedBrand) {
                formik.setFieldValue(`${prefix}brandId`, matchedBrand._id);
            }

            // Set GST details
            formik.setFieldValue(`${prefix}gstDetails`, {
                gstPercent: rawProd.gst !== undefined && rawProd.gst !== null ? rawProd.gst.toString() : '',
                gstType: rawProd.gstType || '',
                gstMode: rawProd.gstMode || '',
                gstAmount: rawProd.gstAmount || '',
                loyaltyPoints: rawProd.loyaltyPoints || '',
                advance: rawProd.advance || '',
                transactionType: rawProd.transactionType || '',
                remarks: rawProd.remarks || ''
            });

            // Set other properties
            formik.setFieldValue(`${prefix}color`, rawProd.color || '');
            formik.setFieldValue(`${prefix}size`, rawProd.size || '');
            formik.setFieldValue(`${prefix}type`, rawProd.type || '');
            formik.setFieldValue(`${prefix}shape`, rawProd.shape || '');
            formik.setFieldValue(`${prefix}material`, rawProd.material || '');
            formik.setFieldValue(`${prefix}dimensions`, rawProd.dimensions || '');
            formik.setFieldValue(`${prefix}image`, rawProd.image || '');
            formik.setFieldValue(`${prefix}code`, rawProd.productCode || rawProd.code || '');
            formik.setFieldValue(`${prefix}HSNSAC`, rawProd.hsnSac || rawProd.HSNSAC || '');

            // populate power table values from raw product if present (sph, cyl, axis, add, etc.)
            const powerTable = {
                R: {
                    sph: rawProd.sph || '',
                    cyl: rawProd.cyl || '',
                    axis: rawProd.axis || '',
                    add: rawProd.addition || rawProd.add || '',
                    dia: '70'
                },
                L: {
                    sph: rawProd.sph || '',
                    cyl: rawProd.cyl || '',
                    axis: rawProd.axis || '',
                    add: rawProd.addition || rawProd.add || '',
                    dia: '70'
                }
            };
            formik.setFieldValue(`${prefix}powerTable`, powerTable);

        } else if (selectedValue) {
            // Custom RX / freeSolo input
            formik.setFieldValue(`${prefix}productId`, '');
            formik.setFieldValue(`${prefix}productName`, selectedValue);
            formik.setFieldValue(`${prefix}itemName`, selectedValue);
        }
    };

    // Initial search and filter changes for active product
    const activeProduct = formik.values.products[activeProductIndex];
    const activeProductBrandId = activeProduct?.brandId;
    const activeProductCategoryId = activeProduct?.categoryId;

    useEffect(() => {
        if (activeProduct) {
            searchProductsForIndex('', activeProductIndex);
        }
    }, [activeProductIndex, activeProductBrandId, activeProductCategoryId]);

    // Dynamic Category Loading for active brand selection
    useEffect(() => {
        const fetchCategories = async () => {
            if (!activeProductBrandId) {
                setActiveCategories(configs.category || []);
                return;
            }

            const brandName = configs.brand?.find(b => b._id === activeProductBrandId)?.name || '';
            if (brandName) {
                try {
                    const filteredCats = await getCategoriesByBrand(brandName);
                    setActiveCategories(filteredCats);
                } catch (err) {
                    console.error('Failed to filter categories:', err);
                }
            } else {
                setActiveCategories(configs.category || []);
            }
        };
        fetchCategories();
    }, [activeProductBrandId, configs.brand, configs.category]);

    useEffect(() => {
        console.log('Selected Product Name for active row:', activeProduct?.productName);
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
                size="small"
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
                if (!values.products || values.products.length === 0) return false;
                return !errors.products;
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
            ['products'], // Step 2
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

    const renderActiveProductDetails = (index) => {
        const product = formik.values.products[index];
        const prefix = `products.${index}.`;

        return (
            <div className="space-y-4 p-4 bg-gray-50/30 rounded-xl border border-gray-100">
                {/* Toggles Row */}
                <div className="flex flex-wrap gap-4 items-center justify-start bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                    <CustomToggle
                        label="Power Details"
                        value={product.powerMode}
                        onChange={(v) => formik.setFieldValue(`${prefix}powerMode`, v)}
                        options={[{ label: 'Single', value: 'single' }, { label: 'Both', value: 'both' }]}
                        containerClassName="flex-1 md:flex-none min-w-[200px]"
                    />

                    {/* <CustomToggle
                        label="Product Type"
                        value={product.productMode}
                        onChange={(v) => formik.setFieldValue(`${prefix}productMode`, v)}
                        options={[{ label: 'Stock Lens', value: 'stock' }, { label: 'Rx', value: 'rx' }]}
                        containerClassName="flex-1 md:flex-none min-w-[220px]"
                    /> */}
                    <CustomToggle
                        label="Has Prism"
                        value={product.hasPrism}
                        onChange={(v) => formik.setFieldValue(`${prefix}hasPrism`, v)}
                        options={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }]}
                        containerClassName="flex-1 md:flex-none min-w-[180px]"
                    />
                </div>

                {/* Power & Prism Tables Row */}
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Main Power Table */}
                    <div className="flex-1 bg-gray-50/50 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="grid grid-cols-6 bg-gray-100/80 border-b border-gray-200">
                            {['SIDE', 'SPH', 'CYLD', 'AXIS', 'ADD', 'DIAMETER'].map(h => (
                                <div key={h} className="py-2 text-[11px] font-black uppercase text-gray-500 text-center border-r border-gray-200 last:border-r-0">{h}</div>
                            ))}
                        </div>
                        {['R', 'L'].map((side) => {
                            const isDisabled = product.powerMode === 'single' && product.selectedSide !== side;

                            return (
                                <div key={side} className={`grid grid-cols-6 border-b border-gray-100 last:border-b-0 items-center ${side === 'L' ? 'bg-erp-accent/5/20' : ''} ${isDisabled ? 'opacity-30' : ''}`}>
                                    <div
                                        className={`py-1.5 flex flex-col items-center justify-center border-r border-gray-100 gap-1 overflow-hidden transition-all duration-300 ${product.powerMode === 'single' ? 'cursor-pointer hover:bg-erp-accent/5/50' : ''}`}
                                        onClick={() => {
                                            if (product.powerMode === 'single') {
                                                formik.setFieldValue(`${prefix}selectedSide`, side);
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            {product.powerMode === 'single' && (
                                                <div className={`w-3 h-3 rounded-sm border transition-all flex items-center justify-center ${product.selectedSide === side ? 'bg-erp-accent border-erp-accent shadow-sm' : 'bg-white border-gray-200'}`}>
                                                    {product.selectedSide === side && <Icon icon="mdi:check" className="text-white text-[10px]" />}
                                                </div>
                                            )}
                                            <span className={`font-black text-xs ${product.powerMode === 'single' && product.selectedSide === side ? 'text-erp-accent' : 'text-gray-500'}`}>{side}</span>
                                        </div>
                                    </div>
                                    {['sph', 'cyl', 'axis', 'add', 'dia'].map(field => (
                                        <div key={field} className="p-1">
                                            <input
                                                type="text"
                                                name={`${prefix}powerTable.${side}.${field}`}
                                                value={product.powerTable[side][field]}
                                                onChange={formik.handleChange}
                                                disabled={isDisabled}
                                                className="w-full h-8 border border-gray-200 rounded bg-white text-center text-xs font-bold text-gray-700 focus:outline-none focus:border-erp-accent focus:ring-1 focus:ring-erp-accent transition-all disabled:cursor-not-allowed"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>

                    {/* Prism Table */}
                    {product.hasPrism === 'yes' && (
                        <div className="w-full lg:w-80 bg-gray-50/50 border border-gray-200 rounded-xl overflow-hidden shadow-sm animate-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-3 bg-gray-100/80 border-b border-gray-200">
                                {['SIDE', 'PRISM', 'BASE SEL.'].map(h => (
                                    <div key={h} className="py-2 text-[11px] font-black uppercase text-gray-500 text-center border-r border-gray-200 last:border-r-0">{h}</div>
                                ))}
                            </div>
                            {['R', 'L'].map((side) => {
                                const isDisabled = product.powerMode === 'single' && product.selectedSide !== side;
                                return (
                                    <div key={side} className={`grid grid-cols-3 border-b border-gray-100 last:border-b-0 items-center ${isDisabled ? 'opacity-30' : ''}`}>
                                        <div
                                            className={`py-1.5 flex flex-col items-center justify-center border-r border-gray-100 gap-1 overflow-hidden transition-all duration-300 ${product.powerMode === 'single' ? 'cursor-pointer hover:bg-erp-accent/5/50' : ''}`}
                                            onClick={() => {
                                                if (product.powerMode === 'single') {
                                                    formik.setFieldValue(`${prefix}selectedSide`, side);
                                                }
                                            }}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                {product.powerMode === 'single' && (
                                                    <div className={`w-3 h-3 rounded-sm border transition-all flex items-center justify-center ${product.selectedSide === side ? 'bg-erp-accent border-erp-accent shadow-sm' : 'bg-white border-gray-200'}`}>
                                                        {product.selectedSide === side && <Icon icon="mdi:check" className="text-white text-[10px]" />}
                                                    </div>
                                                )}
                                                <span className={`font-black text-xs ${product.powerMode === 'single' && product.selectedSide === side ? 'text-erp-accent' : 'text-gray-500'}`}>{side}</span>
                                            </div>
                                        </div>
                                        <div className="p-1">
                                            <input
                                                type="text"
                                                name={`${prefix}prismTable.${side}.prism`}
                                                value={product.prismTable[side].prism}
                                                onChange={formik.handleChange}
                                                disabled={isDisabled}
                                                className="w-full h-8 border border-gray-200 rounded bg-white text-center text-xs font-bold text-gray-700 focus:outline-none focus:border-erp-accent focus:ring-1 focus:ring-erp-accent transition-all disabled:cursor-not-allowed"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="p-1">
                                            <input
                                                type="text"
                                                name={`${prefix}prismTable.${side}.base`}
                                                value={product.prismTable[side].base}
                                                onChange={formik.handleChange}
                                                disabled={isDisabled}
                                                className="w-full h-8 border border-gray-200 rounded bg-white text-center text-xs font-bold text-gray-700 focus:outline-none focus:border-erp-accent focus:ring-1 focus:ring-erp-accent transition-all disabled:cursor-not-allowed"
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    {wrapInput(SearchableSelect, {
                        label: "Select Brand",
                        name: `${prefix}brandId`,
                        options: (Array.isArray(configs.brand) ? configs.brand : []).map(b => ({ value: b._id, label: b.name })),
                        placeholder: "Select Brand"
                    })}
                    {wrapInput(SearchableSelect, {
                        label: "Select Category",
                        name: `${prefix}categoryId`,
                        options: (Array.isArray(configs.category) ? configs.category : []).map(c => ({ value: c._id, label: c.name })),
                        placeholder: "Select Category",
                        disabled: !product.brandId
                    })}
                    <div className="md:col-span-1">
                        <SearchableSelect
                            label="Product Name"
                            name={`${prefix}productName`}
                            value={product.productName}
                            onChange={(e) => formik.setFieldValue(`${prefix}productName`, e.target.value)}
                            onSearch={(q) => searchProducts(q)}
                            options={productNames}
                            loading={loadingProductNames}
                            placeholder="Search Product Name (e.g. Polarised)..."
                            disabled={!product.brandId || !product.categoryId || isReadOnly}
                        />
                    </div>

                    {wrapInput(Select, {
                        label: "Treatment",
                        name: `${prefix}treatmentId`,
                        placeholder: "Treatment",
                        options: (Array.isArray(configs.treatment) ? configs.treatment : []).map(t => ({ value: t._id, label: t.name }))
                    })}
                    {wrapInput(Select, {
                        label: "Index",
                        name: `${prefix}indexId`,
                        placeholder: "Index",
                        options: (Array.isArray(configs.index) ? configs.index : []).map(i => {
                            const val = i.value?.toString() || i.toString() || '';
                            return { value: val, label: val };
                        })
                    })}

                    {wrapInput(Select, {
                        label: "Coating",
                        name: `${prefix}coatingId`,
                        placeholder: "Coating",
                        options: (Array.isArray(configs.coating) ? configs.coating : []).map(c => ({ value: c._id, label: c.name }))
                    })}
                    {wrapInput(Select, {
                        label: "Tint",
                        name: `${prefix}tintId`,
                        placeholder: "Tint",
                        options: (Array.isArray(configs.tints) ? configs.tints : []).map(t => ({ value: t._id, label: t.name }))
                    })}
                    {wrapInput(Input, {
                        label: "Tint Details",
                        name: `${prefix}tintDetails`,
                        placeholder: "Tint Details"
                    })}
                    {wrapInput(Input, {
                        label: "Remarks",
                        name: `${prefix}remarks`,
                        placeholder: "Enter Remarks"
                    })}

                    {/* Mirror Toggle inside grid for neat alignment */}
                    <div className="flex items-center">
                        <CustomToggle
                            label="Mirror"
                            value={product.hasMirror}
                            onChange={(v) => formik.setFieldValue(`${prefix}hasMirror`, v)}
                            options={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }]}
                            containerClassName="w-full md:w-auto"
                        />
                    </div>
                </div>

                {/* Centration Table */}
                <div className="space-y-2 mt-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm max-w-4xl">
                    <h4 className="text-xs font-black uppercase tracking-widest text-erp-accent">Centration Data</h4>
                    <div className="bg-gray-50/50 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="grid grid-cols-4 bg-gray-100/80 border-b border-gray-200">
                            {['SIDE', 'PD', 'CORRIDOR', 'FITTING HEIGHT'].map(h => (
                                <div key={h} className="py-2 text-[11px] font-black uppercase text-gray-500 text-center border-r border-gray-200 last:border-r-0">{h}</div>
                            ))}
                        </div>
                        {['R', 'L'].map((side) => {
                            const isDisabled = product.powerMode === 'single' && product.selectedSide !== side;
                            return (
                                <div key={side} className={`grid grid-cols-4 border-b border-gray-100 last:border-b-0 items-center ${isDisabled ? 'opacity-30' : ''}`}>
                                    <div className="py-1.5 font-black text-xs text-gray-500 text-center border-r border-gray-100 ">{side}</div>
                                    {['pd', 'corridor', 'fittingHeight'].map(field => (
                                        <div key={field} className="p-1">
                                            <input
                                                type="text"
                                                name={`${prefix}centrationData.${side}.${field}`}
                                                value={product.centrationData[side][field]}
                                                onChange={formik.handleChange}
                                                disabled={isDisabled}
                                                className="w-full h-8 border border-gray-200 rounded bg-white text-center text-xs font-bold text-gray-700 focus:outline-none focus:border-erp-accent focus:ring-1 focus:ring-erp-accent transition-all disabled:cursor-not-allowed"
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
    };

    const handleConfirmRemove = () => {
        const index = deleteModalState.indexToRemove;
        if (index !== null) {
            const newProducts = [...formik.values.products];
            newProducts.splice(index, 1);
            formik.setFieldValue('products', newProducts);

            if (activeProductIndex >= index) {
                setActiveProductIndex(Math.max(0, activeProductIndex - 1));
            }
            setExpandedProductIndices(prev => prev.filter(i => i !== index).map(i => i > index ? i - 1 : i));
        }
        setDeleteModalState({ isOpen: false, indexToRemove: null });
    };

    const toggleExpandRow = (index, event) => {
        event.stopPropagation();
        if (expandedProductIndices.includes(index)) {
            setExpandedProductIndices(expandedProductIndices.filter(i => i !== index));
        } else {
            setExpandedProductIndices([...expandedProductIndices, index]);
        }
    };

    const renderProductDetails = () => (
        <FieldArray name="products">
            {({ push, remove }) => (
                <div className="w-full bg-white rounded-b-2xl border-gray-50  ">
                    <div className="w-full border border-gray-200 rounded-xl relative overflow-auto overflow-auto max-h-[60vh]">
                        <table className="w-full min-w-max text-left border-collapse">
                            <thead className="sticky top-0 z-10 shadow-sm outline outline-1 outline-gray-200">
                                <tr className="bg-erp-accent text-white text-xs uppercase tracking-wider">
                                    <th className="p-3 font-semibold border-r border-blue-400/30 text-center">S. No.</th>
                                    <th className="p-3 font-semibold border-r border-blue-400/30">Particulars / Item</th>
                                    <th className="p-3 font-semibold border-r border-blue-400/30 text-center">Category</th>
                                    <th className="p-3 font-semibold border-r border-blue-400/30 text-center">Spl.</th>
                                    <th className="p-3 font-semibold border-r border-blue-400/30 text-center">Cyl.</th>
                                    <th className="p-3 font-semibold border-r border-blue-400/30 text-center">Axis</th>
                                    <th className="p-3 font-semibold border-r border-blue-400/30 text-center">Add</th>
                                    <th className="p-3 font-semibold border-r border-blue-400/30 text-center">Unit</th>
                                    <th className="p-3 font-semibold border-r border-blue-400/30 text-center">Order Type</th>
                                    <th className="p-3 font-semibold border-r border-blue-400/30 text-center">Qty</th>
                                    <th className="p-3 font-semibold border-r border-blue-400/30 text-center">Price</th>
                                    <th className="p-3 font-semibold border-r border-blue-400/30 text-center">Disc</th>
                                    <th className="p-3 font-semibold border-r border-blue-400/30 text-center">GST %</th>
                                    <th className="p-3 font-semibold border-r border-blue-400/30 text-center">GST Amt</th>
                                    <th className="p-3 font-semibold border-r border-blue-400/30 text-center">Amount</th>
                                    <th className="p-3 font-semibold text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {formik.values.products.map((product, index) => {
                                    const isActive = activeProductIndex === index;
                                    const isExpanded = expandedProductIndices.includes(index);

                                    const categoryName = product.category || configs.category?.find(c => c._id === product.categoryId)?.name || '-';
                                    const brandName = product.Brand || product.brand || configs.brand?.find(b => b._id === product.brandId)?.name || '-';

                                    const renderPowerField = (field) => {
                                        if (product.powerMode === 'single') return product.powerTable[product.selectedSide]?.[field] || '';
                                        return `${product.powerTable.R?.[field] || ''} / ${product.powerTable.L?.[field] || ''}`;
                                    };

                                    const unitMultiplier = product.unit === 'pair' ? 2 : product.unit === 'box' ? 10 : 1;
                                    const taxableAmount = (Number(product.price || 0) * Number(product.qty || 0) * unitMultiplier) - Number(product.discount || 0);
                                    const gstPercent = Number(product.gstDetails?.gstPercent || 0);
                                    const gstAmt = taxableAmount > 0 ? taxableAmount * (gstPercent / 100) : 0;
                                    const totalAmount = taxableAmount > 0 ? taxableAmount + gstAmt : 0;

                                    return (
                                        <React.Fragment key={index}>
                                            <tr
                                                className={`cursor-pointer transition-colors border-b border-gray-200 hover:bg-blue-50/50 ${isActive ? 'bg-blue-50' : 'bg-white'}`}
                                                onClick={() => setActiveProductIndex(index)}
                                            >
                                                <td className="p-3 text-xs font-semibold text-gray-700 text-center border-r border-gray-200">{index + 1}</td>
                                                <td className="p-2 border-r border-gray-200 min-w-[250px]">
                                                    <SearchableSelect
                                                        name={`products.${index}.productName`}
                                                        value={product.productName}
                                                        onChange={(e) => handleProductSelection(index, e.target.value)}
                                                        onSearch={(q) => searchProductsForIndex(q, index)}
                                                        options={productNames}
                                                        loading={loadingProductNames}
                                                        placeholder="Search Product Name..."
                                                        freeSolo
                                                        disableClearable
                                                        sx={{
                                                            '& .MuiOutlinedInput-root': {
                                                                padding: '2px !important',
                                                                fontSize: '0.85rem',
                                                            },
                                                            '& .MuiInputLabel-root': {
                                                                display: 'none',
                                                            }
                                                        }}
                                                    />
                                                </td>
                                                <td className="p-3 text-xs font-semibold text-gray-700 text-center border-r border-gray-200 whitespace-nowrap">{categoryName}</td>
                                                <td className="p-3 text-xs font-semibold text-gray-700 text-center border-r border-gray-200 whitespace-nowrap">{renderPowerField('sph')}</td>
                                                <td className="p-3 text-xs font-semibold text-gray-700 text-center border-r border-gray-200 whitespace-nowrap">{renderPowerField('cyl')}</td>
                                                <td className="p-3 text-xs font-semibold text-gray-700 text-center border-r border-gray-200 whitespace-nowrap">{renderPowerField('axis')}</td>
                                                <td className="p-3 text-xs font-semibold text-gray-700 text-center border-r border-gray-200 whitespace-nowrap">{renderPowerField('add')}</td>

                                                <td className="p-2 border-r border-gray-200 min-w-[100px]">
                                                    <select
                                                        className="w-full text-xs text-center bg-transparent border border-gray-200 rounded p-1.5 outline-none focus:border-erp-accent transition-colors"
                                                        name={`products.${index}.unit`}
                                                        value={product.unit || 'piece'}
                                                        onChange={formik.handleChange}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <option value="piece">Piece</option>
                                                        <option value="pair">Pair</option>
                                                        <option value="box">Box</option>
                                                    </select>
                                                </td>
                                                <td className="p-2 border-r border-gray-200 min-w-[80px]">
                                                    <select
                                                        className="w-full text-xs text-center bg-transparent border border-gray-200 rounded p-1.5 outline-none focus:border-erp-accent transition-colors"
                                                        name={`products.${index}.orderType`}
                                                        value={product.orderType || 'stock'}
                                                        onChange={formik.handleChange}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <option value="stock">Stock</option>
                                                        <option value="rx">Rx</option>
                                                    </select>
                                                </td>
                                                <td className="p-2 border-r border-gray-200 min-w-[80px]">
                                                    <input
                                                        type="number"
                                                        className="w-full text-xs text-center bg-transparent border border-gray-200 rounded p-1.5 outline-none focus:border-erp-accent"
                                                        name={`products.${index}.qty`}
                                                        value={product.qty}
                                                        onChange={formik.handleChange}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </td>
                                                <td className="p-2 border-r border-gray-200 min-w-[110px]">
                                                    <input
                                                        type="number"
                                                        className="w-full text-xs text-center bg-transparent border border-gray-200 rounded p-1.5 outline-none focus:border-erp-accent transition-colors"
                                                        name={`products.${index}.price`}
                                                        value={product.price}
                                                        onChange={formik.handleChange}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </td>
                                                <td className="p-2 border-r border-gray-200 min-w-[90px]">
                                                    <input
                                                        type="number"
                                                        className="w-full text-xs text-center bg-transparent border border-gray-200 rounded p-1.5 outline-none focus:border-erp-accent transition-colors"
                                                        name={`products.${index}.discount`}
                                                        value={product.discount}
                                                        onChange={formik.handleChange}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </td>
                                                <td className="p-2 border-r border-gray-200 min-w-[90px]">
                                                    <input
                                                        type="number"
                                                        className="w-full text-xs text-center bg-transparent border border-gray-200 rounded p-1.5 outline-none focus:border-erp-accent transition-colors"
                                                        name={`products.${index}.gstDetails.gstPercent`}
                                                        value={product.gstDetails?.gstPercent}
                                                        onChange={formik.handleChange}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </td>
                                                <td className="p-3 text-xs font-semibold text-gray-700 text-center border-r border-gray-200">
                                                    {gstAmt.toFixed(2)}
                                                </td>
                                                <td className="p-3 text-xs font-bold text-erp-accent text-center border-r border-gray-200">
                                                    {totalAmount.toFixed(2)}
                                                </td>
                                                <td className="p-2 text-center w-24">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => toggleExpandRow(index, e)}
                                                            className="text-gray-500 hover:text-gray-700 transition-colors bg-gray-100 hover:bg-gray-200 p-1 rounded-full"
                                                        >
                                                            <Icon icon={isExpanded ? "mdi:chevron-up" : "mdi:chevron-down"} className="text-xl" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (formik.values.products.length > 1) {
                                                                    setDeleteModalState({ isOpen: true, indexToRemove: index });
                                                                }
                                                            }}
                                                            className="text-red-400 hover:text-red-600 transition-colors bg-red-50 hover:bg-red-100 p-1.5 rounded-full"
                                                        >
                                                            <Icon icon="mdi:close" className="text-sm" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {isExpanded && (
                                                <tr className="bg-white border-b-2 border-blue-400 shadow-inner">
                                                    <td colSpan="15" className="p-3 bg-blue-50/20">
                                                        {renderActiveProductDetails(index)}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-center items-center gap-4 my-6 p-4 bg-gray-50/80 rounded-xl border border-gray-100">
                        <span className="text-sm text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Icon icon="mdi:table-row-plus-after" className="text-xl text-erp-accent" />
                            Add Rows:
                        </span>
                        <div className="flex gap-3">
                            {[1, 5, 10, 20, 50].map((num) => (
                                <button
                                    key={num}
                                    type="button"
                                    onClick={() => {
                                        const newRows = Array(num).fill(null).map(() => ({ ...productTemplate }));
                                        formik.setFieldValue('products', [...formik.values.products, ...newRows]);
                                        setActiveProductIndex(formik.values.products.length);
                                    }}
                                    className="px-5 py-2 rounded-xl border-2 border-blue-100 text-erp-accent bg-white hover:bg-blue-50 hover:border-blue-400 transition-all text-sm font-black shadow-sm active:scale-95 flex items-center gap-1"
                                >
                                    <Icon icon="mdi:plus" className="text-lg" /> {num}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Order Summary & GST section */}
                    {formik.values.products[activeProductIndex] && (
                        <div className="flex flex-col lg:flex-row gap-8 items-start bg-gray-50/50 p-6 rounded-2xl border border-gray-200">
                            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div className="space-y-4 col-span-full md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-6">
                                    {/* {wrapInput(Input, { label: "GST%", name: `products.${activeProductIndex}.gstDetails.gstPercent` })} */}
                                    {wrapInput(Input, { label: "GST Type", name: `products.${activeProductIndex}.gstDetails.gstType` })}
                                    {wrapInput(Input, { label: "CGST Amount", name: `products.${activeProductIndex}.gstDetails.cgstAmount` })}
                                    {wrapInput(Input, { label: "SGST Amount", name: `products.${activeProductIndex}.gstDetails.sgstAmount` })}
                                    {/* {wrapInput(Input, { label: "GST Mode", name: `products.${activeProductIndex}.gstDetails.gstMode` })} */}
                                    {wrapInput(Input, { label: "Total GST", name: `products.${activeProductIndex}.gstDetails.gstPercent` })}
                                </div>
                                <div className="space-y-4 col-span-full md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-6">
                                    {wrapInput(Input, { label: "Advance", name: `products.${activeProductIndex}.gstDetails.advance` })}
                                    {wrapInput(Input, { label: "Transaction Type", name: `products.${activeProductIndex}.gstDetails.transactionType` })}
                                    <div className="col-span-2">
                                        {wrapInput(Input, { label: "Remarks", name: `products.${activeProductIndex}.gstDetails.remarks` })}
                                    </div>
                                </div>
                            </div>

                            <div className="w-full lg:w-72 bg-blue-50/30 border border-blue-200 rounded-2xl p-6 shadow-sm">
                                <h3 className="font-black text-gray-800 mb-6">Order Summary</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center pb-3 border-b border-gray-200/50">
                                        <span className="text-sm font-semibold text-gray-600">Price</span>
                                        <span className="text-sm font-black text-gray-900">₹{formik.values.products.reduce((acc, curr) => {
                                            const multiplier = curr.unit === 'pair' ? 2 : curr.unit === 'box' ? 10 : 1;
                                            return acc + ((parseFloat(curr.price) || 0) * (parseFloat(curr.qty) || 1) * multiplier);
                                        }, 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-3 border-b border-gray-200/50">
                                        <span className="text-sm font-semibold text-gray-600">Loyalty Points</span>
                                        <span className="text-sm font-black text-gray-900">₹0.00</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-3 border-b border-gray-200/50">
                                        <span className="text-sm font-semibold text-gray-600">Gross Total</span>
                                        <span className="text-sm font-black text-gray-900">₹{formik.values.products.reduce((acc, curr) => acc + (parseFloat(curr.price) || 0) * (parseFloat(curr.qty) || 1), 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-base font-black text-gray-800">Final Total</span>
                                        <span className="text-lg font-black text-[#3b82f6]">₹{formik.values.products.reduce((acc, curr) => {
                                            const multiplier = curr.unit === 'pair' ? 2 : curr.unit === 'box' ? 10 : 1;
                                            return acc + ((parseFloat(curr.price) || 0) * (parseFloat(curr.qty) || 1) * multiplier) - (parseFloat(curr.discount) || 0);
                                        }, 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </FieldArray>
    );

    const renderAdvancedDetails = () => (
        <div className="p-4 space-y-4 bg-white rounded-b-2xl border-t border-gray-50">
            {/* Fitting Selection */}
            <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-erp-accent ">Advanced Fitting Data</h4>
                <CustomToggle
                    label="Has Flat Fitting"
                    value={formik.values.hasFlatFitting}
                    onChange={(v) => formik.setFieldValue('hasFlatFitting', v)}
                    options={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }]}
                    containerClassName="w-48"
                />

                {/* Conditional Frame Specifications */}
                {formik.values.hasFlatFitting === 'yes' && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-4 p-4 border border-orange-100 rounded-xl">
                        <div className="col-span-full">
                            <h3 className="text-xs font-black text-erp-accent/80 uppercase tracking-[0.1em] mb-2 flex items-center gap-2">
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4 p-4 bg-gray-50/50 border border-gray-100 rounded-xl">
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4">
                    {wrapInput(Input, { label: "Direct Customer", name: "directCustomer", placeholder: "Direct Customer" })}
                    {wrapInput(Input, { label: "Shipping Charges", name: "shippingCharges", placeholder: "Shipping Charges" })}
                    {wrapInput(Input, { label: "Other Charges", name: "otherCharges", placeholder: "Other Charges" })}
                </div>
            </div>
        </div>
    );

    return (
        <div className="h-full bg-gray-50/50  text-sm">


            <div className="max-w-full mx-auto">
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
                                            <div className="px-4 pt-0">
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

            <ConfirmationModal
                isOpen={deleteModalState.isOpen}
                onClose={() => setDeleteModalState({ isOpen: false, indexToRemove: null })}
                onConfirm={handleConfirmRemove}
                title="Remove Product"
                message="Are you sure you want to remove this product?"
                confirmText="Remove"
            />
        </div>
    );
};

export default OrderWizard;


