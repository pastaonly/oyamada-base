'use client';

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Avatar } from "@/components/common/Avatar";
import { MarkdownContent } from "@/components/common/MarkdownContent";
import { SPACES, type SpaceKey } from "@/constants/schedule";
import type { MemberType } from "@/types/user";
import { db } from "@/lib/firebaseConfig";

type MemberSummary = {
  id: string;
  email: string;
  displayName: string;
  nickname: string;
  bio: string;
  photoURL: string;
  memberType: MemberType;
  preferredRoom: SpaceKey | null;
};

const MEMBER_TYPE_LABEL: Record<Exclude<MemberType, null>, string> = {
  adult: "大人会員",
  child: "子ども会員",
  guest: "ゲスト",
  other: "その他",
};

function getMemberTypeLabel(memberType: MemberType) {
  if (!memberType) {
    return "未設定";
  }
  return MEMBER_TYPE_LABEL[memberType];
}

function getPreferredRoomLabel(room: SpaceKey | null) {
  if (!room) {
    return "未設定";
  }
  return SPACES[room]?.label ?? room;
}

export default function MembersPage() {
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  useEffect(() => {
    const membersQuery = query(collection(db, "users"), orderBy("nickname", "asc"));
    const unsubscribe = onSnapshot(membersQuery, (snapshot) => {
      const list: MemberSummary[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Partial<MemberSummary & { displayName?: string }>;
        const fallbackName =
          data.nickname?.trim() ||
          data.displayName?.trim() ||
          (typeof data.email === "string" ? data.email : "");
        return {
          id: docSnap.id,
          email: typeof data.email === "string" ? data.email : "",
          displayName: typeof data.displayName === "string" ? data.displayName : fallbackName,
          nickname: typeof data.nickname === "string" && data.nickname.trim()
            ? data.nickname.trim()
            : fallbackName,
          bio: typeof data.bio === "string" ? data.bio : "",
          photoURL: typeof data.photoURL === "string" ? data.photoURL : "",
          memberType: (data.memberType as MemberType) ?? null,
          preferredRoom: (data.preferredRoom as SpaceKey | null) ?? null,
        };
      });
      setMembers(list);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => a.nickname.localeCompare(b.nickname, "ja"));
  }, [members]);

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-slate-600">
        読み込み中...
      </div>
    );
  }

  const selectedMember = selectedMemberId
    ? members.find((member) => member.id === selectedMemberId) ?? null
    : null;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-slate-900">メンバー一覧</h2>
        <p className="text-sm text-slate-500">
          登録済みメンバー {sortedMembers.length} 名
        </p>
      </header>

      {sortedMembers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-8 text-center text-sm text-slate-500">
          表示できるメンバーがまだいません。
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sortedMembers.map((member) => {
            const displayName = member.nickname || member.displayName || member.email;
            return (
              <article
                key={member.id}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                role="button"
                tabIndex={0}
                onClick={() => setSelectedMemberId(member.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedMemberId(member.id);
                  }
                }}
              >
                <div className="flex items-center gap-4 border-b border-slate-100 px-5 py-4">
                  <Avatar src={member.photoURL} fallback={displayName} size={56} title={displayName} />
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-slate-900">{displayName}</p>
                    <p className="truncate text-xs text-slate-500">{member.email}</p>
                  </div>
                </div>
                <div className="space-y-3 px-5 py-4 text-sm text-slate-700">
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full border border-slate-200 px-2 py-0.5">
                      {getMemberTypeLabel(member.memberType)}
                    </span>
                    <span className="rounded-full border border-slate-200 px-2 py-0.5">
                      優先部屋: {getPreferredRoomLabel(member.preferredRoom)}
                    </span>
                  </div>
                  {member.bio ? (
                    <div className="relative">
                      <div className="max-h-36 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                        <MarkdownContent content={member.bio} />
                      </div>
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 rounded-b-xl bg-gradient-to-t from-slate-50/90 to-transparent" />
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">自己紹介がまだ登録されていません。</p>
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
                  {getMemberTypeLabel(selectedMember.memberType)}
                </span>
                <span className="rounded-full border border-slate-200 px-2 py-0.5">
                  優先部屋: {getPreferredRoomLabel(selectedMember.preferredRoom)}
                </span>
              </div>
              {selectedMember.bio ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <MarkdownContent content={selectedMember.bio} />
                </div>
              ) : (
                <p className="text-sm text-slate-500">自己紹介が登録されていません。</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
