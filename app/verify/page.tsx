'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { CheckCircle2, HeartPulse, Loader2, Star, Gift, Copy, Check, AlertCircle } from 'lucide-react';

function PatientVerifyContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [rating, setRating] = useState(5);
  const [copiedCoupon, setCopiedCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState<string>('');
  const [isCouponUsed, setIsCouponUsed] = useState(false);

  useEffect(() => {
    if (bookingId) {
      handleVerifyAndLoadCoupon();
    } else {
      setLoading(false);
    }
  }, [bookingId]);

  const handleVerifyAndLoadCoupon = async () => {
    try {
      // 1. جلب بيانات الحجز للتحقق من وجود كود سابق أو استخدامه
      const { data: bookingData } = await supabase
        .from('Booking')
        .select('id, discount_coupon, is_coupon_used, status, verified_by_patient')
        .eq('id', bookingId)
        .single();

      if (bookingData) {
        let activeCoupon = bookingData.discount_coupon;

        // إذا لم يكن لديه كود سابق، يتم توليده لمرة واحدة فقط وحفظه بقاعدة البيانات
        if (!activeCoupon) {
          activeCoupon = `CARE-${Math.floor(1000 + Math.random() * 9000)}`;
          await supabase
            .from('Booking')
            .update({
              status: 'completed',
              verified_by_patient: true,
              discount_coupon: activeCoupon
            })
            .eq('id', bookingId);
        } else if (!bookingData.verified_by_patient) {
          await supabase
            .from('Booking')
            .update({
              status: 'completed',
              verified_by_patient: true
            })
            .eq('id', bookingId);
        }

        setCouponCode(activeCoupon);
        setIsCouponUsed(bookingData.is_coupon_used || false);
        setConfirmed(true);
      }
    } catch (e) {
      console.log('Error verifying', e);
    }
    setLoading(false);
  };

  const copyCoupon = () => {
    if (!couponCode) return;
    navigator.clipboard.writeText(couponCode);
    setCopiedCoupon(true);
    setTimeout(() => setCopiedCoupon(false), 2500);
  };

  return (
    <div className="bg-slate-800 border border-slate-700 max-w-md w-full p-6 sm:p-8 rounded-3xl shadow-2xl text-center space-y-5">
      <div className="w-16 h-16 bg-teal-500/10 text-teal-400 rounded-2xl flex items-center justify-center mx-auto border border-teal-500/20">
        <HeartPulse className="w-8 h-8" />
      </div>

      {loading ? (
        <div className="space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-teal-400 mx-auto" />
          <p className="text-xs text-slate-400">جاري مطابقة زيارتك الطبية والتحقق من الكوبون...</p>
        </div>
      ) : confirmed ? (
        <div className="space-y-4">
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" /> تم توثيق زيارتك بنجاح
          </div>
          <h1 className="text-xl font-black">حمداً لله على سلامتك!</h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            شكراً لتوثيق حضورك الطبي عبر المنصة.
          </p>

          {/* فحص ما إذا كان الكوبون مستخدماً مسبقاً أم متاحاً */}
          {isCouponUsed ? (
            <div className="p-4 bg-slate-900 border border-slate-700 rounded-2xl text-right space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>تم استخدام كوبون الخصم الخاص بهذه الزيارة مسبقاً</span>
              </div>
              <p className="text-[11px] text-slate-400">
                لقد تم الاستفادة من كود الخصم المرتبط بهذا الحجز في موعد سابق. نتمنى لك دوام الصحة والعافية!
              </p>
            </div>
          ) : (
            <div className="p-4 bg-gradient-to-br from-teal-900/60 to-slate-900 border border-teal-500/40 rounded-2xl space-y-2 text-right relative overflow-hidden shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-300 flex items-center gap-1">
                  <Gift className="w-4 h-4 text-teal-400" /> كود خصم 15% للموعد القادم
                </span>
                <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded font-mono">
                  صالح للاستخدام مرة واحدة
                </span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-teal-500/30 flex items-center justify-between mt-2">
                <span className="font-mono font-black text-amber-400 tracking-wider text-sm">{couponCode}</span>
                <button
                  type="button"
                  onClick={copyCoupon}
                  className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1"
                >
                  {copiedCoupon ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCoupon ? 'تم النسخ!' : 'نسخ الكود'}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 text-center pt-1">
                الكود ثابت ومربوط برقم ملفك؛ أظهره للاستقبال أو استخدمه في حجزك القادم.
              </p>
            </div>
          )}

          {/* تقييم العيادة */}
          <div className="pt-2 border-t border-slate-700/60">
            <span className="text-xs text-slate-400 block mb-2">تقييمك لتعامل الطبيب والعيادة:</span>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 text-amber-400 hover:scale-110 transition"
                >
                  <Star className={`w-6 h-6 ${star <= rating ? 'fill-amber-400' : 'text-slate-600'}`} />
                </button>
              ))}
            </div>
          </div>

          <a
            href="/"
            className="inline-block w-full py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-teal-600/30"
          >
            استكشاف المزيد من الأطباء والخدمات
          </a>
        </div>
      ) : (
        <div className="space-y-2">
          <h2 className="text-base font-bold text-rose-400">رابط التأكيد غير صالح</h2>
          <p className="text-xs text-slate-400">لم يتم العثور على تذكرة الحجز المطلوبة.</p>
        </div>
      )}
    </div>
  );
}

export default function PatientVerifyPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <Suspense fallback={<Loader2 className="w-8 h-8 text-teal-400 animate-spin" />}>
        <PatientVerifyContent />
      </Suspense>
    </main>
  );
}
