'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import DashboardSidebar from '@/components/DashboardSidebar';
import { 
  Building2, Users, Calendar, Phone, Plus, Trash2, 
  Search, Shield, Lock, Stethoscope, Clock, AlertCircle, 
  Loader2, Mail, Settings, CheckCircle2, Edit3, Check,
  DollarSign, Activity, MapPin, Power, RefreshCw, CreditCard,
  AlertTriangle, Receipt, ArrowDownCircle, MessageSquareShare, 
  Tag, TrendingUp, UserCheck
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

export default function SuperAdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // التبويب النشط من القائمة الجانبية
  const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'cancelled_audit' | 'facilities' | 'bookings' | 'coupons' | 'settings'>('overview');

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [runningCron, setRunningCron] = useState(false);
  const [cronSuccessMsg, setCronSuccessMsg] = useState('');

  // تسجيل سداد
  const [selectedFacilityForPayment, setSelectedFacilityForPayment] = useState<Facility | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [recordingPayment, setRecordingPayment] = useState(false);

  // تشغيل الفحص والمطابقة
  const runAutoAuditAndFetch = async () => {
    setRunningCron(true);
    try {
      await fetch('/api/cron/auto-complete').catch(() => {});
      await fetchAllPlatformData();
      setCronSuccessMsg('تم فحص ومطابقة الحسابات المالية بنجاح.');
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
  }, []);

  const fetchAllPlatformData = async () => {
    setLoadingData(true);
    try {
      const { data: facs } = await supabase.from('ClinicFacility').select('*').order('created_at', { ascending: false });
      const { data: books } = await supabase.from('Booking').select('*').order('booking_date', { ascending: false });

      if (facs) setFacilities(facs);
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

  // تبديل حالة المنشأة (تفعيل / إيقاف)
  const toggleFacilityStatus = async (fac: Facility) => {
    const newStatus = !fac.is_active;
    const { error } = await supabase
      .from('ClinicFacility')
      .update({ is_active: newStatus })
      .eq('id', fac.id);

    if (!error) {
      setFacilities(prev => prev.map(f => f.id === fac.id ? { ...f, is_active: newStatus } : f));
    }
  };

  // تسجيل سداد مالي
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
      alert(`تم تسجيل سداد $${paymentAmount} بنجاح. المتبقي: $${newDebt}`);
      setSelectedFacilityForPayment(null);
    }
    setRecordingPayment(false);
  };

  // تقرير المطابقة للواتساب
  const generateWeeklyWhatsAppReport = (fac: Facility) => {
    const facBookings = bookings.filter(b => b.facility_id === fac.id);
    const completed = facBookings.filter(b => b.status === 'completed').length;
    const cancelled = facBookings.filter(b => b.status === 'cancelled').length;
    const debt = fac.current_debt || 0;

    let clean = (fac.whatsapp_number || '').replace(/[^0-9]/g, '');
    if (clean.startsWith('967')) clean = clean.slice(3);
    if (clean.startsWith('0')) clean = clean.slice(1);
    const target = '967' + clean;

    const msg = encodeURIComponent(
      `📊 كشف حساب ومطابقة المنصة الطبية\n` +
      `المنشأة: ${fac.name}\n` +
      `---------------------------------\n` +
      `* إجمالي الحالات المكتملة: ${completed}\n` +
      `* الحالات الملغاة: ${cancelled}\n` +
      `* إجمالي العمولة المستحقة: $${debt}\n` +
      `---------------------------------\n` +
      `💳 حسابات السداد المعتمدة:\n` +
      `• بنك الكريمي (حاسب): 3001234567\n` +
      `• محفظة ون كاش: 770000000\n\n` +
      `يرجى التكرم بتسوية الرصيد وتزويدنا برقم الإشعار لتأكيد التصفير.`
    );

    window.open(`https://api.whatsapp.com/send?phone=${target}&text=${msg}`, '_blank');
  };

  const cancelledBookings = useMemo(() => {
    return bookings.filter(b => b.status === 'cancelled');
  }, [bookings]);

  const stats = useMemo(() => {
    const totalFacilities = facilities.length;
    const totalUncollectedDebt = facilities.reduce((sum, f) => sum + Number(f.current_debt || 0), 0);
    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    const totalEarnedRevenue = completedBookings * 1.5; // صافي دخل المنصة بعد الخصومات
    return { totalFacilities, totalUncollectedDebt, completedBookings, totalEarnedRevenue };
  }, [facilities, bookings]);

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
          <h1 className="text-xl font-black text-white mb-2">غرفة التحكم المركزية</h1>
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
              {authSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'دخول'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* 1. القائمة الجانبية الموحدة الخاصة بصاحب المنصة */}
      <DashboardSidebar
        role="admin"
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userName={user.email}
        onLogout={handleSignOut}
        badgeCounts={{
          uncollectedDebt: stats.totalUncollectedDebt,
          cancelledAudits: cancelledBookings.length
        }}
      />

      {/* 2. منطقة المحتوى الرئيسية (معدلة لتناسب عرض القائمة الجانبية) */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-8 space-y-6 pt-16 sm:pt-8"

        
        {/* شريط الإجراءات العلوي */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              {activeTab === 'overview' && 'لوحة المؤشرات والنمو'}
              {activeTab === 'billing' && 'الفوترة والتحصيل المالي'}
              {activeTab === 'cancelled_audit' && 'مركز تدقيق الإلغاءات المشبوهة'}
              {activeTab === 'facilities' && 'دليل وإدارة المنشآت الطبية'}
              {activeTab === 'bookings' && 'سجل الحجوزات الشامل'}
              {activeTab === 'coupons' && 'إدارة العروض والكوبونات'}
              {activeTab === 'settings' && 'إعدادات المنصة المركزية'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">غرفة عمليات الوساطة الطبية وإدارة السيولة</p>
          </div>

          <button
            onClick={runAutoAuditAndFetch}
            disabled={runningCron}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-teal-300 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${runningCron ? 'animate-spin' : ''}`} />
            {runningCron ? 'جاري الفحص...' : 'فحص ومطابقة الحسابات'}
          </button>
        </div>

        {cronSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            {cronSuccessMsg}
          </div>
        )}

        {/* --- تبويب: المؤشرات والنمو (Overview) --- */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 block mb-1">صافي أرباح المنصة</span>
                <span className="text-3xl font-black text-emerald-600 font-mono">${stats.totalEarnedRevenue}</span>
                <span className="text-[11px] text-slate-500 block mt-1">عن {stats.completedBookings} كشفاً مكتملاً</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 block mb-1">المديونية قيد التحصيل</span>
                <span className="text-3xl font-black text-rose-600 font-mono">${stats.totalUncollectedDebt}</span>
                <span className="text-[11px] text-slate-500 block mt-1">عمولات لم تسدد بعد</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 block mb-1">المنشآت المشتركة</span>
                <span className="text-3xl font-black text-slate-900 font-mono">{stats.totalFacilities}</span>
                <span className="text-[11px] text-teal-700 block mt-1">مستشفيات ومراكز تخصصية</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 block mb-1">الحالات الملغاة</span>
                <span className="text-3xl font-black text-amber-600 font-mono">{cancelledBookings.length}</span>
                <span className="text-[11px] text-slate-500 block mt-1">بحاجة للتدقيق الهاتفي</span>
              </div>
            </div>
          </div>
        )}

        {/* --- تبويب: الفوترة والتحصيل (Billing) --- */}
        {activeTab === 'billing' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
              <Receipt className="w-5 h-5 text-teal-600" /> كشف حساب ومطالبات العمولات للمنشآت
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b">
                  <tr>
                    <th className="p-3">المنشأة الطبية</th>
                    <th className="p-3">المحافظة</th>
                    <th className="p-3">المديونية</th>
                    <th className="p-3">السقف</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3">المطالبة الأسبوعية</th>
                    <th className="p-3">سداد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {facilities.map(fac => {
                    const debt = fac.current_debt || 0;
                    const limit = fac.credit_limit || 50;
                    const isExceeded = debt >= limit || fac.is_suspended;

                    return (
                      <tr key={fac.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{fac.name}</td>
                        <td className="p-3 text-slate-600">{fac.city}</td>
                        <td className="p-3 font-mono font-black text-rose-600">${debt}</td>
                        <td className="p-3 font-mono text-slate-500">${limit}</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isExceeded ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isExceeded ? 'معلق' : 'نشط'}
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => generateWeeklyWhatsAppReport(fac)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg border border-emerald-200 text-xs font-bold transition whitespace-nowrap"
                          >
                            <MessageSquareShare className="w-3.5 h-3.5" /> إرسال عبر الواتساب
                          </button>
                        </td>
                        <td className="p-3">
                          {debt > 0 ? (
                            <button
                              onClick={() => {
                                setSelectedFacilityForPayment(fac);
                                setPaymentAmount(debt);
                              }}
                              className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
                            >
                              تسجيل سداد
                            </button>
                          ) : (
                            <span className="text-emerald-600 font-bold text-xs">خالص</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- تبويب: تدقيق الإلغاءات (Cancelled Audit) --- */}
        {activeTab === 'cancelled_audit' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-rose-700 flex items-center gap-2 border-b pb-3">
              <AlertTriangle className="w-5 h-5 text-rose-600" /> مركز تدقيق الحجوزات الملغاة
            </h2>
            {cancelledBookings.length === 0 ? (
              <p className="text-center py-10 text-slate-400 text-xs">لا توجد حجوزات ملغاة مسجلة.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-600 border-b">
                    <tr>
                      <th className="p-3">المريض</th>
                      <th className="p-3">المنشأة</th>
                      <th className="p-3">الطبيب</th>
                      <th className="p-3">تاريخ الحجز</th>
                      <th className="p-3">هاتف المريض</th>
                      <th className="p-3">إجراء التحقق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cancelledBookings.map(b => {
                      let clean = (b.patient_phone || '').replace(/[^0-9]/g, '');
                      if (clean.startsWith('967')) clean = clean.slice(3);
                      if (clean.startsWith('0')) clean = clean.slice(1);
                      const target = '967' + clean;

                      const auditMsg = encodeURIComponent(
                        `مرحباً أستاذ/ة ${b.patient_name}،\n` +
                        `نأمل أن تكون بخير من المنصة الطبية.\n` +
                        `لاحظنا تسجيل موعدك لدى (${b.facility_name}) كـ "ملغي"؛ هل تم إلغاء الزيارة بالفعل أم تفضلتم بالحضور ودفع الرسوم في العيادة؟\n` +
                        `رأيكم يهمنا لضمان جودة الخدمة.`
                      );

                      return (
                        <tr key={b.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">{b.patient_name}</td>
                          <td className="p-3 text-slate-700">{b.facility_name}</td>
                          <td className="p-3 text-teal-700">{b.doctor_name}</td>
                          <td className="p-3 font-mono">{b.booking_date}</td>
                          <td className="p-3 font-mono">+967 {clean}</td>
                          <td className="p-3">
                            <a
                              href={`https://api.whatsapp.com/send?phone=${target}&text=${auditMsg}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg text-xs font-bold border border-amber-200"
                            >
                              <Phone className="w-3.5 h-3.5" /> التحقق من المريض
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* --- تبويب: إدارة المنشآت (Facilities) --- */}
        {activeTab === 'facilities' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
              <Building2 className="w-5 h-5 text-teal-600" /> دليل المنشآت الطبية المتعاقدة
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {facilities.map(fac => (
                <div key={fac.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-slate-900">{fac.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${fac.is_active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {fac.is_active !== false ? 'مفعل' : 'موقف'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{fac.city} - {fac.address}</p>
                  <div className="flex justify-between items-center text-xs font-mono border-t pt-2">
                    <span>المديونية: ${fac.current_debt || 0}</span>
                    <span>السقف: ${fac.credit_limit || 50}</span>
                  </div>
                  <button
                    onClick={() => toggleFacilityStatus(fac)}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition ${
                      fac.is_active !== false ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {fac.is_active !== false ? 'إيقاف المنشأة مؤقتاً' : 'إعادة تفعيل المنشأة'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- تبويب: سجل الحجوزات (Bookings) --- */}
        {activeTab === 'bookings' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
              <Calendar className="w-5 h-5 text-teal-600" /> كافة الحجوزات
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b">
                  <tr>
                    <th className="p-3">المريض</th>
                    <th className="p-3">المنشأة</th>
                    <th className="p-3">الموعد</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3">العمولة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookings.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{b.patient_name}</td>
                      <td className="p-3">{b.facility_name}</td>
                      <td className="p-3 font-mono">{b.booking_date}</td>
                      <td className="p-3 font-bold">{b.status}</td>
                      <td className="p-3 font-mono font-bold text-emerald-600">
                        {b.is_commission_settled ? `$${b.platform_fee || 1.5}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- تبويب: العروض والكوبونات (Coupons) --- */}
        {activeTab === 'coupons' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
              <Tag className="w-5 h-5 text-teal-600" /> سياسة العروض والكوبونات
            </h2>
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl text-xs space-y-2">
              <p className="font-bold text-teal-900">قواعد الخصم الحالية في المنصة:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-1">
                <li>نسبة الخصم للمريض: 15% من قيمة الكشف.</li>
                <li>سقف الخصم الأقصى: <strong>$0.50</strong> فقط لكل حجز.</li>
                <li>صافي ربح المنصة المحمي: لا يقل عن <strong>$1.50</strong> لكل كشف منجز.</li>
                <li>صلاحية الكوبون: يُستهلك لمرة واحدة فقط ويُحظر تلقائياً بعد استخدامه.</li>
              </ul>
            </div>
          </div>
        )}

        {/* --- تبويب: إعدادات المنصة (Settings) --- */}
        {activeTab === 'settings' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 max-w-xl">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
              <Settings className="w-5 h-5 text-teal-600" /> الحسابات البنكية لاستلام العمولات
            </h2>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border rounded-xl flex justify-between items-center">
                <span>🏦 حساب بنك الكريمي (حاسب):</span>
                <strong className="font-mono text-slate-900">3001234567</strong>
              </div>
              <div className="p-3 bg-slate-50 border rounded-xl flex justify-between items-center">
                <span>🟢 محفظة ون كاش (OneCash):</span>
                <strong className="font-mono text-slate-900">770000000</strong>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* نافذة تسجيل السداد */}
      {selectedFacilityForPayment && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-right">
            <h3 className="font-bold text-slate-900 text-base">تسجيل استلام سداد للمنشأة</h3>
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
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold"
                >
                  {recordingPayment ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'تأكيد السداد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
