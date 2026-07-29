import { INITIAL_FORM_VALUES } from './constants';

export const mapCustomerToFormValues = (customer, configs = {}) => {
    if (!customer) return INITIAL_FORM_VALUES;

    // Helper to find ID by label in a config list
    const findId = (list, val, labelKey = 'name') => {
        if (!val) return '';
        if (!list || !Array.isArray(list)) return val;

        const searchVal = String(val).toLowerCase();
        const item = list.find(i =>
            String(i._id).toLowerCase() === searchVal ||
            String(i[labelKey] || i).toLowerCase() === searchVal
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

    return {
        ...INITIAL_FORM_VALUES,
        ...customer,

        gstType: getLabel(customer.gstType, configs.gstTypes) || (customer.IsGSTRegistered || customer.isGSTRegistered ? 'Registered' : 'Un-Registered'),
        gstTypeRefId: getRefId(customer.gstType || (customer.IsGSTRegistered || customer.isGSTRegistered ? 'Registered' : 'Un-Registered'), configs.gstTypes),
        isGSTRegistered: customer.IsGSTRegistered ?? customer.isGSTRegistered ?? false,
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
