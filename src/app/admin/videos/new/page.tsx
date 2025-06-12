'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './page.module.css'
import { Menu } from 'lucide-react'

export default function VideoNewPage() {
  const router = useRouter()

  const [matchDate, setMatchDate] = useState('')
  const [opponent, setOpponent] = useState('')
  const [scoreFor, setScoreFor] = useState('')
  const [scoreAgainst, setScoreAgainst] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  if (!matchDate || !opponent || !scoreFor || !scoreAgainst || !youtubeUrl) {
    setErrorMessage('すべての項目を入力してください。')
    return
  }

  const teamId = localStorage.getItem('selectedTeamId')
  if (!teamId) {
    setErrorMessage('チームIDが取得できません。')
    return
  }

  setLoading(true)

  const { error } = await supabase.from('videos').insert({
    match_date: matchDate,
    opponent,
    score_for: Number(scoreFor),
    score_against: Number(scoreAgainst),
    youtube_url: youtubeUrl,
    team_id: teamId, // ✅ ← ここを追加
  })

  if (error) {
    setErrorMessage('登録に失敗しました。')
    setLoading(false)
  } else {
    router.push('/admin/videos/list')
  }
}

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.siteTitle}>試合動画登録</span>
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
        <form className={styles.form} onSubmit={handleSubmit}>
          <label>
            試合日
            <input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)} required />
          </label>

          <label>
            対戦相手
            <input type="text" value={opponent} onChange={e => setOpponent(e.target.value)} required />
          </label>

          <label>
            自チームの得点
            <input type="number" value={scoreFor} onChange={e => setScoreFor(e.target.value)} required />
          </label>

          <label>
            相手チームの得点
            <input type="number" value={scoreAgainst} onChange={e => setScoreAgainst(e.target.value)} required />
          </label>

          <label>
            YouTube動画URL
            <input type="url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} required />
          </label>

          {errorMessage && <p className={styles.error}>{errorMessage}</p>}

          <button type="submit" disabled={loading} className={styles.submitButton}>
            {loading ? '登録中...' : '登録する'}
          </button>
        </form>
      </main>
    </>
  )
}
