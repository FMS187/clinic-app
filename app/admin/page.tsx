'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Building2, Users, Calendar, Phone, Plus, Trash2, 
  Search, Shield, Lock, Stethoscope, Clock, AlertCircle, 
  Loader2, LogOut, Mail, Settings, CheckCircle2, Edit3, Check,
  Image as ImageIcon, X, TrendingUp, DollarSign, Activity, MapPin, 
  CheckCircle, XCircle, Power
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

  const [activeTab, setActiveTab] = useState<'overview' | 'facilities' | 'bookings' | 'doctors'>('overview');

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [facilityFilter, setFacilityFilter] = useState('all');

  const [previewImages, setPreviewImages] = useState<string[] | null>(null);

  const [newFacility, setNewFacility] = useState({
    name: '',
    city: 'صنعاء',
    district: '',
    address: '',
    whatsapp_number: '',
    facility_type: 'hospital'
  });

  const [savingFacility, setSavingFacility] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchAllPlatformData();
      }
      setLoadingAuth(false);
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchAllPlatformData();
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
      setAuthError('بيانات الدخول غير صحيحة أو ليس لديك صلاحية مدير المنصة.');
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
        is_active: true
      }
    ]).select();

    if (data && !error) {
      setFacilities([data[0], ...facilities]);
      setNewFacility({ name: '', city: 'صنعاء', district: '', address: '', whatsapp_number: '', facility_type: 'hospital' });
      alert('تم اعتماد المنشأة الطبية بنجاح بالمنصة.');
    } else {
      alert('حدث خطأ أثناء حفظ المنشأة.');
    }
    setSavingFacility(false);
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

  const handleDeleteFacility = async (id: string) => {
    if (!confirm('تحذير: هل أنت متأكد من حذف هذه المنشأة الطبية نهائياً؟')) return;
    const { error } = await supabase.from('ClinicFacility').delete().eq('id', id);
    if (!error) {
      setFacilities(prev => prev.filter(f => f.id !== id));
      setDoctors(prev => prev.filter(d => d.facility_id !== id));
    }
  };

  const stats = useMemo(() => {
    const totalFacilities = facilities.length;
    const activeFacilities = facilities.filter(f => f.is_active ?? true).length;
    const totalDoctors = doctors.length;
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length;
    
    // احتساب تقريبي لعمولة المنصة ($2 لكل حجز مؤكد/مكتمل)
    const estimatedRevenue = confirmedBookings * 2;

    const cityDistribution = {
      'صنعاء': facilities.filter(f => f.city === 'صنعاء').length,
      'عدن': facilities.filter(f => f.city === 'عدن').length,
      'تعز': facilities.filter(f => f.city === 'تعز').length,
      'حضرموت': facilities.filter(f => f.city === 'حضرموت').length,
    };

    return { totalFacilities, activeFacilities, totalDoctors, totalBookings, confirmedBookings, estimatedRevenue, cityDistribution };
  }, [facilities, doctors, bookings]);

  const filteredBookings = useMemo(() => {
    let result = [...bookings];
    if (facilityFilter !== 'all') {
      result = result.filter(b => b.facility_id === facilityFilter);
    }
    if (cityFilter !== 'all') {
      result = result.filter(b => b.branch_city === cityFilter);
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(b => 
        (b.patient_name || '').toLowerCase().includes(q) || 
        (b.patient_phone || '').includes(q) ||
        (b.doctor_name || '').toLowerCase().includes(q) ||
        (b.facility_name || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [bookings, facilityFilter, cityFilter, searchQuery]);

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
          <h1 className="text-xl font-black text-white mb-2">بوابة صاحب المنصة الطبية</h1>
          <p className="text-slate-400 text-xs sm:text-sm mb-6">اللوحة التنفيذية العليا لمراقبة وإدارة النظام</p>

          <form onSubmit={handleSignIn} className="space-y-4 text-right">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">البريد الإلكتروني الرئيسي</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="superadmin@platform.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3.5 pr-10 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm outline-none focus:border-teal-500 transition"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute right-3.5 top-4" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">كلمة المرور السرية</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3.5 pr-10 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm outline-none focus:border-teal-500 transition"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-4" />
              </div>
            </div>

            {authError && (
              <p className="text-rose-400 text-xs mt-2 flex items-center gap-1.5 bg-rose-950/40 border border-rose-800/40 p-2.5 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full py-3.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-sm transition mt-3 flex items-center justify-center gap-2 shadow-lg shadow-teal-600/30"
            >
              {authSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'دخول غرفة التحكم العليا'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ترويسة صاحب المنصة */}
        <header className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-teal-500/20 text-teal-400 border border-teal-500/30 rounded-2xl flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black">غرفة التحكم العليا | منصة الوساطة الطبية</h1>
                <span className="text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30 px-2.5 py-0.5 rounded-full">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">الرؤية الشاملة لكافة المستشفيات والمراكز والأطباء باليمن</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex gap-1 bg-slate-800 p-1 rounded-2xl border border-slate-700 flex-grow sm:flex-grow-0">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'overview' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" /> نظرة عامة
              </button>
              <button
                onClick={() => setActiveTab('facilities')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'facilities' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" /> المنشآت ({facilities.length})
              </button>
              <button
                onClick={() => setActiveTab('bookings')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'bookings' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" /> المعاملات ({bookings.length})
              </button>
              <button
                onClick={() => setActiveTab('doctors')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'doctors' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" /> الأطباء ({doctors.length})
              </button>
            </div>

            <button
              onClick={handleSignOut}
              className="p-2.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-2xl transition border border-slate-700"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* تبويب 1: الرؤية العامة والإحصائيات الحيوية (Executive Overview) */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 block mb-1">المنشآت المعتمدة</span>
                  <div className="text-2xl font-black text-slate-900">{stats.totalFacilities}</div>
                  <span className="text-[11px] text-emerald-600 font-bold">{stats.activeFacilities} منشأة نشطة الآن</span>
                </div>
                <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center">
                  <Building2 className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 block mb-1">إجمالي الأطباء</span>
                  <div className="text-2xl font-black text-slate-900">{stats.totalDoctors}</div>
                  <span className="text-[11px] text-teal-600 font-bold">بمختلف التخصصات</span>
                </div>
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                  <Stethoscope className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 block mb-1">إجمالي الحجوزات</span>
                  <div className="text-2xl font-black text-slate-900">{stats.totalBookings}</div>
                  <span className="text-[11px] text-emerald-600 font-bold">{stats.confirmedBookings} حجز مكتمل/مؤكد</span>
                </div>
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 block mb-1">العمولات المقدرة</span>
                  <div className="text-2xl font-black text-emerald-600">${stats.estimatedRevenue}</div>
                  <span className="text-[11px] text-slate-400">عائد وساطة المنصة</span>
                </div>
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* التوزيع الجغرافي للمنشآت في اليمن */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 border-b pb-3">
                  <MapPin className="w-5 h-5 text-teal-600" /> التوزيع الجغرافي للمنشآت في المحافظات
                </h3>
                <div className="space-y-3">
                  {Object.entries(stats.cityDistribution).map(([city, count]) => (
                    <div key={city} className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                      <span className="font-bold text-slate-700 text-sm">{city}</span>
                      <span className="font-bold text-teal-800 bg-teal-100 px-3 py-1 rounded-xl text-xs">
                        {count} منشأة
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* أحدث طلبات الحجز المباشرة عبر المنصة */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 border-b pb-3">
                  <TrendingUp className="w-5 h-5 text-teal-600" /> أحدث عمليات الحجز عبر المنصة
                </h3>
                <div className="space-y-2">
                  {bookings.slice(0, 4).map((b) => (
                    <div key={b.id} className="flex justify-between items-center text-xs p-2.5 bg-slate-50 rounded-xl">
                      <div>
                        <strong className="text-slate-800 block">{b.patient_name}</strong>
                        <span className="text-slate-500">{b.facility_name || b.branch_name} | {b.doctor_name}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {b.status === 'confirmed' ? 'مؤكد' : 'قيد الانتظار'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* تبويب 2: إدارة واعتماد المنشآت الطبية */}
        {activeTab === 'facilities' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                <Plus className="w-5 h-5 text-teal-600" /> اعتماد منشأة طبية جديدة
              </h2>
              <form onSubmit={handleAddFacility} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم المستشفى / المركز</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: مستشفى صابر التخصصي"
                    value={newFacility.name}
                    onChange={(e) => setNewFacility({ ...newFacility, name: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">المحافظة</label>
                    <select
                      value={newFacility.city}
                      onChange={(e) => setNewFacility({ ...newFacility, city: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-white outline-none"
                    >
                      <option value="صنعاء">صنعاء</option>
                      <option value="عدن">عدن</option>
                      <option value="تعز">تعز</option>
                      <option value="حضرموت">حضرموت</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الحي / المنطقة</label>
                    <input
                      type="text"
                      placeholder="مثال: المنصورة"
                      value={newFacility.district}
                      onChange={(e) => setNewFacility({ ...newFacility, district: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم واتساب الاستقبال لاستلام التذاكر</label>
                  <div className="relative flex items-center" dir="ltr">
                    <span className="bg-slate-100 border border-r-0 border-slate-300 rounded-l-xl px-2.5 py-2 text-xs font-bold text-slate-600">
                      🇾🇪 +967
                    </span>
                    <input
                      type="tel"
                      required
                      placeholder="77xxxxxxx"
                      value={newFacility.whatsapp_number}
                      onChange={(e) => setNewFacility({ ...newFacility, whatsapp_number: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-r-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 font-mono text-right"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع المنشأة</label>
                  <select
                    value={newFacility.facility_type}
                    onChange={(e) => setNewFacility({ ...newFacility, facility_type: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-white outline-none"
                  >
                    <option value="hospital">مستشفى عام / تخصصي</option>
                    <option value="clinic_center">مجمع عيادات استشاري</option>
                    <option value="lab">مركز تشخيصي / مختبرات</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={savingFacility}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm transition mt-2 flex items-center justify-center gap-1.5 shadow-md shadow-teal-600/20"
                >
                  {savingFacility ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  اعتماد ونشر بالمنصة
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-600" /> المنشآت الطبية المعتمدة في المنصة ({facilities.length})
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {facilities.map((fac) => {
                  const isActive = fac.is_active ?? true;
                  const docsCount = doctors.filter(d => d.facility_id === fac.id).length;
                  return (
                    <div key={fac.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                            {fac.city} - {fac.district || 'الرئيسي'}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            +967 {fac.whatsapp_number}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-base">{fac.name}</h3>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> {fac.address || 'اليمن'}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">الأطباء: <strong>{docsCount}</strong></span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleFacilityStatus(fac)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                              isActive ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                            }`}
                          >
                            <Power className="w-3 h-3" /> {isActive ? 'نشطة' : 'معطلة'}
                          </button>
                          <button
                            onClick={() => handleDeleteFacility(fac.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* تبويب 3: سجل كافة المعاملات والحجوزات (Universal Bookings) */}
        {activeTab === 'bookings' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-600" /> سجل الحجوزات والمعاملات الشامل
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">مراقبة تدفق الحجوزات لجميع المستشفيات والعيادات</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <select
                  value={facilityFilter}
                  onChange={(e) => setFacilityFilter(e.target.value)}
                  className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="all">كل المنشآت</option>
                  {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>

                <div className="relative flex-grow sm:w-60">
                  <input
                    type="text"
                    placeholder="ابحث بالاسم، الهاتف، المنشأة..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:border-teal-500 bg-slate-50"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                </div>
              </div>
            </div>

            {loadingData ? (
              <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto" /></div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-slate-500 text-sm">لا توجد حجوزات تطابق البحث.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-3">المريض</th>
                      <th className="p-3">الهاتف</th>
                      <th className="p-3">المنشأة الطبية</th>
                      <th className="p-3">الطبيب المطلوب</th>
                      <th className="p-3">الموعد والتوقيت</th>
                      <th className="p-3">الرسوم والعمولة</th>
                      <th className="p-3">حالة الحجز</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-bold text-slate-900">{b.patient_name}</td>
                        <td className="p-3 text-slate-600 font-mono">+967 {b.patient_phone}</td>
                        <td className="p-3 font-bold text-teal-800">{b.facility_name || b.branch_name}</td>
                        <td className="p-3 text-slate-800">{b.doctor_name}</td>
                        <td className="p-3 text-slate-800 font-mono font-medium whitespace-nowrap">
                          <div>{b.booking_date}</div>
                          <span className="text-xs text-slate-500 font-sans">{b.booking_time}</span>
                        </td>
                        <td className="p-3 font-bold text-emerald-700">
                          ${b.deposit_amount || 20}
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                            b.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            b.status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {b.status === 'confirmed' ? '✅ مؤكد' :
                             b.status === 'completed' ? '🩺 تم الكشف' :
                             b.status === 'cancelled' ? '❌ ملغي' : '⏳ قيد الانتظار'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* تبويب 4: دليل كافة الأطباء */}
        {activeTab === 'doctors' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
              <Stethoscope className="w-5 h-5 text-teal-600" /> دليل الأطباء المسجلين عبر كافة المستشفيات ({doctors.length})
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {doctors.map(doc => {
                const fac = facilities.find(f => f.id === doc.facility_id);
                return (
                  <div key={doc.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-md">
                          كشف: ${doc.consultation_fee || 20}
                        </span>
                        <span className="text-xs text-slate-400">{doc.city}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">{doc.name}</h4>
                      <p className="text-xs text-teal-700 font-medium">{doc.specialty}</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-200 text-xs text-slate-500">
                      🏥 {fac ? fac.name : 'منشأة معتمدة'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
