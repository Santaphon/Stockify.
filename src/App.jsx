import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Transactions from './pages/Transactions';
import Login from './pages/Login';
import Settings from './pages/Settings';
import AiScanner from './pages/AiScanner';
import { useAuth } from './contexts/AuthContext';

const AdminRoute = ({ children }) => {
  const { role, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>; // รอเช็คสิทธิ์แป๊บนึง
  if (role !== 'admin') return <Navigate to="/" replace />; // ไม่ใช่แอดมิน เตะกลับไป!
  
  return children;
};

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. ตรวจสอบ Session ปัจจุบันตอนเปิดเว็บครั้งแรก
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. ดักฟังเหตุการณ์การสลับสถานะ (เช่น ล็อกอินสำเร็จ หรือ กดออกจากระบบ)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* หากไม่มี Session (ไม่ได้ล็อกอิน) ให้บังคับแสดงหน้าล็อกอินเท่านั้น */}
        {!session ? (
          <Route path="*" element={<Login />} />
        ) : (
          /* หากล็อกอินแล้ว ให้เข้าถึงเส้นทางทั้งหมดในระบบได้ปกติ */
          <Route path="/" element={<Layout session={session} />}>
          <Route index element={<Dashboard />} />
            {/* 🔒 ล็อกประตูหน้าสินค้า */}
          <Route path="products" element={
            <AdminRoute>
              <Products />
            </AdminRoute>
          } />
            <Route path="ai-scanner" element={<AiScanner />} />
            <Route path="transactions" element={<Transactions />} />
            {/* ป้องกันคนพิมพ์ URL มั่วให้เด้งกลับหน้าแรก */}
            {/* 🔒 ล็อกประตูหน้าตั้งค่า */}
          <Route path="settings" element={
            <AdminRoute>
              <Settings />
            </AdminRoute>
          } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </Router>
  );
}

export default App;