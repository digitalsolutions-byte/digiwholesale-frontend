import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { updateCustomerContact } from '../../services/customerService';
import { toast } from 'react-toastify';

export default function UpdateCustomerContactModal({ isOpen, onClose, customer, onSuccess }) {
  const [businessEmail, setBusinessEmail] = useState('');
  const [mobileNo1, setMobileNo1] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer) {
      setBusinessEmail(customer.businessEmail || customer.emailId || customer.email || '');
      setMobileNo1(customer.mobileNo1 || customer.phone || customer.mobile || '');
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!businessEmail) return toast.error('Business Email is required');
    if (!mobileNo1) return toast.error('Mobile Number is required');

    setLoading(true);
    try {
      const payload = { businessEmail, mobileNo1 };
      const res = await updateCustomerContact(customer._id, payload);
      if (res?.success || res?.status === 200 || res?.message) {
        toast.success(res?.message || 'Customer contact updated successfully');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.success('Customer contact updated successfully');
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update contact');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5 border border-gray-100 scale-in-center">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-erp-accent/10 text-erp-accent">
              <Icon icon="mdi:phone-edit" className="text-xl" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800">Update Customer Contact</h3>
              <p className="text-xs text-gray-400 font-medium">{customer.shopName || customer.ownerName || 'Customer'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Icon icon="mdi:close" className="text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              Business Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={businessEmail}
              onChange={(e) => setBusinessEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-erp-accent transition-colors"
              placeholder="e.g. email@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              Mobile No. 1 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={mobileNo1}
              onChange={(e) => setMobileNo1(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-erp-accent transition-colors"
              placeholder="e.g. 9999999999"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-erp-accent text-white hover:bg-erp-accent/90 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-md shadow-erp-accent/20"
            >
              {loading && <Icon icon="mdi:loading" className="animate-spin text-sm" />}
              Update Contact
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
