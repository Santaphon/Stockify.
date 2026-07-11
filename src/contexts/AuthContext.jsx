import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient'; // ตรวจสอบ path ให้ตรงกับไฟล์ของคุณนะครับ

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'admin' หรือ 'staff'
  const [loading, setLoading] = useState(true); // ตัวล็อกหน้าเว็บตอนกำลังโหลดเช็คสิทธิ์

  useEffect(() => {
    // 1. ฟังก์ชันดึงสิทธิ์จากตาราง user_roles
    const fetchRole = async (userId) => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('id', userId)
          .single();
        
        if (!error && data) {
          setRole(data.role);
        }
      } catch (error) {
        console.error('Error fetching role:', error);
      }
    };

    // 2. เช็ค Session ปัจจุบันตอนเปิดเว็บครั้งแรก
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchRole(session.user.id);
      }
      setLoading(false);
    };

    initializeAuth();

    // 3. ดักฟังการเปลี่ยนแปลง (เช่น ตอนกด Login หรือ Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchRole(session.user.id);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// เครื่องมือสำหรับให้หน้าอื่นๆ ดึงสิทธิ์ไปใช้งานได้ง่ายๆ
export const useAuth = () => useContext(AuthContext);