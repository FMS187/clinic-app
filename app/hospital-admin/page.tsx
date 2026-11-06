'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Building2, Calendar, CreditCard, Wallet, Stethoscope, 
  Clock, KeyRound, LogOut, Moon, Sun, Menu, X, Loader2, Users
} from 'lucide-react';

// المكونات المستقلة
import WalletsTab from '@/components/hospital/WalletsTab';
import DoctorsTab, { Doctor } from '@/components/hospital/DoctorsTab';
import BillingTab, { CompletedBookingDetail } from '@/components/hospital/BillingTab';
import BookingsTab from '@/components/hospital/BookingsTab';
import ScheduleSettingsTab from '@/components/hospital/ScheduleSettingsTab';
import ReceptionPinTab from '@/components/hospital/ReceptionPinTab';
import StaffManagementTab, { StaffMember } from '@/components/hospital/StaffManagementTab';

export default function HospitalAdminPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isManager, setIsManager] = useState(false);

  // تسجيل الدخول
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  // الإعدادات
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currency, setCurrency] = useState<'USD' | 'YER' | 'SAR'>('USD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // التبويب النشط
  const [activeTab, setActiveTab] = useState<'bookings' | 'billing' | 'wallets' | 'doctors' | 'schedule' | 'staff' | 'checkin'>('bookings');

  // بيانات المنشأة
  const [facility, setFacility] = useState<any>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const formatMoney = (amountInUsd: number) => {
    const rates = { USD: 1, YER: 535, SAR: 3.75 };
    const symbols = { USD: '$', YER: 'ريال يمني', SAR: 'ر.س' };
    const converted = (amountInUsd || 0) * rates[currency];
    return `${Math.round(converted).toLocaleString('ar-YE')} ${symbols[currency]}`;
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser(session.user);
        await loadFacilityData(session.user);
      }
      setAuthLoading(false);
    };
    checkSession();
  }, []);

  const loadFacilityData = async (user: any) => {
    setLoadingData(true);
    try {
      const emailLower = (user.email || '').toLowerCase().trim();
      const metaRole = user.user_metadata?.role;
      const isReception = metaRole === 'receptionist';
      const managerStatus = !isReception;

      setIsManager(managerStatus);
      setActiveTab(managerStatus ? 'bookings' : 'checkin');

      let targetFacility: any = null;
      let facId: string | null = user.user_metadata?.facility_id || null;

      // 1. فحص جدول profiles لمعرفة منشأة المستخدم المسجل
      if (!facId) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .single();

        if (profileData && profileData.tenant_id) {
          facId = profileData.tenant_id;
        }
      }

      // 2. إذا وجد المعرف، نحاول جلبه من ClinicFacility أولاً
      if (facId) {
        const { data: facData } = await supabase
          .from('ClinicFacility')
          .select('*')
          .eq('id', facId)
          .single();

        if (facData) {
          targetFacility = facData;
        }
      }

      // 3. إذا لم يجد في ClinicFacility بالمعرف، نبحث في جدول tenants بنفس المعرف أو الإيميل
      if (!targetFacility) {
        let tenantQuery = supabase.from('tenants').select('*');
        if (facId) {
          tenantQuery = tenantQuery.eq('id', facId);
        } else {
          tenantQuery = tenantQuery.eq('email', emailLower);
        }

        const { data: tenantResult } = await tenantQuery.limit(1);

        if (tenantResult && tenantResult.length > 0) {
          const matchedTenant = tenantResult[0];

          // فحص هل المنشأة تم نقلها إلى ClinicFacility بنفس الاسم أو الهاتف
          const { data: matchedFac } = await supabase
            .from('ClinicFacility')
            .select('*')
            .or(`name.eq.${matchedTenant.name},phone.eq.${matchedTenant.phone}`)
            .limit(1);

          if (matchedFac && matchedFac.length > 0) {
            targetFacility = matchedFac[0];
          } else {
            targetFacility = {
              id: matchedTenant.id,
              name: matchedTenant.name,
              city: matchedTenant.city || 'صنعاء',
              address: matchedTenant.address || 'اليمن',
              phone: matchedTenant.phone || '',
              whatsapp_number: matchedTenant.phone || '',
              commission_rate: 2.0,
              credit_limit: 50.0,
              current_debt: 0.0,
              is_active: matchedTenant.status === 'approved',
              wallets_info: { kuraimi: '3001234567', onecash: '770000000', reception_staff: [] }
            };
          }
        }
      }

      // 4. إذا لم توجد منشأة خاصة به، لا نسحب عيادة عشوائية
      if (targetFacility) {
        setFacility(targetFacility);

        // جلب أطباء هذه المنشأة حصراً
        const { data: docsData } = await supabase
          .from('Doctor')
          .select('*')
          .eq('facility_id', targetFacility.id);

        if (docsData) setDoctors(docsData);

        // جلب حجوزات هذه المنشأة حصراً
        const { data: bData } = await supabase
          .from('Booking')
          .select('*')
          .eq('facility_id', targetFacility.id)
          .order('booking_date', { ascending: false });

        if (bData) setBookings(bData);
      } else {
        setFacility(null);
        setDoctors([]);
        setBookings([]);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingData(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginSubmitting(true);
    setLoginError('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword
    });

    if (error) {
      setLoginError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
    } else if (data?.user) {
      setCurrentUser(data.user);
      await loadFacilityData(data.user);
    }
    setLoginSubmitting(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setFacility(null);
    setDoctors([]);
    setBookings([]);
  };

  const completedCashBookings: CompletedBookingDetail[] = bookings
    .filter(b => b.status === 'completed')
    .map(b => ({
      id: b.id,
      patient_name: b.patient_name,
      patient_phone: b.patient_phone,
      doctor_name: b.doctor_name,
      booking_date: b.booking_date,
      consultation_fee: b.deposit_amount || 20,
      platform_fee: facility?.commission_rate || 2
    }));

  const calculatedDebt = completedCashBookings.reduce((sum, item) => sum + (item.platform_fee || 2), 0);
  const staffList: StaffMember[] = facility?.wallets_info?.reception_staff || [];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
        <div className={`max-w-md w-full p-8 rounded-3xl border shadow-2xl space-y-6 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-teal-600/20 text-teal-400 mx-auto flex items-center justify-center border border-teal-500/30">
              <Building2 className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-black">بوابة المنشآت الطبية الشريكة</h1>
            <p className="text-xs text-slate-400">سجّل دخولك لإدارة المركز أو متابعة صالة الاستقبال</p>
          </div>

          {loginError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-bold text-center">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className={`w-full p-3 border rounded-xl text-xs outline-none ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'}`}
                placeholder="example@hospital.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">كلمة المرور</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className={`w-full p-3 border rounded-xl text-xs outline-none ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'}`}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loginSubmitting}
              className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-2"
            >
              {loginSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تسجيل الدخول للنظام'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'}`}>
      
      {/* خلفية معتمة للجوال عند فتح القائمة */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* القائمة الجانبية */}
      <aside className={`fixed inset-y-0 right-0 z-40 w-64 border-l transition-transform duration-300 ease-in-out ${
        isSidebarOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full lg:translate-x-0'
      } ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} flex flex-col justify-between p-4`}>
        
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h2 className="font-black text-sm text-teal-500 truncate max-w-[170px]">
                {facility?.name || 'المنشأة الطبية'}
              </h2>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {isManager ? 'مدير المنشأة (إشرافي/مالي)' : 'شباك الاستقبال (ميداني)'}
              </span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-1">
            {/* رابط شاشة الاستقبال المستقلة */}
            <a
              href="/hospital-reception"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 mb-2"
            >
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                <span>شاشة الاستقبال - رابط مستقل</span>
              </div>
              <span className="text-[10px] bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded font-black">↗</span>
            </a>

            {isManager ? (
              <>
                <button
                  onClick={() => { setActiveTab('bookings'); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'bookings' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>جدول الحجوزات والرقابة</span>
                </button>

                <button
                  onClick={() => { setActiveTab('schedule'); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'schedule' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>الدوام وإجازات الأطباء</span>
                </button>

                <button
                  onClick={() => { setActiveTab('staff'); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'staff' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>حسابات موظفي الاستقبال PIN</span>
                </button>

                <button
                  onClick={() => { setActiveTab('billing'); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'billing' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CreditCard className="w-4 h-4" />
                    <span>الفوترة والعمولات</span>
                  </div>
                  {calculatedDebt > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[10px] font-mono">
                      ${calculatedDebt}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { setActiveTab('wallets'); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'wallets' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  <span>محافظ الدفع الإلكترونية</span>
                </button>

                <button
                  onClick={() => { setActiveTab('doctors'); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'doctors' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <Stethoscope className="w-4 h-4" />
                  <span>كادر الأطباء</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => { setActiveTab('checkin'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition bg-amber-500 text-white`}
              >
                <KeyRound className="w-4 h-4" />
                <span>شباك الاستقبال (PIN) والورديات</span>
              </button>
            )}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800/40 space-y-2">
          <div className="text-[10px] text-slate-400 truncate">
            المستخدم: {currentUser.email}
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl text-xs font-bold transition border border-rose-500/30"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>

      </aside>

      {/* المحتوى الرئيسي */}
      <main className="flex-1 w-full min-w-0 overflow-x-hidden lg:mr-64 p-3 sm:p-6 space-y-4 sm:space-y-6">
        
        <header className={`p-4 rounded-3xl border flex justify-between items-center ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSidebarOpen(prev => !prev)} 
              className={`p-2 rounded-xl border lg:hidden transition ${isDarkMode ? 'bg-slate-800 border-slate-700 text-teal-400' : 'bg-slate-100 border-slate-200 text-slate-700'}`}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm sm:text-base font-black flex items-center gap-1.5 truncate">
              <Building2 className="w-5 h-5 text-teal-600" />
              {facility?.name || 'بوابة إدارة المنشأة'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex border rounded-xl overflow-hidden text-xs font-bold">
              {(['USD', 'YER', 'SAR'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-2.5 py-1.5 transition ${currency === c ? 'bg-teal-600 text-white' : isDarkMode ? 'bg-slate-950 text-slate-400' : 'bg-slate-100 text-slate-600'}`}
                >
                  {c}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-xl border transition ${isDarkMode ? 'border-slate-700 text-amber-400 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {loadingData ? (
          <div className="py-20 text-center space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-teal-500 mx-auto" />
            <p className="text-xs text-slate-400">جاري تحميل وتحديث بيانات المنشأة...</p>
          </div>
        ) : (
          <div>
            {activeTab === 'bookings' && isManager && (
              <BookingsTab
                facilityName={facility?.name || ''}
                bookings={bookings}
                isDarkMode={isDarkMode}
                formatMoney={formatMoney}
              />
            )}

            {activeTab === 'schedule' && isManager && (
              <ScheduleSettingsTab
                facilityId={facility?.id || ''}
                initialData={facility?.wallets_info}
                doctors={doctors}
                setDoctors={setDoctors}
                isDarkMode={isDarkMode}
              />
            )}

            {activeTab === 'staff' && isManager && (
              <StaffManagementTab
                facilityId={facility?.id || ''}
                initialStaff={staffList}
                isDarkMode={isDarkMode}
                onStaffUpdated={(newStaff) => {
                  setFacility((prev: any) => ({
                    ...prev,
                    wallets_info: { ...(prev?.wallets_info || {}), reception_staff: newStaff }
                  }));
                }}
              />
            )}

            {activeTab === 'billing' && isManager && (
              <BillingTab
                facilityName={facility?.name || ''}
                currentDebt={calculatedDebt}
                creditLimit={facility?.credit_limit || 50}
                commissionRate={facility?.commission_rate || 2}
                isSuspended={facility?.is_suspended || false}
                completedBookings={completedCashBookings}
                isDarkMode={isDarkMode}
                formatMoney={formatMoney}
              />
            )}

            {activeTab === 'wallets' && isManager && (
              <WalletsTab
                facilityId={facility?.id || ''}
                initialWallets={facility?.wallets_info || {}}
                isDarkMode={isDarkMode}
              />
            )}

            {activeTab === 'doctors' && isManager && (
              <DoctorsTab
                facilityId={facility?.id || ''}
                facilityName={facility?.name || ''}
                facilityCity={facility?.city || 'صنعاء'}
                doctors={doctors}
                setDoctors={setDoctors}
                isDarkMode={isDarkMode}
                formatMoney={formatMoney}
              />
            )}

            {activeTab === 'checkin' && (
              <ReceptionPinTab
                facilityId={facility?.id || ''}
                facilityName={facility?.name || ''}
                doctors={doctors}
                bookings={bookings}
                setBookings={setBookings}
                staffList={staffList}
                isDarkMode={isDarkMode}
                formatMoney={formatMoney}
              />
            )}
          </div>
        )}

      </main>

    </div>
  );
}
