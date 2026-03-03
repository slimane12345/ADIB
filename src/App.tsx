/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Sparkles, 
  Send, 
  Copy, 
  Check, 
  RefreshCw, 
  Layout, 
  Target, 
  Tag, 
  Zap, 
  Video,
  ArrowRight,
  Facebook,
  AlertCircle,
  Image as ImageIcon,
  X,
  Upload,
  BarChart3,
  PenTool,
  Coins,
  CreditCard,
  ShieldCheck,
  Zap as ZapIcon,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, increment, collection, addDoc } from 'firebase/firestore';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth';
import Payment from './components/Payment';

// Types
interface User {
  credits: number;
  isPro: boolean;
  isAdmin: boolean;
  email: string;
}
interface ScriptIdea {
  idea: string;
  visuals: string;
  duration: string;
}

interface AdOutput {
  hook: string;
  body: string;
  cta: string;
  scripts: ScriptIdea[];
}

export default function App() {
  const [view, setView] = useState<'generator' | 'dashboard' | 'pricing' | 'auth' | 'payment'>('generator');
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<AdOutput[]>([]);
  const [activeVersion, setActiveVersion] = useState(0);
  const [image, setImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Firebase Auth State
  React.useEffect(() => {
    if (!auth) {
      setLoadingUser(false);
      setError("إعدادات Firebase مفقودة. يرجى ضبط VITE_FIREBASE_API_KEY في إعدادات Vercel.");
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Fetch user profile from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser(userDoc.data() as User);
          } else {
            // Fallback if doc doesn't exist yet
            setUser({
              email: firebaseUser.email || '',
              credits: 5,
              isPro: false,
              isAdmin: firebaseUser.email === 'elegancecom71@gmail.com'
            });
          }
          setView('generator');
        } else {
          setUser(null);
          setView('auth');
        }
      } catch (err) {
        console.error("Auth state change error:", err);
        setUser(null);
        setView('auth');
      } finally {
        setLoadingUser(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = () => {
    setView('generator');
  };

  const fetchUser = async () => {
    if (!auth?.currentUser || !db) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        setUser(userDoc.data() as User);
      }
    } catch (err) {
      console.error("Failed to fetch user:", err);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setView('auth');
  };

  const upgradeToPro = async () => {
    if (!auth?.currentUser || !db) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { isPro: true });
      
      // Update local state
      setUser(prev => prev ? { ...prev, isPro: true } : null);
      setView('generator');
      setShowUpgradeModal(false);
    } catch (err) {
      console.error("Upgrade failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    type: 'مادي',
    category: 'إلكترونيات',
    audience: '',
    feature: '',
    price: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("الصورة كبيرة بزاف (ماكس 5MB).");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImage(base64String.split(',')[1]);
        setImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const generateAd = async () => {
    if (!user) return;
    
    if (!user.isPro && user.credits <= 0) {
      setShowUpgradeModal(true);
      return;
    }

    if (!formData.name || !formData.audience || !formData.feature) {
      setError("عافاك عمر المعلومات الأساسية (الاسم، الجمهور، والميزة).");
      return;
    }

    setLoading(true);
    setError(null);
    setOutputs([]);
    setActiveVersion(0);

    try {
      const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        setError("مفتاح Gemini API مفقود. يرجى ضبط GEMINI_API_KEY في إعدادات Vercel.");
        setLoading(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-3-flash-preview";
      
      const textPart = {
        text: `
          أنت الآن "أديب"، أفضل خبير تسويق رقمي في المغرب. عندك خبرة 10 سنين في الفيسبوك ADS والبيع عبر الإنترنت.
          الهدف ديالك: توليد 3 نسخ مختلفة من إعلان فيسبوك احترافي، مكتوب بالدارجة المغربية، يبيع ويجيب التفاعل، باش المستخدم يقدر يدير A/B Testing.

          معلومات المنتج:
          - الاسم: ${formData.name}
          - النوع: ${formData.type}
          - الفئة: ${formData.category}
          - الجمهور المستهدف: ${formData.audience}
          - الميزة الرئيسية: ${formData.feature}
          - السعر: ${formData.price}

          ${image ? "شوف الصورة المرفقة باش تفهم المنتج كتر وتوصفو بدقة." : ""}

          المطلوب منك ترجع النتيجة بصيغة JSON فقط، عبارة عن مصفوفة (Array) فيها 3 كائنات، بهاد الشكل:
          [
            {
              "hook": "عنوان رئيسي قصير وصادم للنسخة 1",
              "body": "نص الإعلان بالدارجة للنسخة 1",
              "cta": "العبارة المحفزة للنسخة 1",
              "scripts": [
                {
                  "idea": "فكرة الفيديو الإبداعية (مثلا: مشهد تمثيلي، Unboxing، تحدي)",
                  "visuals": "وصف الجاذبية البصرية (شنو غيبان فالفيديو بالضبط، الإضاءة، الزوايا)",
                  "duration": "المدة الزمنية المقترحة (مثلا: 15 ثانية)"
                },
                ... (3 أفكار فيديوهات إبداعية)
              ]
            },
            ... (نسخة 2 و 3 بزوايا تسويقية مختلفة)
          ]

          شروط الإعلان الناجح:
          - أفكار الفيديو خاص تكون إبداعية، كتركز على الجاذبية البصرية (Visual Appeal) وكتشد العين فالثواني الأولى.
          - كل نسخة خاص يكون عندها زاوية تسويقية مختلفة.
          - الدارجة ديال الشارع المغربي، مفهومة للجميع.
          - ركز على الألم (المشكلة) قبل الفرحة (المنتج).
          - استخدم كلمات مغربية أصيلة: "شي حاجة خرااافية"، "ما غتندمش"، "هاد الفرصة ما تعوضش".
        `
      };

      const parts: any[] = [textPart];
      if (image) {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: image
          }
        });
      }

      const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: {
          responseMimeType: "application/json"
        }
      });

      const result = JSON.parse(response.text || '[]');
      setOutputs(Array.isArray(result) ? result : [result]);

      // Deduct credit and save activity in Firestore
      if (auth?.currentUser && db) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        
        if (!user?.isPro) {
          await updateDoc(userRef, {
            credits: increment(-1)
          });
          // Update local state
          setUser(prev => prev ? { ...prev, credits: prev.credits - 1 } : null);
        }

        // Save to activity log
        await addDoc(collection(db, 'ads_generated'), {
          userId: auth.currentUser.uid,
          email: auth.currentUser.email,
          product_name: formData.name,
          category: formData.category,
          created_at: new Date().toISOString()
        });
      }
    } catch (err: any) {
      console.error("Generation Error:", err);
      if (err.message?.includes("API key not valid")) {
        setError("مفتاح API غير صالح. تأكد من GEMINI_API_KEY في Vercel.");
      } else if (err.message?.includes("quota")) {
        setError("وصلتي للحد الأقصى ديال الاستخدام (Quota Exceeded).");
      } else if (err.message?.includes("safety")) {
        setError("المحتوى تم حظره بسبب سياسات السلامة.");
      } else {
        setError(`وقع مشكل: ${err.message || "حاول مرة أخرى."}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const currentOutput = outputs[activeVersion];

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 selection:bg-emerald-100 selection:text-emerald-900">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-neutral-200/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 p-2 rounded-xl">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-display font-bold tracking-tight text-neutral-900">
              ADIB <span className="text-emerald-600">أديب</span>
            </h1>
          </div>
          <div className="flex items-center gap-4 md:gap-6 text-sm font-medium text-neutral-500">
            <button 
              onClick={() => setView('generator')}
              className={`flex items-center gap-2 transition-colors ${view === 'generator' ? 'text-emerald-600 font-bold' : 'hover:text-emerald-600'}`}
            >
              <PenTool className="w-4 h-4" />
              <span className="hidden sm:inline">مولد الإعلانات</span>
            </button>
            {user?.isAdmin && (
              <button 
                onClick={() => setView('dashboard')}
                className={`flex items-center gap-2 transition-colors ${view === 'dashboard' ? 'text-emerald-600 font-bold' : 'hover:text-emerald-600'}`}
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">لوحة التحكم</span>
              </button>
            )}
            
            {user ? (
              <div className="flex items-center gap-4 border-l border-neutral-200 pl-6">
                <div className="flex items-center gap-1.5 bg-neutral-100 px-3 py-1.5 rounded-full">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-neutral-700">
                    {user.isPro ? 'Unlimited' : `${user.credits} Credits`}
                  </span>
                </div>
                {!user.isPro && (
                  <button 
                    onClick={() => setView('pricing')}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-full text-xs hover:bg-emerald-700 transition-all font-bold shadow-sm"
                  >
                    ترقية الحساب
                  </button>
                )}
                {user.isPro && (
                  <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-100">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Pro Account</span>
                  </div>
                )}
                <div className="flex items-center gap-2 ml-2">
                  <button 
                    onClick={fetchUser}
                    className="p-2 text-neutral-400 hover:text-emerald-600 transition-colors"
                    title="تحديث البيانات"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <div className="w-8 h-8 bg-neutral-200 rounded-full flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-neutral-500" />
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                    title="تسجيل الخروج"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setView('auth')}
                className="bg-neutral-900 text-white px-6 py-2 rounded-full text-xs hover:bg-neutral-800 transition-all font-bold"
              >
                تسجيل الدخول
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {view === 'auth' ? (
          <Auth onAuthSuccess={handleAuthSuccess} />
        ) : view === 'dashboard' && user?.isAdmin ? (
          <Dashboard setView={setView} />
        ) : view === 'payment' ? (
          <Payment onBack={() => setView('pricing')} userEmail={user?.email || ''} />
        ) : view === 'pricing' ? (
          <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-display font-bold text-neutral-900">اختر الخطة اللي تناسبك 💎</h2>
              <p className="text-neutral-500 text-lg">استفد من "أديب" بلا حدود وكبر البيزنس ديالك.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Free Plan */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 card-shadow space-y-8 opacity-60">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-neutral-900">الخطة المجانية</h3>
                  <p className="text-neutral-400 text-sm">للتجربة والبداية</p>
                </div>
                <div className="text-4xl font-display font-bold text-neutral-900">0 DH <span className="text-sm font-normal text-neutral-400">/ شهر</span></div>
                <ul className="space-y-4">
                  <li className="flex items-center gap-3 text-sm text-neutral-600">
                    <Check className="w-4 h-4 text-emerald-500" /> 5 أرصدة (Generations)
                  </li>
                  <li className="flex items-center gap-3 text-sm text-neutral-600">
                    <Check className="w-4 h-4 text-emerald-500" /> إعلانات بالدارجة المغربية
                  </li>
                  <li className="flex items-center gap-3 text-sm text-neutral-400 line-through">
                    <X className="w-4 h-4" /> رصيد غير محدود
                  </li>
                </ul>
                <button disabled className="w-full py-4 rounded-2xl border border-neutral-200 text-neutral-400 font-bold text-sm">
                  خطتك الحالية
                </button>
              </div>

              {/* Pro Plan */}
              <div className="bg-white p-8 rounded-[2.5rem] border-2 border-emerald-500 card-shadow space-y-8 relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">الأكثر طلباً</div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-neutral-900">الخطة الاحترافية (Pro)</h3>
                  <p className="text-neutral-400 text-sm">للمحترفين والوكالات</p>
                </div>
                <div className="text-4xl font-display font-bold text-neutral-900">20 DH <span className="text-sm font-normal text-neutral-400">لمرة واحدة</span></div>
                <ul className="space-y-4">
                  <li className="flex items-center gap-3 text-sm text-neutral-600 font-bold">
                    <ZapIcon className="w-4 h-4 text-amber-500" /> رصيد غير محدود (Unlimited)
                  </li>
                  <li className="flex items-center gap-3 text-sm text-neutral-600">
                    <Check className="w-4 h-4 text-emerald-500" /> أولوية في توليد الإعلانات
                  </li>
                  <li className="flex items-center gap-3 text-sm text-neutral-600">
                    <Check className="w-4 h-4 text-emerald-500" /> دعم فني مباشر
                  </li>
                  <li className="flex items-center gap-3 text-sm text-neutral-600">
                    <Check className="w-4 h-4 text-emerald-500" /> الوصول لجميع التحديثات
                  </li>
                </ul>
                <button 
                  onClick={() => setView('payment')}
                  className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
                >
                  اشترك دابا بـ 20 درهم
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Form Section */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-display font-bold text-neutral-900">صاوب إعلانك فثواني 🚀</h2>
              <p className="text-neutral-500">عمر المعلومات ديال المنتج ديالك و "أديب" غيتكلف بالباقي بالدارجة المغربية.</p>
            </div>

            <div className="bg-white rounded-3xl p-8 card-shadow border border-neutral-100 space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                      <Tag className="w-3 h-3" /> اسم المنتج
                    </label>
                    <input 
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="مثلا: لابتوب ديل"
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                      <Layout className="w-3 h-3" /> النوع
                    </label>
                    <select 
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm appearance-none bg-white"
                    >
                      <option>مادي</option>
                      <option>خدمة</option>
                      <option>دورة</option>
                      <option>أكل</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                    <Target className="w-3 h-3" /> الجمهور المستهدف
                  </label>
                  <input 
                    name="audience"
                    value={formData.audience}
                    onChange={handleInputChange}
                    placeholder="مثلا: عيالات مهتمات بالطبخ، 25-45 سنة"
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                    <Zap className="w-3 h-3" /> الميزة الرئيسية
                  </label>
                  <textarea 
                    name="feature"
                    value={formData.feature}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="شنو اللي كيخلي هاد المنتج خاص؟"
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">$</span> السعر (اختياري)
                  </label>
                  <input 
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="مثلا: 299 درهم"
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm"
                  />
                </div>

                {/* Image Upload Section */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                    <ImageIcon className="w-3 h-3" /> صورة المنتج (اختياري)
                  </label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative group cursor-pointer border-2 border-dashed rounded-2xl transition-all flex flex-col items-center justify-center overflow-hidden ${imagePreview ? 'border-emerald-500 bg-emerald-50/30 h-48' : 'border-neutral-200 hover:border-emerald-400 hover:bg-neutral-50 h-32'}`}
                  >
                    <input 
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageChange}
                      accept="image/*"
                      className="hidden"
                    />
                    
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <p className="text-white text-xs font-bold">تبديل الصورة</p>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeImage(); }}
                          className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full text-neutral-500 hover:text-red-500 shadow-sm transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 p-4">
                        <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400 group-hover:text-emerald-500 group-hover:bg-emerald-100 transition-all">
                          <Upload className="w-5 h-5" />
                        </div>
                        <p className="text-[10px] text-neutral-400 font-medium">كليكي باش ترفع صورة المنتج</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-500 text-xs bg-red-50 p-3 rounded-xl border border-red-100">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <button 
                onClick={generateAd}
                disabled={loading}
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    ولد الإعلان دابا
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Output Section */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {outputs.length === 0 && !loading ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-neutral-200 rounded-[3rem] bg-neutral-50/50"
                >
                  <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-6">
                    <Facebook className="w-10 h-10 text-neutral-300" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-neutral-400 mb-2">تسنى الإبداع هنا!</h3>
                  <p className="text-neutral-400 max-w-xs text-sm">عمر الفورم اللي على اليسار وغادي يبان ليك الإعلان هنا واجد للنسخ.</p>
                </motion.div>
              ) : loading ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full min-h-[500px] flex flex-col items-center justify-center p-12 space-y-8"
                >
                  <div className="relative">
                    <div className="w-24 h-24 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                    <Sparkles className="w-8 h-8 text-emerald-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-lg font-display font-bold text-neutral-900">"أديب" كيكتب ليك 3 نسخ دابا...</p>
                    <p className="text-neutral-500 text-sm italic">"كنوجدو ليك أحسن الزوايا التسويقية باش تبيع كتر"</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6"
                >
                  {/* Version Tabs */}
                  <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl card-shadow border border-neutral-100 w-fit">
                    {outputs.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveVersion(idx)}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeVersion === idx ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50'}`}
                      >
                        النسخة {idx + 1}
                      </button>
                    ))}
                  </div>

                  {/* Ad Preview Card */}
                  <div className="bg-white rounded-[2.5rem] card-shadow border border-neutral-100 overflow-hidden">
                    <div className="bg-neutral-900 p-6 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
                          <Facebook className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-bold text-sm">Facebook Ad Preview - Version {activeVersion + 1}</p>
                          <p className="text-neutral-400 text-xs">Generated by ADIB AI</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(`${currentOutput?.hook}\n\n${currentOutput?.body}\n\n${currentOutput?.cta}`, 'full')}
                        className="text-white/60 hover:text-white transition-colors"
                      >
                        {copied === 'full' ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>

                    <div className="p-8 space-y-8">
                      {/* Hook */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600">The Hook (العنوان)</span>
                          <button onClick={() => copyToClipboard(currentOutput?.hook || '', 'hook')} className="text-neutral-300 hover:text-neutral-600 transition-colors">
                            {copied === 'hook' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-2xl font-display font-bold text-neutral-900 leading-tight">
                          {currentOutput?.hook}
                        </p>
                      </div>

                      <div className="h-px bg-neutral-100 w-full"></div>

                      {/* Body */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Ad Body (النص)</span>
                          <button onClick={() => copyToClipboard(currentOutput?.body || '', 'body')} className="text-neutral-300 hover:text-neutral-600 transition-colors">
                            {copied === 'body' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-neutral-700 leading-relaxed whitespace-pre-wrap text-lg">
                          {currentOutput?.body}
                        </p>
                      </div>

                      {/* CTA */}
                      <div className="pt-4">
                        <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-100 flex items-center justify-between group cursor-pointer hover:border-emerald-200 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                              <ArrowRight className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Call to Action</p>
                              <p className="text-neutral-900 font-bold text-lg">{currentOutput?.cta}</p>
                            </div>
                          </div>
                          <button onClick={() => copyToClipboard(currentOutput?.cta || '', 'cta')} className="text-neutral-300 hover:text-neutral-600 transition-colors">
                            {copied === 'cta' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Video Scripts */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {currentOutput?.scripts.map((script, idx) => (
                      <div key={idx} className="bg-white p-6 rounded-3xl border border-neutral-100 card-shadow space-y-4 flex flex-col">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-emerald-600">
                            <Video className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Script Idea {idx + 1}</span>
                          </div>
                          <div className="bg-neutral-100 px-2 py-1 rounded-lg text-[10px] font-bold text-neutral-500">
                            {script.duration}
                          </div>
                        </div>
                        
                        <div className="space-y-2 flex-grow">
                          <p className="text-sm font-bold text-neutral-900 leading-tight">{script.idea}</p>
                          <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                            <p className="text-[11px] text-neutral-500 leading-relaxed">
                              <span className="font-bold text-neutral-700">Visuals: </span>
                              {script.visuals}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-neutral-200 py-12 px-6 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="bg-neutral-900 p-1.5 rounded-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-neutral-900">ADIB AI</span>
          </div>
          <p className="text-neutral-400 text-sm">© 2026 أديب - جميع الحقوق محفوظة. صُنع بحب للمسوقين المغاربة.</p>
          <div className="flex items-center gap-6">
            <Facebook className="w-5 h-5 text-neutral-400 hover:text-emerald-600 cursor-pointer transition-colors" />
            <Zap className="w-5 h-5 text-neutral-400 hover:text-emerald-600 cursor-pointer transition-colors" />
          </div>
        </div>
      </footer>
      {/* Upgrade Modal */}
      <AnimatePresence>
        {showUpgradeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUpgradeModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] p-8 card-shadow space-y-6 text-center"
            >
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                <ZapIcon className="w-10 h-10 text-amber-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-display font-bold text-neutral-900">سالي ليك الرصيد! 😅</h3>
                <p className="text-neutral-500">استعملتي 5 المرات "أديب" بالمجان. باش تكمل وتولد إعلانات بلا حدود، رقي الحساب ديالك.</p>
              </div>
              <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-100">
                <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest mb-1">الخطة الاحترافية</p>
                <p className="text-2xl font-display font-bold text-neutral-900">20 DH <span className="text-sm font-normal">/ شهر</span></p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => { setShowUpgradeModal(false); setView('pricing'); }}
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                >
                  شوف خطط الاشتراك
                </button>
                <button 
                  onClick={() => setShowUpgradeModal(false)}
                  className="w-full py-4 text-neutral-400 font-bold text-sm hover:text-neutral-600 transition-colors"
                >
                  خليني نفكر
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
