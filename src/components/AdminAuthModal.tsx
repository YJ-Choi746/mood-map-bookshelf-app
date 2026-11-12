import React, { useState } from 'react';
import { ShieldCheck, X, LogIn, AlertCircle } from 'lucide-react';

export interface AdminUser {
  email: string;
  name: string;
  picture?: string;
  role: string;
  loginTime: string;
}

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AdminUser) => void;
  defaultEmail?: string;
}

export function AdminAuthModal({
  isOpen,
  onClose,
  onLoginSuccess,
  defaultEmail = 'yeonj445@gmail.com',
}: AdminAuthModalProps) {
  const [emailInput, setEmailInput] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async (emailToUse: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailToUse,
          name: emailToUse.split('@')[0],
          picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(emailToUse)}`,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || '로그인 인증에 실패했습니다.');
      }

      const data = await res.json();
      if (data.success && data.user) {
        sessionStorage.setItem('admin_user', JSON.stringify(data.user));
        window.location.hash = '#admin';
        onLoginSuccess(data.user);
        onClose();
      } else {
        throw new Error('인증 응답이 올바르지 않습니다.');
      }
    } catch (err: any) {
      setError(err.message || '구글 로그인 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-2xl border border-[#D6D3DE] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-[#D6D3DE]/60">
          <div className="flex items-center gap-2 text-[#5B4FB0]">
            <ShieldCheck className="w-5 h-5" />
            <h3 className="font-serif-kr font-bold text-lg text-[#1F2433]">
              관리자 구글 로그인
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-5 space-y-4 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#E6E2F7] flex items-center justify-center text-[#5B4FB0] shadow-inner">
            <svg className="w-7 h-7" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          </div>

          <div>
            <h4 className="font-serif-kr font-bold text-base text-[#1F2433]">
              AI 프롬프트 스튜디오 접근
            </h4>
            <p className="text-xs text-[#646A7A] mt-1.5 leading-relaxed">
              구글 계정으로 로그인하여 AI 감정 분석 프롬프트 및 도서 큐레이션 정책을 세밀하게 조정할 수 있습니다.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Sign-in Button with connected account */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => handleGoogleLogin(emailInput)}
              disabled={loading}
              className="w-full py-3 px-4 bg-white border border-[#D6D3DE] hover:border-[#1F2433]/40 hover:bg-gray-50 text-[#1F2433] rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-3 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{emailInput} 계정으로 로그인</span>
            </button>

            {/* Custom email alternative */}
            <div className="pt-2">
              <label className="block text-[11px] text-[#646A7A] mb-1 text-left">
                다른 구글 계정으로 로그인:
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="admin@gmail.com"
                  className="flex-1 px-3 py-1.5 bg-gray-50 border border-[#D6D3DE] rounded-lg text-xs"
                />
                <button
                  type="button"
                  onClick={() => handleGoogleLogin(emailInput)}
                  disabled={!emailInput.trim() || loading}
                  className="px-3 py-1.5 bg-[#1F2433] text-white rounded-lg text-xs font-bold hover:bg-black transition-colors cursor-pointer disabled:opacity-40"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 text-center border-t border-[#D6D3DE]/60">
          <span className="text-[11px] text-[#646A7A]">
            구글 로그인 사용자 전체에게 관리자 권한이 부여됩니다.
          </span>
        </div>
      </div>
    </div>
  );
}
