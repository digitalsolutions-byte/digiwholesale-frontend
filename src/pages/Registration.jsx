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
        <div className="flex justify-center p-2 min-h-screen">
            <div className="bg-white rounded-[3rem] shadow-2xl p-8 md:p-12 w-full max-w-5xl border border-gray-100">
                <form onSubmit={formik.handleSubmit} className="space-y-8">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                        <Select
                            label="Staff Category *"
                            name="employeeType"
                            variant="orange"
                            value={formik.values.employeeType}
                            onChange={(e) => {
                                const newType = e.target.value?.toUpperCase();
                                formik.handleChange(e);
                                if (newType === 'ADMIN') {
                                    formik.setFieldValue('role', '');
                                }
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
                            onChange={(e) => {
                                // Double check: prevent spaces during typing as well if possible, or just rely on validation
                                formik.handleChange(e);
                            }}
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
                        <Input
                            label="Address *"
                            name="address"
                            placeholder="Enter Address"
                            value={formik.values.address}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            error={formik.touched.address && formik.errors.address ? { message: formik.errors.address } : null}
                        />

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
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                placeholder="Select Role"
                                error={formik.touched.role && formik.errors.role ? { message: formik.errors.role } : null}
                                options={(subRoles || []).map(role => ({ value: role.code, label: role.name }))}
                                disabled={!formik.values.department || loadingSubRoles}
                            />
                        )}

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
                                {console.log(locationData, 'locationData')}
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
                                    onChange={(e) => {
                                        formik.handleChange(e);
                                    }}
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


                        {showDocumentFields && (
                            <div className="flex flex-col gap-4 col-span-1 md:col-span-2 mt-4">
                                <label className="text-erp-accent font-bold uppercase text-lg text-center">Upload Aadhar Card & PAN Card</label>
                                <div className="flex gap-12 justify-center mt-2">
                                    {/* Aadhar Upload */}
                                    <div className="flex flex-col items-center gap-2">
                                        <input type="file" hidden ref={aadharInputRef} onChange={(e) => handleFileSelect(e, 'aadhar')} accept="image/*" />
                                        <div
                                            onClick={() => aadharInputRef.current.click()}
                                            className={`w-40 h-28 border-2 border-dashed rounded-2xl flex items-center justify-center overflow-hidden cursor-pointer transition-all shadow-sm ${formik.touched.aadharCard && formik.errors.aadharCard ? 'border-red-500 bg-red-50' : 'border-erp-accent/30 hover:bg-erp-accent/5'}`}
                                        >
                                            {images.aadhar.preview ? (
                                                <img src={images.aadhar.preview} alt="Aadhar Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-center text-xs text-erp-accent/80">
                                                    <Icon icon="ph:identification-card-bold" className="text-4xl mb-1 mx-auto" />
                                                    <span className="font-bold">Aadhar Card Image</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            {images.aadhar.file && !images.aadhar.url && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpload('aadhar')}
                                                    className="text-[10px] bg-erp-accent text-white px-4 py-1.5 rounded-full uppercase font-black hover:bg-erp-accent/90 transition-colors shadow-md"
                                                >
                                                    {images.aadhar.uploading ? '...' : 'Upload'}
                                                </button>
                                            )}
                                            {images.aadhar.url && <Icon icon="mdi:check-circle" className="text-green-500 text-2xl animate-bounce-short" />}
                                        </div>
                                        {formik.touched.aadharCard && formik.errors.aadharCard && (
                                            <p className="text-[10px] text-red-500 font-bold">Image required</p>
                                        )}
                                    </div>

                                    {/* PAN Upload */}
                                    <div className="flex flex-col items-center gap-2">
                                        <input type="file" hidden ref={panInputRef} onChange={(e) => handleFileSelect(e, 'pan')} accept="image/*" />
                                        <div
                                            onClick={() => panInputRef.current.click()}
                                            className={`w-40 h-28 border-2 border-dashed rounded-2xl flex items-center justify-center overflow-hidden cursor-pointer transition-all shadow-sm ${formik.touched.panCard && formik.errors.panCard ? 'border-red-500 bg-red-50' : 'border-erp-accent/30 hover:bg-erp-accent/5'}`}
                                        >
                                            {images.pan.preview ? (
                                                <img src={images.pan.preview} alt="PAN Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-center text-xs text-erp-accent/80">
                                                    <Icon icon="ph:credit-card-bold" className="text-4xl mb-1 mx-auto" />
                                                    <span className="font-bold">PAN Card Image</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            {images.pan.file && !images.pan.url && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpload('pan')}
                                                    className="text-[10px] bg-erp-accent text-white px-4 py-1.5 rounded-full uppercase font-black hover:bg-erp-accent/90 transition-colors shadow-md"
                                                >
                                                    {images.pan.uploading ? '...' : 'Upload'}
                                                </button>
                                            )}
                                            {images.pan.url && <Icon icon="mdi:check-circle" className="text-green-500 text-2xl animate-bounce-short" />}
                                        </div>
                                        {formik.touched.panCard && formik.errors.panCard && (
                                            <p className="text-[10px] text-red-500 font-bold">Image required</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Page Access */}
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase tracking-widest text-erp-accent">Page Access</h3>
                            <button
                                type="button"
                                onClick={() => toggleAll(PAGE_ACCESS_OPTIONS, pageAccess, setPageAccess)}
                                className="text-[10px] font-black uppercase tracking-widest text-erp-accent/70 hover:text-erp-accent border border-erp-accent/20 hover:border-erp-accent/50 px-3 py-1.5 rounded-full transition-all hover:bg-erp-accent/5"
                            >
                                {pageAccess.length === PAGE_ACCESS_OPTIONS.length ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-3">
                            {PAGE_ACCESS_OPTIONS.map(option => (
                                <label
                                    key={option.value}
                                    className="flex items-center gap-2.5 cursor-pointer group"
                                >
                                    <div className="relative flex-shrink-0">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={pageAccess.includes(option.value)}
                                            onChange={() => toggleItem(pageAccess, setPageAccess, option.value)}
                                        />
                                        <div className="w-4 h-4 rounded border-2 border-gray-300 peer-checked:bg-erp-accent peer-checked:border-erp-accent transition-all group-hover:border-erp-accent/50 flex items-center justify-center">
                                            {pageAccess.includes(option.value) && (
                                                <Icon icon="mdi:check" className="text-white text-[10px]" />
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-bold text-gray-600 group-hover:text-gray-800 transition-colors leading-tight">
                                        {option.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                        {pageAccess.length > 0 && (
                            <p className="text-[10px] font-black text-erp-accent/60 uppercase tracking-widest">
                                {pageAccess.length} page{pageAccess.length !== 1 ? 's' : ''} selected
                            </p>
                        )}
                    </div>

                    {/* Access Permissions */}
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase tracking-widest text-erp-accent">Access Permissions</h3>
                            <button
                                type="button"
                                onClick={() => toggleAll(ACCESS_PERMISSION_OPTIONS, accessPermissions, setAccessPermissions)}
                                className="text-[10px] font-black uppercase tracking-widest text-erp-accent/70 hover:text-erp-accent border border-erp-accent/20 hover:border-erp-accent/50 px-3 py-1.5 rounded-full transition-all hover:bg-erp-accent/5"
                            >
                                {accessPermissions.length === ACCESS_PERMISSION_OPTIONS.length ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-3">
                            {ACCESS_PERMISSION_OPTIONS.map(option => (
                                <label
                                    key={option.value}
                                    className="flex items-center gap-2.5 cursor-pointer group"
                                >
                                    <div className="relative flex-shrink-0">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={accessPermissions.includes(option.value)}
                                            onChange={() => toggleItem(accessPermissions, setAccessPermissions, option.value)}
                                        />
                                        <div className="w-4 h-4 rounded border-2 border-gray-300 peer-checked:bg-erp-accent peer-checked:border-erp-accent transition-all group-hover:border-erp-accent/50 flex items-center justify-center">
                                            {accessPermissions.includes(option.value) && (
                                                <Icon icon="mdi:check" className="text-white text-[10px]" />
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-bold text-gray-600 group-hover:text-gray-800 transition-colors leading-tight">
                                        {option.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                        {accessPermissions.length > 0 && (
                            <p className="text-[10px] font-black text-erp-accent/60 uppercase tracking-widest">
                                {accessPermissions.length} permission{accessPermissions.length !== 1 ? 's' : ''} selected
                            </p>
                        )}
                    </div>

                    <div className="flex justify-center gap-6 pt-10">
                        <Button
                            type="submit"
                            className="max-w-[200px]"
                            disabled={formik.isSubmitting}
                        >
                            {formik.isSubmitting ? 'Submitting...' : 'Submit'}
                        </Button>
                        <button
                            type="button"
                            onClick={handleSaveDraft}
                            disabled={savingDraft}
                            className="px-16 py-4 rounded-full border-2 border-erp-accent text-erp-accent font-bold hover:bg-erp-accent/5 transition-all uppercase tracking-widest min-w-[240px] disabled:opacity-50"
                        >
                            {savingDraft ? 'Saving...' : draftEmployeeId ? 'Update Draft' : 'Save as Draft'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Registration;


