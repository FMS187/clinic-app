import BookingWizard from '@/components/booking/BookingWizard';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 py-6 sm:py-12 px-3 sm:px-6 flex justify-center items-center">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        <div className="bg-teal-700 text-white p-6 text-center">
          <h1 className="text-2xl font-bold">بوابة حجز المواعيد الطبية والتجميلية</h1>
          <p className="text-teal-100 text-sm mt-1">اختر الفرع والخدمة واحجز موعدك بسهولة</p>
        </div>
        <BookingWizard />
      </div>
    </main>
  );
}
