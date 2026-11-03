'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Calendar, Clock, UserX, CheckCircle2, Loader2, AlertCircle, Save } from 'lucide-react';

interface Doctor {
  id: string | number;
  name: string;
  specialty: string;
  is_on_leave?: boolean;
  leave_until?: string;
  daily_capacity?: number;
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
  // أيام العمل الرسمية للمنشأة
  const [activeDays, setActiveDays] = useState<string[]>(['sat', 'sun', 'mon', 'tue', 'wed', 'thu']);
  const [morningShift, setMorningShift] = useState({ start: '08:30', end: '13:00', enabled: true });
  const [eveningShift, setEveningShift] = useState({ start: '16:00', end: '20:30', enabled: true });
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

  // حالة إجازات الأطباء
  const [selectedDocId, setSelectedDocId] = useState<string | number>(doctors[0]?.id || '');
  const [leaveUntilDate, setLeaveUntilDate] = useState('');
  const [updatingDoctor, setUpdatingDoctor] = useState(false);
  const [doctorSuccessMsg, setDoctorSuccessMsg] = useState('');

  const toggleDay = (dayId: string) => {
    setActiveDays(prev => 
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
    );
  };

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
    }
    setSavingSchedule(false);
  };

  // حجب الحجوزات وإجازات الأطباء
  const handleToggleDoctorLeave = async (doc: Doctor, onLeave: boolean) => {
    setUpdatingDoctor(true);
    const { error } = await supabase
      .from('Doctor')
      .update({ 
        is_on_leave: onLeave,
        leave_until: onLeave ? leaveUntilDate : null 
      })
      .eq('id', doc.id);

    if (!error) {
      setDoctors(prev => prev.map(d => d.id === doc.id ? { 
        ...d, 
        is_on_leave: onLeave, 
        leave_until: onLeave ? leaveUntilDate : undefined 
      } : d));
      setDoctorSuccessMsg(onLeave ? `تم حجب الحجوزات عن (${doc.name}) وتفعيل الإجازة.` : `تم إلغاء الإجازة وإعادة فتح حجوزات (${doc.name}).`);
      setTimeout(() => setDoctorSuccessMsg(''), 3500);
    }
    setUpdatingDoctor(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* 1. إعدادات الدوام الرسمي للمنشأة */}
      <div className={`p-6 rounded-3xl border shadow-sm space-y-5 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className={`border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <h2 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            <Clock className="w-5 h-5 text-teal-600" />
            أيام وساعات الدوام الرسمي للمنشأة
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            تتحكم هذه الإعدادات في الفترات المتاحة للمرضى في صفحة الحجز تلقائياً
          </p>
        </div>

        <form onSubmit={handleSaveFacilitySchedule} className="space-y-5">
          {/* اختيار أيام العمل */}
          <div>
            <label className="block text-xs font-bold mb-2">أيام العمل الأسبوعية المعتمدة:</label>
            <div className="flex flex-wrap gap-2">
              {WEEK_DAYS.map(day => {
                const isSelected = activeDays.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => toggleDay(day.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${
                      isSelected 
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm' 
                        : isDarkMode ? 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {day.name} {isSelected ? '✓' : ''}
                  </button>
                );
              })}
            </div>
          </div>

          {/* فترات الدوام اليومية */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            
            <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-2`}>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-teal-500">الفترة الصباحية:</span>
                <input
                  type="checkbox"
                  checked={morningShift.enabled}
                  onChange={(e) => setMorningShift({ ...morningShift, enabled: e.target.checked })}
                  className="rounded text-teal-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">من:</span>
                  <input
                    type="time"
                    value={morningShift.start}
                    onChange={(e) => setMorningShift({ ...morningShift, start: e.target.value })}
                    className={`w-full p-2 border rounded-xl outline-none font-mono ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">إلى:</span>
                  <input
                    type="time"
                    value={morningShift.end}
                    onChange={(e) => setMorningShift({ ...morningShift, end: e.target.value })}
                    className={`w-full p-2 border rounded-xl outline-none font-mono ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                  />
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-2`}>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-teal-500">الفترة المسائية:</span>
                <input
                  type="checkbox"
                  checked={eveningShift.enabled}
                  onChange={(e) => setEveningShift({ ...eveningShift, enabled: e.target.checked })}
                  className="rounded text-teal-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">من:</span>
                  <input
                    type="time"
                    value={eveningShift.start}
                    onChange={(e) => setEveningShift({ ...eveningShift, start: e.target.value })}
                    className={`w-full p-2 border rounded-xl outline-none font-mono ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">إلى:</span>
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
              <CheckCircle2 className="w-4 h-4" /> تم تحديث وضبط مواعيد دوام المنشأة بنجاح!
            </div>
          )}

          <button
            type="submit"
            disabled={savingSchedule}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-2"
          >
            {savingSchedule ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ إعدادات الدوام الرسمية
          </button>
        </form>
      </div>

      {/* 2. رقابة إجازات الأطباء وحجب الحجوزات */}
      <div className={`p-6 rounded-3xl border shadow-sm space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className={`border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <h2 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            <UserX className="w-5 h-5 text-teal-600" />
            إدارة إجازات الأطباء وحجب الحجوزات المؤقت
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            عند تفعيل إجازة لطبيب، يتم إخفاء أوقاته تلقائياً من صفحة الحجز لمنع حجز المرضى خلال فترة غيابه
          </p>
        </div>

        {doctorSuccessMsg && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {doctorSuccessMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {doctors.map(doc => (
            <div
              key={doc.id}
              className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 ${
                doc.is_on_leave
                  ? 'bg-rose-500/10 border-rose-500/30'
                  : isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-sm">{doc.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    doc.is_on_leave ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {doc.is_on_leave ? 'في إجازة (حجوزاته محجوبة)' : 'متاح للحجز'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{doc.specialty}</p>
              </div>

              <div className="pt-2 border-t border-slate-200/20 flex gap-2">
                {doc.is_on_leave ? (
                  <button
                    onClick={() => handleToggleDoctorLeave(doc, false)}
                    disabled={updatingDoctor}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
                  >
                    إنهاء الإجازة وإعادة فتح الحجز
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggleDoctorLeave(doc, true)}
                    disabled={updatingDoctor}
                    className="w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition"
                  >
                    تفعيل إجازة (حجب المواعيد)
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
