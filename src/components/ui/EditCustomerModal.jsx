import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '../../routes/paths';

/**
 * EditCustomerModal
 * Automatically delegates to the full registration workflow in edit mode:
 * /customer/register?customerId=${customer._id}&mode=edit
 * Ensures 100% field, document, and workflow parity with customer registration.
 */
export default function EditCustomerModal({ isOpen, onClose, customer }) {
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen && customer?._id) {
            if (onClose) onClose();
            navigate(`${PATHS.CUSTOMER.REGISTER}?customerId=${customer._id}&mode=edit`);
        }
    }, [isOpen, customer?._id, navigate, onClose]);

    return null;
}
