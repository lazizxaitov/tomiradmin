"use client";

import { useId, useState } from "react";
import Cropper, { Area } from "react-easy-crop";

import { GhostButton, Modal, PrimaryButton } from "./ui";

type Props = {
  aspect: number;
  minWidth: number;
  minHeight: number;
  outputWidth: number;
  outputHeight: number;
  hint: string;
  buttonLabel?: string;
  onUploaded: (url: string) => void;
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = src;
  });
}

async function cropToBlob(
  imageSrc: string,
  area: Area,
  outputWidth: number,
  outputHeight: number,
) {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");

  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Failed to create image"));
        resolve(blob);
      },
      "image/jpeg",
      0.92,
    );
  });
}

export default function ImageCropUpload({
  aspect,
  minWidth,
  minHeight,
  outputWidth,
  outputHeight,
  hint,
  buttonLabel = "Выбрать и обрезать",
  onUploaded,
}: Props) {
  const [open, setOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const inputId = useId();

  const resetState = () => {
    if (imageSrc?.startsWith("blob:")) {
      URL.revokeObjectURL(imageSrc);
    }
    setImageSrc(null);
    setOpen(false);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setCroppedAreaPixels(null);
    setBusy(false);
  };

  const onPickFile = async (file: File | null) => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await loadImage(objectUrl);
      if (img.naturalWidth < minWidth || img.naturalHeight < minHeight) {
        URL.revokeObjectURL(objectUrl);
        alert(`Минимальный размер: ${minWidth}x${minHeight}px`);
        return;
      }
      setImageSrc(objectUrl);
      setOpen(true);
    } catch {
      URL.revokeObjectURL(objectUrl);
      alert("Не удалось прочитать изображение");
    }
  };

  const uploadCropped = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setBusy(true);
    try {
      const blob = await cropToBlob(imageSrc, croppedAreaPixels, outputWidth, outputHeight);
      const payload = new FormData();
      payload.append("file", new File([blob], `crop-${Date.now()}.jpg`, { type: "image/jpeg" }));
      const response = await fetch("/api/admin/upload-image", { method: "POST", body: payload });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.url) {
        alert(data?.error ?? "Не удалось загрузить изображение");
        setBusy(false);
        return;
      }
      onUploaded(data.url);
      resetState();
    } catch {
      alert("Не удалось обрезать изображение");
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-2">
      <label className="text-xs font-medium text-[#7f6667]">{hint}</label>
      <div>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            void onPickFile(file);
            event.currentTarget.value = "";
          }}
        />
        <label htmlFor={inputId} className="inline-flex cursor-pointer rounded-xl border border-[#ead8d1] bg-white px-3 py-2 text-sm font-bold text-[#3c2828] hover:border-[#8c0f16]">
          {buttonLabel}
        </label>
      </div>

      <Modal
        open={open}
        onClose={resetState}
        title="Обрезка изображения"
        footer={(
          <div className="flex justify-end gap-2">
            <GhostButton onClick={resetState}>Отмена</GhostButton>
            <PrimaryButton onClick={() => void uploadCropped()} disabled={busy}>
              {busy ? "Загрузка..." : "Обрезать и загрузить"}
            </PrimaryButton>
          </div>
        )}
      >
        <div className="space-y-3">
          <div className="relative h-[320px] w-full overflow-hidden rounded-2xl border border-[#ead8d1] bg-[#1b1010]">
            {imageSrc ? (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
              />
            ) : null}
          </div>
          <div className="grid gap-2">
            <label className="text-xs font-medium text-[#7f6667]">Масштаб</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
            <p className="text-xs text-[#7f6667]">Выходной размер: {outputWidth}x{outputHeight}px</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
