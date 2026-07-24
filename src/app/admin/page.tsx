'use client';

import { useEffect, useState, useCallback } from 'react';
import { TopNav } from '@/components/TopNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RefreshCw, Image as ImageIcon, Film, FolderOpen, AlertTriangle, Eye, EyeOff, Trash2 } from 'lucide-react';

interface AdminEventTag {
  id: string;
  name: string;
  slug: string;
  isVisible: boolean;
  source: string | null;
  startAt: string | null;
  endAt: string | null;
  assetCount: number;
  sampleThumbnails: string[];
}

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
  const [events, setEvents] = useState<AdminEventTag[]>([]);
  const [eventEdits, setEventEdits] = useState<Record<string, string>>({});
  const [adminSecret, setAdminSecret] = useState('');
  const [eventsError, setEventsError] = useState<string | null>(null);

  const authHeaders = useCallback((): Record<string, string> => {
    return adminSecret ? { Authorization: `Bearer ${adminSecret}` } : {};
  }, [adminSecret]);

  const loadEvents = useCallback(async () => {
    setEventsError(null);
    const res = await fetch('/api/admin/tags', { headers: authHeaders() });
    if (res.status === 401) {
      setEventsError('Enter the admin secret to manage events.');
      setEvents([]);
      return;
    }
    setEvents(await res.json());
  }, [authHeaders]);

  const saveEvent = async (tag: AdminEventTag, patch: { name?: string; isVisible?: boolean }) => {
    const res = await fetch(`/api/admin/tags/${tag.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(patch),
    });
    if (res.ok) loadEvents();
  };

  const deleteEvent = async (tag: AdminEventTag) => {
    if (!confirm(`Delete event "${tag.name}"? Photos are kept; only the grouping is removed.`)) return;
    const res = await fetch(`/api/admin/tags/${tag.id}`, { method: 'DELETE', headers: authHeaders() });
    if (res.ok) loadEvents();
  };

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

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

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

        {/* Events review */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Candidate events come from <code className="bg-gray-100 px-1 rounded text-xs">npm run cluster:events</code>.
              Name them and toggle visibility to publish. Hidden events never show to guests.
            </p>

            {eventsError && (
              <div className="flex items-center gap-2 mb-4">
                <Input
                  type="password"
                  placeholder="Admin secret"
                  value={adminSecret}
                  onChange={(e) => setAdminSecret(e.target.value)}
                  className="max-w-xs"
                />
                <Button variant="outline" size="sm" onClick={loadEvents}>Unlock</Button>
                <span className="text-sm text-amber-600">{eventsError}</span>
              </div>
            )}

            {events.length === 0 && !eventsError ? (
              <p className="text-sm text-gray-400">No events yet. Run the clustering script after syncing photos.</p>
            ) : (
              <div className="space-y-3">
                {events.map((tag) => (
                  <div key={tag.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-white">
                    <div className="flex -space-x-2 shrink-0">
                      {tag.sampleThumbnails.slice(0, 3).map((src, i) => (
                        <img key={i} src={src} alt="" className="h-10 w-10 rounded-lg object-cover border-2 border-white" />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Input
                        defaultValue={tag.name}
                        onChange={(e) => setEventEdits((p) => ({ ...p, [tag.id]: e.target.value }))}
                        onBlur={() => {
                          const name = eventEdits[tag.id];
                          if (name && name !== tag.name) saveEvent(tag, { name });
                        }}
                        className="h-8 text-sm font-medium"
                      />
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {tag.assetCount} photos
                        {tag.startAt && ` · ${new Date(tag.startAt).toLocaleDateString()}`}
                        {tag.source && ` · ${tag.source}`}
                      </p>
                    </div>
                    <Button
                      variant={tag.isVisible ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => saveEvent(tag, { isVisible: !tag.isVisible })}
                      title={tag.isVisible ? 'Visible to guests — click to hide' : 'Hidden — click to publish'}
                    >
                      {tag.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      <span className="ml-1.5 hidden sm:inline">{tag.isVisible ? 'Live' : 'Hidden'}</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteEvent(tag)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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
