import { useRef, useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

interface BruiseSettings {
  x: number;
  y: number;
  size: number;
  intensity: number;
  age: number; // 0=fresh(red), 0.5=mid(purple), 1=old(yellow-green)
}

const DEFAULT_IMAGE = "https://cdn.poehali.dev/projects/14130273-aec4-4ff4-b6e4-3d568d6cdb93/bucket/759a27e1-e494-4ab9-bdfa-f93abec9a292.jpg";

export default function Index() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [bruise, setBruise] = useState<BruiseSettings>({
    x: 0.38,
    y: 0.32,
    size: 80,
    intensity: 0.75,
    age: 0.3,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const loadImage = useCallback((src: string) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
      setImageLoaded(true);
    };
    img.src = src;
  }, []);

  useEffect(() => {
    loadImage(DEFAULT_IMAGE);
  }, [loadImage]);

  const drawBruise = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, b: BruiseSettings) => {
      const cx = b.x * w;
      const cy = b.y * h;
      const rx = b.size * 1.4;
      const ry = b.size * 0.85;

      ctx.save();
      ctx.globalCompositeOperation = "multiply";

      // Цвета по возрасту синяка
      const freshColor = { r: 160, g: 30, b: 60 };
      const midColor = { r: 90, g: 40, b: 130 };
      const oldColor = { r: 120, g: 110, b: 40 };

      const lerp = (a: number, bv: number, t: number) => a + (bv - a) * t;

      let r: number, g: number, bl: number;
      if (b.age < 0.5) {
        const t = b.age * 2;
        r = lerp(freshColor.r, midColor.r, t);
        g = lerp(freshColor.g, midColor.g, t);
        bl = lerp(freshColor.b, midColor.b, t);
      } else {
        const t = (b.age - 0.5) * 2;
        r = lerp(midColor.r, oldColor.r, t);
        g = lerp(midColor.g, oldColor.g, t);
        bl = lerp(midColor.b, oldColor.b, t);
      }

      // Основной градиент (эллипс)
      const grad = ctx.createRadialGradient(
        cx - rx * 0.15, cy - ry * 0.1, 0,
        cx, cy, Math.max(rx, ry)
      );
      grad.addColorStop(0, `rgba(${r},${g},${bl},${b.intensity * 0.9})`);
      grad.addColorStop(0.4, `rgba(${r},${g},${bl},${b.intensity * 0.65})`);
      grad.addColorStop(0.7, `rgba(${Math.min(r + 40, 255)},${Math.min(g + 20, 255)},${bl},${b.intensity * 0.3})`);
      grad.addColorStop(1, `rgba(${r},${g},${bl},0)`);

      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, -0.2, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Красноватый внутренний слой (капилляры)
      ctx.globalCompositeOperation = "multiply";
      const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx * 0.6);
      innerGrad.addColorStop(0, `rgba(180,40,60,${b.intensity * 0.45})`);
      innerGrad.addColorStop(0.5, `rgba(160,30,80,${b.intensity * 0.25})`);
      innerGrad.addColorStop(1, `rgba(140,20,60,0)`);

      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 0.6, ry * 0.55, -0.1, 0, Math.PI * 2);
      ctx.fillStyle = innerGrad;
      ctx.fill();

      // Текстура — шум точками
      ctx.globalCompositeOperation = "multiply";
      const seed = 42;
      for (let i = 0; i < 180; i++) {
        const angle = ((seed * i * 137.508) % 360) * (Math.PI / 180);
        const dist = Math.sqrt(((seed * i * 0.618) % 1)) * Math.max(rx, ry) * 0.92;
        const px = cx + Math.cos(angle) * dist * (rx / Math.max(rx, ry));
        const py = cy + Math.sin(angle) * dist * (ry / Math.max(rx, ry));
        const alpha = (1 - dist / Math.max(rx, ry)) * b.intensity * 0.18 * Math.random();
        const dotR = 0.8 + Math.random() * 2.2;
        ctx.beginPath();
        ctx.arc(px, py, dotR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r - 20},${g - 10},${bl + 10},${alpha})`;
        ctx.fill();
      }

      // Опухший край — светлый блик
      ctx.globalCompositeOperation = "screen";
      const swellGrad = ctx.createRadialGradient(
        cx - rx * 0.25, cy - ry * 0.3, 0,
        cx - rx * 0.1, cy - ry * 0.15, rx * 0.45
      );
      swellGrad.addColorStop(0, `rgba(255,220,200,${b.intensity * 0.12})`);
      swellGrad.addColorStop(1, `rgba(255,200,180,0)`);

      ctx.beginPath();
      ctx.ellipse(cx - rx * 0.15, cy - ry * 0.2, rx * 0.42, ry * 0.35, -0.2, 0, Math.PI * 2);
      ctx.fillStyle = swellGrad;
      ctx.fill();

      ctx.restore();
    },
    []
  );

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const maxW = Math.min(image.naturalWidth, 900);
    const scale = maxW / image.naturalWidth;
    canvas.width = image.naturalWidth * scale;
    canvas.height = image.naturalHeight * scale;

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    drawBruise(ctx, canvas.width, canvas.height, bruise);
  }, [image, bruise, drawBruise]);

  useEffect(() => {
    render();
  }, [render]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    setBruise((b) => ({ ...b, x: px / canvas.width, y: py / canvas.height }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    loadImage(url);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "bruise-edit.jpg";
    link.href = canvas.toDataURL("image/jpeg", 0.92);
    link.click();
  };

  const ageLabel = bruise.age < 0.3 ? "Свежий" : bruise.age < 0.65 ? "Зреющий" : "Старый";

  return (
    <div className="min-h-screen bg-[#f5f4f2] font-['Golos_Text',sans-serif]">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-[#e0ddd8]">
        <div>
          <h1 className="text-[15px] font-semibold tracking-tight text-[#1a1a1a]">Фингал</h1>
          <p className="text-[11px] text-[#999] mt-0.5">редактор эффектов</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#555] bg-white border border-[#e0ddd8] rounded-full hover:border-[#bbb] transition-colors"
          >
            <Icon name="Upload" size={13} />
            Загрузить фото
          </button>
          <button
            onClick={handleDownload}
            disabled={!imageLoaded}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-[#1a1a1a] rounded-full hover:bg-[#333] transition-colors disabled:opacity-40"
          >
            <Icon name="Download" size={13} />
            Скачать
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </header>

      <div className="flex flex-col lg:flex-row gap-0 max-w-6xl mx-auto">
        {/* Canvas area */}
        <main className="flex-1 p-6 flex items-start justify-center">
          <div className="relative">
            {!imageLoaded && (
              <div className="w-[480px] h-[360px] bg-[#eee] rounded-2xl flex items-center justify-center">
                <div className="text-[#bbb] text-sm">Загрузка...</div>
              </div>
            )}
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className={`rounded-2xl shadow-lg cursor-crosshair max-w-full transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0 absolute"}`}
              style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain" }}
            />
            {imageLoaded && (
              <div className="mt-3 text-center text-[11px] text-[#aaa]">
                Нажмите на фото, чтобы переместить синяк
              </div>
            )}
          </div>
        </main>

        {/* Controls */}
        <aside className="w-full lg:w-[240px] p-6 border-t lg:border-t-0 lg:border-l border-[#e0ddd8] bg-white/60">
          <div className="space-y-6">

            <div>
              <label className="text-[11px] font-semibold text-[#999] uppercase tracking-widest block mb-3">
                Параметры
              </label>

              <div className="space-y-5">
                {/* Size */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[12px] text-[#555]">Размер</span>
                    <span className="text-[12px] text-[#999]">{bruise.size}</span>
                  </div>
                  <input
                    type="range" min={30} max={160} value={bruise.size}
                    onChange={(e) => setBruise((b) => ({ ...b, size: +e.target.value }))}
                    className="w-full accent-[#1a1a1a]"
                  />
                </div>

                {/* Intensity */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[12px] text-[#555]">Интенсивность</span>
                    <span className="text-[12px] text-[#999]">{Math.round(bruise.intensity * 100)}%</span>
                  </div>
                  <input
                    type="range" min={10} max={100} value={Math.round(bruise.intensity * 100)}
                    onChange={(e) => setBruise((b) => ({ ...b, intensity: +e.target.value / 100 }))}
                    className="w-full accent-[#1a1a1a]"
                  />
                </div>

                {/* Age */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[12px] text-[#555]">Возраст синяка</span>
                    <span className="text-[12px] text-[#999]">{ageLabel}</span>
                  </div>
                  <input
                    type="range" min={0} max={100} value={Math.round(bruise.age * 100)}
                    onChange={(e) => setBruise((b) => ({ ...b, age: +e.target.value / 100 }))}
                    className="w-full accent-[#1a1a1a]"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-red-400">Свежий</span>
                    <span className="text-[10px] text-purple-400">Зреющий</span>
                    <span className="text-[10px] text-yellow-600">Старый</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Position display */}
            <div>
              <label className="text-[11px] font-semibold text-[#999] uppercase tracking-widest block mb-3">
                Положение
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#f5f4f2] rounded-xl p-2.5 text-center">
                  <div className="text-[10px] text-[#aaa] mb-0.5">X</div>
                  <div className="text-[13px] font-medium text-[#333]">{Math.round(bruise.x * 100)}%</div>
                </div>
                <div className="bg-[#f5f4f2] rounded-xl p-2.5 text-center">
                  <div className="text-[10px] text-[#aaa] mb-0.5">Y</div>
                  <div className="text-[13px] font-medium text-[#333]">{Math.round(bruise.y * 100)}%</div>
                </div>
              </div>
            </div>

            {/* Reset */}
            <button
              onClick={() => setBruise({ x: 0.38, y: 0.32, size: 80, intensity: 0.75, age: 0.3 })}
              className="w-full py-2 text-[12px] text-[#999] border border-[#e0ddd8] rounded-full hover:border-[#bbb] hover:text-[#555] transition-colors"
            >
              Сбросить
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
