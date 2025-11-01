'use client';

import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  type Query,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
  type UploadResult,
} from "firebase/storage";
import { db, storage } from "@/lib/firebaseConfig";
import type { AppUser } from "@/types/user";
import {
  type ActivityComment,
  type ActivityDefinition,
  type ActivityLog,
  type ActivityOption,
  type ActivityPhotoInfo,
  type ActivityUserSnapshot,
  type CreateActivityCommentInput,
  type CreateActivityDefinitionInput,
  type CreateActivityLogInput,
  type UpdateActivityCommentInput,
  type UpdateActivityDefinitionInput,
  type UpdateActivityLogInput,
} from "@/types/commons";
import { processActivityPhoto } from "@/utils/image";

type ActivityDefinitionDoc = {
  title: string;
  iconId: string;
  options: ActivityOption[];
  isActive: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

type ActivityLogDoc = {
  definitionId: string;
  definitionTitle: string;
  definitionIconId: string;
  optionIds: string[];
  optionLabels: string[];
  note: string;
  executedAt: Timestamp;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  userId: string;
  userName: string;
  userAvatarUrl: string;
  thanksCount: number;
  commentCount: number;
  photoUrl?: string;
  photoThumbnailUrl?: string;
  photoStoragePath?: string;
  photoThumbnailStoragePath?: string;
};

type ActivityCommentDoc = {
  logId: string;
  body: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  userId: string;
  userName: string;
  userAvatarUrl: string;
};

export type ActivityLogCursor = QueryDocumentSnapshot<ActivityLogDoc>;

const definitionsCollection = collection(db, "activityDefinitions");
const logsCollection = collection(db, "activityLogs");

function timestampToDate(value: Timestamp | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  return value.toDate();
}

function mapUserSnapshot(data: {
  userId: string;
  userName: string;
  userAvatarUrl?: string;
}): ActivityUserSnapshot {
  return {
    userId: data.userId,
    displayName: data.userName,
    avatarUrl: data.userAvatarUrl ?? "",
  };
}

function mapDefinitionDoc(docSnap: QueryDocumentSnapshot<ActivityDefinitionDoc>): ActivityDefinition {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    title: data.title,
    iconId: data.iconId,
    options: Array.isArray(data.options) ? data.options : [],
    isActive: data.isActive ?? true,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
}

function mapLogDoc(docSnap: QueryDocumentSnapshot<ActivityLogDoc>): ActivityLog {
  const data = docSnap.data();
  const photo: ActivityPhotoInfo | null =
    data.photoUrl && data.photoThumbnailUrl && data.photoStoragePath && data.photoThumbnailStoragePath
      ? {
          url: data.photoUrl,
          thumbnailUrl: data.photoThumbnailUrl,
          storagePath: data.photoStoragePath,
          thumbnailStoragePath: data.photoThumbnailStoragePath,
        }
      : null;
  return {
    id: docSnap.id,
    definitionId: data.definitionId,
    definitionTitle: data.definitionTitle,
    definitionIconId: data.definitionIconId ?? "",
    optionIds: data.optionIds ?? [],
    optionLabels: data.optionLabels ?? [],
    note: data.note ?? "",
    executedAt: data.executedAt.toDate(),
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    user: mapUserSnapshot(data),
    photo,
    thanksCount: data.thanksCount ?? 0,
    commentCount: data.commentCount ?? 0,
  };
}

function mapCommentDoc(docSnap: QueryDocumentSnapshot<ActivityCommentDoc>): ActivityComment {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    logId: data.logId,
    body: data.body ?? "",
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    user: mapUserSnapshot(data),
  };
}

export function generateActivityOptionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function subscribeActivityDefinitions(
  callback: (definitions: ActivityDefinition[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const q = query(definitionsCollection, orderBy("title", "asc"));
  return onSnapshot(
    q as Query<ActivityDefinitionDoc>,
    (snapshot: QuerySnapshot<ActivityDefinitionDoc>) => {
      const list = snapshot.docs.map(mapDefinitionDoc);
      callback(list);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.error("Failed to subscribe activity definitions", error);
      }
    },
  );
}

export async function listActivityDefinitions(): Promise<ActivityDefinition[]> {
  const q = query(definitionsCollection, orderBy("title", "asc"));
  const snapshot = await getDocs(q as Query<ActivityDefinitionDoc>);
  return snapshot.docs.map(mapDefinitionDoc);
}

export async function createActivityDefinition(
  input: CreateActivityDefinitionInput,
): Promise<string> {
  const docRef = doc(definitionsCollection);
  await setDoc(docRef, {
    title: input.title,
    iconId: input.iconId,
    options: input.options,
    isActive: input.isActive,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateActivityDefinition(
  definitionId: string,
  input: UpdateActivityDefinitionInput,
) {
  const definitionRef = doc(definitionsCollection, definitionId);
  const snapshot = await getDoc(definitionRef);
  if (!snapshot.exists()) {
    throw new Error("アクティビティが見つかりません");
  }
  await updateDoc(definitionRef, {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

async function deletePhotoAssets(info: ActivityPhotoInfo | { storagePath?: string | null; thumbnailStoragePath?: string | null } | null) {
  if (!info) {
    return;
  }
  const { storagePath, thumbnailStoragePath } = info;
  const tasks: Promise<unknown>[] = [];
  if (storagePath) {
    tasks.push(
      deleteObject(ref(storage, storagePath)).catch(() => {
        // ignore deletion errors
      }),
    );
  }
  if (thumbnailStoragePath) {
    tasks.push(
      deleteObject(ref(storage, thumbnailStoragePath)).catch(() => {
        // ignore deletion errors
      }),
    );
  }
  await Promise.all(tasks);
}

async function deleteActivityLogInternal(logDocId: string) {
  const logRef = doc(logsCollection, logDocId);
  const snapshot = await getDoc(logRef);
  if (!snapshot.exists()) {
    return;
  }
  const data = snapshot.data() as ActivityLogDoc;
  await deletePhotoAssets({
    storagePath: data.photoStoragePath,
    thumbnailStoragePath: data.photoThumbnailStoragePath,
  });

  const commentsCollection = collection(logRef, "comments");
  const commentsSnapshot = await getDocs(commentsCollection as Query<ActivityCommentDoc>);
  if (!commentsSnapshot.empty) {
    const batch = writeBatch(db);
    commentsSnapshot.docs.forEach((commentDoc) => {
      batch.delete(commentDoc.ref);
    });
    await batch.commit();
  }

  await deleteDoc(logRef);
}

export async function deleteActivityDefinition(definitionId: string) {
  const definitionRef = doc(definitionsCollection, definitionId);
  const logsQuery = query(logsCollection, where("definitionId", "==", definitionId));
  const logsSnapshot = await getDocs(logsQuery as Query<ActivityLogDoc>);

  for (const logDoc of logsSnapshot.docs) {
    await deleteActivityLogInternal(logDoc.id);
  }

  await deleteDoc(definitionRef);
}

function ensureDefinitionOptionLabels(
  definition: ActivityDefinitionDoc,
  optionIds: string[],
): { optionLabels: string[]; normalizedOptionIds: string[] } {
  const availableOptions = definition.options ?? [];
  if (availableOptions.length === 0) {
    return { optionLabels: [], normalizedOptionIds: [] };
  }
  const labels: string[] = [];
  const normalizedIds: string[] = [];
  const optionIdSet = new Set<string>();

  optionIds.forEach((id) => {
    if (optionIdSet.has(id)) {
      return;
    }
    const found = availableOptions.find((option) => option.id === id);
    if (found) {
      labels.push(found.label);
      normalizedIds.push(found.id);
      optionIdSet.add(found.id);
    }
  });

  if (normalizedIds.length === 0) {
    throw new Error("少なくとも1つのオプションを選択してください");
  }

  return { optionLabels: labels, normalizedOptionIds: normalizedIds };
}

function buildUserName(user: AppUser): string {
  return user.nickname || user.displayName || user.email;
}

async function uploadActivityPhoto(
  logId: string,
  userId: string,
  file: File,
): Promise<ActivityPhotoInfo> {
  const processed = await processActivityPhoto(file);
  const basePath = `activityLogs/${userId}/${logId}`;
  const mainPath = `${basePath}/photo.jpg`;
  const thumbPath = `${basePath}/thumbnail.jpg`;

  const [mainUpload, thumbUpload]: UploadResult[] = await Promise.all([
    uploadBytes(ref(storage, mainPath), processed.main.blob, {
      contentType: "image/jpeg",
    }),
    uploadBytes(ref(storage, thumbPath), processed.thumbnail.blob, {
      contentType: "image/jpeg",
    }),
  ]);

  const [mainUrl, thumbUrl] = await Promise.all([
    getDownloadURL(mainUpload.ref),
    getDownloadURL(thumbUpload.ref),
  ]);

  return {
    url: mainUrl,
    thumbnailUrl: thumbUrl,
    storagePath: mainPath,
    thumbnailStoragePath: thumbPath,
  };
}

export async function createActivityLog({
  input,
  user,
}: {
  input: CreateActivityLogInput;
  user: AppUser;
}): Promise<string> {
  const definitionRef = doc(definitionsCollection, input.definitionId);
  const definitionSnap = await getDoc(definitionRef);
  if (!definitionSnap.exists()) {
    throw new Error("アクティビティが存在しません");
  }

  const definition = definitionSnap.data() as ActivityDefinitionDoc;
  if (definition.isActive === false) {
    throw new Error("このアクティビティは現在利用できません");
  }

  const { optionLabels, normalizedOptionIds } = ensureDefinitionOptionLabels(
    definition,
    input.optionIds,
  );

  const logDocRef = doc(logsCollection);
  let photoInfo: ActivityPhotoInfo | null = null;
  if (input.photoFile) {
    photoInfo = await uploadActivityPhoto(logDocRef.id, user.uid, input.photoFile);
  }

  await setDoc(logDocRef, {
    definitionId: input.definitionId,
    definitionTitle: definition.title,
    definitionIconId: definition.iconId,
    optionIds: normalizedOptionIds,
    optionLabels,
    note: input.note,
    executedAt: Timestamp.fromDate(input.executedAt),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    userId: user.uid,
    userName: buildUserName(user),
    userAvatarUrl: user.photoURL ?? "",
    thanksCount: 0,
    commentCount: 0,
    ...(photoInfo
      ? {
          photoUrl: photoInfo.url,
          photoThumbnailUrl: photoInfo.thumbnailUrl,
          photoStoragePath: photoInfo.storagePath,
          photoThumbnailStoragePath: photoInfo.thumbnailStoragePath,
        }
      : {}),
  });

  return logDocRef.id;
}

export async function updateActivityLog({
  logId,
  input,
  user,
}: {
  logId: string;
  input: UpdateActivityLogInput;
  user: AppUser;
}) {
  const logRef = doc(logsCollection, logId);
  const logSnap = await getDoc(logRef);
  if (!logSnap.exists()) {
    throw new Error("アクティビティ記録が存在しません");
  }

  const logData = logSnap.data() as ActivityLogDoc;
  if (logData.userId !== user.uid) {
    throw new Error("自分のアクティビティのみ編集できます");
  }

  const definitionRef = doc(definitionsCollection, logData.definitionId);
  const definitionSnap = await getDoc(definitionRef);
  if (!definitionSnap.exists()) {
    throw new Error("アクティビティが存在しません");
  }
  const definition = definitionSnap.data() as ActivityDefinitionDoc;
  const { optionLabels, normalizedOptionIds } = ensureDefinitionOptionLabels(
    definition,
    input.optionIds,
  );

  let photoInfo: ActivityPhotoInfo | null = null;
  if (input.photoFile) {
    photoInfo = await uploadActivityPhoto(logRef.id, user.uid, input.photoFile);
    await deletePhotoAssets({
      storagePath: logData.photoStoragePath,
      thumbnailStoragePath: logData.photoThumbnailStoragePath,
    });
  } else if (input.removePhoto) {
    await deletePhotoAssets({
      storagePath: logData.photoStoragePath,
      thumbnailStoragePath: logData.photoThumbnailStoragePath,
    });
  }

  const payload: Partial<ActivityLogDoc> = {
    definitionTitle: definition.title,
    definitionIconId: definition.iconId,
    optionIds: normalizedOptionIds,
    optionLabels,
    note: input.note,
    executedAt: Timestamp.fromDate(input.executedAt),
    updatedAt: serverTimestamp(),
    userName: buildUserName(user),
    userAvatarUrl: user.photoURL ?? "",
  };

  if (photoInfo) {
    Object.assign(payload, {
      photoUrl: photoInfo.url,
      photoThumbnailUrl: photoInfo.thumbnailUrl,
      photoStoragePath: photoInfo.storagePath,
      photoThumbnailStoragePath: photoInfo.thumbnailStoragePath,
    });
  } else if (input.removePhoto) {
    Object.assign(payload, {
      photoUrl: null,
      photoThumbnailUrl: null,
      photoStoragePath: null,
      photoThumbnailStoragePath: null,
    });
  }

  await updateDoc(logRef, payload);
}

export async function deleteActivityLog(logId: string, user: AppUser) {
  const logRef = doc(logsCollection, logId);
  const logSnap = await getDoc(logRef);
  if (!logSnap.exists()) {
    return;
  }
  const data = logSnap.data() as ActivityLogDoc;
  if (data.userId !== user.uid && !user.isAdmin) {
    throw new Error("削除権限がありません");
  }
  await deleteActivityLogInternal(logId);
}

export async function fetchActivityLogs({
  limitCount,
  cursor,
  userId,
}: {
  limitCount: number;
  cursor?: ActivityLogCursor | null;
  userId?: string | null;
}): Promise<{
  logs: ActivityLog[];
  nextCursor: ActivityLogCursor | null;
}> {
  const queryConstraints: QueryConstraint[] = [];
  if (userId) {
    queryConstraints.push(where("userId", "==", userId));
  }
  queryConstraints.push(orderBy("executedAt", "desc"));
  queryConstraints.push(orderBy("createdAt", "desc"));
  if (cursor) {
    queryConstraints.push(startAfter(cursor));
  }
  queryConstraints.push(limit(limitCount));

  const q = query(logsCollection, ...queryConstraints);

  const snapshot = await getDocs(q as Query<ActivityLogDoc>);
  const docs = snapshot.docs;
  const logs = docs.map(mapLogDoc);

  const nextCursor = docs.length === limitCount ? docs[docs.length - 1] : null;
  return {
    logs,
    nextCursor,
  };
}

export async function incrementActivityThanks(logId: string) {
  const logRef = doc(logsCollection, logId);
  await updateDoc(logRef, {
    thanksCount: increment(1),
    updatedAt: serverTimestamp(),
  });
}

export function listenActivityComments(
  logId: string,
  callback: (comments: ActivityComment[]) => void,
): Unsubscribe {
  const logRef = doc(logsCollection, logId);
  const commentsCollection = collection(logRef, "comments");
  const q = query(commentsCollection, orderBy("createdAt", "asc"));
  return onSnapshot(q as Query<ActivityCommentDoc>, (snapshot: QuerySnapshot<ActivityCommentDoc>) => {
    const comments = snapshot.docs.map(mapCommentDoc);
    callback(comments);
  });
}

export async function createActivityComment({
  logId,
  input,
  user,
}: {
  logId: string;
  input: CreateActivityCommentInput;
  user: AppUser;
}) {
  const trimmed = input.body.trim();
  if (!trimmed) {
    throw new Error("コメントを入力してください");
  }
  const logRef = doc(logsCollection, logId);
  await runTransaction(db, async (transaction) => {
    const logSnap = await transaction.get(logRef);
    if (!logSnap.exists()) {
      throw new Error("アクティビティが存在しません");
    }

    const commentsCollection = collection(logRef, "comments");
    const commentRef = doc(commentsCollection);
    transaction.set(commentRef, {
      logId,
      body: trimmed,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      userId: user.uid,
      userName: buildUserName(user),
      userAvatarUrl: user.photoURL ?? "",
    });

    transaction.update(logRef, {
      commentCount: increment(1),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function updateActivityComment({
  logId,
  commentId,
  input,
  user,
}: {
  logId: string;
  commentId: string;
  input: UpdateActivityCommentInput;
  user: AppUser;
}) {
  const trimmed = input.body.trim();
  if (!trimmed) {
    throw new Error("コメントを入力してください");
  }
  const logRef = doc(logsCollection, logId);
  const commentRef = doc(logRef, "comments", commentId);
  await runTransaction(db, async (transaction) => {
    const commentSnap = await transaction.get(commentRef);
    if (!commentSnap.exists()) {
      throw new Error("コメントが存在しません");
    }
    const commentData = commentSnap.data() as ActivityCommentDoc;
    if (commentData.userId !== user.uid) {
      throw new Error("自分のコメントのみ編集できます");
    }

    transaction.update(commentRef, {
      body: trimmed,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function deleteActivityComment({
  logId,
  commentId,
  user,
}: {
  logId: string;
  commentId: string;
  user: AppUser;
}) {
  const logRef = doc(logsCollection, logId);
  const commentRef = doc(logRef, "comments", commentId);
  await runTransaction(db, async (transaction) => {
    const commentSnap = await transaction.get(commentRef);
    if (!commentSnap.exists()) {
      return;
    }
    const commentData = commentSnap.data() as ActivityCommentDoc;
    if (commentData.userId !== user.uid) {
      throw new Error("自分のコメントのみ削除できます");
    }

    transaction.delete(commentRef);
    transaction.update(logRef, {
      commentCount: increment(-1),
      updatedAt: serverTimestamp(),
    });
  });
}
