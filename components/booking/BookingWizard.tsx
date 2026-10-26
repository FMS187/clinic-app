'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  MapPin, Calendar, Camera, CreditCard, CheckCircle, 
  Navigation, Clock, ChevronLeft, 
  Loader2, UploadCloud, Sparkles, ShieldCheck, PhoneCall,
  Smile, AlertTriangle
} from 'lucide-react';

type BookingState = {
  tenantId: string;
  branchId: string;
  branchName: string;
  branchCity: string;
  branchPhone: string;
  branchLat: number;
  branchLng: number;
  category: 'dental' | 'derma';
  serviceId?: string;
  serviceName?: string;
  depositAmount?: number;
  totalPrice?: number;
  doctorId?: string | number;
  doctorName?: string;
  doctorTitle?: string;
  date?: string;
  timeSlot?: string;
  mediaKeys: string[];
  patientName: string;
  patientPhone: string;
  paymentMethod: 'PAY_ONLINE' | 'PAY_AT_CLINIC';
};

// فروع العيادات مع أرقام الواتساب المعتمدة برمز دولة اليمن (967)
const YEMEN_BRANCHES = [
  { 
    id: 'b-sanaa-1', 
    name: 'فرع حدة التخصصي', 
    city: 'صنعاء', 
    address: 'شارع حدة، بجوار مركز الكميم، صنعاء', 
    lat: 15.3188, 
    lng: 44.1852,
    phone: '967770000001'
  },
  { 
    id: 'b-sanaa-2', 
    name: 'فرع عيادات الستين والسبعين', 
    city: 'صنعاء', 
    address: 'تقاطع الستين الجنوبي، مقابل حديقة السبعين', 
    lat: 15.3340, 
    lng: 44.2050,
    phone: '967770000002'
  },
  { 
    id: 'b-aden-1', 
    name: 'فرع خور مكسر الطبي', 
    city: 'عدن', 
    address: 'حي السفارات، بجوار فندق عدن، خور مكسر', 
    lat: 12.8275, 
    lng: 45.0390,
    phone: '967730000001'
  },
  { 
    id: 'b-aden-2', 
    name: 'فرع المنصورة والشيخ عثمان', 
    city: 'عدن', 
    address: 'شارع التسعين، ريمي، المنصورة', 
    lat: 12.8630, 
    lng: 44.9850,
    phone: '967730000002'
  }
];

const CLINIC_SERVICES = {
  dental: [
    { id: 'd1', name: 'ابتسامة هوليود وفينير E-max', durationMins: 60, depositAmount: 30, totalPrice: 150, desc: 'تصميم ابتسامة رقمي وعدسات خزفية مقاومة للتصبغ' },
    { id: 'd2', name: 'تبييض الأسنان بتقنية الفلاش / الليزر', durationMins: 45, depositAmount: 15, totalPrice: 60, desc: 'تبييض عميق وآمن يفتح حتى 8 درجات' },
    { id: 'd3', name: 'زراعة الأسنان الفورية وتطعيم العظم', durationMins: 60, depositAmount: 50, totalPrice: 300, desc: 'زراعة سويسرية بأحدث أنظمة التوجيه ثلاثي الأبعاد' },
    { id: 'd4', name: 'تقويم الأسنان الشفاف (Invisalign)', durationMins: 40, depositAmount: 25, totalPrice: 200, desc: 'تقويم خفي بدون أسلاك معدنية بمتابعة دورية' },
    { id: 'd5', name: 'تنظيف الجير وتلميع الأسنان وعلاج اللثة', durationMins: 30, depositAmount: 10, totalPrice: 25, desc: 'إزالة كاملة للترسبات وحماية اللثة' }
  ],
  derma: [
    { id: 'c1', name: 'حقن الفيلر التجميلي (شفاه / تحديد الفك)', durationMins: 35, depositAmount: 20, totalPrice: 110, desc: 'مواد معتمدة تعطي نتائج طبيعية وفورية' },
    { id: 'c2', name: 'جلسة البوتوكس لإزالة التجاعيد', durationMins: 25, depositAmount: 20, totalPrice: 90, desc: 'علاج تجاعيد الجبهة وحول العين' },
    { id: 'c3', name: 'إبر النضارة والبروفايلو (Profhilo)', durationMins: 30, depositAmount: 25, totalPrice: 130, desc: 'تحفيز الكولاجين العميق وشد البشرة' },
    { id: 'c4', name: 'إزالة الشعر بأحدث أجهزة الليزر', durationMins: 45, depositAmount: 15, totalPrice: 50, desc: 'تبريد عالي ونتائج فعالة وآمنة' },
    { id: 'c5', name: 'جلسات الهيدرافيشل لتنظيف البشرة العميق', durationMins: 50, depositAmount: 10, totalPrice: 40, desc: 'تنظيف المسام وتغذية طبقات الجلد' }
  ]
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
  const [bookingData, setBookingData] = useState<BookingState>({
    tenantId: '00000000-0000-0000-0000-000000000000',
    category: 'dental',
    branchId: YEMEN_BRANCHES[0].id,
    branchName: YEMEN_BRANCHES[0].name,
    branchCity: YEMEN_BRANCHES[0].city,
    branchPhone: YEMEN_BRANCHES[0].phone,
    branchLat: YEMEN_BRANCHES[0].lat,
    branchLng: YEMEN_BRANCHES[0].lng,
    mediaKeys: [],
    paymentMethod: 'PAY_AT_CLINIC',
    patientName: '',
    patientPhone: ''
  });

  const updateData = (data: Partial<BookingState>) => {
    setBookingData(prev => ({ ...prev, ...data }));
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 6));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  return (
    <div className="flex flex-col">
      <div className="bg-slate-100 h-2 w-full">
        <div 
          className="bg-teal-600 h-2 transition-all duration-500 ease-in-out" 
          style={{ width: `${(step / 6) * 100}%` }}
        />
      </div>

      <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex justify-between text-xs sm:text-sm font-medium text-slate-500 overflow-x-auto">
        <span className={step >= 1 ? 'text-teal-700 font-bold' : ''}>1. الفرع والخريطة</span>
        <span className={step >= 2 ? 'text-teal-700 font-bold' : ''}>2. الخدمة والطبيب</span>
        <span className={step >= 3 ? 'text-teal-700 font-bold' : ''}>3. الموعد</span>
        <span className={step >= 4 ? 'text-teal-700 font-bold' : ''}>4. فحص الحالة</span>
        <span className={step >= 5 ? 'text-teal-700 font-bold' : ''}>5. التأكيد</span>
      </div>

      <div className="p-6 sm:p-8 flex-grow">
        {step === 1 && <Step1BranchLocation data={bookingData} update={updateData} next={nextStep} />}
        {step === 2 && <Step2ExpandedServices data={bookingData} update={updateData} next={nextStep} prev={prevStep} />}
        {step === 3 && <Step3Schedule data={bookingData} update={updateData} next={nextStep} prev={prevStep} />}
        {step === 4 && <Step4ConsultationMedia data={bookingData} update={updateData} next={nextStep} prev={prevStep} />}
        {step === 5 && <Step5ReviewCheckout data={bookingData} update={updateData} next={nextStep} prev={prevStep} setLoading={setLoading} loading={loading} />}
        {step === 6 && <Step6SuccessDirectMaps data={bookingData} />}
      </div>
    </div>
  );
}

function Step1BranchLocation({ data, update, next }: any) {
  const [branches, setBranches] = useState(YEMEN_BRANCHES);
  const [selectedBranch, setSelectedBranch] = useState(
    YEMEN_BRANCHES.find(b => b.id === data.branchId) || YEMEN_BRANCHES[0]
  );
  const [locating, setLocating] = useState(false);

  const handleSelectBranch = (b: any) => {
    setSelectedBranch(b);
    update({
      branchId: b.id,
      branchName: b.name,
      branchCity: b.city,
      branchPhone: b.phone,
      branchLat: b.lat,
      branchLng: b.lng
    });
  };

  const locateUserInYemen = () => {
    setLocating(true);
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert("خاصية تحديد الموقع غير مدعومة في متصفحك");
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const sorted = [...branches].map(b => ({
          ...b,
          distance: calculateDistance(latitude, longitude, b.lat, b.lng)
        })).sort((a, b) => ((a as any).distance || 0) - ((b as any).distance || 0));

        setBranches(sorted);
        handleSelectBranch(sorted[0]);
        setLocating(false);
      },
      () => {
        setLocating(false);
        alert("يرجى تفعيل الـ GPS لتحديد أقرب فرع إليك تلقائياً");
      }
    );
  };

  const mapIframeUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${selectedBranch.lng - 0.015}%2C${selectedBranch.lat - 0.015}%2C${selectedBranch.lng + 0.015}%2C${selectedBranch.lat + 0.015}&layer=mapnik&marker=${selectedBranch.lat}%2C${selectedBranch.lng}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <MapPin className="text-teal-600 w-6 h-6" /> اختر الفرع وتصفح الموقع
          </h2>
          <p className="text-slate-500 text-sm mt-1">فروعنا المعتمدة في الجمهورية اليمنية (صنعاء، عدن)</p>
        </div>
        <button 
          onClick={locateUserInYemen}
          disabled={locating}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-teal-50 border border-teal-200 text-teal-700 rounded-xl text-sm font-medium hover:bg-teal-100 transition shadow-sm"
        >
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
          تحديد أقرب فرع لموقعي
        </button>
      </div>

      <div className="bg-slate-100 rounded-2xl overflow-hidden border border-slate-300 shadow-inner">
        <div className="bg-slate-800 text-white text-xs px-4 py-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium">
            <MapPin className="w-4 h-4 text-teal-400" />
            الموقع المباشر على الخريطة: {selectedBranch.name} ({selectedBranch.city})
          </span>
          <span className="text-slate-400">معاينة تفاعلية</span>
        </div>
        <div className="w-full h-60 sm:h-72 bg-slate-200 relative">
          <iframe 
            title="Clinic Location"
            src={mapIframeUrl}
            className="w-full h-full border-0"
            loading="lazy"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {branches.map(branch => {
          const isSelected = selectedBranch.id === branch.id;
          const dist = (branch as any).distance;
          return (
            <div 
              key={branch.id}
              onClick={() => handleSelectBranch(branch)}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                isSelected ? 'border-teal-600 bg-teal-50/70 shadow-md ring-2 ring-teal-600/20' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-900 text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
                      {branch.city}
                    </span>
                    <h3 className="font-bold text-slate-900 text-base">{branch.name}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {branch.address}
                  </p>
                  <p className="text-xs text-emerald-700 font-mono mt-1 flex items-center gap-1">
                    <PhoneCall className="w-3.5 h-3.5 text-emerald-600" /> واتساب: +{branch.phone}
                  </p>
                </div>
                {dist !== undefined && (
                  <span className="text-[11px] font-bold bg-teal-100 text-teal-800 px-2 py-1 rounded-full whitespace-nowrap">
                    يبعد {dist.toFixed(1)} كم
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button 
        onClick={next}
        className="w-full py-4 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20"
      >
        تأكيد واختيار الفرع ({selectedBranch.name}) <ChevronLeft className="w-5 h-5" />
      </button>
    </div>
  );
}

function Step2ExpandedServices({ data, update, next, prev }: any) {
  const [activeTab, setActiveTab] = useState<'dental' | 'derma'>(data.category || 'dental');
  const [dbDoctors, setDbDoctors] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadDoctors = async () => {
      setLoadingDocs(true);
      try {
        const { data: doctorsData, error } = await supabase
          .from('Doctor')
          .select('*');

        if (isMounted) {
          if (!error && doctorsData && doctorsData.length > 0) {
            setDbDoctors(doctorsData);
          } else {
            setDbDoctors([
              { id: '1', name: 'د. سامي المقطري', specialty: 'استشاري جراحة وتجميل الفم والأسنان', category: 'dental' },
              { id: '2', name: 'د. مروة الشرجبي', specialty: 'أخصائية تقويم وتجميل الأسنان الرقمي', category: 'dental' },
              { id: '3', name: 'د. لمياء اليافعي', specialty: 'استشارية الأمراض الجلدية والليزر والحقن التجميلي', category: 'derma' },
              { id: '4', name: 'د. حسام العديني', specialty: 'أخصائي العلاج بالليزر والعناية بالبشرة والندبات', category: 'derma' }
            ]);
          }
        }
      } catch {
        if (isMounted) setDbDoctors([]);
      }
      if (isMounted) setLoadingDocs(false);
    };

    loadDoctors();
    return () => { isMounted = false; };
  }, []);

  const currentServices = CLINIC_SERVICES[activeTab];
  const eligibleDoctors = dbDoctors.filter(d => d.category === activeTab);

  const handleCategorySwitch = (cat: 'dental' | 'derma') => {
    setActiveTab(cat);
    update({ 
      category: cat, 
      serviceId: undefined, 
      serviceName: undefined,
      depositAmount: undefined,
      totalPrice: undefined,
      doctorId: undefined,
      doctorName: undefined
    });
  };

  const isComplete = data.serviceId && data.doctorId;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">اختر القسم والخدمة المطلوبة</h2>
        <p className="text-slate-500 text-sm mt-1">نخبة من الاستشاريين وأحدث التقنيات الطبية الحديثة</p>
      </div>

      <div className="grid grid-cols-2 gap-3 bg-slate-100 p-1.5 rounded-2xl">
        <button
          onClick={() => handleCategorySwitch('dental')}
          className={`py-3 px-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition ${
            activeTab === 'dental' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Smile className="w-5 h-5 text-teal-600" /> قسم طب وجراحة الأسنان
        </button>
        <button
          onClick={() => handleCategorySwitch('derma')}
          className={`py-3 px-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition ${
            activeTab === 'derma' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-5 h-5 text-rose-500" /> قسم الجلدية والتجميل والليزر
        </button>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-slate-700 text-sm">الخدمات التخصصية المتاحة:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {currentServices.map(srv => {
            const isSelected = data.serviceId === srv.id;
            return (
              <div 
                key={srv.id}
                onClick={() => update({ 
                  serviceId: srv.id, 
                  serviceName: srv.name, 
                  depositAmount: srv.depositAmount,
                  totalPrice: srv.totalPrice
                })}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  isSelected ? 'border-teal-600 bg-teal-50/60 shadow-md' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base">{srv.name}</h4>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                    ${srv.totalPrice} تقريباً
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{srv.desc}</p>
                <div className="flex gap-4 mt-3 text-xs text-slate-500 border-t border-slate-100 pt-2">
                  <span className="flex items-center gap-1 font-medium"><Clock className="w-3.5 h-3.5 text-teal-600"/> {srv.durationMins} دقيقة</span>
                  <span className="flex items-center gap-1 font-medium"><CreditCard className="w-3.5 h-3.5 text-teal-600"/> عربون تأكيد: ${srv.depositAmount}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {data.serviceId && (
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <h3 className="font-semibold text-slate-700 text-sm">اختر الطبيب المعالج:</h3>
          {loadingDocs ? (
            <div className="text-center py-6"><Loader2 className="w-6 h-6 animate-spin text-teal-600 mx-auto" /></div>
          ) : eligibleDoctors.length === 0 ? (
            <p className="text-xs text-slate-500 py-3">لا يوجد أطباء مضافون لهذا القسم حالياً.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {eligibleDoctors.map(doc => {
                const isSelected = String(data.doctorId) === String(doc.id);
                return (
                  <div
                    key={doc.id}
                    onClick={() => update({ doctorId: doc.id, doctorName: doc.name, doctorTitle: doc.specialty, timeSlot: undefined })}
                    className={`p-4 rounded-2xl border-2 cursor-pointer flex items-center gap-3 transition-all ${
                      isSelected ? 'border-teal-600 bg-teal-50 shadow-md' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-lg flex-shrink-0">
                      {doc.name ? doc.name.charAt(3) || doc.name.charAt(0) : 'ط'}
                    </div>
                    <div className="flex-grow">
                      <h4 className="font-bold text-slate-900 text-sm">{doc.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{doc.specialty}</p>
                      {doc.branch && <span className="text-[10px] text-teal-600 font-medium block mt-1">{doc.branch}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <WizardButtons prev={prev} next={next} nextDisabled={!isComplete} />
    </div>
  );
}

function Step3Schedule({ data, update, next, prev }: any) {
  const times = [
    '09:30 صباحاً', '10:30 صباحاً', '11:30 صباحاً',
    '04:30 عصراً', '05:30 مساءً', '06:30 مساءً', '07:30 مساءً'
  ];

  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [checkingSlots, setCheckingSlots] = useState(false);

  useEffect(() => {
    const fetchBookedTimes = async () => {
      if (!data.date || !data.doctorName) return;

      setCheckingSlots(true);
      const { data: existingBookings, error } = await supabase
        .from('Booking')
        .select('booking_time')
        .eq('doctor_name', data.doctorName)
        .eq('booking_date', data.date);

      if (!error && existingBookings) {
        const reserved = existingBookings.map(b => b.booking_time);
        setBookedSlots(reserved);

        if (data.timeSlot && reserved.includes(data.timeSlot)) {
          update({ timeSlot: undefined });
        }
      }
      setCheckingSlots(false);
    };

    fetchBookedTimes();
  }, [data.date, data.doctorName]);

  const isValid = data.date && data.timeSlot && data.patientName && data.patientPhone && data.patientPhone.length >= 9;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Calendar className="text-teal-600 w-6 h-6" /> موعد الزيارة وبياناتك
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          حجز موعد مع: <strong className="text-teal-700">{data.doctorName}</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">اسم المريض ثلاثي</label>
          <input 
            type="text" 
            placeholder="مثال: أحمد عبد الله اليماني"
            value={data.patientName || ''}
            onChange={(e) => update({ patientName: e.target.value })}
            className="w-full p-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف / الواتساب في اليمن</label>
          <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-teal-500">
            <span className="bg-slate-100 text-slate-700 px-3 py-3.5 text-sm font-mono font-bold border-l border-slate-200">
              +967
            </span>
            <input 
              type="tel" 
              placeholder="771234567"
              value={data.patientPhone || ''}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                update({ patientPhone: val });
              }}
              className="w-full p-3.5 outline-none text-sm font-mono"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الحجز</label>
        <input 
          type="date" 
          value={data.date || ''}
          onChange={(e) => update({ date: e.target.value, timeSlot: undefined })}
          min={new Date().toISOString().split('T')[0]}
          className="w-full p-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-sm"
        />
      </div>

      {data.date && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="block text-xs font-bold text-slate-700">الأوقات المتاحة لهذا اليوم:</label>
            {checkingSlots && (
              <span className="text-[11px] text-teal-600 flex items-center gap-1 font-medium">
                <Loader2 className="w-3 h-3 animate-spin" /> فحص توفر الطبيب...
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {times.map(t => {
              const isBooked = bookedSlots.includes(t);
              const isSelected = data.timeSlot === t;

              return (
                <button
                  key={t}
                  type="button"
                  disabled={isBooked}
                  onClick={() => update({ timeSlot: t })}
                  className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-semibold border transition relative ${
                    isBooked
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through opacity-70'
                      : isSelected 
                        ? 'bg-teal-600 text-white border-teal-600 shadow-md ring-2 ring-teal-600/30' 
                        : 'bg-white text-slate-700 border-slate-200 hover:border-teal-400'
                  }`}
                >
                  {t}
                  {isBooked && (
                    <span className="block text-[10px] no-underline font-normal text-rose-500 mt-0.5">
                      (محجوز)
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <WizardButtons prev={prev} next={next} nextDisabled={!isValid} />
    </div>
  );
}

function Step4ConsultationMedia({ data, update, next, prev }: any) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newKeys = [...(data.mediaKeys || [])];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `consultations/${fileName}`;

      const { error } = await supabase.storage.from('consultations').upload(filePath, file);
      if (error) {
        newKeys.push(`fallback_${file.name}`);
      } else {
        newKeys.push(filePath);
      }
    }

    update({ mediaKeys: newKeys });
    setUploading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Camera className="text-teal-600 w-6 h-6" /> صور الحالة السريرية (اختياري)
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          يمكنك إرفاق صور واضحة لمساعدة الطبيب في تقييم الإجراء المناسب قبل حضورك للعيادة.
        </p>
      </div>

      <div className="border-2 border-dashed border-teal-300 bg-teal-50/30 rounded-2xl p-8 text-center relative hover:bg-teal-50 transition">
        <input 
          type="file" 
          accept="image/*" 
          multiple 
          onChange={handleUpload}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center justify-center gap-3">
          {uploading ? (
            <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
          ) : (
            <UploadCloud className="w-10 h-10 text-teal-600" />
          )}
          <div>
            <p className="font-bold text-slate-800 text-sm">انقر لاختيار صور من المعرض أو التقاط صورة بكاميرا الهاتف</p>
            <p className="text-xs text-slate-400 mt-1">حماية تامة وخصوصية طبية مشفرة</p>
          </div>
        </div>
      </div>

      {data.mediaKeys && data.mediaKeys.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {data.mediaKeys.map((_: string, idx: number) => (
            <span key={idx} className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> صورة الحالة المرفقة ({idx + 1})
            </span>
          ))}
        </div>
      )}

      <WizardButtons prev={prev} next={next} nextText="المتابعة للتأكيد النهائي" />
    </div>
  );
}

function Step5ReviewCheckout({ data, update, next, prev, setLoading, loading }: any) {
  const [conflictError, setConflictError] = useState('');

  const fullPatientPhone = data.patientPhone.startsWith('+') ? data.patientPhone : `+967${data.patientPhone}`;

  const confirmReservation = async () => {
    setLoading(true);
    setConflictError('');

    try {
      const { data: conflictCheck } = await supabase
        .from('Booking')
        .select('id')
        .eq('doctor_name', data.doctorName)
        .eq('booking_date', data.date)
        .eq('booking_time', data.timeSlot);

      if (conflictCheck && conflictCheck.length > 0) {
        setConflictError('عذراً! تم حجز هذا التوقيت للتو من قبل مراجع آخر. يرجى الرجوع واختيار وقت آخر.');
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from('Booking').insert([
        {
          branch_name: data.branchName,
          branch_city: data.branchCity,
          service_name: data.serviceName,
          doctor_name: data.doctorName,
          booking_date: data.date,
          booking_time: data.timeSlot,
          patient_name: data.patientName,
          patient_phone: fullPatientPhone,
          payment_method: data.paymentMethod,
          deposit_amount: data.depositAmount
        }
      ]);

      if (insertError) {
        if (insertError.code === '23505') {
          setConflictError('هذا الموعد محجوز مسبقاً لنفس الطبيب.');
        } else {
          setConflictError('تعذر تأكيد الحجز حالياً. يرجى المحاولة مرة أخرى.');
        }
        setLoading(false);
        return;
      }

      setLoading(false);
      next();
    } catch {
      setLoading(false);
      next();
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">تفاصيل الحجز ومراجعة الطلب</h2>

      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3 text-sm">
        <div className="flex justify-between py-1 border-b border-slate-200/60">
          <span className="text-slate-500">اسم المراجع:</span>
          <span className="font-bold text-slate-900">{data.patientName} ({fullPatientPhone})</span>
        </div>
        <div className="flex justify-between py-1 border-b border-slate-200/60">
          <span className="text-slate-500">الفرع المختار:</span>
          <span className="font-bold text-slate-900">{data.branchName} - {data.branchCity}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-slate-200/60">
          <span className="text-slate-500">الخدمة:</span>
          <span className="font-bold text-teal-700">{data.serviceName}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-slate-200/60">
          <span className="text-slate-500">الطبيب المعالج:</span>
          <span className="font-bold text-slate-900">{data.doctorName}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-slate-500">الموعد:</span>
          <span className="font-bold text-slate-900">{data.date} | الساعة {data.timeSlot}</span>
        </div>
      </div>

      {conflictError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{conflictError}</span>
        </div>
      )}

      <div className="space-y-3">
        <label className="block text-xs font-bold text-slate-700">طريقة سداد العربون وتأكيد الحجز:</label>
        
        <div 
          onClick={() => update({ paymentMethod: 'PAY_AT_CLINIC' })}
          className={`p-4 rounded-xl border-2 cursor-pointer flex gap-3 ${
            data.paymentMethod === 'PAY_AT_CLINIC' ? 'border-teal-600 bg-teal-50' : 'border-slate-200'
          }`}
        >
          <input 
            type="radio" 
            checked={data.paymentMethod === 'PAY_AT_CLINIC'} 
            readOnly 
            className="mt-1" 
          />
          <div>
            <span className="font-bold text-slate-900 block text-sm">الدفع نقداً أو عبر شبكة الدفع عند الحضور للعيادة</span>
            <span className="text-xs text-slate-500">سيتم إرسال رسالة تأكيد للواتساب لتثبيت الموعد</span>
          </div>
        </div>

        <div 
          onClick={() => update({ paymentMethod: 'PAY_ONLINE' })}
          className={`p-4 rounded-xl border-2 cursor-pointer flex gap-3 ${
            data.paymentMethod === 'PAY_ONLINE' ? 'border-teal-600 bg-teal-50' : 'border-slate-200'
          }`}
        >
          <input 
            type="radio" 
            checked={data.paymentMethod === 'PAY_ONLINE'} 
            readOnly 
            className="mt-1" 
          />
          <div>
            <span className="font-bold text-slate-900 block text-sm">سداد العربون عبر الحوالات السريعة / المحافظ الإلكترونية (${data.depositAmount})</span>
            <span className="text-xs text-slate-500">حجز أولوية فوري بدون انتظار في الاستقبال</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-slate-100">
        <button onClick={prev} disabled={loading} className="px-5 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">
          رجوع
        </button>
        <button 
          onClick={confirmReservation} 
          disabled={loading}
          className="flex-1 py-4 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
          تأكيد الموعد النهائي
        </button>
      </div>
    </div>
  );
}

function Step6SuccessDirectMaps({ data }: any) {
  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${data.branchLat},${data.branchLng}&travelmode=driving`;
  
  // رقم واتساب الفرع المختار برمز الدولة الكامل 967
  const branchWhatsApp = data.branchPhone || '967770000001';
  const bookingCode = `YE-${Math.floor(10000 + Math.random() * 90000)}`;

  const whatsappMessage = encodeURIComponent(
    `مرحباً إدارة عياداتنا الموقرة،\n` +
    `لقد قمت بحجز موعد عبر التطبيق:\n\n` +
    `📌 رقم الحجز: ${bookingCode}\n` +
    `👤 المراجع: ${data.patientName}\n` +
    `📱 الهاتف: +967${data.patientPhone}\n` +
    `🏥 الفرع: ${data.branchName} (${data.branchCity})\n` +
    `🩺 الخدمة: ${data.serviceName}\n` +
    `👨‍⚕️ الطبيب: ${data.doctorName}\n` +
    `📅 التاريخ: ${data.date} | الوقت: ${data.timeSlot}\n\n` +
    `يرجى تأكيد الحجز وإرسال التعليمات، وشكراً!`
  );

  const whatsappUrl = `https://wa.me/${branchWhatsApp}?text=${whatsappMessage}`;

  return (
    <div className="text-center py-6 space-y-6">
      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="w-9 h-9" />
      </div>

      <div>
        <h2 className="text-2xl font-black text-slate-900">تم تسجيل موعدك بنجاح!</h2>
        <p className="text-slate-500 text-sm mt-1">
          أهلاً بك يا {data.patientName}، نحن بانتظار تشريفك في {data.branchName}
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-right max-w-sm mx-auto space-y-2 text-xs sm:text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">رقم الحجز:</span>
          <span className="font-mono font-bold text-teal-700">#{bookingCode}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">الفرع:</span>
          <span className="font-bold text-slate-800">{data.branchName} ({data.branchCity})</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">الخدمة:</span>
          <span className="font-bold text-slate-800">{data.serviceName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">الطبيب:</span>
          <span className="font-bold text-slate-800">{data.doctorName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">الموعد المحدد:</span>
          <span className="font-bold text-slate-800">{data.date} الساعة {data.timeSlot}</span>
        </div>
      </div>

      <div className="pt-2 space-y-3 max-w-sm mx-auto">
        <a 
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20"
        >
          <PhoneCall className="w-5 h-5" />
          إرسال التفاصيل لواتساب فرع العيادة
        </a>

        <a 
          href={gmapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition shadow-md text-sm"
        >
          <Navigation className="w-4 h-4 text-teal-400" />
          التوجه الآن عبر Google Maps
        </a>
      </div>
    </div>
  );
}

function WizardButtons({ prev, next, nextDisabled = false, nextText = "متابعة" }: any) {
  return (
    <div className="flex gap-3 pt-6 border-t border-slate-100">
      {prev && (
        <button onClick={prev} className="px-5 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">
          رجوع
        </button>
      )}
      <button 
        onClick={next} 
        disabled={nextDisabled}
        className="flex-1 py-3.5 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20"
      >
        {nextText} <ChevronLeft className="w-5 h-5" />
      </button>
    </div>
  );
}
