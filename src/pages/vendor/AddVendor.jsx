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
        <div className="w-full animate-in fade-in duration-500">
            <div className="w-full">
                <form onSubmit={handleSubmit} noValidate>
                    <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-erp-accent/5 border border-gray-100 overflow-hidden">

                        {/* Header Section */}
                        <div className="bg-erp-accent p-8 text-white relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                                        <Icon icon="mdi:account-plus" className="text-2xl" />
                                    </div>
                                    <div>
                                        <h1 className="text-xl font-bold">Add Vendor</h1>
                                        <p className="text-xs text-white/80">Fill details to add vendor</p>
                                    </div>
                                </div>
                            </div>
                            {/* Decorative background circles */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
                            <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full mr-16 -mb-16" />
                        </div>

                        <div className="p-10">
                            {/* Section label */}
                             <div className="flex items-center gap-3 mb-8">
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

                            {/* Footer Actions */}
                            <div className="flex items-center justify-end gap-4 mt-16 pt-8 border-t border-gray-50">
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="flex items-center gap-2 px-8 py-3 text-sm font-semibold text-gray-400 hover:text-erp-accent hover:bg-erp-accent/5 rounded-full transition-all duration-300 group"
                                >
                                    <Icon icon="mdi:refresh" className="text-lg group-hover:rotate-180 transition-transform duration-700" /> Reset
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex items-center gap-3 px-10 py-4 bg-erp-accent hover:bg-erp-accent/90 text-white text-sm font-bold rounded-full transition-all shadow-xl shadow-erp-accent/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                                >
                                    {loading
                                        ? <><Icon icon="mdi:loading" className="text-xl animate-spin" /> Saving...</>
                                        : <><Icon icon="mdi:content-save" className="text-xl" /> Save</>
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
