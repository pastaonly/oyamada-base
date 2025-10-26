'use client';

import { SPACES } from "@/constants/schedule";
import type { ReservationRecord } from "@/services/reservations";

type ReservationCommentModalProps = {
  target:
    | {
        reservation: ReservationRecord;
        isOwner: boolean;
      }
    | null;
  commentDraft: string;
  onChangeDraft: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  isSaving: boolean;
};

export function ReservationCommentModal({
  target,
  commentDraft,
  onChangeDraft,
  onClose,
  onSave,
  onDelete,
  isSaving,
}: ReservationCommentModalProps) {
  if (!target) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">{target.reservation.userName}</p>
            <p className="text-xs text-slate-400">
              {target.reservation.date} / {SPACES[target.reservation.space].label}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-blue-300 hover:text-blue-600"
          >
            閉じる
          </button>
        </div>
        {target.isOwner ? (
          <div className="space-y-4">
            <textarea
              value={commentDraft}
              onChange={(event) => onChangeDraft(event.target.value)}
              rows={4}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none"
              placeholder="コメントを入力してください"
              disabled={isSaving}
            />
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={onDelete}
                disabled={isSaving || !target.reservation.comment}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:border-red-300 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                コメント削除
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {target.reservation.comment ?? "コメントはありません"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
