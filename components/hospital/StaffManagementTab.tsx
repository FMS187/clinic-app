'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Users, UserPlus, KeyRound, Trash2, CheckCircle2, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';

export interface StaffMember {
  id: string;
  name: string;
  pin_code: string; // رمز سري من 4 أرقام
  phone?: string;
  is_active: boolean;
  created_at: string;
}

interface StaffManagementTabProps {
  facilityId: string;
  initialStaff: StaffMember[];
  isDarkMode: boolean;
  onStaffUpdated: (newStaff: StaffMember[]) => void;
}

export default function StaffManagementTab({
  facilityId,
  initialStaff = [],
  isDarkMode,
  onStaffUpdated
}: StaffManagementTabProps) {
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [name, setName] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const saveStaffList = async (updatedList: StaffMember[]) => {
    setSaving(true);
    const { data: fac } = await supabase.from('ClinicFacility').select('wallets_info').eq('id', facilityId).single();
    const existingWallets = fac?.wallets_info || {};
    const newWallets = { ...existingWallets, reception_staff: updatedList };

    const { error } = await supabase.from('ClinicFacility').update({ wallets_info: newWallets }).eq('id', facilityId);

    if (!error) {
      setStaff(updatedList);
      onStaffUpdated(updatedList);
      setMsg('تم تحديث بيانات موظفي الاستقبال بنجاح!');
      setTimeout(() => setMsg(null), 3500);
    } else {
      alert(`خطأ: ${error.message}`);
    }
    setSaving(false);
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || pinCode.trim().length < 4) {
      alert('يرجى كتابة الاسم وتحديد رمز PIN من 4 أرقام على الأقل');
      return;
    }

    // التأكد من عدم تكرار الـ PIN
    if (staff.some(s => s.pin_code === pinCode.trim())) {
      alert('رمز الـ PIN هذا مسجل مسبقاً لموظف آخر، يرجى اختيار رمز مختلف.');
      return;
    }

    const newMember: StaffMember = {
      id: Date.now().toString(),
      name: name.trim(),
      pin_code: pinCode.trim(),
      phone: phone.trim(),
      is_active: true,
      created_at: new Date().toISOString()
    };

    const updated = [newMember, ...staff];
    await saveStaffList(updated);
    setName('');
    setPinCode('');
    setPhone('');
  };

  const handleToggleActive = async (id: string) => {
    const updated = staff.map(s => s.id === id ? { ...s, is_active: !s.is_active } : s);
    await saveStaffList(updated);
  };

  const handleDeleteStaff = async (id: string, staffName: string) => {
    if (!confirm(`هل أنت متأكد من حذف حساب موظف الاستقبال: ${staffName}؟`)) return;
    const updated = staff.filter(s => s.id !== id);
    await saveStaffList(updated);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* بطاقة إضافة موظف جديد */}
      <section className={`p-6 rounded-3xl border shadow-sm space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className={`border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <h2 className={`text-base font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            <UserPlus className="w-5 h-5 text-teal-600" />
            إضافة موظف استقبال جديد وتعيين رقمه السري
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            يحصل كل موظف على رمز سري (PIN) خاص به لتسجيل الدخول وبدء وردية العمل وتوثيق الكشوفات باسمه
          </p>
        </div>

        {msg && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {msg}
          </div>
        )}

        <form onSubmit={handleAddStaff} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-bold mb-1">اسم الموظف</label>
            <input
              type="text"
              required
              placeholder="مثال: أحمد عبد الله"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full p-2.5 border rounded-xl outline-none ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
            />
          </div>

          <div>
            <label className="block font-bold mb-1">الرمز السري الخاص (PIN)</label>
            <input
              type="password"
              maxLength={6}
              required
              placeholder="4 إلى 6 أرقام"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              className={`w-full p-2.5 border rounded-xl font-mono text-center font-bold tracking-widest outline-none ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
            />
          </div>

          <div>
            <label className="block font-bold mb-1">رقم الهاتف (اختياري)</label>
            <input
              type="tel"
              placeholder="770000000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`w-full p-2.5 border rounded-xl font-mono outline-none ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-1.5"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              حفظ وتوليد الحساب
            </button>
          </div>
        </form>
      </section>

      {/* جدول موظفي الاستقبال الحاليين */}
      <section className={`p-6 rounded-3xl border shadow-sm space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h3 className={`text-base font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          <Users className="w-5 h-5 text-teal-600" />
          طاقم موظفي الاستقبال المعتمدين ({staff.length})
        </h3>

        {staff.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            لم يتم إنشاء حسابات لموظفي الاستقبال بعد. أضف أول موظف من الخانة بالأعلى.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className={`border-b ${isDarkMode ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                <tr>
                  <th className="p-3">اسم الموظف</th>
                  <th className="p-3">الرمز السري (PIN)</th>
                  <th className="p-3">رقم الهاتف</th>
                  <th className="p-3">حالة الحساب</th>
                  <th className="p-3">الإجراءات</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {staff.map((s) => (
                  <tr key={s.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                    <td className="p-3 font-bold">{s.name}</td>
                    <td className="p-3 font-mono text-amber-500 font-bold">•••• ({s.pin_code})</td>
                    <td className="p-3 font-mono text-slate-400">{s.phone || '—'}</td>
                    <td className="p-3">
                      <button
                        onClick={() => handleToggleActive(s.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          s.is_active 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {s.is_active ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                        {s.is_active ? 'نشط ومصرح' : 'معطل مؤقتاً'}
                      </button>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleDeleteStaff(s.id, s.name)}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 rounded-lg transition"
                        title="حذف الحساب"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
}
