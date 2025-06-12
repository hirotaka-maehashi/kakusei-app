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

export default function VideoListPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const handleDelete = async (videoId: string) => {
    const confirmDelete = window.confirm('この動画を削除してもよろしいですか？')
    if (!confirmDelete) return

    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId)

    if (error) {
      alert('削除に失敗しました')
      console.error('❌ Supabase削除エラー:', error)
    } else {
      alert('削除しました')
      setVideos(prev => prev.filter(v => v.id !== videoId))
    }
  }

  useEffect(() => {
  const fetchVideos = async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (!user || authError) {
      router.push('/login')
      return
    }

    // 自分が紐づいているチームを取得（承認チェックなど一切なし）
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('coach_user_id', user.id)
      .maybeSingle()

    if (!team || teamError) {
      console.warn('❌ 該当チームが見つかりません')
      return
    }

    // チームIDに紐づく動画を取得
    const { data: videosData, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('team_id', team.id)
      .order('match_date', { ascending: false })

    if (videoError) {
      console.error('❌ 動画取得エラー:', videoError)
      return
    }

    setVideos(videosData || [])
  }

  fetchVideos()
}, [router])

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

 return (
  <>
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <span className={styles.siteTitle}>試合動画一覧</span>
      </div>

      <div className={styles.headerRight}>
        <button onClick={() => setMenuOpen(!menuOpen)} className={styles.menuButton}>
          <Menu size={20} />
        </button>

        {menuOpen && (
          <div ref={menuRef} className={styles.dropdown}>
            <button onClick={() => { setMenuOpen(false); router.push('/dashboard') }}>ダッシュボード</button>
            <button onClick={() => router.push('/admin/players/list')}>選手一覧</button>
            <button onClick={() => router.push('/evaluation/input')}>選手データ入力</button>
            <button onClick={() => router.push('/evaluation/view')}>選手データ表示</button>
            <button onClick={() => router.push('/analysis/input')}>試合分析入力</button>
            <button onClick={() => router.push('/analysis/history')}>試合履歴</button>
            <button onClick={() => router.push('/admin/videos/list')}>試合動画一覧</button>
            <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}>ログアウト</button>
          </div>
        )}
      </div>
    </header>

    <main className={styles.container}>
      <div className={styles.pageHeader}>
        <button className={styles.newButton} onClick={() => router.push('/admin/videos/new')}>
          ＋ 新規動画登録
        </button>
      </div>

      {videos.length === 0 ? (
        <p>動画がまだ登録されていません。</p>
      ) : (
        <div className={styles.videoList}>
{videos.map((video) => (
  <div
    key={video.id}
    className={styles.videoCardCompact}
  >
    {/* サムネ・情報クリックで遷移 */}
    <div onClick={() => router.push(`/admin/videos/${video.id}`)} style={{ cursor: 'pointer' }}>
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

    {/* ✅ 削除ボタン */}
    <button
      onClick={(e) => {
        e.stopPropagation() // 🔑 これでカードクリックの伝播を防止
        handleDelete(video.id)
      }}
      className={styles.deleteButton}
      style={{
        marginTop: '0.5rem',
        background: '#f44336',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        padding: '0.3rem 0.6rem',
        cursor: 'pointer',
      }}
    >
      削除
    </button>
  </div>
))}
        </div>
      )}
    </main>
  </>
)
}
