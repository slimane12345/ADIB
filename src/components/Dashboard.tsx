import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  MousePointer2, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  MoreHorizontal,
  Search,
  Filter,
  Download,
  Zap
} from 'lucide-react';

const data = [
  { name: 'Mon', ads: 40, clicks: 240, conv: 24 },
  { name: 'Tue', ads: 30, clicks: 139, conv: 18 },
  { name: 'Wed', ads: 20, clicks: 980, conv: 39 },
  { name: 'Thu', ads: 27, clicks: 390, conv: 20 },
  { name: 'Fri', ads: 18, clicks: 480, conv: 48 },
  { name: 'Sat', ads: 23, clicks: 380, conv: 38 },
  { name: 'Sun', ads: 34, clicks: 430, conv: 43 },
];

const recentAds = [
  { id: 1, name: 'Laptop Dell G15', category: 'Electronics', status: 'Active', performance: '+12.5%', date: '2024-02-27' },
  { id: 2, name: 'Organic Argan Oil', category: 'Beauty', status: 'Paused', performance: '-2.1%', date: '2024-02-26' },
  { id: 3, name: 'Smart Watch Series 9', category: 'Electronics', status: 'Active', performance: '+8.4%', date: '2024-02-25' },
  { id: 4, name: 'Modern Sofa Set', category: 'Furniture', status: 'Draft', performance: '0.0%', date: '2024-02-24' },
];

const StatCard = ({ title, value, change, icon: Icon, isPositive }: any) => (
  <div className="bg-white p-6 rounded-3xl border border-neutral-100 card-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className="p-2 bg-neutral-50 rounded-xl">
        <Icon className="w-5 h-5 text-neutral-600" />
      </div>
      <div className={`flex items-center gap-1 text-xs font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
        {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {change}
      </div>
    </div>
    <div className="space-y-1">
      <p className="text-sm text-neutral-400 font-medium">{title}</p>
      <p className="text-2xl font-display font-bold text-neutral-900">{value}</p>
    </div>
  </div>
);

export default function Dashboard() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-display font-bold text-neutral-900">لوحة التحكم 📊</h2>
          <p className="text-neutral-500 text-sm">مرحباً بك مرة أخرى، هاهي إحصائيات حملاتك الإعلانية.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm font-bold text-neutral-600 hover:bg-neutral-50 transition-all">
            <Download className="w-4 h-4" />
            تحميل التقرير
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20">
            <TrendingUp className="w-4 h-4" />
            حملة جديدة
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="إجمالي الإعلانات" value="1,284" change="+14%" icon={Zap} isPositive={true} />
        <StatCard title="النقرات (Clicks)" value="42.5K" change="+28%" icon={MousePointer2} isPositive={true} />
        <StatCard title="معدل التحويل" value="3.8%" change="-2%" icon={TrendingUp} isPositive={false} />
        <StatCard title="إجمالي المبيعات" value="124,500 DH" change="+18%" icon={DollarSign} isPositive={true} />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border border-neutral-100 card-shadow space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-display font-bold text-neutral-900">أداء الإعلانات الأسبوعي</h3>
            <select className="text-xs font-bold text-neutral-400 bg-neutral-50 border-none rounded-lg px-3 py-1.5 outline-none">
              <option>آخر 7 أيام</option>
              <option>آخر 30 يوم</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#a3a3a3' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#a3a3a3' }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="conv" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorConv)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-neutral-100 card-shadow space-y-6">
          <h3 className="text-lg font-display font-bold text-neutral-900">توزيع الفئات</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#a3a3a3' }}
                />
                <Tooltip 
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="ads" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Ads Table */}
      <div className="bg-white rounded-[2.5rem] border border-neutral-100 card-shadow overflow-hidden">
        <div className="p-8 border-b border-neutral-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-display font-bold text-neutral-900">آخر الإعلانات المولدة</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                placeholder="بحث عن إعلان..." 
                className="pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
            <button className="p-2 bg-neutral-50 border border-neutral-100 rounded-xl text-neutral-400 hover:text-neutral-600 transition-all">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-neutral-50/50 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                <th className="px-8 py-4">المنتج</th>
                <th className="px-8 py-4">الفئة</th>
                <th className="px-8 py-4">الحالة</th>
                <th className="px-8 py-4">الأداء</th>
                <th className="px-8 py-4">التاريخ</th>
                <th className="px-8 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {recentAds.map((ad) => (
                <tr key={ad.id} className="hover:bg-neutral-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 font-bold text-xs">
                        {ad.name.charAt(0)}
                      </div>
                      <span className="text-sm font-bold text-neutral-900">{ad.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-xs font-medium text-neutral-500 bg-neutral-100 px-2 py-1 rounded-lg">{ad.category}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${ad.status === 'Active' ? 'bg-emerald-500' : ad.status === 'Paused' ? 'bg-amber-500' : 'bg-neutral-300'}`}></div>
                      <span className="text-xs font-bold text-neutral-700">{ad.status}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`text-xs font-bold ${ad.performance.startsWith('+') ? 'text-emerald-600' : ad.performance === '0.0%' ? 'text-neutral-400' : 'text-rose-600'}`}>
                      {ad.performance}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <Clock className="w-3 h-3" />
                      {ad.date}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <button className="p-2 text-neutral-300 hover:text-neutral-600 transition-colors">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-6 bg-neutral-50/30 border-t border-neutral-50 text-center">
          <button className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors">عرض جميع الإعلانات</button>
        </div>
      </div>
    </div>
  );
}
