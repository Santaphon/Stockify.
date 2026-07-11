import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Package, Plus, Edit, Trash2, X, Tags,Download, Printer } from 'lucide-react';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State สำหรับ Modal สินค้า
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  
  // State สำหรับ Modal หมวดหมู่
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  const [formData, setFormData] = useState({
    sku: '', name: '', category_id: '', min_stock: '', location: ''
  });
  const [printProduct, setPrintProduct] = useState(null);
   // ฟังก์ชันสร้างหน้าต่างใหม่สำหรับสั่งพิมพ์
  function handlePrintBarcode() {
    if (!printProduct) return;
    
    // สร้างหน้าต่างป๊อปอัปใหม่
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    // ใส่ HTML และดึงภาพบาร์โค้ดจาก API
    printWindow.document.write(`
      <html>
        <head>
          <title>พิมพ์บาร์โค้ด - ${printProduct.sku}</title>
          <style>
            body { font-family: 'Sarabun', sans-serif; text-align: center; padding-top: 50px; }
            .barcode-card { 
              border: 2px dashed #cbd5e1; 
              padding: 20px 30px; 
              display: inline-block; 
              border-radius: 12px;
            }
            h2 { margin: 0 0 15px 0; font-size: 20px; color: #1e293b; }
            img { max-width: 100%; height: 80px; }
            p { margin: 10px 0 0 0; font-size: 16px; color: #475569; letter-spacing: 2px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="barcode-card">
            <h2>${printProduct.name}</h2>
            <img src="https://bwipjs-api.metafloor.com/?bcid=code128&text=${printProduct.sku}&scale=3" alt="Barcode" />
            <p>${printProduct.sku}</p>
          </div>
          <script>
            // รอให้รูปโหลดเสร็จ 0.5 วินาที แล้วค่อยเด้งหน้าต่างพิมพ์
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }


  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  async function fetchCategories() {
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) setCategories(data);
  }

  async function fetchProducts() {
    try {
      setLoading(true);
      // 👇 เพิ่ม .eq('is_active', true) เข้าไปแล้วครับ
      const { data, error } = await supabase
        .from('products')
        .select(`*, categories(name)`)
        .eq('is_active', true) 
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error:', error.message);
    } finally {
      setLoading(false);
    }
  }

  // --- ฟังก์ชันจัดการสินค้า ---
  function handleEditClick(product) {
    setFormData({ sku: product.sku, name: product.name, category_id: product.category_id || '', min_stock: product.min_stock });
    setEditId(product.id);
    setIsModalOpen(true);
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`ลบสินค้า "${name}"?`)) return;
    try {
      // 👇 เปลี่ยนคำสั่งจาก delete() เป็น update() ตรงนี้ครับ
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id);
        
      if (error) throw error;
      
      fetchProducts();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  }
 
  // --- ฟังก์ชันส่งออกรายงานเป็นไฟล์ CSV ---
  function exportToCSV() {
    // 1. เตรียมหัวตาราง
    const headers = ['SKU', 'ชื่อสินค้า', 'หมวดหมู่', 'ตำแหน่ง', 'คงเหลือ'];
    
    // 2. เตรียมข้อมูลแต่ละบรรทัด
    const csvRows = products.map(p => {
      // เอาเครื่องหมายคอมม่า (,) ออกจากชื่อสินค้า/ตำแหน่ง เผื่อพิมพ์ติดมา จะได้ไม่ทำให้ไฟล์พัง
      const name = p.name ? p.name.replace(/,/g, '') : '';
      const location = p.location ? p.location.replace(/,/g, '') : '-';
      const category = p.categories?.name ? p.categories.name.replace(/,/g, '') : '-';
      
      return [p.sku, name, category, location, p.current_qty].join(',');
    });

    // 3. รวมหัวตารางและข้อมูลเข้าด้วยกัน
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    
    // 4. สร้างไฟล์และสั่งดาวน์โหลด (\uFEFF คือ BOM ทำให้ Excel อ่านภาษาไทยออก)
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // ตั้งชื่อไฟล์พร้อมวันที่ปัจจุบัน
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `Stock_Report_${dateStr}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        sku: formData.sku, name: formData.name, category_id: formData.category_id || null, min_stock: formData.min_stock === '' ? 5 : parseInt(formData.min_stock),location: formData.location
      };
      if (editId) {
        const { error } = await supabase.from('products').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert([{ ...payload, current_qty: 0 }]);
        if (error) throw error;
      }
      closeModal();
      fetchProducts();
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditId(null);
    setFormData({ sku: '', name: '', category_id: '', min_stock: '' });
  }

  // --- ฟังก์ชันจัดการหมวดหมู่ ---
  async function handleAddCategory(e) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    try {
      const { error } = await supabase.from('categories').insert([{ name: newCategory.trim() }]);
      if (error) throw error;
      setNewCategory('');
      fetchCategories();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  }

  async function handleDeleteCategory(id) {
    if (!window.confirm('ลบหมวดหมู่นี้?')) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      fetchCategories();
    } catch (error) {
      alert('ลบไม่ได้: อาจมีสินค้าใช้หมวดหมู่นี้อยู่');
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="text-teal-600" /> จัดการรายการสินค้า
          </h1>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsCategoryModalOpen(true)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2">
            <Tags className="w-5 h-5" /> จัดการหมวดหมู่
          </button>
          <button onClick={exportToCSV} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2">
            <Download className="w-5 h-5" /> Export Excel
          </button>
          <button onClick={() => { setEditId(null); setFormData({ sku: '', name: '', category_id: '', min_stock: '' }); setIsModalOpen(true); }} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all flex items-center gap-2">
            <Plus className="w-5 h-5" /> เพิ่มสินค้าใหม่
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                <th className="px-6 py-4 font-medium">SKU</th>
                <th className="px-6 py-4 font-medium">ชื่อสินค้า</th>
                <th className="px-6 py-4 font-medium">หมวดหมู่</th>
                <th className="px-6 py-4 font-medium">ตำแหน่ง</th>
                <th className="px-6 py-4 font-medium text-right">คงเหลือ</th>
                <th className="px-6 py-4 font-medium text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-400">กำลังโหลด...</td></tr> : 
               products.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-medium text-slate-700">{product.sku}</td>
                  <td className="px-6 py-4 text-slate-800">{product.name}</td>
                  <td className="px-6 py-4"><span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-medium">{product.categories?.name || '-'}</span></td>
                  <td className="px-6 py-4">{product.location || '-'}</td>
                  <td className="px-6 py-4 text-right"><span className={`font-bold ${product.current_qty <= product.min_stock ? 'text-red-500' : 'text-teal-600'}`}>{product.current_qty}</span></td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => setPrintProduct(product)} className="text-slate-400 hover:text-indigo-600 mr-3" title="พิมพ์บาร์โค้ด">
                      <Printer className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleEditClick(product)} className="text-slate-400 hover:text-blue-600 mr-3"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(product.id, product.name)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal เพิ่ม/แก้ไขสินค้า (เหมือนเดิม) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800">{editId ? 'แก้ไขรายการสินค้า' : 'เพิ่มรายการสินค้าใหม่'}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="block text-sm mb-1">SKU *</label><input type="text" required value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} className="w-full px-4 py-2 border rounded-xl" /></div>
              <div><label className="block text-sm mb-1">ชื่อสินค้า *</label><input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border rounded-xl" /></div>
              <div>
                <label className="block text-sm mb-1">ตำแหน่งจัดเก็บ (ตู้/ชั้น)</label>
                <input 
                  type="text" 
                  placeholder="เช่น ตู้ A ชั้น 2"
                  value={formData.location} 
                  onChange={(e) => setFormData({...formData, location: e.target.value})} 
                  className="w-full px-4 py-2 border rounded-xl" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">หมวดหมู่</label>
                  <select value={formData.category_id} onChange={(e) => setFormData({...formData, category_id: e.target.value})} className="w-full px-4 py-2 border rounded-xl">
                    <option value="">เลือก...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm mb-1">แจ้งเตือนขั้นต่ำ</label><input type="number" min="0" value={formData.min_stock} onChange={(e) => setFormData({...formData, min_stock: e.target.value})} className="w-full px-4 py-2 border rounded-xl" /></div>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full py-2.5 bg-teal-600 text-white rounded-xl mt-4">{isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal จัดการหมวดหมู่ */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Tags className="w-5 h-5"/> จัดการหมวดหมู่</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <form onSubmit={handleAddCategory} className="flex gap-2">
                <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="ชื่อหมวดหมู่ใหม่..." className="flex-1 px-4 py-2 border rounded-xl outline-none" required />
                <button type="submit" className="bg-teal-600 text-white px-4 py-2 rounded-xl flex items-center"><Plus className="w-4 h-4"/></button>
              </form>
              <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {categories.map(cat => (
                      <tr key={cat.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">{cat.name}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleDeleteCategory(cat.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 🖨️ Modal สำหรับดูตัวอย่างและสั่งพิมพ์บาร์โค้ด */}
      {printProduct && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-600" /> ตัวอย่างบาร์โค้ด
              </h3>
              <button onClick={() => setPrintProduct(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 text-center bg-slate-50/30">
              <div className="bg-white border-2 border-dashed border-slate-200 p-6 rounded-xl inline-block shadow-sm">
                <p className="font-bold text-slate-800 mb-4">{printProduct.name}</p>
                <img 
                  src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${printProduct.sku}&scale=3`} 
                  alt="Barcode" 
                  className="mx-auto h-20 opacity-90"
                />
                <p className="mt-3 text-slate-500 font-mono tracking-widest font-bold">{printProduct.sku}</p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-white grid grid-cols-2 gap-3">
              <button onClick={() => setPrintProduct(null)} className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors">
                ยกเลิก
              </button>
              <button onClick={handlePrintBarcode} className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-sm shadow-indigo-200 transition-colors flex justify-center items-center gap-2">
                <Printer className="w-4 h-4" /> สั่งพิมพ์เลย
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}