import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import * as saleService from '../services/saleService';
import { getSettings } from '../services/configService';

const SALES_ITEMS = [
    "EYE TESTING",
    "CONTACT LENS SOLUTION",
    "LENS SPRAY",
    "CONTACT LENS CASE",
    "FRAME CHAIN",
    "SPECS CASE",
    "MISC",
    "OTHER",
    "FRAMES",
    "SUNGLASSES"
];

const OtherSales = () => {
    const [formData, setFormData] = useState({
        item: '',
        amount: '',
        quantity: 1,
        discount: 0,
        subtotal: 0,
        gstPercent: 0,
        gstType: 'Excluded',
        gstAmount: 0,
        totalAmount: 0,
        paymentMode: 'CASH'
    });
    const [settings, setSettings] = useState(null);

    // Fetch Settings
    useEffect(() => {
        const fetchSettingsData = async () => {
            try {
                const res = await getSettings();
                if (res?.success) {
                    setSettings(res.data?.settings || res.data);
                }
            } catch (err) {
                console.error("Failed to load settings", err);
            }
        };
        fetchSettingsData();
    }, []);

    // Calculate derived values whenever inputs change
    useEffect(() => {
        const amount = parseFloat(formData.amount) || 0;
        const quantity = parseInt(formData.quantity) || 1;
        const discount = parseFloat(formData.discount) || 0;
        const gstPercent = parseFloat(formData.gstPercent) || 0;

        let subtotal = (amount * quantity) - discount;
        if (subtotal < 0) subtotal = 0;

        let gstAmount = 0;
        let totalAmount = subtotal;

        if (formData.gstType === 'Excluded') {
            gstAmount = subtotal * (gstPercent / 100);
            totalAmount = subtotal + gstAmount;
        } else if (formData.gstType === 'Included') {
            gstAmount = subtotal - (subtotal / (1 + (gstPercent / 100)));
            totalAmount = subtotal;
        }

        setFormData(prev => ({
            ...prev,
            subtotal: subtotal.toFixed(2),
            gstAmount: gstAmount.toFixed(2),
            totalAmount: totalAmount.toFixed(2)
        }));
    }, [formData.amount, formData.quantity, formData.discount, formData.gstPercent, formData.gstType]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleReset = () => {
        setFormData({
            item: '',
            amount: '',
            quantity: 1,
            discount: 0,
            subtotal: 0,
            gstPercent: 0,
            gstType: 'Excluded',
            gstAmount: 0,
            totalAmount: 0,
            paymentMode: 'CASH'
        });
    };

    const handleSave = async () => {
        if (!formData.item || !formData.amount) {
            return toast.error("Please fill in required fields (Item, Amount).");
        }
        try {
            // Map the formData to whatever the API expects.
            // Using price for totalAmount or amount. Let's send the whole object.
            await saleService.createSale({
                item: formData.item,
                amount: parseFloat(formData.amount),
                qty: parseInt(formData.quantity),
                discount: parseFloat(formData.discount),
                subtotal: parseFloat(formData.subtotal),
                gstPercent: parseFloat(formData.gstPercent),
                gstType: formData.gstType,
                gstAmount: parseFloat(formData.gstAmount),
                totalAmount: parseFloat(formData.totalAmount),
                paymentMode: formData.paymentMode,
                price: parseFloat(formData.totalAmount) // adding price for compatibility if needed
            });
            toast.success("Sale recorded successfully");
            handleReset();
        } catch (err) {
            toast.error(err.message || "Failed to save sale");
        }
    };

    const inputClasses = "w-full px-4 py-3 text-sm text-gray-700 bg-gray-50/50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-erp-accent/50 focus:ring-4 focus:ring-erp-accent/10 transition-all";
    const labelClasses = "block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 flex items-center gap-1.5";

    return (
        <div className="w-full flex flex-col gap-6 animate-in fade-in duration-500">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Other Sales</h1>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-1">Record service or secondary sales</p>
                </div>
            </header>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 p-8">
                <div className="flex items-center gap-2 mb-8 border-l-[3px] border-erp-accent pl-3">
                    <h2 className="text-xs font-black text-gray-700 uppercase tracking-widest">Sale Details</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
                    {/* Row 1 */}
                    <div>
                        <label className={labelClasses}>
                            <Icon icon="mdi:package-variant" className="text-gray-400 text-lg" />
                            Item <span className="text-red-500">*</span>
                        </label>
                        <select name="item" value={formData.item} onChange={handleChange} className={inputClasses}>
                            <option value="">Select item</option>
                            {(settings?.allCategories || SALES_ITEMS).map((opt, idx) => (
                                <option key={idx} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className={labelClasses}>
                            Amount <span className="text-red-500">*</span>
                        </label>
                        <input type="number" name="amount" value={formData.amount} onChange={handleChange} className={inputClasses} placeholder="0.00" min="0" step="0.01" />
                    </div>

                    <div>
                        <label className={labelClasses}>
                            Quantity <span className="text-red-500">*</span>
                        </label>
                        <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} className={inputClasses} placeholder="1" min="1" />
                    </div>

                    <div>
                        <label className={labelClasses}>
                            Discount
                        </label>
                        <input type="number" name="discount" value={formData.discount} onChange={handleChange} className={inputClasses} placeholder="0.00" min="0" step="0.01" />
                    </div>

                    <div>
                        <label className={labelClasses}>
                            Subtotal
                        </label>
                        <input type="text" readOnly value={formData.subtotal} className={`${inputClasses} bg-gray-100 text-gray-800 cursor-not-allowed font-bold`} />
                    </div>

                    {/* Row 2 */}
                    <div>
                        <label className={labelClasses}>
                            GST %
                        </label>
                        <select name="gstPercent" value={formData.gstPercent} onChange={handleChange} className={inputClasses}>
                            {settings?.gst?.map((g) => (
                                <option key={g} value={g}>{g}%</option>
                            )) || (
                                <>
                                    <option value="0">0%</option>
                                    <option value="5">5%</option>
                                    <option value="12">12%</option>
                                    <option value="18">18%</option>
                                    <option value="28">28%</option>
                                </>
                            )}
                        </select>
                    </div>

                    <div>
                        <label className={labelClasses}>
                            GST Type
                        </label>
                        <select name="gstType" value={formData.gstType} onChange={handleChange} className={inputClasses}>
                            <option value="excluded">Excluded</option>
                            <option value="included">Included</option>
                        </select>
                    </div>

                    <div>
                        <label className={labelClasses}>
                            GST Amount
                        </label>
                        <input type="text" readOnly value={formData.gstAmount} className={`${inputClasses} bg-gray-100 text-gray-800 cursor-not-allowed font-bold`} />
                    </div>

                    <div>
                        <label className={labelClasses}>
                            Total Amount
                        </label>
                        <input type="text" readOnly value={formData.totalAmount} className={`${inputClasses} bg-gray-100 text-gray-800 cursor-not-allowed font-bold`} />
                    </div>

                    <div>
                        <label className={labelClasses}>
                            <Icon icon="mdi:credit-card-outline" className="text-gray-400 text-lg" />
                            Payment Mode
                        </label>
                        <select name="paymentMode" value={formData.paymentMode} onChange={handleChange} className={inputClasses}>
                            <option value="CASH">CASH</option>
                            <option value="CARD">CARD</option>
                            <option value="UPI">UPI</option>
                        </select>
                    </div>
                </div>

                <div className="pt-8 border-t border-gray-100 flex justify-end gap-4 mt-8">
                    <button type="button" onClick={handleReset} className="flex items-center gap-2 px-8 py-3 rounded-full border border-gray-200 text-gray-600 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all">
                        <Icon icon="mdi:refresh" className="text-xl" />
                        Reset
                    </button>
                    <button type="button" onClick={handleSave} className="flex items-center gap-2 px-10 py-3 rounded-full bg-erp-accent text-white text-[10px] font-black uppercase tracking-widest hover:bg-erp-accent/90 shadow-xl shadow-erp-accent/20 transition-all hover:-translate-y-0.5">
                        <Icon icon="mdi:content-save-outline" className="text-xl" />
                        Save Sale
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OtherSales;
