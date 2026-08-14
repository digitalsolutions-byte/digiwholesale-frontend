import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { getOrderById, updateOrderTracking } from '../services/orderService';
import { PATHS } from '../routes/paths';
import Button from '../components/ui/Button';

const OrderDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    // Tracking Modal State
    const [trackingModalOpen, setTrackingModalOpen] = useState(false);
    const [trackingForm, setTrackingForm] = useState({ trackingId: '', trackingLink: '' });
    const [updatingTracking, setUpdatingTracking] = useState(false);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                setLoading(true);
                const res = await getOrderById(id);
                if (res.success) {
                    setOrder(res.data);
                    const subOrd = res.data?.orders?.[0] || {};
                    setTrackingForm({
                        trackingId: res.data?.trackingId || subOrd.trackingId || '',
                        trackingLink: res.data?.trackingLink || subOrd.trackingLink || ''
                    });
                }
            } catch (error) {
                toast.error('Failed to load order details');
                navigate(PATHS.CUSTOMER_CARE.ALL_ORDERS);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [id, navigate]);

    const handleSaveTracking = async (e) => {
        e.preventDefault();
        if (!trackingForm.trackingId && !trackingForm.trackingLink) {
            toast.error('Please enter Tracking ID or Tracking Link');
            return;
        }

        try {
            setUpdatingTracking(true);
            const res = await updateOrderTracking(id, {
                trackingId: trackingForm.trackingId,
                trackingLink: trackingForm.trackingLink
            });
            if (res.success || res.data) {
                toast.success('Tracking details updated successfully!');
                setOrder(prev => ({
                    ...prev,
                    trackingId: trackingForm.trackingId,
                    trackingLink: trackingForm.trackingLink
                }));
                setTrackingModalOpen(false);
            } else {
                toast.error(res.message || 'Failed to update tracking details');
            }
        } catch (err) {
            toast.error(err.message || 'Error updating tracking details');
        } finally {
            setUpdatingTracking(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] bg-gray-50 flex flex-col items-center justify-center gap-4 p-4">
                <div className="w-10 h-10 border-4 border-[#2980B9]/20 border-t-[#2980B9] rounded-full animate-spin"></div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Loading Order Details...</p>
            </div>
        );
    }

    if (!order) return null;

    const overallStatus = order.orders && order.orders.length > 0 ? order.orders[0].status : 'PENDING';

    const getStatusBadge = (status) => {
        const s = status?.toUpperCase() || 'PENDING';
        switch (s) {
            case 'SUBMITTED':
            case 'PROCESSING':
                return 'bg-blue-50 text-[#2980B9] border-blue-200';
            case 'COMPLETED':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'CANCELLED':
                return 'bg-red-50 text-red-700 border-red-200';
            case 'DRAFT':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            default:
                return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    const InfoCard = ({ title, icon, children, className = "" }) => (
        <div className={`bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/80 shadow-xs ${className}`}>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                <div className="p-1.5 rounded-lg bg-[#2980B9]/10 text-[#2980B9]">
                    <Icon icon={icon} className="text-base sm:text-lg" />
                </div>
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">{title}</h3>
            </div>
            {children}
        </div>
    );

    const DetailItem = ({ label, value, unit = "", highlight = false }) => {
        if (!value && value !== 0) return null;
        return (
            <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">{label}</span>
                <span className={`text-xs font-semibold break-words block ${highlight ? 'text-[#2980B9] font-bold' : 'text-gray-800'}`}>
                    {value}{unit ? ` ${unit}` : ''}
                </span>
            </div>
        );
    };

    const EyeDetailCard = ({ side, data, prism, centration }) => (
        <div className="bg-white rounded-xl border border-gray-200 p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs text-white ${side === 'R' ? 'bg-amber-500' : 'bg-[#2980B9]'}`}>
                        {side}
                    </span>
                    <span className="font-bold text-gray-800 text-xs uppercase">{side === 'R' ? 'Right Eye' : 'Left Eye'}</span>
                </div>
                {data?.diameter && (
                    <span className="text-[10px] font-bold text-gray-500">Dia: {data.diameter}mm</span>
                )}
            </div>

            {/* Powers */}
            <div className="grid grid-cols-4 gap-2 text-center bg-gray-50/80 p-2 rounded-lg text-xs">
                <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase block">SPH</span>
                    <span className="font-semibold text-gray-800">{data?.sph ?? '---'}</span>
                </div>
                <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase block">CYL</span>
                    <span className="font-semibold text-gray-800">{data?.cyl ?? '---'}</span>
                </div>
                <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase block">AXIS</span>
                    <span className="font-semibold text-gray-800">{data?.axis ?? '---'}</span>
                </div>
                <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase block">ADD</span>
                    <span className="font-semibold text-gray-800">{data?.add ?? '---'}</span>
                </div>
            </div>

            {/* Prism & Centration */}
            {(prism?.prism || centration?.pd || centration?.fittingHeight) && (
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    {prism?.prism && (
                        <div>
                            <span className="text-[9px] font-bold text-gray-400 uppercase block">Prism / Base</span>
                            <span className="font-semibold text-gray-700">{prism.prism} / {prism.base || '---'}</span>
                        </div>
                    )}
                    {centration?.pd && (
                        <div>
                            <span className="text-[9px] font-bold text-gray-400 uppercase block">PD / Height</span>
                            <span className="font-semibold text-gray-700">{centration.pd}mm / {centration.fittingHeight || '---'}mm</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    // Calculate financial metrics
    const totalOrderAmount = order.orders?.reduce((acc, subOrder) => {
        return acc + (subOrder.items?.reduce((sum, item) => {
            const price = Number(item.price) || 0;
            const qty = Number(item.qty) || 1;
            const disc = Number(item.discountAmount) || 0;
            const taxable = (price * qty) - disc;
            const gst = Number(item.gst) || 0;
            const gstAmt = taxable > 0 ? taxable * (gst / 100) : 0;
            return sum + (taxable > 0 ? taxable + gstAmt : 0);
        }, 0) || 0);
    }, 0) || 0;

    const firstSubOrder = order.orders?.[0] || {};
    const rxRef = firstSubOrder.items?.find(i => i.rx)?.rx || {};

    const summaryObj = order.summary || {};
    const advanceVal = Number(summaryObj.advanceAmount ?? order.advanceAmount ?? rxRef.advanceAmount ?? 0);
    const shippingVal = Number(summaryObj.shippingCharges ?? order.shippingCharges ?? rxRef.shippingCharges ?? 0);
    const otherVal = Number(summaryObj.otherCharges ?? order.otherCharges ?? rxRef.otherCharges ?? 0);
    const grandTotalVal = Number(summaryObj.grandTotal ?? totalOrderAmount);
    const grossWithCharges = grandTotalVal + shippingVal + otherVal;
    const nowPayableVal = summaryObj.nowPayable !== undefined ? Number(summaryObj.nowPayable) : Math.max(0, grossWithCharges - advanceVal);

    return (
        <div className="w-full space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-16">
            {/* Header Strip */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(PATHS.CUSTOMER_CARE.ALL_ORDERS)}
                        className="p-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 hover:text-[#2980B9] hover:bg-blue-50 transition-all active:scale-95"
                        title="Back to List"
                    >
                        <Icon icon="mdi:arrow-left" className="text-xl" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg sm:text-xl font-bold text-gray-900 uppercase tracking-tight">Order Details</h1>
                            <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase ${getStatusBadge(overallStatus)}`}>
                                {overallStatus}
                            </span>
                        </div>
                        <p className="text-xs font-semibold text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>ID: <span className="font-mono text-gray-700 font-bold">#{order._id}</span></span>
                            <span>•</span>
                            <span>{dayjs(order.createdAt).format('DD MMM YYYY, hh:mm A')}</span>
                        </p>
                    </div>
                </div>

                {/* PDF & Edit Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setTrackingModalOpen(true)}
                        className="px-3 py-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold hover:bg-purple-600 hover:text-white transition-all flex items-center gap-1.5 shadow-xs"
                    >
                        <Icon icon="mdi:truck-fast-outline" className="text-base" />
                        <span>{order.trackingId || order.trackingLink ? 'Edit Tracking' : 'Add Tracking'}</span>
                    </button>
                    {order.invoiceUrl && (
                        <a
                            href={order.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-1.5 shadow-xs"
                        >
                            <Icon icon="mdi:file-pdf-box" className="text-base text-emerald-600" />
                            <span>Invoice</span>
                        </a>
                    )}
                    {order.challanUrl && (
                        <a
                            href={order.challanUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 rounded-xl bg-blue-50 text-[#2980B9] border border-blue-200 text-xs font-bold hover:bg-[#2980B9] hover:text-white transition-all flex items-center gap-1.5 shadow-xs"
                        >
                            <Icon icon="mdi:truck-delivery-outline" className="text-base text-[#2980B9]" />
                            <span>Challan</span>
                        </a>
                    )}
                    {overallStatus === 'DRAFT' && (
                        <Button
                            className="rounded-xl text-xs py-2 px-3"
                            onClick={() => navigate(PATHS.CUSTOMER_CARE.EDIT_ORDER.replace(':id', order._id))}
                        >
                            <Icon icon="mdi:pencil-outline" className="mr-1 text-base" />
                            Edit
                        </Button>
                    )}
                </div>
            </div>

            {/* Content Grid: Customer Details & Financial Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Customer Details & Tracking Info */}
                <div className="lg:col-span-2 space-y-4">
                    <InfoCard title="Customer Information" icon="mdi:account-box-outline">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <DetailItem label="Customer / Shop" value={order.customer?.customerName || order.customer?.shopName} highlight />
                            <DetailItem label="Customer Code" value={order.customer?.customerId || order.customer?.customerCode} />
                            <DetailItem label="Ship-To Branch" value={order.customer?.customerShipToBranchName} highlight />
                            <DetailItem label="Patient / Card Name" value={rxRef.consumerCardName} />
                            <DetailItem label="Optician Name" value={rxRef.opticianName} />
                            <DetailItem label="Direct Customer" value={rxRef.directCustomer} />
                        </div>
                    </InfoCard>

                    {/* Order Tracking Info Card */}
                    <InfoCard title="Courier & Tracking Information" icon="mdi:map-marker-path">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Tracking AWB / ID</span>
                                    <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100 inline-block">
                                        {order.trackingId || firstSubOrder.trackingId || 'Not Added Yet'}
                                    </span>
                                </div>

                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Tracking Link</span>
                                    {(order.trackingLink || firstSubOrder.trackingLink) ? (
                                        <a
                                            href={order.trackingLink || firstSubOrder.trackingLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-semibold text-[#2980B9] hover:underline flex items-center gap-1 truncate"
                                        >
                                            <Icon icon="mdi:open-in-new" className="text-sm shrink-0" />
                                            <span className="truncate">{order.trackingLink || firstSubOrder.trackingLink}</span>
                                        </a>
                                    ) : (
                                        <span className="text-xs text-gray-400 font-medium">No link added</span>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => setTrackingModalOpen(true)}
                                className="px-3.5 py-2 bg-gray-100 hover:bg-[#2980B9] hover:text-white text-gray-700 text-xs font-bold rounded-xl transition-all shrink-0 flex items-center gap-1.5"
                            >
                                <Icon icon="mdi:pencil" className="text-sm" />
                                <span>{(order.trackingId || firstSubOrder.trackingId || order.trackingLink || firstSubOrder.trackingLink) ? 'Update Details' : 'Add Tracking'}</span>
                            </button>
                        </div>
                    </InfoCard>
                </div>

                {/* Financial Summary */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/80 shadow-xs flex flex-col justify-between space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                        <div className="p-1.5 rounded-lg bg-[#2980B9]/10 text-[#2980B9]">
                            <Icon icon="mdi:calculator" className="text-base" />
                        </div>
                        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Financial Summary</h3>
                    </div>

                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between text-gray-600">
                            <span>CGST</span>
                            <span className="font-semibold text-gray-800">{firstSubOrder.cgst ? `₹${firstSubOrder.cgst}` : '---'}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                            <span>SGST</span>
                            <span className="font-semibold text-gray-800">{firstSubOrder.sgst ? `₹${firstSubOrder.sgst}` : '---'}</span>
                        </div>
                        {shippingVal > 0 && (
                            <div className="flex justify-between text-gray-600">
                                <span>Shipping Charges</span>
                                <span className="font-semibold text-gray-800">+₹{shippingVal.toFixed(2)}</span>
                            </div>
                        )}
                        {otherVal > 0 && (
                            <div className="flex justify-between text-gray-600">
                                <span>Other Charges</span>
                                <span className="font-semibold text-gray-800">+₹{otherVal.toFixed(2)}</span>
                            </div>
                        )}
                        {advanceVal > 0 && (
                            <div className="flex justify-between text-emerald-700 font-semibold">
                                <span>Advance Paid</span>
                                <span>-₹{advanceVal.toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    <div className="pt-3 border-t border-gray-100 space-y-1">
                        <div className="flex justify-between items-center text-xs text-gray-500 font-semibold">
                            <span>Grand Total:</span>
                            <span>₹{grandTotalVal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold uppercase text-gray-700">Now Payable</span>
                            <span className="text-xl font-bold text-[#2980B9]">₹{nowPayableVal.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sub-Orders & Product Items List */}
            <div className="space-y-4 sm:space-y-6">
                {order.orders?.map((subOrder, soIndex) => (
                    <div key={soIndex} className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
                        {/* Sub Order Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-50 text-[#2980B9] rounded-lg">
                                    <Icon icon="mdi:package-variant-closed" className="text-base" />
                                </div>
                                <div>
                                    <h3 className="text-xs sm:text-sm font-bold text-gray-800 uppercase font-mono">
                                        Sub-Order: #{subOrder.orderNumber || 'N/A'}
                                    </h3>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase">Sub Order #{soIndex + 1}</span>
                                </div>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase ${getStatusBadge(subOrder.status)}`}>
                                {subOrder.status || 'SUBMITTED'}
                            </span>
                        </div>

                        {/* Items Loop */}
                        <div className="space-y-4">
                            {subOrder.items?.map((item, itemIndex) => {
                                const vendorObj = item.vendor?.name ? item.vendor : (item.rx?.vendor?.name ? item.rx.vendor : null);
                                const isOrderTypeRx = item.orderType === 'RX' || !!item.rx;

                                return (
                                    <div key={itemIndex} className="bg-slate-50/60 rounded-xl border border-slate-200/70 p-3.5 space-y-3">
                                        {/* Top Item Summary Strip */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-3 rounded-lg border border-slate-100">
                                            <div className="flex items-start sm:items-center gap-2.5">
                                                <span className="w-5 h-5 rounded-full bg-[#2980B9]/10 text-[#2980B9] font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
                                                    {itemIndex + 1}
                                                </span>
                                                <div>
                                                    <h4 className="text-xs sm:text-sm font-bold text-gray-900">{item.itemName || 'Unnamed Item'}</h4>
                                                    <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] font-semibold">
                                                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded uppercase">{item.category}</span>
                                                        <span className={`px-1.5 py-0.5 rounded uppercase ${isOrderTypeRx ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                                            {item.orderType || 'STOCK'}
                                                        </span>
                                                        <span className={`px-1.5 py-0.5 rounded uppercase ${item.orderSource === 'ORDER' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600'}`}>
                                                            Source: {item.orderSource || 'INHOUSE'}
                                                        </span>
                                                        {vendorObj?.name && (
                                                            <span className="px-1.5 py-0.5 bg-blue-50 text-[#2980B9] rounded border border-blue-100">
                                                                Vendor: {vendorObj.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between sm:justify-end gap-4 text-xs pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                                                <div className="text-left sm:text-right">
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase block">Qty</span>
                                                    <span className="font-semibold text-gray-800">{item.qty} {item.unit || 'Piece'}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase block">Price</span>
                                                    <span className="font-bold text-[#2980B9]">₹{item.price}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Item Attributes Responsive Grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 text-xs bg-white p-3 rounded-lg border border-slate-100">
                                            <DetailItem label="Code" value={item.code} />
                                            <DetailItem label="Brand" value={item.brand} />
                                            <DetailItem label="Color" value={item.color} />
                                            <DetailItem label="Size" value={item.size} />
                                            <DetailItem label="Dimensions" value={item.dimensions} />
                                            <DetailItem label="Shape" value={item.shape} />
                                            <DetailItem label="Index" value={item.index} />
                                            <DetailItem label="Coating" value={item.coating || item.rx?.coating?.name} />
                                            <DetailItem label="Tint" value={item.tint || item.rx?.tint?.name} />
                                            <DetailItem label="GST %" value={item.gst ? `${item.gst}%` : '0%'} />
                                            <DetailItem label="HSN/SAC" value={item.hsnSac} />
                                            <DetailItem label="MRP" value={item.mrp ? `₹${item.mrp}` : null} />
                                        </div>

                                        {/* RX Prescription Matrix */}
                                        {isOrderTypeRx && item.rx && (
                                            <div className="space-y-3 pt-1">
                                                <h5 className="text-xs font-bold uppercase text-[#2980B9] tracking-wider flex items-center gap-1.5">
                                                    <Icon icon="mdi:eye-outline" className="text-base" />
                                                    Prescription Details
                                                </h5>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {['R', 'L'].map(side => {
                                                        const pSide = item.rx.powers?.find(p => p.side === side) || (side === 'R' ? { sph: item.sph, cyl: item.cyl, axis: item.axis, add: item.add } : null);
                                                        const prSide = item.rx.prisms?.find(p => p.side === side);
                                                        const cSide = item.rx.centration?.find(c => c.side === side);

                                                        if (!pSide && side === 'L') return null;

                                                        return (
                                                            <EyeDetailCard
                                                                key={side}
                                                                side={side}
                                                                data={pSide}
                                                                prism={prSide}
                                                                centration={cSide}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Update Tracking Modal */}
            {trackingModalOpen && (
                <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#2980B9] text-white">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <Icon icon="mdi:truck-fast-outline" className="text-lg" />
                                Order Tracking Details
                            </h3>
                            <button onClick={() => setTrackingModalOpen(false)} className="text-white/80 hover:text-white">
                                <Icon icon="mdi:close" className="text-xl" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveTracking} className="p-6 space-y-4 text-xs">
                            <div>
                                <label className="font-bold text-gray-700 block mb-1">Tracking ID / AWB Number</label>
                                <input
                                    type="text"
                                    placeholder="e.g. AWB1234567890"
                                    value={trackingForm.trackingId}
                                    onChange={e => setTrackingForm(p => ({ ...p, trackingId: e.target.value }))}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-gray-800 outline-none focus:border-[#2980B9] focus:bg-white"
                                />
                            </div>

                            <div>
                                <label className="font-bold text-gray-700 block mb-1">Tracking URL / Link</label>
                                <input
                                    type="url"
                                    placeholder="e.g. https://courier.com/track/AWB1234567890"
                                    value={trackingForm.trackingLink}
                                    onChange={e => setTrackingForm(p => ({ ...p, trackingLink: e.target.value }))}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-800 outline-none focus:border-[#2980B9] focus:bg-white"
                                />
                            </div>

                            <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">
                                Note: Adding tracking information allows staff and customers to track the order movement in real-time.
                            </p>

                            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setTrackingModalOpen(false)}
                                    className="px-4 py-2 text-gray-500 font-bold hover:text-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={updatingTracking}
                                    className="px-6 py-2.5 bg-[#2980B9] hover:bg-[#2471A3] text-white font-bold rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    {updatingTracking ? (
                                        <>
                                            <Icon icon="mdi:loading" className="animate-spin text-sm" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <span>Save Tracking</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderDetails;
