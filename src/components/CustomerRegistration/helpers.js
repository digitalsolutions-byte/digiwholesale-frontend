import { INITIAL_FORM_VALUES } from './constants';

export const mapCustomerToFormValues = (customer, configs = {}) => {
    if (!customer) return INITIAL_FORM_VALUES;

    const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    // Helper to find ID by label in a config list
    const findId = (list, val, labelKey = 'name') => {
        if (!val) return '';
        if (!list || !Array.isArray(list)) return val;

        const searchVal = String(val).toLowerCase();
        const normVal = norm(val);
        const item = list.find(i =>
            String(i._id).toLowerCase() === searchVal ||
            String(i[labelKey] || i).toLowerCase() === searchVal ||
            norm(i[labelKey] || i) === normVal
        );
        return item?._id || val;
    };

    // Helper to get Label from object or string
    const getLabel = (obj, list, labelKey = 'name') => {
        if (!obj) return '';
        if (typeof obj === 'string') {
            // If it's already an ID, try to get the label from list
            const item = (list || []).find(i => i._id === obj);
            return item ? (item[labelKey] || item) : obj;
        }
        return obj.name || obj.employeeName || obj.zone || obj.days || obj.time || '';
    };

    const getRefId = (obj, list, labelKey = 'name') => {
        if (!obj) return '';
        const baseId = (typeof obj === 'object') ? (obj._id || obj.refId || '') : obj;
        return findId(list, baseId, labelKey);
    };

    // Robust GST resolution:
    // Handles isGstRegistered (draft API), isGSTRegistered (customer), IsGSTRegistered, or gstType
    const isGstVal = customer.isGstRegistered !== undefined
        ? customer.isGstRegistered
        : (customer.isGSTRegistered !== undefined
            ? customer.isGSTRegistered
            : customer.IsGSTRegistered);

    let isGstBool = false;
    if (isGstVal !== undefined && isGstVal !== null) {
        isGstBool = isGstVal === true || String(isGstVal).toLowerCase() === 'true';
    } else if (customer.gstType) {
        const typeName = (typeof customer.gstType === 'object' ? (customer.gstType.name || '') : String(customer.gstType)).toLowerCase();
        isGstBool = typeName.includes('registered') && !typeName.includes('un');
    }

    const gstTypeList = configs.gstTypes || [];
    let matchedGstItem = null;

    if (customer.gstType) {
        const rawId = typeof customer.gstType === 'object' ? (customer.gstType._id || customer.gstType.refId) : customer.gstType;
        if (rawId) {
            matchedGstItem = gstTypeList.find(g => String(g._id).toLowerCase() === String(rawId).toLowerCase());
        }
        if (!matchedGstItem) {
            const rawName = typeof customer.gstType === 'object' ? customer.gstType.name : customer.gstType;
            matchedGstItem = gstTypeList.find(g => norm(g.name) === norm(rawName));
        }
    }

    if (!matchedGstItem && gstTypeList.length > 0) {
        if (isGstBool) {
            matchedGstItem = gstTypeList.find(g => norm(g.name) === 'registered');
        } else {
            matchedGstItem = gstTypeList.find(g => norm(g.name).includes('unregistered') || norm(g.name).includes('un'));
        }
    }

    const resolvedGstType = matchedGstItem ? matchedGstItem.name : (isGstBool ? 'Registered' : 'Unregistered');
    const resolvedGstTypeRefId = matchedGstItem ? matchedGstItem._id : '';

    return {
        ...INITIAL_FORM_VALUES,
        ...customer,

        gstType: resolvedGstType,
        gstTypeRefId: resolvedGstTypeRefId,
        isGSTRegistered: isGstBool,
        isGstRegistered: isGstBool,
        IsGSTRegistered: isGstBool,
        zoneRefId: getRefId(customer.zone || customer.zoneRefId, configs.zones, 'zone'),
        salesPersonRefId: getRefId(customer.salesPerson || customer.salesPersonRefId, configs.salesPersons, 'employeeName'),
        specificLabRefId: getRefId(customer.specificLab, configs.specificLabs),
        plantRefId: getRefId(customer.plant, configs.plants),
        fittingCenterRefId: getRefId(customer.fittingCenter, configs.fittingCenters),
        creditDaysRefId: getRefId(customer.creditDays || customer.creditDaysRefId, configs.creditDays, 'days'),
        businessTypeRefId: getRefId(customer.businessType || customer.businessTypeRefId, configs.businessTypes || []),
        courierNameRefId: getRefId(customer.courierName, configs.courierNames),
        courierTimeRefId: getRefId(customer.courierTime, configs.courierTimes, 'time'),
        
        billToAddress: customer.billToAddress ? {
            ...customer.billToAddress,
            contactPerson: customer.billToAddress.customerContactName || customer.billToAddress.contactPerson || '',
            contactNumber: customer.billToAddress.customerContactNumber || customer.billToAddress.contactNumber || ''
        } : INITIAL_FORM_VALUES.billToAddress,
        customerShipToDetails: customer.customerShipToDetails?.length ? customer.customerShipToDetails.map(addr => ({
            ...addr,
            contactPerson: addr.customerContactName || addr.contactPerson || '',
            contactNumber: addr.customerContactNumber || addr.contactNumber || ''
        })) : INITIAL_FORM_VALUES.customerShipToDetails,
        chequeDetails: customer.chequeDetails?.length === 3 ? customer.chequeDetails : INITIAL_FORM_VALUES.chequeDetails,
        chequeRemark: customer.chequeRemark || '',
        
        gstNumber: customer.gstNumber || customer.GSTNumber || '',
        gstCertificateImg: customer.gstCertificateImg || customer.GSTCertificateImg || '',
        aadharCard: customer.aadharCard || customer.AadharCard || '',
        aadharCardImg: customer.aadharCardImg || customer.AadharCardImg || '',
        panCard: customer.panCard || customer.PANCard || '',
        panCardImg: customer.panCardImg || customer.PANCardImg || '',
        
        yearOfEstablishment: customer.yearOfEstablishment || '',
        proposedDiscount: customer.proposedDiscount || '',
        finalDiscount: customer.finalDiscount || customer.discountPercent || '',
        minSalesValue: customer.minSalesValue || '',
        creditLimit: customer.creditLimit || '',
        brands: Array.isArray(customer.brands) ? customer.brands.map(b => ({
            brandId: b.brandId || b._id || b.id || '',
            brandName: b.brandName || b.name || ''
        })) : [],
    };
};
