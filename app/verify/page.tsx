'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { CheckCircle2, HeartPulse, Loader2, Star } from 'lucide-react';

function PatientVerifyContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [rating, setRating] = useState(5);

  useEffect(() => {
    if (bookingId) {
      handleVerify();
    } else {
      setLoading(false);
    }
  }, [bookingId]);

  const handleVerify = async () => {
    try {
      const { error } = await supabase
        .from('Booking')
        .update({ 
          status: 'completed',
          verified_by_patient: true 
        })
        .eq('id', bookingId);

      if (!error) {
        setConfirmed(true);
      }
    } catch (e) {
      console.log('Error verifying', e);
    }
    setLoading(false);
  };

  return (
    <div className="bg-slate-800 border border-slate-700 max-w-md w-full p-8 rounded-3xl shadow-2xl text-center space-y-5">
      <div className="w-16 h-16 bg-teal-500/10 text-teal-400 rounded-2xl flex items-center justify-center mx-auto border border-teal-500/20">
        <HeartPulse className="w-8 h-8" />
      </div>

      {loading ? (
        <div className="space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-teal-400 mx-auto" />
          <p className="text-xs text-slate-400">جاري تأكيد زيارتك الطبية...</p>
        </div>
      ) : confirmed ? (
        <div className="space-y-4">
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" /> تم توثيق زيارتك بنجاح
          </div>
          <h1 className="text-xl font-black">نتمنى لك دوام الصحة والعافية!</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            شكراً لتأكيد حضورك لدى الطبيب عبر المنصة الطبية. يساعدنا تأكيدك في تحسين جودة الرعاية الطبية.
          </p>

          {/* تقييم الطبيب */}
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
            className="inline-block mt-3 px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-teal-600/30"
          >
            العودة للمنصة الطبية
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
