'use client';

/* eslint-disable @next/next/no-img-element */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import clsx from "clsx";
import type { Components } from "react-markdown";

const markdownComponents: Components = {
  h1: (props) => <h1 className="mt-6 text-xl font-semibold text-slate-900 first:mt-0" {...props} />,
  h2: (props) => <h2 className="mt-6 text-lg font-semibold text-slate-900 first:mt-0" {...props} />,
  h3: (props) => <h3 className="mt-5 text-base font-semibold text-slate-900 first:mt-0" {...props} />,
  p: (props) => <p className="text-sm leading-relaxed text-slate-700" {...props} />,
  ul: (props) => (
    <ul className="ml-5 list-disc space-y-1 text-sm leading-relaxed text-slate-700" {...props} />
  ),
  ol: (props) => (
    <ol className="ml-5 list-decimal space-y-1 text-sm leading-relaxed text-slate-700" {...props} />
  ),
  li: (props) => <li className="text-sm text-slate-700" {...props} />,
  a: (props) => (
    <a
      className="text-blue-600 underline decoration-blue-200 underline-offset-4 transition hover:text-blue-700 hover:decoration-blue-300"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  img: (props) => (
    <img
      className="my-4 max-h-64 w-full rounded-lg border border-slate-200 object-cover"
      alt={(props.alt as string) ?? ""}
      {...props}
    />
  ),
  blockquote: (props) => (
    <blockquote
      className="border-l-4 border-blue-200 bg-blue-50/60 px-4 py-2 text-sm italic text-blue-900"
      {...props}
    />
  ),
  code: ({ inline, children, ...rest }) =>
    inline ? (
      <code className="rounded bg-slate-100 px-1 py-0.5 text-[13px] text-slate-700" {...rest}>
        {children}
      </code>
    ) : (
      <pre className="overflow-x-auto rounded-xl bg-slate-900/90 p-4 text-[13px] text-slate-100">
        <code {...rest}>{children}</code>
      </pre>
    ),
};

type MarkdownContentProps = {
  content: string;
  className?: string;
};

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={clsx("space-y-4", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
