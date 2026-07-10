import { Outlet, Link, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { LayoutDashboard, Package, ArrowLeftRight, LogOut,Settings as SettingsIcon } from 'lucide-react';

export default function Layout({ session }) {
  const location = useLocation();
  // ดึงข้อมูลอีเมลผู้ใช้งานปัจจุบันออกจาก Session
  const userEmail = session?.user?.email || 'user@company.com';

  const menuItems = [
    { path: '/', name: 'หน้าแรก / แดชบอร์ด', icon: LayoutDashboard },
    { path: '/products', name: 'จัดการรายการสินค้า', icon: Package },
    { path: '/transactions', name: 'บันทึก รับ-จ่ายสต็อก', icon: ArrowLeftRight },
    { path: '/settings', name: 'ตั้งค่าระบบ', icon: SettingsIcon },
  ];

  // ฟังก์ชันออกจากระบบ
  async function handleLogout() {
    if (window.confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
      await supabase.auth.signOut();
    }
  }

  return (
    <div className="flex h-screen bg-slate-50/50 text-slate-600 antialiased font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-100 flex flex-col justify-between p-4 hidden md:flex flex-shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2 py-3 border-b border-slate-50">
            <div className="bg-teal-600 text-white p-2 rounded-xl shadow-md shadow-teal-100">
              <Package className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold text-slate-800 tracking-tight">Stockify.</span>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-teal-50 text-teal-700 shadow-sm shadow-teal-50/50'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-4">
          {/* ผูกฟังก์ชันคลิกออกจากระบบ */}
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all text-left"
          >
            <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-500" />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-100 h-16 flex items-center justify-between px-6 flex-shrink-0">
          <div className="font-medium text-slate-800 text-sm">
            {menuItems.find(item => item.path === location.pathname)?.name || 'ระบบจัดการคลังสินค้า'}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              {/* แสดงผล Email ของผู้ใช้จริงแบบ Dynamic */}
              <div className="text-sm font-semibold text-slate-800 max-w-[180px] truncate">{userEmail.split('@')[0]}</div>
              <div className="text-xs text-slate-400 truncate max-w-[180px]">{userEmail}</div>
            </div>
            <div className="w-10 h-10 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-bold shadow-inner uppercase">
              {userEmail.charAt(0)}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}