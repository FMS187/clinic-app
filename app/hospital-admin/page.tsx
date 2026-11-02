'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Building2, Calendar, Phone, Plus, Trash2, 
  Search, Shield, Lock, Stethoscope, Clock, AlertCircle, 
  Loader2, LogOut, Mail, Settings, CheckCircle2, Edit3, Check,
  CreditCard, Wallet, Copy, AlertTriangle, ArrowUpRight
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
  commission_rate?: number;
  credit_limit?: number;
  current_debt?: number;
  is_suspended?: boolean;
  wallets_info?: {
    kuraimi?: string;
    onecash?: string;
    floosak?: string;
    jawali?: string;
    jaib?: string;
    cash?: string;
  };
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

export default function UnifiedHospitalPortal() {
  const [user, setUser] = useState<any>(null);
  const [isManager, setIsManager] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<'bookings' | 'billing' | 'doctors' | 'wallets' | 'settings'>('bookings');

  const [facility, setFacility] = useState<Facility | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  // بيانات المحافظ الخاصة بالمنشأة
  const [wallets, setWallets] = useState({
    kuraimi: '',
    onecash: '',
    floosak: '',
    jawali: '',
    jaib: '',
    cash: ''
  });
  const [savingWallets, setSavingWallets] = useState(false);
  const [walletsSuccess, setWalletsSuccess] = useState(false);

  // إعدادات المنشأة
  const [facPhone, setFacPhone] = useState('');
  const [facAddress, setFacAddress] = useState('');
  const [savingFac, setSavingFac] = useState(false);
  const [facSuccess, setFacSuccess] = useState(false);

  // تعديل موعد
  const [editingBooking, setEditingBooking] = useState<any | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // إضافة طبيب
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    specialty: '',
    category: 'dental',
    consultation_fee: 20
  });

  const availableTimes = [
    '09:30 صباحاً', '10:30 صباحاً', '11:30 صباحاً',
    '04:30 عصراً', '05:30 مساءً', '06:30 مساءً', '07:30 مساءً'
  ];

  const loadFacilityData = async (currentUser: any) => {
    setLoadingData(true);
    try {
      const role = currentUser.user_metadata?.role;
      setIsManager(role !== 'receptionist');

      let facId = currentUser.user_metadata?.facility_id;

      if (!facId) {
        const { data: firstFac } = await supabase.from('ClinicFacility').select('*').limit(1).single();
        if (firstFac) facId = firstFac.id;
      }

      if (facId) {
        const { data: facData } = await supabase.from('ClinicFacility').select('*').eq('id', facId).single();
        if (facData) {
          setFacility(facData);
          setFacPhone(facData.whatsapp_number || '');
          setFacAddress(facData.address || '');
          if (facData.wallets_info) {
            setWallets({
              kuraimi: facData.wallets_info.kuraimi || '',
              onecash: facData.wallets_info.onecash || '',
              floosak: facData.wallets_info.floosak || '',
              jawali: facData.wallets_info.jawali || '',
              jaib: facData.wallets_info.jaib || '',
              cash: facData.wallets_info.cash || ''
            });
          }
        }

        const { data: docsData } = await supabase.from('Doctor').select('*').eq('facility_id', facId);
        if (docsData) setDoctors(docsData);

        const { data: booksData } = await supabase.from('Booking').select('*').eq('facility_id', facId).order('booking_date', { ascending: true });
        if (booksData) setBookings(booksData);
      }
    } catch (e) {
      console.log('Error loading data', e);
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

    const { error } = await supabase.auth.signInWithPassword({ email, password });
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

  const handleUpdateStatus = async (bookingId: string | number, newStatus: string) => {
    const { error } = await supabase.from('Booking').update({ status: newStatus }).eq('id', bookingId);
    if (!error) {
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
      if (user) loadFacilityData(user);
    }
  };

  const handleSaveWallets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facility) return;
    setSavingWallets(true);
    const { error } = await supabase.from('ClinicFacility').update({ wallets_info: wallets }).eq('id', facility.id);
    if (!error) {
      setWalletsSuccess(true);
      setTimeout(() => setWalletsSuccess(false), 3000);
    }
    setSavingWallets(false);
  };

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facility || !newDoctor.name || !newDoctor.specialty) return;

    const { data, error } = await supabase.from('Doctor').insert([
      {
        name: newDoctor.name,
        specialty: newDoctor.specialty,
        category: newDoctor.category,
        facility_id: facility.id,
        consultation_fee: newDoctor.consultation_fee,
        city: facility.city,
        branch: facility.name
      }
    ]).select();

    if (data && !error) {
      setDoctors(prev => [...prev, data[0]]);
      setNewDoctor({ name: '', specialty: '', category: 'dental', consultation_fee: 20 });
      alert('تمت إضافة الطبيب بنجاح.');
    }
  };

  const handleDeleteDoctor = async (id: string | number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطبيب؟')) return;
    const { error } = await supabase.from('Doctor').delete().eq('id', id);
    if (!error) {
      setDoctors(prev => prev.filter(d => d.id !== id));
    }
  };

  const handleDeleteBooking = async (b: any) => {
    if (!confirm(`هل أنت متأكد من حذف موعد "${b.patient_name}"؟`)) return;
    const { error } = await supabase.from('Booking').delete().eq('id', b.id);
    if (!error) {
      setBookings(prev => prev.filter(item => item.id !== b.id));
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking || !editDate || !editTime) return;

    setSavingEdit(true);
    const { error } = await supabase.from('Booking').update({ booking_date: editDate, booking_time: editTime }).eq('id', editingBooking.id);
    if (!error) {
      setBookings(prev => prev.map(b => b.id === editingBooking.id ? { ...b, booking_date: editDate, booking_time: editTime } : b));
      setEditingBooking(null);
    }
    setSavingEdit(false);
  };

  const handleSaveFacilitySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facility) return;
    setSavingFac(true);

    let clean = facPhone.replace(/[^0-9]/g, '');
    if (clean.startsWith('967')) clean = clean.slice(3);
    if (clean.startsWith('0')) clean = clean.slice(1);

    const { error } = await supabase.from('ClinicFacility').update({
      whatsapp_number: clean,
      address: facAddress
    }).eq('id', facility.id);

    if (!error) {
      setFacility({ ...facility, whatsapp_number: clean, address: facAddress });
      setFacSuccess(true);
      setTimeout(() => setFacSuccess(false), 3000);
    }
    setSavingFac(false);
  };

  const filteredBookings = useMemo(() => {
    let result = [...bookings];
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(b => 
        (b.patient_name || '').toLowerCase().includes(q) || 
        (b.patient_phone || '').includes(q) ||
        (b.doctor_name || '').toLowerCase().includes(q) ||
        (b.transaction_ref || '').includes(q)
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
          <h1 className="text-xl font-bold text-white mb-2">بوابة المنشأة الطبية</h1>
          <p className="text-slate-400 text-xs sm:text-sm mb-6">دخول إدارة المستشفى وموظفي الاستقبال</p>

          <form onSubmit={handleSignIn} className="space-y-4 text-right">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">البريد الإلكتروني</label>
              <input
                type="email"
                required
                placeholder="reception@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">كلمة المرور</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm outline-none focus:border-teal-500"
              />
            </div>

            {authError && (
              <p className="text-rose-400 text-xs p-2.5 bg-rose-950/40 border border-rose-800/40 rounded-lg">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full py-3.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-sm transition"
            >
              {authSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'دخول'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  const currentDebt = facility?.current_debt || 0;
  const creditLimit = facility?.credit_limit || 50;
  const isSuspended = facility?.is_suspended || (currentDebt >= creditLimit);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* تنبيه السقف الائتماني عند اقتراب الحد أو تجاوزه */}
        {isSuspended && (
          <div className="bg-rose-50 border-2 border-rose-300 p-4 rounded-2xl flex items-center gap-3 text-rose-900 text-xs sm:text-sm">
            <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0" />
            <div className="flex-grow">
              <strong>تم تعليق استقبال الحجوزات مؤقتاً:</strong> لقد وصلت مديونية عمولات الحجوزات النقدية إلى السقف الائتماني المسموح به (${creditLimit}). يرجى تسوية الفاتورة لإعادة التفعيل الفوري.
            </div>
            <button 
              onClick={() => setActiveTab('billing')}
              className="px-3.5 py-1.5 bg-rose-600 text-white font-bold rounded-xl whitespace-nowrap hover:bg-rose-700 transition"
            >
              سداد الفاتورة
            </button>
          </div>
        )}

        {/* الترويسة */}
        <header className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-center text-teal-700">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900">{facility?.name || 'المنشأة الطبية'}</h1>
                <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full">
                  {facility?.city || 'اليمن'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                الدخول: <strong className="text-slate-700">{user.email}</strong>
                <span className="mr-2 text-teal-700 font-bold">({isManager ? 'مدير المنشأة' : 'موظف استقبال'})</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 flex-grow sm:flex-grow-0">
              <button
                onClick={() => setActiveTab('bookings')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'bookings' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                المواعيد ({bookings.length})
              </button>

              {isManager && (
                <>
                  <button
                    onClick={() => setActiveTab('billing')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                      activeTab === 'billing' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" /> الفوترة والعمولة
                    {currentDebt > 0 && (
                      <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                        ${currentDebt}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab('wallets')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                      activeTab === 'wallets' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5" /> المحافظ
                  </button>

                  <button
                    onClick={() => setActiveTab('doctors')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                      activeTab === 'doctors' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    الأطباء ({doctors.length})
                  </button>

                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                      activeTab === 'settings' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    الإعدادات
                  </button>
                </>
              )}
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

        {/* 1. جدول المواعيد */}
        {activeTab === 'bookings' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-600" /> كشف حجوزات المرضى الواردة
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">عند تحويل الحالة إلى "تم الكشف" يتم احتساب عمولة الحجز آلياً</p>
              </div>

              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="بحث باسم أو هاتف أو سند..."
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
                <p className="text-slate-500 text-sm">لا توجد حجوزات مسجلة حالياً.</p>
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
                      <th className="p-3">طريقة الدفع</th>
                      <th className="p-3">حالة الحجز</th>
                      <th className="p-3">إجراءات</th>
                      <th className="p-3">واتساب</th>
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
                        `نؤكد لك استلام وتثبيت موعدك لدى ${facility?.name}:\n` +
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
                            {b.payment_method === 'wallet' ? (
                              <div>
                                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] block w-fit">
                                  عربون ({b.payment_wallet || 'محفظة'})
                                </span>
                                <span className="font-mono text-xs text-slate-700 font-bold block mt-0.5">
                                  سند: {b.transaction_ref || '-'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-600 text-xs bg-slate-100 px-2 py-0.5 rounded">
                                نقداً عند الحضور
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <select
                              value={b.status || 'pending'}
                              onChange={(e) => handleUpdateStatus(b.id, e.target.value)}
                              className={`text-xs font-bold px-2 py-1 rounded-lg border outline-none cursor-pointer ${
                                b.status === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                                b.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                                b.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-300' :
                                'bg-white text-slate-700 border-slate-300'
                              }`}
                            >
                              <option value="pending">⏳ قيد الانتظار</option>
                              <option value="confirmed">✅ مؤكد</option>
                              <option value="completed">🩺 تم الكشف (يحتسب العمولة)</option>
                              <option value="cancelled">❌ ملغي</option>
                            </select>
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
                              <button
                                onClick={() => handleDeleteBooking(b)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg"
                                title="حذف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="p-3">
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg border border-emerald-200 text-xs font-bold transition whitespace-nowrap"
                            >
                              <Phone className="w-3.5 h-3.5" /> واتساب
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

        {/* 2. تبويب الفوترة وسداد العمولة (جديد) */}
        {isManager && activeTab === 'billing' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm max-w-3xl mx-auto space-y-6">
            <div className="border-b pb-3 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-teal-600" /> كشف حساب الفوترة والعمولات المستحقة
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">متابعة العمولات المقتطعة عن الكشوفات النقدية وسدادها لحساب المنصة</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                isSuspended ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {isSuspended ? 'الحساب معلق' : 'الحساب نشط'}
              </span>
            </div>

            {/* بطاقات المؤشرات المالية */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 block">إجمالي المديونية الحالية:</span>
                <span className="text-2xl font-black text-rose-600">${currentDebt}</span>
                <span className="text-[10px] text-slate-400 block mt-1">عن الكشوفات المكتملة كاش</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 block">السقف الائتماني المتاح:</span>
                <span className="text-2xl font-black text-slate-800">${creditLimit}</span>
                <span className="text-[10px] text-slate-400 block mt-1">الحد الأقصى قبل الإيقاف</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 block">عمولة الكشف الواحد:</span>
                <span className="text-2xl font-black text-teal-700">${facility?.commission_rate || 2}</span>
                <span className="text-[10px] text-slate-400 block mt-1">لكل مريض منجز</span>
              </div>
            </div>

            {/* شريط نسبة استهلاك السقف الائتماني */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600">نسبة استهلاك السقف الائتماني:</span>
                <span className="text-slate-900">{Math.min(100, Math.round((currentDebt / creditLimit) * 100))}%</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                <div 
                  className={`h-full transition-all duration-500 ${
                    currentDebt >= creditLimit ? 'bg-rose-600' : (currentDebt / creditLimit) > 0.7 ? 'bg-amber-500' : 'bg-teal-600'
                  }`}
                  style={{ width: `${Math.min(100, (currentDebt / creditLimit) * 100)}%` }}
                />
              </div>
            </div>

            {/* بيانات حسابات المنصة لسداد الفاتورة */}
            <div className="p-5 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-3">
              <h4 className="font-bold text-teal-900 text-sm flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-teal-700" /> حسابات المنصة المعتمدة لسداد الفاتورة
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                يرجى تحويل مبلغ العمولة المستحق لحساب المنصة وتزويد الإدارة برقم العملية لتصفير المديونية فوراً:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-3 rounded-xl border border-teal-200 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block">🏦 بنك الكريمي (حاسب / حساب):</span>
                    <strong className="font-mono text-slate-900">3001234567</strong>
                  </div>
                  <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-bold">المنصة الوسيطة</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-teal-200 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block">🟢 محفظة ون كاش (OneCash):</span>
                    <strong className="font-mono text-slate-900">770000000</strong>
                  </div>
                  <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-bold">حساب التاجر</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. تبويب المحافظ */}
        {isManager && activeTab === 'wallets' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-6">
            <div className="border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-teal-600" /> إدارة حسابات المحافظ الإلكترونية اليمنية
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">أدخل أرقام الحسابات التي تدعمها المنشأة لسداد عربون المريض</p>
            </div>

            <form onSubmit={handleSaveWallets} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">🏦 بنك الكريمي (حاسب / رقم الحساب)</label>
                  <input
                    type="text"
                    placeholder="رقم الحساب أو خدمة حاسب"
                    value={wallets.kuraimi}
                    onChange={(e) => setWallets({ ...wallets, kuraimi: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs outline-none font-mono"
                  />
                </div>
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">🟢 ون كاش (OneCash)</label>
                  <input
                    type="text"
                    placeholder="رقم هاتف المحفظة"
                    value={wallets.onecash}
                    onChange={(e) => setWallets({ ...wallets, onecash: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs outline-none font-mono"
                  />
                </div>
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">🔵 فلوسك (بنك اليمن والكويت)</label>
                  <input
                    type="text"
                    placeholder="رقم محفظة فلوسك"
                    value={wallets.floosak}
                    onChange={(e) => setWallets({ ...wallets, floosak: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs outline-none font-mono"
                  />
                </div>
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">🟣 جوالي (بنك اليمن والبحرين)</label>
                  <input
                    type="text"
                    placeholder="رقم محفظة جوالي"
                    value={wallets.jawali}
                    onChange={(e) => setWallets({ ...wallets, jawali: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs outline-none font-mono"
                  />
                </div>
              </div>

              {walletsSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> تم حفظ بيانات المحافظ بنجاح!
                </div>
              )}

              <button
                type="submit"
                disabled={savingWallets}
                className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm transition"
              >
                {savingWallets ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'حفظ المحافظ'}
              </button>
            </form>
          </div>
        )}

        {/* 4. تبويب الأطباء */}
        {isManager && activeTab === 'doctors' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                <Plus className="w-5 h-5 text-teal-600" /> إضافة طبيب لمنشأتكم
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
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">التخصص</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: استشاري أمراض القلب"
                    value={newDoctor.specialty}
                    onChange={(e) => setNewDoctor({ ...newDoctor, specialty: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">القسم</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">رسوم الكشف ($)</label>
                  <input
                    type="number"
                    min="1"
                    value={newDoctor.consultation_fee}
                    onChange={(e) => setNewDoctor({ ...newDoctor, consultation_fee: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm transition"
                >
                  حفظ الطبيب
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-teal-600" /> كادر الأطباء ({doctors.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {doctors.map((doc) => (
                  <div key={doc.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md">
                          كشف: ${doc.consultation_fee || 20}
                        </span>
                        <button onClick={() => handleDeleteDoctor(doc.id)} className="text-slate-400 hover:text-rose-600 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <h3 className="font-bold text-slate-900 text-base">{doc.name}</h3>
                      <p className="text-xs text-slate-500 mt-1">{doc.specialty}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 5. الإعدادات */}
        {isManager && activeTab === 'settings' && facility && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm max-w-lg mx-auto space-y-5">
            <div className="border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-teal-600" /> إعدادات استقبال المواعيد
              </h2>
            </div>
            <form onSubmit={handleSaveFacilitySettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المنشأة</label>
                <input type="text" disabled value={facility.name} className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم واتساب الاستقبال</label>
                <input
                  type="tel"
                  required
                  value={facPhone}
                  onChange={(e) => setFacPhone(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl text-sm outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">العنوان</label>
                <textarea
                  rows={2}
                  value={facAddress}
                  onChange={(e) => setFacAddress(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl text-sm outline-none"
                />
              </div>
              {facSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> تم التحديث بنجاح!
                </div>
              )}
              <button type="submit" disabled={savingFac} className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm transition">
                {savingFac ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'حفظ التحديثات'}
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
