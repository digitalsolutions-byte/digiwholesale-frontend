import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import { Icon } from "@iconify/react";
import { useDispatch } from "react-redux";
import { showLoader, hideLoader } from "../../features/loader/loaderSlice";
import * as exchangeService from "../../services/exchangeService";
import { getSettings } from "../../services/configService";
import api from "../../services/apiInstance";

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

export default function Exchange() {
  const dispatch = useDispatch();
  const today = new Date().toISOString().split("T")[0];
  const [activeTab, setActiveTab] = useState("form"); // "form" | "list"
  const [selectedExchangeId, setSelectedExchangeId] = useState(null); // for "Select Product" step popup

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    dateOfPurchase: today,
    itemType: "",
    condition: "",
    reasonForExchange: "",
    priceDifference: "",
    priceDifferenceMode: "NIL",
    remark: "",
  });

  // Items State (Returned items)
  const [items, setItems] = useState([{ item: "", qty: 1, amount: "", discount: "", gst: "", gstType: "INCLUDED" }]);
  const [photos, setPhotos] = useState([]);
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  // Select Product step state (Step 2)
  const [selectedProduct, setSelectedProduct] = useState(null); // full product object from suggestion API
  const [selectProductForm, setSelectProductForm] = useState({
    priceDifferenceMode: "UPI",
    remarks: "",
  });

  // Product suggestion search state
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  // Debounced product search
  const handleProductSearch = useCallback((query) => {
    setProductSearchQuery(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2) {
      setProductSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const res = await api.get(`/api/digi/product/suggestion?q=${encodeURIComponent(query)}`);
        const data = res.data?.data || res.data || [];
        setProductSuggestions(Array.isArray(data) ? data : []);
        setShowSuggestions(true);
      } catch (err) {
        console.error("Product search failed", err);
        setProductSuggestions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 350);
  }, []);

  // When a suggestion is selected, store the full product object
  const handleSelectSuggestion = (product) => {
    setSelectedProduct(product);
    setProductSearchQuery(product.productName || product.name || "");
    setShowSuggestions(false);
    setProductSuggestions([]);
  };

  // Clear product selection
  const handleClearProduct = () => {
    setSelectedProduct(null);
    setProductSearchQuery("");
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      const res = await exchangeService.getAllExchanges(page, 10, searchParams.status);
      if (res?.success) {
        setListData(res.data?.exchanges || res.data || []);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return toast.error("Name is required");
    if (!formData.phone) return toast.error("Phone number is required");
    if (!formData.itemType) return toast.error("Item type is required");

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
      payload.append("reasonForExchange", formData.reasonForExchange);
      payload.append("priceDifference", formData.priceDifference || 0);
      payload.append("priceDifferenceMode", formData.priceDifferenceMode);
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

      // Photos files
      photos.forEach(p => {
        payload.append("photos", p.file, p.file.name);
      });

      const res = await exchangeService.createExchange(payload);
      if (res?.success) {
        toast.success("Exchange request created successfully");
        setFormData({
          name: "", phone: "", email: "", dateOfPurchase: today,
          itemType: "", condition: "", reasonForExchange: "",
          priceDifference: "", priceDifferenceMode: "NIL", remark: ""
        });
        setItems([{ item: "", qty: 1, amount: "", discount: "", gst: "", gstType: "INCLUDED" }]);
        setPhotos([]);
        setActiveTab("list");
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
      const res = await exchangeService.searchExchanges(searchParams);
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
      const res = await exchangeService.updateExchangeStatus(id, { status, remark });
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

  const handleSelectProductSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct?._id) {
      return toast.error("Please search and select a product first");
    }
    try {
      dispatch(showLoader());
      const payload = {
        productId: selectedProduct._id,
        priceDifferenceMode: selectProductForm.priceDifferenceMode,
        remarks: selectProductForm.remarks,
      };

      const res = await exchangeService.selectProductForExchange(selectedExchangeId, payload);
      if (res?.success) {
        toast.success("Product selected successfully");
        setSelectedExchangeId(null);
        setSelectedProduct(null);
        setProductSearchQuery("");
        setSelectProductForm({ priceDifferenceMode: "UPI", remarks: "" });
        fetchList();
      }
    } catch (err) {
      toast.error(err.message || "Failed to save product selection");
    } finally {
      dispatch(hideLoader());
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-500 px-4 md:px-8">
      {/* Header section with Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Exchange Requests</h1>
          <p className="text-sm text-gray-500 mt-1">Manage product exchanges and updates</p>
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

          {/* Form Left Side (Basic Info, Eligibility, Items, Price Difference) */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 p-8 space-y-8">

              {/* Header Selection */}
              <div className="flex items-center gap-3">
                <span className="bg-erp-primary/10 text-erp-primary font-bold px-5 py-2 rounded-full text-xs flex items-center gap-2">
                  <Icon icon="mdi:sync" className="text-base" /> Exchange
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
                  <Icon icon="mdi:shield-check-outline" className="text-lg" /> Eligibility *
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <label className={labelCls}>Date of Purchase *</label>
                    <input type="date" name="dateOfPurchase" value={formData.dateOfPurchase} onChange={handleChange} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Item Type *</label>
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
                    <label className={labelCls}>Condition *</label>
                    <input name="condition" value={formData.condition} onChange={handleChange} className={inputCls} placeholder="e.g. Broken, Scratched" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Reason for Exchange *</label>
                  <select name="reasonForExchange" value={formData.reasonForExchange} onChange={handleChange} className={`${inputCls} bg-white appearance-none`}>
                    <option value="">Select Reason</option>
                    <option value="Manufacturing Defect">Manufacturing Defect</option>
                    <option value="Power mismatch">Power Mismatch</option>
                    <option value="Wrong Item Delivered">Wrong Item Delivered</option>
                    <option value="Customer Preference Change">Customer Preference Change</option>
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
                            <option value="INCLUDED">Included</option>
                            <option value="EXCLUDED">Excluded</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-gray-50" />

              {/* Price Diff & Remarks */}
              <div className="space-y-4">
                <p className="text-xs font-bold text-erp-primary flex items-center gap-2">
                  <Icon icon="mdi:cash-multiple" className="text-lg" /> Price Adjustment
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <label className={labelCls}>Price Difference (estimated)</label>
                    <input type="number" name="priceDifference" value={formData.priceDifference} onChange={handleChange} className={inputCls} placeholder="₹ 0.00" />
                  </div>
                  <div>
                    <label className={labelCls}>Mode</label>
                    <select name="priceDifferenceMode" value={formData.priceDifferenceMode} onChange={handleChange} className={`${inputCls} bg-white appearance-none`}>
                      <option value="NIL">Nil</option>
                      <option value="CASH">Cash</option>
                      <option value="CARD">Card</option>
                      <option value="UPI">UPI</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Remarks</label>
                    <input name="remark" value={formData.remark} onChange={handleChange} className={inputCls} placeholder="Enter remarks" />
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

              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { addImages(e.target.files); e.target.value = ""; }} />
              <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { addImages(e.target.files); e.target.value = ""; }} />

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

              {photos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2.5">
                  {photos.map((ph, idx) => (
                    <div key={idx} className="relative aspect-square rounded-[1rem] overflow-hidden border border-gray-100 shadow-sm bg-gray-50 group">
                      <img src={ph.preview} alt="upload" className="w-full h-full object-cover" />
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
                <Icon icon="mdi:magnify" /> Search Exchanges
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
                  <th className="p-4 font-bold">Item Type</th>
                  <th className="p-4 font-bold">Condition</th>
                  <th className="p-4 font-bold">Price Diff.</th>
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
                      <td className="p-4 text-gray-500">{row.itemType || "-"}</td>
                      <td className="p-4 text-gray-500">{row.condition || "-"}</td>
                      <td className="p-4 font-bold text-erp-primary">₹ {row.priceDifference} ({row.priceDifferenceMode})</td>
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
                              onClick={() => {
                                setSelectedExchangeId(row._id);
                                // Reset for fresh product selection
                                setSelectedProduct(null);
                                setProductSearchQuery("");
                                setProductSuggestions([]);
                                setSelectProductForm({
                                  priceDifferenceMode: row.priceDifferenceMode || "UPI",
                                  remarks: "",
                                });
                              }}
                              className="text-[10px] font-bold text-blue-600 hover:underline"
                            >
                              <Icon icon="codex:replace" className="text-base" />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(row._id, "Approved", "Approved by manager")}
                              className="text-[10px] font-bold text-emerald-600 hover:underline"
                            >
                              <Icon icon="material-symbols:check" className="text-base" />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(row._id, "Rejected", "Rejected by manager")}
                              className="text-[10px] font-bold text-rose-500 hover:underline"
                            >
                              <Icon icon="material-symbols:close" className="text-base" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">No exchange requests found</td>
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

      {/* Select Product Popup Modal */}
      {selectedExchangeId && createPortal(
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 overflow-y-auto" style={{ backdropFilter: 'none' }}>
          <div className="bg-white rounded-[2rem] max-w-lg w-full p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button onClick={() => setSelectedExchangeId(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
              <Icon icon="mdi:close" className="text-xl" />
            </button>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Select Exchange Product</h3>
              <p className="text-xs text-gray-500">Choose the new product details for this exchange request.</p>
            </div>

            <form onSubmit={handleSelectProductSubmit} className="space-y-5">
              {/* Product Search */}
              <div ref={searchRef} className="relative">
                <label className={labelCls}>Search Product *</label>
                <div className="relative">
                  <Icon icon="mdi:magnify" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                  <input
                    value={productSearchQuery}
                    onChange={(e) => handleProductSearch(e.target.value)}
                    onFocus={() => { if (productSuggestions.length > 0) setShowSuggestions(true); }}
                    className={`${inputCls} !pl-11`}
                    placeholder="Type to search... e.g. Zeiss, Essilor"
                    autoComplete="off"
                  />
                  {searchLoading && (
                    <Icon icon="mdi:loading" className="absolute right-4 top-1/2 -translate-y-1/2 text-erp-primary text-lg animate-spin" />
                  )}
                </div>
                {/* Suggestions Dropdown */}
                {showSuggestions && productSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[10000] max-h-56 overflow-y-auto custom-scrollbar">
                    {productSuggestions.map((item, idx) => (
                      <button
                        key={item._id || idx}
                        type="button"
                        onClick={() => handleSelectSuggestion(item)}
                        className="w-full text-left px-5 py-3 hover:bg-erp-primary/5 transition-colors flex items-center justify-between gap-3 border-b border-gray-50 last:border-0"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{item.productName || item.name}</p>
                          <p className="text-[11px] text-gray-400 truncate">
                            {item.brand && <span>{item.brand}</span>}
                            {item.category && <span> · {item.category}</span>}
                            {item.coating && <span> · {item.coating}</span>}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-erp-primary whitespace-nowrap">₹ {item.price || item.mrp || "-"}</span>
                      </button>
                    ))}
                  </div>
                )}
                {showSuggestions && productSuggestions.length === 0 && !searchLoading && productSearchQuery.length >= 2 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl z-[10000] p-4 text-center text-xs text-gray-400">
                    No products found for "{productSearchQuery}"
                  </div>
                )}
              </div>

              {/* Selected Product Preview Card */}
              {selectedProduct && (
                <div className="bg-gradient-to-br from-erp-primary/5 to-blue-50/50 border border-erp-primary/15 rounded-2xl p-5 relative">
                  <button type="button" onClick={handleClearProduct} className="absolute top-3 right-3 text-gray-400 hover:text-rose-500 transition-colors" title="Remove selection">
                    <Icon icon="mdi:close-circle" className="text-lg" />
                  </button>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-erp-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon icon="mdi:package-variant-closed" className="text-erp-primary text-xl" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{selectedProduct.productName || selectedProduct.name}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                        {selectedProduct.brand && (
                          <span className="text-[11px] text-gray-500"><span className="font-semibold text-gray-600">Brand:</span> {selectedProduct.brand}</span>
                        )}
                        {selectedProduct.category && (
                          <span className="text-[11px] text-gray-500"><span className="font-semibold text-gray-600">Category:</span> {selectedProduct.category}</span>
                        )}
                        {selectedProduct.coating && (
                          <span className="text-[11px] text-gray-500"><span className="font-semibold text-gray-600">Coating:</span> {selectedProduct.coating}</span>
                        )}
                        {selectedProduct.treatment && (
                          <span className="text-[11px] text-gray-500"><span className="font-semibold text-gray-600">Treatment:</span> {selectedProduct.treatment}</span>
                        )}
                        {(selectedProduct.index || selectedProduct.lensIndex) && (
                          <span className="text-[11px] text-gray-500"><span className="font-semibold text-gray-600">Index:</span> {selectedProduct.index || selectedProduct.lensIndex}</span>
                        )}
                      </div>
                      <p className="text-base font-black text-erp-primary mt-2">₹ {selectedProduct.price || selectedProduct.mrp || "—"}</p>
                    </div>
                  </div>
                </div>
              )}

              {!selectedProduct && (
                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center">
                  <Icon icon="mdi:package-variant-plus" className="text-3xl text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Search and select a product above</p>
                </div>
              )}

              <div className="h-px bg-gray-100" />

              {/* Payment Mode & Remarks */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Price Difference Mode</label>
                  <select
                    value={selectProductForm.priceDifferenceMode}
                    onChange={e => setSelectProductForm(prev => ({ ...prev, priceDifferenceMode: e.target.value }))}
                    className={`${inputCls} bg-white appearance-none`}
                  >
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="NIL">NIL (No Difference)</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Remarks</label>
                  <input
                    value={selectProductForm.remarks}
                    onChange={e => setSelectProductForm(prev => ({ ...prev, remarks: e.target.value }))}
                    className={inputCls}
                    placeholder="Customer's preference note"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setSelectedExchangeId(null); setSelectedProduct(null); setProductSearchQuery(""); setProductSuggestions([]); setSelectProductForm({ priceDifferenceMode: "UPI", remarks: "" }); }} className="px-6 py-2.5 rounded-full border border-gray-200 text-gray-500 font-bold text-xs hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={!selectedProduct} className={`px-8 py-2.5 text-white font-bold text-xs rounded-full shadow-lg transition-all ${selectedProduct ? 'bg-erp-primary hover:bg-erp-primary/95' : 'bg-gray-300 cursor-not-allowed'}`}>
                  Assign Product
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
