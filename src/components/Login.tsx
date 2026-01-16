import { useState } from 'react';
import { User, Sparkles, ArrowRight } from 'lucide-react';
import SmokeBackground from './SmokeBackground';

interface LoginProps {
    onLogin: (name: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            setError('Por favor, ingresa tu nombre y apellido');
            return;
        }

        if (name.trim().length < 3) {
            setError('El nombre es muy corto');
            return;
        }

        onLogin(name.trim());
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
            {/* Background 3D */}
            <SmokeBackground />

            <div className="max-w-md w-full glass-effect bg-black/60 backdrop-blur-xl p-8 rounded-2xl relative z-10 animate-in zoom-in border border-white/10">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-4 shadow-lg float">
                        <Sparkles className="text-white" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold gradient-text mb-2">PhotoParty</h1>
                    <p className="text-gray-400">Ingresa para comenzar a compartir fotos</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                            Nombre y Apellido:
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="text-gray-500" size={20} />
                            </div>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    setError('');
                                }}
                                className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-black/20 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                                placeholder="Ingresar tu nombre y apellido."
                                autoComplete="name"
                                autoFocus
                            />
                        </div>
                        {error && (
                            <p className="text-red-400 text-xs animate-in slide-in-from-top pl-1">
                                {error}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="w-full btn-primary text-white py-3.5 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 group"
                    >
                        <span>Ingresar</span>
                        <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                    </button>
                </form>


            </div>

            <footer className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-white/40">
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
        </div>
    );
}
