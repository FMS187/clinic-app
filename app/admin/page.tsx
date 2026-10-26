'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Plus, Trash2, Calendar, Phone, 
  MapPin, Shield, Lock, Stethoscope, 
  Clock, AlertCircle, Loader2, LogOut, Mail
} from 'lucide-react';

interface Doctor {
  id: string | number;
  name: string;
  specialty: string;
  category: 'dental' | 'derma';
  branch: string;
  phone?: string;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // حقول تسجيل الدخول بالإيميل
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // تبويبات لوحة التحكم
  const [activeTab, setActiveTab] = useState<'doctors' | 'bookings'>('doctors');

  // بيانات الأطباء والحجوزات
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // نموذج إضافة طبيب
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    specialty: '',
    category: 'dental' as 'dental' | 'derma',
    branch: 'صنعاء - فرع حدة',
    phone: ''
  });

  // فحص الجلسة عند التحميل
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
    }
  }, [user]);

  // تسجيل الدخول بالإيميل وكلمة المرور
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setAuthError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError(error.message === 'Invalid login credentials' 
        ? 'بيانات الدخول غير صحيحة. تحقق من الإيميل وكلمة المرور.' 
        : error.message);
    }
    setAuthSubmitting(false);
  };

  // تسجيل الدخول بحساب Google
  const handleGoogleSignIn = async () => {
    setAuthSubmitting(true);
    setAuthError('');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/admin`
      }
    });

    if (error) {
      setAuthError(error.message);
      setAuthSubmitting(false);
    }
  };

  // تسجيل الخروج
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // جلب الأطباء
  const fetchDoctors = async () => {
    setLoadingDoctors(true);
    const { data, error } = await supabase
      .from('Doctor')
      .select('*')
      .order('id', { ascending: false });

    if (data && !error) setDoctors(data);
    setLoadingDoctors(false);
  };

  // جلب الحجوزات
  const fetchBookings = async () => {
    setLoadingBookings(true);
    const { data, error } = await supabase
      .from('Booking')
      .select('*')
      .order('id', { ascending: false });

    if (data && !error) setBookings(data);
    setLoadingBookings(false);
  };

  // حفظ طبيب جديد
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
        branch: 'صنعاء - فرع حدة',
        phone: ''
      });
      alert('تم حفظ بيانات الطبيب بنجاح');
    } else {
      alert('تعذر حفظ البيانات، تحقق من صلاحيات Supabase');
    }
  };

  // حذف طبيب
  const handleDeleteDoctor = async (id: string | number) => {
    if (!confirm('هل تريد حذف هذا الطبيب؟')) return;
    const { error } = await supabase.from('Doctor').delete().eq('id', id);
    if (!error) {
      setDoctors(doctors.filter(d => d.id !== id));
    }
  };

  // شاشة التحميل الأولية
  if (loadingAuth) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
      </main>
    );
  }

  // شاشة تسجيل الدخول الموحدة (Google + الإيميل)
  if (!user) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 w-full max-w-md p-8 rounded-3xl shadow-2xl text-center">
          <div className="w-16 h-16 bg-teal-500/10 text-teal-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-teal-500/20">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">بوابة دخول إدارة العيادات</h1>
          <p className="text-slate-400 text-xs sm:text-sm mb-6">سجل الدخول لإدارة الفروع، الأطباء، ومتابعة الحجوزات</p>

          {/* زر Google المباشر */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={authSubmitting}
            className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 text-slate-800 rounded-xl font-bold text-sm transition flex items-center justify-center gap-3 shadow-md mb-4"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            المتابعة باستخدام Google
          </button>

          <div className="flex items-center my-4">
            <div className="flex-grow border-t border-slate-700"></div>
            <span className="px-3 text-slate-500 text-xs">أو عبر البريد الإلكتروني</span>
            <div className="flex-grow border-t border-slate-700"></div>
          </div>

          <form onSubmit={handleEmailSignIn} className="space-y-3.5 text-right">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">البريد الإلكتروني</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="admin@clinic.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 pr-10 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm outline-none focus:border-teal-500"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute right-3 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">كلمة المرور</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 pr-10 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm outline-none focus:border-teal-500"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-3.5" />
              </div>
            </div>

            {authError && (
              <p className="text-rose-400 text-xs mt-2 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full py-3.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-sm transition mt-2 flex items-center justify-center gap-2 shadow-lg shadow-teal-600/30"
            >
              {authSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تسجيل الدخول'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // الواجهة الإدارية الكاملة بعد المصادقة
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
              مرحباً بك ({user.email}) | تم التحقق من الصلاحيات
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

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">القسم</label>
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
                    <label className="block text-xs font-bold text-slate-700 mb-1">الهاتف</label>
                    <input
                      type="tel"
                      placeholder="77xxxxxxx"
                      value={newDoctor.phone}
                      onChange={(e) => setNewDoctor({ ...newDoctor, phone: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none"
                    />
                  </div>
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

                      <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> {doc.branch}
                        </div>
                        {doc.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400" /> {doc.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

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
                      <th className="p-3">طريقة السداد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bookings.map((b, i) => (
                      <tr key={i} className="hover:bg-slate-50/80">
                        <td className="p-3 font-bold text-slate-900">{b.patient_name || 'غير محدد'}</td>
                        <td className="p-3 text-slate-600 font-mono">{b.patient_phone || '-'}</td>
                        <td className="p-3 text-teal-700 font-medium">{b.service_name || '-'}</td>
                        <td className="p-3 text-slate-800">{b.doctor_name || '-'}</td>
                        <td className="p-3 text-slate-600">{b.branch_name || '-'}</td>
                        <td className="p-3 text-slate-800 font-mono font-medium">{b.booking_date} {b.booking_time}</td>
                        <td className="p-3 text-slate-600 text-xs">{b.payment_method === 'PAY_ONLINE' ? 'إلكتروني' : 'عند الحضور'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}
