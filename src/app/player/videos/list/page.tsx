'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './page.module.css'
import { Menu } from 'lucide-react'
import Image from 'next/image'

type Video = {
  id: string
  match_date: string
  opponent: string
  score_for: number
  score_against: number
  youtube_url: string
}

const extractYoutubeId = (url: string): string => {
  const regExp = /(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/
  const match = url.match(regExp)
  return match ? match[1] : ''
}

export default function PlayerVideoListPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchVideos = async () => {
      const playerId = localStorage.getItem('playerId')
      if (!playerId) {
        router.push('/player/login')
        return
      }

      const { data: player } = await supabase
        .from('players')
        .select('team_id')
        .eq('id', playerId)
        .maybeSingle()

      if (!player?.team_id) return

      const { data: videosData } = await supabase
        .from('videos')
        .select('*')
        .eq('team_id', player.team_id)
        .order('match_date', { ascending: false })

      setVideos(videosData || [])
    }

    fetchVideos()
  }, [router])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.headerTitle}>試合動画一覧</h1>
        </div>

        <div className={styles.headerMenu}>
          <button onClick={() => setMenuOpen(!menuOpen)} className={styles.menuButton}>
            <Menu size={24} />
          </button>

          {menuOpen && (
            <div ref={dropdownRef} className={styles.dropdown}>
              <button onClick={() => router.push('/player/dashboard')}>ダッシュボード</button>
              <button onClick={() => router.push('/player/evaluation/view')}>選手データ詳細</button>
              <button onClick={() => router.push('/player/analysis/history')}>試合履歴</button>
              <button
                onClick={() => {
                  localStorage.removeItem('playerId')
                  router.push('/player/login')
                }}
              >
                ログアウト
              </button>
            </div>
          )}
        </div>
      </header>

      <main className={styles.container}>
        {videos.length === 0 ? (
          <p className={styles.noData}>動画がまだ登録されていません。</p>
        ) : (
          <div className={styles.videoList}>
            {videos.map(video => (
              <div
                key={video.id}
                className={styles.videoCardCompact}
                onClick={() => router.push(`/player/videos/${video.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <Image
  src={`https://img.youtube.com/vi/${extractYoutubeId(video.youtube_url)}/mqdefault.jpg`}
  alt="video thumbnail"
  width={320}
  height={180}
/>
                <div className={styles.videoMeta}>
                  <p className={styles.videoDate}>{video.match_date}</p>
                  <p className={styles.videoTitle}>{video.opponent} 戦</p>
                  <p className={styles.videoScore}>スコア：{video.score_for} - {video.score_against}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
