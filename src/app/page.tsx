'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 sm:py-16">
        <div className="text-center">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
            AIシェイクスピアが勝手に作った、<br className="hidden sm:block" />
            <span className="block sm:inline">あなたの未来5幕劇</span>
          </h1>
          <p className="text-base sm:text-xl text-gray-600 mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed px-2">
            AIがあなたの未来を壮大な5幕の劇として描き出します。<br className="hidden sm:block" />
            <span className="block sm:inline">シェイクスピア風の格調高い動画で、あなたの運命をお楽しみください。</span>
          </p>
          
          <div className="flex flex-col gap-3 sm:gap-4 justify-center max-w-sm sm:max-w-none mx-auto">
            <Link
              href="/create"
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-4 px-6 sm:px-8 rounded-lg text-base sm:text-lg transition-colors shadow-lg touch-manipulation"
            >
              未来の5幕劇を作成する
            </Link>
            <Link
              href="/watch"
              className="bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white font-semibold py-4 px-6 sm:px-8 rounded-lg text-base sm:text-lg transition-colors shadow-lg touch-manipulation"
            >
              5幕劇を視聴する
            </Link>
          </div>
        </div>
        
        <div className="mt-12 sm:mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-4xl mx-auto">
          <div className="text-center p-4 sm:p-6 bg-white rounded-lg shadow-md">
            <div className="text-2xl sm:text-3xl mb-3 sm:mb-4">✍️</div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">未来を描く</h3>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">あなたの願いや夢を自由に入力してください</p>
          </div>
          <div className="text-center p-4 sm:p-6 bg-white rounded-lg shadow-md">
            <div className="text-2xl sm:text-3xl mb-3 sm:mb-4">🎭</div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">AI劇場化</h3>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">AIがシェイクスピア風の5幕劇として動画を作成します</p>
          </div>
          <div className="text-center p-4 sm:p-6 bg-white rounded-lg shadow-md">
            <div className="text-2xl sm:text-3xl mb-3 sm:mb-4">🎬</div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">視聴・ダウンロード</h3>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">登録番号で劇動画を視聴・ダウンロードできます</p>
          </div>
        </div>
      </div>
    </div>
  );
}
