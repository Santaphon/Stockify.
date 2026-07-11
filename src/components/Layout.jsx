import { Outlet, Link, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { LayoutDashboard, Package, ArrowLeftRight, LogOut, Settings as SettingsIcon, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Swal from 'sweetalert2';

export default function Layout({ session }) {
  const location = useLocation();
  const userEmail = session?.user?.email || 'user@company.com';
  
  // ดึงค่า role จากศูนย์บัญชาการสิทธิ์
  const { role } = useAuth();

  // 🛡️ [Best Practice]: กรองสิทธิ์เมนูตั้งแต่ระดับ Array 
  const menuItems = [
    { path: '/', name: 'แดชบอร์ด', icon: LayoutDashboard },
    
    // 🔒 ถ้า role เป็น 'admin' ให้เพิ่มเมนูสินค้าเข้ามา ถ้าไม่ใช่ไม่ต้องเพิ่ม
    ...(role === 'admin' ? [{ path: '/products', name: 'สินค้า', icon: Package }] : []),
    
    { path: '/transactions', name: 'รับ-จ่าย', icon: ArrowLeftRight },
    { path: '/ai-scanner', name: 'สแกน AI', icon: Sparkles },
    
    // 🔒 ซ่อนเมนูตั้งค่า ให้เฉพาะ admin
    ...(role === 'admin' ? [{ path: '/settings', name: 'ตั้งค่า', icon: SettingsIcon }] : []),
  ];

  async function handleLogout() {
    const result = await Swal.fire({
      title: 'ออกจากระบบ?',
      text: 'คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ Stockify?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0d9488', // สีเขียว Teal ให้เข้ากับธีม
      cancelButtonColor: '#ef4444',  // สีแดง
      confirmButtonText: 'ออกจากระบบ',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true // สลับปุ่มยกเลิกมาไว้ซ้าย (พฤติกรรม UI ที่คนคุ้นเคย)
    });

    if (result.isConfirmed) {
      await supabase.auth.signOut();
    }
  }

  return (
    <div className="flex h-screen bg-slate-50/50 text-slate-600 antialiased font-sans overflow-hidden">
      
      {/* 🖥️ Sidebar สำหรับหน้าจอคอมพิวเตอร์ */}
      <aside className="w-64 bg-white border-r border-slate-100 flex-col justify-between p-4 hidden md:flex flex-shrink-0 z-20">
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
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* 📋 Header ด้านบน */}
        <header className="bg-white border-b border-slate-100 h-16 flex items-center justify-between px-4 md:px-6 flex-shrink-0 z-10">
          <div className="flex items-center gap-2">
             <div className="md:hidden bg-teal-600 text-white p-1.5 rounded-lg shadow-sm">
                <Package className="w-5 h-5" />
             </div>
             <div className="font-bold text-slate-800 md:text-sm">
               {menuItems.find(item => item.path === location.pathname)?.name || 'Stockify'}
             </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-800 max-w-[150px] truncate">{userEmail.split('@')[0]}</div>
              <div className="text-xs text-slate-400 truncate max-w-[150px]">{userEmail}</div>
            </div>
            <div className="w-9 h-9 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-bold shadow-inner uppercase">
              {userEmail.charAt(0)}
            </div>
            <button 
              onClick={handleLogout} 
              className="md:hidden p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              title="ออกจากระบบ"
            >
               <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* 📄 เนื้อหาหน้าเว็บ */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          <Outlet />
        </main>

        {/* 📱 Bottom Navigation สำหรับหน้าจอมือถือ */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center h-16 z-50 pb-safe shadow-[0_-5px_10px_-5px_rgba(0,0,0,0.05)]">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  isActive ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'fill-teal-50' : ''}`} />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

      </div>
    </div>
  );
}