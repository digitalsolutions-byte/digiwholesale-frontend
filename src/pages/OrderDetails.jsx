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
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6">
                <div className="w-16 h-16 border-4 border-erp-accent/20 border-t-erp-accent rounded-full animate-spin"></div>
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
        <div className={`bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`}>
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-erp-accent/5 flex items-center justify-center text-erp-accent shadow-sm">
                    <Icon icon={icon} className="text-xl" />
                </div>
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.15em]">{title}</h3>
            </div>
            {children}
        </div>
    );

    const PowerValue = ({ label, value, unit = "" }) => (
        <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{label}</span>
            <span className="text-sm font-bold text-gray-800">{value || '---'}{unit && value ? unit : ''}</span>
        </div>
    );

    const EyeDetailCard = ({ side, data, prism, centration }) => (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden group hover:border-amber-200 transition-colors duration-300">
            <div className={`py-4 px-8 border-b border-gray-50 flex items-center justify-between ${side === 'R' ? 'bg-erp-accent/5/30' : 'bg-blue-50/30'}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-lg ${side === 'R' ? 'bg-[#fe9a00] rotate-3' : 'bg-blue-500 -rotate-3'}`}>
                        {side}
                    </div>
                    <div>
                        <h4 className="font-black text-gray-800 text-sm uppercase tracking-widest">{side === 'R' ? 'Right Eye' : 'Left Eye'}</h4>
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

            <div className="p-8 space-y-8">
                {/* Power Set */}
                <div className="grid grid-cols-4 gap-4">
                    <PowerValue label="SPH" value={data?.sph} />
                    <PowerValue label="CYL" value={data?.cyl} />
                    <PowerValue label="AXIS" value={data?.axis} />
                    <PowerValue label="ADD" value={data?.add} />
                </div>

                <div className="h-px bg-gray-50" />

                {/* Prism & Centration */}
                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h5 className="text-[9px] font-black text-[#fe9a00] uppercase tracking-[0.2em] mb-3">Prism Matrix</h5>
                        <div className="grid grid-cols-2 gap-4">
                            <PowerValue label="Prism" value={prism?.prism} />
                            <PowerValue label="Base" value={prism?.base} />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h5 className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] mb-3">Centration</h5>
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
        <div className="min-h-screen bg-gray-50/50 p-6 md:p-10 pb-24">
            <div className="max-w-7xl mx-auto space-y-10">
                {/* Header Action Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate(PATHS.CUSTOMER_CARE.ALL_ORDERS)}
                                className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-erp-accent hover:border-amber-200 transition-all active:scale-95 shadow-sm"
                            >
                                <Icon icon="mdi:arrow-left" className="text-xl" />
                            </button>
                            <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter">Order Details</h1>
                        </div>
                        <div className="flex items-center gap-3 ml-13">

                            <span className="px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] shadow-sm animate-in fade-in slide-in-from-left-4 duration-500" >
                                {overallStatus}
                            </span>
                            <span className="text-[11px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2 border-l border-gray-200 pl-3">
                                <Icon icon="mdi:calendar" className="text-erp-accent" />
                                {dayjs(order.createdAt).format('DD MMMM YYYY | hh:mm A')}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {overallStatus === 'DRAFT' && (
                            <Button
                                className="rounded-2xl shadow-erp-accent/20"
                                onClick={() => navigate(PATHS.CUSTOMER_CARE.EDIT_ORDER.replace(':id', order._id))}
                            >
                                <Icon icon="mdi:pencil-outline" className="mr-2 text-xl" />
                                Modify Order
                            </Button>
                        )}
                    </div>
                </div>

                <div className="space-y-10">
                    {/* Customer Spotlight */}
                    <InfoCard title="Customer Profile" icon="mdi:account-details-outline" className="w-full">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-2xl font-black text-gray-800 tracking-tight leading-none mb-1">{order.customer?.customerName || order.customer?.shopName}</h4>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-black rounded uppercase tracking-widest leading-none">ID: {order.customer?.customerId || order.customer?.customerCode || '---'}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-xl">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Running Balance</span>
                                    <span className="text-sm font-black text-gray-800 tracking-tight">₹{order.customer?.customerBalance || '0.00'}</span>
                                </div>
                            </div>
                            <div className="md:col-span-2 flex items-start gap-3 bg-erp-accent/5/50 p-5 rounded-2xl border border-erp-accent/10">
                                <div className="p-3 rounded-xl bg-amber-100/50 text-erp-accent/80">
                                    <Icon icon="mdi:map-marker-radius" className="text-xl" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-erp-accent uppercase tracking-widest mb-1">Ship-To Branch: {order.customer?.customerShipToBranchName}</p>
                                    <p className="text-sm font-bold text-gray-700 leading-relaxed">{order.customer?.address || 'Shipping branch details missing'}</p>
                                </div>
                            </div>
                        </div>
                    </InfoCard>

                    {/* Sub Orders Iteration */}
                    <div className="space-y-12">
                        {order.orders?.map((subOrder, soIndex) => (
                            <div key={soIndex} className="bg-white/50 border border-erp-accent/10 rounded-[3rem] p-8 space-y-10 shadow-sm relative overflow-hidden">
                                {/* Sub Order Header */}
                                <div className="absolute top-0 left-0 w-2 h-full bg-erp-accent/20" />
                                <div className="flex items-center justify-between border-b border-gray-100 pb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white shadow-sm rounded-2xl flex items-center justify-center text-erp-accent">
                                            <Icon icon="mdi:shopping-outline" className="text-2xl" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">{subOrder.orderNumber}</h3>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sub Order #{soIndex + 1}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className={getStatusStyle(subOrder.status) + " px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-[0.2em]"}>
                                            {subOrder.status || 'PENDING'}
                                        </span>
                                        <div className="flex gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            {subOrder.cgst && <span>CGST: {subOrder.cgst}%</span>}
                                            {subOrder.sgst && <span>SGST: {subOrder.sgst}%</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Items Iteration */}
                                <div className="space-y-8">
                                    {subOrder.items?.map((item, itemIndex) => (
                                        <div key={itemIndex} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                                            {/* Item Header */}
                                            <div className="p-6 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <span className="w-8 h-8 rounded-full bg-erp-accent/10 text-erp-accent font-black text-xs flex items-center justify-center">
                                                        {itemIndex + 1}
                                                    </span>
                                                    <div>
                                                        <h4 className="text-lg font-black text-gray-800 uppercase tracking-tight">{item.itemName || 'Unnamed Product'}</h4>
                                                        <div className="flex gap-2 mt-1">
                                                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest bg-white px-2 py-0.5 rounded border border-gray-200">{item.category}</span>
                                                            <span className="text-[9px] font-black text-erp-accent uppercase tracking-widest bg-erp-accent/5 px-2 py-0.5 rounded border border-erp-accent/10">{item.orderType}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Quantity</span>
                                                        <span className="text-sm font-bold text-gray-800">{item.qty} {item.unit}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Price</span>
                                                        <span className="text-lg font-black text-erp-accent">₹{item.price}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Item Details based on Type */}
                                            <div className="p-8">
                                                {item.orderType === 'RX' && item.rx && (
                                                    <div className="space-y-10">
                                                        {/* Primary Intelligence Grid */}
                                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                            {/* Product Master */}
                                                            <InfoCard title="Product Architecture" icon="mdi:package-variant-closed">
                                                                <div className="space-y-6">
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <div className="space-y-1">
                                                                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Treatment</span>
                                                                            <p className="text-xs font-bold text-gray-700">{item.rx.treatment?.name || '---'}</p>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Coating</span>
                                                                            <p className="text-xs font-bold text-gray-700">{item.rx.coating?.name || item.coating || '---'}</p>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Tint Detail</span>
                                                                            <p className="text-xs font-bold text-gray-700">{item.rx.tint?.name || item.tint || 'No Tint'}</p>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Index</span>
                                                                            <p className="text-xs font-bold text-gray-700">{item.index || 'N/A'}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </InfoCard>

                                                            <InfoCard title="Patient Profile" icon="mdi:account-injury-outline">
                                                                <div className="space-y-6">
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <div className="space-y-1">
                                                                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Consumer Card</span>
                                                                            <p className="text-xs font-bold text-gray-700">{item.rx.consumerCardName || '---'}</p>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Optician</span>
                                                                            <p className="text-xs font-bold text-gray-700">{item.rx.opticianName || '---'}</p>
                                                                        </div>
                                                                        <div className="space-y-1 col-span-2">
                                                                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Order Reference</span>
                                                                            <p className="text-xs font-bold text-gray-700">{item.rx.orderReference || '---'}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </InfoCard>
                                                        </div>

                                                        {/* Prescription Matrix */}
                                                        <div className="space-y-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-2 h-8 bg-[#fe9a00] rounded-full" />
                                                                <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">Ocular Prescription Matrix</h2>
                                                            </div>
                                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                                                            <div className="space-y-6">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-2 h-8 bg-blue-500 rounded-full" />
                                                                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">Anatomical Fitting Data</h2>
                                                                </div>
                                                                <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 grid grid-cols-2 md:grid-cols-4 gap-10 shadow-sm">
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
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Flat Fitting</span>
                                                                        <span className={`text-xs font-black uppercase tracking-widest ${item.rx.fitting?.hasFlatFitting ? 'text-green-500' : 'text-gray-300'}`}>
                                                                            {item.rx.fitting?.hasFlatFitting ? 'Active' : 'Inactive'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {item.orderType === 'STOCK' && (
                                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
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
                <div className="pt-10 flex flex-col items-center justify-center gap-4 text-center">
                    <div className="w-16 h-px bg-gray-200" />
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.4em]">
                        Digi-Optics Order Management System Protocol v2.0
                    </p>
                    <div className="flex items-center gap-4 text-gray-300">
                        <Icon icon="mdi:shield-check" className="text-xl" />
                        <Icon icon="mdi:database-check" className="text-xl" />
                        <Icon icon="mdi:printer-check" className="text-xl" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderDetails;


