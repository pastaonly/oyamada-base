'use client';

import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query, setDoc } from "firebase/firestore";
import { Avatar } from "@/components/common/Avatar";
import { MarkdownContent } from "@/components/common/MarkdownContent";
import { SPACES, type SpaceKey } from "@/constants/schedule";
import { useUserProfile } from "@/hooks/useUserProfile";
import { db } from "@/lib/firebaseConfig";

type RegisteredMember = {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  nickname: string;
  bio: string;
  photoURL: string;
};

type ContractRecord = {
  email: string;
  preferredRoom: SpaceKey | null | string;
  displayName?: string;
};

type CombinedMember = {
  id: string;
  uid?: string;
  email: string;
  displayName: string;
  nickname: string;
  photoURL: string;
  bio: string;
  contractPreferredRoom: SpaceKey | null;
  status: "registered" | "pending";
};

const CONTRACT_COLLECTION = "memberContracts";

const ROOM_OPTIONS: { value: SpaceKey | null; label: string }[] = [
  { value: null, label: "未設定" },
  { value: "front", label: SPACES.front.label },
  { value: "back", label: SPACES.back.label },
  { value: "living", label: SPACES.living.label },
];

function getPreferredRoomLabel(room: SpaceKey | null) {
  if (!room) {
    return "未設定";
  }
  return SPACES[room]?.label ?? room;
}

export default function MembersPage() {
  const { userProfile } = useUserProfile();
  const isAdmin = userProfile?.isAdmin ?? false;

  const [registeredMembers, setRegisteredMembers] = useState<RegisteredMember[]>([]);
  const [contractRecords, setContractRecords] = useState<ContractRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [contractsLoading, setContractsLoading] = useState(false);

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [preferredRoomDraft, setPreferredRoomDraft] = useState<SpaceKey | null>(null);
  const [isSavingPreferredRoom, setIsSavingPreferredRoom] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    const membersQuery = query(collection(db, "users"), orderBy("nickname", "asc"));
    const unsubscribe = onSnapshot(membersQuery, (snapshot) => {
      const list: RegisteredMember[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Partial<RegisteredMember & { displayName?: string }>;
        const fallbackName =
          data.nickname?.trim() ||
          data.displayName?.trim() ||
          (typeof data.email === "string" ? data.email : "");
        return {
          id: docSnap.id,
          uid: docSnap.id,
          email: typeof data.email === "string" ? data.email : "",
          displayName: typeof data.displayName === "string" ? data.displayName : fallbackName,
          nickname:
            typeof data.nickname === "string" && data.nickname.trim()
              ? data.nickname.trim()
              : fallbackName,
          bio: typeof data.bio === "string" ? data.bio : "",
          photoURL: typeof data.photoURL === "string" ? data.photoURL : "",
        };
      });
      setRegisteredMembers(list);
      setUsersLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setContractsLoading(true);
    const contractsQuery = query(collection(db, CONTRACT_COLLECTION), orderBy("__name__", "asc"));
    const unsubscribe = onSnapshot(contractsQuery, (snapshot) => {
      const list: ContractRecord[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Partial<ContractRecord>;
        const preferred = data.preferredRoom;
        const normalizedPreferred: SpaceKey | null =
          preferred === "front" || preferred === "back" || preferred === "living"
            ? preferred
            : null;
        return {
          email: docSnap.id,
          preferredRoom: normalizedPreferred,
          displayName: data.displayName,
        };
      });
      setContractRecords(list);
      setContractsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const combinedMembers = useMemo<CombinedMember[]>(() => {
    const map = new Map<string, CombinedMember>();

    registeredMembers.forEach((member) => {
      const key = member.email.toLowerCase();
      map.set(key, {
        id: member.id,
        uid: member.uid,
        email: member.email,
        displayName: member.displayName,
        nickname: member.nickname,
        photoURL: member.photoURL,
        bio: member.bio,
        contractPreferredRoom: null,
        status: "registered",
      });
    });

    contractRecords.forEach((record) => {
      const key = record.email.toLowerCase();
      const existing = map.get(key);
      const normalizedPreferred: SpaceKey | null =
        record.preferredRoom === "front" ||
        record.preferredRoom === "back" ||
        record.preferredRoom === "living"
          ? record.preferredRoom
          : null;
      if (existing) {
        existing.contractPreferredRoom = normalizedPreferred;
      } else {
        const name = record.displayName?.trim() || record.email;
        map.set(key, {
          id: record.email,
          email: record.email,
          displayName: name,
          nickname: name,
          photoURL: "",
          bio: "",
          contractPreferredRoom: normalizedPreferred,
          status: "pending",
        });
      }
    });

    const list = Array.from(map.values());

    list.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "registered" ? -1 : 1;
      }
      return a.nickname.localeCompare(b.nickname, "ja");
    });

    if (!isAdmin) {
      return list.filter((member) => member.status === "registered");
    }

    return list;
  }, [registeredMembers, contractRecords, isAdmin]);

  const isLoading = usersLoading || (isAdmin && contractsLoading);

const selectedMember = selectedMemberId
    ? combinedMembers.find((member) => member.id === selectedMemberId) ?? null
    : null;

  useEffect(() => {
    if (selectedMember) {
      setPreferredRoomDraft(selectedMember.contractPreferredRoom ?? null);
      setModalError(null);
    }
  }, [selectedMember]);

  const handleCardSelect = (memberId: string) => {
    setSelectedMemberId(memberId);
  };

  const handlePreferredRoomSave = async () => {
    if (!selectedMember) {
      return;
    }

    if (!isAdmin) {
      setModalError("保存権限がありません");
      return;
    }

    setIsSavingPreferredRoom(true);
    setModalError(null);

    try {
      await setDoc(
        doc(db, CONTRACT_COLLECTION, selectedMember.email),
        {
          preferredRoom: preferredRoomDraft ?? null,
          email: selectedMember.email,
          displayName: selectedMember.nickname,
        },
        { merge: true },
      );

      setSelectedMemberId(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "優先部屋の更新に失敗しました";
      setModalError(message);
    } finally {
      setIsSavingPreferredRoom(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-slate-600">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-slate-900">
          メンバー一覧{isAdmin ? "（管理者表示）" : ""}
        </h2>
        <p className="text-sm text-slate-500">表示メンバー {combinedMembers.length} 名</p>
      </header>

      {combinedMembers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-8 text-center text-sm text-slate-500">
          表示できるメンバーがまだいません。
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {combinedMembers.map((member) => {
            const displayName = member.nickname || member.displayName || member.email;
            const statusBadge =
              member.status === "registered"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-amber-200 bg-amber-50 text-amber-700";
            const preferredRoomLabel = getPreferredRoomLabel(member.contractPreferredRoom ?? null);

            return (
              <article
                key={member.id}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                role="button"
                tabIndex={0}
                onClick={() => handleCardSelect(member.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleCardSelect(member.id);
                  }
                }}
              >
                <div className="flex items-center gap-4 border-b border-slate-100 px-5 py-4">
                  <Avatar src={member.photoURL} fallback={displayName} size={56} title={displayName} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-base font-semibold text-slate-900">{displayName}</p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusBadge}`}
                      >
                        {member.status === "registered" ? "登録済" : "未登録"}
                      </span>
                    </div>
                    <p className="truncate text-xs text-slate-500">{member.email}</p>
                  </div>
                </div>
                <div className="space-y-3 px-5 py-4 text-sm text-slate-700">
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full border border-slate-200 px-2 py-0.5">
                      優先部屋: {preferredRoomLabel}
                    </span>
                  </div>
                  {member.status === "registered" && member.bio ? (
                    <div className="relative">
                      <div className="max-h-36 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                        <MarkdownContent content={member.bio} />
                      </div>
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 rounded-b-xl bg-gradient-to-t from-slate-50/90 to-transparent" />
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      {member.status === "registered"
                        ? "自己紹介がまだ登録されていません。"
                        : "未登録のメンバーです。"}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selectedMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-8"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedMemberId(null)}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-4">
                <Avatar
                  src={selectedMember.photoURL}
                  fallback={selectedMember.nickname || selectedMember.displayName}
                  size={60}
                  title={selectedMember.nickname || selectedMember.displayName}
                />
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {selectedMember.nickname || selectedMember.displayName}
                  </h3>
                  <p className="text-xs text-slate-500">{selectedMember.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMemberId(null)}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
              >
                閉じる
              </button>
            </div>
            <div className="space-y-4 px-6 py-5 text-sm text-slate-700">
              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full border border-slate-200 px-2 py-0.5">
                  優先部屋: {getPreferredRoomLabel(selectedMember.contractPreferredRoom ?? null)}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                    selectedMember.status === "registered"
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  {selectedMember.status === "registered" ? "登録済" : "未登録"}
                </span>
              </div>

              {isAdmin ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <h4 className="text-sm font-semibold text-slate-800">優先部屋を設定</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    保存すると契約情報に反映されます。
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {ROOM_OPTIONS.map((option) => (
                      <label
                        key={option.label}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition ${
                          preferredRoomDraft === option.value
                            ? "border-blue-400 bg-blue-50 text-blue-700"
                            : "border-slate-200 bg-white hover:border-blue-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="preferredRoom"
                          className="h-4 w-4"
                          checked={preferredRoomDraft === option.value}
                          onChange={() => setPreferredRoomDraft(option.value)}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-2">
                    {modalError && <p className="text-xs font-medium text-red-600">{modalError}</p>}
                    <button
                      type="button"
                      onClick={handlePreferredRoomSave}
                      disabled={isSavingPreferredRoom}
                      className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSavingPreferredRoom ? "保存中..." : "保存する"}
                    </button>
                  </div>
                </div>
              ) : null}

              {selectedMember.status === "registered" && selectedMember.bio ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <MarkdownContent content={selectedMember.bio} />
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  {selectedMember.status === "registered"
                    ? "自己紹介が登録されていません。"
                    : "未登録ユーザーのため、自己紹介は表示できません。"}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
