export const INITIAL_FORM_VALUES = {
    // 1. Firm/Company Details
    firmName: '', // Company/ Firm Name as per GST*
    shopName: '', // Shop Name
    yearOfEstablishment: '',
    gstType: 'Un-Registered',
    gstTypeRefId: '',
    isGSTRegistered: false,
    gstNumber: '',
    gstCertificateImg: '',
    aadharCard: '',
    aadharCardImg: '',
    panCard: '',
    panCardImg: '',

    // 2. Address
    billToAddress: {
        branchName: '', contactPerson: '', contactNumber: '', address: '', 
        city: '', state: '', country: 'India', zipCode: '', 
        billingCurrency: 'INR', billingMode: 'Credit'
    },
    customerShipToDetails: [
        {
            branchName: '', contactPerson: '', contactNumber: '', address: '', 
            city: '', state: '', country: 'India', zipCode: '', 
            billingCurrency: 'INR', billingMode: 'Credit'
        }
    ],

    // 3. Business Information
    businessType: '', // Business Category
    businessTypeRefId: '',
    proposedDiscount: '',
    finalDiscount: '',
    discountPercent: '',
    minSalesValue: '',
    currentlyDealtBrands: '',
    brands: [],
    creditLimit: '',
    creditDays: '',
    creditDaysRefId: '',
    billingCycle: '7_days', // 7_days, 15_days, end_of_month
    billingMode: 'Direct', // Direct, DC
    chequeDetails: [
        { chequeImage: '', chequeNumber: '' },
        { chequeImage: '', chequeNumber: '' },
        { chequeImage: '', chequeNumber: '' }
    ],
    chequeRemark: '', // If not submitted

    // 4. Contact Information
    ownerName: '', // Name Of Proprietor/Partner*
    mobileNo1: '',
    mobileNo2: '',
    businessEmail: '', // Official Email
    zone: '',
    zoneRefId: '',
    salesPerson: '',
    salesPersonRefId: '',

    // System / Other necessary defaults based on old logic if retained
    emailId: '',

    specificLabRefId: '',
    plantRefId: '',
    fittingCenterRefId: '',
    courierNameRefId: '',
    courierTimeRefId: '',

    orderMode: ''
};
