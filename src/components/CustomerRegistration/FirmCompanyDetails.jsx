import React from 'react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { FileUploadField } from './shared';

export const FirmCompanyDetails = ({ wrapInput, configs, formik, handleFileUpload, uploading, isReadOnlyMode }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
        {/* GST Selection */}
        {wrapInput(Select, {
            label: 'GST Type - Registered/Un-Registered*',
            name: 'gstTypeRefId',
            options: (configs.gstTypes || []).map(g => ({ value: g._id, label: g.name })),
            onChange: (e) => {
                const selected = configs.gstTypes.find(g => g._id === e.target.value);
                const prevType = formik.values.gstType?.toLowerCase();
                const nextType = (selected?.name || '').toLowerCase();

                formik.setFieldValue('gstTypeRefId', e.target.value);
                formik.setFieldValue('gstType', selected?.name || '');
                formik.setFieldValue('isGSTRegistered', nextType !== 'un-registered' && nextType !== 'unregistered');

                // Only reset fields that are definitely invalid in the new context
                if (prevType !== nextType) {
                    if (nextType === 'un-registered' || nextType === 'unregistered') {
                        // Switching TO Unregistered: clear GST specific fields
                        formik.setFieldValue('gstNumber', '');
                        formik.setFieldValue('gstCertificateImg', '');
                    } else {
                        // Switching TO Registered: clear Aadhar/PAN specific fields
                        formik.setFieldValue('aadharCard', '');
                        formik.setFieldValue('aadharCardImg', '');
                        formik.setFieldValue('panCard', '');
                        formik.setFieldValue('panCardImg', '');
                    }
                }
            }
        })}


        {(formik.values.gstType?.toLowerCase() !== 'un-registered' && formik.values.gstType?.toLowerCase() !== 'unregistered') ? (
            <>
                {wrapInput(Input, { label: 'Company/ Firm Name as per GST*', name: 'firmName', placeholder: 'Enter Firm Name' })}
                {wrapInput(Input, { label: 'Shop Name*', name: 'shopName', placeholder: 'Enter Shop Name' })}
                {wrapInput(Input, { label: 'Year of Establishment', name: 'yearOfEstablishment', placeholder: 'Enter Year of Est.' })}

                <FileUploadField
                    label="GST Number*"
                    name="gstNumber"
                    placeholder="Enter GST No."
                    onFileChange={(e) => handleFileUpload(e, 'gstCertificateImg', 'gst')}
                    uploading={uploading?.gst}
                    currentValue={formik.values.gstCertificateImg}
                    formik={formik}
                    wrapInput={wrapInput}
                    imgFieldName="gstCertificateImg"
                    isReadOnlyMode={isReadOnlyMode}
                    maxLength={15}
                    onChange={(e) => {
                        let val = e.target.value.toUpperCase();
                        val = val.replace(/[^A-Z0-9]/g, '');
                        formik.setFieldValue('gstNumber', val);
                    }}
                />
            </>
        ) : (
            <>
                {wrapInput(Input, { label: 'Shop Name*', name: 'shopName', placeholder: 'Enter Shop Name' })}
                {wrapInput(Input, { label: 'Year of Establishment', name: 'yearOfEstablishment', placeholder: 'Enter Year of Est.' })}
                <br />
                <FileUploadField
                    label="Aadhar Card No.*"
                    name="aadharCard"
                    placeholder="Enter Aadhar No."
                    onFileChange={(e) => handleFileUpload(e, 'aadharCardImg', 'aadhar')}
                    uploading={uploading?.aadhar}
                    currentValue={formik.values.aadharCardImg}
                    formik={formik}
                    wrapInput={wrapInput}
                    imgFieldName="aadharCardImg"
                    isReadOnlyMode={isReadOnlyMode}
                    maxLength={12}
                    onChange={(e) => {
                        let val = e.target.value.replace(/[^0-9]/g, '');
                        formik.setFieldValue('aadharCard', val);
                    }}
                />
                <FileUploadField
                    label="PAN Card No.*"
                    name="panCard"
                    placeholder="Enter PAN No."
                    onFileChange={(e) => handleFileUpload(e, 'panCardImg', 'pan')}
                    uploading={uploading?.pan}
                    currentValue={formik.values.panCardImg}
                    formik={formik}
                    wrapInput={wrapInput}
                    imgFieldName="panCardImg"
                    isReadOnlyMode={isReadOnlyMode}
                    maxLength={10}
                    onChange={(e) => {
                        let val = e.target.value.toUpperCase();
                        val = val.replace(/[^A-Z0-9]/g, '');
                        formik.setFieldValue('panCard', val);
                    }}
                />
            </>
        )}
    </div>
);


