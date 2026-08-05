import React, { useState, useEffect } from 'react';
import api from '../services/apiInstance';
import { Icon } from '@iconify/react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie, Legend
} from 'recharts';

import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/slices/authSlice';
import PlatformOwnerDashboard from './PlatformOwnerDashboard';
import { Link } from 'react-router-dom';
import { PATHS } from '../routes/paths';

const STATUS_CONFIG = {
    Active: { color: '#2980B9', bg: 'bg-blue-50', text: 'text-blue-700' },
    Submitted: { color: '#7C3AED', bg: 'bg-violet-50', text: 'text-violet-700' },
    Processing: { color: '#F59E0B', bg: 'bg-amber-50', text: 'text-amber-700' },
    QC: { color: '#0891B2', bg: 'bg-cyan-50', text: 'text-cyan-700' },
    ReadyToDispatch: { color: '#059669', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    Dispatched: { color: '#2563EB', bg: 'bg-blue-50', text: 'text-blue-700' },
    Delivered: { color: '#10B981', bg: 'bg-green-50', text: 'text-green-700' },
    Completed: { color: '#15803d', bg: 'bg-green-50', text: 'text-green-800' },
    Cancelled: { color: '#E74C3C', bg: 'bg-red-50', text: 'text-red-700' },
    Draft: { color: '#9CA3AF', bg: 'bg-gray-50', text: 'text-gray-600' },
};

const getStatusStyle = (status = '') => {
    const key = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    return STATUS_CONFIG[key] || { color: '#9CA3AF', bg: 'bg-gray-50', text: 'text-gray-600' };
};

const MetricCard = ({ label, value, icon, gradient, change }) => (
    <div className={`relative overflow-hidden rounded-2xl p-5 shadow-sm border border-white/30 ${gradient} group hover:-translate-y-0.5 transition-all duration-200`}>
        <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10 group-hover:bg-white/15 transition-all duration-300" />
        <div className="relative z-10 flex justify-between items-start">
            <div>
                <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">{label}</p>
                <p className="text-4xl font-black text-white tracking-tight">{value ?? '—'}</p>
                {change !== undefined && (
                    <p className="text-xs text-white/60 mt-2 font-semibold">{change}</p>
                )}
            </div>
            <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Icon icon={icon} className="text-white text-xl" />
            </div>
        </div>
    </div>
);

const OrderStatusRow = ({ label, value, color }) => {
    return (
        <div className="flex items-center gap-3 py-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-xs text-gray-600 font-medium flex-1">{label}</span>
            <span className="text-sm font-extrabold text-gray-800 tabular-nums">{value}</span>
        </div>
    );
};

const Dashboard = () => {
    const user = useSelector(selectCurrentUser);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    if (user?.EmployeeType === 'PLATFORM_OWNER') {
        return <PlatformOwnerDashboard />;
    }

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const response = await api.get('/api/analytics/dashboard');
                if (response.data.success && response.data.data) {
                    setAnalytics(response.data.data);
                } else {
                    throw new Error('Invalid response');
                }
            } catch (error) {
                console.error('Failed to fetch analytics:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#2980B9]/20 border-t-[#2980B9] rounded-full animate-spin" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Loading Analytics</p>
                </div>
            </div>
        );
    }

    const ord = analytics?.orders || {};

    const barData = [
        { name: 'Active', value: ord.active || 0, color: STATUS_CONFIG.Active.color },
        { name: 'Submitted', value: ord.submitted || 0, color: STATUS_CONFIG.Submitted.color },
        { name: 'Processing', value: ord.processing || 0, color: STATUS_CONFIG.Processing.color },
        { name: 'Dispatch', value: ord.readyToDispatch || 0, color: STATUS_CONFIG.ReadyToDispatch.color },
        { name: 'Delivered', value: ord.delivered || 0, color: STATUS_CONFIG.Delivered.color },
        { name: 'Completed', value: ord.completed || 0, color: STATUS_CONFIG.Completed.color },
        { name: 'Cancelled', value: ord.cancelled || 0, color: STATUS_CONFIG.Cancelled.color },
        { name: 'Draft', value: ord.draft || 0, color: STATUS_CONFIG.Draft.color },
    ];

    const pieData = barData.filter(d => d.value > 0);

    const flattenedOrders = analytics?.recentOrders?.flatMap(doc =>
        doc.orders?.map(subOrder => ({
            ...subOrder,
            parentDate: doc.createdAt,
            customer: doc.customer,
            parentId: doc._id
        })) || []
    ) || [];

    return (
        <div className="w-full flex flex-col gap-6 font-sans">

            {/* Header */}
            <header className="flex justify-between items-end shrink-0">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
                        <Icon icon="lucide:layout-dashboard" className="text-[#2980B9]" />
                        Executive Overview
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        Last updated:&nbsp;
                        <span className="font-semibold text-gray-700">
                            {new Date(analytics?.generatedAt || Date.now()).toLocaleString('en-IN', {
                                day: 'numeric', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                            })}
                        </span>
                    </p>
                </div>
                <Link to={PATHS.SETTINGS} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl shadow-xs text-xs font-bold transition-all">
                    <Icon icon="lucide:settings" className="text-lg text-gray-500" />
                    Settings
                </Link>
            </header>

            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    label="Active Customers"
                    value={analytics?.customers?.activeUsers}
                    icon="lucide:users"
                    gradient="bg-gradient-to-br from-[#2980B9] to-[#1A5E8A]"
                />
                <MetricCard
                    label="Total Orders"
                    value={ord.totalOrders}
                    icon="lucide:shopping-bag"
                    gradient="bg-gradient-to-br from-[#2980B9] to-[#1A5E8A]"
                />
                <MetricCard
                    label="Active Orders"
                    value={ord.active}
                    icon="lucide:activity"
                    gradient="bg-gradient-to-br from-[#2980B9] to-[#1A5E8A]"
                />
                <MetricCard
                    label="Total Staff"
                    value={analytics?.staff?.total}
                    icon="lucide:user-check"
                    gradient="bg-gradient-to-br from-[#2980B9] to-[#1A5E8A]"
                />
            </div>

            {/* Secondary Metrics Row */}


            {/* Order Summary */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-sm font-bold text-gray-800 mb-5 flex items-center gap-2">
                    <Icon icon="lucide:clipboard-list" className="text-[#2980B9]" />
                    Order Summary
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                    {[
                        { label: 'Total Orders', value: ord.totalOrders, icon: 'lucide:shopping-bag', bg: 'bg-[#2980B9]', text: 'text-white' },
                        { label: 'Active', value: ord.active, icon: 'lucide:activity', bg: 'bg-blue-50', text: 'text-blue-700' },
                        { label: 'In Progress', value: (ord.submitted || 0) + (ord.processing || 0) + (ord.qc || 0), icon: 'lucide:loader-2', bg: 'bg-amber-50', text: 'text-amber-700' },
                        { label: 'Ready to Dispatch', value: ord.readyToDispatch, icon: 'lucide:package-check', bg: 'bg-cyan-50', text: 'text-cyan-700' },
                        { label: 'Dispatched', value: ord.dispatched, icon: 'lucide:truck', bg: 'bg-emerald-50', text: 'text-emerald-700' },
                        { label: 'Completed', value: (ord.delivered || 0) + (ord.completed || 0), icon: 'lucide:check-circle-2', bg: 'bg-green-50', text: 'text-green-700' },
                        { label: 'Cancelled', value: ord.cancelled, icon: 'lucide:x-circle', bg: 'bg-red-50', text: 'text-red-600' },
                    ].map((item, idx) => (
                        <div key={idx} className={`${item.bg} rounded-2xl p-3.5 flex flex-col gap-2 hover:shadow-md transition-shadow`}>
                            <div className="flex items-center justify-between">
                                <Icon icon={item.icon} className={`${item.text} text-lg`} />
                            </div>
                            <p className={`text-2xl font-black ${item.text} tabular-nums`}>{item.value ?? 0}</p>
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${item.text} opacity-70`}>{item.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Bar Chart — takes up 3/5 */}
                <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h2 className="text-sm font-bold text-gray-800 mb-5 flex items-center gap-2">
                        <Icon icon="lucide:bar-chart-3" className="text-[#2980B9]" />
                        Order Volume by Status
                    </h2>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 600 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                                <Tooltip
                                    cursor={{ fill: '#eaf4fb', opacity: 0.5, radius: 6 }}
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                                />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={40}>
                                    {barData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Status breakdown — takes up 2/5 */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h2 className="text-sm font-bold text-gray-800 mb-5 flex items-center gap-2">
                        <Icon icon="lucide:list-checks" className="text-[#2980B9]" />
                        Status Breakdown
                    </h2>
                    <div className="divide-y divide-gray-50">
                        {barData.map((s, i) => (
                            <OrderStatusRow key={i} label={s.name} value={s.value} color={s.color} />
                        ))}
                    </div>
                    {/* Total pill */}
                    <div className="mt-4 bg-[#eaf4fb] rounded-xl px-4 py-2.5 flex justify-between items-center">
                        <span className="text-xs font-bold text-[#1F618D]">Total Orders</span>
                        <span className="text-lg font-black text-[#1F618D]">{ord.totalOrders ?? 0}</span>
                    </div>
                </div>
            </div>

            {/* Recent Orders Table */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-[#eaf4fb]/60 to-transparent">
                    <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <Icon icon="lucide:clock-3" className="text-[#2980B9]" />
                        Recent Orders
                    </h2>
                    <span className="text-xs text-gray-400 font-semibold">{flattenedOrders.length} orders</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-gray-50/70 border-b border-gray-100">
                                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Order Ref</th>
                                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Customer</th>
                                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Branch</th>
                                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Items</th>
                                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Date</th>
                                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {flattenedOrders.length > 0 ? (
                                flattenedOrders.slice(0, 8).map((order, i) => {
                                    const totalItems = order.items?.reduce((sum, item) => sum + (Number(item.qty) || 0), 0) || 0;
                                    const { bg, text } = getStatusStyle(order.status);
                                    return (
                                        <tr key={order.orderNumber || i} className="hover:bg-[#eaf4fb]/20 transition-colors">
                                            <td className="px-5 py-3.5 font-mono font-bold text-gray-700 text-[11px] max-w-[140px] truncate">
                                                {order.orderNumber || 'N/A'}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="font-semibold text-gray-800">{order.customer?.customerName || 'N/A'}</span>
                                            </td>
                                            <td className="px-5 py-3.5 text-gray-500">
                                                {order.customer?.customerShipToBranchName || '—'}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold text-[10px]">
                                                    <Icon icon="lucide:package" className="text-[9px]" />
                                                    {totalItems}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-gray-400 font-medium">
                                                {order.parentDate ? new Date(order.parentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${bg} ${text}`}>
                                                    {order.status || 'Pending'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                                        <Icon icon="lucide:inbox" className="text-3xl mx-auto mb-2 opacity-50" />
                                        <p className="text-xs font-semibold">No recent orders found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default Dashboard;
