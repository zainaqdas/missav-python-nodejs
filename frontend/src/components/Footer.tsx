export default function Footer() {
  return (
    <footer className="border-t border-primary-900/20 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-600">
            missAV Explorer &mdash; Unofficial frontend
          </p>
          <p className="text-xs text-gray-700">
            This is a demonstration project. Not affiliated with missav.ws.
          </p>
        </div>
      </div>
    </footer>
  );
}
