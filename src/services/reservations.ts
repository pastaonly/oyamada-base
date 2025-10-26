import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import type { SpaceKey, TimeSlotKey } from "@/constants/schedule";
import type { AppUser } from "@/types/user";

export type ReservationRecord = {
  id: string;
  date: string;
  space: SpaceKey;
  timeSlot: TimeSlotKey;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  createdAt: unknown;
};

export type ReservationMap = Record<string, ReservationRecord[]>;

export function reservationCellKey(
  date: string,
  space: SpaceKey,
  timeSlot: TimeSlotKey,
): string {
  return `${date}_${space}_${timeSlot}`;
}

export function reservationDocId(
  date: string,
  space: SpaceKey,
  timeSlot: TimeSlotKey,
  userId?: string,
): string {
  const base = reservationCellKey(date, space, timeSlot);
  return userId ? `${base}_${userId}` : base;
}

export function subscribeReservationsByDateRange(
  startDate: string,
  endDate: string,
  callback: (reservations: ReservationMap) => void,
): Unsubscribe {
  const reservationsRef = collection(db, "reservations");
  const q = query(
    reservationsRef,
    where("date", ">=", startDate),
    where("date", "<=", endDate),
    orderBy("date", "asc"),
  );

  return onSnapshot(q, (snapshot) => {
    const map: ReservationMap = {};
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as ReservationRecord;
      const key = reservationCellKey(data.date, data.space, data.timeSlot);
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push({
        ...data,
        id: docSnap.id,
      });
    });
    callback(map);
  });
}

export async function toggleReservation({
  date,
  space,
  timeSlot,
  user,
}: {
  date: string;
  space: SpaceKey;
  timeSlot: TimeSlotKey;
  user: AppUser;
}): Promise<"created" | "removed" | "blocked"> {
  const allowsMultiple = space === "front" || space === "back";
  const reservationId = reservationDocId(
    date,
    space,
    timeSlot,
    allowsMultiple ? user.uid : undefined,
  );
  const reservationRef = doc(db, "reservations", reservationId);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reservationRef);

    if (snapshot.exists()) {
      const data = snapshot.data() as ReservationRecord;
      if (data.userId === user.uid) {
        transaction.delete(reservationRef);
        return "removed";
      }
      return "blocked";
    }

    transaction.set(reservationRef, {
      date,
      space,
      timeSlot,
      userId: user.uid,
      userName: user.displayName || user.email,
      userAvatarUrl: user.photoURL || "",
      createdAt: serverTimestamp(),
    });
    return "created";
  });
}
