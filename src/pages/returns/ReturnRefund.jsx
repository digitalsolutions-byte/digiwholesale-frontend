import React, { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { Icon } from "@iconify/react";
import { useDispatch } from "react-redux";
import { showLoader, hideLoader } from "../../features/loader/loaderSlice";
import * as returnRefundService from "../../services/returnRefundService";
import { uploadImage } from "../../services/bucketService";
import { getSettings } from "../../services/configService";
import { getOrderSuggestions } from "../../services/orderService";
import SearchableSelect from "../../components/ui/SearchableSelect";

const inputCls =
  "w-full bg-gray-50/80 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-erp-accent/40 focus:ring-2 focus:ring-erp-accent/10 transition-all placeholder:text-gray-300";
const selectCls = `${inputCls} appearance-none bg-white cursor-pointer`;
const labelCls =
  "text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5";
const sectionTitleCls = "text-xs font-bold text-gray-800 flex items-center gap-2";

/* ───── IMAGE NORMALIZATION ───── */
const normalizeToJpeg = (file) =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX = 1024;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > MAX || h > MAX) {
        if (w > h) {
          h = Math.round((h / w) * MAX);
          w = MAX;
        } else {
          w = Math.round((w / h) * MAX);
          h = MAX;
        }
      }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          resolve(
            new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" })
          );
        },
        "image/jpeg",
        0.6
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });

/* ───── CATEGORY COLORS ───── */
const CATEGORY_COLORS = {
  SUNGLASS: "#F97316",
  FRAME: "#F97316",
  LENS: "#3B82F6",
  FLUXAR: "#8B5CF6",
  CONTACT_LENS: "#10B981",
};

const EMPTY_ITEM = {
  productId: "",
  category: "",
  item: "",
  qty: 1,
  amount: "",
  discount: "",
  gst: 18,
  gstType: "EXCLUDED",
  itemType: "",
  condition: "GOOD",
  reasonForReturn: "Product defect",
  images: [],
};

export default function ReturnRefund() {
  const dispatch = useDispatch();
  const today = new Date().toISOString().split("T")[0];
  const [activeTab, setActiveTab] = useState("form"); // "form" | "list"
  const [successData, setSuccessData] = useState(null);

  /* ═══════ FORM STATE ═══════ */
  const [formData, setFormData] = useState({
    returnType: "RETURN",
    OrderId: "",
    name: "",
    phone: "",
    email: "",
    dateOfPurchase: today,
    itemType: "",
    condition: "",
    reasonForReturn: "",
    refundAmount: "",
    refundMethod: "CASH",
    loyaltyPoints: 0,
    remark: "",
    creditNote: "",
  });

  /* ═══════ ORDER SEARCH STATE ═══════ */
  const [orderOptions, setOrderOptions] = useState([]);
  const [orderSearchLoading, setOrderSearchLoading] = useState(false);
  const searchTimeoutRef = useRef(null);

  /* Items State */
  const [items, setItems] = useState([]);

  /* List State */
  const [listData, setListData] = useState([]);
  const [settings, setSettings] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchParams, setSearchParams] = useState({
    startDate: "",
    endDate: "",
    keyword: "",
  });
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = (id) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Fetch Settings & Initial Order Suggestions
  useEffect(() => {
    const fetchSettingsData = async () => {
      try {
        const res = await getSettings();
        if (res?.success) {
          setSettings(res.data?.settings || res.data);
        }
      } catch (err) {
        console.error("Failed to load settings", err);
      }
    };
    fetchSettingsData();
    fetchOrderSuggestions('');
  }, []);

  // Fetch List
  const fetchList = useCallback(async () => {
    try {
      dispatch(showLoader());
      const res = await returnRefundService.getAllReturnRefunds();
      if (res?.success) {
        setListData(res.data?.returnRefunds || res.data?.docs || res.data || []);
      }
    } catch (err) {
      toast.error(err.message || "Failed to load list");
    } finally {
      dispatch(hideLoader());
    }
  }, [dispatch]);

  useEffect(() => {
    if (activeTab === "list") fetchList();
  }, [activeTab, fetchList]);

  /* Order Search Handlers */
  async function fetchOrderSuggestions(searchTerm = '') {
    setOrderSearchLoading(true);
    try {
      const res = await getOrderSuggestions(searchTerm);
      if (res?.success && res?.data?.orders) {
        const options = res.data.orders.map((o, idx) => {
          const firstOrder = o.orders?.[0];
          return {
            value: o._id || `order-${idx}`,
            label: `${firstOrder?.orderNumber || o._id || 'Order'} - ${o.customer?.customerName || 'Unknown'}`,
            orderData: o
          };
        });
        setOrderOptions(options);
      }
    } catch (err) {
      console.error("Failed to fetch orders", err);
    } finally {
      setOrderSearchLoading(false);
    }
  }

  const handleOrderSearch = (searchTerm) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchOrderSuggestions(searchTerm);
    }, 500);
  };

  /* ═══════════════════════════════════════════
     FORM HANDLERS
  ═══════════════════════════════════════════ */

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (["itemType", "condition", "reasonForReturn"].includes(name)) {
      setItems((prev) =>
        prev.map((it) => ({
          ...it,
          [name]: value,
        }))
      );
    }
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, [field]: value } : it))
    );
  };

  const handleItemPhotoUpload = async (itemIndex, files) => {
    if (!files || files.length === 0) return;
    const incoming = Array.from(files);
    if (incoming.some((f) => f.size > 5 * 1024 * 1024)) {
      toast.error("File size must not exceed 5 MB");
      return;
    }
    dispatch(showLoader());
    try {
      const urls = [];
      for (const file of incoming) {
        const normalized = await normalizeToJpeg(file);
        try {
          const uploadRes = await uploadImage(normalized);
          const url = uploadRes.data?.url || uploadRes.url || uploadRes;
          if (url) urls.push(url);
        } catch (err) {
          console.error("Upload failed for item photo", err);
        }
      }
      if (urls.length > 0) {
        setItems((prev) =>
          prev.map((it, i) =>
            i === itemIndex
              ? { ...it, images: [...(it.images || []), ...urls] }
              : it
          )
        );
        toast.success("Product image(s) uploaded successfully");
      }
    } catch (err) {
      toast.error("Image upload failed");
    } finally {
      dispatch(hideLoader());
    }
  };

  const removeItemPhoto = (itemIndex, photoIndex) => {
    setItems((prev) =>
      prev.map((it, i) =>
        i === itemIndex
          ? {
            ...it,
            images: (it.images || []).filter((_, pI) => pI !== photoIndex),
          }
          : it
      )
    );
  };

  const handleOrderSelect = (e) => {
    const orderId = e.target.value;
    const selectedOption = orderOptions.find(opt => opt.value === orderId);

    setFormData(prev => ({
      ...prev,
      OrderId: orderId
    }));

    // Auto-populate customer info and items if available
    if (selectedOption?.orderData) {
      const { customer, orders } = selectedOption.orderData;
      setFormData(prev => ({
        ...prev,
        name: customer?.customerName || prev.name,
      }));

      if (orders && Array.isArray(orders)) {
        const extractedItems = [];
        orders.forEach(order => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach(it => {
              extractedItems.push({
                isSelected: false, // Default to unselected so user can choose
                productId: it.productId,
                category: it.category || "UNKNOWN",
                item: it.itemName || "Unknown Product",
                qty: it.qty || 1,
                amount: it.price || 0,
                discount: it.discountPercent || 0,
                gst: it.gst || 0,
                gstType: "EXCLUDED",
                itemType: it.category || formData.itemType || "",
                condition: formData.condition || "",
                reasonForReturn: formData.reasonForReturn || "",
              });
            });
          }
        });
        setItems(extractedItems);
      }
    }
  };

  const toggleItemSelection = (index) => {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, isSelected: !it.isSelected } : it))
    );
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  /* Submit */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return toast.error("Name is required");
    if (!formData.phone) return toast.error("Phone number is required");

    const selectedItems = items.filter(it => it.isSelected || it.isSelected === undefined);
    if (selectedItems.length === 0) return toast.error("At least one item must be selected");

    try {
      dispatch(showLoader());

      const firstItem = selectedItems[0];
      const payload = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        dateOfPurchase: formData.dateOfPurchase,
        itemType: firstItem?.category || firstItem?.itemType || formData.itemType || "LENS",
        refundAmount: Number(formData.refundAmount) || 0,
        refundMethod: formData.refundMethod || "CASH",
        loyaltyPoints: Number(formData.loyaltyPoints) || 0,
        remark: formData.remark || undefined,
        OrderId: formData.OrderId || undefined,
        returnType: formData.returnType || "RETURN",
        items: selectedItems.map((it) => ({
          productId: it.productId || undefined,
          item: it.item,
          category: it.category,
          qty: Number(it.qty) || 1,
          amount: Number(it.amount) || 0,
          discount: Number(it.discount) || 0,
          gst: Number(it.gst) || 0,
          gstType: it.gstType || "EXCLUDED",
          condition: it.condition || "GOOD",
          reasonForReturn: it.reasonForReturn || "Product defect",
          images: it.images || [],
        })),
      };

      const res = await returnRefundService.createReturnRefund(payload);
      if (res?.success) {
        toast.success("Return/Refund request created successfully");
        setSuccessData(res.data);
      }
    } catch (err) {
      toast.error(err.message || "Failed to create request");
    } finally {
      dispatch(hideLoader());
    }
  };

  /* ── List Handlers ── */
  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      dispatch(showLoader());
      const payload = {};
      if (searchParams.startDate) payload.startDate = searchParams.startDate;
      if (searchParams.endDate) payload.endDate = searchParams.endDate;
      if (searchParams.keyword) payload.keyword = searchParams.keyword;

      const res = await returnRefundService.searchReturnRefunds(payload);
      if (res?.success) {
        setListData(res.data?.returnRefunds || res.data?.docs || res.data || []);
      }
    } catch (err) {
      toast.error("Search failed");
    } finally {
      dispatch(hideLoader());
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this return request?")) return;
    try {
      dispatch(showLoader());
      const res = await returnRefundService.deleteReturnRefund(id);
      if (res?.success) {
        toast.success("Return request deleted successfully");
        fetchList();
      }
    } catch (err) {
      toast.error(err.message || "Delete failed");
    } finally {
      dispatch(hideLoader());
    }
  };

  const handleUpdateStatus = async (id, status, remark = "Updated via UI") => {
    try {
      dispatch(showLoader());
      const res = await returnRefundService.updateReturnRefundStatus(id, {
        status,
        remark,
      });
      if (res?.success) {
        toast.success("Status updated successfully");
        fetchList();
      }
    } catch (err) {
      toast.error(err.message || "Status update failed");
    } finally {
      dispatch(hideLoader());
    }
  };

  const resetForm = () => {
    setSuccessData(null);
    setFormData({
      returnType: "RETURN",
      OrderId: "",
      name: "",
      phone: "",
      email: "",
      dateOfPurchase: today,
      itemType: "",
      condition: "",
      reasonForReturn: "",
      refundAmount: "",
      refundMethod: "CASH",
      loyaltyPoints: 0,
      remark: "",
      creditNote: "",
    });
    setItems([]);
    setActiveTab("list");
  };

  /* ═══════════════════════════════════════════
     SUCCESS SCREEN
  ═══════════════════════════════════════════ */
  if (successData) {
    return (
      <div className="w-full min-h-[70vh] flex flex-col items-center justify-center animate-in fade-in duration-500 py-10">
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl p-10 max-w-xl w-full text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-erp-primary to-erp-secondary" />

          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Return & Refund Successful
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Your transaction has been processed successfully.
          </p>

          <div className="w-48 h-48 mx-auto mb-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center relative shadow-inner">
            <div className="absolute inset-0 rounded-full border border-blue-200/50 animate-pulse" />
            <Icon
              icon="mdi:emoticon-happy-outline"
              className="text-9xl text-erp-primary animate-bounce duration-1000"
            />
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 mb-8 text-left space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Request Name</span>
              <span className="font-bold text-gray-700">{formData.name}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Refund Amount</span>
              <span className="font-bold text-erp-primary">
                ₹ {formData.refundAmount || "0.00"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Method</span>
              <span className="font-bold text-gray-700">
                {formData.refundMethod}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Items</span>
              <span className="font-bold text-gray-700">
                {items.length} item(s)
              </span>
            </div>
          </div>

          <button
            onClick={resetForm}
            className="w-full bg-erp-primary hover:bg-erp-primary/95 text-white font-bold py-3.5 px-8 rounded-full transition-all shadow-xl shadow-erp-primary/30 active:scale-95 text-sm"
          >
            View In List
          </button>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     MAIN RENDER
  ═══════════════════════════════════════════ */
  return (
    <div className="w-full flex flex-col gap-6 fade-in px-4 md:px-6">
      {/* ── Header with Tabs ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-gray-800 uppercase tracking-widest">
            Return & Refund
          </h1>
          <p className="text-[11px] text-gray-400 font-medium">
            Manage customer return requests and refunds efficiently
          </p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg self-start md:self-auto border border-gray-200">
          <button
            onClick={() => setActiveTab("form")}
            className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${activeTab === "form"
              ? "bg-[#2980B9] text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900"
              }`}
          >
            Create Request
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${activeTab === "list"
              ? "bg-[#2980B9] text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900"
              }`}
          >
            Request List
          </button>
        </div>
      </div>

      {activeTab === "form" ? (
        /* ═══════════════════════════════════════
           FORM TAB — Two-column layout
        ═══════════════════════════════════════ */
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start pb-16"
        >
          {/* ─────────────────────────────────
              LEFT COLUMN: Form Fields
          ───────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
            {/* Return Type Selector */}
            {/* <div className="flex items-center gap-3">
              <span className="bg-erp-primary/10 p-2 rounded-full">
                <Icon
                  icon="mdi:cog-outline"
                  className="text-erp-primary text-lg"
                />
              </span>
              <div className="relative">
                <select
                  name="returnType"
                  value={formData.returnType}
                  onChange={handleChange}
                  className="appearance-none bg-erp-primary text-white font-bold text-sm px-5 py-2 pr-10 rounded-full cursor-pointer outline-none shadow-md shadow-erp-primary/20 hover:shadow-lg transition-all"
                >
                  <option value="RETURN">Return / Refund</option>
                  <option value="REFUND">Refund</option>
                </select>
                <Icon
                  icon="mdi:chevron-down"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white text-lg pointer-events-none"
                />
              </div>
            </div> */}

            {/* ── Basic Info ── */}
            <div className="space-y-3">
              <p className={sectionTitleCls}>
                Basic Info. <span className="text-red-500">*</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>JC ID (Order ID)</label>
                  <SearchableSelect
                    name="OrderId"
                    placeholder="Search order..."
                    value={formData.OrderId}
                    options={orderOptions}
                    onSearch={handleOrderSearch}
                    onChange={handleOrderSelect}
                    loading={orderSearchLoading}
                    containerClassName="w-full"
                  />
                </div>
                <div>
                  <label className={labelCls}>Name</label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={inputCls}
                    placeholder="Customer Name"
                  />
                </div>
                <div>
                  <label className={labelCls}>Phone No.</label>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={inputCls}
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
              </div>
              {/* Email row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Email</label>
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={inputCls}
                    placeholder="email@example.com"
                  />
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            {/* ── Eligibility ── */}
            <div className="space-y-3">
              <p className={sectionTitleCls}>
                Eligibility <span className="text-red-500">*</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Date of Purchase</label>
                  <input
                    type="date"
                    name="dateOfPurchase"
                    value={formData.dateOfPurchase}
                    onChange={handleChange}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            {/* ── Refund ── */}
            <div className="space-y-3">
              <p className="text-lg font-bold text-gray-900">Refund</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Amount</label>
                  <input
                    type="number"
                    name="refundAmount"
                    value={formData.refundAmount}
                    onChange={handleChange}
                    className={inputCls}
                    placeholder="₹ 0"
                  />
                </div>
                <div>
                  <label className={labelCls}>Method</label>
                  <div className="relative">
                    <select
                      name="refundMethod"
                      value={formData.refundMethod}
                      onChange={handleChange}
                      className={selectCls}
                    >
                      <option value="CASH">Cash</option>
                      <option value="CARD">Card</option>
                      <option value="UPI">UPI</option>
                      <option value="LOYALTY_POINTS">Loyalty Points</option>
                      <option value="GIFT_VOUCHER">Gift Voucher</option>
                    </select>
                    <Icon
                      icon="mdi:chevron-down"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-erp-primary pointer-events-none"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Loyalty Points</label>
                  <input
                    type="number"
                    name="loyaltyPoints"
                    value={formData.loyaltyPoints}
                    onChange={handleChange}
                    className={inputCls}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            {/* ── Credit Note + Remark ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Credit Note</label>
                <input
                  name="creditNote"
                  value={formData.creditNote}
                  onChange={handleChange}
                  className={inputCls}
                  placeholder="Credit note number"
                />
              </div>
              <div>
                <label className={labelCls}>Remark</label>
                <input
                  name="remark"
                  value={formData.remark}
                  onChange={handleChange}
                  className={inputCls}
                  placeholder="Enter remark"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Items Table + Submit */}
          <div className="space-y-6">

            {/* ── Items Table ── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-gray-100/90 border-b border-gray-200">
                      <th className="px-4 py-3 font-extrabold text-gray-600 uppercase text-[10px] tracking-wider whitespace-nowrap w-10 text-center">
                        ✓
                      </th>
                      <th className="px-4 py-3 font-bold text-gray-600 whitespace-nowrap">
                        Category
                      </th>
                      <th className="px-4 py-3 font-bold text-gray-600 whitespace-nowrap">
                        Product
                      </th>
                      <th className="px-4 py-3 font-bold text-gray-600 whitespace-nowrap">
                        Qty
                      </th>
                      <th className="px-4 py-3 font-bold text-gray-600 whitespace-nowrap">
                        Price
                      </th>
                      <th className="px-4 py-3 font-bold text-gray-600 whitespace-nowrap">
                        Disc
                      </th>
                      <th className="px-4 py-3 font-bold text-gray-600 whitespace-nowrap">
                        Disc Amt.
                      </th>
                      <th className="px-4 py-3 font-bold text-gray-600 whitespace-nowrap">
                        GST Mode
                      </th>
                      <th className="px-2 py-3 font-bold text-gray-600 text-center w-10">
                        <Icon icon="mdi:dots-vertical" className="mx-auto" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.length > 0 ? (
                      items.map((it, idx) => {
                        const discAmt =
                          ((Number(it.amount) || 0) *
                            (Number(it.discount) || 0)) /
                          100;
                        return (
                          <React.Fragment key={idx}>
                            <tr
                              className={`transition-colors ${it.isSelected === false ? "bg-white opacity-60" : "bg-blue-50/30 hover:bg-blue-50/60"
                                }`}
                            >
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={it.isSelected !== false}
                                  onChange={() => toggleItemSelection(idx)}
                                  className="w-4 h-4 rounded text-erp-primary focus:ring-erp-primary/30 border-gray-300 cursor-pointer"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-3 h-3 rounded-sm shrink-0"
                                    style={{
                                      backgroundColor:
                                        CATEGORY_COLORS[it.category] || "#9CA3AF",
                                    }}
                                  />
                                  <span className="text-gray-700 font-medium truncate max-w-[80px]">
                                    {it.category}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-700 truncate max-w-[120px]">
                                {it.item}
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                {it.qty}
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                ₹{it.amount}
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                {it.discount}%
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                ₹{discAmt.toFixed(0)}
                              </td>
                              <td className="px-4 py-3 text-gray-700 truncate max-w-[80px]">
                                {it.gstType}
                              </td>
                              <td className="px-2 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeItem(idx)}
                                  className="text-rose-400 hover:text-rose-600 transition-colors"
                                >
                                  <Icon
                                    icon="mdi:close-circle"
                                    className="text-lg"
                                  />
                                </button>
                              </td>
                            </tr>

                            {/* Per-item Return Specifications (Condition, Reason for Return, Item Images) */}
                            {it.isSelected !== false && (
                              <tr className="bg-blue-50/40 border-b border-blue-100/60">
                                <td colSpan={9} className="px-4 py-3">
                                  <div className="flex flex-col gap-2.5 bg-white p-3 rounded-xl border border-blue-100/80 text-xs shadow-2xs">
                                    <div className="flex flex-wrap items-center gap-3">
                                      <span className="font-bold text-[#1F618D] text-[10px] uppercase tracking-wider flex items-center gap-1">
                                        <Icon icon="mdi:pencil-box-outline" className="text-sm" /> Return Specs:
                                      </span>

                                      {/* Condition */}
                                      <div className="flex items-center gap-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Condition:</label>
                                        <select
                                          value={it.condition || "GOOD"}
                                          onChange={(e) => handleItemChange(idx, "condition", e.target.value)}
                                          className="bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1 text-xs text-gray-700 outline-none focus:border-erp-primary font-medium"
                                        >
                                          <option value="GOOD">GOOD</option>
                                          <option value="DAMAGED">DAMAGED</option>
                                          <option value="DEFECTIVE">DEFECTIVE</option>
                                          <option value="FAIR">FAIR</option>
                                        </select>
                                      </div>

                                      {/* Reason for Return */}
                                      <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Reason:</label>
                                        <select
                                          value={it.reasonForReturn || "Product defect"}
                                          onChange={(e) => handleItemChange(idx, "reasonForReturn", e.target.value)}
                                          className="w-full bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1 text-xs text-gray-700 outline-none focus:border-erp-primary font-medium"
                                        >
                                          <option value="Product defect">Product defect</option>
                                          <option value="Manufacturing Defect">Manufacturing Defect</option>
                                          <option value="Wrong Item Delivered">Wrong Item Delivered</option>
                                          <option value="Customer Dissatisfied">Customer Dissatisfied</option>
                                          <option value="Size Issue">Size Issue</option>
                                          <option value="Other">Other</option>
                                        </select>
                                      </div>
                                    </div>

                                    {/* Product Images Strip */}
                                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
                                      <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                                        <Icon icon="mdi:camera" className="text-xs text-gray-400" /> Product Images:
                                      </span>
                                      {(it.images || []).map((imgUrl, pIdx) => (
                                        <div key={pIdx} className="relative w-8 h-8 rounded-lg overflow-hidden border border-gray-200 shadow-2xs group">
                                          <img src={imgUrl} alt={`Item image ${pIdx}`} className="w-full h-full object-cover" />
                                          <button
                                            type="button"
                                            onClick={() => removeItemPhoto(idx, pIdx)}
                                            className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                          >
                                            <Icon icon="mdi:close-circle" className="text-xs" />
                                          </button>
                                        </div>
                                      ))}
                                      <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-bold cursor-pointer transition-colors border border-gray-200">
                                        <Icon icon="mdi:cloud-upload-outline" className="text-xs text-erp-primary" /> Add Photo
                                        <input
                                          type="file"
                                          accept="image/*"
                                          multiple
                                          className="hidden"
                                          onChange={(e) => {
                                            handleItemPhotoUpload(idx, e.target.files);
                                            e.target.value = "";
                                          }}
                                        />
                                      </label>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-8 text-center text-gray-300 text-xs"
                        >
                          No items added yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            {/* ── Submit Button ── */}
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-erp-primary hover:bg-erp-primary/90 text-white font-bold py-3 px-10 rounded-full transition-all shadow-xl shadow-erp-primary/20 active:scale-95 text-sm flex items-center gap-2"
              >
                <Icon icon="mdi:send-outline" /> Submit
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* ═══════════════════════════════════════
           LIST TAB — Request List
        ═══════════════════════════════════════ */
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl p-8 space-y-6 pb-16">
          {/* Search / Filter Bar */}
          <form
            onSubmit={handleSearch}
            className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end"
          >
            <div>
              <label className={labelCls}>Keyword</label>
              <input
                value={searchParams.keyword}
                onChange={(e) =>
                  setSearchParams((prev) => ({
                    ...prev,
                    keyword: e.target.value,
                  }))
                }
                className={inputCls}
                placeholder="Search by name, phone..."
              />
            </div>
            <div>
              <label className={labelCls}>Start Date</label>
              <input
                type="date"
                value={searchParams.startDate}
                onChange={(e) =>
                  setSearchParams((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>End Date</label>
              <input
                type="date"
                value={searchParams.endDate}
                onChange={(e) =>
                  setSearchParams((prev) => ({
                    ...prev,
                    endDate: e.target.value,
                  }))
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Status (local filter)</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={selectCls}
              >
                <option value="All">All</option>
                {settings?.status?.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                )) || (
                    <>
                      <option value="Pending">Pending</option>
                      <option value="Return_Approved">Return Approved</option>
                      <option value="Refund_Approved">Refund Approved</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Completed">Completed</option>
                    </>
                  )}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-erp-primary hover:bg-erp-primary/95 text-white font-bold py-3 rounded-full text-xs transition-all flex items-center justify-center gap-2"
              >
                <Icon icon="mdi:magnify" /> Search
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchParams({ startDate: "", endDate: "", keyword: "" });
                  setStatusFilter("All");
                  fetchList();
                }}
                className="px-4 py-3 border border-gray-200 rounded-full text-xs font-bold text-gray-500 hover:bg-gray-50 transition-all"
                title="Reset filters"
              >
                <Icon icon="mdi:refresh" />
              </button>
            </div>
          </form>

          {/* Results Count */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {(() => {
                const filtered = statusFilter === "All"
                  ? listData
                  : listData.filter((r) => r.status === statusFilter);
                return `${filtered.length} result(s) found`;
              })()}
            </p>
          </div>

          {/* List Table */}
          <div className="overflow-x-auto rounded-3xl border border-gray-100">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-600">
                  <th className="p-4 font-bold w-10 text-center"></th>
                  <th className="p-4 font-bold">Customer Name</th>
                  <th className="p-4 font-bold">Phone</th>
                  <th className="p-4 font-bold">Date of Purchase</th>
                  <th className="p-4 font-bold">Item Type</th>
                  <th className="p-4 font-bold">Return Type</th>
                  <th className="p-4 font-bold">Refund Amount</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(() => {
                  const filtered = statusFilter === "All"
                    ? listData
                    : listData.filter((r) => r.status === statusFilter);
                  return filtered.length > 0 ? (
                    filtered.map((row) => (
                      <React.Fragment key={row._id}>
                        <tr
                          className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                          onClick={() => toggleRow(row._id)}
                        >
                          <td className="p-4 text-center">
                            <Icon
                              icon={expandedRows[row._id] ? "mdi:chevron-up" : "mdi:chevron-down"}
                              className={`text-xl transition-all ${expandedRows[row._id] ? "text-erp-primary" : "text-gray-400"}`}
                            />
                          </td>
                          <td className="p-4 font-semibold text-gray-700">
                            {row.name}
                          </td>
                          <td className="p-4 text-gray-500">{row.phone}</td>
                          <td className="p-4 text-gray-500">
                            {row.dateOfPurchase
                              ? row.dateOfPurchase.split("T")[0]
                              : "-"}
                          </td>
                          <td className="p-4 text-gray-500">
                            {row.itemType || "-"}
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${row.returnType === "RETURN"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-purple-50 text-purple-600"
                              }`}>
                              {row.returnType || "RETURN"}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-erp-primary">
                            ₹ {row.refundAmount}
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-3 py-1 rounded-full text-[10px] font-bold ${row.status === "Return_Approved" || row.status === "Refund_Approved" || row.status === "Approved"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : row.status === "Completed"
                                    ? "bg-blue-50 text-blue-600"
                                    : row.status === "Rejected"
                                      ? "bg-rose-50 text-rose-600"
                                      : "bg-amber-50 text-amber-600"
                                }`}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              {row.status === "Pending" && (
                                <>
                                  <button
                                    onClick={() =>
                                      handleUpdateStatus(
                                        row._id,
                                        row.returnType === "REFUND" ? "Refund_Approved" : "Return_Approved",
                                        "Verified"
                                      )
                                    }
                                    className="p-1 rounded-full hover:bg-emerald-50 transition-colors"
                                    title="Approve"
                                  >
                                    <Icon
                                      icon="mdi:check-circle"
                                      className="text-lg text-emerald-600"
                                    />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleUpdateStatus(
                                        row._id,
                                        "Rejected",
                                        "Rejected by manager"
                                      )
                                    }
                                    className="p-1 rounded-full hover:bg-rose-50 transition-colors"
                                    title="Reject"
                                  >
                                    <Icon
                                      icon="mdi:close-circle"
                                      className="text-lg text-rose-500"
                                    />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleDelete(row._id)}
                                className="p-1 rounded-full hover:bg-rose-50 transition-colors"
                                title="Delete"
                              >
                                <Icon
                                  icon="mdi:trash-can-outline"
                                  className="text-lg text-gray-400 hover:text-rose-500"
                                />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* ── EXPANDABLE SUB-TABLE ── */}
                        {expandedRows[row._id] && row.items && row.items.length > 0 && (
                          <tr className="bg-gray-50/40">
                            <td colSpan={9} className="p-0 border-b border-gray-100">
                              <div className="px-14 py-4 fade-in">
                                <h4 className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-2">
                                  <Icon icon="mdi:package-variant-closed" className="text-erp-primary text-base" />
                                  Returned Items ({row.items.length})
                                </h4>
                                <div className="bg-white border border-gray-200/60 rounded-xl overflow-hidden shadow-sm">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-500">
                                      <tr>
                                        <th className="px-4 py-2.5 font-bold">Item Name</th>
                                        <th className="px-4 py-2.5 font-bold">Category</th>
                                        <th className="px-4 py-2.5 font-bold">Condition</th>
                                        <th className="px-4 py-2.5 font-bold">Reason</th>
                                        <th className="px-4 py-2.5 font-bold">Qty</th>
                                        <th className="px-4 py-2.5 font-bold">Amount</th>
                                        <th className="px-4 py-2.5 font-bold">Discount</th>
                                        <th className="px-4 py-2.5 font-bold">Images</th>
                                        <th className="px-4 py-2.5 font-bold">Return Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                      {row.items.map((it, i) => {
                                        const itemImages = (it.images && it.images.length > 0) ? it.images : (row.photos || row.images || []);
                                        return (
                                          <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-2.5 font-medium text-gray-700">{it.item || "-"}</td>
                                            <td className="px-4 py-2.5 text-gray-500">
                                              <div className="flex items-center gap-1.5">
                                                <span
                                                  className="w-2 h-2 rounded-full"
                                                  style={{ backgroundColor: CATEGORY_COLORS[it.category] || "#9CA3AF" }}
                                                />
                                                {it.category || "-"}
                                              </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-gray-700 font-semibold">{it.condition || row.condition || "-"}</td>
                                            <td className="px-4 py-2.5 text-gray-700">{it.reasonForReturn || row.reasonForReturn || "-"}</td>
                                            <td className="px-4 py-2.5 text-gray-500">{it.qty || "-"}</td>
                                            <td className="px-4 py-2.5 text-gray-500">₹ {it.amount || 0}</td>
                                            <td className="px-4 py-2.5 text-gray-500">{it.discount || 0}%</td>
                                            <td className="px-4 py-2.5">
                                              <div className="flex items-center gap-1">
                                                {itemImages.length > 0 ? (
                                                  itemImages.map((img, imgI) => (
                                                    <a key={imgI} href={img} target="_blank" rel="noopener noreferrer">
                                                      <img src={img} alt="Product image" className="w-6 h-6 rounded-md object-cover border border-gray-200 hover:scale-110 transition-transform shadow-2xs" />
                                                    </a>
                                                  ))
                                                ) : (
                                                  <span className="text-gray-400 text-[10px]">-</span>
                                                )}
                                              </div>
                                            </td>
                                            <td className="px-4 py-2.5">
                                              <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-[10px] font-bold">
                                                {it.returnType || "RETURN_REQUESTED"}
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={9}
                        className="p-8 text-center text-gray-400"
                      >
                        No return requests found
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
