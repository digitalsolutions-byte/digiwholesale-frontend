import { useState } from "react";
import { toast } from "react-toastify";
import * as vendorService from "../../services/vendorService";
import { useDispatch } from "react-redux";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";
import { Icon } from "@iconify/react";

const inputCls = "w-full px-5 py-3 text-sm border border-gray-100 rounded-[1.2rem] outline-none focus:border-erp-accent/30 focus:ring-4 focus:ring-erp-accent/5 hover:border-erp-accent/20 bg-gray-50/50 text-gray-700 transition-all placeholder:text-gray-300";
const labelCls = "text-xs font-semibold text-gray-500 block mb-2 ml-2";

const Field = ({ label, icon, error, children }) => (
    <div className="flex flex-col">
        <label className={labelCls}>
            <span className="flex items-center gap-2">
                {icon && <Icon icon={icon} className="text-sm text-erp-accent/60" />}
                {label}
            </span>
        </label>
        {children}
        {error && <p className="text-xs text-red-500 mt-1.5 ml-2">{error}</p>}
    </div>
);

const EMPTY = { name: "", firm: "", mobile: "", email: "", address: "", gstNumber: "", paymentTerms: "", notes: "" };

export default function AddVendor() {
    const [formData, setFormData] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setErrors(prev => ({ ...prev, [e.target.name]: "" }));
    };

    const validate = () => {
        const { name, firm, mobile, email } = formData;
        const err = {};
        if (!name) err.name = "Name is required";
        if (!firm) err.firm = "Firm name is required";
        if (!mobile) err.mobile = "Mobile number is required";
        if (!email) err.email = "Email is required";
        if (email && !/\S+@\S+\.\S+/.test(email)) err.email = "Invalid email address";
        if (mobile && !/^[6-9]\d{9}$/.test(mobile)) err.mobile = "Enter a valid 10-digit mobile number";
        setErrors(err);
        return Object.keys(err).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        try {
            setLoading(true);
            dispatch(showLoader());
            const res = await vendorService.createVendor(formData);
            toast.success(res.data.message);
            setFormData(EMPTY);
            setErrors({});
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong");
        } finally {
            setLoading(false);
            dispatch(hideLoader());
        }
    };

    const handleReset = () => { setFormData(EMPTY); setErrors({}); };

    return (
        <div className="p-6 max-w-7xl mx-auto h-full flex flex-col animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Icon icon="mdi:account-plus" className="text-erp-accent" />
                        Add Vendor
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Fill details to add vendor</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 overflow-hidden flex flex-col">
                <form onSubmit={handleSubmit} noValidate className="flex flex-col h-full">
                    <div className="p-6 overflow-y-auto flex-1">
                        {/* Section label */}
                         <div className="flex items-center gap-3 mb-6">
                            <div className="w-1.5 h-6 bg-erp-accent rounded-full" />
                            <span className="text-sm font-bold text-gray-700">Vendor Details</span>
                        </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">

                                <Field label="Name *" icon="mdi:account-outline" error={errors.name}>
                                    <input
                                        name="name" value={formData.name} onChange={handleChange}
                                        placeholder="Full name"
                                        className={`${inputCls} ${errors.name ? "border-red-200 bg-red-50/30" : ""}`}
                                    />
                                </Field>

                                <Field label="Firm Name *" icon="mdi:office-building-outline" error={errors.firm}>
                                    <input
                                        name="firm" value={formData.firm} onChange={handleChange}
                                        placeholder="Company / Shop name"
                                        className={`${inputCls} ${errors.firm ? "border-red-200 bg-red-50/30" : ""}`}
                                    />
                                </Field>

                                <Field label="Mobile *" icon="mdi:phone-outline" error={errors.mobile}>
                                    <input
                                        name="mobile" value={formData.mobile} onChange={handleChange}
                                        placeholder="10-digit primary mobile"
                                        maxLength={10}
                                        className={`${inputCls} ${errors.mobile ? "border-red-200 bg-red-50/30" : ""}`}
                                    />
                                </Field>

                                <Field label="Email *" icon="mdi:email-outline" error={errors.email}>
                                    <input
                                        type="email" name="email" value={formData.email} onChange={handleChange}
                                        placeholder="vendor@company.com"
                                        className={`${inputCls} ${errors.email ? "border-red-200 bg-red-50/30" : ""}`}
                                    />
                                </Field>

                                <Field label="GST Number" icon="mdi:card-account-details-outline">
                                    <input
                                        name="gstNumber" value={formData.gstNumber} onChange={handleChange}
                                        placeholder="22AAAAA0000A1Z5"
                                        className={inputCls}
                                    />
                                </Field>

                                <Field label="Payment Terms" icon="mdi:clock-outline">
                                    <select
                                        name="paymentTerms" value={formData.paymentTerms} onChange={handleChange}
                                        className={inputCls}
                                    >
                                        <option value="">Select terms</option>
                                        <option value="Immediate">Immediate</option>
                                        <option value="Net 7">Net 7 Days</option>
                                        <option value="Net 15">Net 15 Days</option>
                                        <option value="Net 30">Net 30 Days</option>
                                        <option value="Advance">Advance Payment</option>
                                    </select>
                                </Field>

                                <Field label="Address" icon="mdi:map-marker-outline">
                                    <input
                                        name="address" value={formData.address} onChange={handleChange}
                                        placeholder="Full location details"
                                        className={inputCls}
                                    />
                                </Field>

                                <Field label="Notes" icon="mdi:note-text-outline">
                                    <input
                                        name="notes" value={formData.notes} onChange={handleChange}
                                        placeholder="Any special instructions"
                                        className={inputCls}
                                    />
                                </Field>

                            </div>

                        </div>
                    <div className="bg-gray-50/50 p-6 border-t border-gray-100 flex items-center justify-end gap-4 mt-auto">
                        <button type="button" onClick={handleReset}
                            className="px-8 py-3 rounded-full text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all">
                            Clear
                        </button>
                        <button type="submit" disabled={loading}
                            className="bg-erp-accent text-white px-10 py-3 rounded-full text-sm font-bold flex items-center gap-3 hover:bg-erp-accent/90 transition-all shadow-lg shadow-erp-accent/20 active:scale-95 disabled:opacity-70 disabled:active:scale-100 group">
                            {loading ? <Icon icon="mdi:loading" className="animate-spin text-xl" /> : <Icon icon="mdi:check-all" className="text-xl group-hover:scale-110 transition-transform" />}
                            {loading ? "Saving..." : "Save Vendor"}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
