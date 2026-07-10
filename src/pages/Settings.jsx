import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Settings as SettingsIcon, Building2, Users, MapPin, Bell, Download, Save, Plus, Trash2 } from 'lucide-react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(false);
  
  // State: ข้อมูลบริษัท (ของจริงจาก DB)
  const [companyProfile, setCompanyProfile] = useState({ name: '', taxId: '', address: '' });
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  // State: พื้นที่จัดเก็บ (ของจริงจาก DB)
  const [locations, setLocations] = useState([]);
  const [newLocation, setNewLocation] = useState('');
  const [isAddingLocation, setIsAddingLocation] = useState(false);

  // State (UI Mockup สำหรับเฟสถัดไป): พนักงาน, แจ้งเตือน
  const [users] = useState([
    { id: 1, email: 'admin@stockify.com', role: 'Admin', status: 'Active' },
    { id: 2, email: 'staff@test.com', role: 'Staff', status: 'Active' }
  ]);
  const [notifications, setNotifications] = useState({ lowStock: true, dailyReport: false, emailAlert: true });

  // โหลดข้อมูลตาม Tab ที่เปิด
  useEffect(() => {
    if (activeTab === 'company') {
      fetchCompanyProfile();
    } else if (activeTab === 'locations') {
      fetchLocations();
    }
  }, [activeTab]);

  // --- 🏢 ฟังก์ชัน: ดึงข้อมูลบริษัท ---
  async function fetchCompanyProfile() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('company_profile').select('*').eq('id', 1).single();
      if (error) throw error;
      if (data) {
        setCompanyProfile({
          name: data.name || '',
          taxId: data.tax_id || '',
          address: data.address || ''
        });
      }
    } catch (error) {
      console.error('Error fetching company profile:', error.message);
    } finally {
      setLoading(false);
    }
  }

  // --- 🏢 ฟังก์ชัน: บันทึกข้อมูลบริษัทไปยัง Supabase ---
  async function handleSaveCompany(e) {
    e.preventDefault();
    setIsSavingCompany(true);
    try {
      const { error } = await supabase
        .from('company_profile')
        .update({
          name: companyProfile.name,
          tax_id: companyProfile.taxId,
          address: companyProfile.address
        })
        .eq('id', 1);

      if (error) throw error;
      alert('✅ อัปเดตข้อมูลองค์กรบนระบบ Cloud เรียบร้อยแล้ว!');
    } catch (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
      setIsSavingCompany(false);
    }
  }

  // --- 📍 ฟังก์ชัน: ดึงข้อมูลพื้นที่จัดเก็บ ---
  async function fetchLocations() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('locations').select('*').order('name');
      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error.message);
    } finally {
      setLoading(false);
    }
  }

  // --- 📍 ฟังก์ชัน: เพิ่มพื้นที่จัดเก็บใหม่ ---
  async function handleAddLocation(e) {
    e.preventDefault();
    if (!newLocation.trim()) return;
    setIsAddingLocation(true);
    try {
      const { error } = await supabase.from('locations').insert([{ name: newLocation.trim() }]);
      if (error) throw error;
      setNewLocation('');
      fetchLocations(); // รีโหลดตาราง
    } catch (error) {
      alert('ไม่สามารถเพิ่มพื้นที่ได้: ' + error.message);
    } finally {
      setIsAddingLocation(false);
    }
  }

  // --- 📍 ฟังก์ชัน: ลบพื้นที่จัดเก็บ ---
  async function handleDeleteLocation(id, name) {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบพื้นที่ "${name}"?`)) return;
    try {
      const { error } = await supabase.from('locations').delete().eq('id', id);
      if (error) throw error;
      fetchLocations();
    } catch (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    }
  }

  // --- 📊 ฟังก์ชัน: Export ข้อมูลสินค้าเป็น Excel ---
  async function handleExportCSV() {
    try {
      const { data, error } = await supabase.from('products').select('sku, name, current_qty, min_stock');
      if (error) throw error;
      if (data && data.length > 0) {
        const BOM = '\uFEFF';
        const csvContent = ['รหัสสินค้า (SKU),ชื่อสินค้า,คงเหลือ,สต็อกขั้นต่ำ', ...data.map(r => `${r.sku},"${r.name}",${r.current_qty},${r.min_stock}`)].join('\n');
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `รายงานสต็อก_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
      }
    } catch (error) { alert('Export ล้มเหลว: ' + error.message); }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <SettingsIcon className="text-teal-600" /> ตั้งค่าระบบ
        </h1>
        <p className="text-slate-500 mt-1">จัดการระบบและสิทธิ์การเข้าถึงทั้งหมดในคลังสินค้า</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* แถบเมนูด้านซ้าย */}
        <div className="md:col-span-1 space-y-2">
          {[
            { id: 'company', icon: Building2, label: 'ข้อมูลองค์กร' },
            { id: 'locations', icon: MapPin, label: 'พื้นที่จัดเก็บ (Zones)' },
            { id: 'users', icon: Users, label: 'จัดการผู้ใช้งาน' },
            { id: 'notifications', icon: Bell, label: 'การแจ้งเตือน' },
            { id: 'data', icon: Download, label: 'นำออกข้อมูล' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-teal-600 text-white shadow-md shadow-teal-200' : 'bg-white text-slate-600 border border-slate-100 hover:border-teal-200 hover:bg-teal-50'}`}>
              <tab.icon className="w-5 h-5" /> {tab.label}
            </button>
          ))}
        </div>

        {/* พื้นที่แสดงผลด้านขวา */}
        <div className="md:col-span-3">
          
          {/* TAB: ข้อมูลองค์กร (REAL) */}
          {activeTab === 'company' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-in fade-in duration-200">
              <h3 className="font-bold text-slate-800 mb-6 border-b pb-3">ข้อมูลสำหรับหัวกระดาษเอกสาร</h3>
              {loading ? <p className="text-slate-400 text-sm">กำลังโหลดข้อมูลองค์กร...</p> : (
                <form onSubmit={handleSaveCompany} className="space-y-4 max-w-lg">
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">ชื่อองค์กร / บริษัท</label><input type="text" required value={companyProfile.name} onChange={e => setCompanyProfile({...companyProfile, name: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500 transition-all" /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">เลขประจำตัวผู้เสียภาษี</label><input type="text" value={companyProfile.taxId} onChange={e => setCompanyProfile({...companyProfile, taxId: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500 transition-all" /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">ที่อยู่สถานประกอบการ</label><textarea rows="3" value={companyProfile.address} onChange={e => setCompanyProfile({...companyProfile, address: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500 transition-all resize-none" /></div>
                  <button type="submit" disabled={isSavingCompany} className="py-2.5 px-6 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl flex gap-2 disabled:opacity-50 transition-all shadow-sm"><Save className="w-4 h-4" /> {isSavingCompany ? 'กำลังบันทึก...' : 'บันทึกข้อมูลบริษัท'}</button>
                </form>
              )}
            </div>
          )}

          {/* TAB: พื้นที่จัดเก็บ (REAL) */}
          {activeTab === 'locations' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
              <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-fit">
                <h3 className="font-bold text-slate-800 mb-4 border-b pb-3">เพิ่มพื้นที่/โซนใหม่</h3>
                <form onSubmit={handleAddLocation} className="space-y-4">
                  <input type="text" required value={newLocation} onChange={(e) => setNewLocation(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500" placeholder="เช่น คลังสินค้า A, ชั้นวาง B1..." />
                  <button type="submit" disabled={isAddingLocation || !newLocation.trim()} className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl flex justify-center items-center gap-2 disabled:opacity-50">
                    {isAddingLocation ? 'กำลังเพิ่ม...' : <><Plus className="w-4 h-4"/> เพิ่มพื้นที่จัดเก็บ</>}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b font-bold text-slate-700 text-sm">รายการพื้นที่ทั้งหมดบนระบบ Cloud</div>
                {loading ? <p className="p-6 text-center text-slate-400">กำลังโหลดพื้นที่...</p> : (
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {locations.length === 0 ? <p className="p-6 text-center text-slate-400">ยังไม่มีข้อมูลพื้นที่จัดเก็บในคลัง</p> : 
                     locations.map(loc => (
                      <div key={loc.id} className="p-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                        <span className="font-medium text-slate-700">{loc.name}</span>
                        <button onClick={() => handleDeleteLocation(loc.id, loc.name)} className="text-slate-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: จัดการผู้ใช้งาน (MOCKUP FOR NEXT PHASE) */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-in fade-in">
              <h3 className="font-bold text-slate-800 mb-6 border-b pb-3">บัญชีผู้ใช้งานและสิทธิ์ (Users & Roles)</h3>
              <table className="w-full text-left text-sm border-collapse">
                <thead><tr className="bg-slate-50 text-slate-500"><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Status</th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-slate-50"><td className="p-3 text-slate-700 font-medium">{u.email}</td><td className="p-3"><span className={`px-2 py-1 rounded-md text-xs font-bold ${u.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{u.role}</span></td><td className="p-3 text-teal-600 font-medium">● {u.status}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-in fade-in">
              <h3 className="font-bold text-slate-800 mb-6 border-b pb-3">การตั้งค่าแจ้งเตือน (Alerts)</h3>
              <div className="space-y-4 max-w-md">
                {[{ id: 'lowStock', label: 'แจ้งเตือนสินค้าสต็อกต่ำกว่าเกณฑ์' }, { id: 'dailyReport', label: 'ส่งอีเมลสรุปยอดสต็อกประจำวัน' }, { id: 'emailAlert', label: 'แจ้งเตือนผ่าน Email ทันทีที่มีการเบิกจ่าย' }].map(item => (
                  <label key={item.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50">
                    <span className="text-sm font-medium text-slate-700">{item.label}</span>
                    <input type="checkbox" checked={notifications[item.id]} onChange={() => setNotifications({...notifications, [item.id]: !notifications[item.id]})} className="w-5 h-5 accent-teal-600" />
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-in fade-in">
              <h3 className="font-bold text-slate-800 mb-6 border-b pb-3">นำออกข้อมูล (Export Data)</h3>
              <div className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex items-center justify-between">
                <div><p className="font-medium text-slate-800">สรุปยอดสินค้าคงคลัง (Inventory Report)</p><p className="text-sm text-slate-500 mt-1">ดาวน์โหลดข้อมูลสินค้าในรูปแบบไฟล์ CSV ไปเปิดใน Excel</p></div>
                <button onClick={handleExportCSV} className="py-2.5 px-5 bg-white border border-slate-200 hover:border-teal-500 hover:text-teal-700 rounded-xl font-medium flex gap-2 shadow-sm transition-colors"><Download className="w-4 h-4" /> Export CSV</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}