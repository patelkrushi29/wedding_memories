'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

interface Album {
  slug: string;
  title: string;
}

interface FilterBarProps {
  search: string;
  onSearch: (v: string) => void;
  album: string;
  onAlbum: (v: string) => void;
  sort: string;
  onSort: (v: string) => void;
  albums: Album[];
  total: number;
  showing: number;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'album', label: 'By album' },
  { value: 'filename', label: 'By filename' },
];

export function FilterBar({
  search,
  onSearch,
  album,
  onAlbum,
  sort,
  onSort,
  albums,
  total,
  showing,
}: FilterBarProps) {
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label || 'Newest first';
  const albumLabel = album ? albums.find((a) => a.slug === album)?.title || album : 'All albums';

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mb-6">
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by filename..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            {albumLabel}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onAlbum('')}>All albums</DropdownMenuItem>
          {albums.map((a) => (
            <DropdownMenuItem key={a.slug} onClick={() => onAlbum(a.slug)}>
              {a.title}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            {sortLabel}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {SORT_OPTIONS.map((o) => (
            <DropdownMenuItem key={o.value} onClick={() => onSort(o.value)}>
              {o.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <p className="text-sm text-gray-400 ml-auto whitespace-nowrap">
        Showing {showing} of {total}
      </p>
    </div>
  );
}
