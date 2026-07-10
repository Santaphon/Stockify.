import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ArrowLeftRight, ScanLine, X, PackagePlus, PackageMinus } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State สำหรับฟอร์มและกล้อง
  const [formData, setFormData] = useState({ sku: '', type: 'IN', qty: '' });
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  // 📷 ควบคุมการเปิด/ปิดกล้องสแกนบาร์โค้ด
  useEffect(() => {
    let scanner = null;
    if (isScanning) {
      scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render(
        (decodedText) => {
          // สแกนสำเร็จ -> นำรหัสไปใส่ในช่อง SKU และปิดกล้อง
          setFormData(prev => ({ ...prev, sku: decodedText }));
          setIsScanning(false);
        },
        (errorMessage) => {
          // ซ่อน Error กรณีที่มันแค่กำลังพยายามโฟกัสหาบาร์โค้ด
        }
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [isScanning]);

  async function fetchTransactions() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select(`id, created_at, transaction_type, quantity, products(sku, name)`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  // 💾 ฟังก์ชันบันทึกการรับ-จ่าย พร้อมคำนวณสต็อกอัตโนมัติ
  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // 1. ค้นหาสินค้าจาก SKU ที่พิมพ์หรือสแกนมา
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('sku', formData.sku)
        .single();

      if (productError || !product) throw new Error('ไม่พบรหัสสินค้านี้ในระบบครับ กรุณาตรวจสอบ SKU อีกครั้ง');

      const qty = parseInt(formData.qty);
      
      // 2. คำนวณสต็อกใหม่ และเช็คว่าติดลบไหม
      const newQty = formData.type === 'IN' ? product.current_qty + qty : product.current_qty - qty;
      if (newQty < 0) throw new Error(`ไม่สามารถเบิกออกได้ครับ! สินค้า "${product.name}" มีสต็อกคงเหลือแค่ ${product.current_qty} ชิ้น`);

      // 3. บันทึกประวัติลงตาราง Transactions
      const { error: txError } = await supabase.from('transactions').insert([{
        product_id: product.id,
        transaction_type: formData.type,
        quantity: qty
      }]);
      if (txError) throw txError;

      // 4. อัปเดตยอดคงเหลือในตาราง Products
      const { error: updateError } = await supabase.from('products').update({ current_qty: newQty }).eq('id', product.id);
      if (updateError) throw updateError;

      alert(`บันทึกรายการสำเร็จ!\nยอดคงเหลือล่าสุดของ ${product.name} คือ ${newQty} ชิ้น`);
      setFormData({ sku: '', type: 'IN', qty: '' });
      fetchTransactions();
    } catch (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ArrowLeftRight className="text-teal-600" /> บันทึก รับ-จ่ายสต็อก
        </h1>
        <p className="text-slate-500 mt-1">สแกนบาร์โค้ดหรือกรอกรหัสสินค้าเพื่ออัปเดตยอดคลังสินค้า</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ฝั่งซ้าย: ฟอร์มทำรายการ */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-fit">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">รหัสสินค้า / บาร์โค้ด (SKU) *</label>
              <div className="flex gap-2">
                <input 
                  type="text" required
                  value={formData.sku}
                  onChange={(e) => setFormData({...formData, sku: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none uppercase"
                  placeholder="พิมพ์หรือสแกน..."
                />
                <button 
                  type="button" 
                  onClick={() => setIsScanning(true)}
                  className="bg-slate-800 text-white p-2.5 rounded-xl hover:bg-slate-700 transition-colors flex-shrink-0"
                  title="เปิดกล้องสแกนบาร์โค้ด"
                >
                  <ScanLine className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ประเภทรายการ *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, type: 'IN'})}
                  className={`py-3 rounded-xl font-bold text-sm flex justify-center items-center gap-2 border-2 transition-all ${formData.type === 'IN' ? 'bg-teal-50 border-teal-500 text-teal-700' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}
                >
                  <PackagePlus className="w-5 h-5" /> รับเข้า (IN)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, type: 'OUT'})}
                  className={`py-3 rounded-xl font-bold text-sm flex justify-center items-center gap-2 border-2 transition-all ${formData.type === 'OUT' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}
                >
                  <PackageMinus className="w-5 h-5" /> เบิกออก (OUT)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">จำนวน *</label>
              <input 
                type="number" min="1" required
                value={formData.qty}
                onChange={(e) => setFormData({...formData, qty: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none"
                placeholder="ระบุจำนวนชิ้น..."
              />
            </div>

            <button 
              type="submit" disabled={isSubmitting} 
              className={`w-full py-3 rounded-xl font-medium text-white shadow-sm transition-colors mt-4 ${formData.type === 'IN' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-amber-500 hover:bg-amber-600'} disabled:opacity-50`}
            >
              {isSubmitting ? 'กำลังประมวลผล...' : (formData.type === 'IN' ? 'ยืนยันการรับสินค้าเข้า' : 'ยืนยันการเบิกสินค้าออก')}
            </button>
          </form>
        </div>

        {/* ฝั่งขวา: ประวัติการทำรายการล่าสุด */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-800">ประวัติการทำรายการ 20 รายการล่าสุด</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-400 text-xs uppercase border-b border-slate-100">
                  <th className="px-6 py-3 font-semibold">วันเวลา</th>
                  <th className="px-6 py-3 font-semibold">รายการสินค้า</th>
                  <th className="px-6 py-3 font-semibold text-right">จำนวน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="3" className="px-6 py-8 text-center text-slate-400">กำลังโหลด...</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan="3" className="px-6 py-8 text-center text-slate-400">ยังไม่มีประวัติการทำรายการ</td></tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(tx.created_at).toLocaleString('th-TH')}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">{tx.products?.name}</p>
                        <p className="text-xs text-slate-400">SKU: {tx.products?.sku}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-bold ${
                          tx.transaction_type === 'IN' ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {tx.transaction_type === 'IN' ? '+' : '-'}{tx.quantity}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal กล้องสแกนบาร์โค้ด */}
      {isScanning && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><ScanLine className="w-5 h-5"/> สแกนบาร์โค้ด / QR Code</h3>
              <button onClick={() => setIsScanning(false)} className="text-slate-400 hover:text-red-500 p-1"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-4 bg-black">
              {/* กล่องสำหรับแสดงภาพจากกล้อง */}
              <div id="reader" className="w-full rounded-lg overflow-hidden border-2 border-teal-500/50"></div>
            </div>
            <div className="p-4 bg-slate-50 text-center text-sm text-slate-500">
              หันกล้องไปที่บาร์โค้ดของสินค้า รหัสจะถูกกรอกโดยอัตโนมัติ
            </div>
          </div>
        </div>
      )}
    </div>
  );
}