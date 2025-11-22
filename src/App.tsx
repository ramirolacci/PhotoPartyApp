import { useState, useEffect, useCallback, useRef } from 'react';
import { Camera as CameraIcon, Loader, CheckCircle } from 'lucide-react';
import Camera from './components/Camera';
import PhotoFeed from './components/PhotoFeed';
import { savePhoto, getPhotos, deletePhoto } from './lib/photoService';
import type { Photo } from './types/Photo';

function App() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const previousPhotosCountRef = useRef(0);

  // Cargar fotos al iniciar
  useEffect(() => {
    const loadPhotos = async () => {
      setIsLoadingPhotos(true);
      try {
        const fetchedPhotos = await getPhotos();
        setPhotos(fetchedPhotos);
      } catch (error) {
        console.error('Error loading photos:', error);
      } finally {
        setIsLoadingPhotos(false);
      }
    };
    loadPhotos();
  }, []);

  // Scroll automático al top cuando se agrega una nueva foto
  useEffect(() => {
    if (photos.length > previousPhotosCountRef.current && previousPhotosCountRef.current > 0) {
      // Nueva foto agregada - hacer scroll al top
      setTimeout(() => {
        if (feedContainerRef.current) {
          feedContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          // Fallback: scroll del window
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
    }
    previousPhotosCountRef.current = photos.length;
  }, [photos.length]);

  // Recargar fotos periódicamente para ver nuevas fotos de otros usuarios
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!isSaving && !showCamera) {
        try {
          const fetchedPhotos = await getPhotos();
          // Solo actualizar si hay nuevas fotos
          if (fetchedPhotos.length !== photos.length) {
            setPhotos(fetchedPhotos);
          }
        } catch (error) {
          console.error('Error refreshing photos:', error);
        }
      }
    }, 5000); // Cada 5 segundos

    return () => clearInterval(interval);
  }, [isSaving, showCamera, photos.length]);

  // Guardar foto inmediatamente - actualización optimista
  const handleCapture = useCallback(async (imageSrc: string) => {
    // Crear foto temporal inmediatamente (optimistic update)
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const tempPhoto: Photo = {
      id: tempId,
      imageUrl: imageSrc,
      title: undefined,
      createdAt: new Date(),
    };

    // Agregar al feed INSTANTÁNEAMENTE
    setPhotos((prev) => [tempPhoto, ...prev]);
    setShowSaveSuccess(true);
    setIsSaving(true);

    // Guardar en Supabase en segundo plano (sin bloquear)
    savePhoto(imageSrc)
      .then((savedPhoto) => {
        if (savedPhoto) {
          // Reemplazar la foto temporal con la real
          setPhotos((prev) =>
            prev.map((photo) => (photo.id === tempId ? savedPhoto : photo))
          );
        } else {
          // Si falla, mantener la temporal pero marcar error
          console.warn('No se pudo guardar la foto en el servidor');
        }
      })
      .catch((error) => {
        console.error('Error saving photo:', error);
        // Opcional: remover la foto temporal si falla
        // setPhotos((prev) => prev.filter((photo) => photo.id !== tempId));
      })
      .finally(() => {
        setIsSaving(false);
        setTimeout(() => setShowSaveSuccess(false), 2000);
      });
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const success = await deletePhoto(id);
    if (success) {
      setPhotos((prev) => prev.filter((photo) => photo.id !== id));
    }
  }, []);

  if (isLoadingPhotos) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader className="animate-spin text-blue-600" size={40} />
          <p className="text-gray-400">Cargando fotos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex flex-col">
      <header className="bg-gray-900/95 backdrop-blur-md shadow-lg sticky top-0 z-30 border-b border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex justify-between items-center gap-4">
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              PhotoParty
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {isSaving && (
              <div className="flex items-center gap-2 text-blue-400 text-sm">
                <Loader className="animate-spin" size={16} />
                <span className="hidden sm:inline">Guardando...</span>
              </div>
            )}
            <button
              onClick={() => setShowCamera(true)}
              disabled={isSaving}
              className="bg-blue-600 text-white px-4 md:px-5 py-2 rounded-full flex items-center gap-2 hover:bg-blue-700 transition-all transform active:scale-95 shadow-lg font-medium text-sm disabled:opacity-50"
            >
              <CameraIcon size={18} />
              <span className="hidden sm:inline">Capturar</span>
            </button>
          </div>
        </div>
      </header>

      <main ref={feedContainerRef} className="flex-1 flex flex-col overflow-hidden">
        <PhotoFeed photos={photos} onDelete={handleDelete} />
      </main>

      {/* Notificación de guardado exitoso */}
      {showSaveSuccess && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in">
          <div className="bg-green-600 text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-xl">
            <CheckCircle size={20} />
            <span className="font-medium">Foto guardada</span>
          </div>
        </div>
      )}

      {/* Cámara */}
      {showCamera && (
        <Camera
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}

export default App;
