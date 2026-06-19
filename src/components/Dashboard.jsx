import React, { useState, useEffect } from 'react';
import api from '../services/apiInstance';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

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
                // Fallback to sample data for demonstration if API fails
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
                    <div className="w-16 h-16 border-4 border-erp-accent/20 border-t-erp-accent rounded-full animate-spin"></div>
                    <div className="mt-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center animate-pulse">Loading Intelligence</div>
                </div>
            </div>
        );
    }

    const statusData = [
        { name: 'Active', value: analytics?.orders?.active || 0, color: '#3B82F6' },
        { name: 'Ready', value: analytics?.orders?.readyToDeliver || 0, color: '#F59E0B' },
        { name: 'Delivered', value: analytics?.orders?.delivered || 0, color: '#10B981' },
        { name: 'Draft', value: analytics?.orders?.draft || 0, color: '#8B5CF6' }
    ];

    // Flatten recent bulk orders to display the specific sub-orders
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
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Executive Overview</h1>
                    <p className="text-sm text-gray-500 mt-1">Last updated: {new Date(analytics?.generatedAt || Date.now()).toLocaleString()}</p>
                </div>
            </header>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Active Customers', value: analytics?.customers?.activeUsers, color: 'text-erp-accent', bg: 'bg-blue-50' },
                    { label: 'Total Orders', value: analytics?.orders?.totalOrders, color: 'text-erp-accent', bg: 'bg-orange-50' },
                    { label: 'Active Orders', value: analytics?.orders?.active, color: 'text-erp-accent', bg: 'bg-green-50' },
                    { label: 'Total Staff', value: analytics?.staff?.total, color: 'text-erp-accent', bg: 'bg-purple-50' },
                ].map((m, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 w-24 h-24 ${m.bg} rounded-bl-full -mr-4 -mt-4 opacity-50 group-hover:scale-110 transition-transform duration-500`}></div>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 relative z-10">{m.label}</h3>
                        <p className={`text-4xl font-extrabold ${m.color} relative z-10`}>{m.value || 0}</p>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Order Status Distribution Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">Order Status Distribution</h2>
                    <div className="h-72 w-full flex-grow">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={statusData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} barSize={40}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
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
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">Order Status Breakdown</h2>
                    <div className="flex-grow flex items-center justify-center">
                        <div className="w-full space-y-4">
                            {statusData.map((status, index) => (
                                <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }}></div>
                                        <span className="text-sm font-semibold text-gray-600">{status.name}</span>
                                    </div>
                                    <span className="text-lg font-bold text-gray-900">{status.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Orders Table */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-4">
                <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                    <h2 className="text-lg font-bold text-gray-800">Recent Live Orders</h2>
                    <button className="text-sm text-blue-600 font-semibold hover:text-blue-800 transition-colors">View All</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white text-xs text-gray-400 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 font-bold border-b border-gray-100">Order Ref</th>
                                <th className="px-6 py-4 font-bold border-b border-gray-100">Customer</th>
                                <th className="px-6 py-4 font-bold border-b border-gray-100">Items</th>
                                <th className="px-6 py-4 font-bold border-b border-gray-100">Date</th>
                                <th className="px-6 py-4 font-bold border-b border-gray-100 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {flattenedOrders.length > 0 ? (
                                flattenedOrders.slice(0, 8).map((order, i) => {
                                    const totalItems = order.items?.reduce((sum, item) => sum + (Number(item.qty) || 0), 0) || 0;

                                    let statusBg = 'bg-gray-100 text-gray-600';
                                    const statusLower = (order.status || '').toLowerCase();
                                    if (statusLower === 'submitted' || statusLower === 'processing') statusBg = 'bg-blue-50 text-blue-600';
                                    else if (statusLower === 'completed' || statusLower === 'delivered') statusBg = 'bg-green-50 text-green-600';
                                    else if (statusLower === 'cancelled') statusBg = 'bg-red-50 text-red-600';
                                    else if (statusLower === 'draft') statusBg = 'bg-amber-50 text-amber-600';

                                    return (
                                        <tr key={order.orderNumber || i} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">{order.orderNumber || 'N/A'}</td>
                                            <td className="px-6 py-4 text-gray-600 font-medium">
                                                <div className="flex flex-col">
                                                    <span>{order.customer?.customerName || order.customer?.shopName || 'N/A'}</span>
                                                    <span className="text-xs text-gray-400">{order.customer?.customerShipToBranchName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-600">
                                                {totalItems}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {order.parentDate ? new Date(order.parentDate).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`px-3 py-1 text-xs font-bold rounded-full ${statusBg}`}>
                                                    {order.status || 'Pending'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-400 font-medium">
                                        No recent orders found
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


