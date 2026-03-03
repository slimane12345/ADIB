import React, { useState, useEffect } from 'react';
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
  Zap,
  ShieldCheck,
  Coins,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  RefreshCw,
  Settings,
  Building2,
  Smartphone,
  CreditCard
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';

interface AdminStats {
  totalUsers: number;
  totalAds: number;
  proUsers: number;
  adsToday: number;
}

interface User {
  id: string; // Firebase UID
  email: string;
  credits: number;
  isPro: boolean;
  isAdmin: boolean;
}

interface Activity {
  id: string;
  email: string;
  product_name: string;
  category: string;
  created_at: string;
}

interface PaymentRequest {
  id: string;
  user_id: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

const StatCard = ({ title, value, change, icon: Icon, isPositive }: any) => (
  <div className="bg-white p-6 rounded-3xl border border-neutral-100 card-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className="p-2 bg-neutral-50 rounded-xl">
        <Icon className="w-5 h-5 text-neutral-600" />
      </div>
      {change && (
        <div className={`flex items-center gap-1 text-xs font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {change}
        </div>
      )}
    </div>
    <div className="space-y-1">
      <p className="text-sm text-neutral-400 font-medium">{title}</p>
      <p className="text-2xl font-display font-bold text-neutral-900">{value}</p>
    </div>
  </div>
);

export default function Dashboard({ setView }: { setView: (v: string) => void }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<User>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'requests' | 'settings'>('overview');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [paymentSettings, setPaymentSettings] = useState({
    bank_name: '',
    account_name: '',
    rib: '',
    whatsapp_number: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setUsers(usersList);

      // Fetch Activity
      const activityQuery = query(collection(db, 'ads_generated'), orderBy('created_at', 'desc'), limit(10));
      const activitySnapshot = await getDocs(activityQuery);
      const activityList = activitySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
      setActivity(activityList);

      // Fetch Payment Requests
      const requestsSnapshot = await getDocs(query(collection(db, 'payment_requests'), orderBy('created_at', 'desc')));
      const requestsList = requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentRequest));
      setPaymentRequests(requestsList);

      // Fetch Settings
      const settingsDoc = await getDoc(doc(db, 'settings', 'payment'));
      if (settingsDoc.exists()) {
        setPaymentSettings(settingsDoc.data() as any);
      }

      // Calculate Stats
      const totalAdsSnapshot = await getDocs(collection(db, 'ads_generated'));
      const today = new Date().toISOString().split('T')[0];
      const adsToday = totalAdsSnapshot.docs.filter(doc => (doc.data().created_at as string).startsWith(today)).length;

      setStats({
        totalUsers: usersList.length,
        totalAds: totalAdsSnapshot.docs.length,
        proUsers: usersList.filter(u => u.isPro).length,
        adsToday
      });

    } catch (err) {
      console.error("Failed to fetch admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExportUsers = async () => {
    // Client-side export
    const csv = [
      ['Email', 'Credits', 'Is Pro', 'Is Admin'],
      ...users.map(u => [u.email, u.credits, u.isPro, u.isAdmin])
    ].map(e => e.join(",")).join("\n");
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_export.csv';
    a.click();
  };

  const handleDownloadReport = async () => {
    alert('هذه الميزة غير متوفرة حالياً في نسخة Firebase.');
  };

  const handleCleanup = async () => {
    alert('هذه الميزة غير متوفرة حالياً في نسخة Firebase.');
  };

  const handleBroadcast = async () => {
    alert('هذه الميزة غير متوفرة حالياً في نسخة Firebase.');
  };

  const handleUpdateUser = async (id: string) => {
    try {
      await updateDoc(doc(db, 'users', id), editData);
      setEditingUser(null);
      fetchData();
    } catch (err) {
      console.error("Failed to update user:", err);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('واش متأكد بغيتي تمسح هاد المستخدم؟ هاد العملية مافيهاش الرجوع.')) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      fetchData();
    } catch (err) {
      console.error("Failed to delete user:", err);
    }
  };

  const handlePaymentAction = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(`payment_${id}`);
    try {
      const request = paymentRequests.find(r => r.id === id);
      if (!request) return;

      if (action === 'approve') {
        // Upgrade user to Pro
        await updateDoc(doc(db, 'users', request.user_id), { isPro: true });
        await updateDoc(doc(db, 'payment_requests', id), { status: 'approved' });
      } else {
        await updateDoc(doc(db, 'payment_requests', id), { status: 'rejected' });
      }
      fetchData();
    } catch (err) {
      alert('فشل تنفيذ الإجراء');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('update_settings');
    try {
      await setDoc(doc(db, 'settings', 'payment'), paymentSettings);
      alert('تم تحديث الإعدادات بنجاح');
    } catch (err) {
      alert('فشل تحديث الإعدادات');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(u => u.email.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading && !stats) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
        <p className="text-neutral-500 font-medium">كنجيبو البيانات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-display font-bold text-neutral-900">لوحة التحكم الإدارية 📊</h2>
          <p className="text-neutral-500 text-sm">تحكم كامل في المستخدمين، الأرصدة، وإحصائيات المنصة.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleDownloadReport}
            disabled={actionLoading === 'report'}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm font-bold text-neutral-600 hover:bg-neutral-50 transition-all disabled:opacity-50"
          >
            {actionLoading === 'report' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            تحميل التقرير
          </button>
          <button 
            onClick={() => setView('generator')}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
          >
            <Zap className="w-4 h-4" />
            حملة جديدة
          </button>
        </div>
      </div>

      {/* Stats and Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex bg-neutral-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'overview' ? 'bg-white text-emerald-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            نظرة عامة
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'users' ? 'bg-white text-emerald-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            المستخدمين
          </button>
          <button 
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'requests' ? 'bg-white text-emerald-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            طلبات التفعيل
            {paymentRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="mr-2 bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {paymentRequests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'settings' ? 'bg-white text-emerald-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            إعدادات الدفع
          </button>
        </div>
        <button 
          onClick={fetchData}
          className="p-2.5 bg-white border border-neutral-200 rounded-xl text-neutral-400 hover:text-emerald-600 transition-all"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {activeTab === 'overview' ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="إجمالي المستخدمين" value={stats?.totalUsers || 0} icon={Users} />
            <StatCard title="إعلانات اليوم" value={stats?.adsToday || 0} icon={Zap} isPositive={true} change="+5%" />
            <StatCard title="إجمالي الإعلانات" value={stats?.totalAds || 0} icon={TrendingUp} />
            <StatCard title="مستخدمي Pro" value={stats?.proUsers || 0} icon={ShieldCheck} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Recent Activity */}
            <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-neutral-100 card-shadow overflow-hidden">
              <div className="p-8 border-b border-neutral-50 flex items-center justify-between">
                <h3 className="text-lg font-display font-bold text-neutral-900">آخر النشاطات</h3>
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Live Updates</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="bg-neutral-50/50 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                      <th className="px-8 py-4">المستخدم</th>
                      <th className="px-8 py-4">المنتج</th>
                      <th className="px-8 py-4">الفئة</th>
                      <th className="px-8 py-4">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {activity.map((act) => (
                      <tr key={act.id} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="px-8 py-5 text-sm font-medium text-neutral-900">{act.email}</td>
                        <td className="px-8 py-5 text-sm text-neutral-600">{act.product_name}</td>
                        <td className="px-8 py-5">
                          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg uppercase">{act.category}</span>
                        </td>
                        <td className="px-8 py-5 text-xs text-neutral-400">
                          {new Date(act.created_at).toLocaleString('ar-MA')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-neutral-900 p-8 rounded-[2.5rem] text-white space-y-6">
                <h3 className="text-lg font-display font-bold">إجراءات سريعة</h3>
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={handleExportUsers}
                    disabled={actionLoading === 'export_users'}
                    className="flex items-center gap-3 p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition-all text-sm font-medium disabled:opacity-50"
                  >
                    {actionLoading === 'export_users' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    تصدير بيانات المستخدمين
                  </button>
                  <button 
                    onClick={handleCleanup}
                    disabled={actionLoading === 'cleanup'}
                    className="flex items-center gap-3 p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition-all text-sm font-medium disabled:opacity-50"
                  >
                    {actionLoading === 'cleanup' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
                    تصفية الحسابات الوهمية
                  </button>
                  <button 
                    onClick={handleBroadcast}
                    disabled={actionLoading === 'broadcast'}
                    className="flex items-center gap-3 p-4 bg-emerald-600 rounded-2xl hover:bg-emerald-500 transition-all text-sm font-bold disabled:opacity-50"
                  >
                    {actionLoading === 'broadcast' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    إرسال إشعار للجميع
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : activeTab === 'settings' ? (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-[2.5rem] border border-neutral-100 card-shadow space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-display font-bold text-neutral-900">إعدادات الدفع والتحويل</h3>
              <p className="text-neutral-400 text-sm">تحكم في معلومات البنك ورقم الواتساب اللي كيظهرو للمستخدمين.</p>
            </div>
          </div>

          <form onSubmit={handleUpdateSettings} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                  <Building2 className="w-3 h-3" /> اسم البنك
                </label>
                <input 
                  type="text"
                  value={paymentSettings.bank_name}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, bank_name: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="مثال: CIH Bank"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-3 h-3" /> اسم صاحب الحساب
                </label>
                <input 
                  type="text"
                  value={paymentSettings.account_name}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, account_name: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="مثال: ADIB AI PLATFORM"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                <CreditCard className="w-3 h-3" /> رقم الحساب (RIB)
              </label>
              <input 
                type="text"
                value={paymentSettings.rib}
                onChange={(e) => setPaymentSettings({ ...paymentSettings, rib: e.target.value })}
                className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-4 text-sm font-mono font-bold text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                placeholder="230 780 1234567890 1234 567"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                <Smartphone className="w-3 h-3" /> رقم الواتساب للتفعيل
              </label>
              <input 
                type="text"
                value={paymentSettings.whatsapp_number}
                onChange={(e) => setPaymentSettings({ ...paymentSettings, whatsapp_number: e.target.value })}
                className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                placeholder="06XXXXXXXX"
              />
            </div>

            <button 
              type="submit"
              disabled={actionLoading === 'update_settings'}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {actionLoading === 'update_settings' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              حفظ التغييرات
            </button>
          </form>
        </div>
      ) : activeTab === 'requests' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-neutral-900">طلبات التفعيل المعلقة</h3>
                <p className="text-neutral-400 text-sm">راجع طلبات التحويل البنكي وفعل حسابات المستخدمين.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {paymentRequests.length === 0 ? (
              <div className="bg-white p-12 rounded-[2.5rem] border border-neutral-100 text-center space-y-4">
                <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-neutral-300" />
                </div>
                <p className="text-neutral-400 font-medium">لا توجد طلبات تفعيل حالياً.</p>
              </div>
            ) : (
              paymentRequests.map((req) => (
                <div key={req.id} className="bg-white p-6 rounded-[2rem] border border-neutral-100 card-shadow flex flex-col md:flex-row items-center justify-between gap-6 hover:border-emerald-100 transition-all">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className={`p-3 rounded-2xl ${req.status === 'pending' ? 'bg-amber-50 text-amber-600' : req.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {req.status === 'pending' ? <Clock className="w-5 h-5" /> : req.status === 'approved' ? <ShieldCheck className="w-5 h-5" /> : <X className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-neutral-900">{req.email}</p>
                      <p className="text-xs text-neutral-400">تاريخ الطلب: {new Date(req.created_at).toLocaleString('ar-MA')}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto">
                    {req.status === 'pending' ? (
                      <>
                        <button 
                          onClick={() => handlePaymentAction(req.id, 'reject')}
                          disabled={actionLoading === `payment_${req.id}`}
                          className="flex-1 md:flex-none px-6 py-3 rounded-xl border border-rose-100 text-rose-600 text-sm font-bold hover:bg-rose-50 transition-all disabled:opacity-50"
                        >
                          رفض الطلب
                        </button>
                        <button 
                          onClick={() => handlePaymentAction(req.id, 'approve')}
                          disabled={actionLoading === `payment_${req.id}`}
                          className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {actionLoading === `payment_${req.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          تفعيل الحساب (Pro)
                        </button>
                      </>
                    ) : (
                      <span className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider ${req.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {req.status === 'approved' ? 'تم التفعيل' : 'تم الرفض'}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* User Management Section */
        <div className="bg-white rounded-[2.5rem] border border-neutral-100 card-shadow overflow-hidden">
          <div className="p-8 border-b border-neutral-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-lg font-display font-bold text-neutral-900">إدارة المستخدمين</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="بحث عن مستخدم..." 
                  className="pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-neutral-50/50 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  <th className="px-8 py-4">البريد الإلكتروني</th>
                  <th className="px-8 py-4">الرصيد</th>
                  <th className="px-8 py-4">الحالة</th>
                  <th className="px-8 py-4">الرتبة</th>
                  <th className="px-8 py-4">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-8 py-5 text-sm font-bold text-neutral-900">{u.email}</td>
                    <td className="px-8 py-5">
                      {editingUser === u.id ? (
                        <input 
                          type="number"
                          value={editData.credits ?? u.credits}
                          onChange={(e) => setEditData({ ...editData, credits: parseInt(e.target.value) })}
                          className="w-20 px-2 py-1 border rounded text-xs"
                        />
                      ) : (
                        <div className="flex items-center gap-1 text-xs font-bold text-neutral-600">
                          <Coins className="w-3 h-3 text-amber-500" />
                          {u.credits}
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      {editingUser === u.id ? (
                        <select 
                          value={editData.is_pro ?? u.is_pro}
                          onChange={(e) => setEditData({ ...editData, is_pro: parseInt(e.target.value) })}
                          className="px-2 py-1 border rounded text-xs"
                        >
                          <option value={0}>Free</option>
                          <option value={1}>Pro</option>
                        </select>
                      ) : (
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase ${u.is_pro ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-neutral-100 text-neutral-500'}`}>
                          {u.is_pro ? 'Pro' : 'Free'}
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      {editingUser === u.id ? (
                        <select 
                          value={editData.is_admin ?? u.is_admin}
                          onChange={(e) => setEditData({ ...editData, is_admin: parseInt(e.target.value) })}
                          className="px-2 py-1 border rounded text-xs"
                        >
                          <option value={0}>User</option>
                          <option value={1}>Admin</option>
                        </select>
                      ) : (
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase ${u.is_admin ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500'}`}>
                          {u.is_admin ? 'Admin' : 'User'}
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        {editingUser === u.id ? (
                          <>
                            <button onClick={() => handleUpdateUser(u.id)} className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-all">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingUser(null)} className="p-1.5 bg-neutral-100 text-neutral-400 rounded-lg hover:bg-neutral-200 transition-all">
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => {
                                setEditingUser(u.id);
                                setEditData({ credits: u.credits, is_pro: u.is_pro, is_admin: u.is_admin });
                              }}
                              className="p-1.5 bg-neutral-50 text-neutral-400 hover:text-emerald-600 rounded-lg transition-all"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1.5 bg-neutral-50 text-neutral-400 hover:text-rose-600 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
