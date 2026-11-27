// Feature Deep-Dive Guides and FAQs for Dr. Specs Hub Modal

export const FEATURE_GUIDES = [
    {
        id: 'matrix_order',
        title: 'Lens Matrix Quick Order (Smart Grouping)',
        category: 'Orders',
        icon: 'lucide:grid-3x3',
        color: 'from-emerald-500 to-teal-600',
        shortDesc: 'Multi-quadrant power grid me direct quantities bhero, contiguous powers auto-group ho jati hain.',
        fullExplanation: [
            '1. Order Wizard me lens row par "Lens Combination Selection" ya "Edit in Matrix Modal" click karein.',
            '2. Modal me 4 quadrants khulte hain: SPH(+) CYL(+), SPH(-) CYL(+), SPH(+) CYL(-), SPH(-) CYL(-).',
            '3. Har cell ke andar current stock preview aur unit price dikhta hai. Sidha quantity (+ / -) enter karein.',
            '4. "Add Selected to Order" dabate hi system same SPH aur price break wali adjacent powers ko single range me merge kar deta hai (e.g. SPH 0.00 / CYL +0.25 to +0.50).',
            '5. Invoice neat rehti hai aur backend me granular SKU deduction 100% accurate rehta hai!'
        ],
        keywords: ['matrix', 'quick order', 'grid', 'lens combinations', 'power table'],
        actionRoute: '/new-order',
        actionLabel: 'Try in Order Wizard',
    },
    {
        id: 'rx_wizard',
        title: 'Rx Prescription & Lens Customization',
        category: 'Orders',
        icon: 'lucide:file-text',
        color: 'from-blue-500 to-indigo-600',
        shortDesc: 'Right/Left eye optical powers, prism, fitting height, tints & coatings ka complete engine.',
        fullExplanation: [
            '1. Order Wizard me Rx Prescription toggle karein ya single vision / progressive select karein.',
            '2. R (Right Eye) aur L (Left Eye) ke SPH, CYL, Axis, ADD aur Prism values daalein.',
            '3. Fitting height, Pupillary Distance (PD), corridor aur diameter customize karein.',
            '4. Hard Coat, ARC (Anti-reflective), Blue Cut ya Tint color select karein.',
            '5. Real-time tax (GST), discounts aur customer credit advance calculate hota hai.'
        ],
        keywords: ['rx', 'prescription', 'sph', 'cyl', 'axis', 'add', 'progressive', 'bifocal'],
        actionRoute: '/new-order',
        actionLabel: 'New Rx Order',
    },
    {
        id: 'bulk_inventory',
        title: 'Bulk Excel Lens Manager & Pricing',
        category: 'Inventory',
        icon: 'lucide:table-2',
        color: 'from-amber-500 to-orange-600',
        shortDesc: 'Hazaron lens combinations ka stock aur buying/selling price Excel se mass-update karein.',
        fullExplanation: [
            '1. Inventory module me "Bulk Lens Excel Matrix Manager" kholein.',
            '2. Product select karke "Export SPH/CYL Matrix Excel (.xlsx)" download karein.',
            '3. Excel sheet me required quantities ya selling/buying prices update karke save karein.',
            '4. "Upload & Update" button par excel drop karein. System audit log create karke instant update kar dega.',
            '5. History tab me sabhi past updates aur price events record rehte hain.'
        ],
        keywords: ['inventory', 'excel', 'matrix manager', 'bulk update', 'stock', 'pricing'],
        actionRoute: '/inventory',
        actionLabel: 'Go to Inventory',
    },
    {
        id: 'customer_ledger',
        title: 'Customer Ledger Statement & Credit Risk',
        category: 'Finance',
        icon: 'lucide:credit-card',
        color: 'from-rose-500 to-pink-600',
        shortDesc: 'Live credit limit monitoring, 30-day window, invoice history aur payment settlements.',
        fullExplanation: [
            '1. Customer Profile me jakar "Customer Ledger Statement" kholein.',
            '2. Net Position (Total Invoiced, Total Received, Advance Available, Current Due) top par dikhegi.',
            '3. Credit limit bar dikhata hai ki kitna percent credit use hua hai aur kitna safe limit bacha hai.',
            '4. "Receive Payment" se instant partial/full payment enter karke balance adjust karein.',
            '5. "Download Statement" ya "Send Reminder" se WhatsApp/PDF export karein.'
        ],
        keywords: ['customer', 'ledger', 'statement', 'credit limit', 'payment', 'due balance'],
        actionRoute: '/customer/list',
        actionLabel: 'Customer List',
    },
    {
        id: 'lab_operations',
        title: 'Lab Process & Dispatch Tracking',
        category: 'Operations',
        icon: 'lucide:truck',
        color: 'from-purple-500 to-violet-600',
        shortDesc: 'Order confirmation se Surfacing, Coating, QC aur Barcode Dispatch tak pura pipeline.',
        fullExplanation: [
            '1. Order place hone par Operations pipeline me status update hota hai.',
            '2. Surfacing Lab: Blank lens cutting aur curve generation.',
            '3. Coating & Tint Lab: Hard coat, anti-scratch aur anti-glare treatment.',
            '4. QC (Quality Check): Lens power accuracy check with digital lensometer.',
            '5. Final Dispatch: Courier barcode scan karke packaging aur customer dispatch slip attach hoti hai.'
        ],
        keywords: ['lab', 'operations', 'qc', 'dispatch', 'barcode', 'surfacing', 'fitting'],
        actionRoute: '/orders/all',
        actionLabel: 'View Orders Pipeline',
    }
];

export const CONTEXTUAL_PAGE_TIPS = {
    '/': {
        title: 'Executive Dashboard Tip 🚀',
        tip: 'Top metric cards par click karke aap direct filtered orders list par jump kar sakte hain!'
    },
    '/new-order': {
        title: 'Order Wizard Pro Tip ⚡',
        tip: 'Matrix Selection button se hazaron lens powers ko visual grid me select karein! System same price wali contiguous powers ko auto-merge kar deta hai.'
    },
    '/inventory': {
        title: 'Inventory Manager Tip 📦',
        tip: 'Bulk price updates ke liye Excel export feature ka upyog karein. Sheet update karke drop karte hi hazaron SKUs 2 second me sync ho jate hain!'
    },
    '/customer/list': {
        title: 'Customer Financials Tip 💳',
        tip: 'Customer row par "Statement" button dabane se live ledger khulta hai jisme 30-day payment risk analysis milta hai.'
    },
    '/orders/all': {
        title: 'Order Tracking Tip 🔍',
        tip: 'Table ke upar quick status tabs (Processing, QC, Ready to Dispatch) se orders ko batch me filter karein.'
    }
};
