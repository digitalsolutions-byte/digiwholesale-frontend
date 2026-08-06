import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Icon } from '@iconify/react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { createSupervisorUser, createDraftEmployee, getDraftEmployeeById, updateDraftEmployee } from '../services/employeeService';
import { uploadImage } from '../services/bucketService';
import { getSystemConfigs } from '../services/configService';
import { getAllDepartments, getSubRoles } from '../services/departmentService';
import { getAllRegions } from '../services/customerService';
import { toast } from 'react-toastify';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as locationService from '../services/locationService';
import { PATHS } from '../routes/paths';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

const PAGE_ACCESS_OPTIONS = [
    { value: 'DASHBOARD', label: 'Dashboard' },
    { value: 'REGISTER_CUSTOMER', label: 'Register Customer' },
    { value: 'REGISTER_STAFF', label: 'Register Staff' },
    { value: 'STAFF_LIST', label: 'Staff List' },
    { value: 'CUSTOMER_LIST', label: 'Customer List' },
    { value: 'SHIP_TO', label: 'Ship To' },
    { value: 'APPROVALS', label: 'Approvals' },
    { value: 'CORRECTIONS', label: 'Corrections' },
    { value: 'NEW_ORDER', label: 'New Order' },
    { value: 'ALL_ORDERS', label: 'All Orders' },
    { value: 'PENDING_ORDERS', label: 'Pending Orders' },
    { value: 'OTHER_SALES', label: 'Other Sales' },
    { value: 'SALES_LIST', label: 'Sales List' },
    { value: 'RETURN_REFUND', label: 'Return & Refund' },
    { value: 'EXCHANGE_REQUESTS', label: 'Exchange Requests' },
    { value: 'DRAFTS', label: 'Drafts' },
    { value: 'DAILY_REPORT', label: 'Daily Report' },
    { value: 'MAIN_REPORT', label: 'Main Report' },
    { value: 'ADD_REPAIR', label: 'Add Repair' },
    { value: 'REPAIR_LIST', label: 'Repair List' },
    { value: 'ADD_VENDOR', label: 'Add Vendor' },
    { value: 'VENDOR_LIST', label: 'Vendor List' },
    { value: 'VENDOR_ORDER', label: 'Vendor Order' },
    { value: 'QUALITY', label: 'Quality' },
    { value: 'FITTING', label: 'Fitting' },
    { value: 'SHIPPING', label: 'Shipping' },
    { value: 'INVENTORY', label: 'Inventory' },
];

const ACCESS_PERMISSION_OPTIONS = [
    { value: 'ADD_STAFF',         label: 'Add Staff' },
    { value: 'UPDATE_STAFF',      label: 'Update Staff' },
    { value: 'DELETE_STAFF',      label: 'Delete Staff' },
    { value: 'ADD_CUSTOMER',      label: 'Add Customer' },
    { value: 'UPDATE_CUSTOMER',   label: 'Update Customer' },
    { value: 'DELETE_CUSTOMER',   label: 'Delete Customer' },
    { value: 'ADD_ORDER',         label: 'Add Order' },
    { value: 'UPDATE_ORDER',      label: 'Update Order' },
    { value: 'DELETE_ORDER',      label: 'Delete Order' },
    { value: 'APPROVE_ORDER',     label: 'Approve Order' },
    { value: 'ADD_DRAFT',         label: 'Add Draft' },
    { value: 'UPDATE_DRAFT',      label: 'Update Draft' },
    { value: 'DELETE_DRAFT',      label: 'Delete Draft' },
    { value: 'ADD_REPAIR',        label: 'Add Repair' },
    { value: 'UPDATE_REPAIR',     label: 'Update Repair' },
    { value: 'DELETE_REPAIR',     label: 'Delete Repair' },
    { value: 'ADD_VENDOR',        label: 'Add Vendor' },
    { value: 'UPDATE_VENDOR',     label: 'Update Vendor' },
    { value: 'DELETE_VENDOR',     label: 'Delete Vendor' },
    { value: 'UPDATE_QUALITY',    label: 'Update Quality' },
    { value: 'UPDATE_FITTING',    label: 'Update Fitting' },
    { value: 'UPDATE_SHIPPING',   label: 'Update Shipping' },
    { value: 'UPDATE_INVENTORY',  label: 'Update Inventory' },
    { value: 'VIEW_REPORTS',      label: 'View Reports' },
    { value: 'EXPORT_REPORTS',    label: 'Export Reports' },
];

const datePickerStyles = {
    '& .MuiOutlinedInput-root': {
        borderRadius: '12px',
        backgroundColor: 'rgba(229, 231, 235, 0.5)',
        fontSize: '0.875rem',
        height: '56px', // Standard MUI Height to match other inputs
        '& fieldset': {
            borderColor: 'var(--color-erp-accent)',
            borderWidth: '1px',
        },
        '&:hover fieldset': {
            borderColor: 'var(--color-erp-accent)',
            borderWidth: '2px',
        },
        '&.Mui-focused fieldset': {
            borderColor: 'var(--color-erp-accent)',
            borderWidth: '2px',
        },
    },
    '& .MuiInputBase-input': {
        paddingLeft: '1rem',
        color: '#000',
    },
    '& .MuiInputLabel-root': {
        color: '#4B5563',
        '&.Mui-focused': {
            color: 'var(--color-erp-accent)',
        },
    }
};

const Registration = () => {
    const navigate = useNavigate();
    const aadharInputRef = useRef(null);
    const panInputRef = useRef(null);

    const [images, setImages] = useState({
        aadhar: { file: null, preview: null, url: '', uploading: false },
        pan: { file: null, preview: null, url: '', uploading: false }
    });

    const [configs, setConfigs] = useState({
        EmployeeType: [],
        departments: []
    });

    const [subRoles, setSubRolesList] = useState([]);
    const [loadingConfigs, setLoadingConfigs] = useState(true);
    const [loadingSubRoles, setLoadingSubRoles] = useState(false);

    // Location hierarchy state for Sales department
    const [locationData, setLocationData] = useState({
        zones: [],
        states: [],
        cities: [],
        zipcodes: []
    });
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [searchParams] = useSearchParams();
    const [loadingDraft, setLoadingDraft] = useState(false);
    const [savingDraft, setSavingDraft] = useState(false);
    const [draftEmployeeId, setDraftEmployeeId] = useState('');

    // Page Access & Permission state
    const [pageAccess, setPageAccess] = useState([]);
    const [accessPermissions, setAccessPermissions] = useState([]);

    const toggleItem = (list, setList, value) => {
        setList(prev =>
            prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
        );
    };

    const toggleAll = (options, list, setList) => {
        if (list.length === options.length) {
            setList([]);
        } else {
            setList(options.map(o => o.value));
        }
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [configRes, deptRes] = await Promise.all([
                    getSystemConfigs(),
                    getAllDepartments(),
                ]);

                if (configRes.success) {
                    setConfigs(prev => ({
                        ...prev,
                        EmployeeType: configRes.data.find(c => c.configType === 'EmployeeType')?.values || []
                    }));
                }

                if (deptRes.success) {
                    setConfigs(prev => ({
                        ...prev,
                        departments: deptRes.data || []
                    }));
                }
            } catch (error) {
                console.error('Failed to fetch initial data:', error);
                toast.error("Failed to load form options");
            } finally {
                setLoadingConfigs(false);
            }
        };

        fetchInitialData();
    }, []);

    const loadDraftData = useCallback(async (draftId) => {
        setLoadingDraft(true);
        try {
            const response = await getDraftEmployeeById(draftId);
            console.log(response);
            const draft = response.data.user || response;

            // Map draft data to form values
            const formValues = {
                employeeType: draft.EmployeeType || draft.employeeType || '',
                employeeName: draft.employeeName || '',
                email: draft.email || '',
                password: draft.password || '',
                phone: draft.phone || '',
                address: draft.address || '',
                country: draft.country || 'India',
                department: draft.Department?.refId || draft.departmentRefId || '',
                role: draft.subRoles?.[0]?.refId || '',
                pincode: draft.pincode || '',
                expiry: draft.expiry || '',
                aadharCard: draft.aadharCard || '',
                panCard: draft.panCard || '',
                state: draft.state || '',
                city: draft.city || '',
                username: draft.username || '',
                zoneRefId: draft.zone?.refId || draft.zoneRefId || draft.region || ''
            };

            formik.setValues(formValues);

            // Set image previews if URLs exist
            const aadharUrl = draft.aadharCardImg || (typeof draft.aadharCard === 'string' && draft.aadharCard.includes('http') ? draft.aadharCard : '');
            const panUrl = draft.panCardImg || (typeof draft.panCard === 'string' && draft.panCard.includes('http') ? draft.panCard : '');

            if (aadharUrl) setImages(prev => ({ ...prev, aadhar: { ...prev.aadhar, url: aadharUrl, preview: aadharUrl } }));
            if (panUrl) setImages(prev => ({ ...prev, pan: { ...prev.pan, url: panUrl, preview: panUrl } }));

            setDraftEmployeeId(draftId);
            toast.success("Draft loaded successfully");
        } catch (error) {
            console.error("Error loading draft:", error);
            toast.error("Failed to load draft data");
        } finally {
            setLoadingDraft(false);
        }
    }, []);

    useEffect(() => {
        const draftId = searchParams.get('draftId');
        if (draftId) {
            loadDraftData(draftId);
        }
    }, [searchParams, loadDraftData]);

    const applyDefaultPermissions = (employeeType, departmentId, roleCode) => {
        const type = employeeType?.toUpperCase();
        const dept = configs.departments.find(d => d._id === departmentId);
        const deptName = dept?.name?.toUpperCase() || '';
        const role = roleCode?.toUpperCase() || '';

        let defaultPageAccess = ['DASHBOARD'];
        let defaultAccessPermissions = [];

        if (type === 'SUPERADMIN') {
            defaultPageAccess = PAGE_ACCESS_OPTIONS.map(o => o.value);
            defaultAccessPermissions = ACCESS_PERMISSION_OPTIONS.map(o => o.value);
        } else if (type === 'ADMIN') {
            defaultPageAccess = ['DASHBOARD', 'REGISTER_STAFF', 'STAFF_LIST', 'DAILY_REPORT', 'MAIN_REPORT'];
            defaultAccessPermissions = ['ADD_STAFF', 'UPDATE_STAFF', 'VIEW_REPORTS'];
        } else {
            // STAFF / other categories
            if (deptName === 'SALES') {
                defaultPageAccess = ['DASHBOARD', 'NEW_ORDER', 'ALL_ORDERS', 'PENDING_ORDERS', 'OTHER_SALES', 'SALES_LIST', 'CUSTOMER_LIST', 'SHIP_TO', 'RETURN_REFUND', 'EXCHANGE_REQUESTS', 'DRAFTS'];
                defaultAccessPermissions = ['ADD_ORDER', 'UPDATE_ORDER', 'ADD_DRAFT', 'UPDATE_DRAFT', 'ADD_CUSTOMER', 'UPDATE_CUSTOMER'];
                if (role === 'MANAGER' || role === 'SUPERVISOR') {
                    defaultAccessPermissions.push('APPROVE_ORDER');
                }
            } else if (deptName === 'FINANCE') {
                defaultPageAccess = ['DASHBOARD', 'APPROVALS', 'CORRECTIONS', 'DAILY_REPORT', 'MAIN_REPORT'];
                defaultAccessPermissions = ['APPROVE_ORDER', 'VIEW_REPORTS', 'EXPORT_REPORTS'];
            } else if (deptName === 'PURCHASE' || deptName === 'INVENTORY' || deptName === 'STORE') {
                defaultPageAccess = ['DASHBOARD', 'ADD_VENDOR', 'VENDOR_LIST', 'VENDOR_ORDER', 'QUALITY', 'INVENTORY'];
                defaultAccessPermissions = ['ADD_VENDOR', 'UPDATE_VENDOR', 'UPDATE_QUALITY', 'UPDATE_INVENTORY'];
            } else if (deptName === 'CUSTOMER_CARE' || deptName === 'CUSTOMER SERVICE') {
                defaultPageAccess = ['DASHBOARD', 'CUSTOMER_LIST', 'SHIP_TO', 'ALL_ORDERS', 'RETURN_REFUND', 'EXCHANGE_REQUESTS', 'ADD_REPAIR', 'REPAIR_LIST'];
                defaultAccessPermissions = ['ADD_CUSTOMER', 'UPDATE_CUSTOMER', 'ADD_REPAIR', 'UPDATE_REPAIR'];
            } else if (deptName === 'LOGISTICS' || deptName === 'SHIPPING' || deptName === 'FITTING') {
                defaultPageAccess = ['DASHBOARD', 'FITTING', 'SHIPPING'];
                defaultAccessPermissions = ['UPDATE_FITTING', 'UPDATE_SHIPPING'];
            }
        }

        setPageAccess(defaultPageAccess);
        setAccessPermissions(defaultAccessPermissions);
    };

    const handleSaveDraft = async () => {
        setSavingDraft(true);
        try {
            const values = formik.values;
            const selectedDept = configs.departments.find(d => d._id === values.department);

            const payload = {
                ...values,
                department: selectedDept?.name,
                departmentRefId: values.department,
                draft: true // Mark as draft for backend if needed
            };

            if (draftEmployeeId) {
                payload.draftEmployeeId = draftEmployeeId;
            }

            const response = await toast.promise(
                draftEmployeeId
                    ? updateDraftEmployee(draftEmployeeId, payload)
                    : createDraftEmployee(payload),
                {
                    pending: draftEmployeeId ? 'Updating draft...' : 'Saving draft...',
                    success: draftEmployeeId ? 'Draft updated successfully! 👌' : 'Draft saved successfully! 👌',
                    error: draftEmployeeId ? 'Failed to update draft' : 'Failed to save draft'
                }
            );

            if (response.success && !draftEmployeeId) {
                console.log(response.data);
                const newDraftId = response.data?.employee?._id || response.data?._id;
                if (newDraftId) {
                    setDraftEmployeeId(newDraftId);
                }
            }
        } catch (error) {
            console.error('Draft error:', error);
            toast.error(error?.error?.message || 'Failed to save draft');
        } finally {
            setSavingDraft(false);
        }
    };

    const formik = useFormik({
        initialValues: {
            employeeType: '',
            employeeName: '',
            email: '',
            password: '',
            phone: '',
            address: '',
            country: 'India',
            department: '',
            role: '',
            pincode: '',
            expiry: '',
            aadharCard: '',
            panCard: '',
            state: '',
            city: '',
            username: '',
            zoneRefId: ''
        },
        validationSchema: Yup.object({
            employeeType: Yup.string().required('Staff Category is required'),
            employeeName: Yup.string().required('Staff Name is required'),
            email: Yup.string().email('Invalid email format').required('Email is required'),
            password: Yup.string().required('Password is required'),
            phone: Yup.string()
                .matches(/^[0-9]+$/, "Must be only digits")
                .min(10, 'Must be exactly 10 digits')
                .max(10, 'Must be exactly 10 digits')
                .required('Phone is required'),
            address: Yup.string().required('Address is required'),
            pincode: Yup.string().required('Pincode is required'),
            // lab: Yup.string().required('Lab is required'), // Commented out for now
            zoneRefId: Yup.string().when('department', {
                is: (val) => {
                    const dept = configs.departments.find(d => d._id === val);
                    return dept?.name?.toUpperCase() === 'SALES';
                },
                then: (schema) => schema.required('Zone is required for Sales department'),
                otherwise: (schema) => schema.notRequired()
            }),
            department: Yup.string().required('Department is required'),
            role: Yup.string().when('employeeType', {
                is: (val) => val?.toUpperCase() !== 'ADMIN',
                then: (schema) => schema.required('Role is required'),
                otherwise: (schema) => schema.notRequired()
            }),
            aadharCard: Yup.string().when('employeeType', {
                is: (val) => val?.toUpperCase() !== 'SUPERADMIN',
                then: (schema) => schema.required('Aadhar Card image is required'),
                otherwise: (schema) => schema.notRequired()
            }),
            panCard: Yup.string().when('employeeType', {
                is: (val) => val?.toUpperCase() !== 'SUPERADMIN',
                then: (schema) => schema.required('PAN Card image is required'),
                otherwise: (schema) => schema.notRequired()
            }),
            username: Yup.string()
                .required('Username is required')
                .matches(/^\S+$/, "Username cannot contain spaces")
                .min(3, 'Username must be at least 3 characters'),
        }),
        onSubmit: async (values, { setSubmitting }) => {
            try {
                const selectedDept = configs.departments.find(d => d._id === values.department);
                const selectedRole = subRoles.find(r => r.code === values.role);
                const isSales = selectedDept?.name?.toUpperCase() === 'SALES';
                const employeeType = values.employeeType?.toUpperCase();

                let payload = {
                    employeeType: values.employeeType,
                    username: values.username,
                    employeeName: values.employeeName,
                    email: values.email,
                    password: values.password,
                    phone: values.phone,
                    address: values.address,
                    country: values.country,
                };

                if (selectedDept) {
                    payload.department = selectedDept.name;
                    payload.departmentRefId = selectedDept._id;
                }

                // Add subRoles for roles other than ADMIN (Supervisor, Teamlead, etc)
                if (employeeType !== 'ADMIN') {
                    payload.subRoles = selectedRole ? [
                        {
                            name: selectedRole.name,
                            refId: selectedRole._id
                        }
                    ] : [];
                }

                // Add documents and other info for non-SUPERADMIN types
                if (employeeType !== 'SUPERADMIN') {
                    payload = {
                        ...payload,
                        pincode: values.pincode,
                        aadharCard: values.aadharCard,
                        panCard: values.panCard,
                        expiry: values.expiry,
                        // lab: values.lab,
                    };

                    // Specific handling for SALES zone hierarchy
                    if (isSales) {
                        const selectedZone = (locationData.zones || []).find(z => z._id === values.zoneRefId);
                        payload.zone = selectedZone?.name || selectedZone?.zone || '';
                        payload.zoneRefId = values.zoneRefId;
                    }
                }

                payload.pageAccess = pageAccess;
                payload.accessPermissions = accessPermissions;

                const response = await createSupervisorUser(payload);
                if (response.success) {
                    toast.success("Staff Registered Successfully!");
                    navigate(PATHS.WELCOME, { state: { from: 'register' } });
                }
            } catch (error) {
                console.error('Registration Error:', error);
                toast.error(error.error?.message || error.message || "Failed to create user");
            } finally {
                setSubmitting(false);
            }
        },
    });

    const handleDeptChange = async (e) => {
        const deptId = e.target.value;
        const selectedDepartment = configs.departments.find(d => d._id === deptId);
        const isSales = selectedDepartment?.name?.toUpperCase() === 'SALES';

        formik.setFieldValue('department', deptId);
        formik.setFieldValue('role', '');
        formik.setFieldValue('zoneRefId', '');
        setSubRolesList([]);
        setLocationData({ zones: [], states: [], cities: [], zipcodes: [] });

        if (deptId) {
            setLoadingSubRoles(true);
            try {
                const response = await getSubRoles(deptId);
                if (response.success) {
                    setSubRolesList(response.data.subRoles || []);
                }
            } catch (error) {
                console.error('Failed to fetch sub-roles:', error);
                toast.error("Failed to load roles for this department");
            } finally {
                setLoadingSubRoles(false);
            }
        }

        if (deptId && isSales) {
            // Fetch Zones for Sales department
            setLoadingLocation(true);
            try {
                const response = await locationService.getAllZones();
                let zones = response?.data || response || [];
                if (!Array.isArray(zones) && zones && typeof zones === 'object') {
                    zones = zones.locations || zones.data || Object.values(zones).find(Array.isArray) || [];
                }

                // Get other configs if any (though usually for staff it's selected differently)
                // For staff registration we mainly need departments/roles which are often separate

                setLocationData(prev => ({ ...prev, zones: Array.isArray(zones) ? zones : [] }));
            } catch (error) {
                console.error('Failed to fetch zones:', error);
                toast.error("Failed to load zones");
            } finally {
                setLoadingLocation(false);
            }
        }
        
        applyDefaultPermissions(formik.values.employeeType, deptId, '');
    };

    const handleZoneChange = async (e) => {
        const zoneId = e.target.value;

        const selectedZone = locationData.zones.find(z => z._id === zoneId);

        formik.setFieldValue('zoneRefId', zoneId); // Store the ID
        formik.setFieldValue('state', '');
        formik.setFieldValue('city', '');
        formik.setFieldValue('pincode', '');

        setLocationData(prev => ({ ...prev, states: [], cities: [], zipcodes: [] }));

        if (zoneId) {
            setLoadingLocation(true);
            try {
                const response = await locationService.getStatesByZone(zoneId);
                let states = response?.data || response || [];
                if (!Array.isArray(states) && states && typeof states === 'object') {
                    states = states.states || states.data || Object.values(states).find(Array.isArray) || [];
                }
                setLocationData(prev => ({ ...prev, states: Array.isArray(states) ? states : [] }));
            } catch (error) {
                console.error('Failed to fetch states:', error);
            } finally {
                setLoadingLocation(false);
            }
        }
    };

    const handleStateChange = async (e) => {
        const stateId = e.target.value;
        formik.setFieldValue('state', stateId);
        formik.setFieldValue('city', '');
        formik.setFieldValue('pincode', '');

        setLocationData(prev => ({ ...prev, cities: [], zipcodes: [] }));

        if (stateId) {
            setLoadingLocation(true);
            try {
                const response = await locationService.getCitiesByState(formik.values.zoneRefId, stateId);
                let cities = response?.data || response || [];
                if (!Array.isArray(cities) && cities && typeof cities === 'object') {
                    cities = cities.cities || cities.data || Object.values(cities).find(Array.isArray) || [];
                }
                setLocationData(prev => ({ ...prev, cities: Array.isArray(cities) ? cities : [] }));
            } catch (error) {
                console.error('Failed to fetch cities:', error);
            } finally {
                setLoadingLocation(false);
            }
        }
    };

    const handleCityChange = async (e) => {
        const cityId = e.target.value;
        formik.setFieldValue('city', cityId);
        formik.setFieldValue('pincode', '');

        setLocationData(prev => ({ ...prev, zipcodes: [] }));

        if (cityId) {
            setLoadingLocation(true);
            try {
                const response = await locationService.getZipCodesByCity(formik.values.zoneRefId, formik.values.state, cityId);
                let zipcodes = response?.data || response || [];
                if (!Array.isArray(zipcodes) && zipcodes && typeof zipcodes === 'object') {
                    zipcodes = zipcodes.zipCodes || zipcodes.data || Object.values(zipcodes).find(Array.isArray) || [];
                }
                setLocationData(prev => ({ ...prev, zipcodes: Array.isArray(zipcodes) ? zipcodes : [] }));
            } catch (error) {
                console.error('Failed to fetch zipcodes:', error);
            } finally {
                setLoadingLocation(false);
            }
        }
    };

    const handleFileSelect = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File size must not exceed 5 MB");
                e.target.value = "";
                return;
            }
            const previewUrl = URL.createObjectURL(file);
            setImages(prev => ({
                ...prev,
                [type]: { ...prev[type], file, preview: previewUrl, url: '' }
            }));
            formik.setFieldValue(type === 'aadhar' ? 'aadharCard' : 'panCard', '');
        }
    };

    const handleUpload = async (type) => {
        const imageData = images[type];
        if (!imageData.file) return;

        setImages(prev => ({
            ...prev,
            [type]: { ...prev[type], uploading: true }
        }));

        try {
            const response = await uploadImage(imageData.file);
            const imageUrl = response.data?.url || response.url || response;

            setImages(prev => ({
                ...prev,
                [type]: { ...prev[type], url: imageUrl, uploading: false }
            }));

            formik.setFieldValue(type === 'aadhar' ? 'aadharCard' : 'panCard', imageUrl);
            toast.success(`${type.toUpperCase()} Card uploaded successfully!`);
        } catch (error) {
            console.error('Upload Error:', error);
            setImages(prev => ({
                ...prev,
                [type]: { ...prev[type], uploading: false }
            }));
            toast.error(`Failed to upload ${type.toUpperCase()} Card`);
        }
    };

    const selectedDept = configs.departments.find(d => d._id === formik.values.department);
    const isSalesDept = selectedDept?.name?.toUpperCase() === 'SALES';

    const showDeptFields = true;
    const showRoleField = formik.values.employeeType?.toUpperCase() !== 'ADMIN';
    const showDocumentFields = formik.values.employeeType?.toUpperCase() !== 'SUPERADMIN';

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* ── Header Banner ── */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 mb-6 flex items-center gap-4">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm font-semibold transition-colors"
                >
                    <Icon icon="mdi:arrow-left" className="text-lg" /> Go back
                </button>
                <div className="h-5 w-px bg-gray-200" />
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#2980B9] flex items-center justify-center">
                        <Icon icon="mdi:account-plus" className="text-white text-lg" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-gray-800 uppercase tracking-widest">Register Staff</h1>
                        <p className="text-[11px] text-gray-400 font-medium">Fill in all required details to create a new staff account</p>
                    </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={savingDraft}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#2980B9] text-[#2980B9] text-[12px] font-bold hover:bg-blue-50 transition-all disabled:opacity-50"
                    >
                        <Icon icon={savingDraft ? "mdi:loading" : "mdi:content-save-outline"} className={savingDraft ? "animate-spin text-sm" : "text-sm"} />
                        {savingDraft ? 'Saving...' : draftEmployeeId ? 'Update Draft' : 'Save Draft'}
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 space-y-4">
                <form onSubmit={formik.handleSubmit} className="space-y-4">

                    {/* ── Section: Personal & Account Info ── */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2.5 bg-gray-50">
                            <div className="w-6 h-6 rounded-md bg-[#2980B9]/10 flex items-center justify-center">
                                <Icon icon="mdi:account-outline" className="text-[#2980B9] text-sm" />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-widest text-gray-600">Personal &amp; Account Information</span>
                        </div>
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            <Select
                                label="Staff Category *"
                                name="employeeType"
                                variant="orange"
                                value={formik.values.employeeType}
                                onChange={(e) => {
                                    const newType = e.target.value?.toUpperCase();
                                    formik.handleChange(e);
                                    if (newType === 'ADMIN') formik.setFieldValue('role', '');
                                    applyDefaultPermissions(newType, formik.values.department, newType === 'ADMIN' ? '' : formik.values.role);
                                }}
                                onBlur={formik.handleBlur}
                                placeholder="Select Staff Category"
                                error={formik.touched.employeeType && formik.errors.employeeType ? { message: formik.errors.employeeType } : null}
                                options={configs.EmployeeType.map(type => ({ value: type, label: type }))}
                                disabled={loadingConfigs}
                            />
                            <Input
                                label="Staff Name *"
                                name="employeeName"
                                placeholder="Enter Staff Name"
                                value={formik.values.employeeName}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                error={formik.touched.employeeName && formik.errors.employeeName ? { message: formik.errors.employeeName } : null}
                            />
                            <Input
                                label="Username *"
                                name="username"
                                placeholder="Enter Username"
                                value={formik.values.username}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                error={formik.touched.username && formik.errors.username ? { message: formik.errors.username } : null}
                            />
                            <Input
                                label="Email *"
                                name="email"
                                placeholder="Enter Email"
                                value={formik.values.email}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                error={formik.touched.email && formik.errors.email ? { message: formik.errors.email } : null}
                            />
                            <Input
                                label="Password *"
                                name="password"
                                type="password"
                                placeholder="Enter Password"
                                value={formik.values.password}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                error={formik.touched.password && formik.errors.password ? { message: formik.errors.password } : null}
                            />
                            <Input
                                label="Mobile No. *"
                                name="phone"
                                placeholder="Enter Mobile No."
                                value={formik.values.phone}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                error={formik.touched.phone && formik.errors.phone ? { message: formik.errors.phone } : null}
                            />
                        </div>
                    </div>

                    {/* ── Section: Work Details ── */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2.5 bg-gray-50">
                            <div className="w-6 h-6 rounded-md bg-[#2980B9]/10 flex items-center justify-center">
                                <Icon icon="mdi:briefcase-outline" className="text-[#2980B9] text-sm" />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-widest text-gray-600">Work Details</span>
                        </div>
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            {showDeptFields && (
                                <Select
                                    label="Select Department *"
                                    name="department"
                                    variant="orange"
                                    value={formik.values.department}
                                    onChange={handleDeptChange}
                                    onBlur={formik.handleBlur}
                                    placeholder="Select Department"
                                    error={formik.touched.department && formik.errors.department ? { message: formik.errors.department } : null}
                                    options={(configs.departments || []).map(dept => ({ value: dept._id, label: dept.name }))}
                                />
                            )}
                            {showRoleField && (
                                <Select
                                    label="Role *"
                                    name="role"
                                    variant="orange"
                                    value={formik.values.role}
                                    onClick={() => { if (!formik.values.department) toast.error("Please select department first") }}
                                    onChange={(e) => {
                                        const newRole = e.target.value;
                                        formik.handleChange(e);
                                        applyDefaultPermissions(formik.values.employeeType, formik.values.department, newRole);
                                    }}
                                    onBlur={formik.handleBlur}
                                    placeholder="Select Role"
                                    error={formik.touched.role && formik.errors.role ? { message: formik.errors.role } : null}
                                    options={(subRoles || []).map(role => ({ value: role.code, label: role.name }))}
                                    disabled={!formik.values.department || loadingSubRoles}
                                />
                            )}
                            <div>
                                <DatePicker
                                    label="Access Expiry"
                                    value={formik.values.expiry ? dayjs(formik.values.expiry) : null}
                                    onChange={(newValue) => formik.setFieldValue('expiry', newValue ? newValue.format('YYYY-MM-DD') : '')}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            error: formik.touched.expiry && !!formik.errors.expiry,
                                            helperText: formik.touched.expiry && formik.errors.expiry ? formik.errors.expiry : null,
                                            sx: datePickerStyles,
                                            InputLabelProps: { shrink: true }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── Section: Location ── */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2.5 bg-gray-50">
                            <div className="w-6 h-6 rounded-md bg-[#2980B9]/10 flex items-center justify-center">
                                <Icon icon="mdi:map-marker-outline" className="text-[#2980B9] text-sm" />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-widest text-gray-600">Location</span>
                        </div>
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            <Input
                                label="Address *"
                                name="address"
                                placeholder="Enter Address"
                                value={formik.values.address}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                error={formik.touched.address && formik.errors.address ? { message: formik.errors.address } : null}
                            />
                            <Input
                                label="Country *"
                                name="country"
                                placeholder="Enter Country"
                                value={formik.values.country}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                error={formik.touched.country && formik.errors.country ? { message: formik.errors.country } : null}
                            />
                            {isSalesDept ? (
                                <>
                                    <Select
                                        label="Region *"
                                        name="zoneRefId"
                                        value={formik.values.zoneRefId}
                                        onChange={handleZoneChange}
                                        onBlur={formik.handleBlur}
                                        placeholder="Select Region"
                                        error={formik.touched.zoneRefId && formik.errors.zoneRefId ? { message: formik.errors.zoneRefId } : null}
                                        options={(Array.isArray(locationData.zones) ? locationData.zones : []).map(z => ({ value: z._id, label: z.name || z.zone }))}
                                        disabled={loadingLocation}
                                    />
                                    <Select
                                        label="State *"
                                        name="state"
                                        value={formik.values.state}
                                        onChange={handleStateChange}
                                        onBlur={formik.handleBlur}
                                        placeholder="Select State"
                                        options={(Array.isArray(locationData.states) ? locationData.states : []).map(s => ({ value: s._id, label: s.name }))}
                                        disabled={!formik.values.zoneRefId || loadingLocation}
                                    />
                                    <Select
                                        label="City *"
                                        name="city"
                                        value={formik.values.city}
                                        onChange={handleCityChange}
                                        onBlur={formik.handleBlur}
                                        placeholder="Select City"
                                        options={(Array.isArray(locationData.cities) ? locationData.cities : []).map(c => ({ value: c._id, label: c.name }))}
                                        disabled={!formik.values.state || loadingLocation}
                                    />
                                    <Select
                                        label="Pincode *"
                                        name="pincode"
                                        value={formik.values.pincode}
                                        onChange={(e) => { formik.handleChange(e); }}
                                        onBlur={formik.handleBlur}
                                        placeholder="Select Pincode"
                                        error={formik.touched.pincode && formik.errors.pincode ? { message: formik.errors.pincode } : null}
                                        options={(Array.isArray(locationData.zipcodes) ? locationData.zipcodes : []).map(z => ({ value: z.code, label: `${z.code} - ${z.area}` }))}
                                        disabled={!formik.values.city || loadingLocation}
                                    />
                                </>
                            ) : (
                                <Input
                                    label="Pincode *"
                                    name="pincode"
                                    placeholder="Enter Pincode"
                                    value={formik.values.pincode}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    error={formik.touched.pincode && formik.errors.pincode ? { message: formik.errors.pincode } : null}
                                />
                            )}
                        </div>
                    </div>

                    {/* ── Section: Documents ── */}
                    {showDocumentFields && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2.5 bg-gray-50">
                                <div className="w-6 h-6 rounded-md bg-[#2980B9]/10 flex items-center justify-center">
                                    <Icon icon="mdi:file-document-outline" className="text-[#2980B9] text-sm" />
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-widest text-gray-600">Identity Documents</span>
                            </div>
                            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Aadhar Upload */}
                                <div className="flex flex-col gap-3">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Aadhar Card * <span className="text-[10px] text-gray-400 font-normal lowercase">(max 5 MB)</span></span>
                                    <input type="file" hidden ref={aadharInputRef} onChange={(e) => handleFileSelect(e, 'aadhar')} accept="image/*" />
                                    <div
                                        onClick={() => aadharInputRef.current.click()}
                                        className={`relative h-36 border-2 border-dashed rounded-xl flex items-center justify-center overflow-hidden cursor-pointer transition-all group ${formik.touched.aadharCard && formik.errors.aadharCard ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-[#2980B9] hover:bg-blue-50/30'}`}
                                    >
                                        {images.aadhar.preview ? (
                                            <img src={images.aadhar.preview} alt="Aadhar Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-[#2980B9] transition-colors">
                                                <Icon icon="ph:identification-card-bold" className="text-4xl" />
                                                <span className="text-[11px] font-bold uppercase tracking-wide">Click to upload Aadhar</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {images.aadhar.file && !images.aadhar.url && (
                                            <button
                                                type="button"
                                                onClick={() => handleUpload('aadhar')}
                                                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#2980B9] text-white text-[11px] font-bold hover:bg-[#2471a3] transition-all shadow-sm"
                                            >
                                                <Icon icon={images.aadhar.uploading ? "mdi:loading" : "mdi:cloud-upload"} className={images.aadhar.uploading ? "animate-spin text-sm" : "text-sm"} />
                                                {images.aadhar.uploading ? 'Uploading...' : 'Upload Aadhar'}
                                            </button>
                                        )}
                                        {images.aadhar.url && (
                                            <div className="flex items-center gap-1.5 text-green-600 text-[11px] font-bold">
                                                <Icon icon="mdi:check-circle" className="text-base" /> Uploaded Successfully
                                            </div>
                                        )}
                                    </div>
                                    {formik.touched.aadharCard && formik.errors.aadharCard && (
                                        <p className="text-[10px] text-red-500 font-bold">Aadhar card image is required</p>
                                    )}
                                </div>

                                {/* PAN Upload */}
                                <div className="flex flex-col gap-3">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">PAN Card * <span className="text-[10px] text-gray-400 font-normal lowercase">(max 5 MB)</span></span>
                                    <input type="file" hidden ref={panInputRef} onChange={(e) => handleFileSelect(e, 'pan')} accept="image/*" />
                                    <div
                                        onClick={() => panInputRef.current.click()}
                                        className={`relative h-36 border-2 border-dashed rounded-xl flex items-center justify-center overflow-hidden cursor-pointer transition-all group ${formik.touched.panCard && formik.errors.panCard ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-[#2980B9] hover:bg-blue-50/30'}`}
                                    >
                                        {images.pan.preview ? (
                                            <img src={images.pan.preview} alt="PAN Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-[#2980B9] transition-colors">
                                                <Icon icon="ph:credit-card-bold" className="text-4xl" />
                                                <span className="text-[11px] font-bold uppercase tracking-wide">Click to upload PAN</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {images.pan.file && !images.pan.url && (
                                            <button
                                                type="button"
                                                onClick={() => handleUpload('pan')}
                                                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#2980B9] text-white text-[11px] font-bold hover:bg-[#2471a3] transition-all shadow-sm"
                                            >
                                                <Icon icon={images.pan.uploading ? "mdi:loading" : "mdi:cloud-upload"} className={images.pan.uploading ? "animate-spin text-sm" : "text-sm"} />
                                                {images.pan.uploading ? 'Uploading...' : 'Upload PAN'}
                                            </button>
                                        )}
                                        {images.pan.url && (
                                            <div className="flex items-center gap-1.5 text-green-600 text-[11px] font-bold">
                                                <Icon icon="mdi:check-circle" className="text-base" /> Uploaded Successfully
                                            </div>
                                        )}
                                    </div>
                                    {formik.touched.panCard && formik.errors.panCard && (
                                        <p className="text-[10px] text-red-500 font-bold">PAN card image is required</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Section: Page Access ── */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-md bg-[#2980B9]/10 flex items-center justify-center">
                                    <Icon icon="mdi:monitor-dashboard" className="text-[#2980B9] text-sm" />
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-widest text-gray-600">Page Access</span>
                                {pageAccess.length > 0 && (
                                    <span className="ml-1 px-2 py-0.5 rounded-full bg-[#2980B9] text-white text-[10px] font-black">{pageAccess.length}</span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => toggleAll(PAGE_ACCESS_OPTIONS, pageAccess, setPageAccess)}
                                className="text-[10px] font-black uppercase tracking-widest text-[#2980B9] hover:text-[#2471a3] border border-[#2980B9]/30 hover:border-[#2980B9]/60 px-3 py-1 rounded-lg transition-all hover:bg-blue-50"
                            >
                                {pageAccess.length === PAGE_ACCESS_OPTIONS.length ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2.5">
                            {PAGE_ACCESS_OPTIONS.map(option => (
                                <label key={option.value} className="flex items-center gap-2 cursor-pointer group py-1">
                                    <div className="relative flex-shrink-0">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={pageAccess.includes(option.value)}
                                            onChange={() => toggleItem(pageAccess, setPageAccess, option.value)}
                                        />
                                        <div className="w-4 h-4 rounded border-2 border-gray-300 peer-checked:bg-[#2980B9] peer-checked:border-[#2980B9] transition-all group-hover:border-[#2980B9]/50 flex items-center justify-center">
                                            {pageAccess.includes(option.value) && <Icon icon="mdi:check" className="text-white text-[10px]" />}
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-semibold text-gray-600 group-hover:text-gray-800 transition-colors leading-tight">{option.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* ── Section: Access Permissions ── */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-md bg-[#2980B9]/10 flex items-center justify-center">
                                    <Icon icon="mdi:shield-lock-outline" className="text-[#2980B9] text-sm" />
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-widest text-gray-600">Access Permissions</span>
                                {accessPermissions.length > 0 && (
                                    <span className="ml-1 px-2 py-0.5 rounded-full bg-[#2980B9] text-white text-[10px] font-black">{accessPermissions.length}</span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => toggleAll(ACCESS_PERMISSION_OPTIONS, accessPermissions, setAccessPermissions)}
                                className="text-[10px] font-black uppercase tracking-widest text-[#2980B9] hover:text-[#2471a3] border border-[#2980B9]/30 hover:border-[#2980B9]/60 px-3 py-1 rounded-lg transition-all hover:bg-blue-50"
                            >
                                {accessPermissions.length === ACCESS_PERMISSION_OPTIONS.length ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2.5">
                            {ACCESS_PERMISSION_OPTIONS.map(option => (
                                <label key={option.value} className="flex items-center gap-2 cursor-pointer group py-1">
                                    <div className="relative flex-shrink-0">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={accessPermissions.includes(option.value)}
                                            onChange={() => toggleItem(accessPermissions, setAccessPermissions, option.value)}
                                        />
                                        <div className="w-4 h-4 rounded border-2 border-gray-300 peer-checked:bg-[#2980B9] peer-checked:border-[#2980B9] transition-all group-hover:border-[#2980B9]/50 flex items-center justify-center">
                                            {accessPermissions.includes(option.value) && <Icon icon="mdi:check" className="text-white text-[10px]" />}
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-semibold text-gray-600 group-hover:text-gray-800 transition-colors leading-tight">{option.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* ── Footer Actions ── */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={handleSaveDraft}
                            disabled={savingDraft}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-[#2980B9] text-[#2980B9] text-sm font-bold hover:bg-blue-50 transition-all disabled:opacity-50"
                        >
                            <Icon icon={savingDraft ? "mdi:loading" : "mdi:content-save-outline"} className={savingDraft ? "animate-spin" : ""} />
                            {savingDraft ? 'Saving...' : draftEmployeeId ? 'Update Draft' : 'Save as Draft'}
                        </button>
                        <button
                            type="submit"
                            disabled={formik.isSubmitting}
                            className="flex items-center gap-2 px-8 py-2.5 rounded-lg bg-[#2980B9] hover:bg-[#2471a3] text-white text-sm font-bold transition-all shadow-sm disabled:opacity-60 active:scale-95"
                        >
                            <Icon icon={formik.isSubmitting ? "mdi:loading" : "mdi:account-plus"} className={formik.isSubmitting ? "animate-spin" : ""} />
                            {formik.isSubmitting ? 'Submitting...' : 'Register Staff'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};


export default Registration;
