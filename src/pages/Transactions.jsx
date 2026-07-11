import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Package, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../contexts/AuthContext';

export default function Transactions() {
  const { user } = useAuth();

  const [type, setType] = useState('IN');
  const [quantity, setQuantity] = useState(''); 
  const [sku, setSku] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const isSubmitting = useRef(false);
  


  useEffect(() => {
    fetchProducts();
    fetchHistory();
    
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

  // 🛡️ อัปเกรดฟังก์ชันค้นหาให้กัน Error กรณีชื่อสินค้าเป็น Null
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSku(value); 
    
    if (value.length > 0) {
      const filtered = products.filter(p => {
        // ใช้ || '' เพื่อป้องกัน Error ถ้า p.name หรือ p.sku ไม่มีข้อมูล
        const nameMatch = (p.name || '').toLowerCase().includes(value.toLowerCase());
        const skuMatch = (p.sku || '').toLowerCase().includes(value.toLowerCase());
        return nameMatch || skuMatch;
      });
      setFilteredProducts(filtered);
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  const selectProduct = (selectedSku, selectedName) => {
    setSearchTerm(`${selectedSku} - ${selectedName}`); 
    setSku(selectedSku); 
    setShowDropdown(false);
  };

   const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting.current) return; 
    isSubmitting.current = true; 

    if (!sku || !quantity) {
      isSubmitting.current = false;
      // 🎨 1. แจ้งเตือน: ลืมกรอกข้อมูล
      return Swal.fire({
        icon: 'warning',
        title: 'ข้อมูลไม่ครบ',
        text: 'กรุณากรอกรหัสสินค้าและจำนวนให้ครบถ้วน',
        confirmButtonColor: '#0d9488'
      });
    }
    
    const parsedQty = parseInt(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      isSubmitting.current = false;
      // 🎨 2. แจ้งเตือน: ใส่จำนวนผิด
      return Swal.fire({
        icon: 'warning',
        title: 'จำนวนไม่ถูกต้อง',
        text: 'กรุณาระบุจำนวนที่มากกว่า 0',
        confirmButtonColor: '#0d9488'
      });
    }

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

      if (type === 'OUT') {
         if (product.current_qty < parsedQty) {
             setLoading(false);
             isSubmitting.current = false;
             // 🎨 3. แจ้งเตือน: สต็อกไม่พอ (แทนหน้าต่าง Error ดั้งเดิม)
             return Swal.fire({
               icon: 'error',
               title: 'เบิกไม่ได้! สต็อกไม่พอ',
               html: `สินค้ามีอยู่ <b>${product.current_qty}</b> ชิ้น<br>แต่ต้องการเบิก <b>${parsedQty}</b> ชิ้น`,
               confirmButtonColor: '#ef4444' // ใช้ปุ่มสีแดงให้รู้ว่าเป็น Error
             });
         }
      }

      await supabase.from('transactions').insert([{
        product_id: product.id,
        transaction_type: type,
        quantity: parsedQty,
        user_email: user.email,
      }]);

      // 🎯 ดึงค่าแจ้งเตือนขั้นต่ำจากฐานข้อมูล (ถ้าไม่ได้ตั้งไว้ ให้ถือว่าเป็น 0)
      // ⚠️ เปลี่ยนคำว่า min_stock ให้ตรงกับชื่อคอลัมน์ใน Supabase ของคุณนะครับ
      const alertThreshold = product.min_stock || 0; 
      
      const remainingQty = product.current_qty - parsedQty;

      // 🎯 เปลี่ยนจากเลข 5 เป็นตัวแปร alertThreshold ที่ดึงมาจากฐานข้อมูล
      if (type === 'OUT' && remainingQty <= alertThreshold) {
        try {
          await fetch('/api/line', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `⚠️ แจ้งเตือนสต็อกต่ำกว่ากำหนด!\n📦 สินค้า: ${product.name}\n🔑 SKU: ${product.sku}\n📉 คงเหลือ: ${remainingQty} ชิ้น\n(ตั้งเตือนขั้นต่ำไว้ที่: ${alertThreshold} ชิ้น)\nรีบสั่งซื้อเพิ่มด่วนเลยครับ!`
            })
          });
        } catch (err) {
          console.error("LINE Notify Error:", err);
        }
      }

      // 🎨 4. แจ้งเตือน: บันทึกสำเร็จ (แบบเด้งแล้วหายไปเอง ไม่ต้องกด OK)
      Swal.fire({
        icon: 'success',
        title: 'บันทึกรายการสำเร็จ!',
        text: 'ระบบได้อัปเดตสต็อกเรียบร้อยแล้ว',
        timer: 1500, // หายไปเองใน 1.5 วินาที
        showConfirmButton: false
      });
      
      setSku('');
      setSearchTerm('');
      setQuantity(''); 
      fetchProducts();
      fetchHistory();
      
    } catch (error) {
      // 🎨 5. แจ้งเตือน: Error ระบบหลังบ้าน
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error.message,
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setLoading(false);
      isSubmitting.current = false; 
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ArrowDownToLine className="text-teal-600" /> บันทึก รับ-จ่ายสต็อก
        </h1>
        <p className="text-slate-500 mt-1">ค้นหาสินค้าหรือสแกนบาร์โค้ดเพื่ออัปเดตยอดคลังสินค้า</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5 relative">
            
            <div className="space-y-1.5 relative" ref={dropdownRef}>
              <label className="text-sm font-semibold text-slate-700">ค้นหาสินค้า / บาร์โค้ด (SKU) *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="พิมพ์ชื่อสินค้า หรือ รหัส..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  // 🛡️ เพิ่ม onFocus เพื่อให้เมนูเด้งกลับมาทันทีที่คลิกช่องค้นหา
                  onFocus={() => { if (searchTerm.length > 0) setShowDropdown(true); }}
                  className="flex-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                />               
              </div>

              {/* เมนู Dropdown ย้ายลงมาตรงนี้เพื่อไม่ให้โดนปุ่มอื่นบัง */}
              {showDropdown && (
                <ul className="absolute top-[105%] left-0 right-0 z-[100] bg-white border border-slate-200 shadow-xl rounded-xl max-h-64 overflow-auto">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map(p => (
                      <li 
                        key={p.id}
                        onClick={() => selectProduct(p.sku, p.name)}
                        className="px-4 py-3 hover:bg-teal-50 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between items-center"
                      >
                        <div>
                          <div className="font-semibold text-slate-800 text-sm">{p.name || 'ไม่มีชื่อสินค้า'}</div>
                          <div className="text-xs text-slate-400">SKU: {p.sku}</div>
                        </div>
                        <div className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-md shrink-0 ml-2">
                          เหลือ {p.current_qty}
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="px-4 py-4 text-sm text-slate-500 text-center bg-slate-50">❌ ไม่พบสินค้าในระบบ</li>
                  )}
                </ul>
              )}
            </div>

            <div className="space-y-1.5 pt-2">
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

            <button type="submit" disabled={loading} className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 mt-4 relative z-10">
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
                        <div className="font-semibold text-slate-800">{tx.products?.name || 'ไม่มีชื่อ'}</div>
                        <div className="text-xs text-slate-400">SKU: {tx.products?.sku}</div>
                        <div className="text-[10px] text-teal-600 mt-1 font-medium">👤 โดย: {tx.user_email || 'ไม่ระบุ'}</div>
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