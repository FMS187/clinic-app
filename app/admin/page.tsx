'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  UserCheck, Plus, Trash2, Calendar, Phone, 
  MapPin, Shield, Search, Lock, Stethoscope, 
  CheckCircle, Clock, AlertCircle
} from 'lucide-react';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  category: 'dental' | 'derma';
  branch: string;
  phone?: string;
}

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  // تبويبات لوحة التحكم
  const [activeTab, setActiveTab] = useState<'doctors' | 'bookings'>('doctors');

  // بيانات الأطباء (بيانات أولية مع إمكانية الإضافة والحذف)
  const [doctors, setDoctors] = useState<Doctor[]>([
    { id: '1', name: 'د. سامي المقطري', specialty: 'جراحة وتجميل الفم والأسنان', category: 'dental', branch: 'صنعاء - فرع حدة', phone: '771000001' },
    { id: '2', name: 'د. مروة الشرجبي', specialty: 'تقويم وتجميل الأسنان الرقمي', category: 'dental', branch: 'صنعاء - الستين والسبعين', phone: '771000002' },
    { id: '3', name: 'د. لمياء اليافعي', specialty: 'الأمراض الجلدية والليزر والحقن التجميلي', category: 'derma', branch: 'عدن - خور مكسر', phone: '731000001' },
    { id: '4', name: 'د. حسام العديني', specialty: 'العلاج بالليزر والعناية بالبشرة والندبات', category: 'derma', branch: 'عدن - المنصورة', phone: '731000002' }
  ]);

  // نموذج إضافة طبيب جديد
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    specialty: '',
    category: 'dental' as 'dental' | 'derma',
    branch: 'صنعاء - فرع حدة',
    phone: ''
  });

  // الحجوزات الواردة
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // التحقق من كلمة المرور
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // كلمة مرور افتراضية للإدارة (يمكنك تغييرها)
    if (passwordInput === 'admin1234') {
      setIsAuthenticated(true);
      setAuthError(false);
      fetchBookings();
    } else {
      setAuthError(true);
    }
  };

  // جلب الحجوزات من Supabase
  const fetchBookings = async () => {
    setLoadingBookings(true);
    try {
      const { data, error } = await supabase
        .from('Booking')
        .select('*')
        .order('created_at', { ascending: false });

      if (data && !error) {
        setBookings(data);
      }
    } catch (err) {
      console.log('Error fetching bookings', err);
    }
    setLoadingBookings(false);
  };

  // إضافة طبيب جديد للقائمة
  const handleAddDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoctor.name || !newDoctor.specialty) return;

    const doctorEntry: Doctor = {
      id: Date.now().toString(),
      ...newDoctor
    };

    setDoctors([doctorEntry, ...doctors]);
    setNewDoctor({
      name: '',
      specialty: '',
      category: 'dental',
      branch: 'صنعاء - فرع حدة',
      phone: ''
    });
  };

  // حذف طبيب
  const handleDeleteDoctor = (id: string) => {
    setDoctors(doctors.filter(d => d.id !== id));
  };

  // شاشة تسجيل الدخول
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 w-full max-w-md p-8 rounded-3xl shadow-2xl text-center">
          <div className="w-16 h-16 bg-teal-500/10 text-teal-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-teal-500/20">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">لوحة الإدارة الطبية</h1>
          <p className="text-slate-400 text-sm mb-6">الوصول مقتصر على إدارة العيادة والاستقبال</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="أدخل كلمة مرور الإدارة (admin1234)"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full p-3.5 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-teal-500 text-center text-sm"
              />
              {authError && (
                <p className="text-rose-400 text-xs mt-2 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> كلمة المرور غير صحيحة
                </p>
              )}
            </div>
            <button
              type="submit"
              className="w-full py-3.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-sm transition shadow-lg shadow-teal-600/30"
            >
              دخول إلى النظام
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* شريط الإدارة العلوي */}
        <header className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-6 h-6 text-teal-600" /> لوحة تحكم إدارة العيادات
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">إدارة الكادر الطبي، التخصصات، ومتابعة حجوزات المرضى</p>
          </div>
          <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('doctors')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition ${
                activeTab === 'doctors' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكادر الطبي والتخصصات ({doctors.length})
            </button>
            <button
              onClick={() => { setActiveTab('bookings'); fetchBookings(); }}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition ${
                activeTab === 'bookings' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              جدول المواعيد والحجوزات
            </button>
          </div>
        </header>

        {/* 1. قسم الكادر الطبي والتخصصات */}
        {activeTab === 'doctors' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* نموذج إضافة طبيب جديد */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Plus className="w-5 h-5 text-teal-600" /> إضافة طبيب / تخصص جديد
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
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف (اختياري)</label>
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

            {/* قائمة الأطباء الحالية */}
            <div className="lg:col-span-2 space-y-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-teal-600" /> قائمة الأطباء والتخصصات المعتمدة
              </h2>
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
            </div>

          </div>
        )}

        {/* 2. قسم متابعة الحجوزات */}
        {activeTab === 'bookings' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-600" /> المواعيد المحجوزة
              </h2>
              <button 
                onClick={fetchBookings}
                className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200 hover:bg-teal-100 transition"
              >
                تحديث الجدول
              </button>
            </div>

            {loadingBookings ? (
              <p className="text-center py-8 text-slate-400 text-sm">جاري جلب المواعيد...</p>
            ) : bookings.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-slate-500 text-sm">لا توجد حجوزات مسجلة بعد، أو جاري مزامنة قاعدة البيانات.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-3">اسم المريض</th>
                      <th className="p-3">رقم الهاتف</th>
                      <th className="p-3">الخدمة</th>
                      <th className="p-3">الطبيب</th>
                      <th className="p-3">الفرع</th>
                      <th className="p-3">تاريخ ووقت الموعد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bookings.map((b, i) => (
                      <tr key={i} className="hover:bg-slate-50/80">
                        <td className="p-3 font-bold text-slate-900">{b.patient_name || 'غير محدد'}</td>
                        <td className="p-3 text-slate-600">{b.patient_phone || '-'}</td>
                        <td className="p-3 text-teal-700 font-medium">{b.service_name || '-'}</td>
                        <td className="p-3 text-slate-800">{b.doctor_name || '-'}</td>
                        <td className="p-3 text-slate-600">{b.branch_name || '-'}</td>
                        <td className="p-3 text-slate-800 font-mono font-medium">{b.booking_date} {b.booking_time}</td>
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
