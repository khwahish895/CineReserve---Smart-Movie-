import { useEffect, useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Booking } from '../types';
import { motion } from 'motion/react';
import { Ticket, Calendar, MapPin, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function HistoryView({ onClose }: { onClose: () => void }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    const fetchBookings = async () => {
      const q = query(
        collection(db, 'bookings'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
      setLoading(false);
    };
    fetchBookings();
  }, [user]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-gray-900 border border-white/10 w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-display font-bold">My Bookings</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-gray-500">Loading your tickets...</div>
        ) : bookings.length === 0 ? (
          <div className="py-20 text-center">
            <Ticket className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500">No bookings yet. Time to watch a movie!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map(booking => (
              <div key={booking.id} className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">
                      {booking.status}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      ID: {booking.id.slice(0, 8)}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Movie Ticket</h3>
                  <div className="space-y-1 text-sm text-gray-400">
                    <p className="flex items-center gap-2"><Calendar className="w-3 h-3" /> Confirmed: {new Date(booking.createdAt.toMillis()).toLocaleDateString()}</p>
                    <p className="flex items-center gap-2"><MapPin className="w-3 h-3" /> Seats: {booking.seatIds.join(', ')}</p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/5 text-lg font-bold">
                    ${booking.totalAmount.toFixed(2)}
                  </div>
                </div>
                <div className="bg-white p-2 rounded-lg shrink-0 self-center sm:self-auto">
                    <QRCodeSVG value={booking.id} size={100} />
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
