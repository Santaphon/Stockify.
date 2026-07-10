import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Package, Lock, Mail, UserPlus, LogIn } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true); // โหมดล็อกอิน (true) หรือ สมัครสมาชิก (false)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isLogin) {
        // --- ระบบเข้าสู่ระบบ ---
        const { error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });
        if (error) throw error;
      } else {
        // --- ระบบสมัครสมาชิก ---
        const { error } = await supabase.auth.signUp({
          email: email,
          password: password,
        });
        if (error) throw error;
        
        setSuccessMsg('สร้างบัญชีสำเร็จ! ระบบกำลังนำคุณเข้าสู่คลังสินค้า...');
      }
    } catch (error) {
      // แปลงข้อความ Error ให้เข้าใจง่ายขึ้น
      if (error.message.includes('Invalid login credentials')) {
        setErrorMsg('อีเมลหรือรหัสผ่านไม่ถูกต้องครับ');
      } else if (error.message.includes('User already registered')) {
        setErrorMsg('อีเมลนี้มีในระบบแล้วครับ กรุณาล็อกอิน');
      } else if (error.message.includes('Password should be at least')) {
        setErrorMsg('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษรครับ');
      } else {
        setErrorMsg(error.message);
      }
      console.error('Auth error:', error.message);
    } finally {
      setLoading(false);
    }
  }

  // ฟังก์ชันสลับโหมด พร้อมเคลียร์ค่า
  function toggleMode() {
    setIsLogin(!isLogin);
    setErrorMsg('');
    setSuccessMsg('');
    setEmail('');
    setPassword('');
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 antialiased font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 w-full max-w-md space-y-6">
        
        {/* Logo & Header */}
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="bg-teal-600 text-white p-3 rounded-2xl shadow-lg shadow-teal-100">
            <Package className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight mt-2">Stockify.</h1>
          <p className="text-slate-500 text-sm">
            {isLogin ? 'ระบบบริหารจัดการคลังสินค้า' : 'สร้างบัญชีพนักงานใหม่'}
          </p>
        </div>

        {/* แท็บเลือกโหมด */}
        <div className="flex p-1 bg-slate-100 rounded-xl">
          <button 
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex justify-center items-center gap-2 ${isLogin ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <LogIn className="w-4 h-4" /> เข้าสู่ระบบ
          </button>
          <button 
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex justify-center items-center gap-2 ${!isLogin ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <UserPlus className="w-4 h-4" /> สมัครสมาชิก
          </button>
        </div>

        {/* กล่องแจ้งเตือน */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="bg-teal-50 border border-teal-200 text-teal-700 px-4 py-3 rounded-xl text-sm font-medium">
            {successMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">อีเมลพนักงาน (Email)</label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email" required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-sm"
                placeholder="staff@company.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">รหัสผ่าน (Password)</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password" required minLength="6"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-sm"
                placeholder={isLogin ? '••••••••' : 'ตั้งรหัสผ่านอย่างน้อย 6 ตัวอักษร'}
              />
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-md shadow-teal-200 pt-2 flex justify-center items-center gap-2"
          >
            {loading ? 'กำลังประมวลผล...' : (isLogin ? 'เข้าสู่ระบบ' : 'สร้างบัญชีใหม่')}
          </button>
        </form>

      </div>
    </div>
  );
}