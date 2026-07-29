import React from 'react';
import { Icon } from '@iconify/react';
import { SummaryCard, DetailItem, DocPreview } from './shared';

export const Overview = ({ formik, configs = {}, isSalesUser }) => {
    const { values } = formik;

    // Optional chaining to prevent TypeError if configs array is undefined
    const getZone = () => configs.zones?.find(z => z._id === values.zoneRefId)?.zone;
    const getSalesPerson = () => configs.salesPersons?.find(s => s._id === values.salesPersonRefId)?.employeeName;
    const getPlant = () => configs.plants?.find(p => p._id === values.plantRefId)?.name;
    const getFittingCenter = () => configs.fittingCenters?.find(f => f._id === values.fittingCenterRefId)?.name;
    const getCreditDays = () => configs.creditDays?.find(d => d._id === values.creditDaysRefId)?.days;
    const getCourierName = () => configs.courierNames?.find(c => c._id === values.courierNameRefId)?.name;
    const getCourierTime = () => configs.courierTimes?.find(t => t._id === values.courierTimeRefId)?.time;

    return (
        <div className="space-y-6 md:space-y-8 max-h-[500px] md:max-h-[600px] overflow-y-auto pr-2 md:pr-4 custom-scrollbar">
            <h2 className="text-xl md:text-2xl font-black text-erp-accent mb-4 md:mb-8 flex items-center gap-3">
                <Icon icon="mdi:file-find-outline" /> Review Application
            </h2>

            <SummaryCard title="Basic Info" icon="mdi:account-circle">
                <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-4">
                    <DetailItem label="Firm Name" value={values.firmName} />
                    <DetailItem label="Shop Name" value={values.shopName} />
                    <DetailItem label="Owner's Name" value={values.ownerName} />
                    <DetailItem label="Mobile 1" value={values.mobileNo1} />
                    <DetailItem label="Mobile 2" value={values.mobileNo2} />
                    <DetailItem label="Business Email" value={values.businessEmail} />
                    <DetailItem label="GST Type" value={values.gstType} />
                    {(values.gstType?.toLowerCase() !== 'un-registered' && values.gstType?.toLowerCase() !== 'unregistered') && <DetailItem label="GST Number" value={values.gstNumber} />}
                </div>

                <div className="col-span-full border-t border-gray-50 pt-4 md:pt-6 mt-2">
                    <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-4">Identity Documents</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
                        {(values.gstType?.toLowerCase() !== 'un-registered' && values.gstType?.toLowerCase() !== 'unregistered') ? (
                            <DocPreview label="GST Document" src={values.gstCertificateImg} />
                        ) : (
                            <>
                                <div className="space-y-4">
                                    <DetailItem label="Aadhar No." value={values.aadharCard} />
                                    <DocPreview label="Aadhar Card" src={values.aadharCardImg} />
                                </div>
                                <div className="space-y-4">
                                    <DetailItem label="PAN No." value={values.panCard} />
                                    <DocPreview label="PAN Card" src={values.panCardImg} />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </SummaryCard>

            <SummaryCard title="Bill To Address" icon="mdi:map-marker">
                <DetailItem label="Branch Name" value={values.billToAddress?.branchName} />
                <DetailItem label="Contact Person" value={values.billToAddress?.contactPerson} />
                <DetailItem label="Contact No." value={values.billToAddress?.contactNumber} />
                <DetailItem label="Address" value={values.billToAddress?.address} />
                <DetailItem label="City" value={values.billToAddress?.city} />
                <DetailItem label="State" value={values.billToAddress?.state} />
                <DetailItem label="Currency" value={values.billToAddress?.billingCurrency} />
                <DetailItem label="Pincode" value={values.billToAddress?.zipCode} />
            </SummaryCard>

            <div className="space-y-6">
                {(values.customerShipToDetails || []).map((addr, idx) => (
                    <SummaryCard key={idx} title={`Ship To Address ${idx + 1}`} icon="mdi:map-marker-outline">
                        <DetailItem label="Branch Name" value={addr.branchName} />
                        <DetailItem label="Contact Person" value={addr.contactPerson} />
                        <DetailItem label="Contact No." value={addr.contactNumber} />
                        <DetailItem label="Address" value={addr.address} />
                        <DetailItem label="City" value={addr.city} />
                        <DetailItem label="State" value={addr.state} />
                        <DetailItem label="Currency" value={addr.billingCurrency} />
                        <DetailItem label="Pincode" value={addr.zipCode} />
                    </SummaryCard>
                ))}
            </div>

            <SummaryCard title="Business Details" icon="mdi:cog">
                <DetailItem label="Credit Limit" value={values.creditLimit} />
                <DetailItem label="Credit Days" value={getCreditDays()} />
                <DetailItem label="Billing Cycle" value={values.billingCycle} />
                <DetailItem label="Billing Mode" value={values.billingMode} />
                <DetailItem label="Proposed Discount" value={`${values.proposedDiscount || 0}%`} />
                <DetailItem label="Final Discount" value={`${values.finalDiscount || 0}%`} />
                <DetailItem label="Min Sales" value={values.minSalesValue} />
                <DetailItem label="Business Type" value={configs.businessTypes?.find(b => b._id === values.businessTypeRefId)?.name} />
                <DetailItem label="Zone" value={getZone()} />
                <DetailItem label="Sales Person" value={getSalesPerson()} />
                <div className="col-span-full border-t border-gray-50 pt-3 mt-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-2">Assigned Brands</span>
                    <div className="flex flex-wrap gap-2">
                        {Array.isArray(values.brands) && values.brands.length > 0 ? (
                            values.brands.map((b, i) => (
                                <span key={i} className="px-2.5 py-1 bg-blue-50 text-[#2980B9] border border-blue-100 rounded text-xs font-bold uppercase">
                                    {b.brandName || b.name}
                                </span>
                            ))
                        ) : (
                            <span className="text-xs text-gray-400 font-medium italic">None selected</span>
                        )}
                    </div>
                </div>
            </SummaryCard>

            <SummaryCard title="Cheque Details" icon="mdi:checkbook">
                <DetailItem label="Remark" value={values.chequeRemark || 'N/A'} />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    {(values.chequeDetails || []).map((c, i) => (
                        <div key={i} className="space-y-2">
                            <DetailItem label={`Cheque ${i + 1} No`} value={c.chequeNumber} />
                            {c.chequeImage && <DocPreview label={`Cheque ${i + 1} Img`} src={c.chequeImage} />}
                        </div>
                    ))}
                </div>
            </SummaryCard>

        </div>
    );
};


