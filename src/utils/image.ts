'use client';

type ResizedImageResult = {
  blob: Blob;
  width: number;
  height: number;
};

async function loadHeicAsJpeg(file: File): Promise<Blob> {
  const heic2anyModule = await import("heic2any");
  const heic2any = heic2anyModule.default ?? heic2anyModule;
  const result = await heic2any({
    blob: file,
    toType: "image/jpeg",
  });

  if (result instanceof Blob) {
    return result;
  }
  if (Array.isArray(result) && result[0] instanceof Blob) {
    return result[0];
  }
  if ("blob" in result && result.blob instanceof Blob) {
    return result.blob;
  }

  throw new Error("HEIC 画像の変換に失敗しました");
}

async function ensureJpegBlob(file: File): Promise<Blob> {
  const lowerName = file.name.toLowerCase();
  const isHeic = file.type === "image/heic" || lowerName.endsWith(".heic");
  if (isHeic) {
    return loadHeicAsJpeg(file);
  }
  if (file.type === "image/png" || file.type === "image/jpeg" || file.type === "image/jpg") {
    return file;
  }
  if (file.type.startsWith("image/")) {
    // それ以外の画像形式も JPEG に変換
    return file;
  }
  throw new Error("対応していない画像形式です");
}

async function loadImageSource(blob: Blob): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
}> {
  const objectUrl = URL.createObjectURL(blob);

  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(blob);
      URL.revokeObjectURL(objectUrl);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => {
          bitmap.close();
        },
      };
    } catch {
      // フォールバックで Image を利用
    }
  }

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    img.src = objectUrl;
  });

  return {
    source: image,
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
    cleanup: () => {
      URL.revokeObjectURL(objectUrl);
      image.src = "";
    },
  };
}

async function resizeImage(blob: Blob, targetWidth: number, quality = 0.85): Promise<ResizedImageResult> {
  const { source, width, height, cleanup } = await loadImageSource(blob);

  try {
    const scale = width > targetWidth ? targetWidth / width : 1;
    const outputWidth = Math.max(Math.round(width * scale), 1);
    const outputHeight = Math.max(Math.round(height * scale), 1);

    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("画像の変換に失敗しました");
    }
    context.drawImage(source, 0, 0, outputWidth, outputHeight);

    const outputBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error("画像の変換に失敗しました"));
          }
        },
        "image/jpeg",
        quality,
      );
    });

    return {
      blob: outputBlob,
      width: outputWidth,
      height: outputHeight,
    };
  } finally {
    cleanup();
  }
}

export async function processActivityPhoto(
  file: File,
  options?: {
    mainWidth?: number;
    thumbnailWidth?: number;
  },
): Promise<{
  main: ResizedImageResult;
  thumbnail: ResizedImageResult;
}> {
  const mainWidth = options?.mainWidth ?? 1280;
  const thumbnailWidth = options?.thumbnailWidth ?? 320;
  const jpegBlob = await ensureJpegBlob(file);
  const main = await resizeImage(jpegBlob, mainWidth, 0.82);
  const thumbnail = await resizeImage(jpegBlob, thumbnailWidth, 0.75);
  return { main, thumbnail };
}
