import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase';
import { Mail, Lock, User, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';

const ALLOWED_EMAILS = [
  'jiin0723@composecoffee.co.kr',
  'kth@composecoffee.co.kr',
  'choihy@composecoffee.co.kr'
];

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    // Whitelist check
    if (!ALLOWED_EMAILS.includes(email.toLowerCase())) {
        if (!isLogin) {
            setError('등록된 아이디만 회원 가입이 가능합니다.');
        } else {
            setError('접근 권한이 없는 이메일입니다.');
        }
        setLoading(false);
        return;
    }


    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });
      }
    } catch (err) {
      console.error("Auth Error:", err.code, err.message);
      let errorMsg = isLogin 
        ? '로그인 중 오류가 발생했습니다. 다시 시도해 주세요.' 
        : '회원 가입 중 오류가 발생했습니다. 다시 시도해 주세요.';
        
      switch (err.code) {
        case 'auth/user-not-found':
          errorMsg = '등록되지 않은 사용자입니다.';
          break;
        case 'auth/wrong-password':
          errorMsg = '비밀번호가 올바르지 않습니다.';
          break;
        case 'auth/email-already-in-use':
          errorMsg = '이미 가입된 이메일입니다. 로그인해 주세요.';
          break;
        case 'auth/invalid-email':
          errorMsg = '유효하지 않은 이메일 형식입니다.';
          break;
        case 'auth/weak-password':
          errorMsg = '비밀번호는 최소 6자 이상이어야 합니다.';
          break;
        case 'auth/invalid-credential':
          errorMsg = '이메일 또는 비밀번호가 올바르지 않습니다.';
          break;
        case 'auth/operation-not-allowed':
          errorMsg = '이메일/비밀번호 인증이 활성화되어 있지 않습니다. 관리자에게 문의하세요.';
          break;
        case 'auth/unauthorized-domain':
          errorMsg = '이 도메인은 승인된 도메인이 아닙니다. Firebase 콘솔 설정을 확인하세요.';
          break;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('이메일을 입력해 주세요.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('비밀번호 재설정 이메일을 보냈습니다.');
    } catch (err) {
      setError('이메일을 보내지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50 via-white to-slate-50">
      <div className="max-w-md w-full">
        {/* Logo Section */}
        <div className="text-center mb-10 group">
          <div className="inline-flex w-16 h-16 bg-indigo-600 rounded-2xl items-center justify-center shadow-2xl shadow-indigo-200 mb-6 group-hover:scale-110 transition-transform duration-500">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">Compose</h1>
          <p className="text-[10px] text-slate-400 font-bold tracking-[0.3em] mt-2">TREASURY MANAGEMENT SYSTEM</p>
        </div>

        {/* Card Section */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 p-10 border border-slate-100 backdrop-blur-sm relative overflow-hidden">
          {/* Decorative element */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
          
          <div className="relative">
            <h2 className="text-2xl font-black text-slate-800 mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-slate-400 text-sm font-medium mb-8">
              {isLogin ? '시스템에 접속하기 위해 로그인하세요.' : '등록된 이메일로 가입을 진행하세요.'}
            </p>

            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input
                    type="text"
                    required
                    placeholder="이름"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-600 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              )}
              
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <input
                  type="email"
                  required
                  placeholder="이메일"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-600 outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <input
                  type="password"
                  required
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-600 outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 rounded-2xl text-red-600 text-[13px] font-bold border border-red-100 animate-shake">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {message && (
                <div className="flex items-center gap-2 p-4 bg-emerald-50 rounded-2xl text-emerald-600 text-[13px] font-bold border border-emerald-100">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>{message}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl text-[13px] font-black uppercase tracking-widest hover:bg-indigo-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200 disabled:opacity-70 disabled:pointer-events-none group"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {isLogin ? 'Login System' : 'Create Account'}
                    <TrendingUp className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 flex flex-col gap-3">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-slate-500 text-[13px] font-bold hover:text-indigo-600 transition-colors"
                type="button"
              >
                {isLogin ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
              </button>
              
              {isLogin && (
                <button
                  onClick={handleResetPassword}
                  className="text-slate-400 text-[12px] font-bold hover:text-slate-600 transition-colors"
                  type="button"
                >
                  비밀번호를 잊으셨나요?
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center mt-10 text-slate-400 text-[11px] font-bold tracking-widest uppercase opacity-60">
          © 2026 Financial Intelligence Unit
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
