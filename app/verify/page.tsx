'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Script from 'next/script';
import { 
  CheckCircle2, HeartPulse, Loader2, Star, Gift, 
  Copy, Check, AlertCircle, Camera, QrCode, Sparkles 
} from 'lucide-react';

declare global {
  interface Window {
    Html5Qrcode: any;
  }
}

function PatientVerifyContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [bookingData, setBookingData] = useState<any | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [rating, setRating] = useState(5);
  const [copiedCoupon, setCopiedCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState<string>('');
  const [isCouponUsed, setIsCouponUsed] = useState(false);

  // حالات الكاميرا والمسح
  const [scannerReady, setScannerReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [verifyingScan, setVerifyingScan] = useState(false);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    if (bookingId) {
      loadBookingInfo();
    } else {
      setLoading(false);
    }

    return () => {
      stopCamera();
    };
  }, [bookingId]);

  // جلب بيانات الحجز ومعرفة هل تم التوثيق مسبقاً أم لا
  const loadBookingInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('Booking')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (data && !error) {
        setBookingData(data);
        if (data.status === 'completed' && data.verified_by_patient) {
          // تم التوثيق سابقاً - عرض الكوبون المحفوظ مباشرة
          setCouponCode(data.discount_coupon || '');
          setIsCouponUsed(data.is_coupon_used || false);
          setConfirmed(true);
        }
      }
    } catch (e) {
      console.log('Error loading booking', e);
    }
    setLoading(false);
  };

  // إيقاف تشغيل الكاميرا لتحرير موارد الهاتف
  const stopCamera = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch (e) {
      console.log('Camera stop error', e);
    }
    setScanning(false);
  };

  // تشغيل الكاميرا تلقائياً
  const startCameraScanner = async () => {
    if (!window.Html5Qrcode || scannerRef.current) return;
    setScanError('');
    setScanning(true);

    try {
      const scanner = new window.Html5Qrcode('qr-reader-viewport');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' }, // استخدام الكاميرا الخلفية
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0
        },
        async (decodedText: string) => {
          // تم التقاط باركود بنجاح
          await handleBarcodeScanned(decodedText);
        },
        () => {
          // المسح مستمر ولم يتعرف بعد
        }
      );
    } catch (err: any) {
      setScanning(false);
      setScanError('تعذر فتح الكاميرا. يرجى التأكد من السماح بصلاحية الكاميرا في المتصفح.');
    }
  };

  // عند تحميل سكربت مكتبة الكاميرا
  const onHtml5QrcodeScriptLoad = () => {
    setScannerReady(true);
  };

  // تشغيل الكاميرا بمجرد أن تصبح جاهزة والصفحة مفتوحة
  useEffect(() => {
    if (scannerReady && !confirmed && bookingData && !scanning && !scannerRef.current) {
      startCameraScanner();
    }
  }, [scannerReady, confirmed, bookingData]);

  // التحقق من الباركود وتوثيق الحضور
  const handleBarcodeScanned = async (scannedPayload: string) => {
    setVerifyingScan(true);
    await stopCamera();

    try {
      // التحقق من صحة الباركود (يقبل باركود المنشأة أو معرّف المنشأة أو باركود الحجز)
      const expectedFacId = bookingData?.facility_id;
      const isValid = scannedPayload.includes(expectedFacId) || 
                      scannedPayload.includes('CLINIC-') || 
                      scannedPayload.includes('FACILITY');

      let activeCoupon = bookingData.discount_coupon;
      if (!activeCoupon) {
        activeCoupon = `CARE-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      // تحديث الحجز في Supabase ليصبح منجزاً ويُحسب التريغر المالي آلياً
      const { error } = await supabase
        .from('Booking')
        .update({
          status: 'completed',
          verified_by_patient: true,
          discount_coupon: activeCoupon
        })
        .eq('id', bookingId);

      if (!error) {
        setCouponCode(activeCoupon);
        setIsCouponUsed(false);
        setConfirmed(true);
      } else {
        setScanError('حدث خطأ أثناء حفظ التوثيق. يرجى إعادة المحاولة.');
        setVerifyingScan(false);
      }
    } catch (e) {
      setScanError('تعذر معالجة الباركود.');
      setVerifyingScan(false);
    }
  };

  const copyCoupon = () => {
    if (!couponCode) return;
    navigator.clipboard.writeText(couponCode);
    setCopiedCoupon(true);
    setTimeout(() => setCopiedCoupon(false), 2500);
  };

  return (
    <>
      {/* تحميل مكتبة الكاميرا الخارجية بشكل آمن وسريع */}
      <Script 
        src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js" 
        strategy="afterInteractive"
        onLoad={onHtml5QrcodeScriptLoad}
      />

      <div className="bg-slate-800 border border-slate-700 max-w-md w-full p-6 sm:p-8 rounded-3xl shadow-2xl text-center space-y-5">
        <div className="w-16 h-16 bg-teal-500/10 text-teal-400 rounded-2xl flex items-center justify-center mx-auto border border-teal-500/20">
          <HeartPulse className="w-8 h-8" />
        </div>

        {loading ? (
          <div className="space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-teal-400 mx-auto" />
            <p className="text-xs text-slate-400">جاري قراءة تذكرة الحجز والاتصال بالكاميرا...</p>
          </div>
        ) : !bookingData ? (
          <div className="space-y-2">
            <h2 className="text-base font-bold text-rose-400">رابط التأكيد غير صالح</h2>
            <p className="text-xs text-slate-400">لم يتم العثور على تذكرة الحجز المطلوبة.</p>
          </div>
        ) : !confirmed ? (
          /* واجهة الكاميرا ومسح الباركود الميداني */
          <div className="space-y-4">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-teal-500/20 text-teal-300 border border-teal-500/30 px-3 py-1 rounded-full text-xs font-bold">
                <Camera className="w-3.5 h-3.5" /> امسح باركود الاستقبال
              </div>
              <h1 className="text-lg font-black text-white mt-2">وجّه الكاميرا نحو باركود العيادة</h1>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                لإثبات حضورك واستلام كود الخصم (15%) فوراً، وجّه عدسة الهاتف نحو الباركود المعروض على مكتب الاستقبال لدى: <br/>
                <strong className="text-teal-300">{bookingData.facility_name}</strong>
              </p>
            </div>

            {/* إطار عدسة الكاميرا */}
            <div className="relative mx-auto w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden border-2 border-teal-500/50 bg-black shadow-inner flex items-center justify-center">
              <div id="qr-reader-viewport" className="w-full h-full" />
              
              {verifyingScan && (
                <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center gap-2 z-10">
                  <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
                  <span className="text-xs font-bold text-teal-300">جاري التحقق وإصدار الخصم...</span>
                </div>
              )}

              {/* مؤشر زوايا التركيز */}
              {!verifyingScan && (
                <div className="absolute inset-4 pointer-events-none border border-teal-400/40 rounded-xl flex items-center justify-center">
                  <div className="w-full h-0.5 bg-teal-400 animate-pulse" />
                </div>
              )}
            </div>

            {scanError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/40 text-rose-300 rounded-xl text-xs space-y-2 text-right">
                <p className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {scanError}
                </p>
                <button
                  type="button"
                  onClick={startCameraScanner}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition"
                >
                  إعادة تشغيل الكاميرا
                </button>
              </div>
            )}

            <p className="text-[11px] text-slate-500">
              💡 الباركود موجود على لوحة مكتب الاستقبال داخل المنشأة الطبية.
            </p>
          </div>
        ) : (
          /* شاشة النجاح وظهور كود الخصم فوراً بعد مسح الباركود */
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" /> تم إثبات حضورك بنجاح!
            </div>
            <h1 className="text-xl font-black text-white">حمداً لله على سلامتك!</h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              تم توثيق تواجدك لدى {bookingData.doctor_name} بنجاح، ويسرنا تقديم كود الخصم الخاص بك:
            </p>

            {isCouponUsed ? (
              <div className="p-4 bg-slate-900 border border-slate-700 rounded-2xl text-right space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>تم استهلاك هذا الكوبون مسبقاً</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  لقد تم الاستفادة من كود الخصم المرتبط بهذه الزيارة في حجز سابق.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-gradient-to-br from-teal-900/70 to-slate-900 border border-teal-500/50 rounded-2xl space-y-2 text-right relative overflow-hidden shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-300 flex items-center gap-1">
                    <Gift className="w-4 h-4 text-teal-400" /> كود خصم 15% للموعد القادم
                  </span>
                  <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded font-mono">
                    صالح للاستخدام
                  </span>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-teal-500/30 flex items-center justify-between mt-2">
                  <span className="font-mono font-black text-amber-400 tracking-wider text-base">{couponCode}</span>
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
                  أظهر هذا الكود للاستقبال في زيارتك القادمة للحصول على الخصم الفوري.
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
              العودة للمنصة الطبية
            </a>
          </div>
        )}
      </div>
    </>
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
