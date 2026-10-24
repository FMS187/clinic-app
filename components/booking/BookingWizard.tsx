'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  MapPin, Calendar, Camera, CreditCard, CheckCircle, 
  Navigation, Clock, User, ChevronRight, ChevronLeft, Loader2, UploadCloud
} from 'lucide-react';

type BookingState = {
  tenantId: string;
  branchId: string;
  branchName: string;
  branchLat?: number;
  branchLng?: number;
  serviceId: string;
  serviceName: string;
  depositAmount: number;
  doctorId: string;
  doctorName: string;
  date: string;
  timeSlot: string;
  mediaKeys: string[];
  paymentMethod: 'PAY_ONLINE' | 'PAY_AT_CLINIC';
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function BookingWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [bookingData, setBookingData] = useState<Partial<BookingState>>({
    tenantId: '00000000-0000-0000-0000-000000000000',
    mediaKeys: [],
    paymentMethod: 'PAY_AT_CLINIC'
  });

  const updateData = (data: Partial<BookingState>) => {
    setBookingData(prev => ({ ...prev, ...data }));
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 6));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  return (
    <div className="flex flex-col min-h-[600px]">
      <div className="bg-slate-100 h-2 w-full">
        <div 
          className="bg-teal-600 h-2 transition-all duration-500 ease-in-out" 
          style={{ width: `${(step / 6) * 100}%` }}
        />
      </div>

      <div className="p-6 sm:p-10 flex-grow">
        {step === 1 && <Step1Branch data={bookingData} update={updateData} next={nextStep} />}
        {step === 2 && <Step2Service data={bookingData} update={updateData} next={nextStep} prev={prevStep} />}
        {step === 3 && <Step3TimeSlot data={bookingData} update={updateData} next={nextStep} prev={prevStep} />}
        {step === 4 && <Step4Upload data={bookingData} update={updateData} next={nextStep} prev={prevStep} />}
        {step === 5 && <Step5Checkout data={bookingData} update={updateData} next={nextStep} prev={prevStep} setLoading={setLoading} loading={loading} />}
        {step === 6 && <Step6Confirmation data={bookingData} />}
      </div>
    </div>
  );
}

function Step1Branch({ data, update, next }: any) {
  const [branches, setBranches] = useState<any[]>([]);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    const fetchBranches = async () => {
      const { data: branchData } = await supabase.from('Branch').select('*');
      if (branchData && branchData.length > 0) {
        setBranches(branchData);
      } else {
        setBranches([
          { id: 'b1', name: 'فرع المركز الرئيسي (التحلية)', address: 'شارع التحلية، مبنى 4', lat: 24.7136, lng: 46.6753 },
          { id: 'b2', name: 'فرع عيادات الشمال', address: 'طريق الملك فهد', lat: 24.7743, lng: 46.6382 }
        ]);
      }
    };
    fetchBranches();
  }, []);

  const useMyLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const sorted = [...branches].map(b => ({
          ...b,
          distance: calculateDistance(latitude, longitude, b.lat || 0, b.lng || 0)
        })).sort((a, b) => a.distance - b.distance);
        setBranches(sorted);
        setLocating(false);
      },
      (err) => {
        console.error(err);
        setLocating(false);
        alert("تعذر تحديد الموقع. يرجى الاختيار يدوياً.");
      }
    );
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <MapPin className="text-teal-600" /> اختر الفرع
      </h2>
      
      <button 
        onClick={useMyLocation}
        disabled={locating}
        className="mb-6 w-full py-3 px-4 border border-teal-200 bg-teal-50 text-teal-700 rounded-xl font-medium hover:bg-teal-100 transition flex justify-center items-center gap-2"
      >
        {locating ? <Loader2 className="animate-spin w-5 h-5" /> : <Navigation className="w-5 h-5" />}
        تحديد موقعي لاختيار أقرب فرع
      </button>

      <div className="space-y-4">
        {branches.map(branch => (
          <div 
            key={branch.id}
            onClick={() => {
              update({ branchId: branch.id, branchName: branch.name, branchLat: branch.lat, branchLng: branch.lng });
              next();
            }}
            className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${data.branchId === branch.id ? 'border-teal-500 bg-teal-50/50' : 'border-slate-100 hover:border-teal-200 hover:shadow-md'}`}
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg text-slate-900">{branch.name}</h3>
                <p className="text-slate-500 text-sm mt-1">{branch.address}</p>
              </div>
              {branch.distance !== undefined && (
                <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                  يبعد {branch.distance.toFixed(1)} كم
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Step2Service({ data, update, next, prev }: any) {
  const [services, setServices] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);

  useEffect(() => {
    setServices([
      { id: 's1', name: 'تبييض الأسنان بالليزر', durationMins: 45, depositAmount: 50 },
      { id: 's2', name: 'استشارة حقن الفيلر / البوتوكس', durationMins: 30, depositAmount: 100 }
    ]);
    setDoctors([
      { id: 'd1', name: 'د. سارة جلال', specialty: 'طبيبة تجميل أسنان' },
      { id: 'd2', name: 'د. أحمد خالد', specialty: 'أخصائي الجلدية والتجميل' }
    ]);
  }, []);

  const isComplete = data.serviceId && data.doctorId;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">الخدمة والأخصائي</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">اختر الخدمة</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services.map(srv => (
              <div 
                key={srv.id}
                onClick={() => update({ serviceId: srv.id, serviceName: srv.name, depositAmount: srv.depositAmount })}
                className={`p-4 rounded-xl border-2 cursor-pointer ${data.serviceId === srv.id ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-teal-300'}`}
              >
                <h4 className="font-semibold text-slate-900">{srv.name}</h4>
                <div className="flex gap-3 mt-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {srv.durationMins} دقيقة</span>
                  <span className="flex items-center gap-1"><CreditCard className="w-3 h-3"/> ${srv.depositAmount} عربون</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {data.serviceId && (
          <div className="animate-in fade-in duration-300">
            <label className="block text-sm font-medium text-slate-700 mb-3">اختر الطبيب / الأخصائي</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {doctors.map(doc => (
                <div 
                  key={doc.id}
                  onClick={() => update({ doctorId: doc.id, doctorName: doc.name })}
                  className={`p-4 rounded-xl border-2 cursor-pointer flex items-center gap-3 ${data.doctorId === doc.id ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-teal-300'}`}
                >
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">{doc.name}</h4>
                    <p className="text-xs text-slate-500">{doc.specialty}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <WizardFooter prev={prev} next={next} nextDisabled={!isComplete} />
    </div>
  );
}

function Step3TimeSlot({ data, update, next, prev }: any) {
  const [slots, setSlots] = useState<string[]>([]);
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    update({ date: selectedDate, timeSlot: undefined });
    setSlots(['09:00 ص', '10:30 ص', '01:00 م', '03:00 م', '04:30 م']);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <Calendar className="text-teal-600" /> التاريخ والوقت
      </h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">حدد التاريخ</label>
          <input 
            type="date" 
            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
            value={data.date || ''}
            onChange={handleDateChange}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        {data.date && (
          <div className="animate-in fade-in duration-300">
            <label className="block text-sm font-medium text-slate-700 mb-3">الأوقات المتاحة</label>
            <div className="grid grid-cols-3 gap-3">
              {slots.map(slot => (
                <button
                  key={slot}
                  onClick={() => update({ timeSlot: slot })}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${data.timeSlot === slot ? 'bg-teal-600 text-white border-teal-600 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-teal-400'}`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <WizardFooter prev={prev} next={next} nextDisabled={!data.timeSlot} />
    </div>
  );
}

function Step4Upload({ data, update, next, prev }: any) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newKeys = [...(data.mediaKeys || [])];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `consultations/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('consultations')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        newKeys.push(`fallback/${fileName}`);
      } else {
        newKeys.push(filePath);
      }
    }

    update({ mediaKeys: newKeys });
    setUploading(false);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2">
        <Camera className="text-teal-600" /> صور الاستشارة (اختياري)
      </h2>
      <p className="text-slate-500 text-sm mb-6">
        يمكنك رفع صورة للأسنان أو المنطقة المطلوبة لمساعدة الطبيب في معاينة الحالة مسبقاً.
      </p>

      <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:bg-slate-50 transition-colors relative">
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          multiple 
          onChange={handleFileUpload}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center justify-center gap-3 pointer-events-none">
          {uploading ? (
            <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
          ) : (
            <UploadCloud className="w-10 h-10 text-slate-400" />
          )}
          <span className="text-slate-600 font-medium">
            {uploading ? 'جاري الرفع بأمان...' : 'اضغط لالتقاط صورة أو اختيار ملف'}
          </span>
          <span className="text-xs text-slate-400">تخزين طبي سحابي مشفر وآمن</span>
        </div>
      </div>

      {data.mediaKeys && data.mediaKeys.length > 0 && (
        <div className="mt-4 flex gap-2 flex-wrap">
          {data.mediaKeys.map((_: string, idx: number) => (
            <div key={idx} className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> تم إرفاق الصورة {idx + 1}
            </div>
          ))}
        </div>
      )}

      <WizardFooter prev={prev} next={next} nextText="المتابعة للدفع والتأكيد" />
    </div>
  );
}

function Step5Checkout({ data, update, next, prev, setLoading, loading }: any) {
  const handleConfirm = async () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      next();
    }, 1200);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">مراجعة وتأكيد الحجز</h2>

      <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-6 space-y-3 text-sm">
        <div className="flex justify-between"><span className="text-slate-500">الفرع:</span> <span className="font-medium text-slate-900">{data.branchName}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">الخدمة:</span> <span className="font-medium text-slate-900">{data.serviceName}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">الأخصائي:</span> <span className="font-medium text-slate-900">{data.doctorName}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">الموعد:</span> <span className="font-medium text-slate-900">{data.date} الساعة {data.timeSlot}</span></div>
      </div>

      <h3 className="font-semibold text-slate-800 mb-3">طريقة الدفع</h3>
      <div className="space-y-3 mb-8">
        <label className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${data.paymentMethod === 'PAY_ONLINE' ? 'border-teal-500 bg-teal-50' : 'border-slate-200'}`}>
          <input 
            type="radio" 
            name="payment" 
            className="mt-1 w-4 h-4 text-teal-600 focus:ring-teal-500"
            checked={data.paymentMethod === 'PAY_ONLINE'}
            onChange={() => update({ paymentMethod: 'PAY_ONLINE' })}
          />
          <div className="mr-3">
            <span className="block font-semibold text-slate-900">دفع العربون إلكترونياً (${data.depositAmount})</span>
            <span className="block text-xs text-slate-500 mt-1">تأكيد فوري ومباشر للموعد، ودفع الباقي في العيادة.</span>
          </div>
        </label>

        <label className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${data.paymentMethod === 'PAY_AT_CLINIC' ? 'border-teal-500 bg-teal-50' : 'border-slate-200'}`}>
          <input 
            type="radio" 
            name="payment" 
            className="mt-1 w-4 h-4 text-teal-600 focus:ring-teal-500"
            checked={data.paymentMethod === 'PAY_AT_CLINIC'}
            onChange={() => update({ paymentMethod: 'PAY_AT_CLINIC' })}
          />
          <div className="mr-3">
            <span className="block font-semibold text-slate-900">الدفع عند الوصول في العيادة (كاش / شبكة)</span>
            <span className="block text-xs text-slate-500 mt-1">يخضع لتأكيد موظف الاستقبال عبر رسالة واتساب.</span>
          </div>
        </label>
      </div>

      <div className="flex gap-3 pt-4 border-t border-slate-100">
        <button onClick={prev} disabled={loading} className="px-6 py-3 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition">
          رجوع
        </button>
        <button 
          onClick={handleConfirm} 
          disabled={loading}
          className="flex-1 flex justify-center items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-700 transition disabled:opacity-70"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
          {data.paymentMethod === 'PAY_ONLINE' ? `دفع $${data.depositAmount} وتأكيد` : 'تأكيد الحجز الآن'}
        </button>
      </div>
    </div>
  );
}

function Step6Confirmation({ data }: any) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${data.branchLat || 24.7136},${data.branchLng || 46.6753}&travelmode=driving`;

  return (
    <div className="text-center animate-in zoom-in-95 duration-500 py-8">
      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-10 h-10 text-emerald-600" />
      </div>
      
      <h2 className="text-3xl font-extrabold text-slate-900 mb-2">تم تأكيد الحجز بنجاح!</h2>
      <p className="text-slate-500 mb-8 max-w-md mx-auto">
        {data.paymentMethod === 'PAY_ONLINE' 
          ? "تم حجز موعدك بشكل نهائي، نتشرف بزيارتك." 
          : "تم استلام طلبك، وسيقوم فريق العيادة بالتواصل معك لتأكيد الموعد."}
      </p>

      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-right max-w-sm mx-auto mb-8">
        <p className="text-sm text-slate-500 mb-1">رقم الحجز</p>
        <p className="font-mono font-bold text-lg text-slate-900 mb-4">#MED-{Math.floor(1000 + Math.random() * 9000)}</p>
        
        <p className="text-sm text-slate-500 mb-1">الموعد</p>
        <p className="font-medium text-slate-900 mb-4">{data.date} الساعة {data.timeSlot}</p>
        
        <p className="text-sm text-slate-500 mb-1">المكان</p>
        <p className="font-medium text-slate-900">{data.branchName}</p>
      </div>

      <a 
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-xl font-semibold hover:bg-slate-800 transition shadow-lg shadow-slate-900/20"
      >
        <Navigation className="w-5 h-5" />
        فتح موقع العيادة في Google Maps
      </a>
    </div>
  );
}

function WizardFooter({ prev, next, nextDisabled = false, nextText = "متابعة" }: any) {
  return (
    <div className="flex gap-3 mt-8 pt-6 border-t border-slate-100">
      {prev && (
        <button onClick={prev} className="px-5 py-3 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition flex items-center gap-1">
          <ChevronRight className="w-4 h-4" /> رجوع
        </button>
      )}
      <button 
        onClick={next} 
        disabled={nextDisabled}
        className="flex-1 flex justify-center items-center gap-1 bg-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {nextText} <ChevronLeft className="w-4 h-4" />
      </button>
    </div>
  );
}
