export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-12 text-slate-900">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">ホーム</h1>
        <p className="mt-4 text-sm text-slate-600">
          ログインが完了すると、ここにお知らせや利用状況を表示します。
        </p>
      </div>
    </div>
  );
}
