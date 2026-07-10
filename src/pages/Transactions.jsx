import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ArrowLeftRight, ArrowDownToLine, ArrowUpFromLine, RefreshCcw } from 'lucide-react';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    product_id: '',
    transaction_type: 'IN',
    quantity: '',
    remark: ''
  });

  useEffect(() => {
    fetchTransactions();
    fetchProducts();
  }, []);

  async function fetchProducts() {
    const { data } = await supabase.from('products').select('id, name, sku, current_qty').order('name');
    if (data) setProducts(data);
  }

  async function fetchTransactions() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select(`*, products(name, sku)`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error:', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.product_id || !formData.quantity) return;
    
    // === 🛡️ ด่านตรวจ: ป้องกันสต็อกติดลบ ===
    if (formData.transaction_type === 'OUT') {
      // ค้นหาข้อมูลสินค้าที่เรากำลังเลือกจาก Dropdown
      const selectedProduct = products.find(p => p.id.toString() === formData.product_id.toString());
      const requestQty = parseInt(formData.quantity);
      
      // เช็คว่าจำนวนที่ขอเบิก มากกว่า สต็อกปัจจุบันหรือไม่
      if (selectedProduct && requestQty > selectedProduct.current_qty) {
        alert(`❌ ไม่อนุมัติการเบิก!\nคุณต้องการเบิก ${requestQty} ชิ้น แต่มีสินค้าในคลังแค่ ${selectedProduct.current_qty} ชิ้นครับ`);
        return; // สั่งหยุดการทำงานทันที (ไม่ส่งข้อมูลไป Database)
      }
    }
    // ==================================

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('transactions').insert([{
        product_id: formData.product_id,
        transaction_type: formData.transaction_type,
        quantity: parseInt(formData.quantity),
        remark: formData.remark
      }]);

      if (error) throw error;
      
      setFormData({ ...formData, quantity: '', remark: '' });
      fetchTransactions();
      fetchProducts();
      
      alert('✅ บันทึกรายการสต็อกเรียบร้อยแล้ว!');
    } catch (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ArrowLeftRight className="text-teal-600" /> บันทึก รับ-จ่ายสต็อกสินค้า
        </h1>
        <p className="text-slate-500 mt-1">ทำรายการนำสินค้าเข้าคลัง เบิกสินค้าออก หรือปรับปรุงยอดสต็อกให้ตรงความจริง</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ฟอร์มทำรายการ */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-fit">
          <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">ทำรายการใหม่</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">เลือกสินค้า *</label>
              <select 
                required
                value={formData.product_id}
                onChange={(e) => setFormData({...formData, product_id: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all bg-white text-sm"
              >
                <option value="">-- กรุณาเลือกสินค้า --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (คงเหลือในคลัง: {p.current_qty})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ประเภทรายการ *</label>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => setFormData({...formData, transaction_type: 'IN'})} className={`py-2 rounded-xl text-xs font-semibold transition-all flex justify-center items-center gap-1 ${formData.transaction_type === 'IN' ? 'bg-teal-100 text-teal-700 border-2 border-teal-500' : 'bg-slate-50 text-slate-500 border-2 border-transparent hover:bg-slate-100'}`}>
                  <ArrowDownToLine className="w-4 h-4"/> รับเข้า (IN)
                </button>
                <button type="button" onClick={() => setFormData({...formData, transaction_type: 'OUT'})} className={`py-2 rounded-xl text-xs font-semibold transition-all flex justify-center items-center gap-1 ${formData.transaction_type === 'OUT' ? 'bg-amber-100 text-amber-700 border-2 border-amber-500' : 'bg-slate-50 text-slate-500 border-2 border-transparent hover:bg-slate-100'}`}>
                  <ArrowUpFromLine className="w-4 h-4"/> เบิกออก (OUT)
                </button>
                <button type="button" onClick={() => setFormData({...formData, transaction_type: 'ADJUST'})} className={`py-2 rounded-xl text-xs font-semibold transition-all flex justify-center items-center gap-1 ${formData.transaction_type === 'ADJUST' ? 'bg-blue-100 text-blue-700 border-2 border-blue-500' : 'bg-slate-50 text-slate-500 border-2 border-transparent hover:bg-slate-100'}`}>
                  <RefreshCcw className="w-4 h-4"/> ปรับปรุง (ADJ)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">จำนวนสินค้า *</label>
              <input 
                type="number" min="1" required
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                placeholder="ระบุจำนวน"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ / เหตุผล</label>
              <input 
                type="text"
                value={formData.remark}
                onChange={(e) => setFormData({...formData, remark: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                placeholder="เช่น เติมสต็อกสินค้าจากซัพพลายเออร์"
              />
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full py-3 rounded-xl font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-sm shadow-teal-200 mt-2">
              {isSubmitting ? 'กำลังประมวลผล...' : 'ยืนยันทำรายการ'}
            </button>
          </form>
        </div>

        {/* ตารางประวัติ */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-800">ประวัติการขยับสต็อกล่าสุด</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white text-slate-400 text-xs uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-3 font-semibold">วันที่-เวลา</th>
                  <th className="px-6 py-3 font-semibold">สินค้า</th>
                  <th className="px-6 py-3 font-semibold">ประเภท</th>
                  <th className="px-6 py-3 font-semibold text-right">จำนวน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-400">กำลังโหลดประวัติ...</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-400">ยังไม่มีประวัติการทำรายการสต็อก</td></tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(tx.created_at).toLocaleString('th-TH')}
                      </td>
                      <td className="px-6 py-4 text-slate-800 font-medium">
                        {tx.products?.name}
                        <span className="block text-xs text-slate-400">SKU: {tx.products?.sku}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                          tx.transaction_type === 'IN' ? 'bg-teal-100 text-teal-700' : 
                          tx.transaction_type === 'OUT' ? 'bg-amber-100 text-amber-700' : 
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {tx.transaction_type === 'IN' ? 'รับเข้า' : tx.transaction_type === 'OUT' ? 'เบิกออก' : 'ปรับยอด'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right font-bold ${
                        tx.transaction_type === 'IN' ? 'text-teal-600' : 
                        tx.transaction_type === 'OUT' ? 'text-amber-600' : 
                        'text-blue-600'
                      }`}>
                        {tx.transaction_type === 'IN' ? '+' : tx.transaction_type === 'OUT' ? '-' : ''}{tx.quantity.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}