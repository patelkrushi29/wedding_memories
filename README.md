# Wedding Memories Gallery

A private, password-protected wedding photo and video gallery. Built with Next.js, Prisma, and Tailwind CSS.

## Features

- Password-protected gallery
- Photo and video support
- Automatic album creation from folder structure
- Masonry photo grid
- Full-screen media viewer with keyboard navigation
- Favorite/select photos and download them
- Admin panel for managing imports

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` to set your passwords and paths:

```
DATABASE_URL="file:./dev.db"
MEDIA_ROOT="./media/wedding"
NEXT_PUBLIC_APP_NAME="Wedding Memories"
GUEST_PASSWORD="yourpassword"
ADMIN_REINDEX_SECRET="your-admin-secret"
```

### 3. Set up the database

```bash
npx prisma migrate dev --name init
```

### 4. Add your media files

Place your wedding photos and videos inside `media/wedding/`:

```
media/wedding/
  ceremony/
    photo1.jpg
    photo2.jpg
  reception/
    video1.mp4
  highlights/           <- special folder, marks photos as highlights
    best_shot.jpg
  standalone_photo.jpg  <- goes to "All Media" album
```

### 5. Import media

```bash
npm run import:media
```

This will:
- Scan the media folder recursively
- Create albums from subfolders
- Generate thumbnails (requires sharp)
- Extract EXIF data (date taken, etc.)

### 6. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and enter your gallery password.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run import:media` | Scan and import media files |
| `npm run generate:thumbnails` | Regenerate missing thumbnails |
| `npm run reset:local` | Delete all data and generated files |
| `npm run db:studio` | Open Prisma Studio (database viewer) |
| `npm run db:migrate` | Run database migrations |

## Folder Structure

```
src/
  app/               Next.js App Router pages
  components/        Reusable UI components
  lib/               Database, utilities, storage
scripts/             CLI scripts for media management
prisma/              Database schema and migrations
media/wedding/       Your wedding photos and videos (git-ignored)
public/generated/    Auto-generated thumbnails (git-ignored)
```

## Production

For production deployment, set `NODE_ENV=production` and ensure all environment variables are configured. The database file and media folder should be stored on persistent storage.

## Tips

- Organize photos into subfolders — each subfolder becomes an album
- Name a folder `highlights` for featured photos on the main page
- Videos are supported but thumbnails require `ffmpeg` to be installed
- Use the Admin page to reindex after adding new photos
