'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, Building2 } from 'lucide-react';
import ReceptionPinTab from '@/components/hospital/ReceptionPinTab';
import { StaffMember } from '@/components/hospital/StaffManagementTab';

export default function StandaloneReceptionPage() {
  const [facility, setFacility] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  // جلب بيانات المنشأة وموظفي الاستقبال مباشرة دون الحاجة لحساب بريد إلكتروني
  useEffect(() => {
    const initReception = async () => {
      try {
        // جلب المنشأة
        const { data: fac } = await supabase.from('ClinicFacility').select('*').limit(1).single();
        if (fac) {
          setFacility(fac);
          setStaffList(fac.wallets_info?.reception_staff || []);

          // جلب الأطباء التابعين للمنشأة
          const { data: docs } = await supabase.from('Doctor').select('*').eq('facility_id', fac.id);
          if (docs) setDoctors(docs);

          // جلب الحجوزات
          const { data: bData } = await supabase
            .from('Booking')
            .select('*')
            .eq('facility_id', fac.id)
            .order('booking_date', { ascending: false });
          if (bData) setBookings(bData);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };

    initReception();
  }, []);

  const formatMoney = (amountInUsd: number) => {
    const rate = 535; // ريال يمني
    const converted = (amountInUsd || 0) * rate;
    return `${Math.round(converted).toLocaleString('ar-YE')} ريال`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-xs text-slate-400">جاري تجهيز شباك الاستقبال...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* ترويسة بسيطة لشباك الاستقبال */}
        <header className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-white">{facility?.name || 'المنشأة الطبية'}</h1>
              <span className="text-[10px] text-amber-400 block font-bold">بوابة شباك الاستقبال وتأكيد الحضور الميداني</span>
            </div>
          </div>
          <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700 font-mono">
            العملة: ريال يمني
          </span>
        </header>

        {/* واجهة الاستقبال والـ PIN والورديات */}
        <ReceptionPinTab
          facilityId={facility?.id || ''}
          facilityName={facility?.name || ''}
          doctors={doctors}
          bookings={bookings}
          setBookings={setBookings}
          staffList={staffList}
          isDarkMode={true}
          formatMoney={formatMoney}
        />
      </div>
    </div>
  );
}
