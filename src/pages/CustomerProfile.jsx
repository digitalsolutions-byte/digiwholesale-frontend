import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import { getCustomerById } from '../services/customerService';
import { PATHS } from '../routes/paths';

const InfoCard = ({ icon, title, children, color = "bg-[#2980B9]" }) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2.5 bg-gray-50/80">
            <div className={`w-6 h-6 rounded-md ${color} flex items-center justify-center text-white`}>
                <Icon icon={icon} className="text-sm" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-700">{title}</h3>
        </div>
        <div className="p-5">{children}</div>
    </div>
);

const DetailField = ({ label, value, highlight, badge }) => (
    <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
        <div className="flex items-center gap-2">
            {badge ? (
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${badge}`}>
                    {value || 'N/A'}
                </span>
            ) : (
                <span className={`text-xs font-semibold ${highlight ? 'text-[#2980B9] font-bold' : 'text-gray-800'}`}>
                    {value !== undefined && value !== null && value !== '' ? value : '---'}
                </span>
            )}
        </div>
    </div>
);

const DocCard = ({ label, url }) => (
    <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
        {url ? (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative h-40 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center hover:border-[#2980B9] transition-all shadow-sm"
            >
                <img src={url} alt={label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                    <Icon icon="mdi:eye" className="text-2xl" />
                    <span className="text-xs font-bold uppercase tracking-wide">View Image</span>
                </div>
            </a>
        ) : (
            <div className="h-40 rounded-xl border border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-gray-400 gap-1">
                <Icon icon="mdi:image-off-outline" className="text-3xl" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Not Uploaded</span>
            </div>
        )}
    </div>
);

export default function CustomerProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            try {
                const res = await getCustomerById(id);
                if (res.success) {
                    setCustomer(res.data);
                } else {
                    toast.error("Failed to load customer profile");
                }
            } catch (err) {
                console.error(err);
                toast.error("Error loading customer profile");
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchProfile();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Icon icon="mdi:loading" className="text-4xl text-[#2980B9] animate-spin" />
                    <span className="text-xs font-black uppercase tracking-widest text-gray-400">Loading Profile...</span>
                </div>
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
                <div className="bg-white p-8 rounded-xl border border-gray-200 text-center max-w-md">
                    <Icon icon="mdi:account-off" className="text-5xl text-gray-300 mx-auto mb-3" />
                    <h2 className="text-base font-bold text-gray-700 uppercase tracking-wide mb-1">Customer Not Found</h2>
                    <p className="text-xs text-gray-400 mb-4">The customer profile you are looking for does not exist or has been removed.</p>
                    <button
                        onClick={() => navigate(PATHS.CUSTOMER.LIST)}
                        className="px-4 py-2 bg-[#2980B9] text-white text-xs font-bold uppercase rounded-lg hover:bg-[#2471a3] transition-all"
                    >
                        Back to Customer List
                    </button>
                </div>
            </div>
        );
    }

    const billTo = customer.billToAddress || {};
    const shipTo = customer.customerShipToDetails || [];
    const approval = customer.approvalWorkflow || {};
    const isApproved = approval.salesHeadApprovalStatus === 'APPROVED' && approval.financeApprovalStatus === 'APPROVED';

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Top Header Banner */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 mb-6 flex items-center gap-4 sticky top-0 z-30 shadow-sm">
                <button
                    type="button"
                    onClick={() => navigate(PATHS.CUSTOMER.LIST)}
                    className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm font-semibold transition-colors"
                >
                    <Icon icon="mdi:arrow-left" className="text-lg" /> Back to Customers
                </button>
                <div className="h-5 w-px bg-gray-200" />
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#2980B9] flex items-center justify-center text-white font-black text-sm uppercase">
                        {customer.shopName?.charAt(0) || 'C'}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base font-bold text-gray-800 tracking-tight">{customer.shopName}</h1>
                            <span className="px-2 py-0.5 bg-blue-50 text-[#2980B9] border border-blue-100 rounded text-[10px] font-black uppercase">
                                {customer.customerCode || 'NO-CODE'}
                            </span>
                        </div>
                        <p className="text-[11px] text-gray-400 font-medium">Owner: {customer.ownerName || customer.proprietorName || 'N/A'}</p>
                    </div>
                </div>

                <div className="ml-auto flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${customer.status?.isActive !== false ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                        {customer.status?.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                    <button
                        onClick={() => navigate(`${PATHS.CUSTOMER.SHIP_TO}?customerId=${customer._id}`)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#2980B9] text-[#2980B9] text-xs font-bold hover:bg-blue-50 transition-all"
                    >
                        <Icon icon="mdi:truck-delivery-outline" className="text-base" /> Manage Ship To
                    </button>
                </div>
            </div>

            {/* Profile Content Container */}
            <div className="max-w-6xl mx-auto px-4 space-y-6">

                {/* Key Metrics Header Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#2980B9] flex items-center justify-center">
                            <Icon icon="mdi:credit-card-outline" className="text-xl" />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Credit Limit</span>
                            <p className="text-sm font-black text-gray-800">₹{customer.creditLimit || 0}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Icon icon="mdi:cash-refund" className="text-xl" />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Credit Used</span>
                            <p className="text-sm font-black text-gray-800">₹{customer.creditUsed || 0}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Icon icon="mdi:wallet-outline" className="text-xl" />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Balance</span>
                            <p className="text-sm font-black text-gray-800">₹{customer.customerBalance || 0}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                            <Icon icon="mdi:percent-outline" className="text-xl" />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Proposed / Final Disc.</span>
                            <p className="text-sm font-black text-gray-800">{customer.proposedDiscount || 0}% / {customer.finalDiscount || 0}%</p>
                        </div>
                    </div>
                </div>

                {/* Grid 2 Column */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Basic & Account Information */}
                    <InfoCard icon="mdi:domain" title="Business & Basic Information" color="bg-[#2980B9]">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                            <DetailField label="Shop Name" value={customer.shopName} highlight />
                            <DetailField label="Proprietor / Owner Name" value={customer.ownerName || customer.proprietorName} />
                            <DetailField label="Firm Name" value={customer.firmName || '---'} />
                            <DetailField label="Business Category" value={customer.businessType?.name || customer.businessType} />
                            <DetailField label="Order Mode" value={customer.orderMode} />
                            <DetailField label="Designation" value={customer.designation} />
                            <DetailField label="Establishment Year" value={customer.yearOfEstablishment} />
                            <DetailField label="Currently Dealt Brands" value={customer.currentlyDealtBrands} />
                            <DetailField label="Serial Number" value={`#${customer.serialNumber || '---'}`} />
                            <DetailField label="Created By" value={customer.createdByName} />
                        </div>
                    </InfoCard>

                    {/* Contact & Sales Info */}
                    <InfoCard icon="mdi:card-account-phone-outline" title="Contact & Sales Management" color="bg-[#2980B9]">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                            <DetailField label="Primary Mobile" value={customer.mobileNo1} highlight />
                            <DetailField label="Secondary Mobile" value={customer.mobileNo2} />
                            <DetailField label="Business Email" value={customer.businessEmail} />
                            <DetailField label="Zone / Region" value={customer.zone?.name || customer.zone} />
                            <DetailField label="Sales Representative" value={customer.salesPerson?.name || customer.salesPerson} />
                            <DetailField label="Credit Days" value={customer.creditDays?.name || customer.creditDays ? `${customer.creditDays?.name || customer.creditDays} Days` : '---'} />
                            <DetailField label="Billing Mode" value={customer.billingMode} />
                            <DetailField label="Billing Cycle" value={customer.billingCycle} />
                            <div className="col-span-2 pt-2 border-t border-gray-100">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">Assigned Brands</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {Array.isArray(customer.brands) && customer.brands.length > 0 ? (
                                        customer.brands.map((b, i) => (
                                            <span key={i} className="px-2.5 py-1 bg-blue-50 text-[#2980B9] border border-blue-100 rounded-md text-[11px] font-black uppercase tracking-wider">
                                                {b.brandName || b.name}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">No assigned brands.</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </InfoCard>
                </div>

                {/* Addresses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Bill To Address */}
                    <InfoCard icon="mdi:receipt-text-outline" title="Bill To Address" color="bg-slate-700">
                        {billTo.address || billTo.branchName ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                    <span className="text-xs font-bold text-gray-800">{billTo.branchName || 'Primary Branch'}</span>
                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">{billTo.billingCurrency || 'INR'}</span>
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed">{billTo.address}</p>
                                <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
                                    <div>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase block">City / State</span>
                                        <span className="font-semibold text-gray-700">{billTo.city}, {billTo.state}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Pincode / Country</span>
                                        <span className="font-semibold text-gray-700">{billTo.zipCode} ({billTo.country || 'India'})</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Contact Person</span>
                                        <span className="font-semibold text-gray-700">{billTo.customerContactName || billTo.contactPerson || '---'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Contact Number</span>
                                        <span className="font-semibold text-gray-700">{billTo.customerContactNumber || billTo.contactNumber || '---'}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 italic text-center py-4">No Bill-To Address details provided.</p>
                        )}
                    </InfoCard>

                    {/* Ship To Addresses */}
                    <InfoCard icon="mdi:truck-delivery-outline" title={`Ship To Addresses (${shipTo.length})`} color="bg-emerald-600">
                        {shipTo.length > 0 ? (
                            <div className="space-y-4 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                                {shipTo.map((st, idx) => (
                                    <div key={st._id || idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-gray-800">#{idx + 1} {st.branchName || 'Branch'}</span>
                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{st.billingMode || 'Credit'}</span>
                                        </div>
                                        <p className="text-xs text-gray-600 leading-snug">{st.address}</p>
                                        <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-100">
                                            <span>{st.city}, {st.state} - {st.zipCode}</span>
                                            <span className="font-semibold text-gray-700">{st.customerContactNumber || st.contactNumber}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 italic text-center py-4">No Ship-To Addresses registered.</p>
                        )}
                    </InfoCard>
                </div>

                {/* Identity & Verification Documents */}
                <InfoCard icon="mdi:file-document-check-outline" title="Identity & Tax Verification Documents" color="bg-slate-800">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <DetailField label="GST Registration Status" value={customer.isGSTRegistered ? "REGISTERED" : "UN-REGISTERED"} badge={customer.isGSTRegistered ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"} />
                            <div className="mt-3">
                                <DetailField label="GST Number" value={customer.gstNumber || 'N/A'} />
                            </div>
                            <div className="mt-3">
                                <DocCard label="GST Certificate Image" url={customer.gstCertificateImg} />
                            </div>
                        </div>

                        <div>
                            <DetailField label="Aadhar Card Number" value={customer.aadharCard || 'N/A'} />
                            <div className="mt-[37px]">
                                <DocCard label="Aadhar Card Image" url={customer.aadharCardImg} />
                            </div>
                        </div>

                        <div>
                            <DetailField label="PAN Card Number" value={customer.panCard || 'N/A'} />
                            <div className="mt-[37px]">
                                <DocCard label="PAN Card Image" url={customer.panCardImg} />
                            </div>
                        </div>
                    </div>
                </InfoCard>

                {/* Blank Cheques & Remarks */}
                <InfoCard icon="mdi:checkbook" title="Blank Cheques & Submission Remarks" color="bg-amber-600">
                    <div className="space-y-4">
                        <DetailField label="Cheque Submission Remark" value={customer.chequeRemark || 'No remark entered'} />
                        {customer.chequeDetails && customer.chequeDetails.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                                {customer.chequeDetails.map((cq, idx) => (
                                    <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                                        <span className="text-[10px] font-bold uppercase text-gray-400">Cheque {idx + 1}</span>
                                        <p className="text-xs font-semibold text-gray-800">No: {cq.chequeNumber || 'N/A'}</p>
                                        <DocCard label={`Cheque ${idx + 1} Image`} url={cq.chequeImage} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 italic">No blank cheques uploaded.</p>
                        )}
                    </div>
                </InfoCard>

                {/* Workflow & Approval Details */}
                <InfoCard icon="mdi:shield-check-outline" title="Approval Workflow Status" color="bg-indigo-600">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-700 uppercase">Sales Head Approval</span>
                                <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${approval.salesHeadApprovalStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {approval.salesHeadApprovalStatus || 'PENDING'}
                                </span>
                            </div>
                            <DetailField label="Approved Date" value={approval.salesHeadApprovedAt ? new Date(approval.salesHeadApprovedAt).toLocaleString() : 'N/A'} />
                            <DetailField label="Sales Head Remark" value={approval.salesHeadRemark || 'None'} />
                        </div>

                        <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-700 uppercase">Finance Approval</span>
                                <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${approval.financeApprovalStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {approval.financeApprovalStatus || 'PENDING'}
                                </span>
                            </div>
                            <DetailField label="Approved Date" value={approval.financeApprovedAt ? new Date(approval.financeApprovedAt).toLocaleString() : 'N/A'} />
                        </div>
                    </div>
                </InfoCard>

            </div>
        </div>
    );
}
