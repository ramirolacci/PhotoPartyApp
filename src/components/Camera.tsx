import { useRef, useCallback, useState } from 'react';
import Webcam from 'react-webcam';
import { X, RotateCcw, Zap, Circle, Grid3X3 } from 'lucide-react';

interface CameraProps {
  onCapture: (imageSrc: string) => void;
  onClose: () => void;
}

export default function Camera({ onCapture, onClose }: CameraProps) {
  const webcamRef = useRef<Webcam>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('none');

  const FILTERS = [
    { id: 'none', name: 'Original', filter: 'none' },
    { id: 'vivid', name: 'Vívido', filter: 'saturate(1.5) contrast(1.1)' },
    { id: 'mono', name: 'B&N', filter: 'grayscale(1) contrast(1.2)' },
    { id: 'sepia', name: 'Sepia', filter: 'sepia(0.8) contrast(1.1)' },
    { id: 'warm', name: 'Cálido', filter: 'sepia(0.3) saturate(1.4) hue-rotate(-20deg)' },
    { id: 'cool', name: 'Frío', filter: 'saturate(1.2) hue-rotate(20deg) brightness(1.1)' },
    { id: 'noir', name: 'Noir', filter: 'grayscale(1) brightness(0.8) contrast(1.5)' },
    { id: 'gold', name: 'Golden', filter: 'brightness(1.1) saturate(1.3) sepia(0.2)' },
  ];

  const getOptimalConstraints = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      return {
        facingMode,
        width: { ideal: 1920, max: 2560 },
        height: { ideal: 1920, max: 2560 },
        aspectRatio: { ideal: 1 },
      };
    }

    return {
      facingMode,
      width: { ideal: 1920, max: 2560 },
      height: { ideal: 1080, max: 1440 },
    };
  };

  const capture = useCallback(() => {
    const rawImage = webcamRef.current?.getScreenshot();

    if (rawImage) {
      setIsCapturing(true);
      setShowSuccess(true);

      if (selectedFilter === 'none') {
        onCapture(rawImage);
      } else {
        // Aplicar filtro mediante Canvas
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const currentFilter = FILTERS.find(f => f.id === selectedFilter)?.filter || 'none';
            ctx.filter = currentFilter;
            ctx.drawImage(img, 0, 0);
            const filteredImage = canvas.toDataURL('image/jpeg', 0.92);
            onCapture(filteredImage);
          }
        };
        img.src = rawImage;
      }

      setTimeout(() => {
        setIsCapturing(false);
      }, 150);

      setTimeout(() => {
        setShowSuccess(false);
      }, 800);
    }
  }, [onCapture, selectedFilter]);

  const toggleCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in duration-300">
      {/* Header Premium */}
      <div className="glass-effect-dark border-b border-white/5 slide-in-from-top">
        <div className="flex justify-between items-center p-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Zap className="text-purple-400" size={24} />
              <div className="absolute inset-0 blur-lg bg-purple-500/40 animate-pulse" />
            </div>
            <div>
              <h2 className="text-white text-lg font-bold">Cámara</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white p-2.5 hover:bg-white/10 rounded-full transition-all duration-200 hover:scale-110"
            aria-label="Cerrar cámara"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Visor de cámara */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-black">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          screenshotQuality={0.92}
          videoConstraints={getOptimalConstraints()}
          className="w-full h-full object-cover transition-all duration-300"
          style={{ filter: FILTERS.find(f => f.id === selectedFilter)?.filter || 'none' }}
          mirrored={facingMode === 'user'}
        />

        {/* Overlay con grid profesional (Regla de tercios) */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none animate-in fade-in duration-500">
            {/* Líneas verticales */}
            <div className="absolute inset-0 flex justify-evenly">
              <div className="w-[0.5px] h-full bg-white/30" />
              <div className="w-[0.5px] h-full bg-white/30" />
            </div>
            {/* Líneas horizontales */}
            <div className="absolute inset-0 flex flex-col justify-evenly">
              <div className="h-[0.5px] w-full bg-white/30" />
              <div className="h-[0.5px] w-full bg-white/30" />
            </div>
          </div>
        )}

        {/* Flash effect */}
        {isCapturing && (
          <div className="absolute inset-0 bg-white animate-pulse" style={{ animationDuration: '150ms' }} />
        )}

        {/* Success indicator */}
        {showSuccess && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative">
              <div className="glass-effect rounded-full p-6 zoom-in">
                <Circle className="text-green-400" size={48} strokeWidth={3} />
              </div>
              <div className="absolute inset-0 blur-2xl bg-green-500/50 animate-pulse" />
            </div>
          </div>
        )}

      </div>

      {/* Selector de Filtros */}
      <div className="absolute bottom-32 left-0 right-0 z-10 px-4 slide-in-from-bottom flex justify-center">
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar max-w-full px-10">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setSelectedFilter(filter.id)}
              className="flex flex-col items-center gap-2 min-w-[60px] transition-all transform active:scale-95"
            >
              <div
                className={`w-12 h-12 rounded-full border-2 transition-all ${selectedFilter === filter.id
                    ? 'border-purple-500 scale-110 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                    : 'border-white/30 hover:border-white/60'
                  }`}
                style={{
                  filter: filter.filter,
                  backgroundImage: `url(${webcamRef.current?.getScreenshot() || 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=100&h=100&fit=crop'})`,
                  backgroundSize: 'cover'
                }}
              />
              <span className={`text-[10px] font-bold uppercase tracking-wider ${selectedFilter === filter.id ? 'text-purple-400' : 'text-gray-400'
                }`}>
                {filter.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Controles Premium */}
      <div className="glass-effect-dark border-t border-white/5 p-6">
        <div className="max-w-md mx-auto flex justify-center items-center gap-8">
          {/* Botón cambiar cámara */}
          <button
            onClick={toggleCamera}
            className="btn-secondary text-white p-4 rounded-full hover:scale-110 transition-all duration-200 shadow-lg"
            title="Cambiar cámara"
            aria-label="Cambiar cámara"
          >
            <RotateCcw size={24} />
          </button>

          {/* Botón capturar - diseño premium */}
          <button
            onClick={capture}
            disabled={isCapturing}
            className="relative group disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Capturar foto"
          >
            {/* Anillo exterior */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />

            {/* Botón principal */}
            <div className="relative w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl transform group-hover:scale-110 group-active:scale-95 transition-all duration-200">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-inner" />
            </div>
          </button>

          {/* Botón Grid */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`btn-secondary p-4 rounded-full hover:scale-110 transition-all duration-200 shadow-lg ${showGrid ? 'text-purple-400 bg-white/10' : 'text-white'
              }`}
            title="Cuadrícula"
            aria-label="Toggle cuadrícula"
          >
            <Grid3X3 size={24} />
          </button>
        </div>

        {/* Indicador de modo */}
        <div className="text-center mt-4">
          <p className="text-gray-400 text-xs font-medium">
            {facingMode === 'user' ? 'Cámara frontal' : 'Cámara trasera'}
          </p>
        </div>
      </div>
    </div>
  );
}
