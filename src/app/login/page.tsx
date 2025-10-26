'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  UserCredential,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";

const PRE_REGISTERED_COLLECTION = "preRegisteredMembers";
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSuccess = async (credential: UserCredential) => {
    const email = credential.user.email;

    if (!email) {
      throw new Error("メールアドレスが取得できませんでした。");
    }

    // 事前登録済みメールアドレス（管理者が Firestore 上で管理）を確認
    const preRegisteredSnapshot = await getDoc(
      doc(db, PRE_REGISTERED_COLLECTION, email),
    );

    if (!preRegisteredSnapshot.exists()) {
      await signOut(auth);
      throw new Error("このメールアドレスは登録されていません");
    }

    const userDocRef = doc(db, "users", credential.user.uid);
    const userDocSnapshot = await getDoc(userDocRef);
    const isAdmin = ADMIN_EMAIL ? email === ADMIN_EMAIL : false;

    const commonProfileFields = {
      uid: credential.user.uid,
      email,
      displayName: credential.user.displayName ?? "",
      isAdmin,
      updatedAt: serverTimestamp(),
    };

    if (userDocSnapshot.exists()) {
      await setDoc(userDocRef, commonProfileFields, { merge: true });
    } else {
      await setDoc(
        userDocRef,
        {
          ...commonProfileFields,
          photoURL: credential.user.photoURL ?? "",
          nickname: credential.user.displayName ?? "",
          bio: "",
          createdAt: serverTimestamp(),
          preferredRoom: null,
          memberType: null,
          contributionSummary: {
            cleaningCount: 0,
            lastCleaningAt: null,
            weeklyUsageCount: 0,
          },
        },
        { merge: true },
      );
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-12 text-slate-900">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white/90 p-10 text-center shadow-lg backdrop-blur">
        <h1 className="text-2xl font-semibold tracking-wide text-slate-900">
          おやまだいベース
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          会員用ログインページです。Googleアカウントでログインしてください。
        </p>

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
