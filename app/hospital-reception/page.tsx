'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Building2, KeyRound, UserCheck, Loader2, LogOut, ShieldCheck, AlertCircle 
} from 'lucide-react';
import ReceptionPinTab from '@/components/hospital/ReceptionPinTab';
import { StaffMember } from '@/components/hospital/StaffManagementTab';

function ReceptionMainContent() {
  const searchParams = useSearchParams();
  const urlFacilityId = searchParams.get('facility_id');

  const [facility, setFacility] = useState<any>(null);
  const [availableStaff, setAvailableStaff] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [staffPinInput, setStaffPinInput] = useState<string>('');
  const [authenticatedStaff, setAuthenticatedStaff] = useState<StaffMember | null>(null);

  const [doctors, setDoctors] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const initFacility = async () => {
      // 1. تحديد معرّف المنشأة: إما من الرابط المخصص أو من التخزين المحلي المحفوظ مسبقاً
      const activeFacId = urlFacilityId || localStorage.getItem('fixed_reception_facility_id');

      if (!activeFacId) {
        setLoading(false);
        return;
      }

      try {
        // حفظ المعرّف لضمان عدم ضياعه عند التحديث
        localStorage.setItem('fixed_reception_facility_id', activeFacId);

        // جلب بيانات هذه المنشأة حصراً
        const { data: facData, error } = await supabase
          .from('ClinicFacility')
          .select('*')
          .eq('id', activeFacId)
          .single();

        if (facData && !error) {
          setFacility(facData);
          const staffList: StaffMember[] = facData.wallets_info?.reception_staff || [];
          setAvailableStaff(staffList);

          // التحقق مما إذا كان هناك موظف قد سجل دخوله مسبقاً على هذا الجهاز
          const savedStaff = localStorage.getItem(`reception_active_staff_${activeFacId}`);
          if (savedStaff) {
            setAuthenticatedStaff(JSON.parse(savedStaff));
          }

          // جلب أطباء وحجوزات هذه المنشأة حصراً
          const { data: docs } = await supabase.from('Doctor').select('*').eq('facility_id', facData.id);
          if (docs) setDoctors(docs);

          const { data: bData } = await supabase
            .from('Booking')
            .select('*')
            .eq('facility_id', facData.id)
            .order('booking_date', { ascending: false });
          if (bData) setBookings(bData);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };

    initFacility();
  }, [urlFacilityId]);

  // تسجيل دخول الموظف برقم الـ PIN
  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const member = availableStaff.find(s => s.id === selectedStaffId);
    if (!member) {
      setAuthError('يرجى اختيار اسم الموظف من القائمة.');
      return;
    }

    if (!member.is_active) {
      setAuthError('هذا الحساب معطل حالياً من قِبل إدارة المنشأة.');
      return;
    }

    if (member.pin_code !== staffPinInput.trim()) {
      setAuthError('رمز PIN غير صحيح! يرجى إدخال الرمز الخاص بك.');
      return;
    }

    setAuthenticatedStaff(member);
    localStorage.setItem(`reception_active_staff_${facility.id}`, JSON.stringify(member));
  };

  // إنهاء الوردية / تسجيل الخروج
  const handleStaffLogout = () => {
    setAuthenticatedStaff(null);
    setSelectedStaffId('');
    setStaffPinInput('');
    if (facility?.id) {
      localStorage.removeItem(`reception_active_staff_${facility.id}`);
    }
  };

  const formatMoney = (amountInUsd: number) => {
    const rate = 535; // ريال يمني
    const converted = (amountInUsd || 0) * rate;
    return `${Math.round(converted).toLocaleString('ar-YE')} ريال`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-xs text-slate-400">جاري تحميل شاشة الاستقبال...</p>
      </div>
    );
  }

  // في حال فتح الرابط دون تحديد المنشأة
  if (!facility) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-6 rounded-3xl text-center space-y-4 shadow-xl">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-base font-bold">رابط الاستقبال غير مكتمل</h2>
          <p className="text-xs text-slate-400">
            يجب فتح الرابط المخصص للمنشأة المزوّد من لوحة الإدارة (يحتوي على رمز المنشأة الخاص).
          </p>
        </div>
      </div>
    );
  }

  // شاشة الدخول السريع للموظف (اسم الموظف + PIN)
  if (!authenticatedStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6">
          
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center border border-amber-500/30">
              <Building2 className="w-7 h-7" />
            </div>
            <h1 className="text-lg font-black">{facility.name}</h1>
            <p className="text-xs text-amber-400 font-bold">بوابة شباك الاستقبال والورديات</p>
          </div>

          {authError && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-bold text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleStaffLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold mb-1.5 text-slate-300">موظف الاستقبال:</label>
              {availableStaff.length === 0 ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs">
                  لم يتم إضافة موظفي استقبال بعد. يرجى إضافتهم من صفحة إدارة المنشأة.
                </div>
              ) : (
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  required
                  className="w-full p-3.5 border rounded-xl bg-slate-950 border-slate-700 text-white font-bold outline-none focus:border-amber-500 text-sm"
                >
                  <option value="">-- اضغط لاختيار اسمك --</option>
                  {availableStaff.map((staff) => (
                    <option key={staff.id} value={staff.id} disabled={!staff.is_active}>
                      {staff.name} {!staff.is_active ? '(معطل)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedStaffId && (
              <div>
                <label className="block font-bold mb-1.5 text-slate-300">الرمز السري (PIN):</label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  placeholder="••••"
                  value={staffPinInput}
                  onChange={(e) => setStaffPinInput(e.target.value)}
                  className="w-full p-3.5 border rounded-xl bg-slate-950 border-slate-700 text-amber-300 font-mono text-center text-xl font-black tracking-widest outline-none focus:border-amber-500"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={!selectedStaffId || !staffPinInput}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-amber-500/20"
            >
              <UserCheck className="w-5 h-5" /> بدء الوردية ومباشرة العمل
            </button>
          </form>

        </div>
      </div>
    );
  }

  // بعد تسجيل الدخول بنجاح
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        
        <header className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-base text-white">{facility.name}</h1>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" /> موظف الوردية: {authenticatedStaff.name}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleStaffLogout}
            className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 w-full sm:w-auto justify-center"
          >
            <LogOut className="w-4 h-4" /> تبديل الوردية / خروج
          </button>
        </header>

        <ReceptionPinTab
          facilityId={facility.id}
          facilityName={facility.name}
          doctors={doctors}
          bookings={bookings}
          setBookings={setBookings}
          staffList={availableStaff}
          isDarkMode={true}
          formatMoney={formatMoney}
        />

      </div>
    </div>
  );
}

export default function StandaloneReceptionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    }>
      <ReceptionMainContent />
    </Suspense>
  );
}
