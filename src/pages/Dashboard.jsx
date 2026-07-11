import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { Package, ArrowLeftRight, AlertTriangle, Plus, X } from 'lucide-react';
// นำเข้า Components จาก Recharts
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    todayTransactions: 0,
    lowStock: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [chartData, setChartData] = useState([]); // State สำหรับเก็บข้อมูลกราฟ
  const [loading, setLoading] = useState(true);
  const [lowStockList, setLowStockList] = useState([]); 
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      
      // 1. ดึงข้อมูลสถิติทั่วไป (เหมือนเดิม)
      const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true } ).eq('is_active', true);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: txCount } = await supabase.from('transactions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      const { data: lowStockData } = await supabase
        .from('products')
        .select('sku, name, current_qty') 
        .eq('is_active', true)
        .filter('current_qty', 'lte', 5);
        
      setLowStockList(lowStockData || []); // บันทึกรายชื่อลง State

      const { data: recentTx } = await supabase.from('transactions')
        .select(`*, products(name)`)
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalProducts: productCount || 0,
        todayTransactions: txCount || 0,
        lowStock: lowStockData?.length || 0
      });
      setRecentActivities(recentTx || []);

      // 2. 📊 ดึงข้อมูลเพื่อสร้างกราฟ (Transactions ทั้งหมด)
      const { data: allTransactions } = await supabase.from('transactions').select('created_at, transaction_type, quantity');
      
      // ฟังก์ชันประมวลผลข้อมูลกราฟ (ย้อนหลัง 6 เดือน)
      if (allTransactions) {
        const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const monthlyData = [];
        const currentDate = new Date();

        // สร้างโครงสร้างข้อมูลเปล่าๆ ย้อนหลัง 6 เดือน
        for (let i = 5; i >= 0; i--) {
          const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
          monthlyData.push({
            name: thaiMonths[d.getMonth()], // ชื่อเดือนที่จะโชว์แกน X
            monthIndex: d.getMonth(),
            year: d.getFullYear(),
            รับเข้า: 0, // Inbound
            เบิกออก: 0  // Outbound
          });
        }

        // จับคู่และบวกตัวเลขลงในแต่ละเดือน
        allTransactions.forEach(tx => {
          const txDate = new Date(tx.created_at);
          const matchIndex = monthlyData.findIndex(m => m.monthIndex === txDate.getMonth() && m.year === txDate.getFullYear());
          
          if (matchIndex !== -1) {
            if (tx.transaction_type === 'IN') {
              monthlyData[matchIndex].รับเข้า += tx.quantity;
            } else if (tx.transaction_type === 'OUT') {
              monthlyData[matchIndex].เบิกออก += tx.quantity;
            }
          }
        });

        setChartData(monthlyData);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  // ปรับแต่งหน้าต่าง Tooltip ตอนเอาเมาส์ชี้กราฟให้สวยงาม
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-100">
          <p className="font-bold text-slate-800 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <span className="text-slate-600">{entry.name}:</span>
              <span className="font-bold text-slate-800">{entry.value.toLocaleString()} ชิ้น</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      {/* Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
            ยินดีต้อนรับกลับมา! 👋
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
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
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

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
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

        <div 
          onClick={() => stats.lowStock > 0 && setIsLowStockModalOpen(true)}
          className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 transition-all ${stats.lowStock > 0 ? 'cursor-pointer hover:shadow-md hover:border-amber-300' : ''}`}
        >
          <div className="bg-amber-50 p-4 rounded-xl text-amber-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">แจ้งเตือนสต็อกต่ำ</p>
            <div className="flex items-end gap-2">
              <p className={`text-2xl font-bold ${stats.lowStock > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                {loading ? '...' : stats.lowStock}
              </p>
              {stats.lowStock > 0 && <span className="text-xs text-amber-600 font-medium mb-1">(คลิกเพื่อดู)</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 📊 Chart Section */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-in fade-in zoom-in-95 duration-500">
          <h2 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-6 bg-teal-500 rounded-full"></span>
            สถิติการรับ-จ่าย ย้อนหลัง 6 เดือน
          </h2>
          
          <div className="h-72 w-full">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center text-slate-400">กำลังโหลดกราฟ...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  <Bar dataKey="รับเข้า" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="เบิกออก" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

       {/* Recent Activities */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="font-bold text-slate-800">กิจกรรมล่าสุด</h2>
            <Link to="/transactions" className="text-xs font-medium text-teal-600 hover:text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg">ดูทั้งหมด</Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td className="px-6 py-8 text-center text-slate-400 text-sm">กำลังโหลดข้อมูล...</td></tr>
                ) : recentActivities.length === 0 ? (
                  <tr><td className="px-6 py-8 text-center text-slate-400 text-sm">ยังไม่มีการเคลื่อนไหวในระบบ</td></tr>
                ) : (
                  recentActivities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-800 text-sm">{activity.products?.name}</p>
                        <p className="text-xs text-slate-400 mt-1">{new Date(activity.created_at).toLocaleString('th-TH')}</p>
                        <p className="text-[10px] text-teal-600 mt-1 font-medium">👤 {activity.user_email || 'ระบบ'}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                          activity.transaction_type === 'IN' ? 'bg-teal-50 text-teal-700 border border-teal-100' : 
                          activity.transaction_type === 'OUT' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 
                          'bg-blue-50 text-blue-700 border border-blue-100'
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

      {/* 🔴 Modal แสดงรายชื่อสินค้าสต็อกต่ำ (ย้ายเข้ามาอยู่ในจุดที่ถูกต้องแล้ว!) */}
      {isLowStockModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-amber-50/50">
              <h3 className="font-bold text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> รายการสินค้าที่ต้องสั่งเพิ่ม
              </h3>
              <button onClick={() => setIsLowStockModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-0 max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 font-medium text-slate-500 border-b border-slate-100">สินค้า</th>
                    <th className="px-6 py-3 font-medium text-slate-500 border-b border-slate-100 text-right">คงเหลือ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lowStockList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3">
                        <p className="font-medium text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{item.sku}</p>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className="font-bold text-red-500">{item.current_qty}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
              <button onClick={() => setIsLowStockModalOpen(false)} className="px-6 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-medium text-sm transition-colors">
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}