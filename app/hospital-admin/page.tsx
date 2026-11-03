'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import DashboardSidebar from '@/components/DashboardSidebar';
import { 
  Building2, Calendar, Phone, Plus, Trash2, 
  Search, Shield, Lock, Stethoscope, Clock, AlertCircle, 
  Loader2, LogOut, Settings, CheckCircle2, Edit3, Check,
  CreditCard, Wallet, AlertTriangle, KeyRound, Sparkles,
  Users, CheckSquare, Sun, Moon, ArrowRight, Coins
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

type CurrencyCode = 'USD' | 'YER' | 'SAR';

export default function UnifiedHospitalPortal() {
  const [user, setUser] = useState<any>(null);
  const [isManager, setIsManager] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // الوضع الليلي / الفاتح
  const [isDarkMode, setIsDarkMode] = useState(false);

  // العملة المختارة وأسعار التحويل التقريبية
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const currencyRates: Record<CurrencyCode, { symbol: string; rate: number }> = {
    USD: { symbol: '$', rate: 1 },
    YER: { symbol: 'ريال', rate: 535 },
    SAR: { symbol: 'ر.س', rate: 3.75 }
  };

  const formatMoney = (amountInUsd: number) => {
    const target = currencyRates[currency];
    const converted = amountInUsd * target.rate;
    if (currency === 'YER') {
      return `${Math.round(converted).toLocaleString()} ${target.symbol}`;
    }
    return `${target.symbol}${converted.toFixed(1)}`;
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // التبويب النشط
  const [activeTab, setActiveTab] = useState<string>('bookings');

  const [facility, setFacility] = useState<Facility | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  // خانة التأكيد السريع للأوفلاين عبر رمز PIN
  const [inputPin, setInputPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinResult, setPinResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // محافظ المنشأة
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
      const managerStatus = role !== 'receptionist';
      setIsManager(managerStatus);
      setActiveTab(managerStatus ? 'bookings' : 'checkin');

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

  // تأكيد حضور المريض بالرمز السري أوفلاين
  const handleVerifyOfflinePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPin.trim()) return;

    setPinLoading(true);
    setPinResult(null);

    const targetPin = inputPin.trim();

    try {
      let query = supabase.from('Booking').select('*').eq('checkin_pin', targetPin);
      if (facility?.id) {
        query = query.eq('facility_id', facility.id);
      }

      const { data: matchedBookings, error } = await query;

      if (error || !matchedBookings || matchedBookings.length === 0) {
        setPinResult({ type: 'error', text: 'الرمز غير صحيح أو غير مسجل في الحجوزات.' });
      } else {
        const booking = matchedBookings[0];
        if (booking.status === 'completed') {
          setPinResult({ type: 'error', text: `تم توثيق هذا الحجز مسبقاً للمريض (${booking.patient_name}).` });
        } else {
          let activeCoupon = booking.discount_coupon;
          if (!activeCoupon) {
            activeCoupon = `CARE-${Math.floor(1000 + Math.random() * 9000)}`;
          }

          await supabase
            .from('Booking')
            .update({
              status: 'completed',
              verified_by_patient: true,
              discount_coupon: activeCoupon
            })
            .eq('id', booking.id);

          setPinResult({ 
            type: 'success', 
            text: `تم تأكيد حضور المريض (${booking.patient_name}) بنجاح! كود الخصم: ${activeCoupon}` 
          });
          setInputPin('');
          if (user) loadFacilityData(user);
        }
      }
    } catch (err) {
      setPinResult({ type: 'error', text: 'حدث خطأ أثناء فحص الرمز.' });
    }
    setPinLoading(false);
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

  // مواعيد اليوم
  const todayStr = new Date().toISOString().split('T')[0];
  const todayBookings = useMemo(() => {
    return bookings.filter(b => b.booking_date === todayStr);
  }, [bookings, todayStr]);

  const filteredBookings = useMemo(() => {
    let result = (activeTab === 'today_bookings') ? todayBookings : bookings;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(b => 
        (b.patient_name || '').toLowerCase().includes(q) || 
        (b.patient_phone || '').includes(q) ||
        (b.doctor_name || '').toLowerCase().includes(q) ||
        (b.checkin_pin || '').includes(q) ||
        (b.applied_coupon || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [bookings, todayBookings, activeTab, searchQuery]);

  if (loadingAuth) {
    return (
      <main className={`min-h-screen flex items-center justify-center p-4 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-900 text-white'}`}>
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className={`min-h-screen flex items-center justify-center p-4 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-900'}`}>
        <div className="bg-slate-800 border border-slate-700 w-full max-w-md p-8 rounded-3xl shadow-2xl text-center">
          <div className="flex justify-between items-center mb-4">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition">
              <ArrowRight className="w-4 h-4" /> العودة للرئيسية
            </Link>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl bg-slate-700/60 text-slate-300 hover:text-white transition"
              title="تبديل المظهر"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

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
    <div className={`min-h-screen flex transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'}`}>
      {/* 1. القائمة الجانبية الذكية */}
      <DashboardSidebar
        role={isManager ? 'facility_manager' : 'receptionist'}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userName={user.email}
        facilityName={facility?.name}
        onLogout={handleSignOut}
        badgeCounts={{
          pendingBookings: bookings.filter(b => b.status === 'pending').length,
          uncollectedDebt: currentDebt
        }}
      />

      {/* 2. منطقة المحتوى */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-8 space-y-6 pt-16 sm:pt-8">
        
        {/* شريط التحكم العلوي المدمج: زر الرجوع + محول العملات + الوضع الداكن */}
        <div className={`p-4 rounded-3xl border shadow-sm flex flex-wrap justify-between items-center gap-3 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition border ${
                isDarkMode ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <ArrowRight className="w-4 h-4 text-teal-600" />
              الرجوع للرئيسية
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {/* محول العملات */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
              <Coins className="w-3.5 h-3.5 text-teal-600" />
              <span className="text-[11px] font-bold">العملة:</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="bg-transparent text-xs font-black outline-none cursor-pointer text-teal-600"
              >
                <option value="USD" className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>الدولار ($)</option>
                <option value="YER" className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>الريال اليمني (ريال)</option>
                <option value="SAR" className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>الريال السعودي (ر.س)</option>
              </select>
            </div>

            {/* زر الوضع المظلم / الفاتح */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2.5 rounded-2xl border transition flex items-center justify-center ${
                isDarkMode ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title={isDarkMode ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* تنبيه السقف الائتماني */}
        {isSuspended && (
          <div className="bg-rose-50 border-2 border-rose-300 p-4 rounded-2xl flex items-center gap-3 text-rose-900 text-xs sm:text-sm shadow-sm">
            <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0" />
            <div className="flex-grow">
              <strong>تم تعليق استقبال الحجوزات مؤقتاً:</strong> وصلت مديونية عمولات الحجوزات النقدية إلى السقف الائتماني ({formatMoney(creditLimit)}). يرجى تسوية الفاتورة لإعادة التفعيل الفوري.
            </div>
            {isManager && (
              <button 
                onClick={() => setActiveTab('billing')}
                className="px-3.5 py-1.5 bg-rose-600 text-white font-bold rounded-xl whitespace-nowrap hover:bg-rose-700 transition"
              >
                سداد الفاتورة
              </button>
            )}
          </div>
        )}

        {/* ترويسة المنشأة */}
        <header className={`p-5 rounded-3xl border shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{facility?.name || 'المنشأة الطبية'}</h1>
              <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full">
                {facility?.city || 'اليمن'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {isManager ? 'لوحة إدارة المنشأة الطبية والفوترة' : 'بوابة موظف الاستقبال وتأكيد الحضور السريع'}
            </p>
          </div>

          <span className="text-xs font-bold text-slate-400 font-mono">
            {todayStr}
          </span>
        </header>

        {/* خانة التأكيد السريع للأوفلاين */}
        {(!isManager || activeTab === 'checkin' || activeTab === 'bookings') && (
          <section className={`border-2 border-amber-400/80 p-5 rounded-3xl shadow-sm space-y-3 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className={`text-base font-black flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  <KeyRound className="w-5 h-5 text-amber-500" />
                  تأكيد حضور المريض بالرمز السري (بدون إنترنت للمريض)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  اطلب من المريض رمز الـ PIN المكون من 4 أرقام الموجود في تذكرة حجزه لإثبات الكشف وتأكيد الموعد فوراً.
                </p>
              </div>

              <form onSubmit={handleVerifyOfflinePin} className="flex gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="أدخل الرمز PIN"
                  value={inputPin}
                  onChange={(e) => setInputPin(e.target.value)}
                  className={`p-3 border-2 border-amber-300 rounded-2xl text-sm font-mono font-black text-center outline-none w-40 focus:border-amber-500 ${
                    isDarkMode ? 'bg-slate-950 text-amber-300 border-amber-500/40' : 'bg-amber-50 text-amber-900'
                  }`}
                />
                <button
                  type="submit"
                  disabled={pinLoading || !inputPin.trim()}
                  className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-2xl transition flex items-center gap-1 shadow-md shadow-amber-500/20 whitespace-nowrap"
                >
                  {pinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  تأكيد الحضور
                </button>
              </form>
            </div>

            {pinResult && (
              <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                pinResult.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {pinResult.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />}
                {pinResult.text}
              </div>
            )}
          </section>
        )}

        {/* جدول المواعيد */}
        {(activeTab === 'bookings' || activeTab === 'today_bookings' || activeTab === 'all_bookings') && (
          <div className={`p-6 rounded-3xl border shadow-sm space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <div>
                <h2 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  <Calendar className="w-5 h-5 text-teal-600" />
                  {activeTab === 'today_bookings' ? `مواعيد اليوم (${todayBookings.length})` : `كافة حجوزات المرضى (${bookings.length})`}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">المبالغ تظهر تلقائياً بالعملة المحددة ({currency})</p>
              </div>

              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="بحث باسم، هاتف، أو PIN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-8 pr-3 py-1.5 border rounded-xl text-xs outline-none focus:border-teal-500 ${
                    isDarkMode ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            {loadingData ? (
              <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin text-teal-600 mx-auto" /></div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-slate-400 text-sm">لا توجد حجوزات مسجلة حالياً.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm">
                  <thead className={`border-b ${isDarkMode ? 'bg-slate-950/60 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                    <tr>
                      <th className="p-3">المريض</th>
                      <th className="p-3">رمز PIN</th>
                      <th className="p-3">الهاتف</th>
                      <th className="p-3">الطبيب المطلوب</th>
                      <th className="p-3">الموعد والتوقيت</th>
                      <th className="p-3">المطلوب تحصيله</th>
                      <th className="p-3">حالة الحجز</th>
                      <th className="p-3">إجراءات</th>
                      <th className="p-3">واتساب</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                    {filteredBookings.map((b) => {
                      let cleanPhone = (b.patient_phone || '').replace(/[^0-9]/g, '');
                      if (cleanPhone.startsWith('967')) cleanPhone = cleanPhone.slice(3);
                      if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.slice(1);
                      const finalPatientNumber = '967' + cleanPhone;

                      const replyMsg = encodeURIComponent(
                        `مرحباً بك أستاذ/ة ${b.patient_name || ''}،\n` +
                        `نؤكد لك استلام وتثبيت موعدك لدى ${facility?.name}:\n` +
                        `* الطبيب: ${b.doctor_name}\n` +
                        `* الموعد: ${b.booking_date} الساعة ${b.booking_time}\n` +
                        `🔑 رمز تأكيد حضورك (PIN): ${b.checkin_pin || '---'}\n\n` +
                        `أهلاً وسهلاً بك!`
                      );
                      const waLink = `https://api.whatsapp.com/send?phone=${finalPatientNumber}&text=${replyMsg}`;

                      return (
                        <tr key={b.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                          <td className={`p-3 font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{b.patient_name}</td>
                          <td className="p-3">
                            <span className="font-mono font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                              {b.checkin_pin || '---'}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-400">+967 {cleanPhone}</td>
                          <td className="p-3 text-teal-500 font-bold">{b.doctor_name}</td>
                          <td className="p-3 font-medium">
                            <div className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{b.booking_date}</div>
                            <span className="text-xs text-slate-400">{b.booking_time}</span>
                          </td>
                          <td className="p-3">
                            {b.discount_amount > 0 ? (
                              <div>
                                <span className="font-mono font-black text-emerald-500 text-xs">
                                  {formatMoney(b.deposit_amount || 0)}
                                </span>
                                <span className="text-[10px] text-teal-400 block mt-0.5">
                                  خصم المنصة: -{formatMoney(b.discount_amount)}
                                </span>
                              </div>
                            ) : (
                              <span className="font-mono font-bold">
                                {formatMoney(b.deposit_amount || 20)}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <select
                              value={b.status || 'pending'}
                              onChange={(e) => handleUpdateStatus(b.id, e.target.value)}
                              className={`text-xs font-bold px-2 py-1 rounded-lg border outline-none cursor-pointer ${
                                isDarkMode ? 'bg-slate-950 border-slate-700 text-slate-200' :
                                b.status === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                                b.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                                b.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-300' :
                                'bg-white text-slate-700 border-slate-300'
                              }`}
                            >
                              <option value="pending">⏳ قيد الانتظار</option>
                              <option value="confirmed">✅ مؤكد</option>
                              <option value="completed">🩺 تم الكشف</option>
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
                                className={`p-1.5 text-teal-500 hover:bg-teal-500/10 border rounded-lg ${isDarkMode ? 'border-slate-700' : 'border-teal-200'}`}
                                title="تعديل الموعد"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteBooking(b)}
                                className={`p-1.5 text-rose-500 hover:bg-rose-500/10 border rounded-lg ${isDarkMode ? 'border-slate-700' : 'border-rose-200'}`}
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
                              className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg border border-emerald-500/30 text-xs font-bold transition whitespace-nowrap"
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

        {/* تبويب الفوترة (خاص بالمدير) */}
        {isManager && activeTab === 'billing' && (
          <div className={`p-6 rounded-3xl border shadow-sm max-w-3xl mx-auto space-y-6 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className={`border-b pb-3 flex justify-between items-center ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <div>
                <h2 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  <CreditCard className="w-5 h-5 text-teal-600" /> كشف حساب الفوترة والعمولات المستحقة
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">الحسابات والمديونية معروضة بـ ({currency})</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                isSuspended ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {isSuspended ? 'الحساب معلق' : 'الحساب نشط'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-xs text-slate-400 block">إجمالي المديونية الحالية:</span>
                <span className="text-2xl font-black text-rose-500">{formatMoney(currentDebt)}</span>
                <span className="text-[10px] text-slate-400 block mt-1">عن الكشوفات المكتملة</span>
              </div>
              <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-xs text-slate-400 block">السقف الائتماني:</span>
                <span className={`text-2xl font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{formatMoney(creditLimit)}</span>
                <span className="text-[10px] text-slate-400 block mt-1">الحد الأقصى قبل الإيقاف</span>
              </div>
              <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-xs text-slate-400 block">عمولة الكشف الواحد:</span>
                <span className="text-2xl font-black text-teal-500">{formatMoney(facility?.commission_rate || 2)}</span>
                <span className="text-[10px] text-slate-400 block mt-1">لكل مريض منجز</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">نسبة استهلاك السقف الائتماني:</span>
                <span>{Math.min(100, Math.round((currentDebt / creditLimit) * 100))}%</span>
              </div>
              <div className={`w-full h-3 rounded-full overflow-hidden border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                <div 
                  className={`h-full transition-all duration-500 ${
                    currentDebt >= creditLimit ? 'bg-rose-600' : (currentDebt / creditLimit) > 0.7 ? 'bg-amber-500' : 'bg-teal-600'
                  }`}
                  style={{ width: `${Math.min(100, (currentDebt / creditLimit) * 100)}%` }}
                />
              </div>
            </div>

            <div className={`p-5 rounded-2xl border space-y-3 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-teal-50/60 border-teal-200'}`}>
              <h4 className="font-bold text-sm flex items-center gap-1.5 text-teal-500">
                <Wallet className="w-4 h-4" /> حسابات المنصة المعتمدة لسداد الفاتورة
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                يرجى تحويل مبلغ العمولة المستحق لحساب المنصة وتزويد الإدارة برقم العملية لتصفير المديونية فوراً:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className={`p-3 rounded-xl border flex justify-between items-center ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-teal-200'}`}>
                  <div>
                    <span className="text-[10px] text-slate-400 block">🏦 بنك الكريمي (حاسب / حساب):</span>
                    <strong className="font-mono text-teal-500">3001234567</strong>
                  </div>
                  <span className="text-[10px] bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded font-bold">المنصة</span>
                </div>

                <div className={`p-3 rounded-xl border flex justify-between items-center ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-teal-200'}`}>
                  <div>
                    <span className="text-[10px] text-slate-400 block">🟢 محفظة ون كاش (OneCash):</span>
                    <strong className="font-mono text-teal-500">770000000</strong>
                  </div>
                  <span className="text-[10px] bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded font-bold">حساب التاجر</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* تبويب المحافظ (خاص بالمدير) */}
        {isManager && activeTab === 'wallets' && (
          <div className={`p-6 rounded-3xl border shadow-sm max-w-2xl mx-auto space-y-6 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className={`border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <h2 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                <Wallet className="w-5 h-5 text-teal-600" /> إدارة حسابات المحافظ الإلكترونية اليمنية
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">أدخل أرقام الحسابات التي تدعمها المنشأة لسداد عربون المريض</p>
            </div>

            <form onSubmit={handleSaveWallets} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`p-3.5 rounded-2xl border space-y-1.5 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="block text-xs font-bold">🏦 بنك الكريمي (حاسب / رقم الحساب)</label>
                  <input
                    type="text"
                    placeholder="رقم الحساب أو خدمة حاسب"
                    value={wallets.kuraimi}
                    onChange={(e) => setWallets({ ...wallets, kuraimi: e.target.value })}
                    className={`w-full p-2.5 border rounded-xl text-xs outline-none font-mono ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                  />
                </div>
                <div className={`p-3.5 rounded-2xl border space-y-1.5 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="block text-xs font-bold">🟢 ون كاش (OneCash)</label>
                  <input
                    type="text"
                    placeholder="رقم هاتف المحفظة"
                    value={wallets.onecash}
                    onChange={(e) => setWallets({ ...wallets, onecash: e.target.value })}
                    className={`w-full p-2.5 border rounded-xl text-xs outline-none font-mono ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                  />
                </div>
                <div className={`p-3.5 rounded-2xl border space-y-1.5 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="block text-xs font-bold">🔵 فلوسك (بنك اليمن والكويت)</label>
                  <input
                    type="text"
                    placeholder="رقم محفظة فلوسك"
                    value={wallets.floosak}
                    onChange={(e) => setWallets({ ...wallets, floosak: e.target.value })}
                    className={`w-full p-2.5 border rounded-xl text-xs outline-none font-mono ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                  />
                </div>
                <div className={`p-3.5 rounded-2xl border space-y-1.5 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="block text-xs font-bold">🟣 جوالي (بنك اليمن والبحرين)</label>
                  <input
                    type="text"
                    placeholder="رقم محفظة جوالي"
                    value={wallets.jawali}
                    onChange={(e) => setWallets({ ...wallets, jawali: e.target.value })}
                    className={`w-full p-2.5 border rounded-xl text-xs outline-none font-mono ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                  />
                </div>
              </div>

              {walletsSuccess && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
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

        {/* تبويب كادر الأطباء (خاص بالمدير) */}
        {isManager && activeTab === 'doctors' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={`p-6 rounded-3xl border shadow-sm space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <h2 className={`text-base font-bold flex items-center gap-2 border-b pb-3 ${isDarkMode ? 'border-slate-800 text-white' : 'border-slate-100 text-slate-900'}`}>
                <Plus className="w-5 h-5 text-teal-600" /> إضافة طبيب لمنشأتكم
              </h2>
              <form onSubmit={handleAddDoctor} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1">اسم الطبيب</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: د. أنيس المقطري"
                    value={newDoctor.name}
                    onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                    className={`w-full p-2.5 border rounded-xl text-sm outline-none ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">التخصص</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: استشاري أمراض القلب"
                    value={newDoctor.specialty}
                    onChange={(e) => setNewDoctor({ ...newDoctor, specialty: e.target.value })}
                    className={`w-full p-2.5 border rounded-xl text-sm outline-none ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">القسم</label>
                  <select
                    value={newDoctor.category}
                    onChange={(e) => setNewDoctor({ ...newDoctor, category: e.target.value })}
                    className={`w-full p-2.5 border rounded-xl text-sm outline-none ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                  >
                    <option value="dental">طب الأسنان</option>
                    <option value="derma">الجلدية والتجميل</option>
                    <option value="general">الباطنية والقلب</option>
                    <option value="eyes">العيون</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">رسوم الكشف بالدولار ($)</label>
                  <input
                    type="number"
                    min="1"
                    value={newDoctor.consultation_fee}
                    onChange={(e) => setNewDoctor({ ...newDoctor, consultation_fee: Number(e.target.value) })}
                    className={`w-full p-2.5 border rounded-xl text-sm outline-none font-mono ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">تساوي تقريباً: {formatMoney(newDoctor.consultation_fee)}</span>
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
              <h2 className={`text-base font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                <Stethoscope className="w-5 h-5 text-teal-600" /> كادر الأطباء ({doctors.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {doctors.map((doc) => (
                  <div key={doc.id} className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded-md">
                          كشف: {formatMoney(doc.consultation_fee || 20)}
                        </span>
                        <button onClick={() => handleDeleteDoctor(doc.id)} className="text-slate-400 hover:text-rose-500 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <h3 className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{doc.name}</h3>
                      <p className="text-xs text-slate-400 mt-1">{doc.specialty}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* تبويب بيانات المنشأة (خاص بالمدير) */}
        {isManager && activeTab === 'settings' && facility && (
          <div className={`p-6 rounded-3xl border shadow-sm max-w-lg mx-auto space-y-5 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className={`border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <h2 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                <Settings className="w-5 h-5 text-teal-600" /> إعدادات استقبال المواعيد
              </h2>
            </div>
            <form onSubmit={handleSaveFacilitySettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">اسم المنشأة</label>
                <input type="text" disabled value={facility.name} className={`w-full p-3 border rounded-xl text-sm ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'}`} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">رقم واتساب الاستقبال</label>
                <input
                  type="tel"
                  required
                  value={facPhone}
                  onChange={(e) => setFacPhone(e.target.value)}
                  className={`w-full p-3 border rounded-xl text-sm outline-none font-mono ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">العنوان</label>
                <textarea
                  rows={2}
                  value={facAddress}
                  onChange={(e) => setFacAddress(e.target.value)}
                  className={`w-full p-3 border rounded-xl text-sm outline-none ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                />
              </div>
              {facSuccess && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> تم التحديث بنجاح!
                </div>
              )}
              <button type="submit" disabled={savingFac} className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm transition">
                {savingFac ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'حفظ التحديثات'}
              </button>
            </form>
          </div>
        )}

      </main>

      {/* نافذة تعديل الموعد */}
      {editingBooking && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className={`rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl ${isDarkMode ? 'bg-slate-900 border border-slate-800 text-white' : 'bg-white text-slate-900'}`}>
            <h3 className="font-bold text-base">إعادة جدولة موعد المريض</h3>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">التاريخ الجديد</label>
                <input
                  type="date"
                  required
                  value={editDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setEditDate(e.target.value)}
                  className={`w-full p-2.5 border rounded-xl text-xs ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">الوقت الجديد</label>
                <select
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className={`w-full p-2.5 border rounded-xl text-xs ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                >
                  {availableTimes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="flex-1 py-2.5 bg-slate-700 text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-600 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition"
                >
                  {savingEdit ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'تأكيد التعديل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
