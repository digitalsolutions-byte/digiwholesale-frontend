import React from 'react';
import Input from '../ui/Input';
import Select from '../ui/Select';

export const ContactInformation = ({ wrapInput, configs }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {wrapInput(Input, { label: 'Name Of Proprietor/Partner*', name: 'ownerName', placeholder: 'Enter Name Of Proprietor/Partner' })}
            {wrapInput(Input, { label: 'Mobile No. 1*', name: 'mobileNo1', placeholder: 'Enter Mobile No. 1' })}
            {wrapInput(Input, { label: 'Mobile No. 2', name: 'mobileNo2', placeholder: 'Enter Mobile No. 2' })}
            {wrapInput(Input, { label: 'Official Email', name: 'businessEmail', placeholder: 'Enter Official Email' })}

            {wrapInput(Select, {
                label: 'Zone*',
                name: 'zoneRefId',
                options: (Array.isArray(configs.zones) ? configs.zones : []).map(z => ({ value: z._id, label: z.zone }))
            })}

            {wrapInput(Select, {
                label: 'Select Sales Person*',
                name: 'salesPersonRefId',
                options: (configs.salesPersons || []).map(s => ({ value: s._id, label: s.employeeName || s.name }))
            })}
        </div>
    );
};


