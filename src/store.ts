import { create } from 'zustand';
import { Movie, Show, Theater, Seat, Booking } from './types';

interface BookingStore {
  selectedMovie: Movie | null;
  selectedTheater: Theater | null;
  selectedShow: Show | null;
  selectedSeats: Seat[];
  currentBooking: Booking | null;

  setSelectedMovie: (movie: Movie | null) => void;
  setSelectedTheater: (theater: Theater | null) => void;
  setSelectedShow: (show: Show | null) => void;
  setSelectedSeats: (seats: Seat[]) => void;
  toggleSeat: (seat: Seat) => void;
  resetBooking: () => void;
  setBooking: (booking: Booking | null) => void;
}

export const useBookingStore = create<BookingStore>((set) => ({
  selectedMovie: null,
  selectedTheater: null,
  selectedShow: null,
  selectedSeats: [],
  currentBooking: null,

  setSelectedMovie: (movie) => set({ selectedMovie: movie, selectedTheater: null, selectedShow: null, selectedSeats: [] }),
  setSelectedTheater: (theater) => set({ selectedTheater: theater, selectedShow: null, selectedSeats: [] }),
  setSelectedShow: (show) => set({ selectedShow: show, selectedSeats: [] }),
  setSelectedSeats: (seats) => set({ selectedSeats: seats }),
  toggleSeat: (seat) => set((state) => {
    const isSelected = state.selectedSeats.some((s) => s.id === seat.id);
    if (isSelected) {
      return { selectedSeats: state.selectedSeats.filter((s) => s.id !== seat.id) };
    } else {
      return { selectedSeats: [...state.selectedSeats, seat] };
    }
  }),
  resetBooking: () => set({ selectedMovie: null, selectedTheater: null, selectedShow: null, selectedSeats: [], currentBooking: null }),
  setBooking: (booking) => set({ currentBooking: booking })
}));
