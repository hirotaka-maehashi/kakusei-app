'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import { Menu } from 'lucide-react'
import { ArrowRight } from 'lucide-react'

type Shot = {
  zone: string
  number: string
  result: string
  xg: string
  period: '前半' | '後半' | ''
}

type MatchRow = {
  id: string
  match_date: string
  opponent: string
  score_for: number
  score_against: number
  analysis_json: {
    shots: Shot[]
    opponentShots: Shot[]
  }
}

export default function AnalysisHistoryPage() {
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [teamName, setTeamName] = useState<string>('チーム名未設定')
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [role, setRole] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const menuRef = useRef<HTMLDivElement>(null)
  const [adminName, setAdminName] = useState<string | null>(null)

  const handleLogout = async () => {
  await supabase.auth.signOut()
  router.push('/login')
}

useEffect(() => {
  const fetchData = async () => {
    const playerId = localStorage.getItem('playerId')

    if (playerId) {
      // ✅ 選手（非認証）処理
      const { data: player } = await supabase
        .from('players')
        .select('team_id')
        .eq('id', playerId)
        .maybeSingle()

      if (player?.team_id) {
        setRole('player')
        setTeamName('自チームの試合')

        const { data } = await supabase
          .from('match_analyses')
          .select('id, match_date, opponent, score_for, score_against, analysis_json')
          .eq('team_id', player.team_id)
          .order('match_date', { ascending: false })

        if (data) setMatches(data)
      }

    } else {
      // ✅ 管理者 or コーチ（認証あり）処理
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData.session

      if (!session || !session.user) {
        console.warn('セッションなし → 表示しない')
        return
      }

      const user = session.user

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, name')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.role === 'admin') {
        setRole('admin')
        setAdminName(profile.name || '')
        setTeamName('全チーム')

        const { data } = await supabase
          .from('match_analyses')
          .select('id, match_date, opponent, score_for, score_against, analysis_json')
          .order('match_date', { ascending: false })

        if (data) setMatches(data)
        return
      }

      const { data: team } = await supabase
        .from('teams')
        .select('id, name')
        .eq('coach_user_id', user.id)
        .maybeSingle()

      if (team) {
        setRole('coach')
        setTeamName(team.name)

        const { data } = await supabase
          .from('match_analyses')
          .select('id, match_date, opponent, score_for, score_against, analysis_json')
          .eq('team_id', team.id)
          .order('match_date', { ascending: false })

        if (data) setMatches(data)
        return
      }
    }
  }

  fetchData()
}, [])

 // 年月で絞り込み
const filteredMatches = matches.filter(({ match_date }) => {
  const [year, month] = match_date.split('-')
  return (
    (selectedYear === 'all' || year === selectedYear) &&
    (selectedMonth === 'all' || month === selectedMonth)
  )
})

// 試合数と勝敗集計
const totalGames = filteredMatches.length
const winCount = filteredMatches.filter(m => m.score_for > m.score_against).length
const drawCount = filteredMatches.filter(m => m.score_for === m.score_against).length
const loseCount = filteredMatches.filter(m => m.score_for < m.score_against).length
const winRate = totalGames > 0 ? Math.round((winCount / totalGames) * 100) : 0

// 得点・被得点平均
const totalScoreFor = filteredMatches.reduce((sum, m) => sum + m.score_for, 0)
const totalScoreAgainst = filteredMatches.reduce((sum, m) => sum + m.score_against, 0)
const avgScoreFor = totalGames > 0 ? (totalScoreFor / totalGames).toFixed(2) : '0.00'
const avgScoreAgainst = totalGames > 0 ? (totalScoreAgainst / totalGames).toFixed(2) : '0.00'

// 平均シュート数・平均被シュート数
const totalShots = filteredMatches.reduce((sum, m) => sum + m.analysis_json.shots.length, 0)
const totalOpponentShots = filteredMatches.reduce((sum, m) => sum + m.analysis_json.opponentShots.length, 0)
const avgShots = totalGames > 0 ? (totalShots / totalGames).toFixed(2) : '0.00'
const avgOpponentShots = totalGames > 0 ? (totalOpponentShots / totalGames).toFixed(2) : '0.00'

// xG/xGA
const totalXg = filteredMatches.reduce(
  (sum, m) => sum + m.analysis_json.shots.reduce((s, x) => s + parseFloat(x.xg), 0),
  0
)
const totalXga = filteredMatches.reduce(
  (sum, m) => sum + m.analysis_json.opponentShots.reduce((s, x) => s + parseFloat(x.xg), 0),
  0
)
const avgXg = totalGames > 0 ? (totalXg / totalGames).toFixed(2) : '0.00'
const avgXga = totalGames > 0 ? (totalXga / totalGames).toFixed(2) : '0.00'

return (
  <>
<header className={styles.header}>
  <div className={styles.headerIcon}></div>

<h1 className={styles.headerTitle}>
  {adminName || teamName || 'チーム名未設定'}
</h1>

  <div className={styles.headerMenu}>
    <button onClick={() => setMenuOpen(!menuOpen)} className={styles.menuButton}>
      <Menu size={24} />
    </button>

    {menuOpen && (
      <div ref={menuRef} className={styles.dropdown}>
        <button onClick={() => router.push('/player/dashboard')}>ダッシュボード</button>
        <button onClick={() => router.push('/player/evaluation/view')}>選手データ詳細</button>
        <button onClick={() => router.push('/player/videos/list')}>試合動画一覧</button>
       <button onClick={() => { setMenuOpen(false); handleLogout() }}>ログアウト</button>
      </div>
    )}
  </div>
</header>

    <main className={styles.container}>
      <h2 className={styles.pageTitle}>試合履歴</h2>

<div className={styles.filterRow}>
  <label>年:</label>
  <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
    <option value="all">All</option>
    {Array.from(new Set(matches.map(m => m.match_date.slice(0, 4)))).map(year => (
      <option key={year} value={year}>{year}</option>
    ))}
  </select>

  <label>月:</label>
  <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
    <option value="all">All</option>
    {Array.from({ length: 12 }, (_, i) => {
      const month = (i + 1).toString().padStart(2, '0')
      return <option key={month} value={month}>{month}</option>
    })}
  </select>
</div>

   {/* ✅ 統計サマリー */}
<div className={styles.summary}>
  <div className={styles.statsRow}>
    <div className={styles.statsLabel}>試合数</div>
    <div>{totalGames} 試合</div>
  </div>
  <div className={styles.statsRow}>
    <div className={styles.statsLabel}>成績</div>
    <div>WIN {winCount} ／ DRAW {drawCount} ／ LOSE {loseCount}</div>
  </div>
  <div className={styles.statsRow}>
    <div className={styles.statsLabel}>勝率</div>
    <div><strong>{winRate}%</strong></div>
  </div>
  <div className={styles.statsRow}>
    <div className={styles.statsLabel}>平均得点</div>
    <div>{avgScoreFor}</div>
  </div>
  <div className={styles.statsRow}>
    <div className={styles.statsLabel}>平均失点</div>
    <div>{avgScoreAgainst}</div>
  </div>
  <div className={styles.statsRow}>
  <div className={styles.statsLabel}>平均シュート数</div>
  <div>{avgShots}</div>
</div>
<div className={styles.statsRow}>
  <div className={styles.statsLabel}>平均被シュート数</div>
  <div>{avgOpponentShots}</div>
</div>
  <div className={styles.statsRow}>
    <div className={styles.statsLabel}>平均xG</div>
    <div>{avgXg}</div>
  </div>
  <div className={styles.statsRow}>
    <div className={styles.statsLabel}>平均xGA</div>
    <div>{avgXga}</div>
  </div>
</div>


{filteredMatches.map(match => {
  const totalXg = match.analysis_json?.shots?.reduce((sum: number, s: Shot) => sum + parseFloat(s.xg || '0'), 0) || 0
  const totalXga = match.analysis_json?.opponentShots?.reduce((sum: number, s: Shot) => sum + parseFloat(s.xg || '0'), 0) || 0

  const result =
    match.score_for > match.score_against ? 'WIN'
    : match.score_for < match.score_against ? 'LOSE'
    : 'DRAW'

  return (
<div key={match.id} className={styles.matchCard}>
  <div className={styles.matchHeader}>
    <span className={styles.matchDate}>{match.match_date}</span>
    <span className={`${styles.matchResult} ${styles[result.toLowerCase()]}`}>{result}</span>
  </div>
  <div className={styles.matchBody}>
    <p className={styles.line}>対戦相手 : <span>{match.opponent}</span></p>
    <p className={styles.line}>試合結果 : <span>{match.score_for} - {match.score_against}</span></p>
    <p className={styles.line}>xG（攻撃）/ xGA（守備）: <span>{totalXg.toFixed(2)} / {totalXga.toFixed(2)}</span></p>

    <div className={styles.detailButtonArea}>
<button
  onClick={() => router.push(`/player/analysis/detail/${match.id}`)}
  className={styles.detailButton}
>
  詳細を見る <ArrowRight size={14} />
</button>
    </div>
  </div>
    </div>
  )
})}
    </main>
  </>
)
}
