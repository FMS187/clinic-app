'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Plus, Trash2, Calendar, Phone, 
  MapPin, Shield, Lock, Stethoscope, 
  Clock, AlertCircle, Loader2, LogOut, Mail, Settings, CheckCircle2
} from 'lucide-react';

interface Doctor {
  id: string | number;
  name: string;
  specialty: string;
  category: 'dental' | 'derma';
  branch: string;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<'doctors' | 'bookings' | 'settings'>('doctors');

  // بيانات الأطباء والحجوزات
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // إعدادات العيادة (رقم الواتساب)
  const [clinicPhone, setClinicPhone] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // نموذج إضافة طبيب (تمت إزالة خانة الهاتف)
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    specialty: '',
    category: 'dental' as 'dental' | 'derma',
    branch: 'صنعاء - فرع حدة'
  });

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoadingAuth(false);
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchDoctors();
        fetchBookings();
        fetchClinicSettings();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchDoctors();
      fetchBookings();
      fetchClinicSettings();
    }
  }, [user]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setAuthError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError(
        error.message === 'Invalid login credentials' 
          ? 'بيانات الدخول غير صحيحة. يرجى التأكد من البريد الإلكتروني وكلمة المرور.' 
          : error.message
      );
    }
    setAuthSubmitting(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const fetchClinicSettings = async () => {
    const { data } = await supabase
      .from('ClinicSettings')
      .select('clinic_phone')
      .eq('id', 1)
      .single();

    if (data?.clinic_phone) {
      setClinicPhone(data.clinic_phone);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSuccess(false);

    // تنظيف الرقم من أي رموز زائدة
    const cleaned = clinicPhone.replace(/[^0-9]/g, '');

    const { error } = await supabase
      .from('ClinicSettings')
      .upsert({ id: 1, clinic_phone: cleaned });

    if (!error) {
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } else {
      alert('حدث خطأ أثناء حفظ الرقم');
    }
    setSavingSettings(false);
  };

  const fetchDoctors = async () => {
    setLoadingDoctors(true);
    const { data, error } = await supabase
      .from('Doctor')
      .select('*')
      .order('id', { ascending: false });

    if (data && !error) setDoctors(data);
    setLoadingDoctors(false);
  };

  const fetchBookings = async () => {
    setLoadingBookings(true);
    const { data, error } = await supabase
      .from('Booking')
      .select('*')
      .order('id', { ascending: false });

    if (data && !error) setBookings(data);
    setLoadingBookings(false);
  };

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoctor.name || !newDoctor.specialty) return;

    const { data, error } = await supabase
      .from('Doctor')
      .insert([newDoctor])
      .select();

    if (data && !error) {
      setDoctors([data[0], ...doctors]);
      setNewDoctor({
        name: '',
        specialty: '',
        category: 'dental',
        branch: 'صنعاء - فرع حدة'
      });
      alert('تم حفظ بيانات الطبيب بنجاح');
    } else {
      alert('تعذر حفظ البيانات، يرجى التحقق من الاتصال');
    }
  };

  const handleDeleteDoctor = async (id: string | number) => {
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذا الطبيب؟')) return;
    const { error } = await supabase.from('Doctor').delete().eq('id', id);
    if (!error) {
      setDoctors(doctors.filter(d => d.id !== id));
    }
  };

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
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">بوابة دخول إدارة العيادات</h1>
          <p className="text-slate-400 text-xs sm:text-sm mb-6">سجل الدخول لإدارة الكادر الطبي ومتابعة الحجوزات</p>

          <form onSubmit={handleEmailSignIn} className="space-y-4 text-right">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">البريد الإلكتروني للعيادة</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="admin@clinic.com"
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
              {authSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تسجيل الدخول للنظام'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <header className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-teal-600" />
              <h1 className="text-2xl font-bold text-slate-900">لوحة تحكم العيادات</h1>
            </div>
            <p className="text-slate-500 text-xs mt-1">
              المسؤول الحالي: <span className="font-semibold text-slate-700">{user.email}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 flex-grow sm:flex-grow-0">
              <button
                onClick={() => { setActiveTab('doctors'); fetchDoctors(); }}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-bold text-xs transition ${
                  activeTab === 'doctors' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                الأطباء ({doctors.length})
              </button>
              <button
                onClick={() => { setActiveTab('bookings'); fetchBookings(); }}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-bold text-xs transition ${
                  activeTab === 'bookings' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                المواعيد ({bookings.length})
              </button>
              <button
                onClick={() => { setActiveTab('settings'); fetchClinicSettings(); }}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1 ${
                  activeTab === 'settings' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                <Settings className="w-3.5 h-3.5" /> إعدادات العيادة
              </button>
            </div>

            <button
              onClick={handleSignOut}
              className="p-2.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition border border-slate-200"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 1. تبويب إدارة الأطباء والتخصصات */}
        {activeTab === 'doctors' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Plus className="w-5 h-5 text-teal-600" /> إضافة طبيب جديد
              </h2>
              <form onSubmit={handleAddDoctor} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الطبيب</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: د. ماجد الشميري"
                    value={newDoctor.name}
                    onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">التخصص والوصف</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: أخصائي زراعة أسنان وتصميم ابتسامة"
                    value={newDoctor.specialty}
                    onChange={(e) => setNewDoctor({ ...newDoctor, specialty: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">القسم الطبي</label>
                  <select
                    value={newDoctor.category}
                    onChange={(e) => setNewDoctor({ ...newDoctor, category: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-white outline-none"
                  >
                    <option value="dental">طب الأسنان</option>
                    <option value="derma">الجلدية والتجميل</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">فرع العيادة</label>
                  <select
                    value={newDoctor.branch}
                    onChange={(e) => setNewDoctor({ ...newDoctor, branch: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-white outline-none"
                  >
                    <option value="صنعاء - فرع حدة">صنعاء - فرع حدة</option>
                    <option value="صنعاء - الستين والسبعين">صنعاء - الستين والسبعين</option>
                    <option value="عدن - خور مكسر">عدن - خور مكسر</option>
                    <option value="عدن - المنصورة">عدن - المنصورة</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm transition mt-2 flex items-center justify-center gap-1.5 shadow-md shadow-teal-600/20"
                >
                  <Plus className="w-4 h-4" /> حفظ بيانات الطبيب
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-teal-600" /> قائمة الأطباء المعتمدة
                </span>
                <button onClick={fetchDoctors} className="text-xs text-teal-700 bg-teal-50 px-3 py-1 rounded-lg border border-teal-200">
                  تحديث
                </button>
              </h2>

              {loadingDoctors ? (
                <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin text-teal-600 mx-auto" /></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {doctors.map((doc) => (
                    <div key={doc.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                            doc.category === 'dental' ? 'bg-teal-50 text-teal-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {doc.category === 'dental' ? 'طب الأسنان' : 'الجلدية والتجميل'}
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
                        <p className="text-xs text-slate-600 mt-1 font-medium">{doc.specialty}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> {doc.branch}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. تبويب جدول المواعيد والحجوزات */}
        {activeTab === 'bookings' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-600" /> المواعيد المسجلة في النظام
              </h2>
              <button 
                onClick={fetchBookings}
                className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200 hover:bg-teal-100 transition"
              >
                تحديث الجدول
              </button>
            </div>

            {loadingBookings ? (
              <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin text-teal-600 mx-auto" /></div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-slate-500 text-sm">لا توجد حجوزات مسجلة بعد.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-3">المريض</th>
                      <th className="p-3">رقم الهاتف</th>
                      <th className="p-3">الخدمة</th>
                      <th className="p-3">الطبيب</th>
                      <th className="p-3">الفرع</th>
                      <th className="p-3">الموعد</th>
                      <th className="p-3">تواصل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bookings.map((b, i) => {
                      let cleanPhone = (b.patient_phone || '').replace(/[^0-9]/g, '');
                      if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
                      if (!cleanPhone.startsWith('967') && cleanPhone.length === 9) {
                        cleanPhone = '967' + cleanPhone;
                      }

                      const adminReplyMessage = encodeURIComponent(
                        `مرحباً بك أستاذ/ة ${b.patient_name || ''}،\n` +
                        `نؤكد لك استلام حجزك في عياداتنا:\n` +
                        `🏥 الفرع: ${b.branch_name}\n` +
                        `🩺 الخدمة: ${b.service_name}\n` +
                        `👨‍⚕️ الطبيب: ${b.doctor_name}\n` +
                        `📅 الموعد: ${b.booking_date} الساعة ${b.booking_time}\n\n` +
                        `يرجى تأكيد الحضور قبل الموعد بنصف ساعة.`
                      );

                      const patientWaLink = `https://wa.me/${cleanPhone}?text=${adminReplyMessage}`;

                      return (
                        <tr key={i} className="hover:bg-slate-50/80">
                          <td className="p-3 font-bold text-slate-900">{b.patient_name || 'غير محدد'}</td>
                          <td className="p-3 text-slate-600 font-mono">
                            <span className="text-slate-400 text-[11px] ltr inline-block mr-1">+967</span>
                            {b.patient_phone || '-'}
                          </td>
                          <td className="p-3 text-teal-700 font-medium">{b.service_name || '-'}</td>
                          <td className="p-3 text-slate-800">{b.doctor_name || '-'}</td>
                          <td className="p-3 text-slate-600">{b.branch_name || '-'}</td>
                          <td className="p-3 text-slate-800 font-mono font-medium">{b.booking_date} {b.booking_time}</td>
                          <td className="p-3">
                            <a
                              href={patientWaLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg border border-emerald-200 text-xs font-bold transition shadow-sm"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              واتساب المريض
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

        {/* 3. تبويب إعدادات العيادة (رقم الواتساب الرسمي المعتمد) */}
        {activeTab === 'settings' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-xl mx-auto space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-teal-600" /> إعدادات وتواصل العيادة
              </h2>
              <p className="text-slate-500 text-xs mt-1">تحديد رقم الواتساب الرسمي الذي ستصل إليه رسائل الحجز من جميع المرضى</p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">رقم واتساب العيادة المعتمد</label>
                <div className="relative flex items-center">
                  <div className="bg-slate-100 border border-l-0 border-slate-300 rounded-r-xl px-3 py-3 text-sm text-slate-600 font-bold flex items-center gap-1" dir="ltr">
                    <span>🇾🇪 +967</span>
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="77xxxxxxx"
                    value={clinicPhone}
                    onChange={(e) => setClinicPhone(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-l-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">أدخل الرقم بدون الصفر الأول (مثال: 771234567)</p>
              </div>

              {settingsSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> تم تحديث رقم العيادة بنجاح!
                </div>
              )}

              <button
                type="submit"
                disabled={savingSettings}
                className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-md shadow-teal-600/20"
              >
                {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ الرقم المعتمد للعيادة'}
              </button>
            </form>
          </div>
        )}

      </div>
    </main>
  );
}
