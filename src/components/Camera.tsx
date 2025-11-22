import { useRef, useCallback, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { X, RotateCcw, Check } from 'lucide-react';

interface CameraProps {
  onCapture: (imageSrc: string) => void;
  onClose: () => void;
}

export default function Camera({ onCapture, onClose }: CameraProps) {
  const webcamRef = useRef<Webcam>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [showSuccess, setShowSuccess] = useState(false);
  const [captureCount, setCaptureCount] = useState(0);

  // Detectar mejor resolución disponible
  const getOptimalConstraints = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Para móviles: usar la mejor calidad disponible
      return {
        facingMode,
        width: { ideal: 4096, max: 4096 },
        height: { ideal: 4096, max: 4096 },
        aspectRatio: { ideal: 1 },
      };
    }
    
    // Para desktop: alta resolución
    return {
      facingMode,
      width: { ideal: 1920, max: 3840 },
      height: { ideal: 1080, max: 2160 },
    };
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot({ 
      quality: 1.0, // Máxima calidad
      width: 4096,
      height: 4096,
    });
    
    if (imageSrc) {
      setCaptureCount(prev => prev + 1);
      setIsCapturing(true);
      setShowSuccess(true);
      
      // Capturar y guardar INMEDIATAMENTE (sin delays)
      onCapture(imageSrc);
      
      // Feedback visual rápido
      setTimeout(() => {
        setIsCapturing(false);
      }, 150);
      
      setTimeout(() => {
        setShowSuccess(false);
      }, 600);
    }
  }, [onCapture]);

  const toggleCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in duration-200">
      <div className="flex justify-between items-center p-4 bg-black/60 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <h2 className="text-white text-lg font-semibold">Cámara</h2>
          {captureCount > 0 && (
            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
              {captureCount} foto{captureCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-white p-2 hover:bg-white/10 rounded-full transition-colors duration-200"
          aria-label="Cerrar cámara"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          screenshotQuality={1.0}
          videoConstraints={getOptimalConstraints()}
          className="w-full h-full object-cover"
          mirrored={facingMode === 'user'}
        />

        {/* Flash effect al capturar */}
        {isCapturing && (
          <div className="absolute inset-0 bg-white animate-pulse" style={{ animationDuration: '200ms' }} />
        )}

        {/* Indicador de éxito */}
        {showSuccess && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-green-500 rounded-full p-4 animate-in zoom-in duration-200">
              <Check size={32} className="text-white" />
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-black/60 backdrop-blur-sm flex justify-center items-center gap-6">
        <button
          onClick={toggleCamera}
          className="bg-white/20 text-white p-3 rounded-full hover:bg-white/30 transition-all duration-200 border border-white/20 active:scale-95"
          title="Cambiar cámara"
          aria-label="Cambiar cámara"
        >
          <RotateCcw size={24} />
        </button>

        <button
          onClick={capture}
          disabled={isCapturing}
          className="bg-white text-black p-6 rounded-full hover:bg-gray-200 transition-all duration-200 transform active:scale-90 disabled:opacity-50 disabled:scale-100 shadow-xl border-4 border-white/30"
          aria-label="Capturar foto"
        >
          <div className="w-10 h-10 bg-gray-800 rounded-full" />
        </button>

        <div className="w-14" />
      </div>
    </div>
  );
}
