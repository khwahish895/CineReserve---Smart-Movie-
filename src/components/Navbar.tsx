import { auth, signInWithGoogle } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Film, User, LogOut, Ticket } from 'lucide-react';
import { motion } from 'motion/react';

export default function Navbar({ onShowHistory }: { onShowHistory: () => void }) {
  const [user] = useAuthState(auth);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-lg border-b border-white/10 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => window.location.reload()}>
          <motion.div
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.5 }}
          >
            <Film className="w-8 h-8 text-brand-primary" />
          </motion.div>
          <span className="text-2xl font-display font-bold tracking-tight bg-gradient-to-r from-red-500 to-red-800 bg-clip-text text-transparent">
            CineReserve
          </span>
        </div>

        <div className="flex items-center gap-6">
          {user ? (
            <div className="flex items-center gap-4">
              <button 
                onClick={onShowHistory}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <Ticket className="w-4 h-4" />
                My Bookings
              </button>
              <div className="flex items-center gap-2 group relative">
                <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-white/20" />
                <span className="text-sm font-medium hidden sm:block">{user.displayName}</span>
                <button 
                  onClick={() => auth.signOut()}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-sm font-medium transition-all"
            >
              <User className="w-4 h-4" />
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
