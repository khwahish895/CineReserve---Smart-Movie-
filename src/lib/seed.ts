import { db } from './firebase';
import { collection, doc, writeBatch, getDocs, query, limit } from 'firebase/firestore';

const MOVIES = [
  {
    title: "Interstellar",
    poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=80",
    rating: 8.7,
    duration: "2h 49m",
    genre: "Sci-Fi",
    description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    status: "now-showing"
  },
  {
    title: "The Batman",
    poster: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=800&q=80",
    rating: 7.8,
    duration: "2h 56m",
    genre: "Action",
    description: "When a sadistic serial killer begins murdering key political figures in Gotham, Batman is forced to investigate the city's hidden corruption.",
    status: "now-showing"
  },
  {
    title: "Dune: Part Two",
    poster: "https://images.unsplash.com/photo-1542204172-3c138fd940b5?w=800&q=80",
    rating: 8.9,
    duration: "2h 46m",
    genre: "Sci-Fi",
    description: "Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.",
    status: "now-showing"
  },
  {
      title: "Inception",
      poster: "https://images.unsplash.com/photo-1460666819451-e16115052731?w=800&q=80",
      rating: 8.8,
      duration: "2h 28m",
      genre: "Sci-Fi",
      description: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
      status: "now-showing"
  }
];

const THEATERS = [
  { name: "Cineplex IMAX", location: "Downtown", address: "123 Movie Lane, City Center" },
  { name: "Grand Cinema", location: "Westside", address: "456 Popcorn Ave, Westside Mall" }
];

export async function seedDatabase() {
  const moviesSnapshot = await getDocs(query(collection(db, 'movies'), limit(1)));
  if (!moviesSnapshot.empty) {
    console.log("Database already seeded.");
    return;
  }

  console.log("Seeding database...");
  const batch = writeBatch(db);

  // Add Movies
  const movieIds: string[] = [];
  for (const movie of MOVIES) {
    const movieRef = doc(collection(db, 'movies'));
    batch.set(movieRef, movie);
    movieIds.push(movieRef.id);
  }

  // Add Theaters
  const theaterIds: string[] = [];
  for (const theater of THEATERS) {
    const theaterRef = doc(collection(db, 'theaters'));
    batch.set(theaterRef, theater);
    theaterIds.push(theaterRef.id);
  }

  // Commit initial batch
  await batch.commit();

  // Create Shows and Seats (Next batch)
  const showsBatch = writeBatch(db);
  for (const movieId of movieIds) {
    for (const theaterId of theaterIds) {
      const showRef = doc(collection(db, 'shows'));
      const showId = showRef.id;
      batch.set(showRef, {
        movieId,
        theaterId,
        startTime: "20:00",
        date: "2026-04-26",
        prices: { regular: 12, premium: 18, vip: 25 }
      });

      // Add Seats
      const rows = ['A', 'B', 'C', 'D', 'E'];
      rows.forEach(row => {
        for (let col = 1; col <= 8; col++) {
          const seatRef = doc(collection(db, 'shows', showId, 'seats'));
          batch.set(seatRef, {
            showId,
            row,
            col,
            type: row === 'E' ? 'vip' : (row === 'D' ? 'premium' : 'regular'),
            status: 'available'
          });
        }
      });
    }
  }

  await batch.commit();
  console.log("Seeding complete!");
}
