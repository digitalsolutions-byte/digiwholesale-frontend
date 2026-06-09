import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { Icon } from "@iconify/react";
import { useDispatch } from "react-redux";
import { showLoader, hideLoader } from "../../features/loader/loaderSlice";
import * as returnRefundService from "../../services/returnRefundService";
import { getSettings } from "../../services/configService";

const inputCls = "w-full bg-gray-50/50 border border-gray-100 rounded-full px-5 py-2.5 text-sm text-gray-700 outline-none focus:border-erp-accent/30 focus:ring-4 focus:ring-erp-accent/5 transition-all placeholder:text-gray-300";
const labelCls = "text-xs font-semibold text-gray-500 block mb-1.5 ml-4";

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
        if (w > h) { h = Math.round((h / w) * MAX); w = MAX; }
        else { w = Math.round((w / h) * MAX); h = MAX; }
      }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          resolve(new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.6
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });

export default function ReturnRefund() {
  const dispatch = useDispatch();
  const today = new Date().toISOString().split("T")[0];
  const [activeTab, setActiveTab] = useState("form"); // "form" | "list"
  const [successData, setSuccessData] = useState(null); // when set, shows success screen

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    dateOfPurchase: today,
    itemType: "",
    condition: "",
    reasonForReturn: "",
    refundAmount: "",
    refundMethod: "CASH",
    loyaltyPoints: "",
    remark: "",
  });

  // Items State (multiple items allowed)
  const [items, setItems] = useState([{ item: "", qty: 1, amount: "", discount: "", gst: "", gstType: "INCLUDED" }]);
  const [photos, setPhotos] = useState([]);
  const [giftVoucherFile, setGiftVoucherFile] = useState(null);

  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const voucherRef = useRef(null);

  // List State
  const [listData, setListData] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [settings, setSettings] = useState(null);
  const [searchParams, setSearchParams] = useState({
    startDate: "",
    endDate: "",
    keyword: "",
    status: "Pending",
  });

  // Fetch Settings
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
  }, []);

  // Fetch List
  const fetchList = useCallback(async () => {
    try {
      dispatch(showLoader());
      const res = await returnRefundService.getAllReturnRefunds(page, 10, searchParams.status);
      if (res?.success) {
        setListData(res.data?.returnRefunds || res.data || []);
        setTotalPages(res.data?.totalPages || 1);
      }
    } catch (err) {
      toast.error(err.message || "Failed to load list");
    } finally {
      dispatch(hideLoader());
    }
  }, [page, searchParams.status, dispatch]);

  useEffect(() => {
    if (activeTab === "list") {
      fetchList();
    }
  }, [activeTab, fetchList]);

  // Clean up previews
  useEffect(() => {
    return () => photos.forEach(img => URL.revokeObjectURL(img.preview));
  }, [photos]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addItemRow = () => {
    setItems(prev => [...prev, { item: "", qty: 1, amount: "", discount: "", gst: "", gstType: "INCLUDED" }]);
  };

  const removeItemRow = (index) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const addImages = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    const incoming = Array.from(files);
    if (incoming.length + photos.length > 10) {
      toast.error("Maximum 10 photos allowed");
      return;
    }
    dispatch(showLoader());
    try {
      const normalized = await Promise.all(incoming.map(normalizeToJpeg));
      setPhotos(prev => [
        ...prev,
        ...normalized.map(file => ({ file, preview: URL.createObjectURL(file) }))
      ]);
    } catch (err) {
      toast.error("Image processing failed");
    } finally {
      dispatch(hideLoader());
    }
  }, [photos, dispatch]);

  const removeImage = (index) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleVoucherUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setGiftVoucherFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return toast.error("Name is required");
    if (!formData.phone) return toast.error("Phone number is required");
    if (photos.length === 0) return toast.error("At least one photo is required");

    try {
      dispatch(showLoader());
      const payload = new FormData();

      // Basic fields
      payload.append("name", formData.name);
      payload.append("phone", formData.phone);
      if (formData.email) payload.append("email", formData.email);
      payload.append("dateOfPurchase", formData.dateOfPurchase);
      payload.append("itemType", formData.itemType);
      payload.append("condition", formData.condition);
      payload.append("reasonForReturn", formData.reasonForReturn);
      payload.append("refundAmount", formData.refundAmount || 0);
      payload.append("refundMethod", formData.refundMethod);
      if (formData.loyaltyPoints) payload.append("loyaltyPoints", formData.loyaltyPoints);
      if (formData.remark) payload.append("remark", formData.remark);

      // Items array (JSON String)
      const parsedItems = items.map(it => ({
        item: it.item,
        qty: Number(it.qty) || 1,
        amount: Number(it.amount) || 0,
        discount: it.discount ? Number(it.discount) : undefined,
        gst: it.gst ? Number(it.gst) : undefined,
        gstType: it.gstType
      }));
      payload.append("items", JSON.stringify(parsedItems));

      // Files
      photos.forEach(p => {
        payload.append("photos", p.file, p.file.name);
      });

      if (giftVoucherFile) {
        payload.append("giftVoucher", giftVoucherFile);
      }

      const res = await returnRefundService.createReturnRefund(payload);
      if (res?.success) {
        toast.success("Return Refund Request Created successfully");
        setSuccessData(res.data);
      }
    } catch (err) {
      toast.error(err.message || "Failed to create request");
    } finally {
      dispatch(hideLoader());
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      dispatch(showLoader());
      const res = await returnRefundService.searchReturnRefunds(searchParams);
      if (res?.success) {
        setListData(res.data?.docs || res.data || []);
      }
    } catch (err) {
      toast.error("Search failed");
    } finally {
      dispatch(hideLoader());
    }
  };

  const handleUpdateStatus = async (id, status, remark = "Updated via UI") => {
    try {
      dispatch(showLoader());
      const res = await returnRefundService.updateReturnRefundStatus(id, { status, remark });
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

  if (successData) {
    return (
      <div className="w-full min-h-[70vh] flex flex-col items-center justify-center animate-in fade-in duration-500 py-10">
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl p-10 max-w-xl w-full text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-erp-primary to-erp-secondary"></div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">Return & Refund Successful</h2>
          <p className="text-gray-500 text-sm mb-6">Your transaction has been processed successfully.</p>

          {/* DigiOptics Mascot Illustration (as shown in mock) */}
          <div className="w-48 h-48 mx-auto mb-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center relative shadow-inner">
            <div className="absolute inset-0 rounded-full border border-blue-200/50 animate-pulse"></div>
            <Icon icon="mdi:emoticon-happy-outline" className="text-9xl text-erp-primary animate-bounce duration-1000" />
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 mb-8 text-left space-y-2">
            <div className="flex justify-between text-xs"><span className="text-gray-400">Request Name</span><span className="font-bold text-gray-700">{formData.name}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-400">Refund Amount</span><span className="font-bold text-erp-primary">₹ {formData.refundAmount || "0.00"}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-400">Method</span><span className="font-bold text-gray-700">{formData.refundMethod}</span></div>
          </div>

          <button
            onClick={() => {
              setSuccessData(null);
              setFormData({
                name: "", phone: "", email: "", dateOfPurchase: today,
                itemType: "", condition: "", reasonForReturn: "",
                refundAmount: "", refundMethod: "CASH", loyaltyPoints: "", remark: ""
              });
              setItems([{ item: "", qty: 1, amount: "", discount: "", gst: "", gstType: "INCLUDED" }]);
              setPhotos([]);
              setGiftVoucherFile(null);
              setActiveTab("list");
            }}
            className="w-full bg-erp-primary hover:bg-erp-primary/95 text-white font-bold py-3.5 px-8 rounded-full transition-all shadow-xl shadow-erp-primary/30 active:scale-95 text-sm"
          >
            View In List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-500 px-4 md:px-8">
      {/* Header section with Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Return & Refund</h1>
          <p className="text-sm text-gray-500 mt-1">Manage return requests and refunds</p>
        </div>
        <div className="flex bg-gray-100 p-1.5 rounded-full self-start md:self-auto">
          <button
            onClick={() => setActiveTab("form")}
            className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all ${activeTab === "form" ? "bg-white text-erp-primary shadow-md" : "text-gray-500 hover:text-gray-800"}`}
          >
            Create Request
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all ${activeTab === "list" ? "bg-white text-erp-primary shadow-md" : "text-gray-500 hover:text-gray-800"}`}
          >
            Request List
          </button>
        </div>
      </div>

      {activeTab === "form" ? (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start pb-16">

          {/* Form Left Side (Basic Info, Eligibility, Items, Refund) */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 p-8 space-y-8">

              {/* Header Selection */}
              <div className="flex items-center gap-3">
                <span className="bg-erp-primary/10 text-erp-primary font-bold px-5 py-2 rounded-full text-xs flex items-center gap-2">
                  <Icon icon="mdi:keyboard-backspace" className="text-base rotate-180" /> Return
                </span>
              </div>

              {/* Basic Info */}
              <div className="space-y-4">
                <p className="text-xs font-bold text-erp-primary flex items-center gap-2">
                  <Icon icon="mdi:account-box-outline" className="text-lg" /> Basic Info *
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <label className={labelCls}>Name *</label>
                    <input name="name" value={formData.name} onChange={handleChange} className={inputCls} placeholder="Customer Name" />
                  </div>
                  <div>
                    <label className={labelCls}>Phone *</label>
                    <input name="phone" value={formData.phone} onChange={handleChange} className={inputCls} placeholder="Phone No." />
                  </div>
                  <div>
                    <label className={labelCls}>Email</label>
                    <input name="email" type="email" value={formData.email} onChange={handleChange} className={inputCls} placeholder="Email" />
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-50" />

              {/* Eligibility */}
              <div className="space-y-4">
                <p className="text-xs font-bold text-erp-primary flex items-center gap-2">
                  <Icon icon="mdi:shield-check-outline" className="text-lg" /> Eligibility
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <label className={labelCls}>Date of Purchase</label>
                    <input type="date" name="dateOfPurchase" value={formData.dateOfPurchase} onChange={handleChange} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Item Type</label>
                    <select name="itemType" value={formData.itemType} onChange={handleChange} className={`${inputCls} bg-white appearance-none`}>
                      <option value="">Select Item Type</option>
                      {settings?.allCategories?.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      )) || (
                          <>
                            <option value="Lenses">Lenses</option>
                            <option value="Frames">Frames</option>
                            <option value="Sunglasses">Sunglasses</option>
                          </>
                        )}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Condition</label>
                    <input name="condition" value={formData.condition} onChange={handleChange} className={inputCls} placeholder="e.g. Scratched, Damaged" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Reason for Return</label>
                  <select name="reasonForReturn" value={formData.reasonForReturn} onChange={handleChange} className={`${inputCls} bg-white appearance-none`}>
                    <option value="">Select Reason</option>
                    <option value="Manufacturing Defect">Manufacturing Defect</option>
                    <option value="Wrong Item Delivered">Wrong Item Delivered</option>
                    <option value="Customer Dissatisfied">Customer Dissatisfied</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="h-px bg-gray-50" />

              {/* Items Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-erp-primary flex items-center gap-2">
                    <Icon icon="mdi:clipboard-list-outline" className="text-lg" /> Returned Items
                  </p>
                  <button type="button" onClick={addItemRow} className="text-xs font-bold text-erp-primary flex items-center gap-1 hover:underline">
                    <Icon icon="mdi:plus" /> Add Item
                  </button>
                </div>

                <div className="space-y-4">
                  {items.map((it, idx) => (
                    <div key={idx} className="bg-gray-50/50 border border-gray-100 rounded-3xl p-5 relative space-y-4">
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItemRow(idx)} className="absolute top-4 right-4 text-rose-500 hover:text-rose-600">
                          <Icon icon="mdi:close-circle" className="text-xl" />
                        </button>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                          <label className={labelCls}>Item Name *</label>
                          <input value={it.item} onChange={e => handleItemChange(idx, "item", e.target.value)} className={inputCls} placeholder="Item description" />
                        </div>
                        <div>
                          <label className={labelCls}>Qty</label>
                          <input type="number" min={1} value={it.qty} onChange={e => handleItemChange(idx, "qty", e.target.value)} className={inputCls} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div>
                          <label className={labelCls}>Price / Unit</label>
                          <input type="number" value={it.amount} onChange={e => handleItemChange(idx, "amount", e.target.value)} className={inputCls} placeholder="₹ 0.00" />
                        </div>
                        <div>
                          <label className={labelCls}>Discount (₹)</label>
                          <input type="number" value={it.discount} onChange={e => handleItemChange(idx, "discount", e.target.value)} className={inputCls} placeholder="₹" />
                        </div>
                        <div>
                          <label className={labelCls}>GST (%)</label>
                          <select value={it.gst || ""} onChange={e => handleItemChange(idx, "gst", e.target.value)} className={`${inputCls} bg-white appearance-none`}>
                            <option value="">Select GST</option>
                            {settings?.gst?.map((g) => (
                              <option key={g} value={g}>{g}%</option>
                            )) || (
                                <>
                                  <option value="0">0%</option>
                                  <option value="5">5%</option>
                                  <option value="12">12%</option>
                                  <option value="18">18%</option>
                                  <option value="24">24%</option>
                                </>
                              )}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>GST Type</label>
                          <select value={it.gstType} onChange={e => handleItemChange(idx, "gstType", e.target.value)} className={`${inputCls} bg-white appearance-none`}>
                            <option value="included">Included</option>
                            <option value="excluded">Excluded</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-gray-50" />

              {/* Refund Info */}
              <div className="space-y-4">
                <span className="bg-erp-primary/10 text-erp-primary font-bold px-5 py-2 rounded-full text-xs flex items-center gap-2 w-max">
                  <Icon icon="mdi:keyboard-backspace" className="text-base" /> Refund
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <label className={labelCls}>Refund Amount *</label>
                    <input type="number" name="refundAmount" value={formData.refundAmount} onChange={handleChange} className={inputCls} placeholder="₹ 0.00" />
                  </div>
                  <div>
                    <label className={labelCls}>Method</label>
                    <select name="refundMethod" value={formData.refundMethod} onChange={handleChange} className={`${inputCls} bg-white appearance-none`}>
                      <option value="CASH">Cash</option>
                      <option value="CARD">Card</option>
                      <option value="UPI">UPI</option>
                      <option value="LOYALTY_POINTS">Loyalty Points</option>
                      <option value="GIFT_VOUCHER">Gift Voucher</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Loyalty Points (if applicable)</label>
                    <input type="number" name="loyaltyPoints" value={formData.loyaltyPoints} onChange={handleChange} className={inputCls} placeholder="Points" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={labelCls}>Remark / Reason</label>
                    <input name="remark" value={formData.remark} onChange={handleChange} className={inputCls} placeholder="Enter remark" />
                  </div>
                  <div>
                    <label className={labelCls}>Gift Voucher Doc (Optional)</label>
                    <div onClick={() => voucherRef.current?.click()} className="flex items-center gap-3 border border-dashed border-gray-200 rounded-full px-5 py-2.5 text-sm text-gray-500 cursor-pointer hover:bg-gray-50 transition-all">
                      <Icon icon="mdi:file-document-outline" className="text-lg text-gray-400" />
                      <span className="truncate">{giftVoucherFile ? giftVoucherFile.name : "Choose File"}</span>
                      <input ref={voucherRef} type="file" onChange={handleVoucherUpload} className="hidden" />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Right Column (Photos & Submit) */}
          <div className="space-y-8">
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl p-8 sticky top-8 space-y-6">

              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700">Attach Photos</span>
                <span className="text-xs font-bold bg-erp-primary text-white px-4 py-1 rounded-full shadow-lg shadow-erp-primary/20">{photos.length}/10</span>
              </div>

              {/* Hidden file selectors */}
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { addImages(e.target.files); e.target.value = ""; }} />
              <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { addImages(e.target.files); e.target.value = ""; }} />

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => cameraRef.current?.click()} className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-erp-primary/10 bg-erp-primary/[0.01] hover:bg-erp-primary/5 hover:border-erp-primary/30 rounded-[2rem] py-6 transition-all group">
                  <Icon icon="mdi:camera" className="text-2xl text-erp-primary/40 group-hover:text-erp-primary transition-all" />
                  <span className="text-[10px] font-bold text-gray-400 group-hover:text-erp-primary">Take Photo</span>
                </button>
                <button type="button" onClick={() => galleryRef.current?.click()} className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-100 bg-gray-50/50 hover:bg-gray-100 hover:border-gray-200 rounded-[2rem] py-6 transition-all group">
                  <Icon icon="mdi:image-multiple-outline" className="text-2xl text-gray-300 group-hover:text-gray-500 transition-all" />
                  <span className="text-[10px] font-bold text-gray-400 group-hover:text-gray-600">From Gallery</span>
                </button>
              </div>

              {/* Gallery Thumbnails */}
              {photos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2.5">
                  {photos.map((ph, idx) => (
                    <div key={idx} className="relative aspect-square rounded-[1rem] overflow-hidden border border-gray-100 shadow-sm bg-gray-50 group">
                      <img src={ph.preview} alt="upload" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      <button type="button" onClick={() => removeImage(idx)} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white">
                        <Icon icon="mdi:trash-can-outline" className="text-lg" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-200">
                  <Icon icon="mdi:image-off-outline" className="text-4xl mb-2 opacity-20" />
                  <p className="text-[10px] font-bold text-gray-300">No photos attached</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-erp-primary hover:bg-erp-primary/95 text-white font-bold py-3.5 rounded-full transition-all shadow-xl shadow-erp-primary/30 active:scale-95 text-sm flex items-center justify-center gap-2"
              >
                <Icon icon="mdi:send-outline" /> Submit Request
              </button>

            </div>
          </div>

        </form>
      ) : (
        /* Requests List Tab */
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl p-8 space-y-6 pb-16">
          <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div>
              <label className={labelCls}>Keyword</label>
              <input value={searchParams.keyword} onChange={e => setSearchParams(prev => ({ ...prev, keyword: e.target.value }))} className={inputCls} placeholder="Keyword search..." />
            </div>
            <div>
              <label className={labelCls}>Start Date</label>
              <input type="date" value={searchParams.startDate} onChange={e => setSearchParams(prev => ({ ...prev, startDate: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>End Date</label>
              <input type="date" value={searchParams.endDate} onChange={e => setSearchParams(prev => ({ ...prev, endDate: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={searchParams.status} onChange={e => setSearchParams(prev => ({ ...prev, status: e.target.value }))} className={`${inputCls} bg-white appearance-none`}>
                {settings?.status?.map((st) => (
                  <option key={st} value={st}>{st}</option>
                )) || (
                    <>
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </>
                  )}
              </select>
            </div>
            <div>
              <button type="submit" className="w-full bg-erp-primary hover:bg-erp-primary/95 text-white font-bold py-3 rounded-full text-xs transition-all flex items-center justify-center gap-2">
                <Icon icon="mdi:magnify" /> Search Requests
              </button>
            </div>
          </form>

          {/* List Table */}
          <div className="overflow-x-auto rounded-3xl border border-gray-100">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-600">
                  <th className="p-4 font-bold">Customer Name</th>
                  <th className="p-4 font-bold">Phone</th>
                  <th className="p-4 font-bold">Date of Purchase</th>
                  <th className="p-4 font-bold">Item Type</th>
                  <th className="p-4 font-bold">Refund Amount</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {listData.length > 0 ? (
                  listData.map((row) => (
                    <tr key={row._id} className="hover:bg-gray-50/50">
                      <td className="p-4 font-semibold text-gray-700">{row.name}</td>
                      <td className="p-4 text-gray-500">{row.phone}</td>
                      <td className="p-4 text-gray-500">{row.dateOfPurchase ? row.dateOfPurchase.split("T")[0] : "-"}</td>
                      <td className="p-4 text-gray-500">{row.itemType || "-"}</td>
                      <td className="p-4 font-bold text-erp-primary">₹ {row.refundAmount}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${row.status === "Approved" ? "bg-emerald-50 text-emerald-600" :
                          row.status === "Rejected" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                          }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="p-4 text-center space-x-2">
                        {row.status === "Pending" && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(row._id, "Approved", "Verified")}
                              className="text-[10px] font-bold text-emerald-600 hover:underline"
                            >
                              <Icon icon="mdi:check-circle" className="text-lg" />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(row._id, "Rejected", "Rejected by manager")}
                              className="text-[10px] font-bold text-rose-500 hover:underline"
                            >
                              <Icon icon="mdi:close-circle" className="text-lg" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">No return requests found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-50 text-xs">
              <span className="text-gray-500">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(prev => prev - 1)}
                  className="px-4 py-2 border border-gray-100 rounded-full disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(prev => prev + 1)}
                  className="px-4 py-2 border border-gray-100 rounded-full disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
