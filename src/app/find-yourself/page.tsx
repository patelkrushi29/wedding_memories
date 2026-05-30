import { TopNav } from '@/components/TopNav';
import { Sparkles } from 'lucide-react';

export default function FindYourselfPage() {
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <TopNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-20 h-20 rounded-full bg-[#fdf7ef] flex items-center justify-center mb-6">
            <Sparkles className="h-10 w-10 text-[#c9a96e]" />
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-gray-800 mb-4">
            Find Yourself
          </h1>
          <p className="text-gray-500 text-lg max-w-md mb-2">
            A magical feature is on its way
          </p>
          <p className="text-gray-400 text-sm max-w-sm">
            Soon you will be able to search through all the wedding photos to find every picture that features you, powered by face recognition technology.
          </p>
          <div className="mt-8 px-6 py-2 rounded-full bg-[#fdf7ef] border border-[#c9a96e]/30 text-[#c9a96e] text-sm font-medium">
            Coming Soon
          </div>
        </div>
      </main>
    </div>
  );
}
