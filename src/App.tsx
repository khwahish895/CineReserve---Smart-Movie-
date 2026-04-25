import { useEffect, useState } from 'react';
import { db, auth, signInWithGoogle } from './lib/firebase';
import { collection, onSnapshot, query, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Movie, Theater, Show } from './types';
import { useBookingStore } from './store';
import Navbar from './components/Navbar';
import MovieCard from './components/MovieCard';
import SeatMap from './components/SeatMap';
import HistoryView from './components/HistoryView';
import { seedDatabase } from './lib/seed';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Calendar, MapPin, CreditCard, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

type View = 'discover' | 'movie-detail' | 'seat-selection' | 'checkout' | 'success';

import { getMovieRecommendations } from './services/aiService';
import { Sparkles, Send } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<View>('discover');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiRecommendation, setAiRecommendation] = useState<{ recommendedMovieTitle: string, reason: string } | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const { 
    selectedMovie, setSelectedMovie, 
    selectedTheater, setSelectedTheater,
    selectedShow, setSelectedShow,
    selectedSeats, resetBooking,
    setBooking, currentBooking
  } = useBookingStore();

  useEffect(() => {
    seedDatabase();

    const unsubMovies = onSnapshot(collection(db, 'movies'), (snapshot) => {
      setMovies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Movie)));
    });

    const unsubTheaters = onSnapshot(collection(db, 'theaters'), (snapshot) => {
      setTheaters(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Theater)));
    });

    return () => {
      unsubMovies();
      unsubTheaters();
    };
  }, []);

  const handleMovieClick = (movie: Movie) => {
    setSelectedMovie(movie);
    setView('movie-detail');
    // Fetch shows for this movie
    const fetchShows = async () => {
      const q = query(collection(db, 'shows')); // In real app, filter by movieId
      const snapshot = await getDocs(q);
      const allShows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Show));
      setShows(allShows.filter(s => s.movieId === movie.id));
    };
    fetchShows();
  };

  const handleCreateBooking = async () => {
    if (!auth.currentUser || !selectedShow || selectedSeats.length === 0) return;
    
    setIsProcessing(true);
    try {
      const totalAmount = selectedSeats.reduce((acc, s) => acc + selectedShow.prices[s.type], 0);
      
      // 1. Create booking record
      const bookingData = {
        userId: auth.currentUser.uid,
        showId: selectedShow.id,
        seatIds: selectedSeats.map(s => `${s.row}${s.col}`),
        totalAmount,
        status: 'confirmed',
        createdAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(collection(db, 'bookings'), bookingData);
      
      // 2. Mark seats as booked
      for (const seat of selectedSeats) {
        const seatRef = doc(db, 'shows', selectedShow.id, 'seats', seat.id);
        await updateDoc(seatRef, {
          status: 'booked',
          userId: auth.currentUser.uid,
          lockedBy: null,
          lockExpiresAt: null
        });
      }

      setBooking({ id: docRef.id, ...bookingData } as any);
      setView('success');
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#E50914', '#ffffff', '#003566']
      });
    } catch (error) {
      console.error("Booking error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGetAiRecommendation = async () => {
    if (!aiPrompt || movies.length === 0) return;
    setIsAiLoading(true);
    const result = await getMovieRecommendations(aiPrompt, movies);
    setAiRecommendation(result);
    setIsAiLoading(false);
  };

  return (
    <div className="min-h-screen pb-20">
      <Navbar onShowHistory={() => setIsHistoryOpen(true)} />
      
      <main className="max-w-7xl mx-auto px-6 pt-32">
        <AnimatePresence mode="wait">
          {view === 'discover' && (
            <motion.div
              key="discover"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="mb-12">
                <h1 className="text-5xl font-display font-bold mb-4 tracking-tight">Now Showing</h1>
                <p className="text-gray-400 max-w-xl">Experience the latest blockbusters with crystal clear surround sound and high-definition visuals.</p>
              </div>

              {/* AI Recommendation Section */}
              <div className="mb-12 glass-panel p-6 border-brand-accent/30 bg-brand-accent/5">
                <div className="flex items-center gap-2 mb-4 text-brand-accent font-bold uppercase tracking-widest text-xs">
                  <Sparkles className="w-4 h-4" /> Smart Assistant
                </div>
                <h3 className="text-xl font-bold mb-2 font-display">Don't know what to watch?</h3>
                <p className="text-sm text-gray-400 mb-6">Tell us your mood, and our AI will pick the perfect movie for you.</p>
                <div className="flex gap-4">
                  <input 
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g. 'I want something mind-bending with beautiful visuals'"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-colors"
                  />
                  <button 
                    onClick={handleGetAiRecommendation}
                    disabled={isAiLoading || !aiPrompt}
                    className="bg-brand-primary hover:bg-red-700 disabled:opacity-50 px-6 rounded-lg transition-all flex items-center gap-2"
                  >
                    {isAiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
                <AnimatePresence>
                  {aiRecommendation && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-6 pt-6 border-t border-white/5"
                    >
                      <p className="text-sm text-gray-300 italic">
                        "If you're in that mood, you should definitely watch <span className="text-brand-primary font-bold">{aiRecommendation.recommendedMovieTitle}</span>. {aiRecommendation.reason}"
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {movies.map(movie => (
                  <MovieCard key={movie.id} movie={movie} onClick={() => handleMovieClick(movie)} />
                ))}
              </div>
            </motion.div>
          )}

          {view === 'movie-detail' && selectedMovie && (
            <motion.div
              key="movie-detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-12"
            >
              <div>
                <button onClick={() => setView('discover')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-8 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Back to Movies
                </button>
                <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-8 border border-white/10 group">
                    <img src={selectedMovie.poster} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <button className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                            <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[18px] border-l-white border-b-[10px] border-b-transparent translate-x-1" />
                        </button>
                    </div>
                </div>
                <h2 className="text-4xl font-display font-bold mb-4">{selectedMovie.title}</h2>
                <div className="flex flex-wrap gap-4 mb-6">
                  <span className="bg-brand-primary px-3 py-1 rounded-full text-xs font-bold">{selectedMovie.genre}</span>
                  <span className="text-gray-400 text-sm flex items-center gap-1"><Calendar className="w-4 h-4" /> Released: 2024</span>
                  <span className="text-gray-400 text-sm">{selectedMovie.duration}</span>
                </div>
                <p className="text-gray-400 leading-relaxed mb-8">{selectedMovie.description}</p>
              </div>

              <div className="glass-panel p-8 self-start">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-brand-primary" />
                  Select Cinema & Time
                </h3>
                <div className="space-y-8">
                  {theaters.map(theater => {
                    const theaterShows = shows.filter(s => s.theaterId === theater.id);
                    if (theaterShows.length === 0) return null;

                    return (
                      <div key={theater.id}>
                        <p className="text-sm font-semibold mb-3 text-gray-300">{theater.name}</p>
                        <div className="flex flex-wrap gap-3">
                          {theaterShows.map(show => (
                            <button
                              key={show.id}
                              onClick={() => {
                                setSelectedTheater(theater);
                                setSelectedShow(show);
                                setView('seat-selection');
                              }}
                              className="bg-white/5 hover:bg-brand-primary border border-white/10 hover:border-brand-primary px-4 py-2 rounded-lg text-sm font-medium transition-all"
                            >
                              {show.startTime}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'seat-selection' && selectedShow && (
            <motion.div
              key="seat-selection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center justify-between mb-12">
                <button onClick={() => setView('movie-detail')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Change Showtime
                </button>
                <div className="text-center">
                  <h2 className="text-2xl font-bold">{selectedMovie?.title}</h2>
                  <p className="text-sm text-gray-400">{selectedTheater?.name} • {selectedShow.startTime}</p>
                </div>
                <button
                  disabled={selectedSeats.length === 0}
                  onClick={() => setView('checkout')}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Checkout <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              
              <SeatMap show={selectedShow} />
            </motion.div>
          )}

          {view === 'checkout' && selectedShow && (
             <motion.div
                key="checkout"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md mx-auto"
             >
                <div className="glass-panel p-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-brand-primary" />
                    <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
                        <CreditCard className="w-6 h-6 text-brand-primary" />
                        Summary & Payment
                    </h2>

                    <div className="space-y-4 mb-8">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Movie</span>
                            <span className="font-medium">{selectedMovie?.title}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Theater</span>
                            <span className="font-medium">{selectedTheater?.name}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Seats ({selectedSeats.length})</span>
                            <span className="font-medium">{selectedSeats.map(s => `${s.row}${s.col}`).join(', ')}</span>
                        </div>
                        <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                            <span className="text-lg font-bold">Total Amount</span>
                            <span className="text-2xl font-bold text-brand-primary">
                                ${selectedSeats.reduce((acc, s) => acc + selectedShow.prices[s.type], 0).toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <p className="text-[10px] text-gray-500 mb-6 uppercase tracking-widest text-center">
                        Powered by Stripe Secure Payments
                    </p>

                    <button
                        onClick={handleCreateBooking}
                        disabled={isProcessing}
                        className="w-full btn-primary py-4 flex items-center justify-center gap-3 text-lg"
                    >
                        {isProcessing ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <>Confirm & Pay</>
                        )}
                    </button>
                    
                    <button 
                        onClick={() => setView('seat-selection')}
                        className="w-full text-center mt-6 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        Modify Selection
                    </button>
                </div>
             </motion.div>
          )}

          {view === 'success' && currentBooking && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-md mx-auto text-center"
            >
              <div className="bg-green-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 border border-green-500/50">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-4xl font-display font-bold mb-4">You're going to the movies!</h2>
              <p className="text-gray-400 mb-12">Your booking has been confirmed. A digital ticket has been added to your profile.</p>
              
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-8 text-left">
                 <div className="flex justify-between items-start mb-6">
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Booking ID</p>
                        <p className="font-mono text-sm">{currentBooking.id}</p>
                    </div>
                 </div>
                 <div className="space-y-4 mb-8">
                     <div className="flex justify-between">
                         <span className="text-sm text-gray-400">Movie</span>
                         <span className="text-sm font-bold">{selectedMovie?.title}</span>
                     </div>
                     <div className="flex justify-between">
                         <span className="text-sm text-gray-400">Date & Time</span>
                         <span className="text-sm font-bold">{selectedShow?.date} @ {selectedShow?.startTime}</span>
                     </div>
                 </div>
                 <div className="bg-white p-4 rounded-xl w-fit mx-auto mb-4">
                    {/* In a real app we'd pass the actual booking ID or secure token */}
                    <div className="w-32 h-32 bg-gray-200 flex items-center justify-center">
                         <div className="grid grid-cols-4 gap-1 opacity-20">
                             {Array.from({length: 16}).map((_, i) => <div key={i} className="w-6 h-6 bg-black" />)}
                         </div>
                    </div>
                 </div>
                 <p className="text-[10px] text-gray-500 text-center uppercase tracking-widest">
                    Scan this QR at the entrance
                 </p>
              </div>

              <button
                onClick={() => {
                  resetBooking();
                  setView('discover');
                }}
                className="btn-primary"
              >
                Back to Home
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {isHistoryOpen && <HistoryView onClose={() => setIsHistoryOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
