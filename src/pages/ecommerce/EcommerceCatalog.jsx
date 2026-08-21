import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import api from '../../services/apiInstance';
import { PATHS } from '../../routes/paths';

const EcommerceCatalog = ({ defaultCategory }) => {
    const location = useLocation();
    const navigate = useNavigate();

    // Determine initial active category from route or props
    const initialCategory = useMemo(() => {
        if (defaultCategory) return defaultCategory;
        if (location.pathname.includes('/sunglasses')) return 'SUNGLASS';
        if (location.pathname.includes('/frames')) return 'FRAME';
        return 'ALL';
    }, [location.pathname, defaultCategory]);

    const [activeTab, setActiveTab] = useState(initialCategory);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters & layout state
    const [search, setSearch] = useState('');
    const [selectedBrand, setSelectedBrand] = useState('ALL');
    const [selectedShape, setSelectedShape] = useState('ALL');
    const [inStockOnly, setInStockOnly] = useState(false);
    const [sortBy, setSortBy] = useState('NEWEST');
    const [gridCols, setGridCols] = useState(2); // 2 or 3 cards per row

    // Currently selected product for Model Details center panel
    const [selectedProduct, setSelectedProduct] = useState(null);

    // Quantities selected per color in Model Details table (key: colorId or colorName -> qty)
    const [colorQuantities, setColorQuantities] = useState({});

    // Cart items state array
    const [cart, setCart] = useState([]);

    // Mobile Cart & Mobile Model Details visibility
    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
    const [isMobileDetailsOpen, setIsMobileDetailsOpen] = useState(false);

    // Pagination state
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        totalPages: 1,
        totalProducts: 0,
        hasMore: false,
    });

    // Sync tab when route changes
    useEffect(() => {
        if (location.pathname.includes('/sunglasses')) {
            setActiveTab('SUNGLASS');
        } else if (location.pathname.includes('/frames')) {
            setActiveTab('FRAME');
        }
    }, [location.pathname]);

    // Fetch products from API: GET /api/digi/product/frames-sunglasses?page=1&limit=10
    const fetchProducts = async (page = 1, categoryFilter = activeTab, searchQuery = search) => {
        setLoading(true);
        try {
            const params = { page, limit: 10 };
            if (searchQuery && searchQuery.trim()) params.search = searchQuery.trim();
            if (categoryFilter && categoryFilter !== 'ALL') params.category = categoryFilter;

            const res = await api.get('/api/digi/product/frames-sunglasses', { params });
            const data = res.data;

            let prods = [];
            if (Array.isArray(data.products)) prods = data.products;
            else if (Array.isArray(data.data)) prods = data.data;
            else if (Array.isArray(data.items)) prods = data.items;

            setProducts(prods);

            const totalItems = data.totalProducts ?? data.total ?? prods.length;
            const computedPages = data.totalPages || Math.ceil(totalItems / 10) || 1;

            setPagination({
                page: data.page || page,
                limit: data.limit || 10,
                totalPages: computedPages,
                totalProducts: totalItems,
                hasMore: data.hasMore ?? ((data.page || page) < computedPages),
            });
        } catch (err) {
            console.error('Failed to fetch frames-sunglasses products:', err);
            toast.error('Failed to load catalog products');
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts(1, activeTab, search);
    }, [activeTab]);

    // Reset color quantity counter when selected product changes
    useEffect(() => {
        if (selectedProduct && Array.isArray(selectedProduct.colors)) {
            const initialQtyMap = {};
            selectedProduct.colors.forEach(c => {
                const key = c._id || c.color;
                initialQtyMap[key] = (Number(c.qty) > 0) ? 1 : 0;
            });
            setColorQuantities(initialQtyMap);
        }
    }, [selectedProduct]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchProducts(1, activeTab, search);
    };

    // Helper to safely parse color hex strings
    const getValidColorHex = (hexStr) => {
        if (!hexStr || typeof hexStr !== 'string') return '#3B82F6';
        const trimmed = hexStr.trim().toLowerCase();
        if (trimmed.startsWith('#')) return trimmed;
        if (/^[0-9a-fA-F]{3,6}$/.test(trimmed)) return `#${trimmed}`;
        try {
            const ctx = document.createElement('canvas').getContext('2d');
            if (ctx) {
                ctx.fillStyle = trimmed;
                const computed = ctx.fillStyle;
                if (computed && computed.startsWith('#')) return computed;
            }
        } catch (e) { }
        return '#3B82F6';
    };

    // Add specific color variant of a product to cart
    const extractColorString = (c) => {
        if (!c) return '';
        if (typeof c === 'string') return c;
        if (typeof c === 'object') return c.color || c.name || c.colorName || c.label || c.hex || '';
        return String(c);
    };

    const handleAddToCart = (product, colorObj = null, qtyOverride = 1) => {
        const extracted = extractColorString(colorObj) || extractColorString(product.color) || extractColorString(product.colors?.[0]) || '';
        const colorName = extracted || 'Standard';
        const colorHex = getValidColorHex(colorName) || getValidColorHex(product.color);
        const itemQty = qtyOverride || 1;
        const cartId = `${product._id}_${colorName}`;

        const pCode = product.productCode || product.code || '';
        const pName = product.productName || product.itemName || product.name || pCode || 'Eyewear Item';
        const pGst = Number(product.gst || product.gstPercent || product.gstPercentage || product.gstDetails?.gstPercent) || 12;
        const pHsn = product.hsnSac || product.HSNSAC || product.hsn || '';

        setCart(prevCart => {
            const existingIndex = prevCart.findIndex(item => item.cartId === cartId);
            if (existingIndex > -1) {
                const updated = [...prevCart];
                updated[existingIndex].qty += itemQty;
                return updated;
            } else {
                return [...prevCart, {
                    cartId,
                    productId: product._id,
                    productCode: pCode,
                    code: pCode,
                    productName: pName,
                    itemName: pName,
                    brand: product.brand || '',
                    category: product.category || activeTab || 'FRAME',
                    unit: product.unit || 'PIECE',
                    image: product.image || (product.photos?.[0]) || '',
                    price: Number(product.price) || 0,
                    mrp: Number(product.mrp || product.price) || 0,
                    gst: pGst,
                    hsnSac: pHsn,
                    color: colorName,
                    colorHex: colorHex,
                    qty: itemQty,
                    shape: product.shape || '',
                    material: product.material || '',
                    size: product.size || '',
                    dimensions: product.dimensions || '',
                    sph: product.sph ?? 0,
                    cyl: product.cyl ?? 0,
                    axis: product.axis ?? 0,
                    add: product.add ?? 0,
                    index: product.index ?? 0,
                    discountPercent: product.discountPercent ?? 0,
                    discountAmount: product.discountAmount ?? 0,
                    itemStatus: product.itemStatus || 'ACTIVE',
                    coating: product.coating || '',
                    photos: Array.isArray(product.photos) && product.photos.length > 0 ? product.photos : (product.image ? [product.image] : []),
                    vendor: product.vendor || { id: null, name: null },
                    orderSource: product.orderSource || 'INHOUSE',
                    orderType: product.orderType || 'STOCK',
                    rx: product.rx || { powers: [], prisms: [], centration: [], resolved: [] },
                    rawProduct: product
                }];
            }
        });




        toast.success(`Added ${pName} (${colorName}) to cart`, { toastId: cartId });
    };

    // Update quantity of an item inside cart
    const handleUpdateCartQty = (cartId, newQty) => {
        if (newQty <= 0) {
            handleRemoveFromCart(cartId);
            return;
        }
        setCart(prev => prev.map(item => item.cartId === cartId ? { ...item, qty: newQty } : item));
    };

    // Remove item from cart
    const handleRemoveFromCart = (cartId) => {
        setCart(prev => prev.filter(item => item.cartId !== cartId));
        toast.info('Item removed from cart');
    };

    // Calculate cart totals
    const cartTotals = useMemo(() => {
        const totalItems = cart.length;
        const totalPcs = cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
        const totalPrice = cart.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.qty) || 0)), 0);
        return { totalItems, totalPcs, totalPrice };
    }, [cart]);

    // Handle Checkout Action -> Redirect to Order Page with prefilled cart items
    const handleCheckout = () => {
        if (cart.length === 0) {
            toast.warning('Cart is empty. Please add items before checking out.');
            return;
        }
        toast.success('Redirecting to Order Checkout...');
        navigate(PATHS.CUSTOMER_CARE.NEW_ORDER, {
            state: {
                cartItems: cart,
                prefillProduct: cart[0]?.rawProduct || null
            }
        });
    };

    // Derived unique brands and shapes
    const uniqueBrands = useMemo(() => {
        const set = new Set();
        products.forEach(p => { if (p.brand && p.brand.trim() && p.brand !== 'NONE') set.add(p.brand.trim()); });
        return Array.from(set).sort();
    }, [products]);

    const uniqueShapes = useMemo(() => {
        const set = new Set();
        products.forEach(p => { if (p.shape && p.shape.trim() && p.shape !== 'NONE') set.add(p.shape.trim()); });
        return Array.from(set).sort();
    }, [products]);

    // Client-side filtered list
    const filteredProducts = useMemo(() => {
        let result = [...products];
        if (selectedBrand !== 'ALL') result = result.filter(p => p.brand?.trim() === selectedBrand);
        if (selectedShape !== 'ALL') result = result.filter(p => p.shape?.trim() === selectedShape);
        if (inStockOnly) result = result.filter(p => (Number(p.qty) || 0) > 0);

        result.sort((a, b) => {
            if (sortBy === 'PRICE_LOW_HIGH') return (a.price || 0) - (b.price || 0);
            if (sortBy === 'PRICE_HIGH_LOW') return (b.price || 0) - (a.price || 0);
            if (sortBy === 'NAME_ASC') return (a.productName || '').localeCompare(b.productName || '');
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
        return result;
    }, [products, selectedBrand, selectedShape, inStockOnly, sortBy]);

    return (
        <div className="w-full space-y-4 pb-24 text-gray-800 animate-in fade-in duration-300 relative">
            {/* ── Top Bar Header (With Prominent Cart Trigger Button) ── */}
            <div className="flex items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-base sm:text-xl font-black text-gray-900 tracking-tight">
                        Optical Frames & Sunglasses Catalog
                    </h1>
                    <p className="text-xs text-gray-400 font-semibold hidden sm:block">
                        Select multiple frames & color shades directly to build your wholesale order
                    </p>
                </div>

                {/* Always-visible Header Cart Button */}
                <button
                    onClick={() => setIsMobileCartOpen(true)}
                    className="relative px-3.5 sm:px-4 py-2.5 bg-[#2980B9] hover:bg-[#2471A3] text-white rounded-xl text-xs font-bold transition shadow-md active:scale-95 flex items-center gap-2 flex-shrink-0"
                >
                    <Icon icon="lucide:shopping-cart" className="text-base text-amber-300" />
                    <span>Cart</span>
                    {cartTotals.totalItems > 0 && (
                        <span className="px-2 py-0.5 bg-amber-400 text-slate-900 text-[10px] font-black rounded-full shadow-2xs">
                            {cartTotals.totalPcs} Pcs
                        </span>
                    )}
                </button>
            </div>

            {/* ── Main E-Commerce Responsive Grid Layout (Full 100% Width) ── */}
            <div className="w-full space-y-4">
                {/* Search & Filter Toolbar */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
                    <form onSubmit={handleSearchSubmit} className="relative">
                        <Icon icon="lucide:search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                        <input
                            type="text"
                            placeholder="Search frames by model, brand, name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[#2980B9] focus:bg-white"
                        />
                        {search && (
                            <button type="button" onClick={() => { setSearch(''); fetchProducts(1, activeTab, ''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <Icon icon="mdi:close-circle" className="text-base" />
                            </button>
                        )}
                    </form>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-700 outline-none">
                            <option value="ALL">Brand (All)</option>
                            {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>

                        <select value={activeTab} onChange={e => setActiveTab(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-700 outline-none">
                            <option value="ALL">Category (All)</option>
                            <option value="SUNGLASS">SUNGLASS</option>
                            <option value="FRAME">FRAME</option>
                        </select>

                        <select value={selectedShape} onChange={e => setSelectedShape(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-700 outline-none">
                            <option value="ALL">Shape (All)</option>
                            {uniqueShapes.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>

                        <button onClick={() => { setSearch(''); setSelectedBrand('ALL'); setSelectedShape('ALL'); setInStockOnly(false); }} className="px-2.5 py-1.5 text-xs font-bold text-[#2980B9] hover:bg-blue-50 rounded-xl transition ml-auto flex items-center gap-1">
                            <Icon icon="lucide:refresh-cw" className="text-xs" /> Reset
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-xs pt-1 border-t border-gray-100 gap-2">
                        <span className="font-extrabold text-gray-700">{filteredProducts.length} Frames Found</span>

                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Sort by:</span>
                            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-transparent text-xs font-bold text-[#2980B9] outline-none cursor-pointer">
                                <option value="NEWEST">Newest</option>
                                <option value="PRICE_LOW_HIGH">Price: Low to High</option>
                                <option value="PRICE_HIGH_LOW">Price: High to Low</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Products Grid (Consistently 5 Columns Full Width) */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3 animate-pulse">
                                <div className="w-full h-36 bg-gray-100 rounded-xl" />
                                <div className="h-4 bg-gray-100 rounded w-2/3" />
                                <div className="h-3 bg-gray-100 rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center space-y-2">
                        <Icon icon="lucide:package-open" className="text-3xl text-gray-300 mx-auto" />
                        <p className="text-xs font-bold text-gray-500">No matching eyewear products found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredProducts.map(product => {
                            const isSelected = selectedProduct?._id === product._id;
                            const hasColors = Array.isArray(product.colors) && product.colors.length > 0;

                            return (
                                <div
                                    key={product._id}
                                    onClick={() => {
                                        setSelectedProduct(product);
                                        setIsMobileDetailsOpen(true);
                                    }}
                                    className={`group bg-white rounded-2xl border p-3.5 transition-all duration-200 cursor-pointer flex flex-col justify-between relative ${isSelected
                                        ? 'border-[#2980B9] ring-2 ring-[#2980B9]/20 shadow-md bg-blue-50/20'
                                        : 'border-gray-100 hover:border-blue-200 shadow-sm hover:shadow-md'
                                        }`}
                                >
                                    <div>
                                        {/* Header Badges */}
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-emerald-100 text-emerald-800">
                                                NEW
                                            </span>
                                            <span className="text-[10px] font-mono text-gray-400 truncate">
                                                {product.category}
                                            </span>
                                        </div>

                                        {/* Frame Image Display */}
                                        <div className="h-32 bg-gray-50 rounded-xl p-2 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-300">
                                            {product.image ? (
                                                <img src={product.image} alt={product.productName} className="max-h-full max-w-full object-contain" />
                                            ) : (
                                                <Icon icon="lucide:glasses" className="text-4xl text-gray-300" />
                                            )}
                                        </div>

                                        {/* Details */}
                                        <div className="space-y-1">
                                            <h4 className="text-xs font-black text-gray-900 truncate">{product.brand || 'RAY-BAN'}</h4>
                                            <p className="text-[11px] font-extrabold text-gray-700 truncate">{product.productName || product.productCode}</p>
                                            <p className="text-[10px] text-gray-400 font-semibold">{product.shape || 'Rectangular'} • {product.type || 'Full Rim'}</p>

                                            {/* Available Colors Swatches */}
                                            {hasColors && (
                                                <div className="pt-1 flex items-center gap-1.5">
                                                    <span className="text-[9px] text-gray-400 font-bold uppercase">Colors:</span>
                                                    <div className="flex items-center gap-1">
                                                        {product.colors.slice(0, 4).map((c, idx) => (
                                                            <span
                                                                key={idx}
                                                                style={{ backgroundColor: getValidColorHex(c.color) }}
                                                                className="w-3 h-3 rounded-full border border-gray-300 inline-block"
                                                            />
                                                        ))}
                                                        {product.colors.length > 4 && (
                                                            <span className="text-[9px] font-bold text-gray-500">+{product.colors.length - 4}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Price & Stock Footer with Prominent Add/Select Button */}
                                    <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                                        <div>
                                            <span className="text-[10px] font-extrabold text-emerald-600 block">
                                                {product.qty || 0} Pcs Available
                                            </span>
                                            <span className="text-sm font-black text-gray-900">
                                                ₹{product.price || 0}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedProduct(product);
                                                setIsMobileDetailsOpen(true);
                                            }}
                                            className="px-3 py-1.5 bg-[#2980B9] hover:bg-[#2471A3] text-white text-xs font-bold rounded-xl transition shadow-2xs active:scale-95 flex items-center gap-1 flex-shrink-0"
                                        >
                                            <Icon icon="lucide:plus" className="text-xs" />
                                            <span>Add</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination Bar (10 products per page) */}
                {pagination.totalPages > 1 && (
                    <div className="flex flex-wrap items-center justify-between bg-white rounded-2xl border border-gray-100 p-3 px-4 shadow-xs text-xs mt-4 gap-2">
                        <span className="font-extrabold text-gray-500">
                            Page {pagination.page} of {pagination.totalPages} ({pagination.totalProducts} Total Frames)
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                disabled={pagination.page <= 1}
                                onClick={() => fetchProducts(pagination.page - 1, activeTab, search)}
                                className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-extrabold rounded-xl border border-gray-200 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 active:scale-95"
                            >
                                <Icon icon="lucide:chevron-left" className="text-sm" />
                                <span>Previous</span>
                            </button>
                            <span className="px-3 py-1 bg-blue-50 text-[#2980B9] font-black rounded-lg text-xs border border-blue-100">
                                {pagination.page}
                            </span>
                            <button
                                disabled={pagination.page >= pagination.totalPages}
                                onClick={() => fetchProducts(pagination.page + 1, activeTab, search)}
                                className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-extrabold rounded-xl border border-gray-200 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 active:scale-95"
                            >
                                <span>Next</span>
                                <Icon icon="lucide:chevron-right" className="text-sm" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Floating Bottom Quick-Cart Bar (Visible on smaller screens when cart has items) ── */}
            {cartTotals.totalItems > 0 && (
                <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40 bg-[#2980B9] text-white p-3 px-4 rounded-2xl shadow-xl border border-white/20 flex items-center justify-between animate-in slide-in-from-bottom-6 fade-in duration-300 ease-out">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-black text-xs text-white shadow-xs">
                            <Icon icon="lucide:shopping-bag" className="text-base" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5 text-xs font-bold">
                                <span>{cartTotals.totalPcs} Pcs</span>
                                <span className="text-gray-400">•</span>
                                <span className="text-emerald-400 font-extrabold">₹{cartTotals.totalPrice}</span>
                            </div>
                            <span className="text-[10px] text-gray-300 block">{cartTotals.totalItems} unique shades</span>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsMobileCartOpen(true)}
                        className="px-4 py-2 bg-[#2980B9] hover:bg-[#2471A3] text-white text-xs font-extrabold rounded-xl transition shadow-md active:scale-95 flex items-center gap-1.5"
                    >
                        <span>View Cart</span>
                        <Icon icon="lucide:arrow-right" className="text-xs" />
                    </button>
                </div>
            )}

            {/* ── Universal Cart Modal Portal (Visible on Mobile & Desktop when Cart button clicked) ── */}
            {isMobileCartOpen && createPortal(
                <div
                    onClick={() => setIsMobileCartOpen(false)}
                    className="fixed inset-0 w-screen h-screen z-[9999] bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-300 ease-out"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] shadow-2xl border border-gray-100 relative p-4 sm:p-6 animate-in zoom-in-95 slide-in-from-bottom-6 duration-300 ease-out flex flex-col"
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-[#2980B9]">
                                    <Icon icon="lucide:shopping-bag" className="text-xl" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-gray-900">Your Order Cart</h3>
                                    <p className="text-[10px] text-gray-400 font-semibold">{cartTotals.totalItems} unique items ({cartTotals.totalPcs} total pcs)</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {cart.length > 0 && (
                                    <button onClick={() => setCart([])} className="text-xs font-bold text-gray-400 hover:text-red-500 mr-2">
                                        Clear Cart
                                    </button>
                                )}
                                <button onClick={() => setIsMobileCartOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600">
                                    <Icon icon="mdi:close" className="text-lg" />
                                </button>
                            </div>
                        </div>

                        {/* Cart Items Scrollable Container */}
                        <div className="flex-1 overflow-y-auto py-3 space-y-3 min-h-0 pr-1 custom-scrollbar">
                            {cart.length === 0 ? (
                                <div className="py-12 text-center text-gray-400 space-y-2">
                                    <Icon icon="lucide:shopping-cart" className="text-5xl mx-auto text-gray-300" />
                                    <p className="text-xs font-bold text-gray-500">Your order cart is empty</p>
                                </div>
                            ) : (
                                cart.map(item => (
                                    <div key={item.cartId} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {item.image ? (
                                                <img src={item.image} alt={item.productName} className="w-10 h-10 object-contain rounded-lg bg-white p-1 border border-gray-200 flex-shrink-0" />
                                            ) : (
                                                <span style={{ backgroundColor: item.colorHex }} className="w-5 h-5 rounded-full border border-gray-300 flex-shrink-0" />
                                            )}
                                            <div className="min-w-0">
                                                <h5 className="font-extrabold text-gray-900 truncate">{item.productName}</h5>
                                                <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                                                    <span style={{ backgroundColor: item.colorHex }} className="w-2.5 h-2.5 rounded-full inline-block border" />
                                                    <span>{item.color}</span>
                                                    <span>•</span>
                                                    <span className="font-bold text-gray-800">₹{item.price}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            <div className="flex items-center border border-gray-200 rounded-lg bg-white">
                                                <button onClick={() => handleUpdateCartQty(item.cartId, item.qty - 1)} className="px-2.5 py-1 text-gray-600 font-bold hover:bg-gray-100 rounded-l-lg">-</button>
                                                <span className="px-2.5 font-bold text-gray-900 text-xs">{item.qty}</span>
                                                <button onClick={() => handleUpdateCartQty(item.cartId, item.qty + 1)} className="px-2.5 py-1 text-gray-600 font-bold hover:bg-gray-100 rounded-r-lg">+</button>
                                            </div>
                                            <button onClick={() => handleRemoveFromCart(item.cartId)} className="text-gray-400 hover:text-red-500 p-1">
                                                <Icon icon="lucide:trash-2" className="text-base" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Sticky Modal Footer */}
                        {cart.length > 0 && (
                            <div className="pt-3 border-t border-gray-100 space-y-3 shrink-0 bg-white">
                                <div className="flex items-center justify-between bg-blue-50/80 p-3 rounded-xl border border-blue-100">
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase block">Grand Total Value</span>
                                        <span className="text-xs text-gray-600 font-semibold">{cartTotals.totalPcs} total pieces</span>
                                    </div>
                                    <span className="text-2xl font-black text-gray-900">₹{cartTotals.totalPrice}</span>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsMobileCartOpen(false);
                                        handleCheckout();
                                    }}
                                    className="w-full py-3.5 bg-[#2980B9] hover:bg-[#2471A3] text-white text-xs font-black rounded-xl transition shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <Icon icon="lucide:check-circle" className="text-base" />
                                    <span>Proceed to Order Checkout</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* ── Mobile Model Details Bottom Sheet Modal Portal (Visible on mobile screens when a frame is selected) ── */}
            {isMobileDetailsOpen && selectedProduct && createPortal(
                <div
                    onClick={() => setIsMobileDetailsOpen(false)}
                    className="lg:hidden fixed inset-0 w-screen h-screen z-[9998] bg-slate-950/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300 ease-out"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[88vh] overflow-y-auto p-5 space-y-4 shadow-2xl border border-gray-100 relative animate-in slide-in-from-bottom-8 zoom-in-95 duration-300 ease-out"
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2">
                                <button onClick={() => setIsMobileDetailsOpen(false)} className="p-1.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200">
                                    <Icon icon="lucide:arrow-left" className="text-lg" />
                                </button>
                                <h3 className="text-base font-black text-gray-900 uppercase">MODEL DETAILS</h3>
                            </div>
                            <button onClick={() => setIsMobileDetailsOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600">
                                <Icon icon="mdi:close" className="text-lg" />
                            </button>
                        </div>

                        {/* Product Header Info Card */}
                        <div className="flex items-center gap-4 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                            <div className="w-20 h-20 bg-white rounded-xl p-1.5 border border-gray-200 flex items-center justify-center flex-shrink-0">
                                {selectedProduct.image ? (
                                    <img src={selectedProduct.image} alt={selectedProduct.productName} className="max-h-full max-w-full object-contain" />
                                ) : (
                                    <Icon icon="lucide:glasses" className="text-3xl text-gray-300" />
                                )}
                            </div>
                            <div className="space-y-1 min-w-0 flex-1">
                                <span className="text-[10px] font-mono font-bold text-gray-400 block">Code: {selectedProduct.productCode}</span>
                                <h4 className="text-sm font-black text-gray-900 truncate">{selectedProduct.productName || selectedProduct.productCode}</h4>
                                <p className="text-xs text-gray-500 font-semibold truncate">{selectedProduct.brand || 'Ray-Ban'} • {selectedProduct.shape || 'Rectangular'}</p>
                                <div className="flex items-center gap-2 pt-0.5">
                                    <span className="text-sm font-black text-gray-900">₹{selectedProduct.price || 0}</span>
                                    <span className="px-2 py-0.5 text-[9px] font-extrabold bg-emerald-100 text-emerald-800 rounded">
                                        {Number(selectedProduct.qty) > 0 ? 'IN STOCK' : 'OUT OF STOCK'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Color Shades Selection Table */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-black uppercase text-gray-900 tracking-wider">
                                AVAILABLE COLORS ({selectedProduct.colors?.length || 1})
                            </h4>

                            <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100 text-xs">
                                {Array.isArray(selectedProduct.colors) && selectedProduct.colors.length > 0 ? (
                                    selectedProduct.colors.map((c, idx) => {
                                        const key = c._id || c.color;
                                        const currentQty = colorQuantities[key] ?? 1;
                                        const isAvailable = Number(c.qty) > 0;

                                        return (
                                            <div key={idx} className="p-3 bg-white flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-[85px]">
                                                    <span style={{ backgroundColor: getValidColorHex(c.color) }} className="w-5 h-5 rounded-full border border-gray-300 flex-shrink-0" />
                                                    <span className="font-extrabold text-gray-800 uppercase text-xs truncate">{c.color}</span>
                                                </div>

                                                <span className={`text-[11px] font-bold ${isAvailable ? 'text-emerald-600' : 'text-red-500'}`}>
                                                    {isAvailable ? `${c.qty} pcs` : '0 pcs'}
                                                </span>

                                                {isAvailable ? (
                                                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                                                        <button
                                                            onClick={() => setColorQuantities(p => ({ ...p, [key]: Math.max(1, currentQty - 1) }))}
                                                            className="px-2 py-1 text-gray-600 font-bold hover:bg-gray-200"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="px-2.5 py-1 font-bold text-gray-900 text-xs">{currentQty}</span>
                                                        <button
                                                            onClick={() => setColorQuantities(p => ({ ...p, [key]: Math.min(Number(c.qty) || 99, currentQty + 1) }))}
                                                            className="px-2 py-1 text-gray-600 font-bold hover:bg-gray-200"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-red-500 font-bold">Out of Stock</span>
                                                )}

                                                {isAvailable ? (
                                                    <button
                                                        onClick={() => handleAddToCart(selectedProduct, c, currentQty)}
                                                        className="px-3 py-1.5 bg-[#2980B9] hover:bg-[#2471A3] text-white text-xs font-bold rounded-lg transition shadow-2xs active:scale-95 flex items-center gap-1"
                                                    >
                                                        <Icon icon="lucide:plus" className="text-xs" />
                                                        <span>Add</span>
                                                    </button>
                                                ) : (
                                                    <button disabled className="px-2.5 py-1 bg-gray-100 text-gray-400 text-xs font-bold rounded-lg cursor-not-allowed">
                                                        N/A
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="p-3 bg-white flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <span style={{ backgroundColor: getValidColorHex(selectedProduct.color || '#3B82F6') }} className="w-5 h-5 rounded-full border border-gray-300 flex-shrink-0" />
                                            <span className="font-extrabold text-gray-800 uppercase">{selectedProduct.color || 'Standard'}</span>
                                        </div>
                                        <span className="text-xs font-bold text-emerald-600">{selectedProduct.qty || 0} pcs</span>
                                        <button
                                            onClick={() => handleAddToCart(selectedProduct)}
                                            className="px-4 py-1.5 bg-[#2980B9] hover:bg-[#2471A3] text-white text-xs font-bold rounded-lg transition shadow-2xs flex items-center gap-1"
                                        >
                                            <Icon icon="lucide:plus" className="text-xs" />
                                            <span>Add</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer Controls */}
                        <div className="pt-2 border-t border-gray-100 flex items-center gap-3">
                            <button
                                onClick={() => setIsMobileDetailsOpen(false)}
                                className="flex-1 py-3 bg-[#2980B9] hover:bg-[#2471A3] text-white text-xs font-black rounded-xl transition shadow-md active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Icon icon="lucide:check-circle" className="text-base" />
                                <span>Done</span>
                            </button>
                            {cartTotals.totalItems > 0 && (
                                <button
                                    onClick={() => {
                                        setIsMobileDetailsOpen(false);
                                        setIsMobileCartOpen(true);
                                    }}
                                    className="py-3 px-4 bg-blue-50 hover:bg-blue-100 text-[#2980B9] border border-blue-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-2xs active:scale-95"
                                >
                                    <Icon icon="lucide:shopping-cart" className="text-[#2980B9] text-sm" />
                                    <span>Cart ({cartTotals.totalPcs})</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ── Desktop Model Details Right Slide-Over Side Drawer Portal (Visible on desktop screens when a frame is selected) ── */}
            {selectedProduct && createPortal(
                <div
                    onClick={() => setSelectedProduct(null)}
                    className="hidden lg:flex fixed inset-0 w-screen h-screen z-[9990] bg-slate-950/40 backdrop-blur-xs justify-end animate-in fade-in duration-300"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white w-full max-w-lg h-full overflow-y-auto p-6 space-y-5 shadow-2xl border-l border-gray-100 relative animate-in slide-in-from-right duration-300 ease-out custom-scrollbar flex flex-col justify-between"
                    >
                        <div className="space-y-5">
                            {/* Drawer Header */}
                            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                <div className="flex items-center gap-2.5">
                                    <button onClick={() => setSelectedProduct(null)} className="p-1.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
                                        <Icon icon="lucide:arrow-left" className="text-lg" />
                                    </button>
                                    <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">MODEL DETAILS</h3>
                                </div>
                                <button
                                    onClick={() => setSelectedProduct(null)}
                                    className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition"
                                    title="Close details"
                                >
                                    <Icon icon="mdi:close" className="text-xl" />
                                </button>
                            </div>

                            {/* Main Preview Box & Title */}
                            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 space-y-3">
                                <div className="w-full h-48 bg-white rounded-xl p-3 border border-gray-200 flex items-center justify-center">
                                    {selectedProduct.image ? (
                                        <img src={selectedProduct.image} alt={selectedProduct.productName} className="max-h-full max-w-full object-contain" />
                                    ) : (
                                        <Icon icon="lucide:glasses" className="text-5xl text-gray-300" />
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-mono font-bold text-gray-400">Code: {selectedProduct.productCode}</span>
                                        <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 rounded">
                                            {Number(selectedProduct.qty) > 0 ? 'IN STOCK' : 'OUT OF STOCK'}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-black text-gray-900">{selectedProduct.productName || selectedProduct.productCode}</h3>
                                    <p className="text-xs text-gray-500 font-semibold">{selectedProduct.brand || 'Ray-Ban'} • {selectedProduct.material || 'Acetate'} • {selectedProduct.type || 'Full Rim'}</p>
                                    <div className="pt-1 flex items-center gap-2">
                                        <span className="text-lg font-black text-gray-900">₹{selectedProduct.price || 0}</span>
                                        <span className="text-xs text-gray-400 font-semibold">• {selectedProduct.dimensions || '55 - 18 - 145'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Available Colors & Quantity Stepper Table */}
                            <div className="space-y-2.5">
                                <h4 className="text-xs font-black uppercase text-gray-900 tracking-wider">
                                    AVAILABLE COLORS ({selectedProduct.colors?.length || 1})
                                </h4>

                                <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100 text-xs">
                                    {Array.isArray(selectedProduct.colors) && selectedProduct.colors.length > 0 ? (
                                        selectedProduct.colors.map((c, idx) => {
                                            const key = c._id || c.color;
                                            const currentQty = colorQuantities[key] ?? 1;
                                            const isAvailable = Number(c.qty) > 0;

                                            return (
                                                <div key={idx} className="p-3 bg-white hover:bg-gray-50 transition flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2 min-w-[100px]">
                                                        <span style={{ backgroundColor: getValidColorHex(c.color) }} className="w-5 h-5 rounded-full border border-gray-300 flex-shrink-0" />
                                                        <span className="font-extrabold text-gray-800 uppercase">{c.color}</span>
                                                    </div>

                                                    <span className={`text-xs font-bold ${isAvailable ? 'text-emerald-600' : 'text-red-500'}`}>
                                                        {isAvailable ? `${c.qty} pcs` : '0 pcs'}
                                                    </span>

                                                    <span className="font-black text-gray-900">₹{selectedProduct.price}</span>

                                                    {isAvailable ? (
                                                        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                                                            <button
                                                                onClick={() => setColorQuantities(p => ({ ...p, [key]: Math.max(1, currentQty - 1) }))}
                                                                className="px-2 py-1 text-gray-600 hover:bg-gray-200 font-bold"
                                                            >
                                                                -
                                                            </button>
                                                            <span className="px-3 py-1 font-bold text-gray-900 text-xs">{currentQty}</span>
                                                            <button
                                                                onClick={() => setColorQuantities(p => ({ ...p, [key]: Math.min(Number(c.qty) || 99, currentQty + 1) }))}
                                                                className="px-2 py-1 text-gray-600 hover:bg-gray-200 font-bold"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-red-500 font-bold">Out of Stock</span>
                                                    )}

                                                    {isAvailable ? (
                                                        <button
                                                            onClick={() => handleAddToCart(selectedProduct, c, currentQty)}
                                                            className="px-3.5 py-1.5 bg-[#2980B9] hover:bg-[#2471A3] text-white text-xs font-bold rounded-lg transition shadow-2xs active:scale-95 flex items-center gap-1"
                                                        >
                                                            <Icon icon="lucide:plus" className="text-xs" />
                                                            <span>Add</span>
                                                        </button>
                                                    ) : (
                                                        <button disabled className="px-3 py-1 bg-gray-100 text-gray-400 text-xs font-bold rounded-lg cursor-not-allowed">
                                                            Unavailable
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="p-3 bg-white flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <span style={{ backgroundColor: getValidColorHex(selectedProduct.color || '#3B82F6') }} className="w-5 h-5 rounded-full border border-gray-300 flex-shrink-0" />
                                                <span className="font-extrabold text-gray-800 uppercase">{selectedProduct.color || 'Standard'}</span>
                                            </div>
                                            <span className="text-xs font-bold text-emerald-600">{selectedProduct.qty || 0} pcs</span>
                                            <span className="font-black text-gray-900">₹{selectedProduct.price}</span>
                                            <button
                                                onClick={() => handleAddToCart(selectedProduct)}
                                                className="px-4 py-1.5 bg-[#2980B9] hover:bg-[#2471A3] text-white text-xs font-bold rounded-lg transition shadow-2xs flex items-center gap-1"
                                            >
                                                <Icon icon="lucide:plus" className="text-xs" />
                                                <span>Add</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Model Information Grid */}
                            <div className="space-y-2 pt-2 border-t border-gray-100">
                                <h4 className="text-xs font-black uppercase text-gray-900 tracking-wider">MODEL INFORMATION</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl text-xs">
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase block">BRAND</span>
                                        <span className="font-extrabold text-gray-800">{selectedProduct.brand || 'Ray-Ban'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase block">GENDER</span>
                                        <span className="font-extrabold text-gray-800">Unisex</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase block">MODEL CODE</span>
                                        <span className="font-extrabold text-gray-800">{selectedProduct.productCode || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase block">SIZE</span>
                                        <span className="font-extrabold text-gray-800">{selectedProduct.size || '55-18-145'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Desktop Cart Summary Panel */}
                        {cart.length > 0 && (
                            <div className="bg-blue-50/60 rounded-2xl border border-blue-100 p-4 space-y-3 mt-4">
                                <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                                    <div className="flex items-center gap-2">
                                        <Icon icon="lucide:shopping-bag" className="text-base text-[#2980B9]" />
                                        <h4 className="text-xs font-black uppercase text-gray-900">Order Cart ({cartTotals.totalItems} Items, {cartTotals.totalPcs} Pcs)</h4>
                                    </div>
                                    <button onClick={() => setCart([])} className="text-[10px] text-gray-400 hover:text-red-500 font-bold">Clear Cart</button>
                                </div>

                                <div className="max-h-36 overflow-y-auto divide-y divide-blue-100 text-xs pr-1 space-y-2 custom-scrollbar">
                                    {cart.map((item) => (
                                        <div key={item.cartId} className="pt-2 flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span style={{ backgroundColor: item.colorHex }} className="w-3.5 h-3.5 rounded-full border border-gray-300 flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="font-extrabold text-gray-900 truncate">{item.productName}</p>
                                                    <span className="text-[10px] text-gray-500">{item.color} • ₹{item.price} x {item.qty}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-gray-900">₹{item.price * item.qty}</span>
                                                <button onClick={() => handleRemoveFromCart(item.cartId)} className="text-gray-400 hover:text-red-500">
                                                    <Icon icon="lucide:trash-2" className="text-sm" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-2 border-t border-blue-200 flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] text-gray-500 font-bold block">TOTAL VALUE</span>
                                        <span className="text-lg font-black text-gray-900">₹{cartTotals.totalPrice}</span>
                                    </div>
                                    <button
                                        onClick={handleCheckout}
                                        className="px-5 py-2.5 bg-[#2980B9] hover:bg-[#2471A3] text-white text-xs font-black rounded-xl transition shadow-md active:scale-95 flex items-center gap-2"
                                    >
                                        <Icon icon="lucide:check-circle" className="text-sm" />
                                        <span>Proceed to Checkout</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
            {/* ── Sticky Mobile Floating Checkout Bar (Always visible at bottom on Mobile when cart > 0) ── */}
            {cart.length > 0 && createPortal(
                <div className="lg:hidden fixed bottom-4 left-4 right-4 z-[9990] bg-[#2980B9] text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between border border-blue-400/30 animate-in slide-in-from-bottom duration-300">
                    <div
                        onClick={() => setIsMobileCartOpen(true)}
                        className="flex items-center gap-3 cursor-pointer min-w-0"
                    >
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0 relative">
                            <Icon icon="lucide:shopping-bag" className="text-xl" />
                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white font-black text-[10px] flex items-center justify-center border-2 border-[#2980B9]">
                                {cartTotals.totalItems}
                            </span>
                        </div>
                        <div className="min-w-0">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-100">{cartTotals.totalPcs} total pcs in cart</div>
                            <div className="text-base font-black tracking-tight">₹{cartTotals.totalPrice}</div>
                        </div>
                    </div>
                    <button
                        onClick={handleCheckout}
                        className="px-5 py-2.5 bg-white text-[#2980B9] hover:bg-blue-50 font-black text-xs rounded-xl shadow-md transition active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                        <span>Proceed to Checkout</span>
                        <Icon icon="lucide:arrow-right" className="text-sm" />
                    </button>
                </div>,
                document.body
            )}
        </div>
    );
};

export default EcommerceCatalog;
