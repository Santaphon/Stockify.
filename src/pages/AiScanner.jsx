import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Sparkles, Upload, FileText, CheckCircle2, RefreshCw,X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AiScanner() {
  const { user } = useAuth();
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  // 1. แปลงไฟล์รูปภาพให้อยู่ในฟอร์แมตที่ Gemini อ่านได้ (Base64)
  const fileToGenerativePart = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({
          inlineData: {
            data: reader.result.split(',')[1],
            mimeType: file.type
          },
        });
      };
      reader.readAsDataURL(file);
    });
  };

  // 2. ฟังก์ชันส่งรูปภาพไปให้ Gemini AI วิเคราะห์
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setScannedData(null);
    }
  };

  const handleScanWithAi = async () => {
    if (!image) return alert('กรุณาเลือกหรือถ่ายรูปภาพเอกสารก่อนครับ');
    
    setLoading(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error('ไม่พบ VITE_GEMINI_API_KEY ในระบบ');

      const genAI = new GoogleGenerativeAI(apiKey);
      // ใช้โมเดลความเร็วสูงที่เก่งเรื่องวิเคราะห์ภาพ
      const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

      const imagePart = await fileToGenerativePart(image);
      
      // สั่งงาน AI ด้วย Prompt ภาษาไทยที่เจาะจงผลลัพธ์เป็น JSON เพื่อความแม่นยำ
      const prompt = `
        คุณคือระบบ AI ตรวจสอบเอกสารคลังสินค้า หน้าที่ของคุณคืออ่านภาพใบส่งของ ฉลากสินค้า หรือใบเสร็จที่แนบมานี้
        แล้วดึงข้อมูลออกมาในรูปแบบ JSON เท่านั้น ห้ามมีข้อความอธิบายอื่นเด็ดขาด โครงสร้าง JSON ต้องเป็นดังนี้:
        {
          "sku": "รหัสสินค้าหรือบาร์โค้ดที่เจอในภาพ ถ้าไม่เจอให้เดาหรือสร้างรหัสสั้นๆ ภาษาอังกฤษที่เหมาะกับสินค้านั้น เช่น CHAIR-01",
          "product_name": "ชื่อสินค้าภาษาไทยหรือภาษาอังกฤษที่ระบุในเอกสาร",
          "quantity": ตัวเลขจำนวนสินค้าเท่านั้น เป็นแบบ Integer (เช่น 10)
        }
        แกะข้อมูลให้ถูกต้องที่สุด หากชื่อยาวเกินไปให้สรุปให้กระชับ
      `;

      const result = await model.generateContent([prompt, imagePart]);
      const responseText = result.response.text();
      
      // ทำความสะอาดข้อความ เผื่อ AI ใส่เครื่องหมาย Markdown ถ่วงมา
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(cleanJson);
      
      setScannedData(parsedData);
    } catch (error) {
      console.error("AI Error:", error);
      alert("AI เกิดข้อผิดพลาดในการอ่านรูปภาพ: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. ฟังก์ชันบันทึกข้อมูลที่ AI แกะได้ ลงในตารางสินค้า/ประวัติสต็อกจริง
  const handleConfirmSave = async () => {
    if (!scannedData) return;
    setIsSaving(true);
    try {
      // 👇 อัปเดต: ค้นหาดูก่อนว่ามีสินค้า SKU นี้ในระบบคลังเราหรือยัง (และต้องยังไม่ถูกลบ)
      const { data: existingProduct } = await supabase
        .from('products')
        .select('*')
        .eq('sku', scannedData.sku.toUpperCase())
        .eq('is_active', true) // 👈 เพิ่มตัวกรอง Soft Delete ตรงนี้
        .single();

      let productId = null;
      let currentQty = 0;

      if (existingProduct) {
        productId = existingProduct.id;
        // ลบคำสั่ง update products ทิ้งไปเลย ปล่อยให้ Trigger ของฐานข้อมูลทำหน้าที่บวกเลขแทน
      } else {
        const { data: newProd, error: insertError } = await supabase
          .from('products')
          .insert([{
            sku: scannedData.sku.toUpperCase(),
            name: scannedData.product_name,
            current_qty: 0, // 👈 เปลี่ยนให้สินค้าใหม่เริ่มต้นที่ 0 ชิ้นเสมอ (เดี๋ยว Trigger เอาไปบวกให้เอง)
            min_stock: 5
            // 💡 หมายเหตุ: หากต้องการให้ AI เดา Location ด้วย สามารถเพิ่มช่อง location ตรงนี้ได้ในอนาคต
          }])
          .select()
          .single();
        if (insertError) throw insertError;
        productId = newProd.id;
      }

      // 👇 อัปเดต: บันทึกประวัติรับเข้าสต็อก พร้อมแนบอีเมลผู้ใช้งาน (Audit Log)
      const { error: txError } = await supabase.from('transactions').insert([{
        product_id: productId,
        transaction_type: 'IN',
        quantity: scannedData.quantity,
        user_email: user.email // 👈 เพิ่มบรรทัดนี้เพื่อให้ระบุตัวตนคนทำรายการ
      }]);
      if (txError) throw txError;

      // 👇 ใช้ State แทน alert
      setSuccessMsg(`เพิ่ม "${scannedData.product_name}" จำนวน ${scannedData.quantity} ชิ้น เรียบร้อยครับ`);
      
      // 👇 สั่งให้ป๊อปอัปหายไปเองใน 4 วินาที
      setTimeout(() => {
        setSuccessMsg(null);
      }, 4000);

      setImage(null);
      setImagePreview(null);
      setScannedData(null);
    } catch (error) {
      alert("บันทึกล้มเหลว: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* 🟢 ป๊อปอัปแจ้งเตือน (Toast) */}
      {successMsg && (
        <div className="fixed top-6 right-6 bg-white border-l-4 border-emerald-500 shadow-2xl rounded-xl p-4 flex items-start gap-4 z-50 animate-in slide-in-from-right-8 fade-in duration-300">
          <div className="bg-emerald-100 p-1.5 rounded-full mt-0.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="pr-6">
            <h4 className="font-bold text-slate-800 text-sm">บันทึกเข้าคลังสินค้าสำเร็จ! 🎉</h4>
            <p className="text-sm text-slate-500 mt-1">{successMsg}</p>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-slate-400 hover:text-slate-600 transition-colors absolute top-4 right-4">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Sparkles className="text-teal-600 fill-teal-100" /> สแกนบิลด้วย AI Vision
        </h1>
        <p className="text-slate-500 mt-1">ถ่ายภาพหรืออัปโหลดใบส่งของ เพื่อใช้ AI ช่วยกรอกข้อมูลสินค้าเข้าคลังอัตโนมัติ</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ฝั่งซ้าย: อัปโหลดและแสดงรูปภาพ */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center space-y-4 min-h-[350px]">
          {imagePreview ? (
            <div className="w-full space-y-4">
              <img src={imagePreview} alt="Preview" className="w-full h-64 object-contain rounded-xl border bg-slate-50" />
              <div className="flex gap-2">
                <label className="flex-1 py-2.5 text-center text-sm font-medium border rounded-xl cursor-pointer hover:bg-slate-50 text-slate-600">
                  <RefreshCw className="w-4 h-4 inline mr-1" /> เปลี่ยนรูปภาพ
                  <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
                </label>
                <button onClick={handleScanWithAi} disabled={loading} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl text-sm flex justify-center items-center gap-2 disabled:opacity-50 shadow-sm shadow-teal-100">
                  {loading ? 'AI กำลังอ่านข้อมูล...' : <><Sparkles className="w-4 h-4"/> สั่ง AI สแกนรูป</>}
                </button>
              </div>
            </div>
          ) : (
            <label className="w-full h-64 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center space-y-2 cursor-pointer hover:bg-slate-50 transition-colors p-4">
              <div className="bg-slate-100 p-4 rounded-full text-slate-500"><Upload className="w-6 h-6" /></div>
              <p className="font-medium text-slate-700 text-sm">กดเพื่อถ่ายภาพ หรือ อัปโหลดรูปภาพ</p>
              <p className="text-xs text-slate-400">รองรับภาพถ่ายใบส่งสินค้า บิลใบเสร็จ หรือป้ายสลากสินค้า</p>
              <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
            </label>
          )}
        </div>

        {/* ฝั่งขวา: ผลลัพธ์ที่ AI ดึงได้ */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between min-h-[350px]">
          <div>
            <h3 className="font-bold text-slate-800 border-b pb-3 flex items-center gap-2"><FileText className="w-5 h-5 text-slate-400"/> ผลลัพธ์การตรวจสอบจาก AI</h3>
            
            {loading ? (
              <div className="py-12 text-center text-slate-400 space-y-3">
                <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-sm">Gemini AI กำลังวิเคราะห์และแกะตัวหนังสือไทยในภาพ...</p>
              </div>
            ) : scannedData ? (
              <div className="mt-4 space-y-4 animate-in fade-in">
                <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">รหัสสินค้าแนะนำ (SKU)</span>
                    <input type="text" value={scannedData.sku} onChange={(e) => setScannedData({...scannedData, sku: e.target.value})} className="w-full bg-white border px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-800 outline-none focus:border-teal-500 mt-0.5 uppercase" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">ชื่อสินค้าที่พบ</span>
                    <input type="text" value={scannedData.product_name} onChange={(e) => setScannedData({...scannedData, product_name: e.target.value})} className="w-full bg-white border px-3 py-1.5 rounded-lg text-sm text-slate-800 outline-none focus:border-teal-500 mt-0.5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">จำนวนสินค้าที่แกะได้ (ชิ้น)</span>
                    <input type="number" value={scannedData.quantity} onChange={(e) => setScannedData({...scannedData, quantity: parseInt(e.target.value) || 0})} className="w-full bg-white border px-3 py-1.5 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-teal-500 mt-0.5" />
                  </div>
                </div>
                <p className="text-xs text-slate-400 italic">*คุณสามารถตรวจเช็คความถูกต้องและแก้ไขข้อมูลในกล่องด้านบนได้ก่อนกดยืนยัน</p>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 text-sm">ยังไม่มีข้อมูลรูปภาพ ให้ส่งภาพเข้ามาระบบจะกรอกให้อัตโนมัติที่นี่ครับ</div>
            )}
          </div>

          {scannedData && !loading && (
            <button onClick={handleConfirmSave} disabled={isSaving} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex justify-center items-center gap-2 shadow-md shadow-emerald-100 transition-colors mt-4">
              <CheckCircle2 className="w-5 h-5" />
              {isSaving ? 'กำลังบันทึกลงคลังสินค้า...' : 'ถูกต้อง ยืนยันการนำเข้าสต็อก'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}