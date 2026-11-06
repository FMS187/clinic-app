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
  Tag, TrendingUp, UserCheck, ArrowUpRight, BarChart3, Filter,
  FileCheck, XCircle, ExternalLink
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

interface PendingTenant {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  license_number: string;
  license_document_url: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at?: string;
}

export default function SuperAdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // التبويب النشط
  const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'cancelled_audit' | 'facilities' | 'bookings' | 'analytics' | 'coupons' | 'settings'>('overview');

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [pendingTenants, setPendingTenants] = useState<PendingTenant[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [runningCron, setRunningCron] = useState(false);
  const [cronSuccessMsg, setCronSuccessMsg] = useState('');

  // فلترة سجل الحجوزات
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all');
  const [bookingSearch, setBookingSearch] = useState('');

  // إضافة منشأة جديدة يدوياً
  const [showAddFacilityModal, setShowAddFacilityModal] = useState(false);
  const [newFac, setNewFac] = useState({
    name: '',
    city: 'صنعاء',
    district: '',
    address: '',
    whatsapp_number: '',
    facility_type: 'hospital',
    commission_rate: 2.0,
    credit_limit: 50.0
  });
  const [savingFac, setSavingFac] = useState(false);

  // تعديل السقف والعمولة لمنشأة
  const [editingFac, setEditingFac] = useState<Facility | null>(null);
  const [editCommissionRate, setEditCommissionRate] = useState<number>(2.0);
  const [editCreditLimit, setEditCreditLimit] = useState<number>(50.0);
  const [savingFacSettings, setSavingFacSettings] = useState(false);

  // تسجيل سداد
  const [selectedFacilityForPayment, setSelectedFacilityForPayment] = useState<Facility | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [recordingPayment, setRecordingPayment] = useState(false);

  // نافذة رفض ترخيص منشأة
  const [rejectingTenant, setRejectingTenant] = useState<PendingTenant | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');
  const [processingTenantId, setProcessingTenantId] = useState<string | null>(null);

  // فحص الحسابات التلقائي
  const runAutoAuditAndFetch = async () => {
    setRunningCron(true);
    try {
      await fetch('/api/cron/auto-complete').catch(() => {});
      await fetchAllPlatformData();
      setCronSuccessMsg('تم فحص ومطابقة الحسابات المالية وتحديث المنشآت بنجاح.');
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
      // 1. جلب المنشآت المعتمدة النشطة
      const { data: facs } = await supabase
        .from('ClinicFacility')
        .select('*')
        .order('name', { ascending: true });

      // 2. جلب الحجوزات
      const { data: books } = await supabase
        .from('Booking')
        .select('*')
        .order('booking_date', { ascending: false });

      // 3. جلب طلبات تسجيل العيادات والتراخيص
      const { data: tenantsData } = await supabase
        .from('tenants')
        .select('*')
        .order('name', { ascending: true });

      if (facs) setFacilities(facs);
      if (books) setBookings(books);
      if (tenantsData) setPendingTenants(tenantsData as PendingTenant[]);
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

  // اعتماد منشأة مسجلة ونقلها تلقائياً لدليل المنشآت النشطة وإرسال واتساب
  const handleApproveTenant = async (tenant: PendingTenant) => {
    setProcessingTenantId(tenant.id);

    try {
      let cleanPhone = (tenant.phone || '').replace(/[^0-9]/g, '');
      if (cleanPhone.startsWith('967')) cleanPhone = cleanPhone.slice(3);
      if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.slice(1);

      // 1. تحديث حالتها في جدول tenants إلى approved
      const { error: tenantErr } = await supabase
        .from('tenants')
        .update({
          status: 'approved',
          verified_at: new Date().toISOString(),
          rejection_reason: null
        })
        .eq('id', tenant.id);

      if (tenantErr) throw tenantErr;

      // 2. نقل أو إدخال المنشأة في جدول ClinicFacility لتظهر في دليل المنشآت وصفحة الحجز
      const newFacilityRecord = {
        name: tenant.name,
        city: tenant.city || 'صنعاء',
        district: '',
        address: tenant.address || 'اليمن',
        phone: cleanPhone,
        whatsapp_number: cleanPhone,
        facility_type: 'clinic',
        commission_rate: 2.0,
        credit_limit: 50.0,
        current_debt: 0.0,
        is_active: true,
        wallets_info: { kuraimi: '', onecash: '' }
      };

      const { data: createdFac, error: facErr } = await supabase
        .from('ClinicFacility')
        .insert([newFacilityRecord])
        .select()
        .single();

      // تحديث الواجهة
      setPendingTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, status: 'approved' } : t));
      if (createdFac) {
        setFacilities(prev => [createdFac, ...prev]);
      }

      // 3. فتح رسالة واتساب آلية للمنشأة تفيد بالاعتماد
      const targetPhone = '967' + cleanPhone;
      const approvalMsg = encodeURIComponent(
        `السلام عليكم إدارة (${tenant.name})،\n` +
        `تهانينا! نود إبلاغكم بأنه تم التحقق من ترخيصكم الطبي رقم (${tenant.license_number || 'المعتمد'}) واكتمال اعتماد منشأتكم رسمياً في منصة الحجوزات الطبية.\n` +
        `• حالة الحساب: نشط ومعتمد ✓\n` +
        `• عمولة المنصة: $2 لكل كشف\n` +
        `• تم تفعيل ظهور عيادتكم للمرضى في شاشات البحث والحجز المباشر.\n\n` +
        `أهلاً بكم معنا شركاء النجاح!`
      );

      window.open(`https://api.whatsapp.com/send?phone=${targetPhone}&text=${approvalMsg}`, '_blank');
      alert(`تم اعتماد منشأة (${tenant.name}) بنجاح وتم فتح رسالة الواتساب الترحيبية.`);
    } catch (err: any) {
      alert(`خطأ أثناء الاعتماد: ${err.message}`);
    } finally {
      setProcessingTenantId(null);
    }
  };

  // رفض ترخيص منشأة مع توضيح السبب وإرسال واتساب فوري
  const handleConfirmRejectTenant = async () => {
    if (!rejectingTenant) return;
    if (!rejectionReasonText.trim()) {
      alert('يرجى كتابة سبب رفض الترخيص لإرساله للمنشأة عبر الواتساب.');
      return;
    }

    setProcessingTenantId(rejectingTenant.id);

    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReasonText.trim(),
          verified_at: new Date().toISOString()
        })
        .eq('id', rejectingTenant.id);

      if (error) throw error;

      // تحديث الحالة في الواجهة
      setPendingTenants(prev => prev.map(t => t.id === rejectingTenant.id ? {
        ...t,
        status: 'rejected',
        rejection_reason: rejectionReasonText.trim()
      } : t));

      // تجهيز رسالة الواتساب بالسبب
      let cleanPhone = (rejectingTenant.phone || '').replace(/[^0-9]/g, '');
      if (cleanPhone.startsWith('967')) cleanPhone = cleanPhone.slice(3);
      if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.slice(1);
      const targetPhone = '967' + cleanPhone;

      const rejectMsg = encodeURIComponent(
        `السلام عليكم إدارة (${rejectingTenant.name})،\n` +
        `بخصوص طلب انضمامكم إلى المنصة الطبية، نأسف لإبلاغكم بأن طلب الترخيص قوبل بالملاحظات التالية:\n` +
        `⚠️ سبب الرفض / عدم المطابقة:\n"${rejectionReasonText.trim()}"\n\n` +
        `يرجى تعديل البيانات أو تزويدنا بوثيقة ترخيص سارية المفعول لنتمكن من إعادة تفعيل الحساب.`
      );

      window.open(`https://api.whatsapp.com/send?phone=${targetPhone}&text=${rejectMsg}`, '_blank');

      setRejectingTenant(null);
      setRejectionReasonText('');
      alert('تم توثيق الرفض وفتح نافذة الواتساب لإشعار المنشأة بالسبب.');
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
    } finally {
      setProcessingTenantId(null);
    }
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

  // إضافة منشأة جديدة يدوياً
  const handleCreateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFac.name.trim()) return;

    setSavingFac(true);
    let clean = newFac.whatsapp_number.replace(/[^0-9]/g, '');
    if (clean.startsWith('967')) clean = clean.slice(3);
    if (clean.startsWith('0')) clean = clean.slice(1);

    const { data, error } = await supabase.from('ClinicFacility').insert([
      {
        name: newFac.name,
        city: newFac.city,
        district: newFac.district,
        address: newFac.address,
        phone: clean,
        whatsapp_number: clean,
        facility_type: newFac.facility_type,
        commission_rate: newFac.commission_rate,
        credit_limit: newFac.credit_limit,
        current_debt: 0.0,
        is_active: true,
        wallets_info: { kuraimi: '', onecash: '' }
      }
    ]).select();

    if (data && !error) {
      setFacilities(prev => [data[0], ...prev]);
      setShowAddFacilityModal(false);
      setNewFac({
        name: '',
        city: 'صنعاء',
        district: '',
        address: '',
        whatsapp_number: '',
        facility_type: 'hospital',
        commission_rate: 2.0,
        credit_limit: 50.0
      });
      alert('تمت إضافة المنشأة بنجاح.');
    } else {
      alert(`خطأ: ${error?.message || 'تعذر إضافة المنشأة'}`);
    }
    setSavingFac(false);
  };

  // حفظ تعديل إعدادات العمولة والسقف للمنشأة
  const handleSaveFacilitySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFac) return;

    setSavingFacSettings(true);
    const { error } = await supabase
      .from('ClinicFacility')
      .update({
        commission_rate: editCommissionRate,
        credit_limit: editCreditLimit
      })
      .eq('id', editingFac.id);

    if (!error) {
      setFacilities(prev => prev.map(f => f.id === editingFac.id ? {
        ...f,
        commission_rate: editCommissionRate,
        credit_limit: editCreditLimit
      } : f));
      setEditingFac(null);
    }
    setSavingFacSettings(false);
  };

  // حذف منشأة
  const handleDeleteFacility = async (facId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المنشأة؟ سيتم إزالة كافة السجلات المرتبطة بها.')) return;
    const { error } = await supabase.from('ClinicFacility').delete().eq('id', facId);
    if (!error) {
      setFacilities(prev => prev.filter(f => f.id !== facId));
    }
  };

  // تعديل حالة حجز يدوياً
  const handleUpdateBookingStatus = async (bookingId: string | number, newStatus: string) => {
    const { error } = await supabase.from('Booking').update({ status: newStatus }).eq('id', bookingId);
    if (!error) {
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
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

  // إحصائيات الأداء واستخدام المنصة
  const analyticsData = useMemo(() => {
    const total = bookings.length;
    const completed = bookings.filter(b => b.status === 'completed').length;
    const cancelled = bookings.filter(b => b.status === 'cancelled').length;
    const pending = bookings.filter(b => b.status === 'pending').length;
    const couponUsedCount = bookings.filter(b => b.applied_coupon).length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const cancellationRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;
    const couponUsageRate = total > 0 ? Math.round((couponUsedCount / total) * 100) : 0;

    // المنشآت الأكثر استقبالاً للمرضى
    const facCounts: Record<string, number> = {};
    bookings.forEach(b => {
      const name = b.facility_name || 'غير محدد';
      facCounts[name] = (facCounts[name] || 0) + 1;
    });

    const topFacilities = Object.entries(facCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { total, completed, cancelled, pending, couponUsedCount, completionRate, cancellationRate, couponUsageRate, topFacilities };
  }, [bookings]);

  const stats = useMemo(() => {
    const totalFacilities = facilities.length;
    const totalUncollectedDebt = facilities.reduce((sum, f) => sum + Number(f.current_debt || 0), 0);
    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    const totalEarnedRevenue = completedBookings * 1.5;
    return { totalFacilities, totalUncollectedDebt, completedBookings, totalEarnedRevenue };
  }, [facilities, bookings]);

  // قائمة طلبات التراخيص التي تحتاج مراجعة
  const pendingVerificationsCount = useMemo(() => {
    return pendingTenants.filter(t => t.status === 'pending').length;
  }, [pendingTenants]);

  // الحجوزات بعد الفلترة والبحث
  const filteredBookingsList = useMemo(() => {
    return bookings.filter(b => {
      const matchesStatus = bookingStatusFilter === 'all' || b.status === bookingStatusFilter;
      const q = bookingSearch.toLowerCase().trim();
      const matchesSearch = !q ||
        (b.patient_name || '').toLowerCase().includes(q) ||
        (b.patient_phone || '').includes(q) ||
        (b.doctor_name || '').toLowerCase().includes(q) ||
        (b.facility_name || '').toLowerCase().includes(q) ||
        (b.checkin_pin || '').includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [bookings, bookingStatusFilter, bookingSearch]);

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
    <div className="min-h-screen bg-slate-100 flex" dir="rtl">
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

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-8 space-y-6 pt-16 sm:pt-8">
        
        {/* شريط الإجراءات العلوي */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              {activeTab === 'overview' && 'لوحة المؤشرات والنمو'}
              {activeTab === 'billing' && 'الفوترة والتحصيل المالي'}
              {activeTab === 'cancelled_audit' && 'مركز تدقيق الإلغاءات المشبوهة'}
              {activeTab === 'facilities' && 'دليل وإدارة المنشآت الطبية'}
              {activeTab === 'bookings' && 'سجل الحجوزات والتحكم الشامل'}
              {activeTab === 'analytics' && 'حركة الدخول واستخدام المنصة'}
              {activeTab === 'coupons' && 'إدارة العروض والكوبونات'}
              {activeTab === 'settings' && 'إعدادات المنصة المركزية'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">غرفة عمليات الوساطة الطبية وإدارة السيولة والتراخيص</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 border ${
                activeTab === 'analytics' ? 'bg-teal-600 text-white border-teal-600' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> تقرير الاستخدام
            </button>

            <button
              onClick={runAutoAuditAndFetch}
              disabled={runningCron}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-teal-300 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${runningCron ? 'animate-spin' : ''}`} />
              {runningCron ? 'جاري الفحص...' : 'فحص ومطابقة'}
            </button>
          </div>
        </div>

        {cronSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            {cronSuccessMsg}
          </div>
        )}

        {/* 1. المؤشرات التفاعلية */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <button
                type="button"
                onClick={() => {
                  setBookingStatusFilter('completed');
                  setActiveTab('bookings');
                }}
                className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-right hover:border-emerald-500 hover:shadow-md transition group"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-400 group-hover:text-emerald-700 transition">صافي أرباح المنصة</span>
                  <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition" />
                </div>
                <span className="text-3xl font-black text-emerald-600 font-mono mt-1 block">${stats.totalEarnedRevenue}</span>
                <span className="text-[11px] text-slate-500 block mt-1">عن {stats.completedBookings} كشفاً مكتملاً</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('billing')}
                className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-right hover:border-rose-500 hover:shadow-md transition group"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-400 group-hover:text-rose-700 transition">المديونية قيد التحصيل</span>
                  <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-rose-600 transition" />
                </div>
                <span className="text-3xl font-black text-rose-600 font-mono mt-1 block">${stats.totalUncollectedDebt}</span>
                <span className="text-[11px] text-slate-500 block mt-1">عمولات لم تسدد بعد</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('facilities')}
                className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-right hover:border-teal-500 hover:shadow-md transition group"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-400 group-hover:text-teal-700 transition">المنشآت المشتركة</span>
                  <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-teal-600 transition" />
                </div>
                <span className="text-3xl font-black text-slate-900 font-mono mt-1 block">{stats.totalFacilities}</span>
                <span className="text-[11px] text-teal-700 block mt-1">
                  {pendingVerificationsCount > 0 ? `⚠️ يوجد (${pendingVerificationsCount}) بانتظار الاعتماد` : 'جميع المنشآت معتمدة'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('cancelled_audit')}
                className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-right hover:border-amber-500 hover:shadow-md transition group"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-400 group-hover:text-amber-700 transition">الحالات الملغاة</span>
                  <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition" />
                </div>
                <span className="text-3xl font-black text-amber-600 font-mono mt-1 block">{cancelledBookings.length}</span>
                <span className="text-[11px] text-slate-500 block mt-1">بحاجة للتدقيق الهاتفي</span>
              </button>

            </div>

            {/* ملخص حركة الحجوزات الأخيرة */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-600" /> أحدث الحجوزات عبر المنصة
                </h3>
                <button
                  onClick={() => {
                    setBookingStatusFilter('all');
                    setActiveTab('bookings');
                  }}
                  className="text-xs font-bold text-teal-700 hover:underline"
                >
                  عرض الكل ({bookings.length})
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {bookings.slice(0, 5).map(b => (
                  <div key={b.id} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{b.patient_name}</span>
                      <span className="text-slate-400 mx-1.5">•</span>
                      <span className="text-slate-600">{b.facility_name}</span>
                      <span className="text-slate-400 mx-1.5">•</span>
                      <span className="text-teal-700 font-bold">{b.doctor_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400">{b.booking_date}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                        b.status === 'cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {b.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. تحليلات حركة الدخول والاستخدام */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 block mb-1">معدل إتمام الكشوفات</span>
                <span className="text-3xl font-black text-teal-700 font-mono">{analyticsData.completionRate}%</span>
                <span className="text-[11px] text-slate-500 block mt-1">{analyticsData.completed} كشفاً منجزاً بنجاح</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 block mb-1">نسبة استخدام الكوبونات</span>
                <span className="text-3xl font-black text-emerald-600 font-mono">{analyticsData.couponUsageRate}%</span>
                <span className="text-[11px] text-slate-500 block mt-1">{analyticsData.couponUsedCount} مريض استفاد من الخصم</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 block mb-1">معدل الإلغاء المشبوه</span>
                <span className="text-3xl font-black text-rose-600 font-mono">{analyticsData.cancellationRate}%</span>
                <span className="text-[11px] text-slate-500 block mt-1">{analyticsData.cancelled} كشفاً ملغياً</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b pb-3">
                  <Building2 className="w-4 h-4 text-teal-600" /> أكثر المنشآت جذباً للمرضى
                </h3>
                <div className="space-y-3">
                  {analyticsData.topFacilities.map((fac, idx) => (
                    <div key={fac.name} className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800">
                        {idx + 1}. {fac.name}
                      </span>
                      <span className="font-mono bg-teal-50 text-teal-800 px-2.5 py-1 rounded-lg font-bold">
                        {fac.count} حجز
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b pb-3">
                  <Activity className="w-4 h-4 text-teal-600" /> مقاييس التفاعل والسيولة
                </h3>
                <div className="space-y-2.5 text-xs text-slate-600">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>إجمالي الحجوزات المنفذة عبر المنصة:</span>
                    <strong className="font-mono text-slate-900">{analyticsData.total}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>الحجوزات قيد الانتظار الحالية:</span>
                    <strong className="font-mono text-amber-600">{analyticsData.pending}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>متوسط صافي دخل المنصة لكل كشف:</span>
                    <strong className="font-mono text-emerald-600">$1.50</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. دليل وإدارة المنشآت مع فحص التراخيص والاعتماد التلقائي */}
        {activeTab === 'facilities' && (
          <div className="space-y-6">

            {/* قسم طلبات التراخيص الجديدة التي تحتاج موافقة المالك */}
            {pendingTenants.filter(t => t.status === 'pending').length > 0 && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-amber-200 pb-3">
                  <div>
                    <h2 className="text-base font-black text-amber-950 flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-amber-600" /> 
                      طلبات انضمام وتراخيص جديدة بانتظار موافقتك ({pendingTenants.filter(t => t.status === 'pending').length})
                    </h2>
                    <p className="text-xs text-amber-700 mt-0.5">
                      بمجرد الموافقة، ستنزل المنشأة تلقائياً في دليلك أدناه وتظهر فوراً للمرضى مع إشعار المنشأة بالواتساب
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingTenants.filter(t => t.status === 'pending').map(tenant => {
                    const isProcessing = processingTenantId === tenant.id;
                    const hasDoc = tenant.license_document_url && tenant.license_document_url !== 'pending-document';

                    return (
                      <div key={tenant.id} className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-black text-slate-900 text-sm">{tenant.name}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">{tenant.city} - {tenant.address}</p>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            قيد المراجعة ⏳
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">رقم الترخيص:</span>
                            <strong className="font-mono text-slate-800">{tenant.license_number || 'غير مدخل'}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">هاتف التواصل:</span>
                            <strong className="font-mono text-slate-800">{tenant.phone}</strong>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                            <span className="text-slate-500">ملف الترخيص:</span>
                            {hasDoc ? (
                              <a
                                href={tenant.license_document_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-teal-700 font-bold hover:underline"
                              >
                                معاينة الوثيقة <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-slate-400">لا يوجد ملف مرفق</span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleApproveTenant(tenant)}
                            disabled={isProcessing}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" />
                            {isProcessing ? 'جارٍ الاعتماد...' : 'اعتماد وإشعار بالواتساب'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRejectingTenant(tenant);
                              setRejectionReasonText('');
                            }}
                            disabled={isProcessing}
                            className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" /> رفض
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* دليل المنشآت الطبية المتعاقدة */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-teal-600" /> دليل المنشآت الطبية المتعاقدة ({facilities.length})
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">المنشآت النشطة التي تظهر للمرضى في شاشات الحجز</p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddFacilityModal(true)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-teal-600/20"
                >
                  <Plus className="w-4 h-4" /> إضافة منشأة جديدة
                </button>
              </div>

              {facilities.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  لا توجد منشآت مفعلة حالياً. اعتمد طلباً من الطلبات المعلقة أعلاه لتنزل هنا تلقائياً.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {facilities.map(fac => (
                    <div key={fac.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-slate-900">{fac.name}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">{fac.city} - {fac.address || 'اليمن'}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${fac.is_active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {fac.is_active !== false ? 'مفعل' : 'موقف'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-white p-2.5 rounded-xl border border-slate-200">
                        <div>
                          <span className="text-[10px] text-slate-400 block">العمولة:</span>
                          <strong className="text-teal-700">${fac.commission_rate || 2.0}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">السقف:</span>
                          <strong className="text-slate-800">${fac.credit_limit || 50.0}</strong>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingFac(fac);
                            setEditCommissionRate(fac.commission_rate || 2.0);
                            setEditCreditLimit(fac.credit_limit || 50.0);
                          }}
                          className="flex-1 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition"
                        >
                          ضبط الشروط
                        </button>

                        <button
                          onClick={() => toggleFacilityStatus(fac)}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                            fac.is_active !== false ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {fac.is_active !== false ? 'إيقاف' : 'تفعيل'}
                        </button>

                        <button
                          onClick={() => handleDeleteFacility(fac.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl transition border border-slate-200"
                          title="حذف المنشأة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* 4. سجل الحجوزات والتحكم الشامل */}
        {activeTab === 'bookings' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-600" /> سجل الحجوزات الشامل والتحكم
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">يمكنك تعديل حالة أي حجز والبحث باسم المريض أو هاتفه أو PIN</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-grow sm:w-60">
                  <input
                    type="text"
                    placeholder="بحث سريع..."
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs outline-none bg-slate-50"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>

                <select
                  value={bookingStatusFilter}
                  onChange={(e) => setBookingStatusFilter(e.target.value)}
                  className="p-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="all">كافة الحالات</option>
                  <option value="completed">🩺 مكتمل (Completed)</option>
                  <option value="confirmed">✅ مؤكد (Confirmed)</option>
                  <option value="pending">⏳ معلق (Pending)</option>
                  <option value="cancelled">❌ ملغي (Cancelled)</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b">
                  <tr>
                    <th className="p-3">المريض</th>
                    <th className="p-3">رمز PIN</th>
                    <th className="p-3">المنشأة</th>
                    <th className="p-3">الطبيب</th>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">الحالة والتحكم</th>
                    <th className="p-3">العمولة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBookingsList.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">
                        {b.patient_name}
                        <span className="block text-[11px] font-mono text-slate-400 font-normal">{b.patient_phone}</span>
                      </td>
                      <td className="p-3 font-mono font-bold text-amber-700">{b.checkin_pin || '---'}</td>
                      <td className="p-3 text-slate-700">{b.facility_name}</td>
                      <td className="p-3 text-teal-700">{b.doctor_name}</td>
                      <td className="p-3 font-mono">{b.booking_date}</td>
                      <td className="p-3">
                        <select
                          value={b.status || 'pending'}
                          onChange={(e) => handleUpdateBookingStatus(b.id, e.target.value)}
                          className={`text-xs font-bold px-2 py-1 rounded-lg border outline-none cursor-pointer ${
                            b.status === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                            b.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                            b.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-300' : 'bg-white text-slate-700'
                          }`}
                        >
                          <option value="pending">معلق</option>
                          <option value="confirmed">مؤكد</option>
                          <option value="completed">مكتمل</option>
                          <option value="cancelled">ملغي</option>
                        </select>
                      </td>
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

        {/* 5. الفوترة والتحصيل */}
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

        {/* 6. تدقيق الإلغاءات */}
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

        {/* 7. الكوبونات */}
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

        {/* 8. إعدادات المنصة */}
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

      {/* نافذة تحديد سبب رفض الترخيص */}
      {rejectingTenant && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-right">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-base border-b pb-2">
              <XCircle className="w-5 h-5" />
              رفض ترخيص ({rejectingTenant.name})
            </div>
            <p className="text-xs text-slate-500">
              اكتب سبب الرفض بوضوح ليتم تضمينه تلقائياً في رسالة الواتساب الموجهة للمنشأة:
            </p>

            <textarea
              rows={4}
              value={rejectionReasonText}
              onChange={(e) => setRejectionReasonText(e.target.value)}
              placeholder="مثال: رقم الترخيص غير مطابق للملف، أو انتهت صلاحية السجل الطبي."
              className="w-full p-3 border border-slate-300 rounded-xl text-xs outline-none focus:border-rose-500"
            />

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingTenant(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleConfirmRejectTenant}
                disabled={processingTenantId === rejectingTenant.id}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
              >
                {processingTenantId === rejectingTenant.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تأكيد وإرسال واتساب'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إضافة منشأة جديدة يدوياً */}
      {showAddFacilityModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-right max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-slate-900 text-base">إضافة منشأة طبية متعاقدة</h3>
            <form onSubmit={handleCreateFacility} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم المستشفى / المركز الطبي</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مستشفى آزال التخصصي"
                  value={newFac.name}
                  onChange={(e) => setNewFac({ ...newFac, name: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">المحافظة</label>
                  <select
                    value={newFac.city}
                    onChange={(e) => setNewFac({ ...newFac, city: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white outline-none"
                  >
                    <option value="صنعاء">صنعاء</option>
                    <option value="عدن">عدن</option>
                    <option value="تعز">تعز</option>
                    <option value="حضرموت">حضرموت</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">نوع المنشأة</label>
                  <select
                    value={newFac.facility_type}
                    onChange={(e) => setNewFac({ ...newFac, facility_type: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white outline-none"
                  >
                    <option value="hospital">مستشفى</option>
                    <option value="clinic">مركز تخصصي</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">العنوان بالتفصيل</label>
                <input
                  type="text"
                  placeholder="الشارع - الحي"
                  value={newFac.address}
                  onChange={(e) => setNewFac({ ...newFac, address: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">واتساب الاستقبال</label>
                <input
                  type="tel"
                  required
                  placeholder="77xxxxxxx"
                  value={newFac.whatsapp_number}
                  onChange={(e) => setNewFac({ ...newFac, whatsapp_number: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">عمولة المنصة ($)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={newFac.commission_rate}
                    onChange={(e) => setNewFac({ ...newFac, commission_rate: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">السقف الائتماني ($)</label>
                  <input
                    type="number"
                    step="5"
                    min="10"
                    value={newFac.credit_limit}
                    onChange={(e) => setNewFac({ ...newFac, credit_limit: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddFacilityModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingFac}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold"
                >
                  {savingFac ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'إضافة المنشأة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة ضبط العمولة والسقف لمنشأة قائمة */}
      {editingFac && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-right">
            <h3 className="font-bold text-slate-900 text-base">ضبط شروط التعاقد ({editingFac.name})</h3>
            <form onSubmit={handleSaveFacilitySettings} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">عمولة الكشف الواحد ($)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  value={editCommissionRate}
                  onChange={(e) => setEditCommissionRate(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">السقف الائتماني للمديونية ($)</label>
                <input
                  type="number"
                  step="5"
                  min="10"
                  required
                  value={editCreditLimit}
                  onChange={(e) => setEditCreditLimit(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingFac(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingFacSettings}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold"
                >
                  {savingFacSettings ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'تحديث الشروط'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
