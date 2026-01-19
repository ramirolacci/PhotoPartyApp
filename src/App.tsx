import { useState, useEffect, useCallback, useRef } from 'react';
import { Camera as CameraIcon, Loader, CheckCircle, Sparkles } from 'lucide-react';
import Camera from './components/Camera';
import PhotoFeed from './components/PhotoFeed';
import Login from './components/Login';
import { savePhoto, getPhotos, deletePhoto } from './lib/photoService';
import { supabase } from './lib/supabaseClient';
import type { Photo } from './types/Photo';

function App() {
  const [user, setUser] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const previousPhotosCountRef = useRef(0);

  // Verificar sesión
  useEffect(() => {
    const savedUser = localStorage.getItem('photoPartyUser');
    if (savedUser) {
      setUser(savedUser);
    }
  }, []);

  // Cargar fotos al iniciar solo si hay usuario
  useEffect(() => {
    if (!user) return;

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

    // Suscripción a cambios en tiempo real
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'photos',
        },
        (payload: any) => {
          const newPhoto = payload.new;

          // Evitar duplicados si el usuario actual fue quien subió la foto
          // (ya se manejó con la actualización optimista)
          if (newPhoto.user_name === user) return;

          const photoToAdd: Photo = {
            id: newPhoto.id,
            imageUrl: newPhoto.image_url,
            userName: newPhoto.user_name,
            title: newPhoto.title || undefined,
            createdAt: new Date(newPhoto.created_at),
            likesCount: newPhoto.likes_count || 0,
            likedBy: newPhoto.liked_by || [],
          };

          setPhotos((prev) => [photoToAdd, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'photos',
        },
        (payload: any) => {
          const updatedPhoto = payload.new;
          setPhotos((prev) =>
            prev.map((photo) =>
              photo.id === updatedPhoto.id
                ? {
                  ...photo,
                  likesCount: updatedPhoto.likes_count || 0,
                  likedBy: updatedPhoto.liked_by || [],
                  title: updatedPhoto.title || photo.title,
                }
                : photo
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Scroll automático al top cuando se agrega una nueva foto
  useEffect(() => {
    if (photos.length > previousPhotosCountRef.current && previousPhotosCountRef.current > 0) {
      setTimeout(() => {
        if (feedContainerRef.current) {
          feedContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
    }
    previousPhotosCountRef.current = photos.length;
  }, [photos.length]);

  // Guardar foto inmediatamente - actualización optimista
  const handleCapture = useCallback(async (imageSrc: string) => {
    // Log manual
    const consoleEl = document.getElementById('debug-console');
    if (consoleEl) {
      const div = document.createElement('div');
      div.innerText = `[App] handleCapture triggered`;
      consoleEl.appendChild(div);
    }

    if (!user) {
      if (consoleEl) {
        const div = document.createElement('div');
        div.innerText = `[App] No user found!`;
        consoleEl.appendChild(div);
      }
      return;
    }

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const tempPhoto: Photo = {
      id: tempId,
      imageUrl: imageSrc,
      userName: user,
      title: undefined,
      createdAt: new Date(),
    };

    setPhotos((prev) => [tempPhoto, ...prev]);
    setShowSaveSuccess(true);
    setIsSaving(true);

    if (consoleEl) {
      const div = document.createElement('div');
      div.innerText = `[App] Calling savePhoto...`;
      consoleEl.appendChild(div);
    }

    savePhoto(imageSrc, user)
      .then((savedPhoto) => {
        if (savedPhoto) {
          setPhotos((prev) =>
            prev.map((photo) => (photo.id === tempId ? savedPhoto : photo))
          );
        } else {
          console.warn('No se pudo guardar la foto');
        }
      })
      .catch((error) => {
        console.error('Error saving photo:', error);
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

  const handleLogin = (name: string) => {
    localStorage.setItem('photoPartyUser', name);
    setUser(name);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  if (isLoadingPhotos) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <Loader className="animate-spin text-purple-500" size={48} />
            <div className="absolute inset-0 blur-xl bg-purple-500/30 animate-pulse" />
          </div>
          <p className="text-gray-400 font-medium">Cargando tu galería...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden text-white">
      {/* Header con glassmorphism */}
      <header className="glass-effect-dark sticky top-0 z-30 border-b border-white/5 slide-in-from-top shrink-0">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Sparkles className="text-purple-400" size={24} />
              <div className="absolute inset-0 blur-lg bg-purple-500/30 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold gradient-text">
                PhotoParty
              </h1>
              {photos.length > 0 && (
                <p className="text-xs text-gray-400 font-medium">
                  {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isSaving && (
              <div className="flex items-center gap-2 text-purple-400 text-sm font-medium">
                <Loader className="animate-spin" size={16} />
                <span className="hidden sm:inline">Guardando...</span>
              </div>
            )}
            <button
              onClick={() => setShowCamera(true)}
              disabled={isSaving}
              className="btn-primary text-white px-5 md:px-6 py-2.5 rounded-full flex items-center gap-2 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CameraIcon size={20} />
              <span className="hidden sm:inline">Capturar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Feed */}
      <main ref={feedContainerRef} className="flex-1 flex flex-col overflow-y-auto scroll-smooth">
        <PhotoFeed
          photos={photos}
          onDelete={handleDelete}
          onUpdatePhoto={(updatedPhoto) => {
            setPhotos(prev => prev.map(p => p.id === updatedPhoto.id ? updatedPhoto : p));
          }}
        />
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[10px] text-white/40">
        <p>
          © Desarrollado por{' '}
          <a
            href="https://waveframe.com.ar/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold underline hover:text-gray-400 transition-colors"
          >
            WaveFrame Studio
          </a>{' '}
          | Todos los derechos reservados.
        </p>
      </footer>

      {/* Notificación de guardado exitoso */}
      {showSaveSuccess && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
          <div className="glass-effect px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl border border-green-500/20">
            <CheckCircle className="text-green-400" size={20} />
            <span className="font-semibold text-white">¡Foto guardada!</span>
          </div>
        </div>
      )}

      {/* Debug Error Display */}
      <div id="debug-console" className="hidden fixed top-20 left-0 right-0 bg-black/80 text-green-400 p-2 font-mono text-[10px] z-[100] h-32 overflow-auto border-b-2 border-red-500 pointer-events-none opacity-80">
        <div className="border-b border-gray-700 mb-1 pb-1 font-bold text-yellow-500">DEBUG LOGS (Visible at top)</div>
      </div>

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
