import { useState, useEffect, useCallback, useRef } from 'react';
import { Camera as CameraIcon, Loader, CheckCircle, Sparkles, MoreVertical, Package, Loader2, LayoutGrid, List } from 'lucide-react';
import JSZip from 'jszip';
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
  const [showMenu, setShowMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isHidingPreview, setIsHidingPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'feed' | 'grid'>('feed');
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const previousPhotosCountRef = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cerrar menú al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    const channelName = `photos-realtime-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'photos',
        },
        (payload: any) => {
          console.log('[Realtime] 🆕 INSERT payload:', payload);
          const newPhoto = payload.new;

          setPhotos((prev) => {
            const exists = prev.some(p => p.id === newPhoto.id);
            if (exists) {
              console.log('[Realtime] Photo already exists in state, ignoring.');
              return prev;
            }

            const photoToAdd: Photo = {
              id: newPhoto.id,
              imageUrl: newPhoto.image_url,
              userName: newPhoto.user_name,
              title: newPhoto.title || undefined,
              createdAt: new Date(newPhoto.created_at),
              likesCount: newPhoto.likes_count || 0,
              likedBy: newPhoto.liked_by || [],
            };
            console.log('[Realtime] Adding to state:', photoToAdd.id);
            return [photoToAdd, ...prev];
          });
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
          console.log('[Realtime] 🔄 UPDATE payload:', payload);
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
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'photos',
        },
        (payload: any) => {
          console.log('[Realtime] 🗑️ DELETE payload:', payload);
          const deletedId = payload.old.id;
          setPhotos((prev) => prev.filter((photo) => photo.id !== deletedId));
        }
      )
      .subscribe((status, err) => {
        console.log(`[Realtime] Channel [${channelName}] status:`, status);
        if (err) console.error('[Realtime] Error:', err);
      });

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

    // Preview Logic
    setPreviewImage(imageSrc);
    setShowPreview(true);
    setIsHidingPreview(false);

    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => {
      setIsHidingPreview(true);
      // Wait for exit animation (400ms) before unmounting
      setTimeout(() => {
        setShowPreview(false);
        setIsHidingPreview(false);
      }, 400);
    }, 3000);

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
  }, [user]);

  const handleDelete = useCallback(async (id: string) => {
    const success = await deletePhoto(id);
    if (success) {
      setPhotos((prev) => prev.filter((photo) => photo.id !== id));
    }
  }, []);

  const exportAllPhotos = async () => {
    if (photos.length === 0) return;

    setIsExporting(true);
    setShowMenu(false);
    try {
      const zip = new JSZip();
      const folder = zip.folder("photoparty-photos");

      const photoPromises = photos.map(async (photo, index) => {
        try {
          const response = await fetch(photo.imageUrl);
          const blob = await response.blob();
          const fileName = `photo-${photo.id || index}-${photo.createdAt.getTime()}.jpg`;
          folder?.file(fileName, blob);
        } catch (err) {
          console.error(`Error adding photo ${photo.id} to zip:`, err);
        }
      });

      await Promise.all(photoPromises);
      const content = await zip.generateAsync({ type: "blob" });

      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `photoparty-export-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting photos:', err);
      alert('Error al exportar las fotos. Por favor, intenta de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

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
    <div className="h-[100dvh] flex flex-col overflow-hidden text-white app-bg">
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
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                disabled={isExporting}
                className={`p-2.5 rounded-full transition-all duration-200 ${showMenu ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
                  } disabled:opacity-50`}
                aria-label="Más opciones"
              >
                {isExporting ? <Loader2 size={20} className="animate-spin text-purple-400" /> : <MoreVertical size={20} />}
              </button>

              {/* Menú Desplegable */}
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 glass-effect-dark rounded-xl border border-white/10 shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setViewMode(prev => prev === 'feed' ? 'grid' : 'feed');
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 text-sm font-medium text-gray-200 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      {viewMode === 'feed' ? <LayoutGrid size={18} /> : <List size={18} />}
                      Vista: {viewMode === 'feed' ? 'Álbum' : 'Feed'}
                    </button>
                    <button
                      onClick={exportAllPhotos}
                      className="w-full px-4 py-3 flex items-center gap-3 text-sm font-medium text-gray-200 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      <Package size={18} />
                      Exportar Todas
                    </button>
                    {/* Futuras opciones pueden ir aquí */}
                  </div>
                </div>
              )}
            </div>
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
          currentUser={user || ''}
          viewMode={viewMode}
        />

        {/* Footer */}
        <footer className="py-6 mt-auto text-center text-[10px] text-white/40">
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
      </main>


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

      {/* Botón flotante de cámara */}
      {!showCamera && (
        <button
          onClick={() => setShowCamera(true)}
          disabled={isSaving || isExporting}
          className="fixed bottom-12 right-6 z-40 btn-primary p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
          aria-label="Capturar foto"
        >
          <CameraIcon size={28} className="group-hover:rotate-12 transition-transform" />
          <div className="absolute inset-0 rounded-full blur-xl bg-purple-500/40 -z-10 group-hover:bg-purple-500/60 transition-all" />
        </button>
      )}

      {/* Cámara */}
      {showCamera && (
        <Camera
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Preview de foto capturada */}
      {showPreview && previewImage && (
        <div className={`fixed top-20 right-4 z-[100] ${isHidingPreview
          ? 'fade-out slide-out-to-right-4'
          : 'animate-in slide-in-from-right-4'
          }`}>
          <div className="glass-effect p-1 rounded-xl shadow-2xl border border-white/20">
            <div className="relative w-32 h-44 rounded-lg overflow-hidden">
              <img
                src={previewImage}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-1 right-2">
                <CheckCircle className="text-green-400" size={16} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
