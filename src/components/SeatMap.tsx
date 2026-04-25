import { useEffect, useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Seat, Show } from '../types';
import { useBookingStore } from '../store';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';
import { Info } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function SeatMap({ show }: { show: Show }) {
  const [seats, setSeats] = useState<Seat[]>([]);
  const { selectedSeats, toggleSeat } = useBookingStore();
  const user = auth.currentUser;

  useEffect(() => {
    if (!show.id) return;

    const seatsRef = collection(db, 'shows', show.id, 'seats');
    const unsubscribe = onSnapshot(seatsRef, (snapshot) => {
      const seatsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Seat));
      setSeats(seatsData);
    });

    return () => unsubscribe();
  }, [show.id]);

  const handleSeatClick = async (seat: Seat) => {
    if (!user) {
      alert("Please sign in to select seats.");
      return;
    }

    if (seat.status === 'booked') return;
    
    if (seat.status === 'locked' && seat.lockedBy !== user.uid) {
      // Check if lock is expired
      const now = Date.now();
      const expiresAt = (seat.lockExpiresAt as Timestamp)?.toMillis() || 0;
      if (now < expiresAt) return; // Still locked
    }

    const seatRef = doc(db, 'shows', show.id, 'seats', seat.id);

    try {
      if (seat.status === 'available' || (seat.status === 'locked' && Date.now() > (seat.lockExpiresAt as Timestamp)?.toMillis())) {
        // Lock it
        const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins lock
        await updateDoc(seatRef, {
          status: 'locked',
          lockedBy: user.uid,
          lockExpiresAt: Timestamp.fromDate(expiry)
        });
        toggleSeat({ ...seat, status: 'locked', lockedBy: user.uid, lockExpiresAt: Timestamp.fromDate(expiry) });
      } else if (seat.status === 'locked' && seat.lockedBy === user.uid) {
        // Unlock it if user clicks again (and it's currently selected in store)
        await updateDoc(seatRef, {
          status: 'available',
          lockedBy: null,
          lockExpiresAt: null
        });
        toggleSeat(seat);
      }
    } catch (error) {
      console.error("Error updating seat lock:", error);
    }
  };

  // Group seats by row
  const rows = seats.reduce((acc, seat) => {
    if (!acc[seat.row]) acc[seat.row] = [];
    acc[seat.row].push(seat);
    return acc;
  }, {} as Record<string, Seat[]>);

  const sortedRowKeys = Object.keys(rows).sort();

  return (
    <div className="w-full max-w-4xl mx-auto overflow-x-auto p-4">
      <div className="min-w-[600px]">
        {/* Screen */}
        <div className="w-4/5 h-2 bg-gradient-to-b from-blue-400/50 to-transparent mx-auto rounded-b-[100%] mb-12 relative">
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-bold text-gray-500 uppercase tracking-widest">
            Screen This Way
          </span>
        </div>

        {/* Seat Grid */}
        <div className="space-y-4">
          {sortedRowKeys.map(rowKey => (
            <div key={rowKey} className="flex items-center justify-center gap-3">
              <div className="w-6 text-xs font-bold text-gray-600">{rowKey}</div>
              <div className="flex gap-2">
                {rows[rowKey].sort((a, b) => a.col - b.col).map(seat => {
                  const isSelected = selectedSeats.some(s => s.id === seat.id);
                  const isBooked = seat.status === 'booked';
                  const isLockedByOther = seat.status === 'locked' && seat.lockedBy !== user?.uid;
                  const isLockedByMe = seat.status === 'locked' && seat.lockedBy === user?.uid;

                  return (
                    <motion.button
                      key={seat.id}
                      whileHover={!isBooked && !isLockedByOther ? { scale: 1.2 } : {}}
                      whileTap={!isBooked && !isLockedByOther ? { scale: 0.9 } : {}}
                      onClick={() => handleSeatClick(seat)}
                      className={cn(
                        "w-7 h-7 rounded-sm flex items-center justify-center text-[10px] font-bold transition-all border",
                        isBooked && "bg-gray-800 border-gray-700 text-transparent cursor-not-allowed",
                        isLockedByOther && "bg-orange-500/20 border-orange-500/50 text-orange-500 animate-pulse cursor-not-allowed",
                        isLockedByMe && "bg-brand-primary border-brand-primary text-white shadow-lg shadow-red-500/20",
                        !isBooked && !isLockedByOther && !isLockedByMe && "bg-gray-900 border-white/20 text-gray-500 hover:border-brand-primary hover:text-brand-primary"
                      )}
                      disabled={isBooked || isLockedByOther}
                    >
                      {seat.col}
                    </motion.button>
                  );
                })}
              </div>
              <div className="w-6 text-xs font-bold text-gray-600">{rowKey}</div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 mt-12 text-xs font-medium text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-900 border border-white/20 rounded-sm" />
            Available
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-brand-primary rounded-sm" />
            Selected
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-800 border border-gray-700 rounded-sm" />
            Booked
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500/50 rounded-sm animate-pulse" />
            Locked
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedSeats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 border border-white/10 rounded-2xl flex items-center gap-8 px-8 py-4 shadow-2xl z-40"
          >
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Seats</p>
              <p className="text-lg font-bold">{selectedSeats.length} Seats</p>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Amount</p>
              <p className="text-lg font-bold text-brand-primary">
                ${selectedSeats.reduce((acc, s) => acc + (show.prices[s.type]), 0)}
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-orange-400 max-w-[150px] leading-tight">
              <Info className="w-4 h-4 shrink-0" />
              Seats are locked for 5 minutes during booking.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
