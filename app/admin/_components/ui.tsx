"use client";

import { ReactNode, useState } from "react";

export function Card({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      {...props}
      className={`relative overflow-hidden rounded-[22px] border border-[#e8d8d2] bg-white/95 p-5 shadow-[0_18px_40px_-26px_rgba(44,18,19,0.55)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#8c0f16] via-[#ba2a32] to-[#6fb833]" />
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-[30px] font-bold leading-none tracking-tight text-[#351d1e]">{title}</h2>
      {subtitle ? <p className="mt-2 text-sm font-medium text-[#7f6667]">{subtitle}</p> : null}
    </div>
  );
}

export function PrimaryButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      {...props}
      className={`rounded-xl border border-[#7e0d14] bg-[#8c0f16] px-4 py-2 text-sm font-bold text-white shadow-[0_10px_20px_-12px_rgba(140,15,22,0.9)] transition hover:-translate-y-[1px] hover:bg-[#740b11] disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      {...props}
      className={`rounded-xl border border-[#e3d3cd] bg-white px-4 py-2 text-sm font-bold text-[#3c2828] transition hover:-translate-y-[1px] hover:border-[#8c0f16] disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const [confirmClose, setConfirmClose] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-[#17090a]/40 backdrop-blur-sm" onClick={() => setConfirmClose(true)} />
      <div className="relative z-10 w-full max-w-2xl rounded-[26px] border border-[#e2d2cc] bg-[#f9f3f0] p-6 shadow-[0_24px_50px_-26px_rgba(27,11,12,0.8)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-[#351d1e]">{title}</h3>
          <GhostButton onClick={onClose}>Закрыть</GhostButton>
        </div>
        <div className="max-h-[70vh] overflow-y-auto pr-1">{children}</div>
        {footer ? <div className="mt-6">{footer}</div> : null}
      </div>

      {confirmClose ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center px-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#e3d3cd] bg-white p-5 shadow-2xl">
            <p className="text-base font-bold text-[#351d1e]">Закрыть окно?</p>
            <p className="mt-2 text-sm text-[#7f6667]">Изменения могут быть не сохранены.</p>
            <div className="mt-4 flex justify-end gap-2">
              <GhostButton onClick={() => setConfirmClose(false)}>Остаться</GhostButton>
              <PrimaryButton
                onClick={() => {
                  setConfirmClose(false);
                  onClose();
                }}
              >
                Закрыть
              </PrimaryButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
