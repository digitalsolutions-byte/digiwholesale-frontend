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
    getProductById,
    resolveProductBase,
    createBulkOrders,
    getCategoriesByBrand
} from '../services/orderService';
import { getAllVendors } from '../services/vendorService';
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
        productMode: 'stock',
        orderType: 'stock',
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
        vendorId: '',
        labName: '',
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
        },
        // Lens / RX fitting fields (only used when orderType=rx and category=LENS)
        hasFlatFitting: 'no',
        dbl: '',
        frameType: '',
        frameLength: '',
        frameHeight: '',
        pantoscopicAngle: '',
        bowAngle: '',
        bvd: '',
        expiry: '',
        productCode: '',
        image: '',
        color: '',
        size: '',
        type: '',
        shape: '',
        material: '',
        dimensions: '',
        Brand: '',
        MRP: 0,
        HSNSAC: ''
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

        // Step 3: Shipping only
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
                orderType: Yup.string(),
                productName: Yup.string().required('Product selection is required'),
                brandId: Yup.string().when('orderType', {
                    is: 'rx',
                    then: (schema) => isEditMode ? schema.notRequired() : schema.required('Brand is required'),
                    otherwise: (schema) => schema.notRequired()
                }),
                categoryId: Yup.string().when('orderType', {
                    is: 'rx',
                    then: (schema) => isEditMode ? schema.notRequired() : schema.required('Category is required'),
                    otherwise: (schema) => schema.notRequired()
                }),
                indexId: Yup.string().test('is-index-required', 'Lens Index is required', function (value) {
                    const { orderType, categoryId } = this.parent;
                    if (orderType !== 'rx') return true;

                    const categoryObj = configs?.category?.find(c => c._id === categoryId);
                    const catName = (categoryObj?.name || '').toUpperCase();
                    if (catName.includes('LENS') || catName.includes('CONTACT')) {
                        return !!value;
                    }
                    return true;
                }),
            })
        ),

        // Step 3: Shipping & Others (no required fields)
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
                    const patchPayload = {
                        submitNow: true,
                        orders: payload.orders,
                        customerShipToId: payload.customerShipToId
                    };
                    res = await updateOrder(id, patchPayload);
                } else {
                    res = await createBulkOrders(payload);
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
                        const sourceItems = order.orders?.[0]?.items || order.products;
                        
                        if (sourceItems && sourceItems.length > 0) {
                            products = sourceItems.map(prod => {
                                const isRx = prod.orderType === 'RX' || prod.productMode?.toLowerCase() === 'rx' || false;
                                
                                // if the prod comes from items array, powers and prisms are inside rx
                                const rxData = prod.rx || {};
                                const powersSource = rxData.powers?.length > 0 ? rxData.powers : prod.powers;
                                const prismsSource = rxData.prisms?.length > 0 ? rxData.prisms : prod.prisms;
                                const centrationSource = rxData.centration?.length > 0 ? rxData.centration : (prod.centration || prod.centrations);
                                
                                const prodMapped = {
                                    ...productTemplate,
                                    scan: prod.scan || '',
                                    qty: prod.qty || 1,
                                    price: prod.price || 0,
                                    discount: prod.discountAmount !== undefined ? prod.discountAmount : (prod.discount || 0),
                                    powerMode: powersSource?.length === 1 ? 'single' : 'both',
                                    productMode: isRx ? 'rx' : 'stock',
                                    orderType: isRx ? 'rx' : 'stock',
                                    hasPrism: (prod.hasPrism || prismsSource?.length > 0) ? 'yes' : 'no',
                                    selectedSide: powersSource?.[0]?.side || 'R',
                                    brandId: prod.brand?.id || prod.brand || '',
                                    categoryId: prod.category?.id || '',
                                    category: prod.category?.name || prod.category || '',
                                    treatmentId: prod.treatment?.id || '',
                                    indexId: (prod.index !== undefined && prod.index !== null) ? prod.index.toString() : '',
                                    index: (prod.index !== undefined && prod.index !== null) ? prod.index.toString() : '',
                                    productId: prod.productId || prod.productName?.id || '',
                                    productName: prod.itemName || prod.productName?.name || prod.productName?.id || '',
                                    itemName: prod.itemName || prod.productName?.name || '',
                                    lensTypeId: prod.productType?.id || '',
                                    coatingId: prod.coating?.id || '',
                                    coating: prod.coating?.name || prod.coating || '',
                                    tintId: prod.tint?.id || '',
                                    tint: prod.tint?.name || prod.tint || '',
                                    tintDetails: prod.tintDetails || rxData.tintDetails || '',
                                    remarks: prod.remarks || rxData.remarks || '',
                                    hasMirror: (prod.mirror || rxData.mirror) ? 'yes' : 'no',
                                    gstDetails: prod.gstDetails || {
                                        gstPercent: prod.gst?.toString() || '', 
                                        gstType: '', gstMode: '', gstAmount: '',
                                        loyaltyPoints: '', advance: '', transactionType: '', remarks: ''
                                    },
                                    HSNSAC: prod.hsnSac || prod.HSNSAC || '',
                                    MRP: prod.mrp || prod.MRP || 0,
                                    unit: prod.unit?.toLowerCase() || 'piece',
                                    
                                    // Add raw spherical powers if present
                                    sph: prod.sph !== undefined ? prod.sph : '',
                                    cyl: prod.cyl !== undefined ? prod.cyl : '',
                                    axis: prod.axis !== undefined ? prod.axis : '',
                                    add: prod.add !== undefined ? prod.add : '',

                                    // Map fitting/lensData from rx object
                                    hasFlatFitting: rxData.fitting?.hasFlatFitting ? 'yes' : 'no',
                                    dbl: rxData.fitting?.dbl?.toString() || '',
                                    frameType: rxData.fitting?.frameType || '',
                                    frameLength: rxData.fitting?.frameLength?.toString() || '',
                                    frameHeight: rxData.fitting?.frameHeight?.toString() || '',
                                    pantoscopicAngle: rxData.lensData?.pantoscopeAngle?.toString() || '',
                                    bowAngle: rxData.lensData?.bowAngle?.toString() || '',
                                    bvd: rxData.lensData?.bvd?.toString() || ''
                                };

                                if (powersSource) {
                                    powersSource.forEach(p => {
                                        prodMapped.powerTable[p.side] = {
                                            sph: p.sph?.toString() || '', cyl: p.cyl?.toString() || '',
                                            axis: p.axis?.toString() || '', add: p.add?.toString() || '',
                                            dia: p.diameter?.toString() || '70'
                                        };
                                    });
                                } else if (prod.sph !== undefined || prod.cyl !== undefined) {
                                    // Map root powers to both tables as fallback
                                    const fallbackPower = {
                                        sph: prod.sph?.toString() || '',
                                        cyl: prod.cyl?.toString() || '',
                                        axis: prod.axis?.toString() || '',
                                        add: prod.add?.toString() || '',
                                        dia: '70'
                                    };
                                    prodMapped.powerTable.R = { ...fallbackPower };
                                    prodMapped.powerTable.L = { ...fallbackPower };
                                }
                                
                                if (prismsSource) {
                                    prismsSource.forEach(p => {
                                        prodMapped.prismTable[p.side] = { prism: p.prism || '', base: p.base || '' };
                                    });
                                }
                                
                                if (centrationSource) {
                                    centrationSource.forEach(c => {
                                        prodMapped.centrationData[c.side] = {
                                            pd: c.pd?.toString() || '', corridor: c.corridor?.toString() || '',
                                            fittingHeight: c.fittingHeight?.toString() || ''
                                        };
                                    });
                                }
                                return prodMapped;
                            });
                        } else {
                            // Fallback to single product from root (legacy)
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
                                productId: order.productName?.id || '',
                                productName: order.productName?.name || order.productName?.id || '',
                                itemName: order.productName?.name || '',
                                lensTypeId: order.productType?.id || '',
                                coatingId: order.coating?.id || '',
                                tintId: order.tint?.id || '',
                                tintDetails: order.tintDetails || '',
                                remarks: order.remarks || '',
                                hasMirror: order.mirror ? 'yes' : 'no',
                                // Map fitting/lensData from rx object
                                hasFlatFitting: order.rx?.fitting?.hasFlatFitting ? 'yes' : 'no',
                                dbl: order.rx?.fitting?.dbl?.toString() || '',
                                frameType: order.rx?.fitting?.frameType || '',
                                frameLength: order.rx?.fitting?.frameLength?.toString() || '',
                                frameHeight: order.rx?.fitting?.frameHeight?.toString() || '',
                                pantoscopicAngle: order.rx?.lensData?.pantoscopeAngle?.toString() || '',
                                bowAngle: order.rx?.lensData?.bowAngle?.toString() || '',
                                bvd: order.rx?.lensData?.bvd?.toString() || ''
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
                        mappedValues.orderReference = order.orderReference || order.orders?.[0]?.orderNumber || '';

                        // Inject the current order's product into the options list 
                        // so the searchable select can resolve the label immediately
                        const itemsForInjection = order.orders?.[0]?.items || order.products || (order.productName ? [order] : []);
                        if (itemsForInjection.length > 0) {
                            setProductNames(prev => {
                                let newPrev = [...prev];
                                itemsForInjection.forEach(item => {
                                    const id = item.productId || item.productName?.id || item.productName;
                                    const name = item.itemName || item.productName?.name || item.productName;
                                    const price = item.price || 0;
                                    
                                    if (id && !newPrev.find(p => p.value === id)) {
                                        newPrev.push({
                                            value: id,
                                            label: name || id,
                                            price: price
                                        });
                                    }
                                });
                                return newPrev;
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
            return item ? { id, name: item.label } : { id: id || '', name: id || '' };
        };

        const determineCategory = (categoryName, prodName) => {
            const name = (categoryName || '').toUpperCase();
            const prodNameUpper = (prodName || '').toUpperCase();
            if (name === 'FRAME') return 'FRAME';
            if (name === 'SUNGLASS') return 'SUNGLASS';
            if (name.includes('CONTACT') || prodNameUpper.includes('CONTACT')) return 'CONTACT_LENS';
            // Return original category name for custom categories like LENS
            return name;
        };

        const items = values.products.map(prod => {
            const brandData = getFieldData('brand', prod.brandId);
            const categoryData = getFieldData('category', prod.categoryId);
            const productData = getProductNameData(prod.productName);
            const coatingData = getFieldData('coating', prod.coatingId);
            const tintData = getFieldData('tints', prod.tintId);
            const treatmentData = getFieldData('treatment', prod.treatmentId);

            const isRx = prod.orderType === 'rx';
            const cat = determineCategory(categoryData?.name, productData?.name);

            // Calculate discount details
            const discountAmount = parseFloat(prod.discount) || 0;
            const price = parseFloat(prod.price) || 0;
            const qty = parseInt(prod.qty) || 1;
            const unitMultiplier = prod.unit === 'pair' ? 2 : prod.unit === 'box' ? 10 : 1;
            const totalBeforeDiscount = price * qty * unitMultiplier;
            const discountPercent = totalBeforeDiscount > 0 ? parseFloat(((discountAmount / totalBeforeDiscount) * 100).toFixed(2)) : 0;

            const baseItem = {
                productId: prod.productId || prod.productName || undefined,
                unit: (prod.unit || 'piece').toUpperCase(),
                orderType: isRx ? 'RX' : 'STOCK',
                itemName: productData?.name || prod.productName || '',
                qty: qty,
                category: cat,
                discountPercent: discountPercent,
                discountAmount: discountAmount,
                price: price,
                gst: parseFloat(prod.gstDetails?.gstPercent) || 0,
                hsnSac: prod.HSNSAC || '',
                mrp: parseFloat(prod.MRP) || 0
            };

            // Add fields only for LENS & CONTACT_LENS
            if (cat === 'LENS' || cat === 'CONTACT_LENS') {
                const primarySide = prod.powerMode === 'single' ? prod.selectedSide : 'R';
                baseItem.sph = parseFloat(prod.powerTable[primarySide].sph) || 0;
                baseItem.cyl = parseFloat(prod.powerTable[primarySide].cyl) || 0;
                baseItem.axis = parseFloat(prod.powerTable[primarySide].axis) || 0;
                baseItem.add = parseFloat(prod.powerTable[primarySide].add) || 0;
                baseItem.index = parseFloat(prod.indexId || prod.index || prod.Index) || 0;
                baseItem.tint = tintData?.name || prod.tint || prod.Tint || '';
                baseItem.coating = coatingData?.name || prod.coating || prod.Coating || '';
            }

            // Add stock-specific / contact lens fields
            if (cat === 'FRAME' || cat === 'SUNGLASS' || cat === 'CONTACT_LENS') {
                baseItem.color = prod.color || '';
            }
            if (cat === 'FRAME' || cat === 'SUNGLASS') {
                baseItem.brand = brandData?.name || prod.Brand || prod.brand || '';
                baseItem.code = prod.Code || prod.code || '';
                baseItem.size = prod.Size || prod.size || '';
                baseItem.shape = prod.Shape || prod.shape || '';
                baseItem.dimensions = prod.Dimensions || prod.dimensions || '';
            }
            if (cat === 'CONTACT_LENS') {
                baseItem.expiry = prod.expiry || undefined;
                baseItem.disposability = prod.disposability || '';
            }

            // If it is RX order, add nested rx object
            if (isRx) {
                const powers = [];
                const mapPower = (side) => ({
                    side,
                    sph: parseFloat(prod.powerTable[side].sph) || 0,
                    cyl: parseFloat(prod.powerTable[side].cyl) || 0,
                    axis: parseFloat(prod.powerTable[side].axis) || 0,
                    add: parseFloat(prod.powerTable[side].add) || 0,
                    diameter: parseFloat(prod.powerTable[side].dia) || 70
                });

                if (prod.powerMode === 'both') {
                    powers.push(mapPower('R'));
                    powers.push(mapPower('L'));
                } else {
                    powers.push(mapPower(prod.selectedSide));
                }

                const prisms = [];
                if (prod.hasPrism === 'yes') {
                    const mapPrism = (side) => ({
                        side,
                        prism: parseFloat(prod.prismTable[side].prism) || 0,
                        base: prod.prismTable[side].base || ''
                    });
                    if (prod.powerMode === 'both') {
                        prisms.push(mapPrism('R'));
                        prisms.push(mapPrism('L'));
                    } else {
                        prisms.push(mapPrism(prod.selectedSide));
                    }
                }

                const centration = [];
                const mapCentration = (side) => ({
                    side,
                    pd: parseFloat(prod.centrationData[side].pd) || 0,
                    corridor: parseFloat(prod.centrationData[side].corridor) || 0,
                    fittingHeight: parseFloat(prod.centrationData[side].fittingHeight) || 0
                });

                if (prod.powerMode === 'both') {
                    centration.push(mapCentration('R'));
                    centration.push(mapCentration('L'));
                } else {
                    centration.push(mapCentration(prod.selectedSide));
                }

                const rxVendor = getFieldData('vendors', prod.vendorId);

                baseItem.rx = {
                    vendor: rxVendor ? { id: rxVendor.id, name: rxVendor.name } : { id: "", name: "" },
                    lab: prod.labName ? { id: "", name: prod.labName } : { id: "", name: "" },
                    orderReference: values.orderReference || '',
                    consumerCardName: values.consumerCardName || '',
                    opticianName: values.opticianName || '',
                    powerType: prod.powerMode === 'both' ? 'Both' : 'Single',
                    productMode: 'Rx',
                    hasPrism: prod.hasPrism === 'yes',
                    powers,
                    prisms,
                    centration,
                    coating: coatingData ? { id: coatingData.id, name: coatingData.name } : { id: "", name: "" },
                    treatment: treatmentData ? { id: treatmentData.id, name: treatmentData.name } : { id: "", name: "" },
                    tint: tintData ? { id: tintData.id, name: tintData.name } : { id: "", name: "" },
                    tintDetails: prod.tintDetails || '',
                    remarks: prod.remarks || '',
                    mirror: prod.hasMirror === 'yes',
                    fitting: {
                        hasFlatFitting: prod.hasFlatFitting === 'yes',
                        dbl: parseFloat(prod.dbl) || 0,
                        frameType: prod.frameType || '',
                        frameLength: parseFloat(prod.frameLength) || 0,
                        frameHeight: parseFloat(prod.frameHeight) || 0
                    },
                    lensData: {
                        pantoscopeAngle: parseFloat(prod.pantoscopicAngle) || 0,
                        bowAngle: parseFloat(prod.bowAngle) || 0,
                        bvd: parseFloat(prod.bvd) || 0
                    },
                    directCustomer: values.directCustomer || '',
                    shippingCharges: parseFloat(values.shippingCharges) || 0,
                    otherCharges: parseFloat(values.otherCharges) || 0
                };
            }

            return baseItem;
        });

        const representativeGst = items.length > 0 ? items[0].gst : 18;
        const cgstStr = (representativeGst / 2).toString();
        const sgstStr = (representativeGst / 2).toString();

        return {
            customerId: values.customerId,
            customerShipToId: values.shipToId,
            isDraft: status === 'Draft',
            orders: [
                {
                    orderNumber: values.orderReference || undefined,
                    items,
                    cgst: cgstStr,
                    sgst: sgstStr,
                    // status: status.toLowerCase()
                }
            ],
            orderReference: values.orderReference,
            consumerCardName: values.consumerCardName,
            opticianName: values.opticianName,
            // status: status
        };
    };

    const handleSaveDraft = async () => {
        try {
            const payload = formatOrderPayload(formik.values, 'Draft');
            let res;
            if (isEditMode) {
                const patchPayload = {
                    orders: payload.orders,
                    customerShipToId: payload.customerShipToId
                };
                res = await updateOrder(id, patchPayload);
            } else {
                res = await createBulkOrders(payload);
            }

            if (res.success) {
                toast.success(isEditMode ? 'Draft details updated! 💾' : 'Order saved as draft! 💾');
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
                const [custRes, prodConfigs, tints, frameTypes, vendorRes] = await Promise.all([
                    getAllCustomers(1, 1000),
                    getOrderProductConfigs(),
                    getTints(),
                    getFrameTypes(),
                    getAllVendors(1, 1000).catch(() => ({ success: false, vendors: [] }))
                ]);

                if (custRes.success) setCustomers(custRes.data.customers || []);

                setConfigs({
                    ...prodConfigs,
                    tints,
                    frameTypes,
                    vendors: vendorRes.vendors || []
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
            formik.setFieldValue(`${prefix}qty`, 1);

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
            formik.setFieldValue(`${prefix}productCode`, rawProd.productCode || rawProd.code || '');
            formik.setFieldValue(`${prefix}HSNSAC`, rawProd.hsnSac || rawProd.HSNSAC || '');
            formik.setFieldValue(`${prefix}expiry`, rawProd.expiry || '');

            // Map lens-specific fields from raw product
            if (rawProd.index) {
                formik.setFieldValue(`${prefix}indexId`, rawProd.index.toString());
                formik.setFieldValue(`${prefix}index`, rawProd.index.toString());
            }
            if (rawProd.coating) {
                const matchedCoating = configs.coating?.find(c => c.name?.toUpperCase() === rawProd.coating.toUpperCase());
                formik.setFieldValue(`${prefix}coatingId`, matchedCoating?._id || rawProd.coating);
                formik.setFieldValue(`${prefix}coating`, rawProd.coating);
            }
            if (rawProd.treatment) {
                const matchedTreatment = configs.treatment?.find(t => t.name?.toUpperCase() === rawProd.treatment.toUpperCase());
                formik.setFieldValue(`${prefix}treatmentId`, matchedTreatment?._id || rawProd.treatment);
                formik.setFieldValue(`${prefix}treatment`, rawProd.treatment);
            }
            if (rawProd.tint) {
                const matchedTint = configs.tints?.find(t => t.name?.toUpperCase() === rawProd.tint.toUpperCase());
                formik.setFieldValue(`${prefix}tintId`, matchedTint?._id || rawProd.tint);
                formik.setFieldValue(`${prefix}tint`, rawProd.tint);
            }

            // Set raw power values directly on product for display fallback
            formik.setFieldValue(`${prefix}sph`, rawProd.sph || '');
            formik.setFieldValue(`${prefix}cyl`, rawProd.cyl || '');
            formik.setFieldValue(`${prefix}axis`, rawProd.axis || '');
            formik.setFieldValue(`${prefix}addition`, rawProd.addition || rawProd.add || '');

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

            // Fetch full product details from API to get ALL fields (expiry, coating, etc.)
            const productId = rawProd._id || rawProd.id;
            if (productId) {
                getProductById(productId).then(res => {
                    const fullProd = res?.data || res?.product || res;
                    if (!fullProd) return;

                    // Update all fields from full product response
                    const set = (field, val) => {
                        if (val !== undefined && val !== null && val !== '') {
                            formik.setFieldValue(`${prefix}${field}`, val);
                        }
                    };

                    set('productCode', fullProd.productCode || '');
                    set('code', fullProd.productCode || '');
                    set('category', fullProd.category || '');
                    set('Brand', fullProd.brand || '');
                    set('price', fullProd.price || 0);
                    set('MRP', fullProd.mrp || fullProd.MRP || 0);
                    set('color', fullProd.color || '');
                    set('size', fullProd.size || '');
                    set('type', fullProd.type || '');
                    set('shape', fullProd.shape || '');
                    set('material', fullProd.material || '');
                    set('dimensions', fullProd.dimensions || '');
                    set('image', fullProd.image || '');
                    set('HSNSAC', fullProd.hsnSac || fullProd.HSNSAC || '');
                    set('expiry', fullProd.expiry || '');
                    set('index', fullProd.index?.toString() || '');
                    set('coating', fullProd.coating || '');
                    set('treatment', fullProd.treatment || '');
                    set('tint', fullProd.tint || '');
                    set('sph', fullProd.sph || '');
                    set('cyl', fullProd.cyl || '');
                    set('axis', fullProd.axis || '');
                    set('addition', fullProd.addition || fullProd.add || '');

                    if (fullProd.index) {
                        set('indexId', fullProd.index.toString());
                        const matchedIndex = configs.index?.find(i => i.value?.toString() === fullProd.index.toString());
                        if (matchedIndex) set('indexId', matchedIndex._id || fullProd.index.toString());
                    }
                    if (fullProd.coating) {
                        const matchedCoating = configs.coating?.find(c => c.name?.toUpperCase() === fullProd.coating.toUpperCase());
                        set('coatingId', matchedCoating?._id || fullProd.coating);
                    }
                    if (fullProd.treatment) {
                        const matchedTreatment = configs.treatment?.find(t => t.name?.toUpperCase() === fullProd.treatment.toUpperCase());
                        set('treatmentId', matchedTreatment?._id || fullProd.treatment);
                    }
                    if (fullProd.tint) {
                        const matchedTint = configs.tints?.find(t => t.name?.toUpperCase() === fullProd.tint.toUpperCase());
                        set('tintId', matchedTint?._id || fullProd.tint);
                    }
                    if (fullProd.gst !== undefined && fullProd.gst !== null) {
                        formik.setFieldValue(`${prefix}gstDetails`, {
                            ...formik.values.products[index]?.gstDetails,
                            gstPercent: fullProd.gst.toString()
                        });
                    }

                    // Update power table from full product
                    const fullPowerTable = {
                        R: {
                            sph: fullProd.sph || '',
                            cyl: fullProd.cyl || '',
                            axis: fullProd.axis || '',
                            add: fullProd.addition || fullProd.add || '',
                            dia: '70'
                        },
                        L: {
                            sph: fullProd.sph || '',
                            cyl: fullProd.cyl || '',
                            axis: fullProd.axis || '',
                            add: fullProd.addition || fullProd.add || '',
                            dia: '70'
                        }
                    };
                    set('powerTable', fullPowerTable);
                }).catch(err => {
                    console.error('Failed to fetch full product details:', err);
                });
            }

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
            case 2: // Shipping & Others – no required fields
                return true;
            default:
                return false;
        }
    };

    const handleNext = async () => {
        // Define fields for each step to validate partially
        const stepFields = [
            ['customerId'], // Step 1
            ['products'],   // Step 2
            []              // Step 3: no required fields
        ];

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
            let errorMessage = 'Validation error';

            const errVal = errors[firstErrorField];
            if (typeof errVal === 'string') {
                errorMessage = errVal;
            } else if (Array.isArray(errVal)) {
                const errIdx = errVal.findIndex(e => e !== undefined && e !== null);
                if (errIdx !== -1) {
                    const itemErr = errVal[errIdx];
                    if (typeof itemErr === 'string') {
                        errorMessage = `Product ${errIdx + 1}: ${itemErr}`;
                    } else if (typeof itemErr === 'object') {
                        const firstKey = Object.keys(itemErr)[0];
                        errorMessage = `Product ${errIdx + 1}: ${itemErr[firstKey]}`;
                    }
                }
            } else if (typeof errVal === 'object' && errVal !== null) {
                const firstKey = Object.keys(errVal)[0];
                errorMessage = errVal[firstKey];
            }

            toast.warn(`Please fix: ${errorMessage}`);
        }
    };

    const handleBack = () => {
        if (activeStep > 0) {
            setActiveStep(prev => prev - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const renderProductOption = (props, option, state) => {
        const raw = option.raw;
        const { key, ...otherProps } = props;
        if (!raw) {
            return (
                <li key={key || option.value} {...otherProps} className="p-2 border-b border-gray-100 last:border-b-0 hover:bg-blue-50/50">
                    <span className="font-semibold text-xs text-gray-700">{option.label}</span>
                </li>
            );
        }
        return (
            <li key={key || raw._id || option.value} {...otherProps} className="p-3 border-b border-gray-100 last:border-b-0 hover:bg-blue-50/30 flex flex-col items-start gap-1">
                <div className="flex justify-between items-start w-full gap-2">
                    <span className="font-bold text-sm text-gray-800 break-words">{raw.productName || raw.name}</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 whitespace-nowrap">{raw.productCode || 'N/A'}</span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 font-semibold mt-1">
                    <span>Brand: <strong className="text-gray-700">{raw.brand || '-'}</strong></span>
                    <span>Category: <strong className="text-gray-700">{raw.category || '-'}</strong></span>
                    {raw.index && <span>Index: <strong className="text-gray-700">{raw.index}</strong></span>}
                    {raw.coating && <span>Coating: <strong className="text-gray-700">{raw.coating}</strong></span>}
                </div>
                <div className="flex flex-wrap justify-between items-center w-full text-xs mt-2 pt-2 border-t border-dashed border-gray-100 gap-y-2">
                    <div className="flex flex-wrap gap-3 text-gray-600 font-bold">
                        <span>Price: <span className="text-emerald-600">₹{raw.price}</span></span>
                        <span>MRP: <span className="text-gray-500 line-through">₹{raw.mrp}</span></span>
                        <span>GST: <span className="text-purple-600">{raw.gst}%</span></span>
                    </div>
                    {raw.qty !== undefined && (
                        <div className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-black whitespace-nowrap ${raw.qty > 0 ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-red-50 text-red-500 border border-red-100'}`}>
                            Stock: {raw.qty}
                        </div>
                    )}
                </div>
            </li>
        );
    };

    const renderCustomerDetails = () => {

        // ── Stat pill — balance / limit / used ───────────────────────────────────
        const StatPill = ({ label, value, variant = 'default' }) => {
            const variants = {
                default: 'bg-gray-50 border-gray-100 text-gray-400',
                warn: 'bg-amber-50 border-amber-100 text-amber-500',
                danger: 'bg-red-50   border-red-100   text-red-500',
            };
            return (
                <div className={`flex flex-col gap-0.5 px-4 py-3 rounded-xl border ${variants[variant]} min-w-[140px] flex-1`}>
                    <span className="text-[10px] font-black uppercase tracking-[0.08em]">{label}</span>
                    <span className="text-[15px] font-bold text-gray-900">₹ {value || '0.00'}</span>
                </div>
            );
        };

        // ── Derive a variant for credit used vs limit ────────────────────────────
        const creditUsed = parseFloat(selectedCustomer?.creditUsed || 0);
        const creditLimit = parseFloat(selectedCustomer?.creditLimit || 0);
        const usedRatio = creditLimit > 0 ? creditUsed / creditLimit : 0;
        const usedVariant = usedRatio >= 1 ? 'danger' : usedRatio >= 0.8 ? 'warn' : 'default';

        return (
            <div className="bg-white rounded-b-2xl border-t-0 border border-gray-100 shadow-[0_1px_4px_0_rgba(0,0,0,0.05)] overflow-hidden">

                {/* ── Customer selector row ──────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 pt-6 pb-4">
                    <div>
                        <SearchableSelect
                            label="Customer"
                            name="customerId"
                            value={formik.values.customerId}
                            onChange={(e) => handleCustomerChange(e.target.value)}
                            options={customerOptions}
                            placeholder="Search by shop name or code…"
                            disabled={isReadOnly}
                        />
                    </div>
                    {wrapInput(SearchableSelect, {
                        label: "Ship to",
                        name: "shipToId",
                        placeholder: "Select ship-to address",
                        options: shipToOptions,
                        disabled: !formik.values.customerId
                    })}
                </div>

                {/* ── Financial stats strip ──────────────────────────────────── */}
                <div className="mx-6 mb-4 flex flex-wrap gap-2">
                    <StatPill
                        label="Balance"
                        value={selectedCustomer?.customerBalance}
                    />
                    <StatPill
                        label="Credit limit"
                        value={selectedCustomer?.creditLimit}
                    />
                    <StatPill
                        label="Credit used"
                        value={selectedCustomer?.creditUsed}
                        variant={usedVariant}
                    />
                </div>

                {/* ── Divider ────────────────────────────────────────────────── */}
                <div className="mx-6 border-t border-gray-100 mb-4" />

                {/* ── Additional fields ──────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 pb-6">
                    {wrapInput(Input, {
                        label: "Order reference",
                        name: "orderReference",
                        placeholder: "Enter order reference"
                    })}
                    {wrapInput(Input, {
                        label: "Consumer card name",
                        name: "consumerCardName",
                        placeholder: "Enter consumer card name"
                    })}
                    {wrapInput(Input, {
                        label: "Optician's name",
                        name: "opticianName",
                        placeholder: "Enter optician's name"
                    })}
                </div>

            </div>
        );
    };

    // ─── Enhanced renderActiveProductDetails ────────────────────────────────────
    // Drop-in replacement. All props, state, and helpers are unchanged.
    // Only className strings and minor structural wrappers are modified.

    const renderActiveProductDetails = (index) => {
        const product = formik.values.products[index];
        const prefix = `products.${index}.`;
        const isStock = product.orderType === 'stock';

        // ── Shared sub-components ────────────────────────────────────────────────

        /** Compact section card */
        const SectionCard = ({ children, className = '' }) => (
            <div className={`bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_0_rgba(0,0,0,0.06)] ${className}`}>
                {children}
            </div>
        );

        /** Section header row inside a card */
        const SectionHeader = ({ icon, label, right }) => (
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    {icon && <span className="text-erp-accent/70 text-[15px]">{icon}</span>}
                    <span className="text-[11px] font-black uppercase tracking-[0.08em] text-gray-400">{label}</span>
                </div>
                {right && <div>{right}</div>}
            </div>
        );

        /** Pill-style toggle — same API as CustomToggle but rendered inline */
        const PillToggle = ({ label, value, onChange, options, disabled, className = '' }) => (
            <div className={`flex flex-col gap-1.5 ${className}`}>
                {label && <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>}
                <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 gap-0.5">
                    {options.map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            disabled={disabled}
                            onClick={() => !disabled && onChange(opt.value)}
                            className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all duration-150 border
                            ${value === opt.value
                                    ? 'bg-white border-gray-200 text-erp-accent shadow-sm'
                                    : 'border-transparent text-gray-400 hover:text-gray-600 bg-transparent'
                                }
                            disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
        );

        /** Mini checkbox indicator */
        const SideCheckbox = ({ active }) => (
            <span className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-[3px] border transition-all duration-150 flex-shrink-0
            ${active ? 'bg-erp-accent border-erp-accent' : 'bg-white border-gray-300'}`}>
                {active && (
                    <Icon icon="mdi:check" className="text-white text-[9px]" />
                )}
            </span>
        );

        /** Reusable power/prism cell input */
        const CellInput = ({ name, value, onChange, disabled, placeholder = '0.00' }) => (
            <input
                type="text"
                name={name}
                value={value}
                onChange={onChange}
                disabled={disabled}
                placeholder={placeholder}
                className="w-full h-8 rounded-md border border-gray-200 bg-white text-center text-[12px] font-semibold text-gray-700
                focus:outline-none focus:border-erp-accent focus:ring-2 focus:ring-erp-accent/10
                disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-gray-50
                transition-all duration-150 placeholder:text-gray-300"
            />
        );

        /** Table header cell */
        const Th = ({ children }) => (
            <div className="py-2.5 text-[10px] font-black uppercase tracking-[0.07em] text-gray-400 text-center border-r border-gray-100 last:border-r-0 bg-gray-50/80">
                {children}
            </div>
        );

        // ── Side row state helpers ───────────────────────────────────────────────
        const isSideDisabled = (side) => product.powerMode === 'single' && product.selectedSide !== side;

        const SideLabel = ({ side }) => {
            const active = product.powerMode === 'single' && product.selectedSide === side;
            const isSingle = product.powerMode === 'single';
            return (
                <div
                    onClick={() => isSingle && !isReadOnly && formik.setFieldValue(`${prefix}selectedSide`, side)}
                    className={`flex items-center justify-center gap-1.5 h-full py-2
                    ${isSingle ? 'cursor-pointer' : 'cursor-default'}
                    ${active ? 'text-erp-accent' : 'text-gray-400'}
                    transition-colors duration-150`}
                >
                    {isSingle && <SideCheckbox active={active} />}
                    <span className="text-[11px] font-black">{side}</span>
                </div>
            );
        };

        // ─────────────────────────────────────────────────────────────────────────
        return (
            <div className="space-y-3 p-3 bg-gray-50/60 rounded-2xl border border-gray-100">

                {/* ── NON-STOCK SECTIONS ──────────────────────────────────────── */}
                {!isStock && (
                    <>
                        {/* ── TOGGLES ── */}
                        <SectionCard>
                            <SectionHeader label="Power options" />
                            <div className="flex flex-wrap gap-5 px-5 py-4">
                                <PillToggle
                                    label="Power details"
                                    value={product.powerMode}
                                    onChange={(v) => formik.setFieldValue(`${prefix}powerMode`, v)}
                                    options={[{ label: 'Single', value: 'single' }, { label: 'Both', value: 'both' }]}
                                    disabled={isReadOnly}
                                />
                                <PillToggle
                                    label="Prism"
                                    value={product.hasPrism}
                                    onChange={(v) => formik.setFieldValue(`${prefix}hasPrism`, v)}
                                    options={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }]}
                                    disabled={isReadOnly}
                                />
                            </div>
                        </SectionCard>

                        {/* ── POWER + PRISM TABLES ── */}
                        <SectionCard>
                            <SectionHeader label="Prescription" />
                            <div className="flex flex-col lg:flex-row gap-4 p-4">

                                {/* Power Table */}
                                <div className="flex-1 rounded-xl border border-gray-200 overflow-hidden">
                                    <div className="grid grid-cols-6">
                                        {['Side', 'SPH', 'CYL', 'Axis', 'Add', 'Dia'].map(h => (
                                            <Th key={h}>{h}</Th>
                                        ))}
                                    </div>
                                    {['R', 'L'].map((side) => {
                                        const disabled = isSideDisabled(side);
                                        return (
                                            <div
                                                key={side}
                                                className={`grid grid-cols-6 border-t border-gray-100 transition-opacity duration-200
                                                ${side === 'L' ? 'bg-blue-50/20' : 'bg-white'}
                                                ${disabled ? 'opacity-30' : ''}`}
                                            >
                                                <div className="border-r border-gray-100">
                                                    <SideLabel side={side} />
                                                </div>
                                                {['sph', 'cyl', 'axis', 'add', 'dia'].map(field => (
                                                    <div key={field} className="p-1.5 border-r border-gray-100 last:border-r-0">
                                                        <CellInput
                                                            name={`${prefix}powerTable.${side}.${field}`}
                                                            value={product.powerTable[side][field]}
                                                            onChange={formik.handleChange}
                                                            disabled={disabled}
                                                            placeholder={field === 'axis' ? '0' : '0.00'}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Prism Table */}
                                {product.hasPrism === 'yes' && (
                                    <div className="w-full lg:w-72 rounded-xl border border-erp-accent/20 overflow-hidden
                                    animate-in slide-in-from-right-3 fade-in duration-200">
                                        <div className="px-3 py-2 bg-erp-accent/5 border-b border-erp-accent/10">
                                            <span className="text-[10px] font-black uppercase tracking-[0.07em] text-erp-accent/70">Prism</span>
                                        </div>
                                        <div className="grid grid-cols-3">
                                            {['Side', 'Prism', 'Base'].map(h => (
                                                <Th key={h}>{h}</Th>
                                            ))}
                                        </div>
                                        {['R', 'L'].map((side) => {
                                            const disabled = isSideDisabled(side);
                                            return (
                                                <div
                                                    key={side}
                                                    className={`grid grid-cols-3 border-t border-gray-100 transition-opacity duration-200
                                                    ${side === 'L' ? 'bg-blue-50/20' : 'bg-white'}
                                                    ${disabled ? 'opacity-30' : ''}`}
                                                >
                                                    <div className="border-r border-gray-100">
                                                        <SideLabel side={side} />
                                                    </div>
                                                    {['prism', 'base'].map(field => (
                                                        <div key={field} className="p-1.5 border-r border-gray-100 last:border-r-0">
                                                            <CellInput
                                                                name={`${prefix}prismTable.${side}.${field}`}
                                                                value={product.prismTable[side][field]}
                                                                onChange={formik.handleChange}
                                                                disabled={disabled}
                                                                placeholder={field === 'base' ? 'Base' : '0.00'}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </SectionCard>
                    </>
                )}

                {/* ── PRODUCT FIELDS ──────────────────────────────────────────── */}
                {isStock ? (
                    <SectionCard>
                        <SectionHeader label="Stock product" />
                        <div className="p-5 flex flex-col gap-4">
                            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                                {/* Restore your SearchableSelect + Input here as needed */}
                            </div>

                            {product.productName && (
                                <div className="mt-2">
                                    {/* Product Name & Image Header */}
                                    <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                                        {product.image && (
                                            <div className="w-14 h-14 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0 shadow-sm">
                                                <img src={product.image} alt={product.productName} className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Product</span>
                                            <span className="font-bold text-gray-900 text-[16px] leading-snug">{product.productName}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-x-6 gap-y-8">
                                        {[
                                            {
                                                label: 'Product info', color: 'text-blue-500', borderColor: 'border-blue-100',
                                                fields: [
                                                    { label: 'Product code', value: product.productCode || product.code },
                                                    { label: 'Brand', value: product.Brand || product.brand || configs.brand?.find(b => b._id === product.brandId)?.name },
                                                    { label: 'Category', value: product.category || configs.category?.find(c => c._id === product.categoryId)?.name },
                                                    { label: 'Type', value: product.type },
                                                    { label: 'Material', value: product.material },
                                                ]
                                            },
                                            {
                                                label: 'Specifications', color: 'text-blue-500', borderColor: 'border-blue-100',
                                                fields: [
                                                    { label: 'Index', value: product.index || configs.index?.find(i => i._id === product.indexId)?.value?.toString() },
                                                    { label: 'Coating', value: product.coating || configs.coating?.find(c => c._id === product.coatingId)?.name },
                                                    { label: 'Treatment', value: product.treatment || configs.treatment?.find(t => t._id === product.treatmentId)?.name },
                                                    { label: 'Tint', value: product.tint || configs.tints?.find(t => t._id === product.tintId)?.name },
                                                    { label: 'Shape', value: product.shape },
                                                ]
                                            },
                                            {
                                                label: 'Powers & dimensions', color: 'text-blue-500', borderColor: 'border-blue-100',
                                                fields: [
                                                    { label: 'SPH', value: product.sph || product.powerTable?.R?.sph || product.powerTable?.L?.sph },
                                                    { label: 'CYL', value: product.cyl || product.powerTable?.R?.cyl || product.powerTable?.L?.cyl },
                                                    { label: 'Axis', value: product.axis || product.powerTable?.R?.axis || product.powerTable?.L?.axis },
                                                    { label: 'Add', value: product.addition || product.powerTable?.R?.add || product.powerTable?.L?.add },
                                                    { label: 'Size', value: product.size },
                                                    { label: 'Dimensions', value: product.dimensions },
                                                ]
                                            },
                                            {
                                                label: 'Other details', color: 'text-blue-500', borderColor: 'border-blue-100',
                                                fields: [
                                                    { label: 'Color', value: product.color },
                                                    { label: 'HSN / SAC', value: product.HSNSAC || product.hsnSac },
                                                    { label: 'Expiry', value: product.expiry ? new Date(product.expiry).toLocaleDateString() : null },
                                                ]
                                            },
                                            {
                                                label: 'Pricing & stock', color: 'text-blue-500', borderColor: 'border-blue-100',
                                                fields: [
                                                    { label: 'Price', value: product.price ? `₹${product.price}` : null },
                                                    { label: 'MRP', value: product.MRP ? `₹${product.MRP}` : null },
                                                    { label: 'GST', value: product.gstDetails?.gstPercent ? `${product.gstDetails.gstPercent}%` : null },
                                                    { label: 'Quantity', value: product.qty || null },
                                                ]
                                            },
                                        ].map(({ label, color, borderColor, fields }) => (
                                            <div key={label} className="flex flex-col">
                                                <h5 className={`text-[10px] font-black ${color} uppercase tracking-[0.08em] border-b ${borderColor} pb-2 mb-4`}>
                                                    {label}
                                                </h5>
                                                <div className="space-y-4">
                                                    {fields.map((item, i) => item.value ? (
                                                        <div key={i} className="flex flex-col gap-0.5">
                                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{item.label}</span>
                                                            <span className="font-semibold text-gray-800 text-[14px]">{item.value}</span>
                                                        </div>
                                                    ) : null)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </SectionCard>
                ) : (
                    <SectionCard>
                        <SectionHeader label="Product details" />
                        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                            {wrapInput(SearchableSelect, {
                                label: "Brand",
                                name: `${prefix}brandId`,
                                options: (Array.isArray(configs.brand) ? configs.brand : []).map(b => ({ value: b._id, label: b.name })),
                                placeholder: "Select brand",
                                disabled: isReadOnly
                            })}
                            {wrapInput(SearchableSelect, {
                                label: "Category",
                                name: `${prefix}categoryId`,
                                options: (Array.isArray(configs.category) ? configs.category : []).map(c => ({ value: c._id, label: c.name })),
                                placeholder: "Select category",
                                disabled: !product.brandId || isReadOnly
                            })}
                            <div className="md:col-span-1">
                                <SearchableSelect
                                    label="Product name"
                                    name={`${prefix}productName`}
                                    value={{ value: product.productId || product.productName, label: product.productName }}
                                    onChange={(e) => handleProductSelection(index, e.target.value)}
                                    onSearch={(q) => searchProductsForIndex(q, index)}
                                    options={productNames}
                                    loading={loadingProductNames}
                                    placeholder="Search product…"
                                    disabled={!product.brandId || !product.categoryId || isReadOnly}
                                    renderOption={renderProductOption}
                                />
                            </div>

                            {wrapInput(Select, {
                                label: "Treatment",
                                name: `${prefix}treatmentId`,
                                placeholder: "Treatment",
                                options: (Array.isArray(configs.treatment) ? configs.treatment : []).map(t => ({ value: t._id, label: t.name })),
                                disabled: isReadOnly
                            })}
                            {wrapInput(Select, {
                                label: "Index",
                                name: `${prefix}indexId`,
                                placeholder: "Index",
                                options: (Array.isArray(configs.index) ? configs.index : []).map(i => {
                                    const val = i.value?.toString() || i.toString() || '';
                                    return { value: val, label: val };
                                }),
                                disabled: isReadOnly
                            })}
                            {wrapInput(Select, {
                                label: "Coating",
                                name: `${prefix}coatingId`,
                                placeholder: "Coating",
                                options: (Array.isArray(configs.coating) ? configs.coating : []).map(c => ({ value: c._id, label: c.name })),
                                disabled: isReadOnly
                            })}

                            {wrapInput(Select, {
                                label: "Tint",
                                name: `${prefix}tintId`,
                                placeholder: "Tint",
                                options: (Array.isArray(configs.tints) ? configs.tints : []).map(t => ({ value: t._id, label: t.name })),
                                disabled: isReadOnly
                            })}
                            {wrapInput(Input, {
                                label: "Tint details",
                                name: `${prefix}tintDetails`,
                                placeholder: "Tint details",
                                disabled: isReadOnly
                            })}
                            {wrapInput(Input, {
                                label: "Remarks",
                                name: `${prefix}remarks`,
                                placeholder: "Enter remarks",
                                disabled: isReadOnly
                            })}

                            <div className="flex items-end pb-0.5">
                                <PillToggle
                                    label="Mirror"
                                    value={product.hasMirror}
                                    onChange={(v) => formik.setFieldValue(`${prefix}hasMirror`, v)}
                                    options={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }]}
                                    disabled={isReadOnly}
                                    className="w-full md:w-auto"
                                />
                            </div>

                            {product.orderType === 'rx' &&
                                (product.category?.toUpperCase().includes('LENS') ||
                                    configs.category?.find(c => c._id === product.categoryId)?.name?.toUpperCase().includes('LENS')) && (
                                    <>
                                        {wrapInput(SearchableSelect, {
                                            label: "Vendor",
                                            name: `${prefix}vendorId`,
                                            options: (Array.isArray(configs.vendors) ? configs.vendors : []).map(v => ({ value: v._id || v.vendorNumber, label: v.name })),
                                            placeholder: "Select vendor",
                                            disabled: isReadOnly
                                        })}
                                        {wrapInput(Input, {
                                            label: "Lab name",
                                            name: `${prefix}labName`,
                                            placeholder: "Enter lab name",
                                            disabled: isReadOnly
                                        })}
                                    </>
                                )}
                        </div>
                    </SectionCard>
                )}

                {/* ── CENTRATION TABLE ────────────────────────────────────────── */}
                <SectionCard>
                    <SectionHeader label="Centration data" />
                    <div className="p-4">
                        <div className="rounded-xl border border-gray-200 overflow-hidden max-w-2xl">
                            <div className="grid grid-cols-4">
                                {['Side', 'PD', 'Corridor', 'Fitting height'].map(h => (
                                    <Th key={h}>{h}</Th>
                                ))}
                            </div>
                            {['R', 'L'].map((side) => {
                                const disabled = product.powerMode === 'single' && product.selectedSide !== side;
                                return (
                                    <div
                                        key={side}
                                        className={`grid grid-cols-4 border-t border-gray-100 transition-opacity duration-200
                                        ${side === 'L' ? 'bg-blue-50/20' : 'bg-white'}
                                        ${disabled ? 'opacity-30' : ''}`}
                                    >
                                        <div className="flex items-center justify-center border-r border-gray-100 py-2">
                                            <span className="text-[11px] font-black text-gray-400">{side}</span>
                                        </div>
                                        {['pd', 'corridor', 'fittingHeight'].map(field => (
                                            <div key={field} className="p-1.5 border-r border-gray-100 last:border-r-0">
                                                <CellInput
                                                    name={`${prefix}centrationData.${side}.${field}`}
                                                    value={product.centrationData[side][field]}
                                                    onChange={formik.handleChange}
                                                    disabled={isStock || disabled}
                                                    placeholder="—"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </SectionCard>

                {/* ── FITTING & LENS DETAILS (Rx lens only) ───────────────────── */}
                {!isStock && (() => {
                    const catName = (
                        product.category ||
                        configs.category?.find(c => c._id === product.categoryId)?.name ||
                        ''
                    ).toUpperCase();

                    if (!(catName === 'LENS' || catName === 'CONTACT_LENS' || catName.includes('LENS'))) return null;

                    return (
                        <SectionCard>
                            <SectionHeader label="Fitting & lens details" />
                            <div className="p-5 flex flex-col gap-6">

                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.07em] text-erp-accent mb-3 pb-2 border-b border-erp-accent/10">
                                        Fitting details
                                    </p>
                                    <div className="mb-4">
                                        <PillToggle
                                            label="Flat fitting"
                                            value={product.hasFlatFitting}
                                            onChange={(v) => formik.setFieldValue(`${prefix}hasFlatFitting`, v)}
                                            options={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }]}
                                            disabled={isReadOnly}
                                        />
                                    </div>

                                    {product.hasFlatFitting === 'yes' && (
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end animate-in fade-in slide-in-from-top-2 duration-200">
                                            {wrapInput(Input, {
                                                label: "DBL",
                                                name: `${prefix}dbl`,
                                                placeholder: "DBL",
                                                disabled: isReadOnly
                                            })}
                                            {wrapInput(Select, {
                                                label: "Frame type",
                                                name: `${prefix}frameType`,
                                                placeholder: "Select type",
                                                options: (Array.isArray(configs.frameTypes) ? configs.frameTypes : []).map(f => {
                                                    const val = f.name || f._id || f;
                                                    return { value: val, label: f.name || f.label || f };
                                                }),
                                                disabled: isReadOnly
                                            })}
                                            {wrapInput(Input, {
                                                label: "Frame length",
                                                name: `${prefix}frameLength`,
                                                placeholder: "Length",
                                                disabled: isReadOnly
                                            })}
                                            {wrapInput(Input, {
                                                label: "Frame height",
                                                name: `${prefix}frameHeight`,
                                                placeholder: "Height",
                                                disabled: isReadOnly
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.07em] text-erp-accent mb-3 pb-2 border-b border-erp-accent/10">
                                        Lens details
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {wrapInput(Input, {
                                            label: "Pantoscopic angle",
                                            name: `${prefix}pantoscopicAngle`,
                                            placeholder: "Angle",
                                            disabled: isReadOnly
                                        })}
                                        {wrapInput(Input, {
                                            label: "Bow angle",
                                            name: `${prefix}bowAngle`,
                                            placeholder: "Bow angle",
                                            disabled: isReadOnly
                                        })}
                                        {wrapInput(Input, {
                                            label: "BVD",
                                            name: `${prefix}bvd`,
                                            placeholder: "BVD",
                                            disabled: isReadOnly
                                        })}
                                    </div>
                                </div>

                            </div>
                        </SectionCard>
                    );
                })()}

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
                <div className="w-full bg-white rounded-b-2xl">
                    {/* Table Container */}
                    <div className="w-full border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-auto max-h-[60vh]">
                            <table className="w-full min-w-max text-left border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-gradient-to-r from-erp-accent to-blue-600 text-white text-[11px] uppercase tracking-wider">
                                        <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap border-r border-white/20">
                                            S. No.
                                        </th>
                                        <th className="px-4 py-3.5 font-semibold whitespace-nowrap border-r border-white/20">
                                            Particulars / Item
                                        </th>
                                        <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap border-r border-white/20">
                                            Category
                                        </th>
                                        <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap border-r border-white/20">
                                            Sph.
                                        </th>
                                        <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap border-r border-white/20">
                                            Cyl.
                                        </th>
                                        <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap border-r border-white/20">
                                            Axis
                                        </th>
                                        <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap border-r border-white/20">
                                            Add
                                        </th>
                                        <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap border-r border-white/20">
                                            Unit
                                        </th>
                                        <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap border-r border-white/20">
                                            Order Type
                                        </th>
                                        <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap border-r border-white/20">
                                            Qty
                                        </th>
                                        <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap border-r border-white/20">
                                            Price
                                        </th>
                                        <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap border-r border-white/20">
                                            Disc
                                        </th>
                                        <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap border-r border-white/20">
                                            GST %
                                        </th>
                                        <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap border-r border-white/20">
                                            GST Amt
                                        </th>
                                        <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap border-r border-white/20">
                                            Amount
                                        </th>
                                        <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap">
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {formik.values.products.map((product, index) => {
                                        const isActive = activeProductIndex === index;
                                        const isExpanded = expandedProductIndices.includes(index);
                                        const isStock = product.orderType === 'stock';

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
                                                    className={`
                                                    cursor-pointer transition-all duration-200
                                                    ${isActive
                                                            ? 'bg-blue-50/80 shadow-[inset_3px_0_0_0_#3b82f6]'
                                                            : 'bg-white hover:bg-gray-50/80'
                                                        }
                                                    ${index % 2 === 0 && !isActive ? 'bg-gray-50/30' : ''}
                                                `}
                                                    onClick={() => setActiveProductIndex(index)}
                                                >
                                                    {/* S. No. */}
                                                    <td className={`
                                                    px-4 py-3 text-xs font-bold text-center
                                                    ${product.orderType === 'rx'
                                                            ? 'bg-amber-100 text-amber-700'
                                                            : 'text-gray-600'
                                                        }
                                                `}>
                                                        {index + 1}
                                                    </td>

                                                    {/* Product Name */}
                                                    <td className="px-3 py-2.5 min-w-[280px]">
                                                        <SearchableSelect
                                                            name={`products.${index}.productName`}
                                                            value={{ value: product.productId || product.productName, label: product.productName }}
                                                            onChange={(e) => handleProductSelection(index, e.target.value)}
                                                            onSearch={(q) => searchProductsForIndex(q, index)}
                                                            options={productNames}
                                                            loading={loadingProductNames}
                                                            placeholder="Search Product Name..."
                                                            freeSolo
                                                            disableClearable
                                                            renderOption={renderProductOption}
                                                            sx={{
                                                                '& .MuiOutlinedInput-root': {
                                                                    padding: '4px 8px !important',
                                                                    fontSize: '0.8125rem',
                                                                    borderRadius: '8px',
                                                                    backgroundColor: 'white',
                                                                    '&:hover': {
                                                                        backgroundColor: '#f8fafc',
                                                                    },
                                                                    '&.Mui-focused': {
                                                                        backgroundColor: 'white',
                                                                    }
                                                                },
                                                                '& .MuiInputLabel-root': {
                                                                    display: 'none',
                                                                }
                                                            }}
                                                        />
                                                    </td>

                                                    {/* Category */}
                                                    <td className="px-4 py-3 text-xs font-medium text-gray-700 text-center whitespace-nowrap">
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                                                            {categoryName}
                                                        </span>
                                                    </td>

                                                    {/* Power Fields */}
                                                    <td className="px-4 py-3 text-xs font-semibold text-gray-700 text-center whitespace-nowrap">
                                                        {renderPowerField('sph') || <span className="text-gray-300">—</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-semibold text-gray-700 text-center whitespace-nowrap">
                                                        {renderPowerField('cyl') || <span className="text-gray-300">—</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-semibold text-gray-700 text-center whitespace-nowrap">
                                                        {renderPowerField('axis') || <span className="text-gray-300">—</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-semibold text-gray-700 text-center whitespace-nowrap">
                                                        {renderPowerField('add') || <span className="text-gray-300">—</span>}
                                                    </td>

                                                    {/* Unit Select */}
                                                    <td className="px-3 py-2.5 min-w-[100px]">
                                                        <select
                                                            className="w-full text-xs text-center bg-white border border-gray-200 rounded-lg px-2 py-2 outline-none focus:border-erp-accent focus:ring-2 focus:ring-erp-accent/20 transition-all cursor-pointer font-medium text-gray-700"
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

                                                    {/* Order Type Select */}
                                                    <td className="px-3 py-2.5 min-w-[100px]">
                                                        <select
                                                            className="w-full text-xs text-center bg-white border border-gray-200 rounded-lg px-2 py-2 outline-none focus:border-erp-accent focus:ring-2 focus:ring-erp-accent/20 transition-all cursor-pointer font-medium text-gray-700"
                                                            name={`products.${index}.orderType`}
                                                            value={product.orderType || 'stock'}
                                                            onChange={(e) => {
                                                                formik.handleChange(e);
                                                                formik.setFieldValue(`products.${index}.productMode`, e.target.value);
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <option value="stock">Stock</option>
                                                            {(!product.category && !product.categoryId || product.category?.toUpperCase().includes('LENS') || (configs.category?.find(c => c._id === product.categoryId)?.name?.toUpperCase().includes('LENS'))) && <option value="rx">Rx</option>}
                                                        </select>
                                                    </td>

                                                    {/* Qty Input */}
                                                    <td className="px-3 py-2.5 min-w-[80px]">
                                                        <input
                                                            type="number"
                                                            className="w-full text-xs text-center bg-white border border-gray-200 rounded-lg px-2 py-2 outline-none focus:border-erp-accent focus:ring-2 focus:ring-erp-accent/20 transition-all font-semibold text-gray-800"
                                                            name={`products.${index}.qty`}
                                                            value={product.qty}
                                                            onChange={formik.handleChange}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </td>

                                                    {/* Price Input */}
                                                    <td className="px-3 py-2.5 min-w-[110px]">
                                                        <input
                                                            type="number"
                                                            className="w-full text-xs text-center bg-white border border-gray-200 rounded-lg px-2 py-2 outline-none focus:border-erp-accent focus:ring-2 focus:ring-erp-accent/20 transition-all font-semibold text-gray-800 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                                                            name={`products.${index}.price`}
                                                            value={product.price}
                                                            onChange={formik.handleChange}
                                                            disabled={isStock || isReadOnly}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </td>

                                                    {/* Discount Input */}
                                                    <td className="px-3 py-2.5 min-w-[90px]">
                                                        <input
                                                            type="number"
                                                            className="w-full text-xs text-center bg-white border border-gray-200 rounded-lg px-2 py-2 outline-none focus:border-erp-accent focus:ring-2 focus:ring-erp-accent/20 transition-all font-semibold text-gray-800"
                                                            name={`products.${index}.discount`}
                                                            value={product.discount}
                                                            onChange={formik.handleChange}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </td>

                                                    {/* GST % Input */}
                                                    <td className="px-3 py-2.5 min-w-[90px]">
                                                        <input
                                                            type="number"
                                                            className="w-full text-xs text-center bg-white border border-gray-200 rounded-lg px-2 py-2 outline-none focus:border-erp-accent focus:ring-2 focus:ring-erp-accent/20 transition-all font-semibold text-gray-800 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                                                            name={`products.${index}.gstDetails.gstPercent`}
                                                            value={product.gstDetails?.gstPercent}
                                                            onChange={formik.handleChange}
                                                            disabled={isStock || isReadOnly}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </td>

                                                    {/* GST Amount */}
                                                    <td className="px-4 py-3 text-xs font-semibold text-gray-700 text-center">
                                                        <span className="text-emerald-600">₹{gstAmt.toFixed(2)}</span>
                                                    </td>

                                                    {/* Total Amount */}
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50 text-erp-accent font-bold text-sm">
                                                            ₹{totalAmount.toFixed(2)}
                                                        </span>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => toggleExpandRow(index, e)}
                                                                className={`
                                                                p-2 rounded-lg transition-all duration-200
                                                                ${isExpanded
                                                                        ? 'bg-erp-accent text-white shadow-md'
                                                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                                                                    }
                                                            `}
                                                            >
                                                                <Icon
                                                                    icon={isExpanded ? "mdi:chevron-up" : "mdi:chevron-down"}
                                                                    className="text-lg"
                                                                />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (formik.values.products.length > 1) {
                                                                        setDeleteModalState({ isOpen: true, indexToRemove: index });
                                                                    }
                                                                }}
                                                                className="p-2 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-all duration-200"
                                                            >
                                                                <Icon icon="mdi:trash-can-outline" className="text-lg" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* Expanded Row */}
                                                {isExpanded && (
                                                    <tr className="bg-gradient-to-b from-blue-50/50 to-white">
                                                        <td colSpan="16" className="p-0">
                                                            <div className="border-l-4 border-erp-accent mx-4 my-3 pl-4 py-3 bg-white rounded-r-lg shadow-sm">
                                                                {renderActiveProductDetails(index)}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Add Rows Section */}
                    <div className="flex flex-wrap justify-center items-center gap-4 mt-6 mb-8 px-6 py-5 bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-2 text-sm text-gray-500 font-bold uppercase tracking-wider">
                            <div className="p-2 bg-erp-accent/10 rounded-lg">
                                <Icon icon="mdi:table-row-plus-after" className="text-xl text-erp-accent" />
                            </div>
                            <span>Add Rows:</span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {[1, 5, 10, 20, 50].map((num) => (
                                <button
                                    key={num}
                                    type="button"
                                    onClick={() => {
                                        const newRows = Array(num).fill(null).map(() => ({ ...productTemplate }));
                                        formik.setFieldValue('products', [...formik.values.products, ...newRows]);
                                        setActiveProductIndex(formik.values.products.length);
                                    }}
                                    className="group px-4 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 bg-white hover:border-erp-accent hover:bg-erp-accent hover:text-white transition-all duration-200 text-sm font-bold shadow-sm active:scale-95 flex items-center gap-1.5"
                                >
                                    <Icon icon="mdi:plus" className="text-lg opacity-60 group-hover:opacity-100" />
                                    <span>{num}</span>
                                </button>
                            ))}

                            <div className="w-px h-8 bg-gray-200 mx-2 self-center hidden sm:block" />

                            <button
                                type="button"
                                onClick={() => {
                                    const filteredProducts = formik.values.products.filter(p =>
                                        p.productName || p.brandId || p.categoryId ||
                                        (p.powerTable.R.sph && p.powerTable.R.sph !== '') ||
                                        (p.powerTable.L.sph && p.powerTable.L.sph !== '')
                                    );
                                    const newProducts = filteredProducts.length > 0 ? filteredProducts : [{ ...productTemplate }];
                                    formik.setFieldValue('products', newProducts);
                                    if (activeProductIndex >= newProducts.length) {
                                        setActiveProductIndex(Math.max(0, newProducts.length - 1));
                                    }
                                }}
                                className="px-4 py-2.5 rounded-xl border-2 border-red-200 text-red-500 bg-white hover:bg-red-500 hover:border-red-500 hover:text-white transition-all duration-200 text-sm font-bold shadow-sm active:scale-95 flex items-center gap-1.5"
                            >
                                <Icon icon="mdi:delete-sweep" className="text-lg" />
                                <span>Remove Empty</span>
                            </button>
                        </div>
                    </div>

                    {/* Order Summary & GST Section */}
                    {formik.values.products[activeProductIndex] && (
                        <div className="flex flex-col lg:flex-row gap-6 items-stretch bg-gradient-to-br from-gray-50 to-blue-50/20 p-6 rounded-2xl border border-gray-200 shadow-sm">
                            {/* GST & Transaction Details */}
                            <div className="flex-1 bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                                <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-5 flex items-center gap-2">
                                    <div className="p-1.5 bg-erp-accent/10 rounded-lg">
                                        <Icon icon="mdi:receipt-text-outline" className="text-erp-accent text-lg" />
                                    </div>
                                    Transaction Details
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {wrapInput(Select, {
                                        label: "GST Type",
                                        name: `products.${activeProductIndex}.gstDetails.gstType`,
                                        options: [
                                            { value: "included", label: "Included" },
                                            { value: "excluded", label: "Excluded" }
                                        ],
                                        placeholder: "Select GST Type"
                                    })}

                                    {wrapInput(Select, {
                                        label: "Transaction Method",
                                        name: `products.${activeProductIndex}.gstDetails.transactionType`,
                                        options: [
                                            { value: 'card', label: 'Card' },
                                            { value: 'upi', label: 'UPI' },
                                            { value: 'cash', label: 'Cash' }
                                        ],
                                        placeholder: "Select Method"
                                    })}

                                    {wrapInput(Input, {
                                        label: "Advance",
                                        name: `products.${activeProductIndex}.gstDetails.advance`
                                    })}

                                    <div className="sm:col-span-2 lg:col-span-1">
                                        {wrapInput(Input, {
                                            label: "Remarks",
                                            name: `products.${activeProductIndex}.gstDetails.remarks`
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Order Summary Card */}
                            <div className="w-full lg:w-80 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="bg-gradient-to-r from-erp-accent to-blue-600 px-5 py-4">
                                    <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                                        <Icon icon="mdi:calculator" className="text-lg" />
                                        Order Summary
                                    </h3>
                                </div>

                                <div className="p-5 space-y-3">
                                    {/* Price */}
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-sm text-gray-500">Subtotal</span>
                                        <span className="text-sm font-bold text-gray-800">
                                            ₹{formik.values.products.reduce((acc, curr) => {
                                                const multiplier = curr.unit === 'pair' ? 2 : curr.unit === 'box' ? 10 : 1;
                                                return acc + ((parseFloat(curr.price) || 0) * (parseFloat(curr.qty) || 1) * multiplier);
                                            }, 0).toFixed(2)}
                                        </span>
                                    </div>

                                    <div className="border-t border-gray-100" />

                                    {/* Gross Total */}
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-sm text-gray-500">Gross Total</span>
                                        <span className="text-sm font-bold text-gray-800">
                                            ₹{formik.values.products.reduce((acc, curr) =>
                                                acc + (parseFloat(curr.price) || 0) * (parseFloat(curr.qty) || 1), 0
                                            ).toFixed(2)}
                                        </span>
                                    </div>

                                    <div className="border-t border-gray-100" />

                                    {/* GST Breakdown */}
                                    {(() => {
                                        let finalTotal = 0;
                                        let overallGST = 0;
                                        formik.values.products.forEach(prod => {
                                            const price = parseFloat(prod.price) || 0;
                                            const qty = parseFloat(prod.qty) || 1;
                                            const mult = prod.unit === 'pair' ? 2 : prod.unit === 'box' ? 10 : 1;
                                            const discount = parseFloat(prod.discount) || 0;
                                            const gstPct = parseFloat(prod.gstDetails?.gstPercent) || 0;

                                            const taxableAmount = (price * qty * mult) - discount;
                                            const gstAmt = taxableAmount > 0 ? taxableAmount * (gstPct / 100) : 0;

                                            overallGST += gstAmt;
                                            finalTotal += taxableAmount > 0 ? taxableAmount + gstAmt : 0;
                                        });

                                        const totalGst = overallGST.toFixed(2);
                                        const cgst = (overallGST / 2).toFixed(2);
                                        const sgst = (overallGST / 2).toFixed(2);

                                        return (
                                            <>
                                                <div className="bg-emerald-50 rounded-lg p-3 space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs text-emerald-600 font-medium">CGST</span>
                                                        <span className="text-xs font-bold text-emerald-700">₹{cgst}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs text-emerald-600 font-medium">SGST</span>
                                                        <span className="text-xs font-bold text-emerald-700">₹{sgst}</span>
                                                    </div>
                                                    <div className="border-t border-emerald-200 pt-2">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-xs text-emerald-700 font-semibold">Total GST</span>
                                                            <span className="text-sm font-bold text-emerald-700">₹{totalGst}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="border-t border-gray-100" />

                                                {/* Final Total */}
                                                <div className="bg-gradient-to-r from-erp-accent/10 to-blue-100/50 rounded-lg p-4 -mx-1">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-base font-bold text-gray-800">Final Total</span>
                                                        <span className="text-xl font-black text-erp-accent">
                                                            ₹{finalTotal.toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
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


