'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Building2, Users, Calendar, Phone, Plus, Trash2, 
  Search, Shield, Lock, Stethoscope, Clock, AlertCircle, 
  Loader2, LogOut, Mail, Settings, CheckCircle2, Edit3, Check,
  Image as ImageIcon, X, Filter, MapPin
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

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'admin' | 'receptionist'>('admin');
  const [userFacilityId, setUserFacilityId] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // بيانات الدخول
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // التبويبات النشطة
  const [activeTab, setActiveTab] = useState<'bookings' | 'facilities' | 'doctors' | 'settings'>('bookings');

  // البيانات المخزنة
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | number | null>(null);

  // التصفية والبحث
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFacilityFilter, setSelectedFacilityFilter] = useState('all');

  // نافذة تعديل الموعد
  const [editingBooking, setEditingBooking] = useState<any | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // نافذة معاينة الصور السريرية (للمدير العام فقط)
  const [previewImages, setPreviewImages] = useState<string[] | null>(null);

  // نموذج إضافة منشأة طبية جديدة
  const [newFacility, setNewFacility] = useState({
    name: '',
    city: 'صنعاء',
    district: '',
    address: '',
    whatsapp_number: '',
    facility_type: 'hospital'
  });

  // نموذج إضافة طبيب جديد
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    specialty: '',
    category: 'dental',
    facility_id: '',
    consultation_fee: 20
  });

  const availableTimes = [
    '09:30 صباحاً', '10:30 صباحاً', '11:30 صباحاً',
    '04:30 عصراً', '05:30 مساءً', '06:30 مساءً', '07:30 مساءً'
  ];

  const extractRoleAndFacility = (sessionUser: any) => {
    if (!sessionUser) return { role: 'admin' as const, facilityId: null };
    const role = sessionUser.user_metadata?.role === 'receptionist' ? 'receptionist' as const : 'admin' as const;
    const facilityId = sessionUser.user_metadata?.facility_id || null;
    return { role, facilityId };
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const { role, facilityId } = extractRoleAndFacility(currentUser);
        setUserRole(role);
        setUserFacilityId(facilityId);
        if (role === 'receptionist') {
          setActiveTab('bookings');
        }
        fetchAllData(role, facilityId);
      }
      setLoadingAuth(false);
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const { role, facilityId } = extractRoleAndFacility(currentUser);
        setUserRole(role);
        setUserFacilityId(facilityId);
        if (role === 'receptionist') {
          setActiveTab('bookings');
        }
        fetchAllData(role, facilityId);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchAllData = async (role: 'admin' | 'receptionist', facilityId: string | null) => {
    setLoadingData(true);
    try {
      // 1. جلب المنشآت الطبية
      const { data: facs } = await supabase
        .from('ClinicFacility')
        .select('*')
        .order('name');
      if (facs) {
        setFacilities(facs);
        if (facs.length > 0 && !newDoctor.facility_id) {
          setNewDoctor(prev => ({ ...prev, facility_id: facs[0].id }));
        }
      }

      // 2. جلب الأطباء (حسب صلاحية المستخدم)
      let docsQuery = supabase.from('Doctor').select('*');
      if (role === 'receptionist' && facilityId) {
        docsQuery = docsQuery.eq('facility_id', facilityId);
      }
      const { data: docs } = await docsQuery;
      if (docs) setDoctors(docs);

      // 3. جلب الحجوزات (معزولة لموظف الاستقبال، وشاملة للمدير العام)
      let booksQuery = supabase
        .from('Booking')
        .select('*')
        .order('booking_date', { ascending: true });

      if (role === 'receptionist' && facilityId) {
        booksQuery = booksQuery.eq('facility_id', facilityId);
      }
      const { data: books } = await booksQuery;
      if (books) setBookings(books);

    } catch (e) {
      console.log('Error fetching admin data', e);
    }
    setLoadingData(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setAuthError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError('بيانات الدخول غير صحيحة. يرجى مراجعة البريد وكلمة المرور.');
    }
    setAuthSubmitting(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // إضافة منشأة طبية جديدة (للمدير العام فقط)
  const handleAddFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'admin') return;
    if (!newFacility.name || !newFacility.whatsapp_number) return;

    let clean = newFacility.whatsapp_number.replace(/[^0-9]/g, '');
    if (clean.startsWith('967')) clean = clean.slice(3);
    if (clean.startsWith('0')) clean = clean.slice(1);

    const { data, error } = await supabase
      .from('ClinicFacility')
      .insert([
        {
          name: newFacility.name,
          city: newFacility.city,
          district: newFacility.district,
          address: newFacility.address,
          whatsapp_number: clean,
          facility_type: newFacility.facility_type,
          is_active: true
        }
      ])
      .select();

    if (data && !error) {
      setFacilities([...facilities, data[0]]);
      setNewFacility({
        name: '',
        city: 'صنعاء',
        district: '',
        address: '',
        whatsapp_number: '',
        facility_type: 'hospital'
      });
      alert('تم اعتماد المنشأة الطبية بنجاح وإتاحتها على المنصة.');
    } else {
      alert('حدث خطأ أثناء حفظ المنشأة الطبية.');
    }
  };

  // إضافة طبيب جديد
  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoctor.name || !newDoctor.specialty) return;

    const targetFacId = userRole === 'receptionist' && userFacilityId ? userFacilityId : newDoctor.facility_id;
    const selectedFac = facilities.find(f => f.id === targetFacId);

    const { data, error } = await supabase
      .from('Doctor')
      .insert([
        {
          name: newDoctor.name,
          specialty: newDoctor.specialty,
          category: newDoctor.category,
          facility_id: targetFacId,
          consultation_fee: newDoctor.consultation_fee,
          city: selectedFac?.city || 'صنعاء',
          branch: selectedFac?.name || ''
        }
      ])
      .select();

    if (data && !error) {
      setDoctors([...doctors, data[0]]);
      setNewDoctor(prev => ({ ...prev, name: '', specialty: '', category: 'dental', consultation_fee: 20 }));
      alert('تمت إضافة الطبيب بنجاح إلى المنظومة.');
    } else {
      alert('حدث خطأ أثناء حفظ بيانات الطبيب.');
    }
  };

  const handleDeleteDoctor = async (id: string | number) => {
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذا الطبيب؟')) return;
    const { error } = await supabase.from('Doctor').delete().eq('id', id);
    if (!error) {
      setDoctors(doctors.filter(d => d.id !== id));
    }
  };

  const handleUpdateStatus = async (bookingId: string | number, newStatus: string) => {
    setUpdatingStatusId(bookingId);
    const { error } = await supabase
      .from('Booking')
      .update({ status: newStatus })
      .eq('id', bookingId);

    if (!error) {
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
    }
    setUpdatingStatusId(null);
  };

  const handleDeleteBooking = async (b: any) => {
    if (!confirm(`هل أنت متأكد من حذف موعد المريض "${b.patient_name}"؟`)) return;
    const { error } = await supabase.from('Booking').delete().eq('id', b.id);
    if (!error) {
      setBookings(prev => prev.filter(item => item.id !== b.id));
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking || !editDate || !editTime) return;

    setSavingEdit(true);
    const { error } = await supabase
      .from('Booking')
      .update({ booking_date: editDate, booking_time: editTime })
      .eq('id', editingBooking.id);

    if (!error) {
      setBookings(prev => prev.map(b => b.id === editingBooking.id ? { ...b, booking_date: editDate, booking_time: editTime } : b));
      setEditingBooking(null);
    }
    setSavingEdit(false);
  };

  const getFullImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('consultations').getPublicUrl(path);
    return data.publicUrl;
  };

  // تصفية وترتيب المواعيد
  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    if (userRole === 'admin' && selectedFacilityFilter !== 'all') {
      result = result.filter(b => b.facility_id === selectedFacilityFilter);
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
  }, [bookings, searchQuery, selectedFacilityFilter, userRole]);

  if (loadingAuth) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
      </main>
    );
  }

  // شاشة الدخول
  if (!user) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 w-full max-w-md p-8 rounded-3xl shadow-2xl text-center">
          <div className="w-16 h-16 bg-teal-500/10 text-teal-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-teal-500/20">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">بوابة الدخول الإدارية</h1>
          <p className="text-slate-400 text-xs sm:text-sm mb-6">إدارة المنصة الطبية المركزية وموظفي المنشآت</p>

          <form onSubmit={handleSignIn} className="space-y-4 text-right">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">البريد الإلكتروني</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="admin@platform.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3.5 pr-10 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm outline-none focus:border-teal-500 transition"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute right-3.5 top-4" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">كلمة المرور</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3.5 pr-10 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm outline-none focus:border-teal-500 transition"
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
              {authSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تسجيل الدخول'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  const isReceptionist = userRole === 'receptionist';
  const assignedFacility = facilities.find(f => f.id === userFacilityId);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* الترويسة الرئيسية */}
        <header className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-teal-600" />
              <h1 className="text-2xl font-black text-slate-900">
                {isReceptionist 
                  ? `بوابة استقبال: ${assignedFacility ? assignedFacility.name : 'المنشأة الطبية'}`
                  : 'لوحة التحكم المركزية للمنصة الوسيطة'
                }
              </h1>
            </div>
            <p className="text-slate-500 text-xs mt-1 flex items-center gap-2">
              <span>المستخدم: <strong className="text-slate-700">{user.email}</strong></span>
              <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                isReceptionist ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800'
              }`}>
                {isReceptionist ? 'موظف استقبال منشأة' : 'المدير العام للمنصة (Super Admin)'}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 flex-grow sm:flex-grow-0">
              <button
                onClick={() => setActiveTab('bookings')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'bookings' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                جدول المواعيد ({bookings.length})
              </button>

              {!isReceptionist && (
                <button
                  onClick={() => setActiveTab('facilities')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    activeTab === 'facilities' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  المنشآت والمستشفيات ({facilities.length})
                </button>
              )}

              <button
                onClick={() => setActiveTab('doctors')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'doctors' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                الأطباء ({doctors.length})
              </button>
            </div>

            <button
              onClick={handleSignOut}
              className="p-2.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition border border-slate-200"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 1. جدول المواعيد وإدارتها */}
        {activeTab === 'bookings' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-600" />
                  {isReceptionist ? 'مواعيد المرضى الواردة لمنشأتكم' : 'جميع حجوزات المنصة الطبية'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">مرتبة بحسب أولوية التاريخ والوقت</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* فلتر المنشآت الطبية للمدير العام */}
                {!isReceptionist && (
                  <select
                    value={selectedFacilityFilter}
                    onChange={(e) => setSelectedFacilityFilter(e.target.value)}
                    className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 outline-none"
                  >
                    <option value="all">كل المنشآت الطبية</option>
                    {facilities.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                )}

                <div className="relative flex-grow sm:w-60">
                  <input
                    type="text"
                    placeholder="ابحث بالاسم، الهاتف، الطبيب..."
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
                <p className="text-slate-500 text-sm">لا توجد حجوزات تطابق البحث حالياً.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-3">المريض</th>
                      <th className="p-3">الهاتف</th>
                      {!isReceptionist && <th className="p-3">المنشأة الطبية</th>}
                      <th className="p-3">الطبيب المطلوب</th>
                      <th className="p-3">الموعد والتوقيت</th>
                      {!isReceptionist && <th className="p-3">الصور السريرية</th>}
                      <th className="p-3">حالة الحجز</th>
                      <th className="p-3">إجراءات</th>
                      <th className="p-3">تواصل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBookings.map((b) => {
                      let cleanPhone = (b.patient_phone || '').replace(/[^0-9]/g, '');
                      if (cleanPhone.startsWith('967')) cleanPhone = cleanPhone.slice(3);
                      if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.slice(1);
                      const finalPatientNumber = '967' + cleanPhone;

                      const currentStatus = b.status || 'pending';
                      const hasPhotos = b.media_keys && Array.isArray(b.media_keys) && b.media_keys.length > 0;
                      const canDelete = currentStatus === 'cancelled' || currentStatus === 'completed' || currentStatus === 'pending';

                      const replyMsg = encodeURIComponent(
                        `مرحباً بك أستاذ/ة ${b.patient_name || ''}،\n` +
                        `نؤكد استلام وتأكيد موعدك عبر المنصة الطبية:\n` +
                        `* المنشأة: ${b.facility_name || b.branch_name}\n` +
                        `* الطبيب: ${b.doctor_name}\n` +
                        `* الموعد: ${b.booking_date} الساعة ${b.booking_time}\n\n` +
                        `نتمنى لك دوام الصحة والعافية!`
                      );
                      const waLink = `https://api.whatsapp.com/send?phone=${finalPatientNumber}&text=${replyMsg}`;

                      return (
                        <tr key={b.id} className="hover:bg-slate-50/80">
                          <td className="p-3 font-bold text-slate-900">{b.patient_name}</td>
                          <td className="p-3 text-slate-600 font-mono">+967 {cleanPhone}</td>
                          {!isReceptionist && (
                            <td className="p-3 text-slate-700 font-medium">
                              <span className="block">{b.facility_name || b.branch_name}</span>
                              <span className="text-[10px] text-slate-400">{b.branch_city}</span>
                            </td>
                          )}
                          <td className="p-3 text-teal-700 font-bold">{b.doctor_name}</td>
                          <td className="p-3 text-slate-800 font-mono font-medium whitespace-nowrap">
                            <div className="font-bold">{b.booking_date}</div>
                            <span className="text-xs text-slate-500 font-sans">{b.booking_time}</span>
                          </td>

                          {!isReceptionist && (
                            <td className="p-3">
                              {hasPhotos ? (
                                <button
                                  onClick={() => setPreviewImages(b.media_keys.map((k: string) => getFullImageUrl(k)))}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white rounded-lg border border-teal-200 text-xs font-bold transition shadow-sm"
                                >
                                  <ImageIcon className="w-3.5 h-3.5" />
                                  عرض ({b.media_keys.length})
                                </button>
                              ) : (
                                <span className="text-slate-400 text-xs">لا توجد صور</span>
                              )}
                            </td>
                          )}

                          <td className="p-3">
                            {updatingStatusId === b.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                            ) : (
                              <select
                                value={currentStatus}
                                onChange={(e) => handleUpdateStatus(b.id, e.target.value)}
                                className={`text-xs font-bold px-2 py-1.5 rounded-lg border outline-none cursor-pointer ${
                                  currentStatus === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                                  currentStatus === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                                  currentStatus === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-300' :
                                  'bg-amber-50 text-amber-700 border-amber-300'
                                }`}
                              >
                                <option value="pending">⏳ قيد الانتظار</option>
                                <option value="confirmed">✅ مؤكد</option>
                                <option value="completed">🩺 تم الكشف</option>
                                <option value="cancelled">❌ ملغي</option>
                              </select>
                            )}
                          </td>

                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingBooking(b);
                                  setEditDate(b.booking_date || '');
                                  setEditTime(b.booking_time || availableTimes[0]);
                                }}
                                className="p-1.5 text-teal-700 hover:bg-teal-50 border border-teal-200 rounded-lg"
                                title="تعديل الموعد"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {canDelete && (
                                <button
                                  onClick={() => handleDeleteBooking(b)}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg"
                                  title="حذف الموعد"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="p-3">
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg border border-emerald-200 text-xs font-bold transition shadow-sm whitespace-nowrap"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              واتساب
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

        {/* 2. تبويب المنشآت والمستشفيات (للمدير العام فقط) */}
        {!isReceptionist && activeTab === 'facilities' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                <Plus className="w-5 h-5 text-teal-600" /> إضافة منشأة طبية جديدة
              </h2>
              <form onSubmit={handleAddFacility} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم المستشفى / المركز</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: مستشفى آزال النموذجي"
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
                      placeholder="مثال: حدة"
                      value={newFacility.district}
                      onChange={(e) => setNewFacility({ ...newFacility, district: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم واتساب الاستقبال الرسمي</label>
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
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm transition mt-2 flex items-center justify-center gap-1.5 shadow-md shadow-teal-600/20"
                >
                  <Plus className="w-4 h-4" /> حفظ واعتماد المنشأة
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-600" /> المنشآت الطبية المعتمدة في المنصة ({facilities.length})
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {facilities.map((fac) => (
                  <div key={fac.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                          {fac.city} - {fac.district || 'الرئيسي'}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          +967 {fac.whatsapp_number}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-base">{fac.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> {fac.address || 'العنوان متاح على الخريطة'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                      <span>الأطباء المسجلون: {doctors.filter(d => d.facility_id === fac.id).length}</span>
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">نشطة بالمنصة</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. تبويب الأطباء */}
        {activeTab === 'doctors' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                <Plus className="w-5 h-5 text-teal-600" /> إضافة طبيب جديد
              </h2>
              <form onSubmit={handleAddDoctor} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الطبيب</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: د. مروان القدسي"
                    value={newDoctor.name}
                    onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">التخصص الدقيق</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: استشاري زراعة وتجميل الأسنان"
                    value={newDoctor.specialty}
                    onChange={(e) => setNewDoctor({ ...newDoctor, specialty: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">القسم الطبي</label>
                  <select
                    value={newDoctor.category}
                    onChange={(e) => setNewDoctor({ ...newDoctor, category: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-white outline-none"
                  >
                    <option value="dental">طب الأسنان</option>
                    <option value="derma">الجلدية والتجميل</option>
                    <option value="general">الباطنية والقلب</option>
                    <option value="eyes">طب العيون</option>
                  </select>
                </div>

                {!isReceptionist && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">المنشأة الطبية التابع لها</label>
                    <select
                      value={newDoctor.facility_id}
                      onChange={(e) => setNewDoctor({ ...newDoctor, facility_id: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-white outline-none"
                    >
                      {facilities.map(f => (
                        <option key={f.id} value={f.id}>{f.name} ({f.city})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate
