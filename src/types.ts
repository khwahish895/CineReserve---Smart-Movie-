export interface Movie {
  id: string;
  title: string;
  poster: string;
  trailer?: string;
  rating: number;
  duration: string;
  genre: string;
  description: string;
  status: 'now-showing' | 'coming-soon';
  releaseDate?: string;
}

export interface Theater {
  id: string;
  name: string;
  location: string;
  address: string;
}

export interface Show {
  id: string;
  movieId: string;
  theaterId: string;
  startTime: string;
  date: string;
  prices: {
    regular: number;
    premium: number;
    vip: number;
  };
}

export interface Seat {
  id: string;
  showId: string;
  row: string;
  col: number;
  type: 'regular' | 'premium' | 'vip';
  status: 'available' | 'locked' | 'booked';
  lockedBy?: string;
  lockExpiresAt?: any;
  userId?: string;
}

export interface Booking {
  id: string;
  userId: string;
  showId: string;
  seatIds: string[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  paymentId?: string;
  createdAt: any;
  qrCode?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  wishlist?: string[];
}
