import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useFormik, FormikProvider, FieldArray } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { Icon } from '@iconify/react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import {
    toggleVerificationMode,
    toggleFieldRejection
} from '../store/slices/customerRegistrationSlice';
import * as locationService from '../services/locationService';
import {
    getCustomerConfigs,
    getBrandCategories,
    registerCustomer,
    draftRegisterCustomer,
    updateDraftCustomer,
    getDraftCustomerById,
    getCustomerById,
    resubmitCustomerCorrection,
    approveCustomerFinance,
    sendCustomerForCorrection,
    salesHeadApproveCustomer,
    financeApproveCustomer,
    getPendingStageCustomers,
    resubmitCustomerCorrectionFinance
} from '../services/customerService';
import { uploadImage } from '../services/bucketService';
import { PATHS } from '../routes/paths';
import CorrectionRequestModal from '../components/ui/CorrectionRequestModal';

import { INITIAL_FORM_VALUES } from '../components/CustomerRegistration/constants';
import { mapCustomerToFormValues } from '../components/CustomerRegistration/helpers';
import { FirmCompanyDetails } from '../components/CustomerRegistration/FirmCompanyDetails';
import { AddressDetails } from '../components/CustomerRegistration/AddressDetails';
import { BusinessInformation } from '../components/CustomerRegistration/BusinessInformation';
import { ContactInformation } from '../components/CustomerRegistration/ContactInformation';
import { Overview } from '../components/CustomerRegistration/Overview';

export default function RegisterCustomer() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [searchParams, setSearchParams] = useSearchParams();
    const user = useSelector((state) => state.auth.user);
    const isSalesExecutive = user?.Department?.name?.toUpperCase() === 'SALES' && user?.EmployeeType?.toUpperCase() === 'EMPLOYEE';
    const isSalesHead = user?.Department?.name?.toUpperCase() === 'SALES' && user?.EmployeeType?.toUpperCase() === 'ADMIN';
    const isSalesUser = isSalesExecutive || isSalesHead;
    const isFinanceUser = ['FINANCE', 'F&A', 'F&A CFO', 'ACCOUNTING'].includes(user?.Department?.name?.toUpperCase()) || user?.EmployeeType?.toUpperCase() === 'SUPERADMIN';

    const steps = useMemo(() => {
        return ['Firm/Company Details', 'Address', 'Business Information', 'Contact Information', 'Overview'];
    }, []);

    const activeStep = useMemo(() => {
        const step = parseInt(searchParams.get('step'));
        return isNaN(step) ? 0 : Math.min(Math.max(0, step), steps.length - 1);
    }, [searchParams, steps]);

    const validationSchema = useMemo(() => Yup.object().shape({
        gstType: Yup.string().required('GST Type is required'),
        firmName: Yup.string().when('gstType', {
            is: (val) => val?.toLowerCase() !== 'un-registered' && val?.toLowerCase() !== 'unregistered',
            then: (schema) => schema.required('Firm Name is required'),
            otherwise: (schema) => schema.notRequired()
        }),
        shopName: Yup.string().when('gstType', {
            is: (val) => val?.toLowerCase() === 'un-registered' || val?.toLowerCase() === 'unregistered',
            then: (schema) => schema.required('Shop Name is required'),
            otherwise: (schema) => schema.notRequired()
        }),
        gstNumber: Yup.string().when('gstType', {
            is: (val) => val?.toLowerCase() !== 'un-registered' && val?.toLowerCase() !== 'unregistered',
            then: (schema) => schema.required('GST Number is required'),
            otherwise: (schema) => schema.notRequired()
        }),
        aadharCard: Yup.string().when('gstType', {
            is: (val) => val?.toLowerCase() === 'un-registered' || val?.toLowerCase() === 'unregistered',
            then: (schema) => schema.matches(/^\d{12}$/, 'Aadhar No. must be 12 digits').required('Aadhar Card No. is required'),
            otherwise: (schema) => schema.notRequired()
        }),
        panCard: Yup.string().when('gstType', {
            is: (val) => val?.toLowerCase() === 'un-registered' || val?.toLowerCase() === 'unregistered',
            then: (schema) => schema.matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format (e.g., ABCDE1234F)').required('PAN Card No. is required'),
            otherwise: (schema) => schema.notRequired()
        }),
        billToAddress: Yup.object().shape({
            branchName: Yup.string().required('Branch Name is required'),
            contactPerson: Yup.string().required('Contact Person is required'),
            contactNumber: Yup.string().matches(/^\d{10}$/, 'Contact No. must be exactly 10 digits').required('Contact Number is required'),
            address: Yup.string().required('Address is required'),
            city: Yup.string().required('City is required'),
            state: Yup.string().required('State is required'),
            zipCode: Yup.string().required('Pincode is required'),
            country: Yup.string().required('Country is required'),
            billingCurrency: Yup.string().required('Currency is required'),
            billingMode: Yup.string().required('Billing Mode is required'),
        }),
        customerShipToDetails: Yup.array().of(
            Yup.object().shape({
                branchName: Yup.string().required('Branch Name is required'),
                contactPerson: Yup.string().required('Contact Person is required'),
                contactNumber: Yup.string().matches(/^\d{10}$/, 'Contact No. must be exactly 10 digits').required('Contact Number is required'),
                address: Yup.string().required('Address is required'),
                city: Yup.string().required('City is required'),
                state: Yup.string().required('State is required'),
                zipCode: Yup.string().required('Pincode is required'),
                country: Yup.string().required('Country is required'),
                billingCurrency: Yup.string().required('Currency is required'),
                billingMode: Yup.string().required('Billing Mode is required'),
            })
        ).min(1, 'At least one shipping address is required'),
        ownerName: Yup.string().required('Proprietor/Partner Name is required'),
        mobileNo1: Yup.string().matches(/^\d{10}$/, 'Mobile No. must be 10 digits').required('Mobile No. 1 is required'),
        mobileNo2: Yup.string().matches(/^\d{10}$/, 'Mobile No. must be 10 digits').nullable(),
        businessEmail: Yup.string().email('Invalid email').nullable(),
        zoneRefId: Yup.string().required('Zone is required'),
        salesPersonRefId: Yup.string().required('Sales Person is required'),
    }), []);

    const setStep = (step) => {
        const params = new URLSearchParams(searchParams);
        params.set('step', step.toString());
        setSearchParams(params);
    };

    const isVerificationMode = useSelector((state) => state.customerRegistration.isVerificationMode);
    const rejectedFields = useSelector((state) => state.customerRegistration.rejectedFields);



    const [configs, setConfigs] = useState({
        businessTypes: [],
        creditDays: [],
        courierNames: [],
        courierTimes: [],
        zones: [],
        cities: {},
        brands: [],
        specificLabs: [],
        salesPersons: [],
        gstTypes: [],
        plants: [],
        fittingCenters: []
    });

    const [uploading, setUploading] = useState({
        aadhar: false,
        pan: false,
        gst: false
    });

    const configsLoadedRef = useRef(false);
    const hasInitializedRef = useRef(false);

    const [savingDraft, setSavingDraft] = useState(false);
    const [saving, setSaving] = useState(false);
    const lastLoadedIdRef = useRef(null);
    const configsRef = useRef(configs);
    const formikRef = useRef(null);
    const [loadingDraftData, setLoadingDraftData] = useState(false);
    const [draftCustomerId, setDraftCustomerId] = useState('');
    const [correctionCustomerId, setCorrectionCustomerId] = useState('');
    const [approvalId, setApprovalId] = useState('');
    const [correctionRequest, setCorrectionRequest] = useState(null);
    const [isApprovalMode, setIsApprovalMode] = useState(false);
    const [isReadOnlyMode, setIsReadOnlyMode] = useState(false);
    const [configsLoaded, setConfigsLoaded] = useState(false);
    const [currentStage, setCurrentStage] = useState('');
    const formik = useFormik({
        initialValues: INITIAL_FORM_VALUES,
        validationSchema,
        validateOnChange: false,
        validateOnBlur: true,
        onSubmit: async (values) => {
            const getLabel = (list, id, labelKey = 'name') => {
                const item = list.find(item => item._id === id);
                if (!item) return '';
                return item[labelKey] || item;
            };

            const payload = {
                ...values,
                draftEmployeeId: draftCustomerId || undefined,
                businessType: getLabel(configs.businessTypes || [], values.businessTypeRefId),
                salesPerson: getLabel(configs.salesPersons, values.salesPersonRefId, 'employeeName'),
                gstType: getLabel(configs.gstTypes, values.gstTypeRefId),
                gstNumber: values.gstNumber,
                gstCertificateImg: values.gstCertificateImg,
                aadharCard: values.aadharCard,
                aadharCardImg: values.aadharCardImg,
                panCard: values.panCard,
                panCardImg: values.panCardImg,
                zone: getLabel(configs.zones, values.zoneRefId, 'zone'),
                specificLab: getLabel(configs.specificLabs, values.specificLabRefId),
                plant: getLabel(configs.plants, values.plantRefId),
                fittingCenter: getLabel(configs.fittingCenters, values.fittingCenterRefId),
                creditDays: getLabel(configs.creditDays, values.creditDaysRefId, 'days')?.toString(),
                courierName: getLabel(configs.courierNames, values.courierNameRefId),
                courierTime: getLabel(configs.courierTimes, values.courierTimeRefId, 'time'),
                creditLimit: Number(values.creditLimit) || 0,
                finalDiscount: Number(values.finalDiscount) || 0,
                IsGSTRegistered: values.gstType?.toLowerCase() !== 'un-registered' && values.gstType?.toLowerCase() !== 'unregistered',
                isGSTRegistered: values.gstType?.toLowerCase() !== 'un-registered' && values.gstType?.toLowerCase() !== 'unregistered',
                proprietorName: values.proprietorName || values.ownerName,
                currentlyDealtBrands: values.currentlyDealtBrands || '',
                billToAddress: values.billToAddress ? {
                    ...values.billToAddress,
                    customerContactName: values.billToAddress.contactPerson,
                    customerContactNumber: values.billToAddress.contactNumber
                } : null,
                customerShipToDetails: (values.customerShipToDetails || []).map(addr => ({
                    ...addr,
                    customerContactName: addr.contactPerson,
                    customerContactNumber: addr.contactNumber
                }))
            };

            const getObj = (list, refId, labelKey = 'name') => {
                if (!refId) return undefined;
                return {
                    name: getLabel(list, refId, labelKey),
                    refId: refId
                };
            };

            let finalPayload = payload;
            if (approvalId) {
                finalPayload = {
                    ...payload,
                    password: values.customerpassword,
                    businessType: getObj(configs.businessTypes || [], values.businessTypeRefId),
                    salesPerson: getObj(configs.salesPersons, values.salesPersonRefId, 'employeeName'),
                    gstType: getObj(configs.gstTypes, values.gstTypeRefId),
                    zone: getObj(configs.zones, values.zoneRefId, 'zone'),
                    specificLab: getObj(configs.specificLabs, values.specificLabRefId),
                    plant: getObj(configs.plants, values.plantRefId),
                    fittingCenter: getObj(configs.fittingCenters, values.fittingCenterRefId),
                    creditDays: getObj(configs.creditDays, values.creditDaysRefId, 'days'),
                    courierName: getObj(configs.courierNames, values.courierNameRefId),
                    courierTime: getObj(configs.courierTimes, values.courierTimeRefId, 'time'),
                };
                delete finalPayload.customerpassword;
                delete finalPayload.businessTypeRefId;
                delete finalPayload.salesPersonRefId;
                delete finalPayload.gstTypeRefId;
                delete finalPayload.zoneRefId;
                delete finalPayload.specificLabRefId;
                delete finalPayload.plantRefId;
                delete finalPayload.fittingCenterRefId;
                delete finalPayload.creditDaysRefId;
                delete finalPayload.courierNameRefId;
                delete finalPayload.courierTimeRefId;
            }

            try {
                if (correctionCustomerId) {
                    // Filter payload to only include fields listed in correctionRequest.fieldsToCorrect
                    const correctionFields = correctionRequest?.fieldsToCorrect || [];
                    const filteredPayload = {};

                    correctionFields.forEach(field => {
                        const topKey = field.split(/[.[\]]+/)[0];
                        if (['address', 'brandCategories'].includes(topKey)) {
                            // Send the entire array for complex nested structures
                            filteredPayload[topKey] = values[topKey];
                        } else if (values[field] !== undefined) {
                            filteredPayload[field] = values[field];
                        } else if (payload[field] !== undefined) {
                            filteredPayload[field] = payload[field];
                        }
                    });

                    // Relationship mapping: if RefId is rejected, ensure Label is sent, and vice-versa
                    const mappings = [
                        { id: 'businessTypeRefId', label: 'Business Category' },
                        { id: 'salesPersonRefId', label: 'salesPerson' },
                        { id: 'gstTypeRefId', label: 'gstType' },
                        { id: 'zoneRefId', label: 'zone' },
                        { id: 'specificLabRefId', label: 'specificLab' },
                        { id: 'plantRefId', label: 'plant' },
                        { id: 'fittingCenterRefId', label: 'fittingCenter' },
                        { id: 'creditDaysRefId', label: 'creditDays' },
                        { id: 'courierNameRefId', label: 'courierName' },
                        { id: 'courierTimeRefId', label: 'courierTime' }
                    ];

                    mappings.forEach(({ id, label }) => {
                        if (correctionFields.includes(id) || correctionFields.includes(label)) {
                            filteredPayload[id] = values[id];
                            filteredPayload[label] = payload[label];
                        }
                    });

                    // Calculated fields
                    if (correctionFields.includes('gstType') || correctionFields.includes('gstTypeRefId') || correctionFields.includes('IsGSTRegistered')) {
                        filteredPayload.IsGSTRegistered = payload.IsGSTRegistered;
                    }

                    // Calculated fields
                    if (correctionFields.includes('gstType') || correctionFields.includes('gstTypeRefId') || correctionFields.includes('IsGSTRegistered')) {
                        filteredPayload.IsGSTRegistered = payload.IsGSTRegistered;
                    }


                    if (isFinanceUser) {
                        await toast.promise(
                            resubmitCustomerCorrectionFinance(correctionCustomerId, filteredPayload), // finance-resubmit endpoint
                            {
                                pending: 'Finance Resubmitting corrections...',
                                success: 'Finance corrections resubmitted successfully! 👌',
                            }
                        );
                    } else {
                        // Sales Person or Sales Head
                        await toast.promise(
                            resubmitCustomerCorrection(correctionCustomerId, filteredPayload), // resubmit-correction endpoint
                            {
                                pending: 'Resubmitting corrections...',
                                success: 'Corrections resubmitted successfully! 👌',
                            }
                        );
                    }
                } else if (isApprovalMode) {
                    const approvalPayload = {
                        action: 'APPROVE',
                        remark: 'Done from ' + (isSalesHead ? 'Sales Head' : 'Finance') + ' team',
                        ...finalPayload
                    };
                    if (currentStage === 'salesHead') {
                        await toast.promise(
                            salesHeadApproveCustomer(approvalId, approvalPayload),
                            {
                                pending: 'Sales Head Approving...',
                                success: 'Customer approved by Sales Head! 👌',
                            }
                        );
                    } else if (currentStage === 'finance') {
                        await toast.promise(
                            financeApproveCustomer(approvalId, approvalPayload),
                            {
                                pending: 'Finance Approving...',
                                success: 'Customer approved by Finance! 👌',
                            }
                        );
                    } else {
                        // Fallback to existing logic if stage mismatch
                        await toast.promise(
                            approveCustomerFinance(approvalId, finalPayload),
                            {
                                pending: 'Approving...',
                                success: 'Customer approved! 👌',
                            }
                        );
                    }
                } else {
                    await toast.promise(
                        registerCustomer(finalPayload),
                        {
                            pending: 'Registering customer...',
                            success: 'Customer registered successfully! 👌',
                        }
                    );
                }
                navigate(PATHS.APPROVALS);
            } catch (error) {
                console.error('Registration error:', error);
                toast.error(error.error?.message || error.message || "Operation failed. Please try again. 🤯");
            }
        }
    });

    // Sync refs synchronously during render to avoid lag in memoized callbacks
    formikRef.current = formik;
    configsRef.current = configs;
    const loadDraftDataById = useCallback(async (id, manualConfigs = null) => {
        setLoadingDraftData(true);
        try {
            const response = await getDraftCustomerById(id);
            const customer = response.data?.customer || response.data || response;
            const currentConfigs = manualConfigs || configsRef.current;
            const formValues = mapCustomerToFormValues(customer, currentConfigs);

            formikRef.current.setValues(formValues, false);
            setDraftCustomerId(id);
            lastLoadedIdRef.current = id;
            setIsApprovalMode(false);
            setIsReadOnlyMode(false);
            setCorrectionRequest(null);
            setCurrentStage(customer.stage || '');
            toast.info('Draft data loaded');
        } catch (error) {
            console.error('Error loading draft data:', error);
            toast.error('Failed to load draft data');
        } finally {
            setLoadingDraftData(false);
        }
    }, []);

    const fetchCorrectionData = useCallback(async (id, manualConfigs = null) => {
        setLoadingDraftData(true);
        setIsApprovalMode(false);
        setIsReadOnlyMode(false);
        try {
            const response = await getCustomerById(id);
            const customer = response.data?.customer || response.data || response;
            const currentConfigs = manualConfigs || configsRef.current;
            const formValues = mapCustomerToFormValues(customer, currentConfigs);

            formikRef.current.setValues(formValues, false);
            setCorrectionCustomerId(id);
            lastLoadedIdRef.current = id;
            setCorrectionRequest(customer.correctionRequest || null);

            // Derive stage if missing
            let stage = customer.stage;
            if (!stage && customer.approvalWorkflow) {
                if (customer.approvalWorkflow.salesHeadApprovalStatus === 'REJECTED') stage = 'salesCorrection';
                else if (customer.approvalWorkflow.financeApprovalStatus === 'REJECTED') stage = 'financeCorrection';
                else if (customer.approvalWorkflow.salesHeadApprovalStatus === 'PENDING') stage = 'salesHead';
                else if (customer.approvalWorkflow.financeApprovalStatus === 'PENDING') stage = 'finance';
            }
            setCurrentStage(stage || '');
            toast.info('Correction details loaded. Please update the highlighted fields.');
        } catch (error) {
            console.error('Error loading correction data:', error);
            toast.error('Failed to load correction data');
        } finally {
            setLoadingDraftData(false);
        }
    }, []);

    const fetchApprovalData = useCallback(async (id, manualConfigs = null) => {
        setLoadingDraftData(true);
        setIsApprovalMode(false);
        setIsReadOnlyMode(false);
        try {
            const response = await getCustomerById(id);
            const customer = response.data?.customer || response.data || response;
            const currentConfigs = manualConfigs || configsRef.current;
            const formValues = mapCustomerToFormValues(customer, currentConfigs);

            formikRef.current.setValues(formValues, false);
            setApprovalId(id);
            lastLoadedIdRef.current = id;

            // Derive stage and check permissions
            const workflow = customer.approvalWorkflow || {};
            let stage = customer.stage;
            let canApprove = false;

            if (isSalesHead && workflow.salesHeadApprovalStatus === 'PENDING') {
                canApprove = true;
                stage = 'salesHead';
            } else if (isFinanceUser && workflow.financeApprovalStatus === 'PENDING') {
                canApprove = true;
                stage = 'finance';
            } else if (!stage && workflow) {
                // Fallback derivation for UI labels if user can't approve
                if (workflow.salesHeadApprovalStatus === 'PENDING') stage = 'salesHead';
                else if (workflow.financeApprovalStatus === 'PENDING') stage = 'finance';
            }

            setCurrentStage(stage || '');

            if (canApprove) {
                setIsApprovalMode(true);
                setIsReadOnlyMode(false);
            } else {
                setIsApprovalMode(false);
                setIsReadOnlyMode(true);
            }
            toast.info(canApprove ? 'Approval data loaded. Please complete the registration.' : 'Application details loaded (View Only).');
        } catch (error) {
            console.error('Error loading approval data:', error);
            toast.error('Failed to load approval data');
        } finally {
            setLoadingDraftData(false);
        }
    }, [isFinanceUser, isSalesHead]);

    useEffect(() => {
        const fetchConfigs = async () => {
            try {
                const [data, zoneRes] = await Promise.all([
                    getCustomerConfigs(),
                    locationService.getAllZones()
                ]);

                let zones = zoneRes?.data || zoneRes || [];
                if (!Array.isArray(zones) && zones && typeof zones === 'object') {
                    zones = zones.locations || zones.data || Object.values(zones).find(Array.isArray) || [];
                }

                Object.keys(data).forEach(key => {
                    if (data[key] && !Array.isArray(data[key]) && typeof data[key] === 'object') {
                        data[key] = data[key][key] || Object.values(data[key]).find(Array.isArray) || [];
                    }
                });

                setConfigs(prev => {
                    const next = { ...prev, ...data };
                    next.zones = Array.isArray(zones) ? zones : [];
                    Object.keys(next).forEach(key => {
                        if (key !== 'cities' && !Array.isArray(next[key])) {
                            next[key] = [];
                        }
                    });

                    const draftId = searchParams.get('draftId');
                    const correctionId = searchParams.get('correctionId');
                    const approvalId = searchParams.get('approvalId');

                    // Initialization moved to separate effect

                    return next;
                });
                setConfigsLoaded(true);
                configsLoadedRef.current = true;
            } catch (err) {
                console.error('Config load error:', err);
                toast.error('Failed to load form configurations');
            }
        };
        fetchConfigs();
    }, []); // Empty dependencies to run only ONCE on mount and prevent loops

    // Data Loading Effect - Responds to URL param changes
    useEffect(() => {
        if (!configsLoaded) return;

        const aId = searchParams.get('approvalId');
        const cId = searchParams.get('correctionId');
        const dId = searchParams.get('draftId');
        // Prioritize workflow IDs over draft IDs to avoid context switching after saves
        const currentId = aId || cId || dId;

        // If we have an ID from URL, only fetch if it's different from what we last loaded
        if (currentId) {
            if (lastLoadedIdRef.current === currentId) return;

            lastLoadedIdRef.current = currentId;

            if (dId) loadDraftDataById(dId);
            else if (cId) fetchCorrectionData(cId);
            else if (aId) fetchApprovalData(aId);
        } else {
            // New Registration - Reset all modes ONLY if we were previously in a mode
            if (lastLoadedIdRef.current || draftCustomerId || correctionCustomerId || approvalId) {
                lastLoadedIdRef.current = null;
                setDraftCustomerId('');
                setCorrectionCustomerId('');
                setApprovalId('');
                setIsApprovalMode(false);
                setIsReadOnlyMode(false);
                setCorrectionRequest(null);
                setCurrentStage('');
                formik.resetForm();
            }
        }
    }, [searchParams, configsLoaded, loadDraftDataById, fetchCorrectionData, fetchApprovalData]);



    const handleMainAction = async () => {
        // Utility to flatten errors and get field names
        const getFlatErrors = (obj, prefix = '') => {
            let errors = [];
            if (!obj) return errors;

            for (const key in obj) {
                const value = obj[key];
                if (!value) continue;

                const path = prefix ? `${prefix}.${key}` : key;

                if (Array.isArray(value)) {
                    value.forEach((item, idx) => {
                        if (item && typeof item === 'object') {
                            errors = [...errors, ...getFlatErrors(item, `${path}[${idx}]`)];
                        } else if (item) {
                            errors.push({ path: `${path}[${idx}]`, message: item });
                        }
                    });
                } else if (typeof value === 'object') {
                    errors = [...errors, ...getFlatErrors(value, path)];
                } else {
                    errors.push({ path, message: value });
                }
            }
            return errors;
        };

        const formatLabel = (path) => {
            return path
                .split('.')
                .pop()
                .replace(/\[\d+\]/g, '') // Remove [0] etc
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase())
                .trim();
        };

        if (activeStep < steps.length - 1) {
            if (isStepValid(activeStep)) {
                setStep(activeStep + 1);
            } else {
                const errors = await formik.validateForm();
                const flatErrors = getFlatErrors(errors);
                const labels = [...new Set(flatErrors.map(e => formatLabel(e.path)))];

                if (labels.length > 0) {
                    toast.warning(`Please fix the following fields in ${steps[activeStep]}: ${labels.join(', ')}`);
                }

                // Mark all invalid fields as touched deeply
                const touched = {};
                flatErrors.forEach(e => {
                    // Deep set touched for Formik
                    const parts = e.path.split(/[.[\]]+/).filter(Boolean);
                    let current = touched;
                    parts.forEach((part, i) => {
                        if (i === parts.length - 1) {
                            current[part] = true;
                        } else {
                            current[part] = current[part] || {};
                            current = current[part];
                        }
                    });
                });
                formik.setTouched(touched);
            }
        } else {
            if (isReadOnlyMode) {
                navigate(PATHS.APPROVALS);
                return;
            }

            if (isApprovalMode) {
                const getObj = (list, refId, labelKey = 'name') => {
                    if (!refId) return undefined;
                    const item = (list || []).find(i => i._id === refId);
                    return {
                        name: item ? (item[labelKey] || item) : refId,
                        refId: refId
                    };
                };

                const finnalPayload = {
                    finalDiscount: Number(formik.values.finalDiscount) || 0,
                    creditLimit: Number(formik.values.creditLimit) || 0,
                    creditDays: getObj(configsRef.current.creditDays, formik.values.creditDaysRefId, 'days'),
                    proposedDiscount: Number(formik.values.proposedDiscount) || 0,
                    yearOfEstablishment: formik.values.yearOfEstablishment || ''
                };

                let serviceCall;
                const approvalPayload = {
                    action: 'APPROVE',
                    remark: 'Done from ' + (isSalesHead ? 'Sales Head' : 'Finance') + ' team',
                    finnalPayload: finnalPayload
                };

                if (currentStage === 'salesHead') {
                    serviceCall = salesHeadApproveCustomer(approvalId, approvalPayload);
                } else {
                    serviceCall = financeApproveCustomer(approvalId, approvalPayload);
                }

                await toast.promise(
                    serviceCall,
                    {
                        pending: 'Approving details...',
                        success: 'Successfully approved registration!',
                        error: 'Failed to approve registration'
                    }
                );
                navigate(PATHS.APPROVALS);
                return;
            }

            const errors = await formik.validateForm();
            const flatErrors = getFlatErrors(errors);
            if (flatErrors.length > 0) {
                const labels = [...new Set(flatErrors.map(e => formatLabel(e.path)))];
                toast.warning(`Missing/Invalid fields: ${labels.join(', ')}`);

                const touched = {};
                flatErrors.forEach(e => {
                    const parts = e.path.split(/[.[\]]+/).filter(Boolean);
                    let current = touched;
                    parts.forEach((part, i) => {
                        if (i === parts.length - 1) {
                            current[part] = true;
                        } else {
                            current[part] = current[part] || {};
                            current = current[part];
                        }
                    });
                });
                formik.setTouched(touched);
            } else {
                formik.handleSubmit();
            }
        }
    };


    const handleSaveDraft = useCallback(async () => {
        setSavingDraft(true);
        try {
            const values = formik.values;
            const getLabel = (list, id, labelKey = 'name') => {
                if (!list || !id) return '';
                const item = list.find(item => item._id === id);
                if (!item) return '';
                return item[labelKey] || item;
            };

            const draftPayload = {
                ...values,
                draftEmployeeId: draftCustomerId || undefined,
                businessType: getLabel(configs.businessTypes || [], values.businessTypeRefId),
                salesPerson: getLabel(configs.salesPersons, values.salesPersonRefId, 'employeeName'),
                gstType: getLabel(configs.gstTypes, values.gstTypeRefId),
                zone: getLabel(configs.zones, values.zoneRefId, 'zone'),
                specificLab: getLabel(configs.specificLabs, values.specificLabRefId),
                plant: getLabel(configs.plants, values.plantRefId),
                fittingCenter: getLabel(configs.fittingCenters, values.fittingCenterRefId),
                creditDays: getLabel(configs.creditDays, values.creditDaysRefId, 'days')?.toString(),
                courierName: getLabel(configs.courierNames, values.courierNameRefId),
                courierTime: getLabel(configs.courierTimes, values.courierTimeRefId, 'time'),
                creditLimit: Number(values.creditLimit) || 0,
                finalDiscount: Number(values.finalDiscount) || 0,
                IsGSTRegistered: values.gstType?.toLowerCase() !== 'un-registered' && values.gstType?.toLowerCase() !== 'unregistered',
                isGSTRegistered: values.gstType?.toLowerCase() !== 'un-registered' && values.gstType?.toLowerCase() !== 'unregistered',
                proprietorName: values.proprietorName || values.ownerName,
                currentlyDealtBrands: values.currentlyDealtBrands || '',
                billToAddress: values.billToAddress ? {
                    ...values.billToAddress,
                    customerContactName: values.billToAddress.contactPerson,
                    customerContactNumber: values.billToAddress.contactNumber
                } : null,
                customerShipToDetails: (values.customerShipToDetails || []).map(addr => ({
                    ...addr,
                    customerContactName: addr.contactPerson,
                    customerContactNumber: addr.contactNumber
                }))
            };

            const response = await toast.promise(
                draftCustomerId
                    ? updateDraftCustomer(draftCustomerId, draftPayload)
                    : draftRegisterCustomer(draftPayload),
                {
                    pending: draftCustomerId ? 'Updating draft...' : 'Saving draft...',
                    success: draftCustomerId ? 'Draft updated successfully! 👌' : 'Draft saved successfully! 👌',
                    error: draftCustomerId ? 'Failed to update draft' : 'Failed to save draft'
                }
            );

            if (response.success) {
                const newId = response.data?._id || response.data?.customer?._id || response.data?.draft?._id;
                if (newId) {
                    lastLoadedIdRef.current = newId;
                    setDraftCustomerId(newId);
                    const params = new URLSearchParams(searchParams);
                    params.set('draftId', newId);
                    setSearchParams(params);
                }
            }
        } catch (error) {
            console.error('Draft error:', error);
            toast.error(error.error?.message || error.message || "Failed to save draft.");
        } finally {
            setSavingDraft(false);
        }
    }, [formik.values, configs, draftCustomerId]);

    const handleSendForCorrection = async (correctionData) => {
        if (!approvalId) return;
        setSaving(true);
        try {
            // Match the payload structure from screenshots: action, remark, fieldsToCorrect
            const { targetRole, ...rest } = correctionData;

            const payload = {
                action: 'REQUEST_MODIFICATION',
                ...rest
            };

            let serviceCall;
            if (currentStage === 'salesHead') {
                // When sales head sends back, use sales-head-approve endpoint
                serviceCall = salesHeadApproveCustomer(approvalId, payload);
            } else if (currentStage === 'finance') {
                // When finance sends back, use finance-approve endpoint
                serviceCall = financeApproveCustomer(approvalId, payload);
            } else {
                serviceCall = sendCustomerForCorrection(approvalId, payload);
            }

            await toast.promise(
                serviceCall,
                {
                    pending: 'Sending for correction...',
                    success: 'Customer sent back for correction! 📝',
                }
            );
            navigate(PATHS.APPROVALS);
        } catch (error) {
            console.error('Correction error:', error);
            toast.error(error.message || "Failed to send for correction");
        } finally {
            setSaving(false);
        }
    };

    const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);

    const handleFileUpload = async (e, fieldName, type) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(prev => ({ ...prev, [type]: true }));
        try {
            const response = await uploadImage(file);
            const url = response.data?.url || response.url || response;
            formik.setFieldValue(fieldName, url);
            toast.success("Document uploaded successfully!");
        } catch (error) {
            toast.error('Upload failed');
        } finally {
            setUploading(prev => ({ ...prev, [type]: false }));
        }
    };

    const wrapInput = (Component, props, hideVerify = false) => {
        const { onChange: customOnChange, disabled: customDisabled, ...rest } = props;
        const isCorrectionField = correctionRequest?.fieldsToCorrect?.includes(props.name);

        const allowedApprovalFields = [
            'finalDiscount',
            'creditLimit',
            'creditDaysRefId',
            'proposedDiscount',
            'yearOfEstablishment'
        ];

        // Disable field if it's read only, or custom disabled. 
        // BUT if we are in approval mode, ONLY the allowed fields are enabled (overriding customDisabled).
        let isFieldDisabled;
        if (isApprovalMode) {
            isFieldDisabled = !allowedApprovalFields.includes(props.name);
        } else {
            isFieldDisabled = isReadOnlyMode || customDisabled;
        }

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
            <div className={`relative ${isCorrectionField ? 'p-1 rounded-2xl bg-red-50/50 border border-red-100 ring-2 ring-red-500/20' : ''}`}>
                <Component
                    {...rest}
                    disabled={isFieldDisabled}
                    isVerificationMode={hideVerify ? false : isVerificationMode}
                    isRejected={rejectedFields[props.name]}
                    onToggleRejection={(fieldName) => dispatch(toggleFieldRejection({ fieldName }))}
                    error={fieldTouched && fieldError ? { message: fieldError } : null}
                    onChange={(e) => {
                        if (customOnChange) customOnChange(e);
                        else formik.handleChange(e);
                    }}
                    onBlur={formik.handleBlur}
                    value={rest.value !== undefined ? rest.value : (fieldValue ?? '')}
                />
                {isCorrectionField && (
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg animate-bounce z-20">
                        <Icon icon="mdi:alert-circle" className="text-sm" />
                    </div>
                )}
            </div>
        );
    };

    const isStepValid = (stepIdx = activeStep) => {
        const { values, errors } = formik;

        switch (stepIdx) {
            case 0: // Firm/Company Details
                const st0Req = ['gstType'];
                const hasSt0Req = st0Req.every(f => !!values[f]);
                if (!hasSt0Req) return false;
                if (values.gstType?.toLowerCase() !== 'un-registered' && values.gstType?.toLowerCase() !== 'unregistered') {
                    return !!values.firmName && !!values.gstNumber && !!values.gstCertificateImg && !errors.firmName && !errors.gstNumber;
                }
                return !!values.shopName && !!values.aadharCard && !!values.aadharCardImg && !!values.panCard && !!values.panCardImg && !errors.shopName && !errors.aadharCard && !errors.panCard;

            case 1: // Address Details
                const billFields = ['branchName', 'contactPerson', 'contactNumber', 'city', 'state', 'zipCode'];
                const billValid = billFields.every(f => !!values.billToAddress?.[f]) && !errors.billToAddress;
                const shipValid = values.customerShipToDetails?.length > 0 && values.customerShipToDetails.every((addr, idx) => {
                    const hasFields = billFields.every(f => !!addr[f]);
                    const hasErrors = errors.customerShipToDetails?.[idx] && billFields.some(f => !!errors.customerShipToDetails[idx][f]);
                    return hasFields && !hasErrors;
                });
                return billValid && shipValid;

            case 2: // Business Information
                const bizFields = ['minSalesValue', 'creditDaysRefId'];
                const bizValid = bizFields.every(f => !!values[f]) && !errors.minSalesValue && !errors.creditDaysRefId;
                return bizValid;

            case 3: // Contact Information
                const contactFields = ['ownerName', 'mobileNo1', 'zoneRefId', 'salesPersonRefId'];
                return contactFields.every(f => !!values[f]) && !errors.ownerName && !errors.mobileNo1 && !errors.zoneRefId && !errors.salesPersonRefId;

            case 4: // Overview
                return true;

            default: return false;
        }
    };

    const renderStepContent = (stepIdx) => {
        switch (stepIdx) {
            case 0: return (
                <FirmCompanyDetails
                    wrapInput={wrapInput}
                    configs={configs}
                    formik={formik}
                    handleFileUpload={handleFileUpload}
                    uploading={uploading}
                    isReadOnlyMode={isReadOnlyMode}
                />
            );
            case 1: return <AddressDetails formik={formik} wrapInput={wrapInput} configs={configs} isReadOnlyMode={isReadOnlyMode} />;
            case 2: return (
                <BusinessInformation
                    formik={formik}
                    wrapInput={wrapInput}
                    configs={configs}
                    isReadOnlyMode={isReadOnlyMode}
                    isApprovalMode={isApprovalMode}
                    handleFileUpload={handleFileUpload}
                    uploading={uploading}
                />
            );
            case 3: return <ContactInformation wrapInput={wrapInput} configs={configs} />;
            case 4: return <Overview formik={formik} configs={configs} isSalesUser={isSalesUser} />;
            default: return null;
        }
    };

    const customerName = formik.values.shopName || 'this customer';

    return (
        <div className="min-h-screen p-6 bg-gray-50/50">
            {/* Refined Minimal Header */}

            {/* Correction Header */}
            {correctionRequest && (
                <div className="max-w-6xl mx-auto mb-8 bg-red-50/50 border border-red-100 rounded-2xl p-6 flex items-start gap-6 animate-in slide-in-from-top-4 duration-500 shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-red-500/20">
                        <Icon icon="mdi:comment-alert" className="text-2xl" />
                    </div>
                    <div>
                        <h4 className="text-red-800 font-black uppercase tracking-widest text-xs mb-1">Correction Required</h4>
                        <p className="text-red-700 font-bold text-sm leading-relaxed">{correctionRequest.remark}</p>
                        <p className="text-red-500 text-[10px] uppercase font-black tracking-widest mt-2 flex items-center gap-2">
                            Requested By: {correctionRequest.requestedBy?.employeeName || 'Finance'} • {correctionRequest.requestedAt ? new Date(correctionRequest.requestedAt).toLocaleDateString() : 'Recent'}
                        </p>
                    </div>
                </div>
            )}

            {/* Approval Mode Banner */}
            {isApprovalMode && (
                <div className="max-w-6xl mx-auto mb-8 bg-erp-accent/5/50 border border-erp-accent/10 rounded-2xl p-6 flex items-start gap-6 animate-in slide-in-from-top-4 duration-500 shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-erp-accent text-white flex items-center justify-center shrink-0 shadow-lg shadow-erp-accent/20">
                        <Icon icon="mdi:shield-check" className="text-2xl" />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-erp-accent font-black uppercase tracking-widest text-xs mb-1">
                            {currentStage === 'salesHead' ? 'Sales Head Approval Mode' : 'Finance Approval Mode'}
                        </h4>
                        <p className="text-erp-accent font-bold text-sm leading-relaxed">
                            {currentStage === 'salesHead'
                                ? 'You are reviewing a customer registration as Sales Head. Please verify all details and Approve or Request Redirection.'
                                : 'You are reviewing a customer registration submitted by Sales. Please verify all details, provide the mandatory Login Details, and click Approve to finalize.'}
                        </p>
                    </div>
                    {(isFinanceUser || isSalesHead) && (activeStep === 0 || activeStep === 1 || activeStep === steps.length - 1) && (
                        <Button
                            variant="outlined"
                            className="bg-white border-erp-accent/20 text-erp-accent hover:bg-erp-accent/10 flex gap-2 align-center justify-center"
                            onClick={() => {
                                dispatch(toggleVerificationMode());
                                // We don't necessarily need to open the modal immediately, 
                                // the user can click "Needs Correction" at the bottom too.
                            }}
                        >
                            {isVerificationMode ? 'Cancel Selection' : 'Send for Correction'}
                        </Button>
                    )}
                </div>
            )}

            {isReadOnlyMode && (
                <div className="max-w-6xl mx-auto mb-8 bg-gray-50 border border-gray-100 rounded-2xl p-6 flex items-start gap-6 animate-in slide-in-from-top-4 duration-500 shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-gray-400 text-white flex items-center justify-center shrink-0 shadow-lg shadow-gray-400/20">
                        <Icon icon="mdi:eye" className="text-2xl" />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-gray-800 font-black uppercase tracking-widest text-xs mb-1">View Only Mode</h4>
                        <p className="text-gray-600 font-bold text-sm leading-relaxed">
                            This registration is currently <span className="text-erp-accent">Pending {currentStage === 'salesHead' ? 'Sales Head' : 'Finance'} Approval</span>. You can review the submitted details, but modifications are restricted at this stage.
                        </p>
                    </div>
                    <div className="px-4 py-2 bg-erp-accent/5 text-erp-accent rounded-xl text-[10px] font-black uppercase tracking-widest border border-erp-accent/10">
                        READ ONLY
                    </div>
                </div>
            )}

            {/* Main Content Card with Accordion */}
            <div className="max-w-6xl mx-auto">
                <div className="space-y-6">
                    {!configsLoaded || loadingDraftData ? (
                        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-gray-100 shadow-sm animate-in fade-in zoom-in duration-500">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full border-4 border-erp-accent/10 border-t-erp-accent animate-spin" />
                                <Icon icon="mdi:account-details" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl text-erp-accent" />
                            </div>
                            <p className="mt-6 text-gray-400 font-black uppercase tracking-[0.2em] text-[10px] animate-pulse">Initializing Application...</p>
                        </div>
                    ) : (
                        <FormikProvider value={formik}>
                            {steps.map((label, idx) => {
                                const isActive = activeStep === idx;
                                const isValid = isStepValid(idx);
                                const isCompleted = idx < activeStep && isValid;
                                const hasError = !isValid && (idx < activeStep || formik.submitCount > 0);

                                return (
                                    <div
                                        key={idx}
                                        className={`bg-white rounded-2xl border transition-all duration-300 ${hasError
                                            ? 'border-red-200 bg-red-50/10 shadow-lg ring-1 ring-red-100'
                                            : isActive
                                                ? 'shadow-2xl ring-1 ring-erp-accent/10 border-erp-accent/20'
                                                : 'shadow-sm border-gray-100'
                                            }`}
                                    >
                                        {/* Accordion Header */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (idx <= activeStep || isStepValid(activeStep) || isReadOnlyMode || isApprovalMode) {
                                                    setStep(idx);
                                                } else {
                                                    toast.warning(`Please complete the current step first.`);
                                                }
                                            }}
                                            className="w-full flex items-center justify-between p-6 cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${hasError
                                                    ? 'bg-red-500 text-white shadow-lg scale-110'
                                                    : isActive
                                                        ? 'bg-erp-accent text-white shadow-lg rotate-12 scale-110'
                                                        : isCompleted
                                                            ? 'bg-green-500 text-white'
                                                            : 'bg-gray-100 text-gray-400 group-hover:bg-erp-accent/5'
                                                    }`}>
                                                    {hasError ? <Icon icon="mdi:alert-circle" className="text-xl" /> : (isCompleted ? <Icon icon="mdi:check" className="text-xl" /> : <span className="font-black italic text-lg">{idx + 1}</span>)}
                                                </div>
                                                <div className="text-left">
                                                    <h3 className={`font-black uppercase tracking-widest text-sm transition-colors ${hasError
                                                        ? 'text-red-600'
                                                        : isActive
                                                            ? 'text-erp-accent'
                                                            : 'text-gray-700'
                                                        }`}>
                                                        {label}
                                                    </h3>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase  ">
                                                        {hasError ? 'Attention Required' : (isActive ? 'Currently Editing' : isCompleted ? 'Verification Complete' : 'Pending Details')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${isActive ? (hasError ? 'bg-red-50 rotate-180' : 'bg-erp-accent/5 rotate-180') : 'bg-gray-50'}`}>
                                                <Icon icon="mdi:chevron-down" className={`text-xl ${isActive ? (hasError ? 'text-red-500' : 'text-erp-accent') : 'text-gray-400'}`} />
                                            </div>
                                        </button>

                                        {/* Accordion Content */}
                                        {isActive && (
                                            <div className="p-8 md:p-12 pt-0 animate-in fade-in slide-in-from-top-4 duration-500">
                                                <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-100 to-transparent mb-12" />
                                                {renderStepContent(idx)}

                                                {/* Step Footer Navigation */}
                                                {!isReadOnlyMode && (
                                                    <div className="mt-12 pt-8 border-t border-gray-50 flex flex-col sm:flex-row items-center justify-between gap-6">
                                                        <div className="flex items-center gap-3">
                                                            {!isApprovalMode && (
                                                                <button
                                                                    type="button"
                                                                    onClick={handleSaveDraft}
                                                                    disabled={savingDraft || loadingDraftData}
                                                                    className="flex items-center px-6 py-3 bg-white border border-gray-200 text-gray-600 text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                                                                >
                                                                    <Icon icon={draftCustomerId ? "mdi:cloud-check" : "mdi:content-save"} className="mr-2 text-base text-gray-400" />
                                                                    {draftCustomerId ? 'Update Draft' : 'Save Draft'}
                                                                </button>
                                                            )}

                                                            {activeStep > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setStep(activeStep - 1)}
                                                                    className="flex items-center px-6 py-3 bg-gray-100 text-gray-600 text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all active:scale-95 shadow-sm"
                                                                >
                                                                    <Icon icon="mdi:chevron-left" className="mr-1 text-base" />
                                                                    Back
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-3 w-full sm:w-auto">
                                                            {(isFinanceUser || isSalesHead) && isApprovalMode && (
                                                                <div className="flex gap-2 w-full sm:w-auto">
                                                                    {!isVerificationMode ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => dispatch(toggleVerificationMode())}
                                                                            className="flex-1 sm:flex-none flex items-center justify-center px-6 py-3 bg-erp-accent/5 border border-erp-accent/20 text-erp-accent text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-erp-accent/10 transition-all shadow-sm"
                                                                        >
                                                                            Needs Correction
                                                                        </button>
                                                                    ) : (
                                                                        <>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => dispatch(toggleVerificationMode())}
                                                                                className="flex-1 sm:flex-none px-6 py-3 bg-gray-100 text-gray-600 text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all shadow-sm"
                                                                            >
                                                                                Cancel
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const fields = Object.keys(rejectedFields).filter(k => rejectedFields[k]);
                                                                                    if (fields.length === 0) {
                                                                                        toast.warning("Please select fields to reject");
                                                                                        return;
                                                                                    }
                                                                                    setCorrectionRequest({ fields, remarks: '' });
                                                                                    setIsCorrectionModalOpen(true);
                                                                                }}
                                                                                className="flex-1 sm:flex-none px-6 py-3 bg-red-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all"
                                                                            >
                                                                                Confirm Rejection
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )}

                                                            <button
                                                                type="button"
                                                                disabled={isVerificationMode}
                                                                onClick={handleMainAction}
                                                                className={`flex-1 sm:flex-none flex items-center justify-center px-10 py-3 bg-erp-accent text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 active:scale-95 gap-2 shadow-lg shadow-erp-accent/20 ${isVerificationMode ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:bg-erp-accent hover:-translate-y-0.5'}`}
                                                            >
                                                                <span>
                                                                    {activeStep === steps.length - 1
                                                                        ? (isApprovalMode ? 'Approve' : (correctionCustomerId ? 'Resubmit' : ((user?.EmployeeType === 'SUPERADMIN' || isFinanceUser || isSalesHead) ? 'Register' : 'Submit')))
                                                                        : 'Next Step'}
                                                                </span>
                                                                <Icon icon={activeStep === steps.length - 1 ? "mdi:check-decagram" : "mdi:arrow-right-circle"} className="text-base" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {isReadOnlyMode && activeStep === steps.length - 1 && (
                                                    <div className="mt-12 pt-8 border-t border-gray-50 flex justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={handleMainAction}
                                                            className="px-10 py-3 bg-gray-800 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-900 transition-all active:scale-95 shadow-lg shadow-gray-800/20"
                                                        >
                                                            Close Review
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </FormikProvider>
                    )}
                </div>

                {/* Footer removed and moved to top header */}
                <div className="h-32" />
            </div>

            <CorrectionRequestModal
                isOpen={isCorrectionModalOpen}
                onClose={() => setIsCorrectionModalOpen(false)}
                onSubmit={handleSendForCorrection}
                customerName={formik.values.shopName || formik.values.ownerName}
                initialFields={correctionRequest?.fields || correctionRequest?.fieldsToCorrect || []}
                loading={saving}
                showTargetRole={isSalesHead}
            />
        </div>
    );
}




