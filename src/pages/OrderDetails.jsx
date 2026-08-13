import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { getOrderById } from '../services/orderService';
import { PATHS } from '../routes/paths';
import Button from '../components/ui/Button';

const OrderDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                setLoading(true);
                const res = await getOrderById(id);
                if (res.success) {
                    setOrder(res.data);
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

    if (loading) {
        return (
            <div className="min-h-[60vh] bg-gray-50 flex flex-col items-center justify-center gap-6 p-4">
                <div className="w-12 h-12 border-4 border-erp-accent/20 border-t-erp-accent rounded-full animate-spin"></div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] animate-pulse">Loading Order Details...</p>
            </div>
        );
    }

    if (!order) return null;

    const overallStatus = order.orders && order.orders.length > 0 ? order.orders[0].status : 'PENDING';

    const getStatusStyle = (status) => {
        const s = status?.toUpperCase() || 'PENDING';
        switch (s) {
            case 'SUBMITTED':
            case 'PROCESSING': return 'bg-blue-50 text-blue-600 border-blue-200 shadow-blue-500/10';
            case 'COMPLETED': return 'bg-green-50 text-green-600 border-green-200 shadow-green-500/10';
            case 'CANCELLED': return 'bg-red-50 text-red-600 border-red-200 shadow-red-500/10';
            case 'DRAFT': return 'bg-erp-accent/5 text-erp-accent/80 border-amber-200 shadow-erp-accent/10';
            default: return 'bg-gray-50 text-gray-600 border-gray-200';
        }
    };

    const InfoCard = ({ title, icon, children, className = "" }) => (
        <div className={`bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-100 shadow-xs hover:shadow-md transition-shadow duration-300 ${className}`}>
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-erp-accent/5 flex items-center justify-center text-erp-accent shadow-xs flex-shrink-0">
                    <Icon icon={icon} className="text-lg sm:text-xl" />
                </div>
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.15em]">{title}</h3>
            </div>
            {children}
        </div>
    );

    const PowerValue = ({ label, value, unit = "" }) => (
        <div className="flex flex-col gap-0.5 sm:gap-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{label}</span>
            <span className="text-xs sm:text-sm font-bold text-gray-800 break-words">{value || '---'}{unit && value ? unit : ''}</span>
        </div>
    );

    const EyeDetailCard = ({ side, data, prism, centration }) => (
        <div className="bg-white rounded-2xl sm:rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden group hover:border-amber-200 transition-colors duration-300">
            <div className={`py-3 sm:py-4 px-4 sm:px-8 border-b border-gray-50 flex items-center justify-between ${side === 'R' ? 'bg-amber-50/30' : 'bg-blue-50/30'}`}>
                <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-base sm:text-xl text-white shadow-md ${side === 'R' ? 'bg-[#fe9a00]' : 'bg-blue-500'}`}>
                        {side}
                    </div>
                    <div>
                        <h4 className="font-black text-gray-800 text-xs sm:text-sm uppercase tracking-wider">{side === 'R' ? 'Right Eye' : 'Left Eye'}</h4>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Ocular Configuration</p>
                    </div>
                </div>
                {data?.diameter && (
                    <div className="text-right">
                        <span className="text-[9px] font-black text-gray-400 uppercase block tracking-tighter">Diameter</span>
                        <span className="text-xs font-black text-erp-accent/80">{data.diameter}mm</span>
                    </div>
                )}
            </div>

            <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
                {/* Power Set */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <PowerValue label="SPH" value={data?.sph} />
                    <PowerValue label="CYL" value={data?.cyl} />
                    <PowerValue label="AXIS" value={data?.axis} />
                    <PowerValue label="ADD" value={data?.add} />
                </div>

                <div className="h-px bg-gray-100" />

                {/* Prism & Centration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                    <div className="space-y-3 sm:space-y-4">
                        <h5 className="text-[9px] font-black text-[#fe9a00] uppercase tracking-[0.2em]">Prism Matrix</h5>
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <PowerValue label="Prism" value={prism?.prism} />
                            <PowerValue label="Base" value={prism?.base} />
                        </div>
                    </div>
                    <div className="space-y-3 sm:space-y-4">
                        <h5 className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em]">Centration</h5>
                        <div className="grid grid-cols-3 gap-2">
                            <PowerValue label="PD" value={centration?.pd} unit="mm" />
                            <PowerValue label="Dist." value={centration?.corridor} />
                            <PowerValue label="Height" value={centration?.fittingHeight} unit="mm" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="w-full space-y-6 sm:space-y-10 px-2 sm:px-0">
            {/* Header Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(PATHS.CUSTOMER_CARE.ALL_ORDERS)}
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-erp-accent hover:border-amber-200 transition-all active:scale-95 shadow-xs flex-shrink-0"
                            title="Go back"
                        >
                            <Icon icon="mdi:arrow-left" className="text-xl" />
                        </button>
                        <h1 className="text-2xl sm:text-4xl font-black text-gray-900 uppercase tracking-tight">Order Details</h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 pl-12 sm:pl-13">
                        <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${getStatusStyle(overallStatus)}`}>
                            {overallStatus}
                        </span>
                        <span className="text-[10px] sm:text-[11px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5 border-l border-gray-200 pl-3">
                            <Icon icon="mdi:calendar" className="text-erp-accent" />
                            {dayjs(order.createdAt).format('DD MMM YYYY | hh:mm A')}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                    {overallStatus === 'DRAFT' && (
                        <Button
                            className="rounded-xl sm:rounded-2xl shadow-erp-accent/20 text-xs py-2 px-4"
                            onClick={() => navigate(PATHS.CUSTOMER_CARE.EDIT_ORDER.replace(':id', order._id))}
                        >
                            <Icon icon="mdi:pencil-outline" className="mr-1.5 text-lg" />
                            Modify Order
                        </Button>
                    )}
                </div>
            </div>

            <div className="space-y-6 sm:space-y-10">
                {/* Customer Spotlight */}
                <InfoCard title="Customer Profile" icon="mdi:account-details-outline" className="w-full">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8">
                        <div className="space-y-3">
                            <div>
                                <h4 className="text-xl sm:text-2xl font-black text-gray-800 tracking-tight leading-snug mb-1">{order.customer?.customerName || order.customer?.shopName}</h4>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-black rounded uppercase tracking-wider break-all">
                                        ID: {order.customer?.customerId || order.customer?.customerCode || '---'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-xl">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Running Balance</span>
                                <span className="text-xs sm:text-sm font-black text-gray-800 tracking-tight">₹{order.customer?.customerBalance || '0.00'}</span>
                            </div>
                        </div>
                        <div className="md:col-span-2 flex items-start gap-3 bg-erp-accent/5/50 p-4 sm:p-5 rounded-2xl border border-erp-accent/10">
                            <div className="p-2.5 sm:p-3 rounded-xl bg-amber-100/50 text-erp-accent/80 flex-shrink-0">
                                <Icon icon="mdi:map-marker-radius" className="text-lg sm:text-xl" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black text-erp-accent uppercase tracking-wider mb-1 truncate">
                                    Ship-To Branch: {order.customer?.customerShipToBranchName || 'Main Branch'}
                                </p>
                                <p className="text-xs sm:text-sm font-bold text-gray-700 leading-relaxed break-words">
                                    {order.customer?.address || 'Shipping branch details missing'}
                                </p>
                            </div>
                        </div>
                    </div>
                </InfoCard>

                {/* Sub Orders Iteration */}
                <div className="space-y-6 sm:space-y-12">
                    {order.orders?.map((subOrder, soIndex) => (
                        <div key={soIndex} className="bg-white/50 border border-erp-accent/10 rounded-2xl sm:rounded-[3rem] p-4 sm:p-8 space-y-6 sm:space-y-10 shadow-xs relative overflow-hidden">
                            {/* Sub Order Header */}
                            <div className="absolute top-0 left-0 w-1.5 sm:w-2 h-full bg-erp-accent/20" />
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4 sm:pb-6">
                                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white shadow-xs rounded-xl sm:rounded-2xl flex items-center justify-center text-erp-accent flex-shrink-0">
                                        <Icon icon="mdi:shopping-outline" className="text-xl sm:text-2xl" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-base sm:text-xl font-black text-gray-800 uppercase tracking-tight break-all font-mono">
                                            {subOrder.orderNumber}
                                        </h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sub Order #{soIndex + 1}</p>
                                    </div>
                                </div>
                                <div className="flex sm:flex-col flex-wrap items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100">
                                    <span className={getStatusStyle(subOrder.status) + " px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider"}>
                                        {subOrder.status || 'PENDING'}
                                    </span>
                                    <div className="flex gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        {subOrder.cgst && <span>CGST: {subOrder.cgst}%</span>}
                                        {subOrder.sgst && <span>SGST: {subOrder.sgst}%</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Items Iteration */}
                            <div className="space-y-6 sm:space-y-8">
                                {subOrder.items?.map((item, itemIndex) => (
                                    <div key={itemIndex} className="bg-white rounded-xl sm:rounded-[2rem] border border-gray-100 shadow-xs overflow-hidden">
                                        {/* Item Header */}
                                        <div className="p-4 sm:p-6 bg-gray-50/50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex items-start sm:items-center gap-3">
                                                <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-erp-accent/10 text-erp-accent font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
                                                    {itemIndex + 1}
                                                </span>
                                                <div>
                                                    <h4 className="text-base sm:text-lg font-black text-gray-800 uppercase tracking-tight break-words">{item.itemName || 'Unnamed Product'}</h4>
                                                    <div className="flex gap-2 mt-1 flex-wrap">
                                                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-gray-200">{item.category}</span>
                                                        <span className="text-[9px] font-black text-erp-accent uppercase tracking-wider bg-erp-accent/5 px-2 py-0.5 rounded border border-erp-accent/10">{item.orderType}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-200">
                                                <div className="text-left sm:text-right">
                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Quantity</span>
                                                    <span className="text-xs sm:text-sm font-bold text-gray-800">{item.qty} {item.unit}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Price</span>
                                                    <span className="text-base sm:text-lg font-black text-erp-accent">₹{item.price}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Item Details based on Type */}
                                        <div className="p-4 sm:p-8">
                                            {item.orderType === 'RX' && item.rx && (
                                                <div className="space-y-6 sm:space-y-10">
                                                    {/* Primary Intelligence Grid */}
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                                                        {/* Product Master */}
                                                        <InfoCard title="Product Specifications" icon="mdi:package-variant-closed">
                                                            <div className="space-y-4">
                                                                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                                                    <div className="space-y-0.5">
                                                                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Treatment</span>
                                                                        <p className="text-xs font-bold text-gray-700">{item.rx.treatment?.name || '---'}</p>
                                                                    </div>
                                                                    <div className="space-y-0.5">
                                                                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Coating</span>
                                                                        <p className="text-xs font-bold text-gray-700">{item.rx.coating?.name || item.coating || '---'}</p>
                                                                    </div>
                                                                    <div className="space-y-0.5">
                                                                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Tint Detail</span>
                                                                        <p className="text-xs font-bold text-gray-700">{item.rx.tint?.name || item.tint || 'No Tint'}</p>
                                                                    </div>
                                                                    <div className="space-y-0.5">
                                                                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Index</span>
                                                                        <p className="text-xs font-bold text-gray-700">{item.index || 'N/A'}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </InfoCard>

                                                        <InfoCard title="Patient Profile" icon="mdi:account-injury-outline">
                                                            <div className="space-y-4">
                                                                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                                                    <div className="space-y-0.5">
                                                                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Consumer Card</span>
                                                                        <p className="text-xs font-bold text-gray-700">{item.rx.consumerCardName || '---'}</p>
                                                                    </div>
                                                                    <div className="space-y-0.5">
                                                                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Optician</span>
                                                                        <p className="text-xs font-bold text-gray-700">{item.rx.opticianName || '---'}</p>
                                                                    </div>
                                                                    <div className="space-y-0.5 col-span-2">
                                                                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Order Reference</span>
                                                                        <p className="text-xs font-bold text-gray-700">{item.rx.orderReference || '---'}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </InfoCard>
                                                    </div>

                                                    {/* Prescription Matrix */}
                                                    <div className="space-y-4 sm:space-y-6">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-1.5 h-6 sm:w-2 sm:h-8 bg-[#fe9a00] rounded-full" />
                                                            <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Ocular Prescription Matrix</h2>
                                                        </div>
                                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                                                            {['R', 'L'].map(side => {
                                                                const hasSide = item.rx.powers?.some(p => p.side === side);
                                                                if (!hasSide) return null;
                                                                return (
                                                                    <EyeDetailCard
                                                                        key={side}
                                                                        side={side}
                                                                        data={item.rx.powers?.find(p => p.side === side)}
                                                                        prism={item.rx.prisms?.find(p => p.side === side)}
                                                                        centration={item.rx.centration?.find(c => c.side === side)}
                                                                    />
                                                                )
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Fitting Data */}
                                                    {item.rx.fitting && (
                                                        <div className="space-y-4 sm:space-y-6">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-1.5 h-6 sm:w-2 sm:h-8 bg-blue-500 rounded-full" />
                                                                <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Anatomical Fitting Data</h2>
                                                            </div>
                                                            <div className="bg-white rounded-2xl sm:rounded-[2.5rem] border border-gray-100 p-4 sm:p-8 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-10 shadow-xs">
                                                                <PowerValue label="Frame Type" value={item.rx.fitting?.frameType} />
                                                                <PowerValue label="DBL" value={item.rx.fitting?.dbl} unit="mm" />
                                                                <PowerValue label="Frame Length" value={item.rx.fitting?.frameLength} unit="mm" />
                                                                <PowerValue label="Frame Height" value={item.rx.fitting?.frameHeight} unit="mm" />
                                                                
                                                                {item.rx.lensData && (
                                                                    <>
                                                                        <PowerValue label="Pantoscopic" value={item.rx.lensData?.pantoscopeAngle} unit="°" />
                                                                        <PowerValue label="Bow Angle" value={item.rx.lensData?.bowAngle} unit="°" />
                                                                        <PowerValue label="BVD" value={item.rx.lensData?.bvd} unit="mm" />
                                                                    </>
                                                                )}
                                                                <div className="flex flex-col gap-0.5 sm:gap-1">
                                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Flat Fitting</span>
                                                                    <span className={`text-xs font-black uppercase tracking-wider ${item.rx.fitting?.hasFlatFitting ? 'text-green-500' : 'text-gray-300'}`}>
                                                                        {item.rx.fitting?.hasFlatFitting ? 'Active' : 'Inactive'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {item.orderType === 'STOCK' && (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 sm:gap-8">
                                                    <PowerValue label="SPH" value={item.sph} />
                                                    <PowerValue label="CYL" value={item.cyl} />
                                                    <PowerValue label="AXIS" value={item.axis} />
                                                    <PowerValue label="ADD" value={item.add} />
                                                    <PowerValue label="Index" value={item.index} />
                                                    <PowerValue label="Color" value={item.color} />
                                                    <PowerValue label="Coating" value={item.coating} />
                                                    <PowerValue label="Tint" value={item.tint} />
                                                    <PowerValue label="Expiry" value={item.expiry ? dayjs(item.expiry).format('DD MMM YYYY') : null} />
                                                    <PowerValue label="Disposability" value={item.disposability} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer Attribution */}
            <div className="pt-6 sm:pt-10 flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-16 h-px bg-gray-200" />
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em]">
                    Digi-Optics Order Management System Protocol v2.0
                </p>
                <div className="flex items-center gap-4 text-gray-300">
                    <Icon icon="mdi:shield-check" className="text-xl" />
                    <Icon icon="mdi:database-check" className="text-xl" />
                    <Icon icon="mdi:printer-check" className="text-xl" />
                </div>
            </div>
        </div>
    );
};

export default OrderDetails;


