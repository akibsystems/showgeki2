'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            AIシェイクスピアが勝手に作った、<br />あなたの未来5幕劇
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            AIがあなたの未来を壮大な5幕の劇として描き出します。<br />
            シェイクスピア風の格調高い動画で、あなたの運命をお楽しみください。
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/create"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-lg text-lg transition-colors shadow-lg"
            >
              未来の5幕劇を作成する
            </Link>
            <Link
              href="/watch"
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-4 px-8 rounded-lg text-lg transition-colors shadow-lg"
            >
              5幕劇を視聴する
            </Link>
          </div>
        </div>
        
        <div className="mt-20 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center p-6 bg-white rounded-lg shadow-md">
            <div className="text-3xl mb-4">✍️</div>
            <h3 className="text-xl font-semibold mb-2">未来を描く</h3>
            <p className="text-gray-600">あなたの願いや夢を自由に入力してください</p>
          </div>
          <div className="text-center p-6 bg-white rounded-lg shadow-md">
            <div className="text-3xl mb-4">🎭</div>
            <h3 className="text-xl font-semibold mb-2">AI劇場化</h3>
            <p className="text-gray-600">AIがシェイクスピア風の5幕劇として動画を作成します</p>
          </div>
          <div className="text-center p-6 bg-white rounded-lg shadow-md">
            <div className="text-3xl mb-4">🎬</div>
            <h3 className="text-xl font-semibold mb-2">視聴・ダウンロード</h3>
            <p className="text-gray-600">登録番号で劇動画を視聴・ダウンロードできます</p>
          </div>
        </div>
      </div>
    </div>
  );
}
