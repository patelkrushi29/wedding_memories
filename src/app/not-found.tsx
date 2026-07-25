import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mono">Not here</div>
        <h1 className="display mt-4 text-[28px]">
          Nothing at <em>this address</em>
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-ash">
          The page may have been renamed, or the link is older than the gallery.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex h-[50px] w-full items-center justify-center rounded-card bg-paper text-[15px] font-semibold text-ink"
        >
          Back to the days
        </Link>
      </div>
    </div>
  );
}
