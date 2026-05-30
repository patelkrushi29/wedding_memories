import { Heart } from 'lucide-react';

export function EmptyState({ message, description }: { message: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-[#fdf7ef] flex items-center justify-center mb-4">
        <Heart className="h-8 w-8 text-[#c9a96e]" />
      </div>
      <h3 className="font-serif text-xl font-medium text-gray-700 mb-2">{message}</h3>
      {description && <p className="text-sm text-gray-400 max-w-md">{description}</p>}
    </div>
  );
}
