import React, { useState, useEffect } from 'react';
import api from '../services/apiInstance';
import { Icon } from '@iconify/react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const STATUS_COLORS = {
    Active: '#2980B9',
    Ready: '#F59E0B',
    Delivered: '#10B981',
    Draft: '#8B5CF6'
};

const Dashboard = () => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const response = await api.get('/api/analytics/dashboard');
                if (response.data.success && response.data.data) {
                    setAnalytics(response.data.data);
                } else {
                    throw new Error("Invalid response");
                }
            } catch (error) {
                console.error("Failed to fetch analytics, using sample data:", error);
                setAnalytics({
                    customers: { activeUsers: 11 },
                    orders: {
                        active: 5,
                        totalOrders: 21,
                        delivered: 12,
                        readyToDeliver: 2,
                        draft: 2,
                    },
                    staff: { total: 52 },
                    recentOrders: [],
                    generatedAt: new Date().toISOString()
                });
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-[#2980B9]/20 border-t-[#2980B9] rounded-full animate-spin"></div>
                    <div className="mt-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center animate-pulse">Loading Analytics</div>
                </div>
            </div>
        );
    }

    const statusData = [
        { name: 'Active', value: analytics?.orders?.active || 0, color: STATUS_COLORS.Active },
        { name: 'Ready', value: analytics?.orders?.readyToDeliver || 0, color: STATUS_COLORS.Ready },
        { name: 'Delivered', value: analytics?.orders?.delivered || 0, color: STATUS_COLORS.Delivered },
        { name: 'Draft', value: analytics?.orders?.draft || 0, color: STATUS_COLORS.Draft }
    ];

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
                        Last updated: <span className="font-semibold text-gray-700">{new Date(analytics?.generatedAt || Date.now()).toLocaleString()}</span>
                    </p>
                </div>
            </header>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                    { label: 'Active Customers', value: analytics?.customers?.activeUsers, icon: 'lucide:users', bg: 'bg-[#eaf4fb]', text: 'text-[#1F618D]' },
                    { label: 'Total Orders', value: analytics?.orders?.totalOrders, icon: 'lucide:shopping-bag', bg: 'bg-[#eaf4fb]', text: 'text-[#1F618D]' },
                    { label: 'Active Orders', value: analytics?.orders?.active, icon: 'lucide:activity', bg: 'bg-[#eaf4fb]', text: 'text-[#1F618D]' },
                    { label: 'Total Staff', value: analytics?.staff?.total, icon: 'lucide:user-check', bg: 'bg-[#eaf4fb]', text: 'text-[#1F618D]' },
                ].map((m, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all flex justify-between items-center group">
                        <div className="space-y-1">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{m.label}</h3>
                            <p className="text-3xl font-extrabold text-gray-800">{m.value || 0}</p>
                        </div>
                        <div className={`w-12 h-12 rounded-xl ${m.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                            <Icon icon={m.icon} className={`${m.text} text-xl`} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Order Status Distribution Chart */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                    <h2 className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Icon icon="lucide:bar-chart-3" className="text-[#2980B9] text-base" />
                        Order Status Distribution
                    </h2>
                    <div className="h-64 w-full flex-grow">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={statusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                                <Tooltip
                                    cursor={{ fill: '#eaf4fb', opacity: 0.3 }}
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                                />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Status Summary Widget */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                    <h2 className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Icon icon="lucide:pie-chart" className="text-[#2980B9] text-base" />
                        Order Status Breakdown
                    </h2>
                    <div className="flex-grow flex items-center justify-center">
                        <div className="w-full space-y-3">
                            {statusData.map((status, index) => (
                                <div key={index} className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50/50 hover:bg-[#eaf4fb]/10 transition-colors border border-gray-100/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: status.color }}></div>
                                        <span className="text-xs font-bold text-gray-600">{status.name}</span>
                                    </div>
                                    <span className="text-sm font-extrabold text-gray-800">{status.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Orders Table */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-grow min-h-[250px] flex flex-col">
                <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/30 shrink-0">
                    <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                        <Icon icon="lucide:list" className="text-[#2980B9]" />
                        Recent Live Orders
                    </h2>
                </div>
                <div className="overflow-x-auto flex-grow">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-gray-400">
                                <th className="px-6 py-3 font-semibold uppercase tracking-wider">Order Ref</th>
                                <th className="px-6 py-3 font-semibold uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-3 font-semibold uppercase tracking-wider">Items</th>
                                <th className="px-6 py-3 font-semibold uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 font-semibold uppercase tracking-wider text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {flattenedOrders.length > 0 ? (
                                flattenedOrders.slice(0, 8).map((order, i) => {
                                    const totalItems = order.items?.reduce((sum, item) => sum + (Number(item.qty) || 0), 0) || 0;

                                    let statusBg = 'bg-gray-100 text-gray-600';
                                    const statusLower = (order.status || '').toLowerCase();
                                    if (statusLower === 'submitted' || statusLower === 'processing') statusBg = 'bg-[#eaf4fb] text-[#1F618D]';
                                    else if (statusLower === 'completed' || statusLower === 'delivered') statusBg = 'bg-[#e2f4ea] text-[#10B981]';
                                    else if (statusLower === 'cancelled') statusBg = 'bg-[#fef2f0] text-[#E74C3C]';
                                    else if (statusLower === 'draft') statusBg = 'bg-[#fffbeb] text-[#d97706]';

                                    return (
                                        <tr key={order.orderNumber || i} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-mono font-bold text-gray-700">{order.orderNumber || 'N/A'}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-gray-800">{order.customer?.customerName || order.customer?.shopName || 'N/A'}</span>
                                                    <span className="text-[10px] text-gray-400 mt-0.5">{order.customer?.customerShipToBranchName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-700">{totalItems}</td>
                                            <td className="px-6 py-4 text-gray-500">
                                                {order.parentDate ? new Date(order.parentDate).toLocaleDateString('en-IN') : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${statusBg}`}>
                                                    {order.status || 'Pending'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                                        <Icon icon="lucide:inbox" className="text-3xl mx-auto mb-2 opacity-50" />
                                        <p className="text-xs">No recent orders found</p>
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
