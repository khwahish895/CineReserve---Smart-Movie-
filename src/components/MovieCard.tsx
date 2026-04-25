import { Movie } from '../types';
import { Star, Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface MovieCardProps {
  movie: Movie;
  onClick: () => void;
}

export default function MovieCard({ movie, onClick }: MovieCardProps) {
  return (
    <motion.div
      whileHover={{ y: -10 }}
      className="relative group cursor-pointer"
      onClick={onClick}
    >
      <div className="aspect-[2/3] overflow-hidden rounded-xl bg-gray-900 border border-white/5 shadow-2xl">
        <img
          src={movie.poster}
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform">
        <h3 className="text-lg font-bold line-clamp-1">{movie.title}</h3>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-300 font-medium">
          <div className="flex items-center gap-1 text-yellow-500">
            <Star className="w-3 h-3 fill-current" />
            {movie.rating}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {movie.duration}
          </div>
          <div className="bg-white/10 px-2 py-0.5 rounded uppercase tracking-wider text-[10px]">
            {movie.genre}
          </div>
        </div>
      </div>

      {movie.status === 'coming-soon' && (
        <div className="absolute top-2 right-2 bg-yellow-500 text-black text-[10px] font-bold px-2 py-1 rounded-sm uppercase">
          Coming Soon
        </div>
      )}
    </motion.div>
  );
}
