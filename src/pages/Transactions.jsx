import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Package, ScanBarcode, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

export default function Transactions() {
  const [type, setType] = useState('IN');
  const [quantity, setQuantity] = useState(''); 
  const [sku, setSku] = useState('');
  
  // State ใหม่สำหรับระบบค้นหา
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchProducts();
    fetchHistory();
    
    // ฟังก์ชันสำหรับปิด Dropdown เวลากดคลิกพื้นที่ว่างข้างนอก
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*');
    if (data) setProducts(data);
  };

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('transactions')
      .select(`*, products(name, sku)`)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setHistory(data);
  };

  // ฟังก์ชันจัดการตอนพิมพ์ค้นหา
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSku(value); 
    
    if (value.length > 0) {
      const filtered = products.filter(p => 
        p.name.toLowerCase().includes(value.toLowerCase()) || 
        p.sku.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredProducts(filtered);
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  // ฟังก์ชันตอนกดเลือกสินค้าจากเมนู Dropdown
  const selectProduct = (selectedSku, selectedName) => {
    setSearchTerm(`${selectedSku} - ${selectedName}`); // โชว์ชื่อสวยๆ ในช่อง
    setSku(selectedSku); // แอบเก็บรหัส SKU ตัวจริงไว้หลังบ้าน
    setShowDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sku || !quantity) return alert('กรุณากรอกข้อมูลให้ครบถ้วน');
    
    const parsedQty = parseInt(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) return alert('จำนวนต้องมากกว่า 0');

    setLoading(true);
    try {
      let { data: product } = await supabase.from('products').select('*').eq('sku', sku.toUpperCase()).single();

      if (!product && type === 'IN') {
         const { data: newProduct, error } = await supabase.from('products').insert([{
           sku: sku.toUpperCase(),
           name: 'สินค้านำเข้าใหม่ (กรุณาอัปเดตชื่อ)',
           current_qty: 0,
         }]).select().single();
         if (error) throw error;
         product = newProduct;
      } else if (!product && type === 'OUT') {
         throw new Error('ไม่พบสินค้าในระบบ ไม่สามารถเบิกออกได้');
      }

      let newQty = product.current_qty;
      if (type === 'IN') newQty += parsedQty;
      if (type === 'OUT') {
         if (newQty < parsedQty) throw new Error(`สต็อกไม่เพียงพอ! (คงเหลือ ${newQty} ชิ้น)`);
         newQty -= parsedQty;
      }

      await supabase.from('products').update({ current_qty: newQty }).eq('id', product.id);

      await supabase.from('transactions').insert([{
        product_id: product.id,
        transaction_type: type,
        quantity: parsedQty
      }]);

      alert('บันทึกรายการสำเร็จ!');
      // ล้างข้อมูลหลังบันทึกเสร็จให้เป็นช่องว่างพร้อมทำงานรอบถัดไป
      setSku('');
      setSearchTerm('');
      setQuantity(''); 
      fetchProducts();
      fetchHistory();
    } catch (error) {
      alert('ข้อผิดพลาด: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ArrowDownToLine className="text-teal-600" /> บันทึก รับ-จ่ายสต็อก
        </h1>
        <p className="text-slate-500 mt-1">ค้นหาสินค้าหรือสแกนบาร์โค้ดเพื่ออัปเดตยอดคลังสินค้า</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
            
            <div className="space-y-1.5" ref={dropdownRef}>
              <label className="text-sm font-semibold text-slate-700">ค้นหาสินค้า / บาร์โค้ด (SKU) *</label>
              <div className="flex gap-2 relative">
                <input
                  type="text"
                  placeholder="พิมพ์ชื่อสินค้า หรือ รหัส..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="flex-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                />
                <button type="button" className="bg-slate-800 hover:bg-slate-700 text-white p-2.5 rounded-xl transition-colors shrink-0">
                  <ScanBarcode className="w-5 h-5" />
                </button>

                {/* เมนู Dropdown ที่จะเด้งขึ้นมาตอนพิมพ์ */}
                {showDropdown && (
                  <ul className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-100 shadow-xl rounded-xl max-h-60 overflow-auto">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map(p => (
                        <li 
                          key={p.id}
                          onClick={() => selectProduct(p.sku, p.name)}
                          className="px-4 py-3 hover:bg-teal-50 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between items-center"
                        >
                          <div>
                            <div className="font-semibold text-slate-800 text-sm">{p.name}</div>
                            <div className="text-xs text-slate-400">SKU: {p.sku}</div>
                          </div>
                          <div className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-md">
                            เหลือ {p.current_qty}
                          </div>
                        </li>
                      ))
                    ) : (
                      <li className="px-4 py-3 text-sm text-slate-400 text-center bg-slate-50">ไม่พบสินค้าในระบบ</li>
                    )}
                  </ul>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">ประเภทรายการ *</label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setType('IN')} className={`py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border-2 transition-all ${type === 'IN' ? 'border-teal-500 text-teal-700 bg-teal-50' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}>
                  <ArrowDownToLine className="w-4 h-4" /> รับเข้า (IN)
                </button>
                <button type="button" onClick={() => setType('OUT')} className={`py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border-2 transition-all ${type === 'OUT' ? 'border-orange-500 text-orange-700 bg-orange-50' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}>
                  <ArrowUpFromLine className="w-4 h-4" /> เบิกออก (OUT)
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">จำนวน *</label>
              <input
                type="number"
                min="1"
                placeholder="ระบุจำนวน..."
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
              />
            </div>

            <button type="submit" disabled={loading} className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 mt-4">
              <Package className="w-5 h-5" />
              {loading ? 'กำลังบันทึก...' : type === 'IN' ? 'ยืนยันการรับสินค้าเข้า' : 'ยืนยันการเบิกสินค้าออก'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-full">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-4 mb-4">ประวัติการทำรายการล่าสุด</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100">
                    <th className="pb-3 font-medium px-2">วันเวลา</th>
                    <th className="pb-3 font-medium px-2">รายการสินค้า</th>
                    <th className="pb-3 font-medium text-right px-2">จำนวน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {history.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-2 text-slate-500">
                        {new Date(tx.created_at).toLocaleString('th-TH', { 
                          year: 'numeric', month: 'short', day: 'numeric', 
                          hour: '2-digit', minute: '2-digit' 
                        })}
                      </td>
                      <td className="py-3 px-2">
                        <div className="font-semibold text-slate-800">{tx.products?.name || 'ลบแล้ว'}</div>
                        <div className="text-xs text-slate-400">SKU: {tx.products?.sku}</div>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold ${
                          tx.transaction_type === 'IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {tx.transaction_type === 'IN' ? '+' : '-'}{tx.quantity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}