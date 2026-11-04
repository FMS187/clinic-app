'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Clock, UserX, CheckCircle2, Loader2, Save, Phone, AlertCircle } from 'lucide-react';

interface Doctor {
  id: string | number;
  name: string;
  specialty: string;
  is_available?: boolean;
  status?: string;
}

interface ScheduleSettingsTabProps {
  facilityId: string;
  doctors: Doctor[];
  setDoctors: React.Dispatch<React.SetStateAction<Doctor[]>>;
  isDarkMode: boolean;
}

const WEEK_DAYS = [
  { id: 'sat', name: 'السبت' },
  { id: 'sun', name: 'الأحد' },
  { id: 'mon', name: 'الاثنين' },
  { id: 'tue', name: 'الثلاثاء' },
  { id: 'wed', name: 'الأربعاء' },
  { id: 'thu', name: 'الخميس' },
  { id: 'fri', name: 'الجمعة' },
];

export default function ScheduleSettingsTab({
  facilityId,
  doctors,
  setDoctors,
  isDarkMode
}: ScheduleSettingsTabProps) {
  // أوقات الدوام
  const [activeDays, setActiveDays] = useState<string[]>(['sat', 'sun', 'mon', 'tue', 'wed', 'thu']);
  const [morningShift, setMorningShift] = useState({ start: '08:30', end: '13:00', enabled: true });
  const [eveningShift, setEveningShift] = useState({ start: '16:00', end: '20:30', enabled: true });
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

  // أرقام التواصل الخاصة بالمنشأة
  const [phoneNumbers, setPhoneNumbers] = useState({
    main_phone: '',
    whatsapp_phone: '',
    emergency_phone: ''
  });
  const [savingPhones, setSavingPhones] = useState(false);
  const [phoneSuccess, setPhoneSuccess] = useState(false);

  // حالة إجازات الأطباء
  const [updatingDoctorId, setUpdatingDoctorId] = useState<string | number | null>(null);
  const [doctorMsg, setDoctorMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const toggleDay = (dayId: string) => {
    setActiveDays(prev => 
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
    );
  };

  // حفظ الدوام
  const handleSaveFacilitySchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId) return;
    setSavingSchedule(true);

    const scheduleData = {
      work_days: activeDays,
      morning_shift: morningShift,
      evening_shift: eveningShift
    };

    const { error } = await supabase
      .from('ClinicFacility')
      .update({ working_hours_info: scheduleData })
      .eq('id', facilityId);

    if (!error) {
      setScheduleSuccess(true);
      setTimeout(() => setScheduleSuccess(false), 3000);
    } else {
      alert(`خطأ أثناء الحفظ: ${error.message}`);
    }
    setSavingSchedule(false);
  };

  // حفظ أرقام التواصل
  const handleSaveContactPhones = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId) return;
    setSavingPhones(true);

    const { error } = await supabase
      .from('ClinicFacility')
      .update({ contact_numbers: phoneNumbers })
      .eq('id', facilityId);

    if (!error) {
      setPhoneSuccess(true);
      setTimeout(() => setPhoneSuccess(false), 3000);
    } else {
      alert(`خطأ: ${error.message}`);
    }
    setSavingPhones(false);
  };

    // إيقاف أو تفعيل مواعيد الطبيب بالاعتماد على الأعمدة الأساسية المضمونة
  const handleToggleDoctorAvailability = async (doc: Doctor, setPaused: boolean) => {
    setUpdatingDoctorId(doc.id);
    setDoctorMsg(null);

    let updatedSpecialty = doc.specialty || '';

    if (setPaused) {
      if (!updatedSpecialty.includes('[إجازة مؤقتة]')) {
        updatedSpecialty = `${updatedSpecialty.trim()} [إجازة مؤقتة]`;
      }
    } else {
      updatedSpecialty = updatedSpecialty.replace('[إجازة مؤقتة]', '').trim();
    }

    const { error } = await supabase
      .from('Doctor')
      .update({ specialty: updatedSpecialty })
      .eq('id', doc.id);

    if (!error) {
      setDoctors(prev => prev.map(d => d.id === doc.id ? { ...d, specialty: updatedSpecialty } : d));
      setDoctorMsg({
        type: 'success',
        text: setPaused 
          ? `تم حجب وإيقاف مواعيد (${doc.name}) بنجاح.` 
          : `تمت إعادة فتح وتفعيل استقبال حجوزات (${doc.name}).`
      });
    } else {
      setDoctorMsg({ type: 'error', text: `فشل التعديل: ${error.message}` });
    }

    setUpdatingDoctorId(null);
    setTimeout(() => setDoctorMsg(null), 4000);
  };


  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* 1. خانة أرقام التواصل الخاصة بالمنشأة */}
      <div className={`p-6 rounded-3xl border shadow-sm space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className={`border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <h2 className={`text-base font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            <Phone className="w-5 h-5 text-teal-600" />
            أرقام التواصل وخدمة المرضى الرسمية
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">تظهر هذه الأرقام للمرضى في تذاكر الحجز للاستفسارات والطوارئ</p>
        </div>

        <form onSubmit={handleSaveContactPhones} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold mb-1">هاتف الاستقبال الأرضي / الثابت</label>
              <input
                type="text"
                placeholder="مثال: 01-445566"
                value={phoneNumbers.main_phone}
                onChange={(e) => setPhoneNumbers({ ...phoneNumbers, main_phone: e.target.value })}
                className={`w-full p-2.5 border rounded-xl font-mono outline-none ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
              />
            </div>

            <div>
              <label className="block font-bold mb-1">رقم خدمة العملاء (واتساب)</label>
              <input
                type="text"
                placeholder="مثال: 770000000"
                value={phoneNumbers.whatsapp_phone}
                onChange={(e) => setPhoneNumbers({ ...phoneNumbers, whatsapp_phone: e.target.value })}
                className={`w-full p-2.5 border rounded-xl font-mono outline-none ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
              />
            </div>

            <div>
              <label className="block font-bold mb-1">رقم الطوارئ والحالات الحرجة</label>
              <input
                type="text"
                placeholder="مثال: 710000000"
                value={phoneNumbers.emergency_phone}
                onChange={(e) => setPhoneNumbers({ ...phoneNumbers, emergency_phone: e.target.value })}
                className={`w-full p-2.5 border rounded-xl font-mono outline-none ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
              />
            </div>
          </div>

          {phoneSuccess && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> تم حفظ أرقام التواصل بنجاح!
            </div>
          )}

          <button
            type="submit"
            disabled={savingPhones}
            className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-1.5"
          >
            {savingPhones ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ أرقام التواصل
          </button>
        </form>
      </div>

      {/* 2. إيقاف وتفعيل مواعيد الأطباء */}
      <div className={`p-6 rounded-3xl border shadow-sm space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className={`border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <h2 className={`text-base font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            <UserX className="w-5 h-5 text-teal-600" />
            التحكم في مواعيد الأطباء (إيقاف مؤقت / تفعيل)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">عند إيقاف مواعيد طبيب يتم حجب فتراته فوراً لمنع حجز المرضى</p>
        </div>

        {doctorMsg && (
          <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
            doctorMsg.type === 'success' 
              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
              : 'bg-rose-500/20 border-rose-500/30 text-rose-400'
          }`}>
            {doctorMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            {doctorMsg.text}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {doctors.map(doc => {
            const isPaused = (doc.specialty || '').includes('[إجازة مؤقتة]');

            const isUpdating = updatingDoctorId === doc.id;

            return (
              <div
                key={doc.id}
                className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 ${
                  isPaused 
                    ? 'bg-rose-500/10 border-rose-500/30' 
                    : isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-sm">{doc.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isPaused ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {isPaused ? 'المواعيد متوقفة' : 'متاح للحجز'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{doc.specialty}</p>
                </div>

                <div className="pt-2 border-t border-slate-700/20">
                  {isPaused ? (
                    <button
                      onClick={() => handleToggleDoctorAvailability(doc, false)}
                      disabled={isUpdating}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                    >
                      {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      إعادة تفعيل المواعيد للطبيب
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleDoctorAvailability(doc, true)}
                      disabled={isUpdating}
                      className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                    >
                      {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      إيقاف مواعيد الطبيب مؤقتاً
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. أيام وساعات دوام المنشأة */}
      <div className={`p-6 rounded-3xl border shadow-sm space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className={`border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <h2 className={`text-base font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            <Clock className="w-5 h-5 text-teal-600" />
            أيام وساعات الدوام الأسبوعية
          </h2>
        </div>

        <form onSubmit={handleSaveFacilitySchedule} className="space-y-4">
          <div>
            <label className="block text-xs font-bold mb-2">أيام العمل الأسبوعية:</label>
            <div className="flex flex-wrap gap-2">
              {WEEK_DAYS.map(day => {
                const isSelected = activeDays.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => toggleDay(day.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                      isSelected 
                        ? 'bg-teal-600 text-white border-teal-600' 
                        : isDarkMode ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    {day.name} {isSelected ? '✓' : ''}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-2`}>
              <span className="font-bold text-teal-500 block">الفترة الصباحية:</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">من:</span>
                  <input
                    type="time"
                    value={morningShift.start}
                    onChange={(e) => setMorningShift({ ...morningShift, start: e.target.value })}
                    className={`w-full p-2 border rounded-xl outline-none font-mono ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">إلى:</span>
                  <input
                    type="time"
                    value={morningShift.end}
                    onChange={(e) => setMorningShift({ ...morningShift, end: e.target.value })}
                    className={`w-full p-2 border rounded-xl outline-none font-mono ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                  />
                </div>
              </div>
            </div>

            <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-2`}>
              <span className="font-bold text-teal-500 block">الفترة المسائية:</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">من:</span>
                  <input
                    type="time"
                    value={eveningShift.start}
                    onChange={(e) => setEveningShift({ ...eveningShift, start: e.target.value })}
                    className={`w-full p-2 border rounded-xl outline-none font-mono ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">إلى:</span>
                  <input
                    type="time"
                    value={eveningShift.end}
                    onChange={(e) => setEveningShift({ ...eveningShift, end: e.target.value })}
                    className={`w-full p-2 border rounded-xl outline-none font-mono ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                  />
                </div>
              </div>
            </div>
          </div>

          {scheduleSuccess && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> تم تحديث ساعات الدوام بنجاح!
            </div>
          )}

          <button
            type="submit"
            disabled={savingSchedule}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5"
          >
            {savingSchedule ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ إعدادات الدوام
          </button>
        </form>
      </div>

    </div>
  );
}
