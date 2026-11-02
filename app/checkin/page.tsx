'use client';

import React, { useState, Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { QrCode, CheckCircle2, HeartPulse, Loader2, Gift, Search, Phone, ArrowLeft } from 'lucide-react';

function CheckinContent() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [successBooking, setSuccessBooking] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSelfCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessBooking(null);

    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('967')) clean = clean.slice(3);
    if (clean.startsWith('0')) clean = clean.slice(1);

    try {
      // البحث عن أحدث حجز معلق أو مؤكد لهذا الرقم
      const { data: bookings, error } = await supabase
        .from('Booking')
        .select('*')
        .eq('patient_phone', clean)
        .in('status', ['pending', 'confirmed'])
        .order('booking_date', { ascending: false })
        .limit(1);

      if (error || !bookings || bookings.length === 0) {
        setErrorMsg('لم يتم العثور على حجز نشط لهذا الرقم اليوم. يرجى مراجعة الاستقبال.');
      } else {
        const currentBooking = bookings[0];
        let coupon = currentBooking.discount_coupon;

        if (!coupon) {
          coupon = `CARE-${Math.floor(1000 + Math.random() * 9000)}`;
        }

        // تحديث الحجز إلى مكتمل وحفظ الكوبون
        await supabase
          .from('Booking')
          .update({
            status: 'completed',
            verified_by_patient: true,
            discount_coupon: coupon
          })
          .eq('id', currentBooking.id);

        setSuccessBooking({ ...currentBooking, discount_coupon: coupon });
      }
    } catch (err) {
      setErrorMsg('حدث خطأ في النظام. يرجى المحاولة لاحقاً.');
    }
    setLoading(false);
  };

  return (
    <div className="bg-slate-800 border border-slate-700 max-w-md w-full p-6 sm:p-8 rounded-3xl shadow-2xl text-center space-y-5">
      <div className="w-16 h-16 bg-teal-500/10 text-teal-400 rounded-2xl flex items-center justify-center mx-auto border border-teal-500/20">
        <QrCode className="w-8 h-8" />
      </div>

      {!successBooking ? (
        <div className="space-y-4 text-right">
          <div className="text-center">
            <h1 className="text-xl font-black text-white">توثيق حضور المريض بالعيادة</h1>
            <p className="text-xs text-slate-400 mt-1">
              سجّل وصولك لتأكيد كشفك الطبي واستلام كود خصم 15% لموعدك القادم فوراً.
            </p>
          </div>

          <form onSubmit={handleSelfCheckin} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">رقم الهاتف المسجل به الحجز</label>
              <div className="relative flex items-center" dir="ltr">
                <span className="bg-slate-900 border border-r-0 border-slate-700 rounded-l-xl px-3 py-2.5 text-xs font-bold text-slate-400">
                  🇾🇪 +967
                </span>
                <input
                  type="tel"
                  required
                  placeholder="77xxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-r-xl text-sm text-white font-mono outline-none text-right focus:border-teal-500"
                />
              </div>
            </div>

            {errorMsg && (
              <p className="text-rose-400 text-xs p-2.5 bg-rose-950/40 border border-rose-800/40 rounded-xl">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              توثيق الحضور وتفعيل الخصم
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" /> تم توثيق حضورك في العيادة بنجاح!
          </div>

          <h2 className="text-lg font-black text-white">أهلاً بك أستاذ/ة {successBooking.patient_name}</h2>
          <p className="text-xs text-slate-300">
            تم إشعار استقبال العيادة بتواجدك، وتأكيد موعدك لدى د. {successBooking.doctor_name}.
          </p>

          <div className="p-4 bg-teal-900/40 border border-teal-500/40 rounded-2xl text-right space-y-2">
            <span className="text-xs font-bold text-teal-300 flex items-center gap-1">
              <Gift className="w-4 h-4 text-teal-400" /> كود خصمك المهدى (15%):
            </span>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-teal-500/30 text-center font-mono font-black text-amber-400 text-base">
              {successBooking.discount_coupon}
            </div>
            <p className="text-[10px] text-slate-400 text-center">
              احتفظ بهذا الكود لاستخدامه في زيارتك القادمة عبر المنصة.
            </p>
          </div>

          <a
            href="/"
            className="inline-block w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition"
          >
            العودة للمنصة
          </a>
        </div>
      )}
    </div>
  );
}

export default function CheckinPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <Suspense fallback={<Loader2 className="w-8 h-8 text-teal-400 animate-spin" />}>
        <CheckinContent />
      </Suspense>
    </main>
  );
}
