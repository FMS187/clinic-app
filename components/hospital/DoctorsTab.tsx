'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Stethoscope, Plus, Trash2, Loader2, CheckCircle2 } from 'lucide-react';

export interface Doctor {
  id: string | number;
  name: string;
  specialty: string;
  category: string;
  facility_id: string;
  consultation_fee: number;
  city?: string;
  branch?: string;
}

interface DoctorsTabProps {
  facilityId: string;
  facilityName?: string;
  facilityCity?: string;
  doctors: Doctor[];
  setDoctors: React.Dispatch<React.SetStateAction<Doctor[]>>;
  isDarkMode: boolean;
  formatMoney: (amountInUsd: number) => string;
}

const MEDICAL_CATEGORIES = [
  { id: 'dental', name: 'طب وجراحة الأسنان' },
  { id: 'derma', name: 'الجلدية والتجميل' },
  { id: 'general', name: 'الباطنية والقلب' },
  { id: 'eyes', name: 'طب وجراحة العيون' },
  { id: 'ortho', name: 'العظام والمفاصل' },
  { id: 'pediatrics', name: 'الأطفال وحديثي الولادة' },
  { id: 'gynecology', name: 'النساء والولادة' },
  { id: 'surgery', name: 'الجراحة العامة' },
];

export default function DoctorsTab({
  facilityId,
  facilityName = '',
  facilityCity = 'صنعاء',
  doctors,
  setDoctors,
  isDarkMode,
  formatMoney
}: DoctorsTabProps) {
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    specialty: '',
    category: 'dental',
    consultation_fee: 20
  });

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId || !newDoctor.name.trim() || !newDoctor.specialty.trim()) return;

    setSaving(true);
    const { data, error } = await supabase.from('Doctor').insert([
      {
        name: newDoctor.name.trim(),
        specialty: newDoctor.specialty.trim(),
        category: newDoctor.category,
        facility_id: facilityId,
        consultation_fee: Number(newDoctor.consultation_fee) || 20,
        city: facilityCity,
        branch: facilityName
      }
    ]).select();

    if (data && !error) {
      setDoctors(prev => [...prev, data[0]]);
      setNewDoctor({
        name: '',
        specialty: '',
        category: 'dental',
        consultation_fee: 20
      });
      alert('تمت إضافة الطبيب بنجاح.');
    } else {
      alert(`خطأ أثناء الحفظ: ${error?.message || 'تعذر إضافة الطبيب'}`);
    }
    setSaving(false);
  };

  const handleDeleteDoctor = async (id: string | number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطبيب من كادر المنشأة؟')) return;
    setDeletingId(id);

    const { error } = await supabase.from('Doctor').delete().eq('id', id);
    if (!error) {
      setDoctors(prev => prev.filter(d => d.id !== id));
    } else {
      alert(`خطأ: ${error.message}`);
    }
    setDeletingId(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 1. نموذج إضافة طبيب جديد */}
      <div className={`p-6 rounded-3xl border shadow-sm space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h2 className={`text-base font-bold flex items-center gap-2 border-b pb-3 ${isDarkMode ? 'border-slate-800 text-white' : 'border-slate-100 text-slate-900'}`}>
          <Plus className="w-5 h-5 text-teal-600" /> إضافة طبيب لمنشأتكم
        </h2>

        <form onSubmit={handleAddDoctor} className="space-y-3">
          <div>
            <label className="block text-xs font-bold mb-1">اسم الطبيب</label>
            <input
              type="text"
              required
              placeholder="مثال: د. أنيس المقطري"
              value={newDoctor.name}
              onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
              className={`w-full p-2.5 border rounded-xl text-sm outline-none ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">التخصص الدقيق</label>
            <input
              type="text"
              required
              placeholder="مثال: استشاري أمراض القلب والقسطرة"
              value={newDoctor.specialty}
              onChange={(e) => setNewDoctor({ ...newDoctor, specialty: e.target.value })}
              className={`w-full p-2.5 border rounded-xl text-sm outline-none ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">القسم الطبي</label>
            <select
              value={newDoctor.category}
              onChange={(e) => setNewDoctor({ ...newDoctor, category: e.target.value })}
              className={`w-full p-2.5 border rounded-xl text-sm outline-none ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
            >
              {MEDICAL_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">رسوم الكشف بالدولار ($)</label>
            <input
              type="number"
              min="1"
              step="0.5"
              required
              value={newDoctor.consultation_fee}
              onChange={(e) => setNewDoctor({ ...newDoctor, consultation_fee: Number(e.target.value) })}
              className={`w-full p-2.5 border rounded-xl text-sm outline-none font-mono ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
            />
            <span className="text-[10px] text-teal-500 font-bold block mt-1">
              تساوي بالعملة المحددة: {formatMoney(newDoctor.consultation_fee)}
            </span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-1.5"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            حفظ الطبيب
          </button>
        </form>
      </div>

      {/* 2. قائمة كادر الأطباء */}
      <div className="lg:col-span-2 space-y-3">
        <div className="flex justify-between items-center">
          <h2 className={`text-base font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            <Stethoscope className="w-5 h-5 text-teal-600" /> كادر الأطباء الحالي ({doctors.length})
          </h2>
          <span className="text-xs text-slate-400">يظهر الأطباء مباشرة للمرضى في صفحة الحجز</span>
        </div>

        {doctors.length === 0 ? (
          <div className={`p-8 rounded-3xl border text-center space-y-2 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <Stethoscope className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm text-slate-400">لا يوجد أطباء مسجلون في هذه المنشأة حتى الآن.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {doctors.map((doc) => (
              <div
                key={doc.id}
                className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded-md">
                      سعر الكشف: {formatMoney(doc.consultation_fee || 20)}
                    </span>
                    <button
                      onClick={() => handleDeleteDoctor(doc.id)}
                      disabled={deletingId === doc.id}
                      className="text-slate-400 hover:text-rose-500 transition p-1"
                      title="حذف الطبيب"
                    >
                      {deletingId === doc.id ? <Loader2 className="w-4 h-4 animate-spin text-rose-500" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                  <h3 className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{doc.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{doc.specialty}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
