'use client';

import { useEffect, useState } from 'react';
import { TopNav } from '@/components/TopNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Image as ImageIcon, Film, FolderOpen, AlertTriangle } from 'lucide-react';

interface Stats {
  totalAssets: number;
  photos: number;
  videos: number;
  albums: number;
  missing: number;
  noThumbnail: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [reindexing, setReindexing] = useState(false);
  const [reindexResult, setReindexResult] = useState<string | null>(null);

  const loadStats = async () => {
    const [assetsRes, albumsRes] = await Promise.all([
      fetch('/api/assets?limit=1'),
      fetch('/api/albums'),
    ]);
    const assetsData = await assetsRes.json();
    const albumsData = await albumsRes.json();

    const [photosRes, videosRes] = await Promise.all([
      fetch('/api/assets?type=PHOTO&limit=1'),
      fetch('/api/assets?type=VIDEO&limit=1'),
    ]);
    const photosData = await photosRes.json();
    const videosData = await videosRes.json();

    setStats({
      totalAssets: assetsData.total || 0,
      photos: photosData.total || 0,
      videos: videosData.total || 0,
      albums: albumsData.length || 0,
      missing: 0,
      noThumbnail: 0,
    });
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleReindex = async () => {
    setReindexing(true);
    setReindexResult(null);
    try {
      const res = await fetch('/api/admin/reindex', { method: 'POST' });
      const data = await res.json();
      setReindexResult(data.ok ? 'Reindex complete!' : `Error: ${data.error}`);
      if (data.ok) loadStats();
    } catch {
      setReindexResult('Failed to connect to reindex endpoint.');
    } finally {
      setReindexing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <TopNav />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-semibold text-gray-800">Admin</h1>
          <p className="text-gray-500 mt-1">Manage your wedding gallery</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <StatCard icon={<ImageIcon className="h-5 w-5" />} label="Photos" value={stats?.photos} />
          <StatCard icon={<Film className="h-5 w-5" />} label="Videos" value={stats?.videos} />
          <StatCard icon={<FolderOpen className="h-5 w-5" />} label="Albums" value={stats?.albums} />
          <StatCard icon={<ImageIcon className="h-5 w-5" />} label="Total Assets" value={stats?.totalAssets} />
          <StatCard icon={<AlertTriangle className="h-5 w-5 text-amber-500" />} label="Missing Files" value={stats?.missing} />
          <StatCard icon={<AlertTriangle className="h-5 w-5 text-amber-500" />} label="No Thumbnail" value={stats?.noThumbnail} />
        </div>

        {/* Reindex */}
        <Card>
          <CardHeader>
            <CardTitle>Media Import</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Run the media importer to scan the media folder, create albums, and generate thumbnails.
              Place your media files in <code className="bg-gray-100 px-1 rounded text-xs">media/wedding/</code>.
            </p>
            <div className="flex items-center gap-3">
              <Button onClick={handleReindex} disabled={reindexing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${reindexing ? 'animate-spin' : ''}`} />
                {reindexing ? 'Reindexing...' : 'Reindex Media'}
              </Button>
              {reindexResult && (
                <span className={`text-sm ${reindexResult.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>
                  {reindexResult}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value?: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="text-[#c9a96e]">{icon}</div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{value ?? '—'}</p>
            <p className="text-xs text-gray-400">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
