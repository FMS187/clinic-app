'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Wallet, Plus, Trash2, CheckCircle2, Loader2 } from 'lucide-react';

export const YEMEN_WALLETS = [
  { id: 'kuraimi', name: 'بنك الكريمي (حاسب / حساب)' },
  { id: 'onecash', name: 'ون كاش (OneCash)' },
  { id: 'floosak', name: 'فلوسك (بنك اليمن والكويت)' },
  { id: 'jawali', name: 'جوالي (بنك اليمن والبحرين)' },
  { id: 'jaib', name: 'جايبي (بنك التضامن)' },
  { id: 'cashi', name: 'كاش (بنك سبأ الإسلامي)' },
  { id: 'mobilemoney', name: 'موبايل موني (كاك بنك)' },
  { id: 'peys', name: 'بيس (بنك الأمل)' },
  { id: 'mywallet', name: 'محفظتي (بنك اليمن الدولي)' },
  { id: 'yemencash', name: 'يمن كاش' },
];

interface WalletsTabProps {
  facilityId: string;
  initialWallets?: Record<string, string>;
  isDarkMode: boolean;
}

export default function WalletsTab({ facilityId, initialWallets = {}, isDarkMode }: WalletsTabProps) {
  const [customWallets, setCustomWallets] = useState<Array<{ walletId: string; accountNumber: string }>>(() => {
    return Object.entries(initialWallets)
      .filter(([_, num]) => typeof num === 'string' && num.trim() !== '')
      .map(([walletId, accountNumber]) => ({ walletId, accountNumber: String(accountNumber) }));
  });

  const [selectedWalletType, setSelectedWalletType] = useState('kuraimi');
  const [accountNumber, setAccountNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleAddWallet = () => {
    if (!accountNumber.trim()) return;
    const existingIndex = customWallets.findIndex(w => w.walletId === selectedWalletType);
    if (existingIndex >= 0) {
      const updated = [...customWallets];
      updated[existingIndex].accountNumber = accountNumber.trim();
      setCustomWallets(updated);
    } else {
      setCustomWallets(prev => [...prev, { walletId: selectedWalletType, accountNumber: accountNumber.trim() }]);
    }
    setAccountNumber('');
  };

  const handleRemoveWallet = (walletId: string) => {
    setCustomWallets(prev => prev.filter(w => w.walletId !== walletId));
  };

  const handleSaveToDb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId) return;
    setSaving(true);

    const payload: Record<string, string> = {};
    customWallets.forEach(w => {
      payload[w.walletId] = w.accountNumber;
    });

    const { error } = await supabase
      .from('ClinicFacility')
      .update({ wallets_info: payload })
      .eq('id', facilityId);

    if (!error) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  };

  return (
    <div className={`p-6 rounded-3xl border shadow-sm max-w-2xl mx-auto space-y-6 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
      <div className={`border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
        <h2 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          <Wallet className="w-5 h-5 text-teal-600" /> إدارة حسابات المحافظ الإلكترونية اليمنية
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">أضف أو احذف المحافظ التي تمتلكها المنشأة لاستقبال عربون المرضى</p>
      </div>

      <div className={`p-4 rounded-2xl border space-y-3 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
        <span className="text-xs font-bold block text-teal-500">إضافة محفظة أو حساب جديد:</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-bold mb-1">اختر المحفظة البنكية</label>
            <select
              value={selectedWalletType}
              onChange={(e) => setSelectedWalletType(e.target.value)}
              className={`w-full p-2.5 border rounded-xl text-xs outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
            >
              {YEMEN_WALLETS.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold mb-1">رقم الحساب / الهاتف</label>
            <input
              type="text"
              placeholder="أدخل رقم الحساب أو المحفظة"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className={`w-full p-2.5 border rounded-xl text-xs outline-none font-mono ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddWallet}
          disabled={!accountNumber.trim()}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4 text-teal-400" /> إدراج في قائمة محافظ المنشأة
        </button>
      </div>

      <form onSubmit={handleSaveToDb} className="space-y-4">
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-400 block">المحافظ المعتمدة حالياً لدى منشأتكم ({customWallets.length}):</span>
          {customWallets.length === 0 ? (
            <p className="text-center py-6 text-xs text-slate-400 bg-slate-950/20 rounded-2xl border border-dashed border-slate-700">
              لم تقم بإضافة أي محفظة حتى الآن. أضف حساباً لتسهيل دفع المرضى.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {customWallets.map(w => {
                const walletMeta = YEMEN_WALLETS.find(y => y.id === w.walletId) || { name: w.walletId };
                return (
                  <div
                    key={w.walletId}
                    className={`p-3 rounded-2xl border flex justify-between items-center ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}
                  >
                    <div>
                      <span className="text-[11px] font-bold block">{walletMeta.name}</span>
                      <span className="text-xs font-mono font-black text-teal-500">{w.accountNumber}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveWallet(w.walletId)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition"
                      title="حذف هذه المحفظة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {success && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> تم حفظ ونشر المحافظ بنجاح!
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm transition"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'حفظ وتثبيت التغييرات'}
        </button>
      </form>
    </div>
  );
}
