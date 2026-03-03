import React, { useState } from 'react';
import { 
  CreditCard, 
  Building2, 
  User, 
  Copy, 
  Check, 
  ArrowRight, 
  Smartphone, 
  ShieldCheck,
  AlertCircle,
  Loader2,
  FileText
} from 'lucide-react';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

interface PaymentProps {
  onBack: () => void;
  userEmail: string;
}

export default function Payment({ onBack, userEmail }: PaymentProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [settings, setSettings] = useState({
    bank_name: '...',
    account_name: '...',
    rib: '...',
    whatsapp_number: '...'
  });

  React.useEffect(() => {
    const fetchSettings = async () => {
      if (!db) return;
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'payment'));
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data() as any);
        }
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      }
    };
    fetchSettings();
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = async () => {
    if (!auth?.currentUser || !db) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'payment_requests'), {
        user_id: auth.currentUser.uid,
        email: auth.currentUser.email,
        status: 'pending',
        created_at: new Date().toISOString()
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Failed to submit payment request:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto bg-white p-12 rounded-[3rem] border border-neutral-100 card-shadow text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-display font-bold text-neutral-900">تم إرسال الطلب بنجاح! 🎉</h2>
          <p className="text-neutral-500 leading-relaxed">
            شكراً ليك! دابا الفريق ديالنا غيتحقق من التحويل البنكي ديالك وغيفعل ليك حساب Pro فقل من 24 ساعة. غيوصلك إيميل تأكيد فاش تسالي العملية.
          </p>
        </div>
        <button 
          onClick={onBack}
          className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold hover:bg-neutral-800 transition-all"
        >
          الرجوع للرئيسية
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Left Side: Instructions */}
      <div className="lg:col-span-7 space-y-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 card-shadow space-y-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-neutral-900">التحويل البنكي (Virement)</h2>
              <p className="text-neutral-400 text-sm">خلص بأمان عن طريق البنك ديالك</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-neutral-50 rounded-3xl space-y-4 border border-neutral-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">معلومات الحساب</span>
                <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg">المغرب فقط 🇲🇦</span>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between group">
                  <div className="space-y-1">
                    <p className="text-[10px] text-neutral-400 font-bold uppercase">اسم البنك</p>
                    <p className="text-sm font-bold text-neutral-900">{settings.bank_name}</p>
                  </div>
                  <button onClick={() => handleCopy(settings.bank_name, 'bank')} className="p-2 text-neutral-300 hover:text-emerald-600 transition-colors">
                    {copied === 'bank' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between group">
                  <div className="space-y-1">
                    <p className="text-[10px] text-neutral-400 font-bold uppercase">صاحب الحساب</p>
                    <p className="text-sm font-bold text-neutral-900">{settings.account_name}</p>
                  </div>
                  <button onClick={() => handleCopy(settings.account_name, 'name')} className="p-2 text-neutral-300 hover:text-emerald-600 transition-colors">
                    {copied === 'name' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between group p-4 bg-white rounded-2xl border border-neutral-100">
                  <div className="space-y-1">
                    <p className="text-[10px] text-neutral-400 font-bold uppercase">رقم الحساب (RIB)</p>
                    <p className="text-sm font-mono font-bold text-emerald-600 tracking-tighter">{settings.rib}</p>
                  </div>
                  <button onClick={() => handleCopy(settings.rib, 'rib')} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all">
                    {copied === 'rib' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600" /> خطوات التفعيل:
              </h3>
              <ul className="space-y-3">
                {[
                  "دير تحويل بنكي ديال 20 درهم للحساب الفوق.",
                  "سكريني (Screenshot) وصل التحويل (Reçu).",
                  `صيفط السكرين لـ WhatsApp ديالنا: ${settings.whatsapp_number}`,
                  "أو كليكي على 'أكدت التحويل' لتحت باش نعلمو الإدارة."
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-neutral-600">
                    <span className="w-5 h-5 bg-neutral-100 text-neutral-400 text-[10px] font-bold rounded-full flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-50 flex flex-col sm:flex-row gap-4">
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              أكدت التحويل البنكي
            </button>
            <button 
              onClick={onBack}
              className="px-8 py-4 bg-neutral-100 text-neutral-600 rounded-2xl font-bold text-sm hover:bg-neutral-200 transition-all"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>

      {/* Right Side: Summary Card */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-neutral-900 p-8 rounded-[2.5rem] text-white space-y-8 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl"></div>
          
          <div className="space-y-2 relative">
            <h3 className="text-lg font-display font-bold">ملخص الطلب</h3>
            <p className="text-white/40 text-xs uppercase tracking-widest font-bold">Order Summary</p>
          </div>

          <div className="space-y-4 relative">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">الخطة المختارة</span>
              <span className="font-bold">Adib Pro (Unlimited)</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">مدة الاشتراك</span>
              <span className="font-bold">دائم (مدى الحياة)</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">الحساب</span>
              <span className="font-bold truncate max-w-[150px]">{userEmail}</span>
            </div>
            <div className="h-px bg-white/10 my-4"></div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">المجموع</span>
              <span className="text-2xl font-display font-bold text-emerald-400">20 DH</span>
            </div>
          </div>

          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3 relative">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase">ملاحظة هامة</span>
            </div>
            <p className="text-[11px] text-white/60 leading-relaxed">
              التفعيل كيتم يدوياً من طرف الفريق ديالنا. فاش كتأكد التحويل، كنراجعو الحساب البنكي ديالنا وكنفعلو ليك الحساب فبلاصة.
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-neutral-100 card-shadow flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-neutral-900">دفع آمن 100%</p>
            <p className="text-xs text-neutral-400">البيانات ديالك محمية ومشفرة.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
