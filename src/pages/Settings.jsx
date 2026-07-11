import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Swal from 'sweetalert2';
import { Shield, User, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Settings() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth(); // ดึงข้อมูลตัวเองมาเพื่อกันไม่ให้เผลอปลดสิทธิ์ตัวเอง

  // ฟังก์ชันดึงรายชื่อผู้ใช้งานทั้งหมด
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      Swal.fire({ icon: 'error', title: 'ดึงข้อมูลพลาด', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ฟังก์ชันสลับสิทธิ์ (Toggle Role)
  const handleRoleChange = async (targetUserId, currentRole, email) => {
    // ป้องกันการปลดสิทธิ์ตัวเองโดยไม่ตั้งใจ
    if (targetUserId === currentUser.id) {
      return Swal.fire({
        icon: 'warning',
        title: 'หยุดก่อน!',
        text: 'คุณไม่สามารถปลดสิทธิ์ Admin ของตัวเองได้ (ต้องให้ Admin คนอื่นทำให้)',
        confirmButtonColor: '#f59e0b'
      });
    }

    const newRole = currentRole === 'admin' ? 'staff' : 'admin';
    
    const confirm = await Swal.fire({
      title: 'เปลี่ยนสิทธิ์การใช้งาน?',
      html: `ต้องการเปลี่ยนสิทธิ์ของ <b>${email}</b><br>จาก ${currentRole} เป็น <b>${newRole}</b> ใช่หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0d9488',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'ใช่, เปลี่ยนเลย',
      cancelButtonText: 'ยกเลิก'
    });

    if (confirm.isConfirmed) {
      try {
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('id', targetUserId);
        
        if (error) throw error;

        Swal.fire({
          icon: 'success',
          title: 'อัปเดตสิทธิ์เรียบร้อย!',
          timer: 1500,
          showConfirmButton: false
        });
        
        fetchUsers(); // โหลดข้อมูลตารางใหม่
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: error.message });
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-6 h-6 text-teal-600" />
            จัดการสิทธิ์ผู้ใช้งาน
          </h1>
          <p className="text-sm text-slate-500 mt-1">กำหนดสิทธิ์การเข้าถึงเมนูต่างๆ ในระบบ Stockify</p>
        </div>
        <button 
          onClick={fetchUsers}
          className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors"
          title="รีเฟรชข้อมูล"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">บัญชีผู้ใช้งาน (Email)</th>
                <th className="px-6 py-4 font-semibold text-center">สิทธิ์ปัจจุบัน</th>
                <th className="px-6 py-4 font-semibold text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-700 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold uppercase">
                      {u.email.charAt(0)}
                    </div>
                    {u.email}
                    {u.id === currentUser.id && (
                      <span className="ml-2 text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                        คุณ (Me)
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
                      ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}
                    `}>
                      {u.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleRoleChange(u.id, u.role, u.email)}
                      disabled={u.id === currentUser.id}
                      className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors border
                        ${u.id === currentUser.id 
                          ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' 
                          : 'bg-white text-slate-700 border-slate-200 hover:border-teal-500 hover:text-teal-600 shadow-sm'}
                      `}
                    >
                      เปลี่ยนเป็น {u.role === 'admin' ? 'Staff' : 'Admin'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {!loading && users.length === 0 && (
            <div className="text-center py-10 text-slate-500">
              ไม่พบข้อมูลผู้ใช้งาน
            </div>
          )}
        </div>
      </div>

    </div>
  );
}