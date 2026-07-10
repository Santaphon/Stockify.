import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { Package, ArrowLeftRight, AlertTriangle, Plus } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    todayTransactions: 0,
    lowStock: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      
      // 1. ดึงจำนวนสินค้าทั้งหมด
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      // 2. ดึงรายการเคลื่อนไหววันนี้
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: txCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      // 3. ดึงจำนวนสินค้าที่สต็อกใกล้หมด (น้อยกว่าหรือเท่ากับ min_stock)
      const { data: lowStockData } = await supabase
        .from('products')
        .select('id')
        .filter('current_qty', 'lte', 5); // เช็คคร่าวๆ ที่ 5 ชิ้น (สามารถแก้ให้ดึงตาม min_stock จริงๆ ได้)

      // 4. ดึงกิจกรรมล่าสุด 5 รายการ
      const { data: recentTx } = await supabase
        .from('transactions')
        .select(`*, products(name)`)
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalProducts: productCount || 0,
        todayTransactions: txCount || 0,
        lowStock: lowStockData?.length || 0
      });
      setRecentActivities(recentTx || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
            ยินดีต้อนรับกลับมา
          </h1>
          <p className="text-slate-500 mt-2">นี่คือภาพรวมคลังสินค้าของคุณในวันนี้</p>
        </div>
        <Link to="/transactions" className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm shadow-teal-200 transition-all flex items-center gap-2">
          <Plus className="w-5 h-5" />
          ทำรายการใหม่
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-blue-50 p-4 rounded-xl text-blue-600">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">สินค้ารวมทั้งหมด</p>
            <p className="text-2xl font-bold text-slate-800">
              {loading ? '...' : stats.totalProducts.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-teal-50 p-4 rounded-xl text-teal-600">
            <ArrowLeftRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">รายการเคลื่อนไหว (วันนี้)</p>
            <p className="text-2xl font-bold text-slate-800">
              {loading ? '...' : `+${stats.todayTransactions}`}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-amber-50 p-4 rounded-xl text-amber-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">แจ้งเตือนสต็อกต่ำ</p>
            <p className={`text-2xl font-bold ${stats.lowStock > 0 ? 'text-red-600' : 'text-slate-800'}`}>
              {loading ? '...' : stats.lowStock}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="font-bold text-slate-800">กิจกรรมล่าสุด</h2>
          <Link to="/transactions" className="text-sm font-medium text-teal-600 hover:text-teal-700">ดูทั้งหมด &rarr;</Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td className="px-6 py-8 text-center text-slate-400">กำลังโหลดข้อมูล...</td></tr>
              ) : recentActivities.length === 0 ? (
                <tr><td className="px-6 py-8 text-center text-slate-400">ยังไม่มีการเคลื่อนไหวในระบบ</td></tr>
              ) : (
                recentActivities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">{activity.products?.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{new Date(activity.created_at).toLocaleString('th-TH')}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        activity.transaction_type === 'IN' ? 'bg-teal-100 text-teal-700' : 
                        activity.transaction_type === 'OUT' ? 'bg-amber-100 text-amber-700' : 
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {activity.transaction_type === 'IN' ? '+' : activity.transaction_type === 'OUT' ? '-' : ''}
                        {activity.quantity}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}