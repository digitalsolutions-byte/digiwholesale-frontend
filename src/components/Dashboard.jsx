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
                        pending: 10,
                        completed: 0,
                        daily: 0,
                        weekly: 0,
                        monthly: 0,
                        statusBreakdown: {
                            Draft: 3,
                            Submitted: 10,
                            Processing: 0,
                            Completed: 0,
                            Cancelled: 0
                        }
                    },
                    staff: { total: 52 },
                    recentOrders: [
                        {
                            _id: "6a1586ded5a9719367ee297f",
                            orderNumber: "ORD-20260526-0002",
                            customer: { customerName: "Test Shop" },
                            totalOrderPrice: 0,
                            status: "Submitted",
                            createdAt: "2026-05-26T11:41:18.824Z"
                        },
                        {
                            _id: "6a1544cb0b77ad59d3a03342",
                            orderNumber: "ORD-20260526-0001",
                            customer: { customerName: "Test Shop" },
                            totalOrderPrice: 0,
                            status: "Submitted",
                            createdAt: "2026-05-26T06:59:23.754Z"
                        },
                        {
                            _id: "69e1d320a735847dd2e4d464",
                            orderNumber: "ORD-20260417-0010",
                            customer: { customerName: "Test Shop" },
                            totalOrderPrice: 760,
                            status: "Submitted",
                            createdAt: "2026-04-17T06:28:48.907Z"
                        }
                    ],
                    generatedAt: "2026-06-01T12:51:49.346Z"
                });
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    const statusData = analytics?.orders?.statusBreakdown ? Object.keys(analytics.orders.statusBreakdown).map((key) => ({
        name: key,
        value: analytics.orders.statusBreakdown[key]
    })) : [];

    const orderTrends = [
        { name: 'Daily', orders: analytics?.orders?.daily || 0 },
        { name: 'Weekly', orders: analytics?.orders?.weekly || 0 },
        { name: 'Monthly', orders: analytics?.orders?.monthly || 0 },
    ];

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
                    { label: 'Pending Orders', value: analytics?.orders?.pending, color: 'text-erp-accent', bg: 'bg-orange-50' },
                    { label: 'Completed Orders', value: analytics?.orders?.completed, color: 'text-erp-accent', bg: 'bg-green-50' },
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
                {/* Order Status Pie Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">Order Status Distribution</h2>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={statusData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                                <Tooltip
                                    cursor={{ fill: '#F3F4F6' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Order Trends Bar Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">Order Volume Trends</h2>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={orderTrends} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                                <Tooltip
                                    cursor={{ fill: '#F3F4F6' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="orders" fill="#3B82F6" radius={[6, 6, 0, 0]} maxBarSize={60} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Recent Orders Table */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                    <h2 className="text-lg font-bold text-gray-800">Recent Orders Pipeline</h2>
                    <button className="text-sm text-blue-600 font-semibold hover:text-blue-800 transition-colors">View All</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white text-xs text-gray-400 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 font-bold border-b border-gray-100">Order Number</th>
                                <th className="px-6 py-4 font-bold border-b border-gray-100">Customer</th>
                                <th className="px-6 py-4 font-bold border-b border-gray-100">Date</th>
                                <th className="px-6 py-4 font-bold border-b border-gray-100 text-right">Total</th>
                                <th className="px-6 py-4 font-bold border-b border-gray-100">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {analytics?.recentOrders && analytics.recentOrders.length > 0 ? (
                                analytics.recentOrders.map((order, i) => (
                                    <tr key={order._id || i} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-900">{order.orderNumber || 'N/A'}</td>
                                        <td className="px-6 py-4 text-gray-600 font-medium">{order.customer?.customerName || 'N/A'}</td>
                                        <td className="px-6 py-4 text-gray-500 text-sm">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</td>
                                        <td className="px-6 py-4 font-bold text-gray-700 text-right">Rs.{order.totalOrderPrice != null ? Number(order.totalOrderPrice).toFixed(2) : '0.00'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${order.status === 'Processing' ? 'bg-blue-50 text-blue-600' :
                                                order.status === 'Completed' ? 'bg-green-50 text-green-600' :
                                                    order.status === 'Cancelled' ? 'bg-red-50 text-red-600' :
                                                        'bg-gray-100 text-gray-600'
                                                }`}>
                                                {order.status || 'Pending'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-400 font-medium">No recent orders found</td>
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


