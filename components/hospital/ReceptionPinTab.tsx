'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  KeyRound, Check, Loader2, CheckCircle2, AlertCircle, 
  Calendar, Phone, Clock, Edit3, UserPlus, Lock, HeadphonesIcon, X, Bell
} from 'lucide-react';

export interface DoctorOption {
  id: string | number;
  name: string;
  specialty: string;
  consultation_fee?: number;
}

export interface ReceptionBooking {
  id: string | number;
  patient_name: string;
  patient_phone: string;
  doctor_name: string;
  booking_date: string;
  booking_time: string;
  status: string;
  deposit_amount?: number;
  discount_amount?: number;
  applied_coupon?: string;
  checkin_pin?: string;
  verified_by?: string;
}

interface ReceptionPinTabProps {
  facilityId: string;
  facilityName: string;
  doctors?: DoctorOption[];
  bookings: ReceptionBooking[];
  setBookings: React.Dispatch<React.SetStateAction<ReceptionBooking[]>>;
  isDarkMode: boolean;
  formatMoney: (amountInUsd: number) => string;
  currentUserEmail?: string;
}

const AVAILABLE_TIMES = [
  '09:30 صباحاً', '10:30 صباحاً', '11:30 صباحاً',
  '04:30 عصراً', '05:30 مساءً', '06:30 مساءً', '07:30 مساءً'
];

export default function ReceptionPinTab({
  facilityId,
  facilityName,
  doctors = [],
  bookings,
  setBookings,
  isDarkMode,
  formatMoney,
  currentUserEmail = 'موظف الاستقبال'
}: ReceptionPinTabProps) {
  const [inputPin, setInputPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinResult, setPinResult] = useState<{ type: 'success' | 'error'; text: string; details?: any } | null>(null);

  // تنبيه الحجز الفوري الجديد
  const [newBookingAlert, setNewBookingAlert] = useState<string | null>(null);

  // نافذة تسجيل موعد جديد
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [newBookingData, setNewBookingData] = useState({
    patient_name: '',
    patient_phone: '',
    doctor_name: doctors[0]?.name || '',
    booking_date: new Date().toISOString().split('T')[0],
    booking_time: AVAILABLE_TIMES[0]
  });
  const [savingNewBooking, setSavingNewBooking] = useState(false);

  // نافذة إعادة الجدولة
  const [editingBooking, setEditingBooking] = useState<ReceptionBooking | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const todayBookings = useMemo(() => {
    return bookings.filter(b => b.booking_date === todayStr);
  }, [bookings, todayStr]);

  // إطلاق نغمة تنبيه صوتية عند وصول حجز جديد
  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch {
      // تجاهل إن كان الصوت مقيداً من المتصفح
    }
  };

  // الاستماع المباشر للحجوزات الجديدة عبر Supabase Realtime
  useEffect(() => {
    if (!facilityId) return;

    const channel = supabase
      .channel(`realtime-bookings-${facilityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Booking',
          filter: `facility_id=eq.${facilityId}`
        },
        (payload) => {
          const newRec = payload.new as ReceptionBooking;
          setBookings(prev => [newRec, ...prev]);
          playAlertSound();
          setNewBookingAlert(`موعد جديد وصل الآن للمريض: ${newRec.patient_name} مع د. ${newRec.doctor_name}`);
          setTimeout(() => setNewBookingAlert(null), 6000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [facilityId, setBookings]);

    // التحقق من رمز PIN وحساب الخصم الصافي
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPin.trim()) return;

    setPinLoading(true);
    setPinResult(null);

    const targetPin = inputPin.trim();

    try {
      let query = supabase.from('Booking').select('*').eq('checkin_pin', targetPin);
      if (facilityId) {
        query = query.eq('facility_id', facilityId);
      }

      const { data: matchedBookings, error } = await query;

      if (error || !matchedBookings || matchedBookings.length === 0) {
        setPinResult({ type: 'error', text: 'رمز PIN غير صحيح أو لا يوجد حجز مطابق في هذه المنشأة.' });
      } else {
        const booking = matchedBookings[0];

        if (booking.status === 'completed') {
          setPinResult({ 
            type: 'error', 
            text: `تم تأكيد هذا الحجز مسبقاً للمريض (${booking.patient_name}). لا يمكن إعادة التحقق.` 
          });
        } else {
          const couponName = booking.applied_coupon || booking.discount_coupon || 'بدون كوبون';
          const originalFee = Number(booking.consultation_fee) || 20;
          const discountVal = Number(booking.discount_amount) || 0;
          const netToCollect = Math.max(0, originalFee - discountVal);

          // تحديث الحالة فقط لضمان عدم حدوث تعارض في الأعمدة
          const { error: updateErr } = await supabase
            .from('Booking')
            .update({ status: 'completed' })
            .eq('id', booking.id);

          if (!updateErr) {
            setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'completed' } : b));
            setPinResult({
              type: 'success',
              text: `تم تأكيد حضور المريض (${booking.patient_name}) بنجاح!`,
              details: {
                doctor: booking.doctor_name,
                originalFee,
                discount: discountVal,
                coupon: couponName,
                netToCollect
              }
            });
            setInputPin('');
          } else {
            setPinResult({ type: 'error', text: `خطأ أثناء الحفظ: ${updateErr.message}` });
          }
        }
      }
    } catch {
      setPinResult({ type: 'error', text: 'حدث خطأ تقني أثناء فحص الرمز.' });
    }
    setPinLoading(false);
  };


  // تسجيل موعد حضوري مباشر
  const handleCreateNewBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId || !newBookingData.patient_name || !newBookingData.patient_phone) return;

    setSavingNewBooking(true);
    const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();

    const newRecord = {
      facility_id: facilityId,
      patient_name: newBookingData.patient_name.trim(),
      patient_phone: newBookingData.patient_phone.trim(),
      doctor_name: newBookingData.doctor_name || (doctors[0]?.name ?? 'طبيب عام'),
      booking_date: newBookingData.booking_date,
      booking_time: newBookingData.booking_time,
      status: 'pending',
      checkin_pin: generatedPin,
      deposit_amount: 20,
      payment_method: 'cash'
    };

    const { data, error } = await supabase.from('Booking').insert([newRecord]).select();

    if (data && !error) {
      setBookings(prev => [data[0], ...prev]);
      setShowNewBookingModal(false);
      setInputPin(generatedPin);

      setNewBookingData({
        patient_name: '',
        patient_phone: '',
        doctor_name: doctors[0]?.name || '',
        booking_date: todayStr,
        booking_time: AVAILABLE_TIMES[0]
      });
      alert(`تم تسجيل موعد المريض بنجاح! رمز الـ PIN الخاص به هو: [ ${generatedPin} ]`);
    } else {
      alert(`خطأ أثناء الحفظ: ${error?.message || 'تعذر تسجيل الموعد'}`);
    }
    setSavingNewBooking(false);
  };

  // حفظ الموعد المعدل
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking || !editDate || !editTime) return;

    setSavingEdit(true);
    const { error } = await supabase
      .from('Booking')
      .update({ booking_date: editDate, booking_time: editTime })
      .eq('id', editingBooking.id);

    if (!error) {
      setBookings(prev => prev.map(b => b.id === editingBooking.id ? { ...b, booking_date: editDate, booking_time: editTime } : b));
      setEditingBooking(null);
    }
    setSavingEdit(false);
  };

  // توجيه طلب الإلغاء لخدمة عملاء المنصة
  const handleSupportCancelPing = (b: ReceptionBooking) => {
    const platformSupportPhone = '967770000000';
    const cancelMsg = encodeURIComponent(
      `السلام عليكم خدمة عملاء المنصة،\n` +
      `طلب إلغاء حجز من مكتب استقبال: ${facilityName}\n` +
      `• اسم المريض: ${b.patient_name}\n` +
      `• رقم الهاتف: ${b.patient_phone}\n` +
      `• الطبيب المعالج: ${b.doctor_name}\n` +
      `• التاريخ والوقت: ${b.booking_date} (${b.booking_time})\n` +
      `نرجو منكم مراجعة وإلغاء الحجز من النظام المركزي.`
    );
    window.open(`https://api.whatsapp.com/send?phone=${platformSupportPhone}&text=${cancelMsg}`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* شريط وميض تنبيه لحظي عند وصول حجز جديد */}
      {newBookingAlert && (
        <div className="p-4 bg-teal-500/20 border-2 border-teal-500 rounded-2xl flex items-center justify-between text-teal-400 font-bold text-xs animate-bounce shadow-lg">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-teal-400 flex-shrink-0 animate-spin" />
            <span>{newBookingAlert}</span>
          </div>
          <button onClick={() => setNewBookingAlert(null)} className="p-1 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* 1. ترويسة تسجيل مريض حضوري */}
      <div className="flex justify-between items-center bg-teal-600/10 border border-teal-500/20 p-4 rounded-2xl">
        <div>
          <h3 className="font-bold text-sm text-teal-600">تسجيل مريض جديد بالحضور المباشر</h3>
          <p className="text-xs text-slate-400">إضافة مراجعين حضروا للاستقبال مباشرة بدون حجز مسبق</p>
        </div>
        <button
          onClick={() => setShowNewBookingModal(true)}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
        >
          <UserPlus className="w-4 h-4" /> تسجيل موعد جديد
        </button>
      </div>

      {/* 2. خانة تأكيد الحضور السريع بالرمز السري والتفصيل المالي */}
      <section className={`border-2 border-amber-400 p-6 rounded-3xl shadow-sm space-y-4 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className={`text-lg font-black flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              <KeyRound className="w-6 h-6 text-amber-500 flex-shrink-0" />
              تأكيد حضور المريض بالرمز السري (PIN)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              اطلب رمز الـ PIN المكون من 4 أرقام من تذكرة المريض لتأكيد دخوله للعيادة
            </p>
          </div>

          <form onSubmit={handleVerifyPin} className="flex gap-2 w-full sm:w-auto">
            <input
              type="text"
              maxLength={6}
              required
              placeholder="رمز PIN"
              value={inputPin}
              onChange={(e) => setInputPin(e.target.value)}
              className={`p-3.5 border-2 rounded-2xl text-base font-mono font-black text-center outline-none w-44 tracking-widest ${
                isDarkMode 
                  ? 'bg-slate-950 text-amber-300 border-amber-500/50 focus:border-amber-400' 
                  : 'bg-amber-50/70 text-amber-950 border-amber-300 focus:border-amber-500'
              }`}
            />
            <button
              type="submit"
              disabled={pinLoading || !inputPin.trim()}
              className="px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-2xl transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 whitespace-nowrap"
            >
              {pinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              تأكيد الدخول
            </button>
          </form>
        </div>

        {/* تفصيل الحساب المالي الكامل بعد التحقق بنجاح */}
        {pinResult && (
          <div className={`p-4 rounded-2xl text-xs font-bold space-y-3 border ${
            pinResult.type === 'success' 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          }`}>
            <div className="flex items-center gap-2 text-sm">
              {pinResult.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
              <span>{pinResult.text}</span>
            </div>

            {pinResult.details && (
              <div className="pt-3 border-t border-emerald-500/20 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">الطبيب المعالج:</span>
                  <strong className="text-white text-xs">{pinResult.details.doctor}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">سعر الكشف الأصلي:</span>
                  <span className="text-slate-300 line-through">{formatMoney(pinResult.details.originalFee)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">قيمة الخصم ({pinResult.details.coupon}):</span>
                  <strong className="text-teal-400">-{formatMoney(pinResult.details.discount)}</strong>
                </div>
                <div className="p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-xl">
                  <span className="text-[10px] text-emerald-300 block font-sans font-bold">المطلوب تحصيله كاش:</span>
                  <strong className="text-emerald-300 text-sm">{formatMoney(pinResult.details.netToCollect)}</strong>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. جدول مواعيد اليوم الميداني */}
      <section className={`p-6 rounded-3xl border shadow-sm space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className={`flex justify-between items-center border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <div>
            <h3 className={`text-base font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              <Calendar className="w-5 h-5 text-teal-600" />
              مواعيد صالة الانتظار لليوم ({todayBookings.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              الحالات المكتملة والمؤكدة مقفلة تلقائياً لحماية التدقيق
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400">{todayStr}</span>
        </div>

        {todayBookings.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <Clock className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-slate-400 text-xs">لا توجد مواعيد متبقية لليوم الحالي.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className={`border-b ${isDarkMode ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                <tr>
                  <th className="p-3">المريض</th>
                  <th className="p-3">الوقت</th>
                  <th className="p-3">الطبيب</th>
                  <th className="p-3">المطلوب نقداً</th>
                  <th className="p-3">حالة الحضور</th>
                  <th className="p-3">إجراءات الاستقبال</th>
                  <th className="p-3">إلغاء الحجز</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {todayBookings.map((b) => {
                  let cleanPhone = (b.patient_phone || '').replace(/[^0-9]/g, '');
                  if (cleanPhone.startsWith('967')) cleanPhone = cleanPhone.slice(3);
                  if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.slice(1);

                  const isLocked = b.status === 'completed' || b.status === 'confirmed';

                  return (
                    <tr key={b.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                      <td className="p-3 font-bold">
                        {b.patient_name}
                        <span className="block text-[10px] text-slate-400 font-mono font-normal">+967 {cleanPhone}</span>
                      </td>
                      <td className="p-3 font-mono text-teal-500 font-bold">{b.booking_time}</td>
                      <td className="p-3">{b.doctor_name}</td>
                      <td className="p-3 font-mono font-bold text-emerald-500">
                        {formatMoney(b.deposit_amount || 20)}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === 'completed' 
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' 
                            : b.status === 'confirmed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          {isLocked && <Lock className="w-2.5 h-2.5" />}
                          {b.status === 'completed' ? 'تم الكشف' : b.status === 'confirmed' ? 'مؤكد' : 'قيد الانتظار'}
                        </span>
                      </td>
                      <td className="p-3">
                        {isLocked ? (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> مقفل وموثق
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingBooking(b);
                              setEditDate(b.booking_date);
                              setEditTime(b.booking_time);
                            }}
                            className={`p-1.5 rounded-lg border transition ${isDarkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600'}`}
                            title="إعادة جدولة الوقت"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleSupportCancelPing(b)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 rounded-lg text-[10px] font-bold transition whitespace-nowrap"
                          title="توجيه طلب الإلغاء للمنصة"
                        >
                          <HeadphonesIcon className="w-3 h-3" /> طلب إلغاء
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* نافذة تسجيل موعد جديد للمريض */}
      {showNewBookingModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className={`rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl ${isDarkMode ? 'bg-slate-900 border border-slate-800 text-white' : 'bg-white text-slate-900'}`}>
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-base flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-teal-600" /> تسجيل موعد حضور جديد
              </h3>
              <button onClick={() => setShowNewBookingModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewBooking} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">اسم المريض الرباعي</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: صالح محمد اليافعي"
                  value={newBookingData.patient_name}
                  onChange={(e) => setNewBookingData({ ...newBookingData, patient_name: e.target.value })}
                  className={`w-full p-2.5 border rounded-xl outline-none ${isDarkMode ? 'bg-slate-950 border-slate-700' : 'bg-white border-slate-300'}`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">رقم الهاتف (واتساب)</label>
                <input
                  type="tel"
                  required
                  placeholder="مثال: 770000000"
                  value={newBookingData.patient_phone}
                  onChange={(e) => setNewBookingData({ ...newBookingData, patient_phone: e.target.value })}
                  className={`w-full p-2.5 border rounded-xl outline-none font-mono ${isDarkMode ? 'bg-slate-950 border-slate-700' : 'bg-white border-slate-300'}`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">الطبيب المطلوب</label>
                <select
                  value={newBookingData.doctor_name}
                  onChange={(e) => setNewBookingData({ ...newBookingData, doctor_name: e.target.value })}
                  className={`w-full p-2.5 border rounded-xl outline-none ${isDarkMode ? 'bg-slate-950 border-slate-700' : 'bg-white border-slate-300'}`}
                >
                  {doctors.length > 0 ? (
                    doctors.map(d => <option key={d.id} value={d.name}>{d.name} ({d.specialty})</option>)
                  ) : (
                    <option value="طبيب عام">طبيب المنشأة العام</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">تاريخ الموعد</label>
                  <input
                    type="date"
                    required
                    value={newBookingData.booking_date}
                    min={todayStr}
                    onChange={(e) => setNewBookingData({ ...newBookingData, booking_date: e.target.value })}
                    className={`w-full p-2 border rounded-xl outline-none ${isDarkMode ? 'bg-slate-950 border-slate-700' : 'bg-white border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">الوقت</label>
                  <select
                    value={newBookingData.booking_time}
                    onChange={(e) => setNewBookingData({ ...newBookingData, booking_time: e.target.value })}
                    className={`w-full p-2 border rounded-xl outline-none ${isDarkMode ? 'bg-slate-950 border-slate-700' : 'bg-white border-slate-300'}`}
                  >
                    {AVAILABLE_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingNewBooking}
                className="w-full mt-2 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-1.5"
              >
                {savingNewBooking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                تأكيد وتسجيل الحجز وتوليد PIN
              </button>
            </form>
          </div>
        </div>
      )}

      {/* نافذة إعادة الجدولة السريعة */}
      {editingBooking && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className={`rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl ${isDarkMode ? 'bg-slate-900 border border-slate-800 text-white' : 'bg-white text-slate-900'}`}>
            <h3 className="font-bold text-base">تعديل وقت موعد المريض</h3>
            <p className="text-xs text-slate-400">المريض: {editingBooking.patient_name}</p>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">التاريخ</label>
                <input
                  type="date"
                  required
                  value={editDate}
                  min={todayStr}
                  onChange={(e) => setEditDate(e.target.value)}
                  className={`w-full p-2.5 border rounded-xl text-xs ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">الوقت الجديد</label>
                <select
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className={`w-full p-2.5 border rounded-xl text-xs ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                >
                  {AVAILABLE_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="flex-1 py-2.5 bg-slate-700 text-slate-200 rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold"
                >
                  {savingEdit ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'حفظ الموعد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
