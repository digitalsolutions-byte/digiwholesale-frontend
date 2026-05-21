import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logOut, selectCurrentUser, selectIsSuperAdmin } from '../store/slices/authSlice';

const Dashboard = () => {
    const user = useSelector(selectCurrentUser);
    const isSuperAdmin = useSelector(selectIsSuperAdmin);
    const dispatch = useDispatch();

    const metrics = [
        { label: 'Pending Orders', value: '24', color: 'text-blue-600' },
        { label: 'Inventory (Lenses)', value: '1,250', color: 'text-green-600' },
        { label: 'Production Units', value: '142', color: 'text-erp-accent/90' },
    ];

    return (
        <div className="flex h-screen bg-gray-100 text-gray-800">
            {/* Sidebar */}
            <nav className="w-64 bg-erp-dark text-white flex flex-col p-6">
                <div className="text-2xl font-extrabold mb-10 text-erp-accent">DigiOptics ERP</div>
                <ul className="flex-grow space-y-2">
                    <li className="p-3 bg-gray-700 rounded cursor-pointer text-erp-accent font-semibold">Dashboard</li>
                    <li className="p-3 hover:bg-gray-700 rounded cursor-pointer transition-colors">Inventory</li>
                    <li className="p-3 hover:bg-gray-700 rounded cursor-pointer transition-colors">Production</li>
                    <li className="p-3 hover:bg-gray-700 rounded cursor-pointer transition-colors">Orders</li>
                    {isSuperAdmin && (
                        <li className="mt-6 pt-6 border-t border-gray-600 text-red-400 p-3 hover:bg-gray-700 rounded cursor-pointer transition-colors">
                            System Settings
                        </li>
                    )}
                </ul>
                <div className="mt-auto pt-6 border-t border-gray-600">
                    <div className="text-sm mb-2">{user} ({isSuperAdmin ? 'Admin' : 'User'})</div>
                    <button
                        onClick={() => dispatch(logOut())}
                        className="w-full py-2 px-4 border border-gray-400 text-gray-400 rounded hover:bg-red-600 hover:text-white hover:border-red-600 transition-all text-xs uppercase "
                    >
                        Logout
                    </button>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-grow p-8 overflow-y-auto">
                <header className="mb-10">
                    <h1 className="text-3xl font-bold text-erp-dark">Lens Manufacturing Overview</h1>
                </header>

                {/* Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    {metrics.map(m => (
                        <div key={m.label} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase  mb-2">{m.label}</h3>
                            <p className={`text-3xl font-bold ${m.color}`}>{m.value}</p>
                        </div>
                    ))}
                </div>

                {/* Production Table */}
                <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-xl font-bold text-erp-dark">Live Production Pipeline</h2>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Batch ID</th>
                                <th className="px-6 py-4 font-semibold">Lens Type</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold">Capacity</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            <tr>
                                <td className="px-6 py-4 font-medium">#9912</td>
                                <td className="px-6 py-4">Progressive (HD)</td>
                                <td className="px-6 py-4">
                                    <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full">Polishing</span>
                                </td>
                                <td className="px-6 py-4 font-semibold text-gray-600">85%</td>
                            </tr>
                            <tr>
                                <td className="px-6 py-4 font-medium">#9913</td>
                                <td className="px-6 py-4">Single Vision</td>
                                <td className="px-6 py-4">
                                    <span className="px-3 py-1 bg-erp-accent/5 text-erp-accent/90 text-xs font-bold rounded-full">Cutting</span>
                                </td>
                                <td className="px-6 py-4 font-semibold text-gray-600">40%</td>
                            </tr>
                            <tr>
                                <td className="px-6 py-4 font-medium">#9914</td>
                                <td className="px-6 py-4">Bifocal</td>
                                <td className="px-6 py-4">
                                    <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded-full">Pending</span>
                                </td>
                                <td className="px-6 py-4 font-semibold text-gray-600">0%</td>
                            </tr>
                        </tbody>
                    </table>
                </section>

                {isSuperAdmin && (
                    <section className="mt-10 p-6 bg-red-50 border border-red-100 rounded-xl">
                        <h2 className="text-xl font-bold text-red-800 mb-4">SuperAdmin Control Panel</h2>
                        <div className="flex gap-4">
                            <button className="bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-md">
                                Manage Staff
                            </button>
                            <button className="bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-md">
                                Inventory Restock
                            </button>
                            <button className="bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-md">
                                View Audit Logs
                            </button>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
};

export default Dashboard;


