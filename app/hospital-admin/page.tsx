'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Building2, Calendar, Phone, Plus, Trash2, 
  Search, Shield, Lock, Stethoscope, Clock, AlertCircle, 
  Loader2, LogOut, Mail, Settings, CheckCircle2, Edit3, Check
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

export default function HospitalAdminPortal() {
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // تسجيل الدخول
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // التبويب النشط
  const [activeTab, setActiveTab] = useState<'bookings' | 'doctors' | 'info'>('bookings');

  // بيانات المنشأة الطبية
  const [facility, setFacility] = useState<Facility | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // شريط البحث
  const [searchQuery, setSearchQuery] = useState('');

  // نموذج إضافة طبيب جديد
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    specialty: '',
    category: 'dental',
    consultation_fee: 20
  });

  // نموذج تعديل بيانات المنشأة
  const [facPhone, setFacPhone] = useState('');
  const [facAddress, setFacAddress] = useState('');
  const [savingFac, setSavingFac] = useState(false);
  const [facSuccess, setFacSuccess] = useState(false);

  // نافذة تعديل الموعد
  const [editingBooking, setEditingBooking] = useState<any | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const availableTimes = [
    '09:30 صباحاً', '10:30 صباحاً', '11:30 صباحاً',
    '04:30 عصراً', '05:30 مساءً', '06:30 مساءً', '07:30 مساءً'
  ];

  const loadFacilityData = async (currentUser: any) => {
    setLoadingData(true);
    try {
      let facId = currentUser.user_metadata?.facility_id;

      if (!facId) {
        const { data: firstFac } = await supabase
          .from('ClinicFacility')
          .select('*')
          .limit(1)
          .single();
        if (firstFac) facId = firstFac.id;
      }

      if (facId) {
        const { data: facData } = await supabase
          .from('ClinicFacility')
          .select('*')
          .eq('id', facId)
          .single();

        if (facData) {
          setFacility(facData);
          setFacPhone(facData.whatsapp_number || '');
          setFacAddress(facData.address || '');
        }

        const { data: docsData } = await supabase
          .from('Doctor')
          .select('*')
          .eq('facility_id', facId);

        if (docsData) setDoctors(docsData);

        const { data: booksData } = await supabase
          .from('Booking')
          .select('*')
          .eq('facility_id', facId)
          .order('booking_date', { ascending: true });

        if (booksData) setBookings(booksData);
      }
    } catch (e) {
      console.log('Error loading hospital admin data', e);
    }
    setLoadingData(false);
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoadingAuth(false);
      if (currentUser) {
        loadFacilityData(currentUser);
      }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        loadFacilityData(currentUser);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setAuthError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError('بيانات الدخول غير صحيحة. يرجى التأكد من البريد وكلمة المرور.');
    }
    setAuthSubmitting(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setFacility(null);
  };

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facility || !newDoctor.name || !newDoctor.specialty) return;

    const { data, error } = await supabase
      .from('Doctor')
      .insert([
        {
          name: newDoctor.name,
          specialty: newDoctor.specialty,
          category: newDoctor.category,
          facility_id: facility.id,
          consultation_fee: newDoctor.consultation_fee,
          city: facility.city,
          branch: facility.name
        }
      ])
      .select();

    if (data && !error) {
      setDoctors(prev => [...prev, data[0]]);
      setNewDoctor({ name: '', specialty: '', category: 'dental', consultation_fee: 20 });
      alert('تمت إضافة الطبيب بنجاح إلى كادر المنشأة.');
    } else {
      alert('حدث خطأ أثناء حفظ بيانات الطبيب.');
    }
  };

  const handleDeleteDoctor = async (id: string | number) => {
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذا الطبيب من كادر المنشأة؟')) return;
    const { error } = await supabase.from('Doctor').delete().eq('id', id);
    if (!error) {
      setDoctors(prev => prev.filter(d => d.id !== id));
    }
  };

  const handleUpdateStatus = async (bookingId: string | number, newStatus: string) => {
    const { error } = await supabase
      .from('Booking')
      .update({ status: newStatus })
      .eq('id', bookingId);

    if (!error) {
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
    }
  };

  const handleSaveFacilityInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facility) return;
    setSavingFac(true);

    let clean = facPhone.replace(/[^0-9]/g, '');
    if (clean.startsWith('967')) clean = clean.slice(3);
    if (clean.startsWith('0')) clean = clean.slice(1);

    const { error } = await supabase
      .from('ClinicFacility')
      .update({
        whatsapp_number: clean,
        address: facAddress
      })
      .eq('id', facility.id);

    if (!error) {
      setFacility({ ...facility, whatsapp_number: clean, address: facAddress });
      setFacSuccess(true);
      setTimeout(() => setFacSuccess(false), 3000);
    } else {
      alert('حدث خطأ أثناء تحديث بيانات المنشأة.');
    }
    setSavingFac(false);
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

  const filteredBookings = useMemo(() => {
    let result = [...bookings];
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(b => 
        (b.patient_name || '').toLowerCase().includes(q) || 
        (b.patient_phone || '').includes(q)
      );
    }
    return result;
  }, [bookings, searchQuery]);

  if (loadingAuth) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 w-full max-w-md p-8 rounded-3xl shadow-2xl text-center">
          <div className="w-16 h-16 bg-teal-500/10 text-teal-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-teal-500/20">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">بوابة إدارة المستشفى والمنشأة</h1>
          <p className="text-slate-400 text-xs sm:text-sm mb-6">تسجيل الدخول للمدير العام ومسؤولي العيادات</p>

          <form onSubmit={handleSignIn} className="space-y-4 text-right">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">البريد الإلكتروني للمنشأة</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="hospital@clinic.com"
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
              {authSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'دخول لوحة إدارة المنشأة'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ترويسة إدارة المستشفى */}
        <header className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-center text-teal-700">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900">
                  {facility ? facility.name : 'لوحة إدارة المنشأة الطبية'}
                </h1>
                <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full">
                  {facility?.city || 'اليمن'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                المدير العام للمنشأة: <strong className="text-slate-700">{user.email}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 flex-grow sm:flex-grow-0">
              <button
                onClick={() => setActiveTab('bookings')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'bookings' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                مواعيد المنشأة ({bookings.length})
              </button>
              <button
                onClick={() => setActiveTab('doctors')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'doctors' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                الأطباء ({doctors.length})
              </button>
              <button
                onClick={() => setActiveTab('info')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'info' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                بيانات الاستقبال
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

        {/* 1. جدول مواعيد المستشفى فقط */}
        {activeTab === 'bookings' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-600" /> كشف حجوزات المرضى الواردة لمنشأتكم
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">الحجوزات المحولة لمنشأتكم عبر المنصة الوسيطة</p>
              </div>

              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="بحث باسم المريض أو الهاتف..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs outline-none focus:border-teal-500 bg-slate-50"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            {loadingData ? (
              <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin text-teal-600 mx-auto" /></div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-slate-500 text-sm">لا توجد حجوزات مسجلة لهذه المنشأة حالياً.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-3">المريض</th>
                      <th className="p-3">الهاتف</th>
                      <th className="p-3">الطبيب المطلوب</th>
                      <th className="p-3">الموعد والتوقيت</th>
                      <th className="p-3">حالة الحجز</th>
                      <th className="p-3">تعديل</th>
                      <th className="p-3">واتساب المريض</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBookings.map((b) => {
                      let cleanPhone = (b.patient_phone || '').replace(/[^0-9]/g, '');
                      if (cleanPhone.startsWith('967')) cleanPhone = cleanPhone.slice(3);
                      if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.slice(1);
                      const finalPatientNumber = '967' + cleanPhone;

                      const replyMsg = encodeURIComponent(
                        `مرحباً بك أستاذ/ة ${b.patient_name || ''}،\n` +
                        `نؤكد لك استلام وتثبيت موعدك لدى ${facility?.name || 'المنشأة'}:\n` +
                        `* الطبيب: ${b.doctor_name}\n` +
                        `* الموعد: ${b.booking_date} الساعة ${b.booking_time}\n\n` +
                        `أهلاً وسهلاً بك!`
                      );
                      const waLink = `https://api.whatsapp.com/send?phone=${finalPatientNumber}&text=${replyMsg}`;

                      return (
                        <tr key={b.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">{b.patient_name}</td>
                          <td className="p-3 font-mono text-slate-600">+967 {cleanPhone}</td>
                          <td className="p-3 text-teal-700 font-bold">{b.doctor_name}</td>
                          <td className="p-3 font-medium text-slate-800">
                            <div>{b.booking_date}</div>
                            <span className="text-xs text-slate-500">{b.booking_time}</span>
                          </td>
                          <td className="p-3">
                            <select
                              value={b.status || 'pending'}
                              onChange={(e) => handleUpdateStatus(b.id, e.target.value)}
                              className="text-xs font-bold px-2 py-1 rounded-lg border outline-none cursor-pointer bg-white"
                            >
                              <option value="pending">⏳ قيد الانتظار</option>
                              <option value="confirmed">✅ مؤكد</option>
                              <option value="completed">🩺 تم الكشف</option>
                              <option value="cancelled">❌ معتذر/ملغي</option>
                            </select>
                          </td>
                          <td className="p-3">
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
                          </td>
                          <td className="p-3">
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg border border-emerald-200 text-xs font-bold transition"
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

        {/* 2. إدارة كادر أطباء المستشفى */}
        {activeTab === 'doctors' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                <Plus className="w-5 h-5 text-teal-600" /> إضافة طبيب للمنشأة
              </h2>
              <form onSubmit={handleAddDoctor} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الطبيب</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: د. أنيس المقطري"
                    value={newDoctor.name}
                    onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">التخصص والوصف</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: استشاري أمراض القلب والقسطرة"
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
                    <option value="eyes">العيون</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رسوم الكشف التقديرية ($)</label>
                  <input
                    type="number"
                    min="1"
                    value={newDoctor.consultation_fee}
                    onChange={(e) => setNewDoctor({ ...newDoctor, consultation_fee: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm transition mt-2 flex items-center justify-center gap-1.5 shadow-md shadow-teal-600/20"
                >
                  <Plus className="w-4 h-4" /> حفظ وإدراج الطبيب بالمنصة
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-teal-600" /> كادر الأطباء التابع لمنشأتكم ({doctors.length})
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {doctors.map((doc) => (
                  <div key={doc.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md">
                          كشف: ${doc.consultation_fee || 20}
                        </span>
                        <button
                          onClick={() => handleDeleteDoctor(doc.id)}
                          className="text-slate-400 hover:text-rose-600 transition"
                          title="حذف الطبيب"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <h3 className="font-bold text-slate-900 text-base">{doc.name}</h3>
                      <p className="text-xs text-slate-500 mt-1">{doc.specialty}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-teal-700 font-medium">
                      متاح للحجز عبر التطبيق
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. إعدادات بيانات الاستقبال ورقم الواتساب */}
        {activeTab === 'info' && facility && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm max-w-lg mx-auto space-y-5">
            <div className="border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-teal-600" /> إعدادات استقبال المواعيد
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">تحديث رقم الواتساب الذي يستقبل رسائل تذاكر الحجز من المرضى</p>
            </div>

            <form onSubmit={handleSaveFacilityInfo} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المنشأة المسجل</label>
                <input
                  type="text"
                  disabled
                  value={facility.name}
                  className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم واتساب الاستقبال لاستلام الحجوزات</label>
                <div className="relative flex items-center" dir="ltr">
                  <span className="bg-slate-100 border border-r-0 border-slate-300 rounded-l-xl px-3 py-3 text-xs font-bold text-slate-600">
                    🇾🇪 +967
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="77xxxxxxx"
                    value={facPhone}
                    onChange={(e) => setFacPhone(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-r-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 font-mono text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عنوان وتفاصيل موقع المستشفى</label>
                <textarea
                  rows={2}
                  value={facAddress}
                  onChange={(e) => setFacAddress(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {facSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> تم تحديث بيانات الاستقبال بنجاح!
                </div>
              )}

              <button
                type="submit"
                disabled={savingFac}
                className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2"
              >
                {savingFac ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ التحديثات'}
              </button>
            </form>
          </div>
        )}

      </div>

      {/* نافذة تعديل الموعد */}
      {editingBooking && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-base">إعادة جدولة موعد المريض</h3>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">التاريخ الجديد</label>
                <input
                  type="date"
                  required
                  value={editDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الوقت الجديد</label>
                <select
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white"
                >
                  {availableTimes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold"
                >
                  {savingEdit ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'تأكيد التعديل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
