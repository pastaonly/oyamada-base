'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  UserCredential,
} from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";
import { ensureUserProfile, UnregisteredMemberError } from "@/services/profile";
import { useAuth } from "@/components/auth/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLineInAppBrowser, setIsLineInAppBrowser] = useState(false);
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const ua = window.navigator.userAgent ?? "";
    setIsLineInAppBrowser(/\bLine\//i.test(ua));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const currentUser = auth.currentUser;
    if (currentUser) {
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    // ログイン処理中はプロフィール作成の完了を待ってから handleSuccess で遷移する
    if (!authLoading && user && !isLoading) {
      router.replace("/");
    }
  }, [authLoading, user, isLoading, router]);

  const handleSuccess = async (credential: UserCredential) => {
    try {
      await ensureUserProfile(credential.user);
    } catch (error) {
      if (error instanceof UnregisteredMemberError) {
        await signOut(auth);
      }
      throw error;
    }

    router.push("/");
  };

  const signInWithGoogle = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      const credential = await signInWithPopup(auth, provider);
      await handleSuccess(credential);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "ログインに失敗しました";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoading && (authLoading || auth.currentUser || user)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-12 text-slate-500">
        リダイレクト中...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-12 text-slate-900">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white/90 p-10 text-center shadow-lg backdrop-blur">
        <h1 className="text-2xl font-semibold tracking-wide text-slate-900">
          おやまだいベース
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          会員用ログインページです。Googleアカウントでログインしてください。
        </p>
        {isLineInAppBrowser && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            LINEアプリ内ブラウザではGoogleログインが正常に動作しません。画面下のメニューから「リンクをコピー」して、標準ブラウザでアクセスしてください。
          </div>
        )}

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={isLoading}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? "ログイン中..." : "Googleでログイン"}
        </button>

        {errorMessage && (
          <p className="mt-6 text-sm font-medium text-red-600">{errorMessage}</p>
        )}
      </div>
    </div>
  );
}
