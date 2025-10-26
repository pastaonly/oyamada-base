import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
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
