import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
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
import OrderLensRangeModal from '../components/ui/OrderLensRangeModal';

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
import { uploadImage } from '../services/bucketService';

const SectionCard = ({ children, className = '' }) => (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_0_rgba(0,0,0,0.06)] ${className}`}>
        {children}
    </div>
);

const SectionHeader = ({ icon, label, right }) => (
    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
            {icon && <span className="text-erp-accent/70 text-[15px]">{icon}</span>}
            <span className="text-[11px] font-black uppercase tracking-[0.08em] text-gray-400">{label}</span>
        </div>
        {right && <div>{right}</div>}
    </div>
);

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

const SideCheckbox = ({ active }) => (
    <span className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-[3px] border transition-all duration-150 flex-shrink-0
    ${active ? 'bg-erp-accent border-erp-accent' : 'bg-white border-gray-300'}`}>
        {active && (
            <Icon icon="mdi:check" className="text-white text-[9px]" />
        )}
    </span>
);

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

const Th = ({ children }) => (
    <div className="py-2.5 text-[10px] font-black uppercase tracking-[0.07em] text-gray-400 text-center border-r border-gray-100 last:border-r-0 bg-gray-50/80">
        {children}
    </div>
);

const resolveCategory = (catVal, configCategories = []) => {
    if (!catVal) return { categoryId: '', categoryName: '' };
    const valStr = String(catVal).trim();
    const matched = (configCategories || []).find(c =>
        c._id === valStr ||
        c.id === valStr ||
        (c.name && c.name.toUpperCase() === valStr.toUpperCase())
    );
    if (matched) {
        return { categoryId: matched._id || matched.id, categoryName: matched.name };
    }
    return { categoryId: valStr, categoryName: valStr };
};

const resolveBrand = (brandVal, configBrands = []) => {
    if (!brandVal) return { brandId: '', brandName: '' };
    const valStr = String(brandVal).trim();
    const matched = (configBrands || []).find(b =>
        b._id === valStr ||
        b.id === valStr ||
        (b.name && b.name.toUpperCase() === valStr.toUpperCase())
    );
    if (matched) {
        return { brandId: matched._id || matched.id, brandName: matched.name };
    }
    return { brandId: brandVal, brandName: brandVal };
};

const resolveIndex = (idxVal, configIndexes = []) => {
    if (idxVal === undefined || idxVal === null || idxVal === '') return '';
    const valStr = String(idxVal).trim();
    const matched = (configIndexes || []).find(i =>
        i._id === valStr ||
        i.id === valStr ||
        i.value?.toString() === valStr ||
        i.name?.toString() === valStr
    );
    if (matched) {
        return matched.value?.toString() || matched.name?.toString() || matched.label?.toString() || valStr;
    }
    return valStr;
};

const OrderWizard = () => {
    const user = useSelector((state) => state.auth.user);
    const [activeStep, setActiveStep] = useState(0);
    const [isLensRangeModalOpen, setIsLensRangeModalOpen] = useState(false);
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
    const [itemModalIndex, setItemModalIndex] = useState(null);
    const [activeCategories, setActiveCategories] = useState([]);
    const [uploadingItemImages, setUploadingItemImages] = useState({});

    const handleItemImageUpload = async (index, file) => {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast.error("File size must not exceed 5 MB");
            return;
        }
        setUploadingItemImages(prev => ({ ...prev, [index]: true }));
        try {
            const response = await uploadImage(file);
            const url = response.data?.url || response.url || response;
            const currentPhotos = formik.values.products[index]?.photos || [];
            formik.setFieldValue(`products.${index}.photos`, [...currentPhotos, url]);
            toast.success("Product image uploaded successfully!");
        } catch (error) {
            toast.error(error.message || 'Product image upload failed');
        } finally {
            setUploadingItemImages(prev => ({ ...prev, [index]: false }));
        }
    };

    const steps = ['Customer Details', 'Product Details', 'Advanced Details'];

    const productTemplate = {
        qty: 1,
        unit: 'piece',
        price: 0,
        discount: 0,
        brand: '',
        photos: [],
        powerMode: 'both',
        productMode: 'rx',
        orderType: 'rx',
        availability: 'in-house',
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
        estimatedDeliveryDate: '',
        customerBalance: '0.00',

        // Product Details Array
        products: Array(5).fill(null).map(() => ({ ...productTemplate })),

        // Step 3: Shipping & Payment
        directCustomer: '',
        shippingCharges: '',
        otherCharges: '',
        advancePayment: ''
    };

    const validationSchema = Yup.object().shape({
        // Step 1: Customer Details
        customerId: Yup.string().required('Customer selection is required'),

        // Step 2: Product Details
        products: Yup.array().of(
            Yup.object().shape({
                orderType: Yup.string(),
                vendorId: Yup.string().test('is-vendor-required', 'Vendor selection is required for Order / Rx items', function (value) {
                    const { availability, orderType, productName } = this.parent;
                    if (!productName) return true; // skip unselected empty rows
                    if (orderType === 'rx' || availability === 'order' || availability === 'order-to-whom') {
                        return !!value;
                    }
                    return true;
                }),
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
                                    availability: (prod.availability === 'order-to-whom' || prod.availability === 'order' || rxData.availability === 'order-to-whom' || rxData.availability === 'order') ? 'order' : (prod.availability || rxData.availability || 'in-house'),
                                    hasPrism: (prod.hasPrism || prismsSource?.length > 0) ? 'yes' : 'no',
                                    selectedSide: powersSource?.[0]?.side || 'R',
                                    brandId: resolveBrand(prod.brand?.name || prod.brand?.id || prod.brand || prod.brandId || prod.Brand, configs.brand).brandId,
                                    Brand: resolveBrand(prod.brand?.name || prod.brand?.id || prod.brand || prod.brandId || prod.Brand, configs.brand).brandName,
                                    brand: resolveBrand(prod.brand?.name || prod.brand?.id || prod.brand || prod.brandId || prod.Brand, configs.brand).brandName,
                                    categoryId: resolveCategory(prod.category?.name || prod.category?.id || prod.category || prod.categoryId, configs.category).categoryId,
                                    category: resolveCategory(prod.category?.name || prod.category?.id || prod.category || prod.categoryId, configs.category).categoryName,
                                    treatmentId: prod.treatment?.id || '',
                                    indexId: (prod.index !== undefined && prod.index !== null) ? prod.index.toString() : '',
                                    index: (prod.index !== undefined && prod.index !== null) ? prod.index.toString() : '',
                                    productId: prod.productId || (typeof prod.productName === 'object' ? prod.productName?.id : '') || '',
                                    productName: prod.itemName || (typeof prod.productName === 'object' ? prod.productName?.name : prod.productName) || '',
                                    itemName: prod.itemName || (typeof prod.productName === 'object' ? prod.productName?.name : prod.productName) || '',
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
                                productId: order.productId || (typeof order.productName === 'object' ? order.productName?.id : '') || '',
                                productName: order.itemName || (typeof order.productName === 'object' ? order.productName?.name : order.productName) || '',
                                itemName: order.itemName || (typeof order.productName === 'object' ? order.productName?.name : order.productName) || '',
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

    const handleAddBulkProducts = (newProducts) => {
        const currentProducts = formik.values.products || [];
        const substantial = currentProducts.filter(p => {
            return !!(p.productName || p.brandId || p.categoryId || p.brand || p.productId);
        });
        const sanitizedNewProducts = (newProducts || []).map(p => ({
            ...p,
            powerTable: p.powerTable || {
                R: { sph: p.sph || '', cyl: p.cyl || '', axis: p.axis || '', add: p.addition || '', dia: '70' },
                L: { sph: p.sph || '', cyl: p.cyl || '', axis: p.axis || '', add: p.addition || '', dia: '70' }
            },
            prismTable: p.prismTable || {
                R: { prism: '', base: '' },
                L: { prism: '', base: '' }
            },
            centrationData: p.centrationData || {
                R: { pd: '', corridor: '', fittingHeight: '' },
                L: { pd: '', corridor: '', fittingHeight: '' }
            }
        }));
        const merged = [...substantial, ...sanitizedNewProducts];
        formik.setFieldValue('products', merged);
        setActiveProductIndex(Math.max(0, merged.length - 1));

        // Inject new products to searchable product list
        sanitizedNewProducts.forEach(prod => {
            setProductNames(prev => {
                if (prev.some(p => p.value === prod.productId)) return prev;
                return [...prev, {
                    value: prod.productId,
                    label: prod.productName,
                    raw: {
                        _id: prod.productId,
                        productName: prod.productName,
                        category: prod.category,
                        brand: prod.brand,
                        price: prod.price,
                        mrp: prod.MRP,
                        gst: parseFloat(prod.gstDetails?.gstPercent) || 12,
                        hsnSac: prod.HSNSAC,
                        sph: prod.powerTable?.R?.sph || '',
                        cyl: prod.powerTable?.R?.cyl || '',
                        addition: prod.powerTable?.R?.add || ''
                    }
                }];
            });
        });
    };

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

        const activeProducts = (values.products || []).filter(prod => {
            return !!(prod.productName || prod.productId || prod.brandId || prod.categoryId || prod.brand);
        });
        const finalProducts = activeProducts.length > 0 ? activeProducts : [(values.products || [])[0]];

        const items = finalProducts.map(prod => {
            const brandData = getFieldData('brand', prod.brandId);
            const categoryData = getFieldData('category', prod.categoryId);
            const productData = getProductNameData(prod.productName);
            const coatingData = getFieldData('coating', prod.coatingId);
            const tintData = getFieldData('tints', prod.tintId);
            const treatmentData = getFieldData('treatment', prod.treatmentId);

            const isRx = prod.orderType === 'rx' || prod.availability === 'order' || prod.availability === 'order-to-whom' || !!prod.vendorId;
            const cat = determineCategory(categoryData?.name, productData?.name);

            // Calculate discount details
            const discountAmount = parseFloat(prod.discount) || 0;
            const price = parseFloat(prod.price) || 0;
            const qty = parseInt(prod.qty) || 1;
            const unitMultiplier = prod.unit === 'pair' ? 2 : prod.unit === 'box' ? 10 : 1;
            const totalBeforeDiscount = price * qty * unitMultiplier;
            const discountPercent = totalBeforeDiscount > 0 ? parseFloat(((discountAmount / totalBeforeDiscount) * 100).toFixed(2)) : 0;

            const rxVendor = getFieldData('vendors', prod.vendorId) || (configs.vendors || []).find(v => v._id === prod.vendorId || v.vendorNumber === prod.vendorId || v.name === prod.vendorId);
            const vendorObj = rxVendor ? { id: rxVendor._id || rxVendor.id || rxVendor.vendorNumber, name: rxVendor.name } : (prod.vendorId ? { id: prod.vendorId, name: prod.vendorName || prod.vendorId } : { id: "", name: "" });

            const availVal = (prod.availability === 'order-to-whom' || prod.availability === 'order') ? 'order' : (prod.availability || 'in-house');
            const orderSourceVal = availVal === 'order' ? 'ORDER' : 'INHOUSE';

            const baseItem = {
                productId: prod.productId || undefined,
                unit: (prod.unit || 'piece').toUpperCase(),
                orderType: isRx ? 'RX' : 'STOCK',
                itemName: prod.itemName || prod.productName || productData?.name || '',
                qty: qty,
                category: cat,
                discountPercent: discountPercent,
                discountAmount: discountAmount,
                price: price,
                gst: parseFloat(prod.gstDetails?.gstPercent) || 0,
                hsnSac: prod.HSNSAC || '',
                mrp: parseFloat(prod.MRP) || 0,
                brand: prod.brand || brandData?.name || prod.Brand || '',
                code: prod.code || prod.Code || '',
                color: prod.color || '',
                size: prod.size || prod.Size || '',
                shape: prod.shape || prod.Shape || '',
                dimensions: prod.dimensions || prod.Dimensions || prod.size || prod.Size || '',
                photos: prod.photos || [],
                orderSource: orderSourceVal
            };

            if (prod.vendorId || (rxVendor && rxVendor._id)) {
                baseItem.vendor = {
                    id: vendorObj.id,
                    name: vendorObj.name
                };
            }

            // Add fields only for LENS & CONTACT_LENS
            if (cat === 'LENS' || cat === 'CONTACT_LENS') {
                const primarySide = (prod.powerMode === 'single' && prod.selectedSide) ? prod.selectedSide : 'R';
                const pSide = prod.powerTable?.[primarySide] || {};
                baseItem.sph = parseFloat(pSide.sph) || 0;
                baseItem.cyl = parseFloat(pSide.cyl) || 0;
                baseItem.axis = parseFloat(pSide.axis) || 0;
                baseItem.add = parseFloat(pSide.add) || 0;
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

            // If it is RX, populate nested rx object
            if (prod.orderType === 'rx' || isRx) {
                const powers = [];
                const mapPower = (side) => {
                    const pSide = prod.powerTable?.[side] || {};
                    return {
                        side,
                        sph: parseFloat(pSide.sph) || 0,
                        cyl: parseFloat(pSide.cyl) || 0,
                        axis: parseFloat(pSide.axis) || 0,
                        add: parseFloat(pSide.add) || 0,
                        diameter: parseFloat(pSide.dia) || 70
                    };
                };

                if (prod.powerMode === 'both') {
                    powers.push(mapPower('R'));
                    powers.push(mapPower('L'));
                } else {
                    powers.push(mapPower(prod.selectedSide || 'R'));
                }

                const prisms = [];
                if (prod.hasPrism === 'yes') {
                    const mapPrism = (side) => {
                        const prSide = prod.prismTable?.[side] || {};
                        return {
                            side,
                            prism: parseFloat(prSide.prism) || 0,
                            base: prSide.base || ''
                        };
                    };
                    if (prod.powerMode === 'both') {
                        prisms.push(mapPrism('R'));
                        prisms.push(mapPrism('L'));
                    } else {
                        prisms.push(mapPrism(prod.selectedSide || 'R'));
                    }
                }

                const centration = [];
                const mapCentration = (side) => {
                    const cSide = prod.centrationData?.[side] || {};
                    return {
                        side,
                        pd: parseFloat(cSide.pd) || 0,
                        corridor: parseFloat(cSide.corridor) || 0,
                        fittingHeight: parseFloat(cSide.fittingHeight) || 0
                    };
                };

                if (prod.powerMode === 'both') {
                    centration.push(mapCentration('R'));
                    centration.push(mapCentration('L'));
                } else {
                    centration.push(mapCentration(prod.selectedSide || 'R'));
                }

                baseItem.rx = {
                    vendor: {
                        id: vendorObj.id,
                        name: vendorObj.name
                    },
                    lab: {
                        id: "",
                        name: prod.labName || ""
                    },
                    orderReference: values.orderReference || '',
                    consumerCardName: values.consumerCardName || '',
                    opticianName: values.opticianName || '',
                    powerType: prod.powerMode === 'both' ? 'Both' : 'Single',
                    productMode: 'Rx',
                    hasPrism: prod.hasPrism === 'yes',
                    powers,
                    prisms,
                    centration,
                    coating: {
                        id: coatingData?.id || "",
                        name: coatingData?.name || prod.coating || ""
                    },
                    treatment: {
                        id: treatmentData?.id || "",
                        name: treatmentData?.name || prod.treatment || ""
                    },
                    tint: {
                        id: tintData?.id || "",
                        name: tintData?.name || prod.tint || ""
                    },
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
                    otherCharges: parseFloat(values.otherCharges) || 0,
                    advanceAmount: parseFloat(prod.gstDetails?.advance) || 0
                };
            }

            return baseItem;
        });

        // Compute overall order metrics
        const subtotal = items.reduce((acc, curr) => acc + ((curr.price || 0) * (curr.qty || 1)), 0);
        const grossTotal = items.reduce((acc, curr) => {
            const taxables = ((curr.price || 0) * (curr.qty || 1)) - (curr.discountAmount || 0);
            const gstAmt = taxables > 0 ? taxables * ((curr.gst || 0) / 100) : 0;
            return acc + (taxables > 0 ? taxables + gstAmt : 0);
        }, 0);
        const totalGst = items.reduce((acc, curr) => {
            const taxables = ((curr.price || 0) * (curr.qty || 1)) - (curr.discountAmount || 0);
            return acc + (taxables > 0 ? taxables * ((curr.gst || 0) / 100) : 0);
        }, 0);

        const shipping = parseFloat(values.shippingCharges) || 0;
        const other = parseFloat(values.otherCharges) || 0;

        const totalAdvance = values.products.reduce((acc, curr) => {
            return acc + (parseFloat(curr.gstDetails?.advance) || 0);
        }, 0);

        const grossTotalWithCharges = grossTotal + shipping + other;
        const netPayableTotal = Math.max(0, grossTotalWithCharges - totalAdvance);

        const representativeGst = items.length > 0 ? items[0].gst : 18;
        const cgstStr = (totalGst / 2).toFixed(2);
        const sgstStr = (totalGst / 2).toFixed(2);

        // Also add total metrics to rx objects inside items if present
        items.forEach(it => {
            if (it.rx) {
                it.rx.advanceAmount = totalAdvance;
                it.rx.subtotal = subtotal;
                it.rx.totalGst = totalGst;
                it.rx.netPayableTotal = netPayableTotal;
                it.rx.grossTotalWithCharges = grossTotalWithCharges;
            }
        });

        return {
            customerId: values.customerId,
            customerShipToId: values.shipToId,
            isDraft: status === 'Draft',
            shippingCharges: shipping,
            otherCharges: other,
            advanceAmount: totalAdvance,
            subtotal: parseFloat(subtotal.toFixed(2)),
            grossTotal: parseFloat(grossTotal.toFixed(2)),
            totalGst: parseFloat(totalGst.toFixed(2)),
            netPayableTotal: parseFloat(netPayableTotal.toFixed(2)),
            grossTotalWithCharges: parseFloat(grossTotalWithCharges.toFixed(2)),
            directCustomer: values.directCustomer || '',
            orders: [
                {
                    orderNumber: values.orderReference || undefined,
                    estimatedDeliveryDate: values.estimatedDeliveryDate || undefined,
                    items,
                    cgst: cgstStr,
                    sgst: sgstStr,
                    totalGst: parseFloat(totalGst.toFixed(2)),
                    subtotal: parseFloat(subtotal.toFixed(2)),
                    grossTotal: parseFloat(grossTotal.toFixed(2)),
                    shippingCharges: shipping,
                    otherCharges: other,
                    netPayableTotal: parseFloat(netPayableTotal.toFixed(2)),
                    grossTotalWithCharges: parseFloat(grossTotalWithCharges.toFixed(2)),
                }
            ],
            orderReference: values.orderReference,
            consumerCardName: values.consumerCardName,
            opticianName: values.opticianName,
        };
    };

    const handleSaveDraft = async () => {
        try {
            const cleanedProducts = (formik.values.products || []).filter(prod => {
                return !!(prod.productName || prod.productId || prod.brandId || prod.categoryId || prod.brand);
            });
            const finalProducts = cleanedProducts.length > 0 ? cleanedProducts : [(formik.values.products || [])[0]];
            if (finalProducts.length !== (formik.values.products || []).length) {
                formik.setFieldValue('products', finalProducts);
                formik.values.products = finalProducts;
            }
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
                const response = await getProductNames(search, 1, 100, brandName, categoryName);
                const rawData = response?.data || response;
                const items = Array.isArray(rawData?.data)
                    ? rawData.data
                    : (Array.isArray(rawData) ? rawData : (Array.isArray(response) ? response : []));
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
        const prefix = `products.${index}.`;

        if (!selectedValue) {
            formik.setFieldValue(`${prefix}productId`, '');
            formik.setFieldValue(`${prefix}productName`, '');
            formik.setFieldValue(`${prefix}itemName`, '');
            return;
        }

        const option = productNames.find(p => p.value === selectedValue || p.label === selectedValue);

        if (option && option.raw) {
            const rawProd = option.raw;
            formik.setFieldValue(`${prefix}productId`, rawProd._id || rawProd.id || '');
            formik.setFieldValue(`${prefix}productName`, rawProd.productName || rawProd.name || '');
            formik.setFieldValue(`${prefix}itemName`, rawProd.productName || rawProd.name || '');

            // Auto select stock option when a product is selected
            formik.setFieldValue(`${prefix}productMode`, 'stock');
            formik.setFieldValue(`${prefix}orderType`, 'stock');

            const catInfo = resolveCategory(rawProd.category, configs.category || []);
            formik.setFieldValue(`${prefix}categoryId`, catInfo.categoryId);
            formik.setFieldValue(`${prefix}category`, catInfo.categoryName);

            const brandInfo = resolveBrand(rawProd.brand || rawProd.Brand, configs.brand || []);
            formik.setFieldValue(`${prefix}brandId`, brandInfo.brandId);
            formik.setFieldValue(`${prefix}Brand`, brandInfo.brandName);
            formik.setFieldValue(`${prefix}brand`, brandInfo.brandName);

            // Check stock quantity and automatically set availability to 'order' if stock is 0
            const stockVal = rawProd.stockQty ?? rawProd.stock ?? rawProd.quantity ?? rawProd.currentStock ?? rawProd.availableStock ?? rawProd.inStock ?? rawProd.qtyInStock ?? rawProd.countInStock ?? rawProd.qty;
            const isOutOfStock = stockVal !== undefined && stockVal !== null && Number(stockVal) <= 0;

            if (isOutOfStock) {
                formik.setFieldValue(`${prefix}availability`, 'order');
            } else if (rawProd.availability) {
                formik.setFieldValue(`${prefix}availability`, rawProd.availability);
            } else {
                formik.setFieldValue(`${prefix}availability`, 'in-house');
            }

            formik.setFieldValue(`${prefix}price`, rawProd.price || 0);
            formik.setFieldValue(`${prefix}MRP`, rawProd.mrp || rawProd.MRP || 0);
            formik.setFieldValue(`${prefix}qty`, 1);

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

            // Map lens-specific fields with resolveIndex
            const idxVal = resolveIndex(rawProd.index, configs.index || []);
            if (idxVal) {
                formik.setFieldValue(`${prefix}indexId`, idxVal);
                formik.setFieldValue(`${prefix}index`, idxVal);
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
                    const catInfo = resolveCategory(fullProd.category, configs.category || []);
                    set('categoryId', catInfo.categoryId);
                    set('category', catInfo.categoryName);

                    const brandInfo = resolveBrand(fullProd.brand || fullProd.Brand, configs.brand || []);
                    set('brandId', brandInfo.brandId);
                    set('Brand', brandInfo.brandName);
                    set('brand', brandInfo.brandName);
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
                    set('coating', fullProd.coating || '');
                    set('treatment', fullProd.treatment || '');
                    set('tint', fullProd.tint || '');
                    set('sph', fullProd.sph || '');
                    set('cyl', fullProd.cyl || '');
                    set('axis', fullProd.axis || '');
                    set('addition', fullProd.addition || fullProd.add || '');

                    const fullIdxVal = resolveIndex(fullProd.index, configs.index || []);
                    if (fullIdxVal) {
                        set('indexId', fullIdxVal);
                        set('index', fullIdxVal);
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

                    // Auto-set availability to 'order' if full product stock is 0 or less
                    const fStock = fullProd.stockQty ?? fullProd.stock ?? fullProd.quantity ?? fullProd.currentStock ?? fullProd.availableStock ?? fullProd.inStock ?? fullProd.qtyInStock ?? fullProd.countInStock ?? fullProd.qty;
                    if (fStock !== undefined && fStock !== null && Number(fStock) <= 0) {
                        formik.setFieldValue(`${prefix}availability`, 'order');
                    }
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
            const pTable = activeProduct?.powerTable || formik.values.powerTable || { R: {}, L: {} };
            const rSide = pTable.R || {};
            powers.push({
                side: 'R',
                sph: parseFloat(rSide.sph) || 0,
                cyl: parseFloat(rSide.cyl) || 0,
                diameter: parseFloat(rSide.dia) || 70
            });

            if ((formik.values.powerMode || activeProduct?.powerMode) === 'both') {
                const lSide = pTable.L || {};
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
                onChange={props.onChange || formik.handleChange}
                onBlur={props.onBlur || formik.handleBlur}
                value={props.value !== undefined ? props.value : (fieldValue ?? '')}
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
        // Clean out empty product rows first if we are in Step 2 (Product details)
        if (activeStep === 1) {
            const cleanedProducts = (formik.values.products || []).filter(prod => {
                return !!(prod.productName || prod.productId || prod.brandId || prod.categoryId || prod.brand);
            });
            const finalProducts = cleanedProducts.length > 0 ? cleanedProducts : [(formik.values.products || [])[0]];
            if (finalProducts.length !== (formik.values.products || []).length) {
                formik.setFieldValue('products', finalProducts);
                formik.values.products = finalProducts;
            }
        }

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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-6 pb-6">
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
                    {wrapInput(Input, {
                        label: "Estimated Delivery Date",
                        name: "estimatedDeliveryDate",
                        type: "datetime-local",
                        disabled: isReadOnly
                    })}
                </div>

            </div>
        );
    };

    // ─── Enhanced renderActiveProductDetails ────────────────────────────────────
    const renderActiveProductDetails = (index) => {
        const product = formik.values.products[index];
        const prefix = `products.${index}.`;
        const isStock = product.orderType === 'stock';
        const isStockInhouse = isStock && (!product.availability || product.availability === 'in-house');

        const categoryObj = configs.category?.find(c => c._id === product.categoryId || c.name === product.category);
        const catName = (categoryObj?.name || product.category || '').toUpperCase();
        const isLensCategory = !catName || catName.includes('LENS') || catName.includes('GLASS') || catName.includes('RX') || product.orderType === 'rx';

        const isSideDisabled = (side) => isStockInhouse || isStock || !isLensCategory || (product.powerMode === 'single' && product.selectedSide !== side);

        return (
            <div className="space-y-3 p-2 sm:p-4 bg-gray-50/60 rounded-2xl border border-gray-100">

                {/* Stock In-House Banner */}
                {isStockInhouse && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                        <Icon icon="mdi:lock-outline" className="text-amber-600 text-base flex-shrink-0" />
                        <span className="text-[11px] font-semibold text-amber-800">
                            Stock In-House item — details are auto-filled from inventory and cannot be edited.
                        </span>
                    </div>
                )}

                {/* ── Prescription Section ── */}
                {isLensCategory && (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                        {/* Header with Power & Prism Toggles */}
                        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                            <span className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-2">
                                <Icon icon="mdi:microscope" className="text-erp-accent text-base" />
                                Prescription Details {isStock ? "(Disabled in Stock mode)" : ""}
                            </span>
                            <div className="flex flex-wrap items-center gap-3">
                                <PillToggle
                                    label="Power"
                                    value={product.powerMode}
                                    onChange={(v) => formik.setFieldValue(`${prefix}powerMode`, v)}
                                    options={[{ label: 'Single', value: 'single' }, { label: 'Both', value: 'both' }]}
                                    disabled={isStock || isReadOnly}
                                />
                                <PillToggle
                                    label="Prism"
                                    value={product.hasPrism}
                                    onChange={(v) => formik.setFieldValue(`${prefix}hasPrism`, v)}
                                    options={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }]}
                                    disabled={isStock || isReadOnly}
                                />
                            </div>
                        </div>

                        {/* Responsive Prescription Cards / Table */}
                        <div className="p-3 sm:p-4 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {['R', 'L'].map((side) => {
                                    const disabled = isSideDisabled(side);
                                    const active = product.powerMode === 'single' && product.selectedSide === side;
                                    const isSingle = product.powerMode === 'single';
                                    const sideBg = side === 'R' ? 'bg-amber-50/30 border-amber-200/70' : 'bg-blue-50/30 border-blue-200/70';
                                    const sideTitleColor = side === 'R' ? 'text-amber-900' : 'text-blue-900';
                                    const badgeColor = side === 'R' ? 'bg-amber-500' : 'bg-blue-500';

                                    return (
                                        <div
                                            key={side}
                                            className={`rounded-2xl border p-3 space-y-2.5 transition-all ${sideBg} ${disabled ? 'opacity-40' : ''}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div
                                                    onClick={() => isSingle && !isReadOnly && formik.setFieldValue(`${prefix}selectedSide`, side)}
                                                    className={`flex items-center gap-2 ${isSingle ? 'cursor-pointer' : 'cursor-default'}`}
                                                >
                                                    {isSingle && <SideCheckbox active={active} />}
                                                    <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${sideTitleColor}`}>
                                                        <span className={`w-2.5 h-2.5 rounded-full ${badgeColor}`} />
                                                        {side === 'R' ? 'Right Eye (R)' : 'Left Eye (L)'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-5 gap-1.5">
                                                <div>
                                                    <span className="text-[9px] font-bold text-gray-400 block text-center uppercase">SPH</span>
                                                    <CellInput
                                                        name={`${prefix}powerTable.${side}.sph`}
                                                        value={product.powerTable[side].sph}
                                                        onChange={formik.handleChange}
                                                        disabled={disabled}
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-bold text-gray-400 block text-center uppercase">CYL</span>
                                                    <CellInput
                                                        name={`${prefix}powerTable.${side}.cyl`}
                                                        value={product.powerTable[side].cyl}
                                                        onChange={formik.handleChange}
                                                        disabled={disabled}
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-bold text-gray-400 block text-center uppercase">AXIS</span>
                                                    <CellInput
                                                        name={`${prefix}powerTable.${side}.axis`}
                                                        value={product.powerTable[side].axis}
                                                        onChange={formik.handleChange}
                                                        disabled={disabled}
                                                        placeholder="0"
                                                    />
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-bold text-gray-400 block text-center uppercase">ADD</span>
                                                    <CellInput
                                                        name={`${prefix}powerTable.${side}.add`}
                                                        value={product.powerTable[side].add}
                                                        onChange={formik.handleChange}
                                                        disabled={disabled}
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-bold text-gray-400 block text-center uppercase">DIA</span>
                                                    <CellInput
                                                        name={`${prefix}powerTable.${side}.dia`}
                                                        value={product.powerTable[side].dia}
                                                        onChange={formik.handleChange}
                                                        disabled={disabled}
                                                        placeholder="70"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Prism Table (if enabled) */}
                            {product.hasPrism === 'yes' && (
                                <div className="rounded-xl border border-erp-accent/20 p-3 bg-erp-accent/5/30 space-y-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-erp-accent">Prism Specification</span>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {['R', 'L'].map((side) => {
                                            const disabled = isSideDisabled(side);
                                            return (
                                                <div key={side} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200">
                                                    <span className="text-xs font-black text-gray-600 w-6 text-center">{side}</span>
                                                    <div className="flex-1">
                                                        <CellInput name={`${prefix}prismTable.${side}.prism`} value={product.prismTable[side].prism} onChange={formik.handleChange} disabled={disabled} placeholder="Prism" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <CellInput name={`${prefix}prismTable.${side}.base`} value={product.prismTable[side].base} onChange={formik.handleChange} disabled={disabled} placeholder="Base" />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Product Specifications Card ── */}
                <SectionCard>
                    <SectionHeader label={isStock ? "Stock Product Specifications" : "Prescription Product Specifications"} />
                    <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Row 1: Primary Select Dropdowns */}
                        {product.orderType === 'rx' && isLensCategory && wrapInput(SearchableSelect, {
                            label: "Vendor",
                            name: `${prefix}vendorId`,
                            value: {
                                value: product.vendorId || '',
                                label: (configs.vendors?.find(v => v._id === product.vendorId || v.vendorNumber === product.vendorId)?.name) || product.vendorId || ''
                            },
                            options: (Array.isArray(configs.vendors) ? configs.vendors : []).map(v => ({ value: v._id || v.vendorNumber, label: v.name })),
                            placeholder: "Select vendor",
                            disabled: isReadOnly,
                            onChange: (e) => {
                                const val = e.target.value;
                                const vObj = configs.vendors?.find(v => v._id === val || v.vendorNumber === val || v.name === val);
                                formik.setFieldValue(`${prefix}vendorId`, val);
                                formik.setFieldValue(`${prefix}vendorName`, vObj ? vObj.name : val);
                            }
                        })}

                        {wrapInput(SearchableSelect, {
                            label: "Brand",
                            name: `${prefix}brandId`,
                            value: {
                                value: product.brandId || product.brand || product.Brand,
                                label: product.Brand || product.brand || (configs.brand?.find(b => b._id === product.brandId)?.name) || product.brandId || ''
                            },
                            options: (Array.isArray(configs.brand) ? configs.brand : []).map(b => ({ value: b._id, label: b.name })),
                            placeholder: "Select brand",
                            disabled: isStockInhouse || isReadOnly,
                            onChange: (e) => {
                                const bId = e.target.value;
                                const bObj = configs.brand?.find(b => b._id === bId || b.name === bId);
                                formik.setFieldValue(`${prefix}brandId`, bId);
                                formik.setFieldValue(`${prefix}Brand`, bObj ? bObj.name : bId);
                                formik.setFieldValue(`${prefix}brand`, bObj ? bObj.name : bId);
                            }
                        })}

                        {wrapInput(SearchableSelect, {
                            label: "Category",
                            name: `${prefix}categoryId`,
                            value: {
                                value: product.categoryId || product.category,
                                label: product.category || (configs.category?.find(c => c._id === product.categoryId)?.name) || product.categoryId || ''
                            },
                            options: (Array.isArray(configs.category) ? configs.category : []).map(c => ({ value: c._id, label: c.name })),
                            placeholder: "Select category",
                            disabled: isStockInhouse || isReadOnly,
                            onChange: (e) => {
                                const cId = e.target.value;
                                const cObj = configs.category?.find(c => c._id === cId || c.name === cId);
                                formik.setFieldValue(`${prefix}categoryId`, cId);
                                formik.setFieldValue(`${prefix}category`, cObj ? cObj.name : cId);
                            }
                        })}

                        {wrapInput(SearchableSelect, {
                            label: "Treatment",
                            name: `${prefix}treatmentId`,
                            value: {
                                value: product.treatmentId || (configs.treatment?.find(t => t.name?.toUpperCase() === (product.treatment || '').toUpperCase())?._id) || product.treatment || '',
                                label: product.treatment || (configs.treatment?.find(t => t._id === product.treatmentId || t.name === product.treatmentId)?.name) || product.treatmentId || ''
                            },
                            placeholder: isLensCategory ? "Select Treatment" : "N/A (Lens Only)",
                            options: (Array.isArray(configs.treatment) ? configs.treatment : []).map(t => ({ value: t._id || t.name, label: t.name || t._id })),
                            onChange: (e) => {
                                const val = e.target.value;
                                const tObj = configs.treatment?.find(t => t._id === val || t.name === val);
                                formik.setFieldValue(`${prefix}treatmentId`, val);
                                formik.setFieldValue(`${prefix}treatment`, tObj ? tObj.name : val);
                            },
                            disabled: isStockInhouse || !isLensCategory || isReadOnly
                        })}

                        {/* Row 2: Secondary Select Dropdowns */}
                        {wrapInput(SearchableSelect, {
                            label: "Index",
                            name: `${prefix}indexId`,
                            value: {
                                value: product.indexId || product.index || '',
                                label: product.indexId || product.index || ''
                            },
                            onChange: (e) => {
                                const val = e.target.value;
                                formik.setFieldValue(`${prefix}indexId`, val);
                                formik.setFieldValue(`${prefix}index`, val);
                            },
                            options: (Array.isArray(configs.index) ? configs.index : []).map(i => {
                                const val = i.value?.toString() || i.name?.toString() || i.toString() || '';
                                return { value: val, label: val };
                            }),
                            placeholder: isLensCategory ? "Type or select Index" : "N/A (Lens Only)",
                            disabled: isStockInhouse || !isLensCategory || isReadOnly,
                            freeSolo: true
                        })}

                        {wrapInput(SearchableSelect, {
                            label: "Coating",
                            name: `${prefix}coatingId`,
                            value: {
                                value: product.coatingId || (configs.coating?.find(c => c.name?.toUpperCase() === (product.coating || '').toUpperCase())?._id) || product.coating || '',
                                label: product.coating || (configs.coating?.find(c => c._id === product.coatingId || c.name === product.coatingId)?.name) || product.coatingId || ''
                            },
                            placeholder: isLensCategory ? "Select Coating" : "N/A (Lens Only)",
                            options: (Array.isArray(configs.coating) ? configs.coating : []).map(c => ({ value: c._id || c.name, label: c.name || c._id })),
                            onChange: (e) => {
                                const val = e.target.value;
                                const cObj = configs.coating?.find(c => c._id === val || c.name === val);
                                formik.setFieldValue(`${prefix}coatingId`, val);
                                formik.setFieldValue(`${prefix}coating`, cObj ? cObj.name : val);
                            },
                            disabled: isStockInhouse || !isLensCategory || isReadOnly
                        })}

                        {wrapInput(SearchableSelect, {
                            label: "Tint",
                            name: `${prefix}tintId`,
                            value: {
                                value: product.tintId || (configs.tints?.find(t => t.name?.toUpperCase() === (product.tint || '').toUpperCase())?._id) || product.tint || '',
                                label: product.tint || (configs.tints?.find(t => t._id === product.tintId || t.name === product.tintId)?.name) || product.tintId || ''
                            },
                            placeholder: isLensCategory ? "Select Tint" : "N/A (Lens Only)",
                            options: (Array.isArray(configs.tints) ? configs.tints : []).map(t => ({ value: t._id || t.name, label: t.name || t._id })),
                            onChange: (e) => {
                                const val = e.target.value;
                                const tObj = configs.tints?.find(t => t._id === val || t.name === val);
                                formik.setFieldValue(`${prefix}tintId`, val);
                                formik.setFieldValue(`${prefix}tint`, tObj ? tObj.name : val);
                            },
                            disabled: isStockInhouse || !isLensCategory || isReadOnly
                        })}

                        {/* Text Inputs Row Start */}
                        {product.orderType === 'rx' && isLensCategory && wrapInput(Input, {
                            label: "Lab name",
                            name: `${prefix}labName`,
                            placeholder: "Enter lab name",
                            disabled: isReadOnly
                        })}

                        {wrapInput(Input, {
                            label: "Tint details",
                            name: `${prefix}tintDetails`,
                            placeholder: isLensCategory ? "Tint details" : "N/A",
                            disabled: isStockInhouse || !isLensCategory || isReadOnly
                        })}

                        {wrapInput(Input, {
                            label: "Color",
                            name: `${prefix}color`,
                            placeholder: "e.g., Black / Gold",
                            disabled: isReadOnly
                        })}

                        {wrapInput(Input, {
                            label: "Size",
                            name: `${prefix}size`,
                            placeholder: "e.g., 52-18-140",
                            disabled: isReadOnly
                        })}

                        {wrapInput(Input, {
                            label: "Dimensions",
                            name: `${prefix}dimensions`,
                            placeholder: "e.g., 52-18-140",
                            disabled: isReadOnly
                        })}

                        {wrapInput(Input, {
                            label: "Shape / Type",
                            name: `${prefix}shape`,
                            placeholder: "e.g., Rectangle / Full Rim",
                            disabled: isReadOnly
                        })}

                        {wrapInput(Input, {
                            label: "Material",
                            name: `${prefix}material`,
                            placeholder: "e.g., Titanium / Acetate",
                            disabled: isStockInhouse || isReadOnly
                        })}

                        {wrapInput(Input, {
                            label: "HSN / SAC",
                            name: `${prefix}HSNSAC`,
                            placeholder: "HSN Code",
                            disabled: isStockInhouse || isReadOnly
                        })}

                        {wrapInput(Input, {
                            label: "MRP",
                            name: `${prefix}MRP`,
                            placeholder: "0.00",
                            type: "number",
                            disabled: isStockInhouse || isReadOnly
                        })}

                        {wrapInput(Input, {
                            label: "Remarks",
                            name: `${prefix}remarks`,
                            placeholder: "Enter remarks",
                            disabled: isStockInhouse || isReadOnly
                        })}

                        {isLensCategory && (
                            <div className="flex items-end pb-0.5">
                                <PillToggle
                                    label="Mirror"
                                    value={product.hasMirror}
                                    onChange={(v) => formik.setFieldValue(`${prefix}hasMirror`, v)}
                                    options={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }]}
                                    disabled={isStockInhouse || !isLensCategory || isReadOnly}
                                    className="w-full md:w-auto"
                                />
                            </div>
                        )}
                    </div>
                </SectionCard>

                {/* ── CENTRATION ── */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                        <span className="text-xs font-black uppercase tracking-wider text-gray-700">Centration</span>
                    </div>
                    <div className="p-3 sm:p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {['R', 'L'].map((side) => {
                                const disabled = product.powerMode === 'single' && product.selectedSide !== side;
                                return (
                                    <div key={side} className={`flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 ${side === 'R' ? 'bg-amber-50/20' : 'bg-blue-50/20'} ${disabled ? 'opacity-40' : ''}`}>
                                        <span className="text-xs font-black text-gray-600 w-6 text-center">{side}</span>
                                        <div className="flex-1">
                                            <span className="text-[9px] font-bold text-gray-400 block text-center uppercase">PD</span>
                                            <CellInput name={`${prefix}centrationData.${side}.pd`} value={product.centrationData[side].pd} onChange={formik.handleChange} disabled={isStock || disabled} placeholder="PD" />
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-[9px] font-bold text-gray-400 block text-center uppercase">Corridor</span>
                                            <CellInput name={`${prefix}centrationData.${side}.corridor`} value={product.centrationData[side].corridor} onChange={formik.handleChange} disabled={isStock || disabled} placeholder="Corridor" />
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-[9px] font-bold text-gray-400 block text-center uppercase">Fit Ht</span>
                                            <CellInput name={`${prefix}centrationData.${side}.fittingHeight`} value={product.centrationData[side].fittingHeight} onChange={formik.handleChange} disabled={isStock || disabled} placeholder="Fit Ht" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ── FITTING & LENS ── */}
                {!isStock && (() => {
                    const catName = (product.category || configs.category?.find(c => c._id === product.categoryId)?.name || '').toUpperCase();
                    if (!(catName === 'LENS' || catName === 'CONTACT_LENS' || catName.includes('LENS'))) return null;
                    return (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                            <div className="px-4 py-2.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                                <span className="text-xs font-black uppercase tracking-wider text-gray-700">Fitting & Lens Details</span>
                            </div>
                            <div className="p-3 sm:p-4 space-y-3">
                                <div className="flex flex-wrap items-end gap-3">
                                    <PillToggle label="Flat fitting" value={product.hasFlatFitting} onChange={(v) => formik.setFieldValue(`${prefix}hasFlatFitting`, v)} options={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }]} disabled={isReadOnly} />
                                    {product.hasFlatFitting === 'yes' && (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
                                            {wrapInput(Input, { label: "DBL", name: `${prefix}dbl`, placeholder: "DBL", disabled: isReadOnly })}
                                            {wrapInput(Select, { label: "Frame type", name: `${prefix}frameType`, placeholder: "Type", options: (Array.isArray(configs.frameTypes) ? configs.frameTypes : []).map(f => { const val = f.name || f._id || f; return { value: val, label: f.name || f.label || f }; }), disabled: isReadOnly })}
                                            {wrapInput(Input, { label: "Frame length", name: `${prefix}frameLength`, placeholder: "Length", disabled: isReadOnly })}
                                            {wrapInput(Input, { label: "Frame height", name: `${prefix}frameHeight`, placeholder: "Height", disabled: isReadOnly })}
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
                                    {wrapInput(Input, { label: "Pantoscopic", name: `${prefix}pantoscopicAngle`, placeholder: "Angle", disabled: isReadOnly })}
                                    {wrapInput(Input, { label: "Bow angle", name: `${prefix}bowAngle`, placeholder: "Bow", disabled: isReadOnly })}
                                    {wrapInput(Input, { label: "BVD", name: `${prefix}bvd`, placeholder: "BVD", disabled: isReadOnly })}
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* ── PHOTOS STRIP ── */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-500 whitespace-nowrap">Photos <span className="text-[9px] text-gray-400 font-normal lowercase">(max 5 MB)</span></span>
                        <div className="flex flex-wrap gap-2 items-center">
                            {(product.photos || []).map((photoUrl, photoIdx) => (
                                <div key={photoIdx} className="w-10 h-10 rounded-xl border border-gray-200 overflow-hidden shadow-xs relative group">
                                    <img src={photoUrl} alt={`Upload ${photoIdx}`} className="w-full h-full object-cover" />
                                    {!isReadOnly && (
                                        <button type="button" onClick={() => { const updated = (product.photos || []).filter((_, pI) => pI !== photoIdx); formik.setFieldValue(`${prefix}photos`, updated); }} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Icon icon="mdi:trash-can-outline" className="text-xs" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {!isReadOnly && (
                                <div className="relative">
                                    <input type="file" accept="image/*" onChange={(e) => handleItemImageUpload(index, e.target.files[0])} disabled={uploadingItemImages[index]} className="hidden" id={`item-image-upload-${index}`} />
                                    <label htmlFor={`item-image-upload-${index}`} className="inline-flex w-10 h-10 items-center justify-center border-2 border-dashed border-gray-300 rounded-xl hover:border-erp-accent hover:bg-gray-50 cursor-pointer text-gray-400 hover:text-erp-accent transition-all">
                                        {uploadingItemImages[index] ? <Icon icon="mdi:loading" className="text-sm animate-spin" /> : <Icon icon="mdi:camera-plus" className="text-sm" />}
                                    </label>
                                </div>
                            )}
                            {(product.photos || []).length === 0 && isReadOnly && <span className="text-xs text-gray-400 italic">No photos</span>}
                        </div>
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
                <div className="w-full bg-white rounded-b-2xl">
                    {/* Desktop Table View (>= md screens) */}
                    <div className="hidden md:block w-full border border-gray-200 rounded-xl overflow-hidden shadow-sm">
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
                                            Availability
                                        </th>
                                        <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap border-r border-white/20">
                                            Vendor
                                        </th>
                                        <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap border-r border-white/20">
                                            Order Type
                                        </th>
                                        <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap border-r border-white/20">
                                            Qty
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
                                        const catUpper = categoryName.toUpperCase();
                                        const isLensItem = !catUpper || catUpper.includes('LENS') || catUpper.includes('GLASS') || catUpper.includes('RX') || product.orderType === 'rx';

                                        const renderPowerField = (field) => {
                                            if (product.powerMode === 'single') return product.powerTable[product.selectedSide]?.[field] || '';
                                            return `${product.powerTable.R?.[field] || ''} / ${product.powerTable.L?.[field] || ''}`;
                                        };

                                        const renderEditablePowerCell = (field) => {
                                            if (!isLensItem) return <span className="text-gray-300 font-normal italic">N/A</span>;
                                            if (product.orderType === 'stock') {
                                                const val = renderPowerField(field);
                                                return val ? <span className="text-gray-700 font-semibold">{val}</span> : <span className="text-gray-300">—</span>;
                                            }

                                            if (product.powerMode === 'single') {
                                                const side = product.selectedSide || 'R';
                                                return (
                                                    <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="text"
                                                            className="w-16 h-7 text-xs font-semibold text-center border border-gray-300 rounded-md outline-none focus:border-erp-accent focus:ring-1 focus:ring-erp-accent/20 bg-white"
                                                            value={product.powerTable[side]?.[field] || ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                formik.setFieldValue(`products.${index}.powerTable.${side}.${field}`, val);
                                                            }}
                                                            placeholder={field === 'axis' ? '0' : '0.00'}
                                                            disabled={isReadOnly}
                                                        />
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div className="flex items-center justify-center gap-1 min-w-[95px]" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="text"
                                                        title="Right Eye (R)"
                                                        className="w-11 h-7 text-xs font-semibold text-center border border-gray-300 rounded-md outline-none focus:border-erp-accent focus:ring-1 focus:ring-erp-accent/20 bg-white"
                                                        value={product.powerTable.R?.[field] || ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            formik.setFieldValue(`products.${index}.powerTable.R.${field}`, val);
                                                        }}
                                                        placeholder={field === 'axis' ? '0' : '0.00'}
                                                        disabled={isReadOnly}
                                                    />
                                                    <span className="text-gray-400 font-bold text-[10px]">/</span>
                                                    <input
                                                        type="text"
                                                        title="Left Eye (L)"
                                                        className="w-11 h-7 text-xs font-semibold text-center border border-gray-300 rounded-md outline-none focus:border-erp-accent focus:ring-1 focus:ring-erp-accent/20 bg-white"
                                                        value={product.powerTable.L?.[field] || ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            formik.setFieldValue(`products.${index}.powerTable.L.${field}`, val);
                                                        }}
                                                        placeholder={field === 'axis' ? '0' : '0.00'}
                                                        disabled={isReadOnly}
                                                    />
                                                </div>
                                            );
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
                                                            value={{ value: product.productId || product.productName, label: product.productName || product.itemName || '' }}
                                                            onChange={(e) => handleProductSelection(index, e.target.value)}
                                                            onSearch={(q) => searchProductsForIndex(q, index)}
                                                            options={productNames}
                                                            loading={loadingProductNames}
                                                            placeholder="Search Product Name..."
                                                            freeSolo
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

                                                    {/* Category Select */}
                                                    <td className="px-2 py-2 min-w-[130px]">
                                                        <select
                                                            className="w-full text-xs bg-white border border-gray-200 rounded-lg px-2 py-2 outline-none focus:border-erp-accent focus:ring-2 focus:ring-erp-accent/20 transition-all font-medium text-gray-700 cursor-pointer"
                                                            name={`products.${index}.categoryId`}
                                                            value={
                                                                product.categoryId ||
                                                                (configs.category?.find(c => c.name?.toUpperCase() === (product.category || '').toUpperCase())?._id) ||
                                                                product.category ||
                                                                ''
                                                            }
                                                            onChange={(e) => {
                                                                const cId = e.target.value;
                                                                const cObj = configs.category?.find(c => c._id === cId || c.name === cId);
                                                                formik.setFieldValue(`products.${index}.categoryId`, cId);
                                                                formik.setFieldValue(`products.${index}.category`, cObj ? cObj.name : cId);
                                                            }}
                                                            disabled={isReadOnly}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <option value="">Category</option>
                                                            {(Array.isArray(configs.category) ? configs.category : []).map(c => (
                                                                <option key={c._id || c.name} value={c._id}>{c.name}</option>
                                                            ))}
                                                            {product.category && !(configs.category || []).some(c => c._id === product.categoryId || c.name?.toUpperCase() === product.category?.toUpperCase()) && (
                                                                <option value={product.category}>{product.category}</option>
                                                            )}
                                                        </select>
                                                    </td>

                                                    {/* Availability Select */}
                                                    <td className="px-2 py-2 min-w-[135px]">
                                                        <select
                                                            className="w-full text-xs text-center bg-white border border-gray-200 rounded-lg px-2 py-2 outline-none focus:border-erp-accent focus:ring-2 focus:ring-erp-accent/20 transition-all font-semibold text-gray-700 cursor-pointer disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                                                            name={`products.${index}.availability`}
                                                            value={product.orderType === 'rx' ? 'order' : ((product.availability === 'order-to-whom' || product.availability === 'order') ? 'order' : (product.availability || 'in-house'))}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                formik.setFieldValue(`products.${index}.availability`, val);
                                                                if (val === 'in-house') {
                                                                    formik.setFieldValue(`products.${index}.vendorId`, '');
                                                                }
                                                            }}
                                                            disabled={product.orderType === 'rx' || isReadOnly}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <option value="in-house">In-House</option>
                                                            <option value="order">Order</option>
                                                        </select>
                                                    </td>

                                                    {/* Vendor Select */}
                                                    <td className="px-2 py-2 min-w-[155px]">
                                                        <select
                                                            className={`w-full text-xs bg-white border rounded-lg px-2 py-2 outline-none focus:border-erp-accent focus:ring-2 focus:ring-erp-accent/20 transition-all font-medium text-gray-700 cursor-pointer disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed ${
                                                                (product.availability === 'order' || product.availability === 'order-to-whom' || product.orderType === 'rx') && !product.vendorId
                                                                    ? 'border-amber-400 bg-amber-50/30'
                                                                    : 'border-gray-200'
                                                            }`}
                                                            name={`products.${index}.vendorId`}
                                                            value={product.vendorId || ''}
                                                            onChange={(e) => {
                                                                const vId = e.target.value;
                                                                formik.setFieldValue(`products.${index}.vendorId`, vId);
                                                            }}
                                                            disabled={(product.availability !== 'order' && product.availability !== 'order-to-whom' && product.orderType !== 'rx') || isReadOnly}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <option value="">{(product.availability === 'order' || product.availability === 'order-to-whom' || product.orderType === 'rx') ? 'Select Vendor *' : 'N/A (In-House)'}</option>
                                                            {(Array.isArray(configs.vendors) ? configs.vendors : []).map(v => (
                                                                <option key={v._id || v.vendorNumber} value={v._id || v.vendorNumber}>
                                                                    {v.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>

                                                    {/* Order Type Select */}
                                                    <td className="px-3 py-2.5 min-w-[100px]">
                                                        <select
                                                            className="w-full text-xs text-center bg-white border border-gray-200 rounded-lg px-2 py-2 outline-none focus:border-erp-accent focus:ring-2 focus:ring-erp-accent/20 transition-all cursor-pointer font-medium text-gray-700"
                                                            name={`products.${index}.orderType`}
                                                            value={product.orderType || 'stock'}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                formik.handleChange(e);
                                                                formik.setFieldValue(`products.${index}.productMode`, val);
                                                                if (val === 'rx') {
                                                                    formik.setFieldValue(`products.${index}.availability`, 'order');
                                                                }
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

                                                    {/* Power Fields */}
                                                    <td className="px-2 py-2 text-xs font-semibold text-gray-700 text-center whitespace-nowrap min-w-[100px]">
                                                        {renderEditablePowerCell('sph')}
                                                    </td>
                                                    <td className="px-2 py-2 text-xs font-semibold text-gray-700 text-center whitespace-nowrap min-w-[100px]">
                                                        {renderEditablePowerCell('cyl')}
                                                    </td>
                                                    <td className="px-2 py-2 text-xs font-semibold text-gray-700 text-center whitespace-nowrap min-w-[100px]">
                                                        {renderEditablePowerCell('axis')}
                                                    </td>
                                                    <td className="px-2 py-2 text-xs font-semibold text-gray-700 text-center whitespace-nowrap min-w-[100px]">
                                                        {renderEditablePowerCell('add')}
                                                    </td>

                                                    {/* Unit */}
                                                    <td className="px-3 py-2.5 min-w-[90px]">
                                                        <select
                                                            className="w-full text-xs text-center bg-white border border-gray-200 rounded-lg px-2 py-2 outline-none focus:border-erp-accent focus:ring-2 focus:ring-erp-accent/20 transition-all font-semibold text-gray-700 cursor-pointer"
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
                                                    <td className="px-4 py-3 text-xs font-semibold text-gray-700 text-center whitespace-nowrap min-w-[90px]">
                                                        <span className="text-emerald-600">₹{gstAmt.toFixed(2)}</span>
                                                    </td>

                                                    {/* Total Amount */}
                                                    <td className="px-4 py-3 text-center whitespace-nowrap min-w-[120px]">
                                                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50 text-erp-accent font-bold text-sm">
                                                            ₹{totalAmount.toFixed(2)}
                                                        </span>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-4 py-3 text-center whitespace-nowrap min-w-[100px]">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setItemModalIndex(index);
                                                                }}
                                                                title="Configure Item Details / Prescription"
                                                                className="p-2 rounded-lg bg-erp-accent/10 text-erp-accent hover:bg-erp-accent hover:text-white transition-all duration-200"
                                                            >
                                                                <Icon icon="mdi:square-edit-outline" className="text-lg" />
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
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Vertical Cards View (< md screens) */}
                    <div className="block md:hidden space-y-4">
                        {formik.values.products.map((product, index) => {
                            const isActive = activeProductIndex === index;
                            const categoryName = product.category || configs.category?.find(c => c._id === product.categoryId)?.name || '-';
                            const catUpper = categoryName.toUpperCase();
                            const isLensItem = !catUpper || catUpper.includes('LENS') || catUpper.includes('GLASS') || catUpper.includes('RX') || product.orderType === 'rx';

                            const unitMultiplier = product.unit === 'pair' ? 2 : product.unit === 'box' ? 10 : 1;
                            const taxableAmount = (Number(product.price || 0) * Number(product.qty || 0) * unitMultiplier) - Number(product.discount || 0);
                            const gstPercent = Number(product.gstDetails?.gstPercent || 0);
                            const gstAmt = taxableAmount > 0 ? taxableAmount * (gstPercent / 100) : 0;
                            const totalAmount = taxableAmount > 0 ? taxableAmount + gstAmt : 0;

                            return (
                                <div 
                                    key={index}
                                    onClick={() => setActiveProductIndex(index)}
                                    className={`bg-white rounded-2xl border transition-all p-4 space-y-3.5 shadow-sm ${
                                        isActive ? 'border-[#2980B9] ring-2 ring-[#2980B9]/15' : 'border-gray-200'
                                    }`}
                                >
                                    {/* Card Header: Item Number & Action Buttons */}
                                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                                                product.orderType === 'rx' ? 'bg-amber-500 text-white' : 'bg-[#2980B9] text-white'
                                            }`}>
                                                {index + 1}
                                            </span>
                                            <span className="text-xs font-bold text-slate-800 uppercase tracking-tight">
                                                Item #{index + 1}
                                            </span>
                                            {isActive && (
                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                                                    Active Row
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setItemModalIndex(index);
                                                }}
                                                title="Configure Prescription Details"
                                                className="px-2.5 py-1 rounded-lg bg-[#2980B9]/10 text-[#2980B9] hover:bg-[#2980B9] hover:text-white transition-all text-xs font-semibold flex items-center gap-1"
                                            >
                                                <Icon icon="mdi:square-edit-outline" className="text-sm" /> Specs
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (formik.values.products.length > 1) {
                                                        setDeleteModalState({ isOpen: true, indexToRemove: index });
                                                    } else {
                                                        toast.warn("Orders must contain at least 1 product line.");
                                                    }
                                                }}
                                                className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"
                                            >
                                                <Icon icon="mdi:trash-can-outline" className="text-base" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Vertical Form Fields */}
                                    <div className="space-y-3">
                                        {/* Product Name Search */}
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                                Particulars / Item Name
                                            </label>
                                            <SearchableSelect
                                                name={`products.${index}.productName`}
                                                value={{ value: product.productId || product.productName, label: product.productName || product.itemName || '' }}
                                                onChange={(e) => handleProductSelection(index, e.target.value)}
                                                onSearch={(q) => searchProductsForIndex(q, index)}
                                                options={productNames}
                                                loading={loadingProductNames}
                                                placeholder="Search Product Name..."
                                                freeSolo
                                                renderOption={renderProductOption}
                                            />
                                        </div>

                                        {/* Category & Availability (2 columns on mobile grid) */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                                    Category
                                                </label>
                                                <select
                                                    className="w-full text-xs bg-white border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#2980B9] font-medium text-slate-700"
                                                    name={`products.${index}.categoryId`}
                                                    value={product.categoryId || (configs.category?.find(c => c.name?.toUpperCase() === (product.category || '').toUpperCase())?._id) || product.category || ''}
                                                    onChange={(e) => {
                                                        const cId = e.target.value;
                                                        const cObj = configs.category?.find(c => c._id === cId || c.name === cId);
                                                        formik.setFieldValue(`products.${index}.categoryId`, cId);
                                                        formik.setFieldValue(`products.${index}.category`, cObj ? cObj.name : cId);
                                                    }}
                                                    disabled={isReadOnly}
                                                >
                                                    <option value="">Category</option>
                                                    {(Array.isArray(configs.category) ? configs.category : []).map(c => (
                                                        <option key={c._id || c.name} value={c._id}>{c.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                                    Availability
                                                </label>
                                                <select
                                                    className="w-full text-xs bg-white border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#2980B9] font-semibold text-slate-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                                                    name={`products.${index}.availability`}
                                                    value={product.orderType === 'rx' ? 'order' : ((product.availability === 'order-to-whom' || product.availability === 'order') ? 'order' : (product.availability || 'in-house'))}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        formik.setFieldValue(`products.${index}.availability`, val);
                                                        if (val === 'in-house') {
                                                            formik.setFieldValue(`products.${index}.vendorId`, '');
                                                        }
                                                    }}
                                                    disabled={product.orderType === 'rx' || isReadOnly}
                                                >
                                                    <option value="in-house">In-House</option>
                                                    <option value="order">Order</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Vendor & Order Type */}
                                        <div className="grid grid-cols-2 gap-3">
                                            {(product.availability === 'order' || product.availability === 'order-to-whom' || product.orderType === 'rx') && (
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                                        Vendor *
                                                    </label>
                                                    <select
                                                        className="w-full text-xs bg-white border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#2980B9] font-medium text-slate-700"
                                                        name={`products.${index}.vendorId`}
                                                        value={product.vendorId || ''}
                                                        onChange={(e) => formik.setFieldValue(`products.${index}.vendorId`, e.target.value)}
                                                        disabled={isReadOnly}
                                                    >
                                                        <option value="">Select Vendor *</option>
                                                        {(Array.isArray(configs.vendors) ? configs.vendors : []).map(v => (
                                                            <option key={v._id || v.vendorNumber} value={v._id || v.vendorNumber}>{v.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            <div className={(product.availability === 'order' || product.availability === 'order-to-whom' || product.orderType === 'rx') ? '' : 'col-span-2'}>
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                                    Order Type
                                                </label>
                                                <select
                                                    className="w-full text-xs bg-white border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#2980B9] font-semibold text-slate-700"
                                                    name={`products.${index}.orderType`}
                                                    value={product.orderType || 'stock'}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        formik.handleChange(e);
                                                        formik.setFieldValue(`products.${index}.productMode`, val);
                                                        if (val === 'rx') {
                                                            formik.setFieldValue(`products.${index}.availability`, 'order');
                                                        }
                                                    }}
                                                >
                                                    <option value="stock">Stock</option>
                                                    {isLensItem && <option value="rx">Rx Order</option>}
                                                </select>
                                            </div>

                                         {/* Frame / Sunglass Size & Dimensions inputs for Mobile */}
                                         {(product.category === 'FRAME' || product.category === 'SUNGLASS' || (configs.category?.find(c => c._id === product.categoryId)?.name?.toUpperCase() === 'FRAME') || (configs.category?.find(c => c._id === product.categoryId)?.name?.toUpperCase() === 'SUNGLASS')) && (
                                             <div className="grid grid-cols-2 gap-3">
                                                 <div>
                                                     <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                                         Frame Size *
                                                     </label>
                                                     <input
                                                         type="text"
                                                         className="w-full text-xs font-semibold bg-white border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#2980B9]"
                                                         name={`products.${index}.size`}
                                                         value={product.size || ''}
                                                         onChange={(e) => {
                                                             const val = e.target.value;
                                                             formik.setFieldValue(`products.${index}.size`, val);
                                                             if (!product.dimensions) {
                                                                 formik.setFieldValue(`products.${index}.dimensions`, val);
                                                             }
                                                         }}
                                                         placeholder="e.g. 52-18-140"
                                                         disabled={isReadOnly}
                                                     />
                                                 </div>
                                                 <div>
                                                     <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                                         Dimensions *
                                                     </label>
                                                     <input
                                                         type="text"
                                                         className="w-full text-xs font-semibold bg-white border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#2980B9]"
                                                         name={`products.${index}.dimensions`}
                                                         value={product.dimensions || product.size || ''}
                                                         onChange={formik.handleChange}
                                                         placeholder="e.g. 52-18-140"
                                                         disabled={isReadOnly}
                                                     />
                                                 </div>
                                             </div>
                                         )}
                                        </div>

                                        {/* Qty, Unit & Price */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                                    Qty
                                                </label>
                                                <input
                                                    type="number"
                                                    className="w-full text-xs font-semibold text-center bg-white border border-gray-200 rounded-xl px-2 py-2.5 outline-none focus:border-[#2980B9]"
                                                    name={`products.${index}.qty`}
                                                    value={product.qty}
                                                    onChange={formik.handleChange}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                                    Unit
                                                </label>
                                                <select
                                                    className="w-full text-xs font-semibold text-center bg-white border border-gray-200 rounded-xl px-2 py-2.5 outline-none focus:border-[#2980B9]"
                                                    name={`products.${index}.unit`}
                                                    value={product.unit || 'piece'}
                                                    onChange={formik.handleChange}
                                                >
                                                    <option value="piece">Piece</option>
                                                    <option value="pair">Pair</option>
                                                    <option value="box">Box</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                                    Price (₹)
                                                </label>
                                                <input
                                                    type="number"
                                                    className="w-full text-xs font-semibold text-center bg-white border border-gray-200 rounded-xl px-2 py-2.5 outline-none focus:border-[#2980B9]"
                                                    name={`products.${index}.price`}
                                                    value={product.price}
                                                    onChange={formik.handleChange}
                                                    disabled={product.orderType === 'stock' || isReadOnly}
                                                />
                                            </div>
                                        </div>

                                        {/* Discount & GST % */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                                    Disc (₹)
                                                </label>
                                                <input
                                                    type="number"
                                                    className="w-full text-xs font-semibold text-center bg-white border border-gray-200 rounded-xl px-2 py-2.5 outline-none focus:border-[#2980B9]"
                                                    name={`products.${index}.discount`}
                                                    value={product.discount || 0}
                                                    onChange={formik.handleChange}
                                                    disabled={isReadOnly}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                                    GST %
                                                </label>
                                                <select
                                                    className="w-full text-xs font-semibold text-center bg-white border border-gray-200 rounded-xl px-2 py-2.5 outline-none focus:border-[#2980B9]"
                                                    name={`products.${index}.gstDetails.gstPercent`}
                                                    value={product.gstDetails?.gstPercent || '0'}
                                                    onChange={(e) => formik.setFieldValue(`products.${index}.gstDetails.gstPercent`, e.target.value)}
                                                    disabled={isReadOnly}
                                                >
                                                    <option value="0">0%</option>
                                                    <option value="5">5%</option>
                                                    <option value="12">12%</option>
                                                    <option value="18">18%</option>
                                                    <option value="28">28%</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Amount Summary */}
                                        <div className="grid grid-cols-3 gap-1 py-2.5 px-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px]">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Taxable</span>
                                                <span className="font-semibold text-slate-700">₹{taxableAmount.toFixed(2)}</span>
                                            </div>
                                            <div className="flex flex-col text-center">
                                                <span className="text-[9px] font-bold text-emerald-600 uppercase">GST Amt</span>
                                                <span className="font-bold text-emerald-600">₹{gstAmt.toFixed(2)}</span>
                                            </div>
                                            <div className="flex flex-col text-right">
                                                <span className="text-[9px] font-bold text-[#2980B9] uppercase">Total</span>
                                                <span className="font-black text-[#2980B9]">₹{totalAmount.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Mobile & Desktop Friendly Add Rows & Action Controls */}
                    <div className="mt-6 mb-6 p-4 sm:p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-4">
                        {/* Top Row: Label & Quick Add Row Pills */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                                <div className="p-1.5 bg-[#2980B9]/10 rounded-lg text-[#2980B9]">
                                    <Icon icon="mdi:table-row-plus-after" className="text-lg" />
                                </div>
                                <span>Add Quick Rows</span>
                            </div>

                            {/* Quick Add Pills Bar */}
                            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar">
                                {[1, 5, 10, 20, 50].map((num) => (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => {
                                            const newRows = Array(num).fill(null).map(() => ({ ...productTemplate }));
                                            formik.setFieldValue('products', [...formik.values.products, ...newRows]);
                                            setActiveProductIndex(formik.values.products.length);
                                        }}
                                        className="px-3.5 py-1.5 rounded-xl border border-blue-200 bg-white text-[#2980B9] hover:bg-[#2980B9] hover:text-white transition-all text-xs font-bold shadow-xs active:scale-95 flex items-center gap-1 whitespace-nowrap flex-shrink-0"
                                    >
                                        <Icon icon="mdi:plus" className="text-sm" />
                                        <span>+{num}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Bottom Row: Action Buttons */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-slate-200/60">
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
                                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-red-200 text-red-600 bg-red-50/60 hover:bg-red-600 hover:text-white transition-all text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95"
                            >
                                <Icon icon="mdi:delete-sweep-outline" className="text-base" />
                                <span>Remove Empty Rows</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsLensRangeModalOpen(true)}
                                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-[#2980B9] to-blue-600 text-white hover:opacity-95 transition-all text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 active:scale-95"
                            >
                                <Icon icon="mdi:playlist-plus" className="text-base" />
                                <span>Bulk Lens Generator</span>
                            </button>
                        </div>
                    </div>

                    {/* Order Summary & GST Section */}
                    {formik.values.products.length > 0 && (() => {
                        const safeIdx = (activeProductIndex >= 0 && activeProductIndex < formik.values.products.length) ? activeProductIndex : 0;
                        return (
                            <div className="flex flex-col lg:flex-row gap-6 items-stretch bg-gradient-to-br from-slate-50 to-blue-50/30 p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
                                {/* GST & Transaction Details */}
                                <div className="flex-1 bg-white rounded-xl p-4 sm:p-5 border border-slate-100 shadow-xs">
                                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <div className="p-1.5 bg-[#2980B9]/10 rounded-lg text-[#2980B9]">
                                            <Icon icon="mdi:receipt-text-outline" className="text-lg" />
                                        </div>
                                        Transaction Details
                                    </h4>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {wrapInput(Select, {
                                            label: "GST Type",
                                            name: `products.${safeIdx}.gstDetails.gstType`,
                                            options: [
                                                { value: "included", label: "Included" },
                                                { value: "excluded", label: "Excluded" }
                                            ],
                                            placeholder: "Select GST Type"
                                        })}

                                        {wrapInput(Select, {
                                            label: "Transaction Method",
                                            name: `products.${safeIdx}.gstDetails.transactionType`,
                                            options: [
                                                { value: 'card', label: 'Card' },
                                                { value: 'upi', label: 'UPI' },
                                                { value: 'cash', label: 'Cash' }
                                            ],
                                            placeholder: "Select Method"
                                        })}

                                        {wrapInput(Input, {
                                            label: "Advance",
                                            name: `products.${safeIdx}.gstDetails.advance`
                                        })}

                                        <div className="sm:col-span-2 lg:col-span-1">
                                            {wrapInput(Input, {
                                                label: "Remarks",
                                                name: `products.${safeIdx}.gstDetails.remarks`
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

                                    {/* GST Breakdown & Final Adjusted Totals */}
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

                                        const shipping = parseFloat(formik.values.shippingCharges) || 0;
                                        const other = parseFloat(formik.values.otherCharges) || 0;
                                        const globalAdvance = parseFloat(formik.values.advancePayment) || 0;

                                        const itemAdvance = formik.values.products.reduce((acc, curr) => {
                                            return acc + (parseFloat(curr.gstDetails?.advance) || 0);
                                        }, 0);

                                        const totalAdvance = itemAdvance + globalAdvance;
                                        const grossTotalWithCharges = finalTotal + shipping + other;
                                        const netPayableTotal = Math.max(0, grossTotalWithCharges - totalAdvance);

                                        const totalGst = overallGST.toFixed(2);
                                        const cgst = (overallGST / 2).toFixed(2);
                                        const sgst = (overallGST / 2).toFixed(2);

                                        return (
                                            <>
                                                <div className="bg-emerald-50/70 rounded-lg p-3 space-y-2 border border-emerald-100">
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

                                                {(shipping > 0 || other > 0) && (
                                                    <div className="space-y-1.5 py-1 text-xs font-medium border-t border-gray-100">
                                                        {shipping > 0 && (
                                                            <div className="flex justify-between items-center text-gray-600">
                                                                <span>Shipping Charges</span>
                                                                <span className="font-bold text-gray-800">+₹{shipping.toFixed(2)}</span>
                                                            </div>
                                                        )}
                                                        {other > 0 && (
                                                            <div className="flex justify-between items-center text-gray-600">
                                                                <span>Other Charges</span>
                                                                <span className="font-bold text-gray-800">+₹{other.toFixed(2)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="border-t border-gray-100" />

                                                {/* Gross Total */}
                                                <div className="flex justify-between items-center py-1">
                                                    <span className="text-xs font-bold uppercase text-gray-500">Gross Total</span>
                                                    <span className="text-sm font-bold text-gray-900">
                                                        ₹{grossTotalWithCharges.toFixed(2)}
                                                    </span>
                                                </div>

                                                {/* Advance Paid Deduction */}
                                                {totalAdvance > 0 && (
                                                    <div className="flex justify-between items-center py-2 px-3 bg-amber-50 rounded-lg border border-amber-200">
                                                        <span className="text-xs font-bold text-amber-700 uppercase flex items-center gap-1">
                                                            <Icon icon="mdi:minus-circle" className="text-amber-600" /> Advance Paid
                                                        </span>
                                                        <span className="text-sm font-black text-amber-700">
                                                            - ₹{totalAdvance.toFixed(2)}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Final Adjusted Total */}
                                                <div className="bg-gradient-to-r from-erp-accent/10 to-blue-100/50 rounded-xl p-4 -mx-1 border border-erp-accent/20">
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-black uppercase text-gray-700 tracking-wider">
                                                                {totalAdvance > 0 ? "Adjusted Total" : "Final Total"}
                                                            </span>
                                                            {totalAdvance > 0 && (
                                                                <span className="text-[10px] font-bold text-emerald-600">
                                                                    (Advance Deducted)
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-xl font-black text-erp-accent">
                                                            ₹{netPayableTotal.toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    );
                    })()}
                </div>
            )}
        </FieldArray>
    );


    const renderAdvancedDetails = () => (
        <div className="p-4 space-y-4 bg-white rounded-b-2xl border-t border-gray-50">
            {/* Miscellaneous Data */}
            <div className="space-y-6">
                <h4 className="text-xs font-black uppercase tracking-widest text-erp-accent">Shipping & Payment Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4">
                    {wrapInput(Input, { label: "Direct Customer", name: "directCustomer", placeholder: "Direct Customer" })}
                    {wrapInput(Input, { label: "Shipping Charges (₹)", name: "shippingCharges", type: "number", placeholder: "0.00" })}
                    {wrapInput(Input, { label: "Other Charges (₹)", name: "otherCharges", type: "number", placeholder: "0.00" })}
                </div>
            </div>
        </div>
    );

    return (
        <div className="h-full bg-gray-50/50  text-sm">


            <div className="max-w-full mx-auto">
                <div className="flex items-center justify-between mb-4 sm:mb-8">
                    <div className="space-y-0.5 sm:space-y-1">
                        <h1 className="text-xl sm:text-3xl font-black text-gray-900 uppercase tracking-tight">
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
                        <form onSubmit={formik.handleSubmit} className="space-y-3 sm:space-y-6 pb-16 sm:pb-20">
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
                                            className="w-full flex items-center justify-between p-3.5 sm:p-6 cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-2.5 sm:gap-4">
                                                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 ${isActive
                                                    ? 'bg-erp-accent text-white'
                                                    : isCompleted
                                                        ? 'bg-green-500 text-white'
                                                        : 'bg-gray-100 text-gray-400 group-hover:bg-erp-accent/5'
                                                    }`}>
                                                    {isCompleted ? <Icon icon="mdi:check" className="text-lg sm:text-xl" /> : <span className="font-black text-sm sm:text-lg">{idx + 1}</span>}
                                                </div>
                                                <div className="text-left">
                                                    <h3 className={`font-black uppercase tracking-widest text-xs sm:text-sm transition-colors ${isActive ? 'text-erp-accent' : 'text-gray-700'
                                                        }`}>
                                                        {label}
                                                    </h3>
                                                    <p className="text-[8px] sm:text-[10px] text-gray-400 font-bold uppercase">
                                                        {isActive ? 'Currently Editing' : isCompleted ? 'Entry Complete' : 'Pending Details'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-500 ${isActive ? 'bg-erp-accent/5 rotate-180' : 'bg-gray-50'}`}>
                                                <Icon icon="mdi:chevron-down" className={`text-lg sm:text-xl ${isActive ? 'text-erp-accent' : 'text-gray-400'}`} />
                                            </div>
                                        </button>

                                        {/* Accordion Content */}
                                        <div className={`transition-all duration-500 ease-in-out ${isActive ? 'max-h-none opacity-100 pb-6 sm:pb-12' : 'max-h-0 opacity-0 pointer-events-none overflow-hidden'}`}>
                                            <div className="px-2.5 sm:px-4 pt-0">
                                                <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-100 to-transparent mb-4 sm:mb-12" />
                                                {idx === 0 && renderCustomerDetails()}
                                                {idx === 1 && renderProductDetails()}
                                                {idx === 2 && renderAdvancedDetails()}

                                                {/* Navigation Buttons inside Step Content */}
                                                {!isReadOnly && isActive && (
                                                    <div className="mt-6 sm:mt-12 flex flex-wrap items-center justify-between gap-2 pt-4 sm:pt-8 border-t border-gray-50">
                                                        <div className="flex gap-2 sm:gap-4">
                                                            {idx > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={handleBack}
                                                                    className="flex items-center px-3 py-2 sm:px-6 sm:py-3 bg-gray-100 text-gray-600 text-[8px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg sm:rounded-xl hover:bg-gray-200 transition-all"
                                                                >
                                                                    <Icon icon="mdi:chevron-left" className="mr-1 sm:mr-2 text-sm sm:text-lg" />
                                                                    Back
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={handleSaveDraft}
                                                                className="flex items-center px-3 py-2 sm:px-6 sm:py-3 bg-white border border-gray-200 text-gray-600 text-[8px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg sm:rounded-xl hover:bg-gray-50 transition-all shadow-sm"
                                                            >
                                                                <Icon icon="mdi:content-save-outline" className="mr-1 sm:mr-2 text-sm sm:text-lg text-gray-400" />
                                                                <span className="hidden sm:inline">{isEditMode ? 'Update Draft' : 'Save Draft'}</span>
                                                                <span className="sm:hidden">Draft</span>
                                                            </button>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={handleNext}
                                                            className="flex items-center px-4 py-2 sm:px-8 sm:py-3 bg-erp-accent text-white text-[8px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg sm:rounded-xl hover:bg-black transition-all active:scale-95"
                                                        >
                                                            <span>
                                                                {idx === steps.length - 1 ? (isEditMode ? 'Submit & Process' : 'Place Order') : 'Next Step'}
                                                            </span>
                                                            <Icon icon={idx === steps.length - 1 ? "mdi:check-circle" : "mdi:arrow-right"} className="ml-1 sm:ml-2 text-sm sm:text-lg" />
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
                                <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-6 pt-6 sm:pt-10 px-2 sm:px-0">
                                    <button
                                        type="submit"
                                        className="flex items-center justify-center px-6 py-3 sm:px-10 sm:py-4 bg-erp-accent text-white text-xs sm:text-sm font-black uppercase tracking-widest rounded-xl sm:rounded-2xl hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                                        disabled={formik.isSubmitting}
                                    >
                                        <Icon icon="mdi:check-circle" className="mr-1.5 sm:mr-2 text-lg sm:text-xl" />
                                        {formik.isSubmitting ? 'Processing...' : isEditMode ? 'Submit & Process Order' : 'Place Final Order'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveDraft}
                                        className="flex items-center justify-center px-6 py-3 sm:px-10 sm:py-4 bg-white border-2 border-gray-200 text-gray-600 text-xs sm:text-sm font-black uppercase tracking-widest rounded-xl sm:rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95"
                                    >
                                        <Icon icon="mdi:content-save-outline" className="mr-1.5 sm:mr-2 text-lg sm:text-xl text-gray-400" />
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

            <OrderLensRangeModal
                isOpen={isLensRangeModalOpen}
                onClose={() => setIsLensRangeModalOpen(false)}
                configs={configs}
                onAddProducts={handleAddBulkProducts}
            />

            {itemModalIndex !== null && formik.values.products[itemModalIndex] && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setItemModalIndex(null)}>
                    <div className="bg-white rounded-2xl sm:rounded-[2rem] shadow-2xl w-full sm:max-w-5xl max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col scale-in-center border border-gray-100 my-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-erp-accent p-3.5 sm:p-5 text-white flex justify-between items-center flex-shrink-0">
                            <div className="flex items-center gap-2.5 sm:gap-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                                    <Icon icon="mdi:square-edit-outline" className="text-xl sm:text-2xl" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-wider">Item #{itemModalIndex + 1} Details & Prescription</h3>
                                    <p className="text-[11px] text-white/80 font-bold">
                                        {formik.values.products[itemModalIndex]?.productName || formik.values.products[itemModalIndex]?.itemName || 'Unnamed Item / Particulars'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setItemModalIndex(null)}
                                className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                            >
                                <Icon icon="mdi:close" className="text-2xl" />
                            </button>
                        </div>
                        <div className="p-3 sm:p-6 overflow-y-auto max-h-[72vh] custom-scrollbar bg-gray-50/30 space-y-3 sm:space-y-4">
                            {renderActiveProductDetails(itemModalIndex)}
                        </div>
                        <div className="p-4 px-6 border-t border-gray-100 bg-white flex justify-end flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => setItemModalIndex(null)}
                                className="px-6 py-2.5 rounded-xl bg-erp-accent text-white font-bold text-xs hover:bg-erp-accent/90 transition-all shadow-md shadow-erp-accent/20"
                            >
                                Apply & Close
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default OrderWizard;


