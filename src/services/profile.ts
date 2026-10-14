import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { storage, db } from "@/lib/firebaseConfig";
import type { AppUser } from "@/types/user";

function createAvatarPath(uid: string) {
  const uniqueId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}`;
  return `avatars/${uid}/${uniqueId}`;
}

export async function updateUserAvatar(file: File, user: AppUser) {
  const storageRef = ref(storage, createAvatarPath(user.uid));
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);

  const userRef = doc(db, "users", user.uid);
  await setDoc(
    userRef,
    {
      photoURL: downloadURL,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  // 既存の予約に反映
  const reservationsRef = collection(db, "reservations");
  const q = query(reservationsRef, where("userId", "==", user.uid));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.update(docSnap.ref, { userAvatarUrl: downloadURL });
    });
    await batch.commit();
  }

  return downloadURL;
}

export async function updateUserProfileDetails({
  user,
  nickname,
  bio,
}: {
  user: AppUser;
  nickname: string;
  bio: string;
}) {
  const userRef = doc(db, "users", user.uid);
  await setDoc(
    userRef,
    {
      nickname,
      bio,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  const reservationsRef = collection(db, "reservations");
  const q = query(reservationsRef, where("userId", "==", user.uid));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.update(docSnap.ref, { userName: nickname || user.displayName || user.email });
    });
    await batch.commit();
  }
}

const CONTRACT_COLLECTION = "memberContracts";
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

export class UnregisteredMemberError extends Error {
  constructor() {
    super("このメールアドレスは登録されていません");
    this.name = "UnregisteredMemberError";
  }
}

// 事前登録（memberContracts）を確認し、users/{uid} を作成・更新する
export async function ensureUserProfile(user: User) {
  const email = user.email;

  if (!email) {
    throw new Error("メールアドレスが取得できませんでした。");
  }

  const contractSnapshot = await getDoc(doc(db, CONTRACT_COLLECTION, email));
  if (!contractSnapshot.exists()) {
    throw new UnregisteredMemberError();
  }

  const userDocRef = doc(db, "users", user.uid);
  const userDocSnapshot = await getDoc(userDocRef);
  const isAdmin = ADMIN_EMAIL ? email === ADMIN_EMAIL : false;

  const commonProfileFields = {
    uid: user.uid,
    email,
    displayName: user.displayName ?? "",
    isAdmin,
    updatedAt: serverTimestamp(),
  };

  if (userDocSnapshot.exists()) {
    await setDoc(userDocRef, commonProfileFields, { merge: true });
    return;
  }

  await setDoc(
    userDocRef,
    {
      ...commonProfileFields,
      photoURL: user.photoURL ?? "",
      nickname: user.displayName ?? "",
      bio: "",
      createdAt: serverTimestamp(),
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
