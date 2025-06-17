'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './page.module.css'
import { Menu } from 'lucide-react'

type Video = {
  id: string
  match_date: string
  opponent: string
  score_for: number
  score_against: number
  youtube_url: string
  team_id: string
}

const extractYoutubeId = (url: string): string => {
  try {
    if (url.includes('youtube.com/watch?v=')) {
      return url.split('v=')[1].split('&')[0]
    } else if (url.includes('youtu.be/')) {
      return url.split('youtu.be/')[1].split('?')[0]
    }
  } catch {
    return ''
  }
  return ''
}

const fetchYoutubeDescription = async (videoId: string): Promise<string> => {
  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY
  console.log('🧪 APIキー:', apiKey) // ← 追加

  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`
  const res = await fetch(url)
  const data = await res.json()

  return data?.items?.[0]?.snippet?.description || ''
}

export default function VideoDetailPage() {
  const {videoId } = useParams()
  const playerRef = useRef<YT.Player | null>(null)
  const router = useRouter()
  const [video, setVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [description, setDescription] = useState('')
  const [apiReady, setApiReady] = useState(false)
  const [, setIsPlayerReady] = useState(false)

useEffect(() => {
  const loadDescription = async () => {
    if (video) {
      const embedId = extractYoutubeId(video.youtube_url)
      console.log('🎥 動画ID:', embedId) // ← 追加①

      const desc = await fetchYoutubeDescription(embedId)
      console.log('📝 概要欄:', desc) // ← 追加②

      setDescription(desc)
    }
  }

  loadDescription()
}, [video])

useEffect(() => {
  // すでに読み込まれている場合は即 ready
  if (window.YT && typeof window.YT.Player === 'function') {
    setApiReady(true)
    return
  }

  // 初回読み込み処理
  const tag = document.createElement('script')
  tag.src = 'https://www.youtube.com/iframe_api'
  document.body.appendChild(tag)

  window.onYouTubeIframeAPIReady = () => {
    setApiReady(true)
  }

  return () => {
    window.onYouTubeIframeAPIReady = () => {}
  }
}, [])

useEffect(() => {
  if (!video || !apiReady) return

  playerRef.current = new window.YT.Player('player', {
  videoId: extractYoutubeId(video.youtube_url),
  events: {
    onReady: () => {
  console.log('✅ YouTube Player Ready')
  setIsPlayerReady(true)
}
  }
})
}, [video, apiReady])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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

  useEffect(() => {
    const fetchVideo = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id')
        .or(`coach_user_id.eq.${user.id},trainer_id.eq.${user.id}`)
        .maybeSingle()

      if (teamError || !team) {
        setError('チーム情報が取得できません')
        return
      }

      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .maybeSingle()

      if (videoError || !videoData) {
        setError('動画が見つかりません')
        return
      }

      if (videoData.team_id !== team.id) {
        setError('この動画にはアクセスできません')
        return
      }

      setVideo(videoData)
      setLoading(false)
    }

    if (videoId) {
      fetchVideo()
    }
  }, [videoId, router])

  if (loading) return <p style={{ padding: '2rem' }}>読み込み中...</p>
  if (error) return <p style={{ color: 'red', padding: '2rem' }}>{error}</p>
  if (!video) return null

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.siteTitle}>試合詳細</span>
        </div>

        <div className={styles.headerRight}>
          <button onClick={() => setMenuOpen(!menuOpen)} className={styles.menuButton}>
            <Menu size={20} />
          </button>

          {menuOpen && (
            <div ref={menuRef} className={styles.dropdown}>
              <button onClick={() => { setMenuOpen(false); router.push('/dashboard') }}>ダッシュボード</button>
              <button onClick={() => router.push('/admin/players/list')}>選手一覧</button>
              <button onClick={() => router.push('/admin/videos/list')}>試合動画一覧</button>
              <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}>ログアウト</button>
            </div>
          )}
        </div>
      </header>

      <main className={styles.container}>
        <h2 className={styles.pageTitle}>試合詳細</h2>

        <div className={styles.infoBlock}>
          <p><strong>試合日:</strong> {video.match_date}</p>
          <p><strong>対戦相手:</strong> {video.opponent}</p>
          <p><strong>スコア:</strong> {video.score_for} - {video.score_against}</p>
        </div>

<div className={styles.videoHighlightWrapper}>
  <div className={styles.videoWrapper}>
    <div id="player"></div>
  </div>

  <div className={styles.highlightBox}>
    <h3>試合ハイライト</h3>
    <ul style={{ paddingLeft: 0, margin: 0 }}>
      {description.split('\n').map((line, i) => {
        if (line.trim() === '') return null // 空行はスキップ

        const match = line.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s?(.*)/)
        if (match) {
          const [, time, title] = match
          const timeParts = time.split(':').map(Number)
          let seconds = 0
          if (timeParts.length === 3) {
            const [h, m, s] = timeParts
            seconds = h * 3600 + m * 60 + s
          } else if (timeParts.length === 2) {
            const [m, s] = timeParts
            seconds = m * 60 + s
          }

          return (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <span style={{ marginRight: '0.5em' }}>・</span>
              <button
                onClick={() => {
                  if (playerRef.current) {
                    playerRef.current.seekTo(seconds, true)
                    playerRef.current.playVideo()
                  }
                }}
                style={{
                  color: '#0645AD',
                  textDecoration: 'underline',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '1rem',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  textAlign: 'left',
                }}
              >
                {time} {title}
              </button>
            </li>
          )
        } else {
          return (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <span style={{ marginRight: '0.5em' }}>・</span>
              <span
                style={{
                  fontSize: '1rem',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                }}
              >
                {line}
              </span>
            </li>
          )
        }
      })}
    </ul>
  </div>
</div>
      </main>
    </>
  )
}
