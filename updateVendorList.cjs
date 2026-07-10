const fs = require('fs');
const path = 'd:/DigiBySR/Wholesale-MVP/src/pages/vendor/VendorList.jsx';

let content = fs.readFileSync(path, 'utf8');

// 1. State and helper functions
const oldState = `    const emptyRow = { productCode: "", category: "", productName: "", quantity: 1, price: "", gstPercent: "0", expectedDate: "" };
    const [orderRows, setOrderRows] = useState([emptyRow]);

    const handleAddRow = () => setOrderRows(prev => [...prev, emptyRow]);
    const handleRemoveRow = (i) => setOrderRows(prev => prev.filter((_, idx) => idx !== i));
    const handleChangeRow = (i, field, val) => setOrderRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
    const handleClearOrder = () => { setOrderRows([emptyRow]); setNotes(""); };`;

const newState = `    const emptyRow = { productCode: "", category: "", productName: "", quantity: 1, price: "", gstPercent: "0", expectedDate: "" };
    const [activeTab, setActiveTab] = useState('lens');
    const [lensOrderRows, setLensOrderRows] = useState([emptyRow]);
    const [frameOrderRows, setFrameOrderRows] = useState([emptyRow]);

    const activeRows = activeTab === 'lens' ? lensOrderRows : frameOrderRows;
    const setActiveRows = activeTab === 'lens' ? setLensOrderRows : setFrameOrderRows;

    const handleAddRow = () => setActiveRows(prev => [...prev, emptyRow]);
    const handleRemoveRow = (i) => setActiveRows(prev => prev.filter((_, idx) => idx !== i));
    const handleChangeRow = (i, field, val) => setActiveRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
    const handleClearOrder = () => { setLensOrderRows([emptyRow]); setFrameOrderRows([emptyRow]); setNotes(""); };`;

content = content.replace(oldState, newState);

// 2. handleSubmitOrder
const oldSubmit = `    const handleSubmitOrder = async () => {
        if (!selectedVendor || (!selectedVendor._id && !selectedVendor.vendorNumber)) {
            toast.error("Please select a vendor");
            return;
        }
        if (!orderRows || orderRows.length === 0) { toast.error("Please add at least one product"); return; }
        for (let i = 0; i < orderRows.length; i++) {
            const r = orderRows[i];
            if (!r.productCode) { toast.error(\`Row \${i + 1}: Product Code is required\`); return; }
            if (!r.category) { toast.error(\`Row \${i + 1}: Category is required\`); return; }
            if (!r.productName) { toast.error(\`Row \${i + 1}: Product Name is required\`); return; }
            if (!r.quantity || Number(r.quantity) <= 0) { toast.error(\`Row \${i + 1}: Quantity must be greater than 0\`); return; }
            if (!r.price || Number(r.price) <= 0) { toast.error(\`Row \${i + 1}: Price must be greater than 0\`); return; }
            if (!r.expectedDate) { toast.error(\`Row \${i + 1}: Expected Date is required\`); return; }
        }
        try {
            dispatch(showLoader());
            const data = await vendorOrderService.createVendorOrder({
                vendorId: selectedVendor._id || selectedVendor.vendorNumber,
                notes,
                items: orderRows.map(r => ({`;

const newSubmit = `    const handleSubmitOrder = async () => {
        const allOrderRows = [...lensOrderRows, ...frameOrderRows].filter(r => r.productCode || r.category || r.productName || r.price);
        if (!selectedVendor || (!selectedVendor._id && !selectedVendor.vendorNumber)) {
            toast.error("Please select a vendor");
            return;
        }
        if (!allOrderRows || allOrderRows.length === 0) { toast.error("Please add at least one product"); return; }
        for (let i = 0; i < allOrderRows.length; i++) {
            const r = allOrderRows[i];
            if (!r.productCode) { toast.error(\`Row \${i + 1}: Product Code is required\`); return; }
            if (!r.category) { toast.error(\`Row \${i + 1}: Category is required\`); return; }
            if (!r.productName) { toast.error(\`Row \${i + 1}: Product Name is required\`); return; }
            if (!r.quantity || Number(r.quantity) <= 0) { toast.error(\`Row \${i + 1}: Quantity must be greater than 0\`); return; }
            if (!r.price || Number(r.price) <= 0) { toast.error(\`Row \${i + 1}: Price must be greater than 0\`); return; }
            if (!r.expectedDate) { toast.error(\`Row \${i + 1}: Expected Date is required\`); return; }
        }
        try {
            dispatch(showLoader());
            const data = await vendorOrderService.createVendorOrder({
                vendorId: selectedVendor._id || selectedVendor.vendorNumber,
                notes,
                items: allOrderRows.map(r => ({`;

content = content.replace(oldSubmit, newSubmit);

// 3. orderSummary
const oldSummary = `    // order summary
    const orderSummary = orderRows.reduce((acc, r) => {`;

const newSummary = `    // order summary
    const allOrderRows = [...lensOrderRows, ...frameOrderRows].filter(r => r.productCode || r.category || r.productName || r.price);
    const orderSummary = allOrderRows.reduce((acc, r) => {`;

content = content.replace(oldSummary, newSummary);

// 4. UI changes
// Render tabs and replace orderRows with activeRows in JSX
const oldBody = `                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6 bg-gray-50/50 custom-scrollbar">
                            <div className="bg-white border border-gray-200 rounded-[1.5rem] shadow-sm overflow-hidden flex flex-col">`;

const newBody = `                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6 bg-gray-50/50 custom-scrollbar">
                            <div className="flex space-x-8 border-b border-gray-200 mb-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('lens')}
                                    className={\`py-3 px-2 text-[13px] font-black uppercase tracking-widest border-b-2 transition-colors \${activeTab === 'lens' ? 'border-[#2980B9] text-[#2980B9]' : 'border-transparent text-gray-400 hover:text-gray-600'}\`}
                                >
                                    Lens
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('frame')}
                                    className={\`py-3 px-2 text-[13px] font-black uppercase tracking-widest border-b-2 transition-colors \${activeTab === 'frame' ? 'border-[#2980B9] text-[#2980B9]' : 'border-transparent text-gray-400 hover:text-gray-600'}\`}
                                >
                                    Frame
                                </button>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-[1.5rem] shadow-sm overflow-hidden flex flex-col">`;

content = content.replace(oldBody, newBody);

// Replace "orderRows.map" with "activeRows.map"
content = content.replace(/orderRows\.map/g, 'activeRows.map');
// Replace "setOrderRows" inside JSX with "setActiveRows"
content = content.replace(/setOrderRows/g, 'setActiveRows');
// Replace "orderRows.filter" with "activeRows.filter"
content = content.replace(/orderRows\.filter/g, 'activeRows.filter');
// Replace "orderRows.length" with "activeRows.length"
content = content.replace(/orderRows\.length/g, 'activeRows.length');

// Note: setOrderRows in handleClearOrder, etc. will also be replaced if we are not careful, but we already replaced handleClearOrder in step 1.
// Since step 1 replaced the definition, any leftover setOrderRows will just be in JSX inline handlers like `ADD ROWS:`.
// So that replacement is safe and desired!

fs.writeFileSync(path, content, 'utf8');
console.log('Script executed successfully!');
