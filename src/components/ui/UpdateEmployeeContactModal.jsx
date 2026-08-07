import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { updateEmployeeContact } from '../../services/employeeService';
import { toast } from 'react-toastify';

export default function UpdateEmployeeContactModal({ isOpen, onClose, employee, onSuccess }) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (employee) {
      setEmail(employee.email || employee.businessEmail || '');
      setPhone(employee.phone || employee.mobileNo1 || employee.mobile || '');
    }
  }, [employee]);

  if (!isOpen || !employee) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Email is required');
    if (!phone) return toast.error('Phone is required');

    setLoading(true);
    try {
      const payload = { email, phone };
      const res = await updateEmployeeContact(employee._id, payload);
      if (res?.success || res?.status === 200 || res?.message) {
        toast.success(res?.message || 'Employee contact updated successfully');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.success('Employee contact updated successfully');
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
              <h3 className="text-base font-bold text-gray-800">Update Employee Contact</h3>
              <p className="text-xs text-gray-400 font-medium">{employee.name || employee.username || 'Employee'}</p>
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
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-erp-accent transition-colors"
              placeholder="e.g. email@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-erp-accent transition-colors"
              placeholder="e.g. 9456123456"
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
