'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Building2, Users, Calendar, Phone, Plus, Trash2, 
  Search, Shield, Lock, Stethoscope, Clock, AlertCircle, 
  Loader2, LogOut, Mail, Settings, CheckCircle2, Edit3, Check,
  DollarSign, Activity, MapPin, Power, RefreshCw, CreditCard,
  AlertTriangle, Receipt, ArrowDownCircle, CheckCircle
} from 'lucide-react';

interface Facility {
  id: string;
  name: string;
  city: string;
  district: string;
  address: string;
  phone: string;
  whatsapp_number: string;
  facility_type: string;
  is_active?: boolean;
  commission_rate?: number;
  credit_limit?: number;
  current_debt?: number;
  is_suspended?: boolean;
}

interface Doctor {
  id: string | number;
  name: string;
  specialty: string;
  category: string;
  facility_id: string;
  consultation_fee: number;
  city: string;
}

export default function SuperAdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'facilities' | 'bookings' | 'doctors'>('billing');

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [runningCron, setRunningCron] = useState(false);
  const [cronSuccessMsg, setCronSuccessMsg] = useState('');

  // نافذة تسجيل استلام سداد
  const [selectedFacilityForPayment, setSelectedFacilityForPayment] = useState<Facility | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentRef, setPaymentRef] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [facilityFilter, setFacilityFilter] = useState('all');

  const [newFacility, setNewFacility] = useState({
    name: '',
    city: 'صنعاء',
    district: '',
    address: '',
    whatsapp_number: '',
    facility_type: 'hospital',
    commission_rate: 2,
    credit_limit: 50
  });

  const [savingFacility, setSavingFacility] = useState(false);

  // تشغيل الفحص التلقائي وجلب البيانات
  const runAutoAuditAndFetch = async () => {
    setRunningCron(true);
    try {
      // 1. تشغيل الأتمتة البرمجية فورياً
      await fetch('/api/cron/auto-complete').catch(() => {});
      // 2. تحديث كامل البيانات المعروضة في الشاشة
      await fetchAllPlatformData();
      setCronSuccessMsg('تم التحقق وتحديث كافة الحسابات بنجاح.');
      setTimeout(() => setCronSuccessMsg(''), 4000);
    } catch (e) {
      console.log('Error triggering cron', e);
    }
    setRunningCron(false);
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        runAutoAuditAndFetch();
      }
      setLoadingAuth(false);
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        runAutoAuditAndFetch();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchAllPlatformData = async () => {
    setLoadingData(true);
    try {
      const { data: facs } = await supabase.from('ClinicFacility').select('*').order('created_at', { ascending: false });
      const { data: docs } = await supabase.from('Doctor').select('*');
      const { data: books } = await supabase.from('Booking').select('*').order('booking_date', { ascending: true });

      if (facs) setFacilities(facs);
      if (docs) setDoctors(docs);
      if (books) setBookings(books);
    } catch (e) {
      console.log('Error fetching platform data', e);
    }
    setLoadingData(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setAuthError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError('بيانات الدخول غير صحيحة.');
    }
    setAuthSubmitting(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleAddFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFacility.name || !newFacility.whatsapp_number) return;
    setSavingFacility(true);

    let clean = newFacility.whatsapp_number.replace(/[^0-9]/g, '');
    if (clean.startsWith('967')) clean = clean.slice(3);
    if (clean.startsWith('0')) clean = clean.slice(1);

    const { data, error } = await supabase.from('ClinicFacility').insert([
      {
        name: newFacility.name,
        city: newFacility.city,
        district: newFacility.district,
        address: newFacility.address,
        whatsapp_number: clean,
        facility_type: newFacility.facility_type,
        commission_rate: newFacility.commission_rate,
        credit_limit: newFacility.credit_limit,
        current_debt: 0,
        is_active: true,
        is_suspended: false
      }
    ]).select();

    if (data && !error) {
      setFacilities([data[0], ...facilities]);
      setNewFacility({ 
        name: '', city: 'صنعاء', district: '', address: '', 
        whatsapp_number: '', facility_type: 'hospital', 
        commission_rate: 2, credit_limit: 50 
      });
      alert('تم اعتماد المنشأة وضبط عمولتها بنجاح.');
    }
    setSavingFacility(false);
  };

  // تسجيل سداد مالي لمنشأة (كامل أو جزئي)
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacilityForPayment || paymentAmount <= 0) return;
    setRecordingPayment(true);

    const fac = selectedFacilityForPayment;
    const currentDebt = fac.current_debt || 0;
    const newDebt = Math.max(0, currentDebt - paymentAmount);
    const limit = fac.credit_limit || 50;
    const isNowSuspended = newDebt >= limit;

    const { error } = await supabase
      .from('ClinicFacility')
      .update({
        current_debt: newDebt,
        is_suspended: isNowSuspended
      })
      .eq('id', fac.id);

    if (!error) {
      setFacilities(prev => prev.map(f => f.id === fac.id ? { ...f, current_debt: newDebt, is_suspended: isNowSuspended } : f));
      alert(`تم تسجيل سداد مبلغ $${paymentAmount} بنجاح. المديونية المتبقية للمنشأة: $${newDebt}`);
      setSelectedFacilityForPayment(null);
      setPaymentRef('');
    } else {
      alert('حدث خطأ أثناء حفظ السداد.');
    }
    setRecordingPayment(false);
  };

  const toggleFacilityStatus = async (fac: Facility) => {
    const updatedStatus = !(fac.is_active ?? true);
    const { error } = await supabase
      .from('ClinicFacility')
      .update({ is_active: updatedStatus })
      .eq('id', fac.id);

    if (!error) {
      setFacilities(prev => prev.map(f => f.id === fac.id ? { ...f, is_active: updatedStatus } : f));
    }
  };

  // العمليات الإحصائية والحسابية
  const stats = useMemo(() => {
    const totalFacilities = facilities.length;
    const activeFacilities = facilities.filter(f => f.is_active ?? true).length;
    const suspendedFacilities = facilities.filter(f => f.is_suspended).length;

    const totalUncollectedDebt = facilities.reduce((sum, f) => sum + Number(f.current_debt || 0), 0);
    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    const autoClosedBookings = bookings.filter(b => b.auto_completed).length;
    const totalEarnedRevenue = completedBookings * 2;

    return { 
      totalFacilities, 
      activeFacilities, 
      suspendedFacilities, 
      totalUncollectedDebt, 
      completedBookings, 
      autoClosedBookings, 
      totalEarnedRevenue 
    };
  }, [facilities, bookings]);

  const filteredBookings = useMemo(() => {
    let result = [...bookings];
    if (facilityFilter !== 'all') {
      result = result.filter(b => b.facility_id === facilityFilter);
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(b => 
        (b.patient_name || '').toLowerCase().includes(q) || 
        (b.patient_phone || '').includes(q) ||
        (b.facility_name || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [bookings, facilityFilter, searchQuery]);

  if (loadingAuth) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 w-full max-w-md p-8 rounded-3xl shadow-2xl text-center">
          <div className="w-16 h-16 bg-teal-500/10 text-teal-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-teal-500/20">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-white mb-2">غرفة التحكم والفوترة العليا</h1>
          <form onSubmit={handleSignIn} className="space-y-4 text-right">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">البريد الإلكتروني</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">كلمة المرور</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm outline-none focus:border-teal-500"
              />
            </div>
            {authError && <p className="text-rose-400 text-xs p-2.5 bg-rose-950/40 rounded-lg">{authError}</p>}
            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full py-3.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-sm transition mt-2"
            >
              {authSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'دخول اللوحة'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ترويسة صاحب المنصة مع زر الفحص الآلي */}
        <header className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-teal-500/20 text-teal-400 border border-teal-500/30 rounded-2xl flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black">غرفة الفوترة والتحصيل المركزي</h1>
                <span className="text-[10px] font-bold bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-md">
                  نظام الأتمتة نشط ⚡
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">تحديث آلي يومي لحسابات المشافي دون تدخل يدوي</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* زر تشغيل الفحص الآلي يدوياً في أي لحظة */}
            <button
              onClick={runAutoAuditAndFetch}
              disabled={runningCron}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-2xl border border-slate-700 text-xs font-bold transition flex items-center gap-2 shadow-sm"
              title="فحص فوري لجميع الحسابات وإغلاق المنتهي"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${runningCron ? 'animate-spin' : ''}`} />
              {runningCron ? 'جاري الفحص المالي...' : 'فحص ومطابقة الحسابات الآن'}
            </button>

            <button onClick={handleSignOut} className="p-2.5 text-slate-400 hover:text-rose-400 rounded-2xl transition border border-slate-700">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {cronSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            {cronSuccessMsg}
          </div>
        )}

        {/* شريط التنقل */}
        <div className="flex gap-1 bg-white p-1.5 rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
          <button
            onClick={() => setActiveTab('billing')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'billing' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <CreditCard className="w-4 h-4" /> كشف مديونيات المشافي وسداد الفواتير
            {stats.totalUncollectedDebt > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-2 py-0.2 rounded-full font-mono">
                ${stats.totalUncollectedDebt}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'overview' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Activity className="w-4 h-4" /> الإحصائيات العامة
          </button>

          <button
            onClick={() => setActiveTab('facilities')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'facilities' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-4 h-4" /> المنشآت الطبية ({facilities.length})
          </button>

          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'bookings' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-4 h-4" /> سجل الحجوزات ({bookings.length})
          </button>
        </div>

        {/* 1. التبويب الأساسي: كشف المديونيات الشامل وسداد الفواتير */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            {/* بطاقات المؤشرات المالية للديون */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 block mb-1">إجمالي المستحقات تحت التحصيل</span>
                <div className="text-2xl font-black text-rose-600 font-mono">${stats.totalUncollectedDebt}</div>
                <span className="text-[11px] text-slate-500">عمولات مطلوبة من المستشفيات</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 block mb-1">إجمالي العائد المحقق</span>
                <div className="text-2xl font-black text-emerald-600 font-mono">${stats.totalEarnedRevenue}</div>
                <span className="text-[11px] text-teal-700 font-bold">عن {stats.completedBookings} كشف مكتمل</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 block mb-1">حجوزات أغلقت آلياً (24 ساعة)</span>
                <div className="text-2xl font-black text-blue-600 font-mono">{stats.autoClosedBookings}</div>
                <span className="text-[11px] text-blue-700 font-bold">حسمت عمولتها لمنع التهرب</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 block mb-1">منشآت معلقة لتجاوز السقف</span>
                <div className="text-2xl font-black text-amber-600 font-mono">{stats.suspendedFacilities}</div>
                <span className="text-[11px] text-amber-800 font-bold">تنتظر سداد الفاتورة</span>
              </div>
            </div>

            {/* جدول المديونيات والتحصيل المالي التفصيلي لكل منشأة */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-teal-600" /> كشف حساب ومتابعة ديون المنشآت الطبية
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">يمكنك تسجيل أي دفعة مستلمة بنقرة واحدة لتصفير أو تخفيض المديونية</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-600 border-b">
                    <tr>
                      <th className="p-3">المنشأة الطبية</th>
                      <th className="p-3">المحافظة</th>
                      <th className="p-3">الحالات المكتملة</th>
                      <th className="p-3">العمولة للكشف</th>
                      <th className="p-3">السقف الائتماني</th>
                      <th className="p-3">المديونية الحالية</th>
                      <th className="p-3">حالة الحساب</th>
                      <th className="p-3">إجراء التحصيل والسداد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {facilities.map(fac => {
                      const debt = fac.current_debt || 0;
                      const limit = fac.credit_limit || 50;
                      const isExceeded = debt >= limit || fac.is_suspended;
                      const completedCount = bookings.filter(b => b.facility_id === fac.id && b.status === 'completed').length;

                      return (
                        <tr key={fac.id} className="hover:bg-slate-50/80">
                          <td className="p-3 font-bold text-slate-900">{fac.name}</td>
                          <td className="p-3 text-slate-600">{fac.city}</td>
                          <td className="p-3 font-bold text-teal-800">{completedCount} حالة</td>
                          <td className="p-3 font-mono font-bold text-slate-700">${fac.commission_rate || 2}</td>
                          <td className="p-3 font-mono font-bold text-slate-700">${limit}</td>
                          <td className="p-3">
                            <span className={`font-mono font-black text-sm ${debt > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                              ${debt}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isExceeded ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isExceeded ? '⛔ معلق (تجاوز السقف)' : '✅ نشط'}
                            </span>
                          </td>
                          <td className="p-3">
                            {debt > 0 ? (
                              <button
                                onClick={() => {
                                  setSelectedFacilityForPayment(fac);
                                  setPaymentAmount(debt);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
                              >
                                <ArrowDownCircle className="w-3.5 h-3.5" />
                                تسجيل استلام سداد
                              </button>
                            ) : (
                              <span className="text-emerald-700 text-xs font-bold flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> مسدد بالكامل
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2. تبويب النظرة العامة */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-base border-b pb-3 flex items-center gap-2">
                <Shield className="w-5 h-5 text-teal-600" /> ملخص نشاط الأتمتة المالية
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-600">نظام الإغلاق التلقائي (24 ساعة):</span>
                  <span className="font-bold text-emerald-700">يعمل آلياً بالخلفية 🟢</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-600">الحجوزات التي تم حفظ عمولتها آلياً:</span>
                  <span className="font-bold text-blue-700 font-mono">{stats.autoClosedBookings} كشف</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-600">المستشفيات النشطة حالياً:</span>
                  <span className="font-bold text-teal-800">{stats.activeFacilities} منشأة</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-base border-b pb-3 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-teal-600" /> تنبيهات التحصيل والديون
              </h3>
              {stats.suspendedFacilities > 0 ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 space-y-2">
                  <strong>توجد {stats.suspendedFacilities} منشأة تجاوزت السقف الائتماني المسموح به!</strong>
                  <p>تم تعليق استقبال الحجوزات لها تلقائياً لحين تصفير المديونية عبر تحويل الحوالة.</p>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800">
                  كافة المنشآت الطبية تعمل ضمن السقف الائتماني الآمن، ولا توجد أي منشأة معلقة حالياً.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. تبويب المنشآت */}
        {activeTab === 'facilities' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                <Plus className="w-5 h-5 text-teal-600" /> اعتماد منشأة وضبط السقف الائتماني
              </h2>
              <form onSubmit={handleAddFacility} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم المنشأة</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: مستشفى صابر التخصصي"
                    value={newFacility.name}
                    onChange={(e) => setNewFacility({ ...newFacility, name: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">المحافظة</label>
                    <select
                      value={newFacility.city}
                      onChange={(e) => setNewFacility({ ...newFacility, city: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-white"
                    >
                      <option value="صنعاء">صنعاء</option>
                      <option value="عدن">عدن</option>
                      <option value="تعز">تعز</option>
                      <option value="حضرموت">حضرموت</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الحي</label>
                    <input
                      type="text"
                      placeholder="مثال: المنصورة"
                      value={newFacility.district}
                      onChange={(e) => setNewFacility({ ...newFacility, district: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">واتساب الاستقبال</label>
                  <input
                    type="tel"
                    required
                    placeholder="77xxxxxxx"
                    value={newFacility.whatsapp_number}
                    onChange={(e) => setNewFacility({ ...newFacility, whatsapp_number: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">عمولة الكشف ($)</label>
                    <input
                      type="number"
                      min="1"
                      value={newFacility.commission_rate}
                      onChange={(e) => setNewFacility({ ...newFacility, commission_rate: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-xl text-sm outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">السقف الائتماني ($)</label>
                    <input
                      type="number"
                      min="10"
                      value={newFacility.credit_limit}
                      onChange={(e) => setNewFacility({ ...newFacility, credit_limit: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-xl text-sm outline-none font-mono"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={savingFacility}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm transition mt-2"
                >
                  {savingFacility ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'اعتماد ونشر المنشأة'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-600" /> قائمة المشافي المعتمدة ({facilities.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {facilities.map((fac) => (
                  <div key={fac.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                          {fac.city}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">+967 {fac.whatsapp_number}</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-base">{fac.name}</h3>
                      <p className="text-xs text-slate-500 mt-1">المديونية: <strong className="text-rose-600 font-mono">${fac.current_debt || 0}</strong> / سقف: ${fac.credit_limit || 50}</p>
                    </div>
                    <div className="pt-2 border-t flex justify-between items-center text-xs">
                      <button
                        onClick={() => toggleFacilityStatus(fac)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                          fac.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        <Power className="w-3 h-3" /> {fac.is_active ? 'نشطة' : 'معطلة'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. تبويب الحجوزات */}
        {activeTab === 'bookings' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
              <Calendar className="w-5 h-5 text-teal-600" /> كافة الحجوزات وحالة تسوية العمولات
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b">
                  <tr>
                    <th className="p-3">المريض</th>
                    <th className="p-3">المنشأة</th>
                    <th className="p-3">الطبيب</th>
                    <th className="p-3">الموعد</th>
                    <th className="p-3">حالة الحجز</th>
                    <th className="p-3">العمولة</th>
                    <th className="p-3">نوع الإغلاق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{b.patient_name}</td>
                      <td className="p-3 font-bold text-teal-800">{b.facility_name || b.branch_name}</td>
                      <td className="p-3 text-slate-800">{b.doctor_name}</td>
                      <td className="p-3 font-mono">{b.booking_date} ({b.booking_time})</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          b.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {b.status === 'completed' ? 'تم الكشف' : b.status === 'confirmed' ? 'مؤكد' : 'قيد الانتظار'}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-emerald-700 font-mono">
                        {b.is_commission_settled ? `$${b.platform_fee || 2}` : '-'}
                      </td>
                      <td className="p-3 text-xs">
                        {b.auto_completed ? (
                          <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md">
                            آلي (24 ساعة)
                          </span>
                        ) : b.verified_by_patient ? (
                          <span className="text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-md">
                            تأكيد المريض
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* نافذة تسجيل استلام السداد المالي للمنشأة */}
      {selectedFacilityForPayment && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-right">
            <div className="border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">تسجيل استلام حوالة سداد</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                المنشأة: <strong className="text-teal-700">{selectedFacilityForPayment.name}</strong>
              </p>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ المسدد ($)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-mono font-bold outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  المديونية الكلية الحالية: ${selectedFacilityForPayment.current_debt || 0}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الحوالة أو العملية (اختياري)</label>
                <input
                  type="text"
                  placeholder="مثال: حوالة حاسب / إشعار كريمي"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedFacilityForPayment(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={recordingPayment}
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20"
                >
                  {recordingPayment ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'تأكيد وحسم المديونية'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
