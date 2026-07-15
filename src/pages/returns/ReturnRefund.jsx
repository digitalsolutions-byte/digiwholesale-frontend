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

  /* ═══════ ITEMS STATE ═══════ */
  const [items, setItems] = useState([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ ...EMPTY_ITEM });

  /* ═══════ PHOTOS STATE ═══════ */
  const [photos, setPhotos] = useState([]); // { file, preview, url }
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  /* ═══════ LIST STATE ═══════ */
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

  /* ═══════════════════════════════════════════
     EFFECTS
  ═══════════════════════════════════════════ */

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
        setListData(res.data?.returnRefunds || res.data || []);
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

  // Clean up previews
  useEffect(() => {
    return () => photos.forEach((img) => URL.revokeObjectURL(img.preview));
  }, [photos]);

  /* ═══════════════════════════════════════════
     ORDER SEARCH HANDLERS
  ═══════════════════════════════════════════ */
  async function fetchOrderSuggestions(searchTerm = '') {
    setOrderSearchLoading(true);
    try {
      const res = await getOrderSuggestions(searchTerm);
      if (res?.success && res?.data?.orders) {
        const options = res.data.orders.map((o) => {
          const firstOrder = o.orders?.[0];
          return {
            value: o._id,
            label: `${firstOrder?.orderNumber || o._id} - ${o.customer?.customerName || 'Unknown'}`,
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

  const handleNewItemChange = (field, value) => {
    setNewItem((prev) => ({ ...prev, [field]: value }));
  };

  const addItemToTable = () => {
    if (!newItem.item) return toast.error("Product name is required");
    if (!newItem.category) return toast.error("Category is required");
    setItems((prev) => [
      ...prev,
      {
        ...newItem,
        qty: Number(newItem.qty) || 1,
        amount: Number(newItem.amount) || 0,
        discount: Number(newItem.discount) || 0,
        gst: Number(newItem.gst) || 0,
      },
    ]);
    setNewItem({ ...EMPTY_ITEM });
    setShowAddItem(false);
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  /* ── Photo Handlers ── */
  const addImages = useCallback(
    async (files) => {
      if (!files || files.length === 0) return;
      const incoming = Array.from(files);
      if (incoming.length + photos.length > 10) {
        toast.error("Maximum 10 photos allowed");
        return;
      }
      dispatch(showLoader());
      try {
        const results = [];
        for (const file of incoming) {
          const normalized = await normalizeToJpeg(file);
          const preview = URL.createObjectURL(normalized);
          let url = "";
          try {
            const uploadRes = await uploadImage(normalized);
            url = uploadRes.data?.url || uploadRes.url || uploadRes;
          } catch (err) {
            console.error("Upload failed for image, storing locally", err);
          }
          results.push({ file: normalized, preview, url });
        }
        setPhotos((prev) => [...prev, ...results]);
        if (results.some((r) => r.url)) {
          toast.success("Photo(s) uploaded successfully");
        }
      } catch (err) {
        toast.error("Image processing failed");
      } finally {
        dispatch(hideLoader());
      }
    },
    [photos, dispatch]
  );

  const removeImage = (index) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  /* ── Submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return toast.error("Name is required");
    if (!formData.phone) return toast.error("Phone number is required");

    const selectedItems = items.filter(it => it.isSelected || it.isSelected === undefined);
    if (selectedItems.length === 0) return toast.error("At least one item must be selected");

    try {
      dispatch(showLoader());

      // Collect all uploaded image URLs
      const allImageUrls = photos.filter((p) => p.url).map((p) => p.url);

      // Build JSON payload matching API schema
      const payload = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        dateOfPurchase: formData.dateOfPurchase,
        itemType: formData.itemType,
        condition: formData.condition,
        reasonForReturn: formData.reasonForReturn,
        refundAmount: Number(formData.refundAmount) || 0,
        refundMethod: formData.refundMethod,
        loyaltyPoints: Number(formData.loyaltyPoints) || 0,
        remark: formData.remark || undefined,
        OrderId: formData.OrderId || undefined,
        returnType: formData.returnType,
        images: allImageUrls,
        items: selectedItems.map((it) => ({
          productId: it.productId || undefined,
          item: it.item,
          category: it.category,
          qty: Number(it.qty) || 1,
          amount: Number(it.amount) || 0,
          discount: Number(it.discount) || 0,
          gst: Number(it.gst) || 0,
          gstType: it.gstType || "EXCLUDED",

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
        setListData(res.data?.docs || res.data || []);
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
    setPhotos([]);
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
    <div className="w-full flex flex-col gap-6 fade-in px-4 md:px-8">
      {/* ── Header with Tabs ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Return & Refund
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage return requests and refunds
          </p>
        </div>
        <div className="flex bg-gray-100 p-1.5 rounded-full self-start md:self-auto">
          <button
            onClick={() => setActiveTab("form")}
            className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all ${activeTab === "form"
              ? "bg-white text-erp-primary shadow-md"
              : "text-gray-500 hover:text-gray-800"
              }`}
          >
            Create Request
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all ${activeTab === "list"
              ? "bg-white text-erp-primary shadow-md"
              : "text-gray-500 hover:text-gray-800"
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
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 p-6 md:p-8 space-y-6">
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
                <div>
                  <label className={labelCls}>Item Type</label>
                  <div className="relative">
                    <select
                      name="itemType"
                      value={formData.itemType}
                      onChange={handleChange}
                      className={selectCls}
                    >
                      <option value="">Select</option>
                      {settings?.allCategories?.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      )) || (
                          <>
                            <option value="SUNGLASS">Sunglass</option>
                            <option value="FRAME">Frame</option>
                            <option value="LENS">Lens</option>
                            <option value="FLUXAR">Fluxar</option>
                            <option value="CONTACT_LENS">Contact Lens</option>
                          </>
                        )}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Condition</label>
                  <div className="relative">
                    <select
                      name="condition"
                      value={formData.condition}
                      onChange={handleChange}
                      className={selectCls}
                    >
                      <option value="">Select</option>
                      <option value="GOOD">Good</option>
                      <option value="DAMAGED">Damaged</option>
                      <option value="DEFECTIVE">Defective</option>
                      <option value="FAIR">Fair</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Reason for Return — full width */}
              <div>
                <label className={labelCls}>Reason for Return</label>
                <div className="relative">
                  <select
                    name="reasonForReturn"
                    value={formData.reasonForReturn}
                    onChange={handleChange}
                    className={selectCls}
                  >
                    <option value="">Select Reason</option>
                    <option value="Product defect">Product Defect</option>
                    <option value="Manufacturing Defect">
                      Manufacturing Defect
                    </option>
                    <option value="Wrong Item Delivered">
                      Wrong Item Delivered
                    </option>
                    <option value="Customer Dissatisfied">
                      Customer Dissatisfied
                    </option>
                    <option value="Size Issue">Size Issue</option>
                    <option value="Other">Other</option>
                  </select>
                  <Icon
                    icon="mdi:chevron-down"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
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

          {/* ─────────────────────────────────
              RIGHT COLUMN: Photos + Items Table + Submit
          ───────────────────────────────── */}
          <div className="space-y-6">
            {/* ── Photos Section ── */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="bg-erp-primary/10 p-2 rounded-full">
                    <Icon
                      icon="mdi:camera-outline"
                      className="text-erp-primary text-lg"
                    />
                  </span>
                  <span className="text-sm font-bold text-gray-700">
                    Photos
                  </span>
                </div>
                <span className="text-xs font-bold bg-erp-primary text-white px-3 py-1 rounded-full shadow-lg shadow-erp-primary/20">
                  {photos.length}/10
                </span>
              </div>

              {/* Hidden file inputs */}
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  addImages(e.target.files);
                  e.target.value = "";
                }}
              />
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  addImages(e.target.files);
                  e.target.value = "";
                }}
              />

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="flex items-center justify-center gap-2 border-2 border-dashed border-erp-primary/20 bg-erp-primary/[0.02] hover:bg-erp-primary/5 hover:border-erp-primary/40 rounded-2xl py-4 transition-all group"
                >
                  <Icon
                    icon="mdi:camera"
                    className="text-xl text-erp-primary/50 group-hover:text-erp-primary transition-all"
                  />
                  <span className="text-xs font-bold text-erp-primary/50 group-hover:text-erp-primary">
                    Take Photo
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => galleryRef.current?.click()}
                  className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-gray-100 hover:border-gray-300 rounded-2xl py-4 transition-all group"
                >
                  <Icon
                    icon="mdi:image-multiple-outline"
                    className="text-xl text-gray-300 group-hover:text-gray-500 transition-all"
                  />
                  <span className="text-xs font-bold text-gray-400 group-hover:text-gray-600">
                    From Gallery
                  </span>
                </button>
              </div>

              {/* Gallery Thumbnails */}
              {photos.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {photos.map((ph, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 shadow-sm bg-gray-50 group"
                    >
                      <img
                        src={ph.preview}
                        alt="upload"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white"
                      >
                        <Icon icon="mdi:trash-can-outline" className="text-lg" />
                      </button>
                      {ph.url && (
                        <div
                          className="absolute top-1 right-1 bg-green-500 rounded-full w-3 h-3 border-2 border-white"
                          title="Uploaded"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Items Table ── */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-orange-100">
                      <th className="px-4 py-3 font-bold text-gray-600 whitespace-nowrap w-10 text-center">
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
                          <tr
                            key={idx}
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

              {/* ── Add Item Expandable Section ── */}
              {showAddItem ? (
                <div className="border-t border-gray-100 p-4 bg-gray-50/50 space-y-3">
                  <p className="text-xs font-bold text-gray-600 mb-2">
                    Add New Item
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className={labelCls}>Product ID</label>
                      <input
                        value={newItem.productId}
                        onChange={(e) =>
                          handleNewItemChange("productId", e.target.value)
                        }
                        className={inputCls}
                        placeholder="ID"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Category *</label>
                      <select
                        value={newItem.category}
                        onChange={(e) =>
                          handleNewItemChange("category", e.target.value)
                        }
                        className={selectCls}
                      >
                        <option value="">Select</option>
                        {settings?.allCategories?.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        )) || (
                            <>
                              <option value="SUNGLASS">Sunglass</option>
                              <option value="FRAME">Frame</option>
                              <option value="LENS">Lens</option>
                              <option value="FLUXAR">Fluxar</option>
                              <option value="CONTACT_LENS">Contact Lens</option>
                            </>
                          )}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Product Name *</label>
                      <input
                        value={newItem.item}
                        onChange={(e) =>
                          handleNewItemChange("item", e.target.value)
                        }
                        className={inputCls}
                        placeholder="Product name"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div>
                      <label className={labelCls}>Qty</label>
                      <input
                        type="number"
                        min={1}
                        value={newItem.qty}
                        onChange={(e) =>
                          handleNewItemChange("qty", e.target.value)
                        }
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Price</label>
                      <input
                        type="number"
                        value={newItem.amount}
                        onChange={(e) =>
                          handleNewItemChange("amount", e.target.value)
                        }
                        className={inputCls}
                        placeholder="₹ 0"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Discount (%)</label>
                      <input
                        type="number"
                        value={newItem.discount}
                        onChange={(e) =>
                          handleNewItemChange("discount", e.target.value)
                        }
                        className={inputCls}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>GST (%)</label>
                      <select
                        value={newItem.gst}
                        onChange={(e) =>
                          handleNewItemChange("gst", e.target.value)
                        }
                        className={selectCls}
                      >
                        {settings?.gst?.map((g) => (
                          <option key={g} value={g}>
                            {g}%
                          </option>
                        )) || (
                            <>
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </>
                          )}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>GST Type</label>
                      <select
                        value={newItem.gstType}
                        onChange={(e) =>
                          handleNewItemChange("gstType", e.target.value)
                        }
                        className={selectCls}
                      >
                        <option value="INCLUDED">Included</option>
                        <option value="EXCLUDED">Excluded</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={addItemToTable}
                      className="bg-erp-primary text-white text-xs font-bold px-5 py-2 rounded-full hover:shadow-md transition-all flex items-center gap-1"
                    >
                      <Icon icon="mdi:plus" /> Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddItem(false);
                        setNewItem({ ...EMPTY_ITEM });
                      }}
                      className="text-gray-500 text-xs font-bold px-4 py-2 rounded-full hover:bg-gray-100 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-t border-gray-100 p-4">
                  <button
                    type="button"
                    onClick={() => setShowAddItem(true)}
                    className="text-xs font-bold text-erp-primary flex items-center gap-1 hover:underline"
                  >
                    <Icon
                      icon="mdi:plus-circle-outline"
                      className="text-base"
                    />{" "}
                    Add Item
                  </button>
                </div>
              )}
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
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
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
                              className={`px-3 py-1 rounded-full text-[10px] font-bold ${row.status === "Approved"
                                ? "bg-emerald-50 text-emerald-600"
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
                                        "Approved",
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
                                        <th className="px-4 py-2.5 font-bold">Qty</th>
                                        <th className="px-4 py-2.5 font-bold">Amount</th>
                                        <th className="px-4 py-2.5 font-bold">Discount</th>
                                        <th className="px-4 py-2.5 font-bold">Order No.</th>
                                        <th className="px-4 py-2.5 font-bold">Return Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                      {row.items.map((it, i) => (
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
                                          <td className="px-4 py-2.5 text-gray-500">{it.qty || "-"}</td>
                                          <td className="px-4 py-2.5 text-gray-500">₹ {it.amount || 0}</td>
                                          <td className="px-4 py-2.5 text-gray-500">{it.discount || 0}%</td>
                                          <td className="px-4 py-2.5 text-gray-500">{it.orderNumber || "-"}</td>
                                          <td className="px-4 py-2.5">
                                            <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-[10px] font-bold">
                                              {it.returnType || "RETURN_REQUESTED"}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
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
