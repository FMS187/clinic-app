'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Search, MapPin, Stethoscope, Building2, Calendar, 
  Clock, PhoneCall, CheckCircle, ChevronLeft, ShieldCheck, 
  Loader2, Filter, Sparkles, Smile, Eye, HeartPulse, User
} from 'lucide-react';

interface Facility {
  id: string;
  name: string;
  city: string;
  district: string;
  address: string;
  facility_type: string;
  whatsapp_number: string;
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

const SPECIALTIES = [
  { id: 'all', name: 'جميع التخصصات', icon: Stethoscope },
  { id: 'dental', name: 'طب وجراحة الأسنان', icon: Smile },
  { id: 'derma', name: 'الجلدية والتجميل والليزر', icon: Sparkles },
  { id: 'general', name: 'الباطنية والقلب', icon: HeartPulse },
  { id: 'eyes', name: 'طب وجراحة العيون', icon: Eye },
];

const CITIES = ['الكل', 'صنعاء', 'عدن', 'تعز', 'حضرموت'];

export default function MedicalMarketplace() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  // الفلاتر
  const [selectedCity, setSelectedCity] = useState('الكل');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // نافذة الحجز السريع
  const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null);
  const [bookingFacility, setBookingFacility] = useState<Facility | null>(null);

  // بيانات نموذج الحجز
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('10:00 صباحاً');
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);

  const availableSlots = [
    '09:30 صباحاً', '10:30 صباحاً', '11:30 صباحاً',
    '04:30 عصراً', '05:30 مساءً', '06:30 مساءً', '07:30 مساءً'
  ];

  useEffect(() => {
    fetchMarketplaceData();
  }, []);

  const fetchMarketplaceData = async () => {
    setLoading(true);
    try {
      const { data: facs } = await supabase
        .from('ClinicFacility')
        .select('*')
        .eq('is_active', true);

      const { data: docs } = await supabase
        .from('Doctor')
        .select('*');

      if (facs) setFacilities(facs);
      if (docs) setDoctors(docs);
    } catch (e) {
      console.log('Error fetching aggregator data', e);
    }
    setLoading(false);
  };

  // فلترة وتصفية الأطباء والمنشآت
  const filteredDoctors = useMemo(() => {
    return doctors.filter(doc => {
      const cityMatch = selectedCity === 'الكل' || doc.city === selectedCity;
      const specMatch = selectedSpecialty === 'all' || doc.category === selectedSpecialty;
      
      const q = searchQuery.toLowerCase().trim();
      const facility = facilities.find(f => f.id === doc.facility_id);
      const searchMatch = !q || 
        doc.name.toLowerCase().includes(q) || 
        doc.specialty.toLowerCase().includes(q) ||
        (facility && facility.name.toLowerCase().includes(q));

      return cityMatch && specMatch && searchMatch;
    });
  }, [doctors, facilities, selectedCity, selectedSpecialty, searchQuery]);

  const handleStartBooking = (doc: Doctor) => {
    const fac = facilities.find(f => f.id === doc.facility_id) || {
      id: 'default',
      name: 'المركز الطبي المعتمد',
      city: doc.city || 'صنعاء',
      district: '',
      address: 'صنعاء - اليمن',
      facility_type: 'clinic',
      whatsapp_number: '770000000'
    };
    setBookingDoctor(doc);
    setBookingFacility(fac);
    setBookingDate(new Date().toISOString().split('T')[0]);
    setBookingSuccess(null);
  };

  const handleConfirmReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingDoctor || !bookingFacility || !patientName || !patientPhone || !bookingDate) return;

    setSubmittingBooking(true);

    let cleanPhone = patientPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('967')) cleanPhone = cleanPhone.slice(3);
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.slice(1);

    const bookingCode = `YE-${Math.floor(10000 + Math.random() * 90000)}`;

    const { error } = await supabase.from('Booking').insert([
      {
        facility_id: bookingFacility.id !== 'default' ? bookingFacility.id : null,
        facility_name: bookingFacility.name,
        branch_name: bookingFacility.name,
        branch_city: bookingFacility.city,
        service_name: bookingDoctor.specialty,
        doctor_name: bookingDoctor.name,
        booking_date: bookingDate,
        booking_time: bookingTime,
        patient_name: patientName,
        patient_phone: cleanPhone,
        deposit_amount: bookingDoctor.consultation_fee || 15,
        status: 'pending'
      }
    ]);

    setSubmittingBooking(false);

    if (!error) {
      setBookingSuccess({
        bookingCode,
        patientName,
        patientPhone: cleanPhone,
        doctorName: bookingDoctor.name,
        facilityName: bookingFacility.name,
        facilityPhone: bookingFacility.whatsapp_number,
        date: bookingDate,
        time: bookingTime,
        fee: bookingDoctor.consultation_fee || 15
      });
    } else {
      alert('تعذر إتمام الحجز، يرجى المحاولة مرة أخرى.');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* 1. ترويسة المنصة الطبية الموحدة */}
      <header className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white pt-10 pb-16 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-teal-600/30 border border-teal-400/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-teal-200">
            <Building2 className="w-4 h-4" /> بوابتك الطبية الأولى لحجز الأطباء والمستشفيات في اليمن
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            احجز موعدك الطبي مع نخبة الاستشاريين
          </h1>
          <p className="text-sm sm:text-base text-teal-100 max-w-2xl mx-auto leading-relaxed">
            منصة وسيطة تربطك بأفضل المستشفيات والعيادات التخصصية في صنعاء وعدن مع تأكيد فوري عبر الواتساب.
          </p>

          {/* شريط البحث المدمج */}
          <div className="pt-4 max-w-3xl mx-auto">
            <div className="bg-white p-2.5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center gap-2 text-slate-700">
              <div className="flex items-center gap-2 px-3 py-2 border-b sm:border-b-0 sm:border-l border-slate-200 w-full sm:w-auto">
                <MapPin className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <select 
                  value={selectedCity} 
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="bg-transparent text-sm font-bold text-slate-800 outline-none w-full cursor-pointer"
                >
                  {CITIES.map(c => <option key={c} value={c}>{c === 'الكل' ? 'كل المدن' : c}</option>)}
                </select>
              </div>

              <div className="relative flex-grow w-full flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute right-3" />
                <input 
                  type="text"
                  placeholder="ابحث باسم الطبيب، المستشفى، أو التخصص..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 text-sm outline-none text-slate-800 placeholder-slate-400"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. شريط التخصصات الطبية */}
      <section className="max-w-5xl mx-auto px-4 -mt-8">
        <div className="bg-white p-3 rounded-2xl shadow-md border border-slate-200 overflow-x-auto flex gap-2">
          {SPECIALTIES.map(s => {
            const Icon = s.icon;
            const isSelected = selectedSpecialty === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSpecialty(s.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition ${
                  isSelected 
                    ? 'bg-teal-600 text-white shadow-sm' 
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-teal-600'}`} />
                {s.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. قائمة المنشآت الطبية والأطباء المتاحين */}
      <section className="max-w-5xl mx-auto px-4 mt-8 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-teal-600" />
            الأطباء والمراكز المتاحة ({filteredDoctors.length})
          </h2>
          <span className="text-xs text-slate-500">حجز فوري ومؤكد</span>
        </div>

        {loading ? (
          <div className="text-center py-16"><Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto" /></div>
        ) : filteredDoctors.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-700">لم يتم العثور على أطباء يطابقون بحثك</h3>
            <p className="text-xs text-slate-400">جرب تغيير المدينة أو مسح كلمات البحث</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDoctors.map(doc => {
              const fac = facilities.find(f => f.id === doc.facility_id);
              return (
                <div 
                  key={doc.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center font-black text-xl flex-shrink-0">
                      {doc.name.charAt(3) || 'ط'}
                    </div>
                    <div className="flex-grow space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                          {doc.city || 'صنعاء'}
                        </span>
                        <span className="text-xs font-bold text-emerald-700">
                          كشف: ${doc.consultation_fee || 20}
                        </span>
                      </div>
                      <h3 className="text-base font-black text-slate-900">{doc.name}</h3>
                      <p className="text-xs font-medium text-teal-700">{doc.specialty}</p>
                      {fac && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 pt-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" /> {fac.name} ({fac.district || fac.city})
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5" /> مواعيد صباحية ومسائية
                    </span>
                    <button
                      onClick={() => handleStartBooking(doc)}
                      className="inline-flex items-center gap-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-teal-600/20"
                    >
                      احجز الآن <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. نافذة منبثقة للحجز السريع وتأكيد الواتساب */}
      {bookingDoctor && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto text-right">
            
            {!bookingSuccess ? (
              <>
                <div className="flex justify-between items-center border-b pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base sm:text-lg">تأكيد حجز الموعد الطبي</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      لدى: <strong className="text-teal-700">{bookingDoctor.name}</strong> - {bookingFacility?.name}
                    </p>
                  </div>
                  <button 
                    onClick={() => setBookingDoctor(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleConfirmReservation} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">اسم المريض ثلاثي</label>
                    <input 
                      type="text"
                      required
                      placeholder="مثال: محمد عبد الله الأهدل"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full p-3 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف أو الواتساب</label>
                    <div className="relative flex items-center" dir="ltr">
                      <span className="bg-slate-100 border border-r-0 border-slate-300 rounded-l-xl px-3 py-3 text-xs font-bold text-slate-600">
                        🇾🇪 +967
                      </span>
                      <input 
                        type="tel"
                        required
                        placeholder="77xxxxxxx"
                        value={patientPhone}
                        onChange={(e) => setPatientPhone(e.target.value)}
                        className="w-full p-3 border border-slate-300 rounded-r-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 font-mono text-right"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الموعد</label>
                      <input 
                        type="date"
                        required
                        min={new Date().toISOString().split('T')[0]}
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        className="w-full p-3 border border-slate-300 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">الوقت المفضل</label>
                      <select
                        value={bookingTime}
                        onChange={(e) => setBookingTime(e.target.value)}
                        className="w-full p-3 border border-slate-300 rounded-xl text-xs sm:text-sm outline-none bg-white focus:ring-2 focus:ring-teal-500"
                      >
                        {availableSlots.map(slot => <option key={slot} value={slot}>{slot}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">رسوم الكشف بالعيادة:</span>
                      <span className="font-bold text-emerald-700">${bookingDoctor.consultation_fee || 20}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">طريقة السداد:</span>
                      <span className="font-bold text-slate-800">نقداً أو شبكة عند الحضور للمنشأة</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingBooking}
                    className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20"
                  >
                    {submittingBooking ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                    تأكيد الموعد الطبي
                  </button>
                </form>
              </>
            ) : (
              /* شاشة إتمام الحجز ورابط الواتساب المباشر للعيادة */
              <div className="text-center py-4 space-y-5">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">تم تسجيل حجزك بنجاح!</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    رقم تذكرة الحجز: <strong className="text-teal-700 font-mono">#{bookingSuccess.bookingCode}</strong>
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2 text-right">
                  <div className="flex justify-between">
                    <span className="text-slate-400">المنشأة الطبية:</span>
                    <span className="font-bold text-slate-800">{bookingSuccess.facilityName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">الطبيب:</span>
                    <span className="font-bold text-slate-800">{bookingSuccess.doctorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">الموعد:</span>
                    <span className="font-bold text-slate-800">{bookingSuccess.date} ({bookingSuccess.time})</span>
                  </div>
                </div>

                {(() => {
                  let fNum = (bookingSuccess.facilityPhone || '770000000').replace(/[^0-9]/g, '');
                  if (fNum.startsWith('967')) fNum = fNum.slice(3);
                  if (fNum.startsWith('0')) fNum = fNum.slice(1);
                  const targetWa = '967' + fNum;

                  const msg = encodeURIComponent(
                    `مرحبا ${bookingSuccess.facilityName}،\n` +
                    `حجز موعد جديد عبر المنصة الطبية الوسيطة:\n` +
                    `* رقم الحجز: ${bookingSuccess.bookingCode}\n` +
                    `* اسم المريض: ${bookingSuccess.patientName}\n` +
                    `* هاتف المريض: +967${bookingSuccess.patientPhone}\n` +
                    `* الطبيب المطلوب: ${bookingSuccess.doctorName}\n` +
                    `* الموعد: ${bookingSuccess.date} الساعة ${bookingSuccess.time}\n\n` +
                    `يرجى تأكيد الحجز وإدراجه في جدول الاستقبال.`
                  );
                  const waUrl = `https://api.whatsapp.com/send?phone=${targetWa}&text=${msg}`;

                  return (
                    <div className="space-y-2 pt-2">
                      <a 
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition shadow-lg shadow-emerald-600/20"
                      >
                        <PhoneCall className="w-4 h-4" />
                        إرسال التذكرة لواتساب المنشأة لتأكيد الحضور
                      </a>

                      <button
                        onClick={() => { setBookingDoctor(null); setBookingSuccess(null); }}
                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition"
                      >
                        إغلاق وتصفح أطباء آخرين
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

          </div>
        </div>
      )}
    </main>
  );
}
