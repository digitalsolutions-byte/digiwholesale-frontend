import { useState, useRef, useEffect, useCallback } from "react";
import api from "../../utils/api";
import { toast } from "react-toastify";
import { Icon } from "@iconify/react";

const inputCls = "w-full bg-gray-50/50 border border-gray-100 rounded-full px-5 py-2.5 text-xs font-bold text-gray-700 outline-none focus:border-erp-accent/30 focus:ring-4 focus:ring-erp-accent/5 transition-all placeholder:text-gray-300";
const labelCls = "text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-4";

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

export default function AddRepair() {
  const today = new Date().toISOString().split("T")[0];
  const [formData, setFormData] = useState({ name: "", mobile: "", email: "", item: "", issue: "", deliveryDate: "", price: "", remark: "" });
  const [images, setImages] = useState([]); // {file, preview}
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  useEffect(() => { return () => images.forEach(img => URL.revokeObjectURL(img.preview)); }, [images]);

  const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };

  const addImages = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    const incoming = Array.from(files);
    if (incoming.length + images.length > 10) {
      toast.error("Maximum 10 images allowed"); return;
    }
    setProcessing(true);
    try {
      const normalized = await Promise.all(incoming.map(normalizeToJpeg));
      setImages(prev => [
        ...prev,
        ...normalized.map(file => ({ file, preview: URL.createObjectURL(file) }))
      ]);
    } catch (err) {
      toast.error("Image processing failed");
    } finally { setProcessing(false); }
  }, [images]);

  const removeImage = useCallback((index) => {
    setImages(prev => { URL.revokeObjectURL(prev[index].preview); return prev.filter((_, i) => i !== index); });
  }, []);

  const clearAll = useCallback(() => { setImages(prev => { prev.forEach(img => URL.revokeObjectURL(img.preview)); return []; }); }, []);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!formData.name) return toast.error("Customer name required");
    if (!formData.mobile) return toast.error("Mobile required");
    if (!formData.item) return toast.error("Item required");

    try {
      setLoading(true);
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      images.forEach(img => data.append("images", img.file, img.file.name || "camera.jpg"));
      const res = await api.post("/repair/", data);
      if (res.data.success) {
        toast.success("Repair request initiated");
        setFormData({ name: "", mobile: "", email: "", item: "", issue: "", deliveryDate: "", price: "", remark: "" });
        clearAll();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-8">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Initiate Repair Request</h1>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-1">Diagnostic Intake & Inventory Registration</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* LEFT PANEL — Repair Details */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
            <div className="flex items-center gap-4 px-8 py-6 border-b border-gray-50 bg-gray-50/30">
              <div className="w-10 h-10 rounded-2xl bg-erp-accent/5 border border-erp-accent/10 text-erp-accent flex items-center justify-center">
                <Icon icon="mdi:tools" className="text-xl" />
              </div>
              <span className="text-xs font-black text-gray-700 uppercase tracking-[0.2em]">Diagnostic Parameters</span>
            </div>
            <div className="p-8 space-y-8">
              {/* Customer */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-erp-accent uppercase tracking-[0.2em] flex items-center gap-2 ml-2">
                    <Icon icon="mdi:account-circle-outline" className="text-lg" /> Customer Identity
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div><label className={labelCls}>Legal Name *</label><input name="name" value={formData.name} onChange={handleChange} className={inputCls} placeholder="John Doe" /></div>
                    <div><label className={labelCls}>Contact Mobile *</label><input name="mobile" value={formData.mobile} onChange={handleChange} maxLength={10} className={inputCls} placeholder="9876543210" /></div>
                    <div className="sm:col-span-2"><label className={labelCls}>Email Address</label><input name="email" value={formData.email} onChange={handleChange} className={inputCls} placeholder="john@example.com" /></div>
                </div>
              </div>

              <div className="h-px bg-gray-50" />

              {/* Item */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-erp-accent uppercase tracking-[0.2em] flex items-center gap-2 ml-2">
                    <Icon icon="mdi:package-variant-closed" className="text-lg" /> Asset Manifest
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div><label className={labelCls}>Item Description *</label><input name="item" value={formData.item} onChange={handleChange} className={inputCls} placeholder="e.g. Frame X-20" /></div>
                    <div><label className={labelCls}>Estimated Service Fee</label><input type="number" name="price" value={formData.price} onChange={handleChange} className={inputCls} placeholder="₹ 0.00" /></div>
                </div>
                <div><label className={labelCls}>Observed Issues / Faults</label><textarea name="issue" rows={3} value={formData.issue} onChange={handleChange} className={`${inputCls} rounded-[1.5rem] py-4 resize-none`} placeholder="Describe the technical fault..." /></div>
              </div>

              <div className="h-px bg-gray-50" />

              {/* Delivery */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-erp-accent uppercase tracking-[0.2em] flex items-center gap-2 ml-2">
                    <Icon icon="mdi:calendar-clock" className="text-lg" /> Commitment Timeline
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div><label className={labelCls}>Expected Delivery</label><input type="date" name="deliveryDate" min={today} value={formData.deliveryDate} onChange={handleChange} className={inputCls} /></div>
                </div>
                <div><label className={labelCls}>Administrative Remarks</label><textarea name="remark" rows={3} value={formData.remark} onChange={handleChange} className={`${inputCls} rounded-[1.5rem] py-4 resize-none`} placeholder="Internal notes or special instructions..." /></div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL — Photos */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden sticky top-8">
            <div className="flex items-center justify-between px-8 py-6 border-b border-gray-50 bg-gray-50/30">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-erp-accent/5 border border-erp-accent/10 text-erp-accent flex items-center justify-center">
                    <Icon icon="mdi:camera-outline" className="text-xl" />
                </div>
                <span className="text-xs font-black text-gray-700 uppercase tracking-[0.2em]">Visual Evidence</span>
              </div>
              <span className="text-[10px] font-black bg-erp-accent text-white px-4 py-1 rounded-full shadow-lg shadow-erp-accent/20 uppercase tracking-widest">{images.length} / 10 Images</span>
            </div>
            <div className="p-8">
              {/* Hidden Inputs */}
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { addImages(e.target.files); e.target.value = ""; }} />
              <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { addImages(e.target.files); e.target.value = ""; }} />

              {/* Upload Buttons */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <button type="button" onClick={() => cameraRef.current?.click()} disabled={images.length >= 10} 
                    className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-erp-accent/10 bg-erp-accent/[0.02] hover:bg-erp-accent/5 hover:border-erp-accent/30 rounded-[2rem] py-8 transition-all group disabled:opacity-40">
                    <Icon icon="mdi:camera" className="text-3xl text-erp-accent/40 group-hover:text-erp-accent group-hover:scale-110 transition-all" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-erp-accent">Launch Camera</span>
                </button>
                <button type="button" onClick={() => galleryRef.current?.click()} disabled={images.length >= 10} 
                    className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-100 bg-gray-50/50 hover:bg-gray-100 hover:border-gray-200 rounded-[2rem] py-8 transition-all group disabled:opacity-40">
                    <Icon icon="mdi:image-multiple-outline" className="text-3xl text-gray-300 group-hover:text-gray-500 group-hover:scale-110 transition-all" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-gray-600">Select Gallery</span>
                </button>
              </div>

              {/* Thumbnails */}
              {images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 animate-fadeIn">
                  {images.map((img, i) => (
                    <div key={img.preview} className="relative group aspect-square rounded-[1.5rem] overflow-hidden border border-gray-100 shadow-sm bg-gray-50">
                      <img src={img.preview} alt={`photo-${i + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                        <button type="button" onClick={() => removeImage(i)} className="bg-rose-500 hover:bg-rose-600 active:scale-90 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-xl transition-all">
                            <Icon icon="mdi:trash-can-outline" className="text-xl" />
                        </button>
                      </div>
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter border border-white/10">
                        Asset {i + 1}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-gray-200">
                    <Icon icon="mdi:image-off-outline" className="text-6xl mb-3 opacity-10" />
                    <p className="text-[9px] font-black uppercase tracking-[0.3em]">No Visual Evidence Attached</p>
                </div>
              )}

              {processing && (
                <div className="mt-6 flex items-center justify-center gap-3 text-erp-accent font-black text-[10px] uppercase tracking-widest bg-erp-accent/5 py-4 rounded-2xl">
                    <Icon icon="mdi:loading" className="animate-spin text-xl" /> Optimizing High-Res Assets...
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-10 pb-10">
          <button type="submit" disabled={loading || processing} 
            className="flex items-center gap-3 bg-erp-accent hover:bg-erp-accent/90 active:scale-95 disabled:opacity-50 text-white text-xs font-black uppercase tracking-[0.2em] px-12 py-4 rounded-full transition-all shadow-2xl shadow-erp-accent/30">
            {loading ? (
                <Icon icon="mdi:loading" className="animate-spin text-xl" />
            ) : (
                <Icon icon="mdi:content-save-check" className="text-xl" />
            )}
            {loading ? "Synchronizing..." : "Finalize & Create Repair"}
          </button>
        </div>
      </form>
    </div>
  );
}