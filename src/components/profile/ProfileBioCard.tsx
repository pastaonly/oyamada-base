'use client';

import type { AppUser } from "@/types/user";
import { MarkdownContent } from "@/components/common/MarkdownContent";

type ProfileBioCardProps = {
  user: AppUser;
};

export function ProfileBioCard({ user }: ProfileBioCardProps) {
  if (!user.bio && !user.nickname) {
    return (
      <section className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 p-5 text-sm text-blue-800">
        <p className="font-medium">プロフィールを登録しましょう</p>
        <p className="mt-2 text-xs text-blue-700">
          右上の「プロフィール編集」からニックネームと自己紹介（Markdown対応）を設定できます。
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-800">プロフィール</h2>
        <p className="text-xs text-slate-500">
          ニックネームと自己紹介は他の会員にも表示されます。
        </p>
      </div>
      <div className="space-y-4 px-5 py-4">
        {user.nickname && (
          <h3 className="text-lg font-semibold text-slate-900">{user.nickname}</h3>
        )}
        {user.bio ? (
          <MarkdownContent content={user.bio} />
        ) : (
          <p className="text-sm text-slate-500">自己紹介がまだありません。</p>
        )}
      </div>
    </section>
  );
}
