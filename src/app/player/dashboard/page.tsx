"use client"

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from '../dashboard/page.module.css' // 既存のスタイルを流用
import dayjs from 'dayjs'
import { Menu } from 'lucide-react'
import { useRef } from 'react'

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

type AnalysisJson = {
  teamHold?: {
    firstMin?: number
    firstSec?: number
    secondMin?: number
    secondSec?: number
  }
  opponentHold?: {
    firstMin?: number
    firstSec?: number
    secondMin?: number
    secondSec?: number
  }
}

type MatchAnalysis = {
  id: string
  match_date: string
  opponent: string
  score_for: number
  score_against: number
  location: string
  weather: string
  analysis_json: AnalysisJson
}

type Player = {
  id: string
  name: string
}

type Evaluation = {
  player_id: string
  recorded_at: string
  [key: string]: string | number | null
}

export default function PlayerDashboardPage() {
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [teamId, setTeamId] = useState<string | null>(null)
  const [player, setPlayer] = useState<Player | null>(null)
  const [latestMatch, setLatestMatch] = useState<MatchAnalysis | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [latestVideoUrl, setLatestVideoUrl] = useState<string | null>(null)
const [latestVideoId, setLatestVideoId] = useState<string | null>(null)

  const highIsBetter = useMemo(() => [
    'distance_km', 'sprint_total_m', 'sprint_count', 'sprint_avg_m',
    'max_speed_kmh', 'accelerations', 'yoyo_count',
    'long_jump_cm', 'side_step_count', 'vertical_jump_cm',
    'triple_jump_cm', 'step_50s_count', 'sit_ups_30s',
    'height_cm'
  ], [])

  const lowIsBetter = useMemo(() => [
    'sprint_20m_sec', 'sprint_50m_sec', 'bmi', 'body_fat_pct'
  ], [])

  const labelMap = useMemo<Record<string, string>>(() => ({
  distance_km: '走行距離(km)',
  sprint_total_m: 'スプリント総距離(m)',
  sprint_count: 'スプリント回数',
  sprint_avg_m: 'スプリント平均距離(m)',
  max_speed_kmh: '最大速度(km/h)',
  accelerations: '加速回数',
  sprint_20m_sec: '20m走(秒)',
  sprint_50m_sec: '50m走(秒)',
  yoyo_count: 'YoYo回数',
  long_jump_cm: '立ち幅跳び(cm)',
  side_step_count: '反復横跳び(回)',
  vertical_jump_cm: '垂直跳び(cm)',
  triple_jump_cm: '三段跳び(cm)',
  step_50s_count: 'ステップ50秒(回)',
  sit_ups_30s: 'シットアップ30秒(回)',
  height_cm: '身長(cm)',
  weight_kg: '体重(kg)',
  bmi: 'BMI',
  body_fat_pct: '体脂肪率(%)',
}), [])

const visibleKeys = [
  'distance_km', 'sprint_total_m', 'sprint_count', 'sprint_avg_m',
  'max_speed_kmh', 'accelerations', 'sprint_20m_sec', 'sprint_50m_sec',
  'yoyo_count', 'long_jump_cm', 'side_step_count', 'vertical_jump_cm',
  'triple_jump_cm', 'step_50s_count', 'sit_ups_30s',
  'pelvis_posture', 'leg_shape', 'foot_arch',
  'fingertip_floor_cm', 'heel_buttock_cm', 'thomas_test', 'slr_deg',
  'squat_form', 'shin_pain', 'heel_pain', 'pain_custom',
  'height_cm', 'weight_kg', 'bmi', 'body_fat_pct'
]

  const topPerformers = useMemo(() => {
    const nameMap = Object.fromEntries(players.map(p => [p.id, p.name]))
    const keys = [...highIsBetter, ...lowIsBetter]

    return keys.map((key, index) => {
      const valid = evaluations.filter(e => !isNaN(parseFloat(String(e[key] ?? ''))))
      const sorted = valid.sort((a, b) => {
        const aVal = parseFloat(String(a[key] ?? ''))
        const bVal = parseFloat(String(b[key] ?? ''))
        return highIsBetter.includes(key) ? bVal - aVal : aVal - bVal
      })
      const top = sorted[0]
      return {
        no: index + 1,
        key,
        label: labelMap[key] || key,
        value: top?.[key] ?? '-',
        name: nameMap[top?.player_id] ?? '不明'
      }
    })
  }, [evaluations, players, highIsBetter, lowIsBetter, labelMap])

  const myEvaluations = useMemo(() => {
  return evaluations.filter(e => e.player_id === player?.id)
}, [evaluations, player?.id])

const latestEval = useMemo(() => {
  return [...myEvaluations].sort((a, b) =>
    dayjs(b.recorded_at).unix() - dayjs(a.recorded_at).unix()
  )[0]
}, [myEvaluations])

const topPerformersDate = useMemo(() => {
  if (evaluations.length === 0) return null
  const dates = evaluations.map(e => e.recorded_at).filter(Boolean).map(d => dayjs(d))
  return dates.sort((a, b) => b.unix() - a.unix())[0]?.format('YYYY年M月D日')
}, [evaluations])

  useEffect(() => {
    const fetchData = async () => {
      const playerId = localStorage.getItem('playerId')
      if (!playerId) {
        router.push('/player/login')
        return
      }

      const { data: playerData } = await supabase
        .from('players')
        .select('id, name, team_id')
        .eq('id', playerId)
        .maybeSingle()

      if (!playerData) {
        router.push('/player/login')
        return
      }

      setPlayer({ id: playerData.id, name: playerData.name })
      setTeamId(playerData.team_id)

const { data: teamPlayers } = await supabase
  .from('players')
  .select('id, name')
  .eq('team_id', playerData.team_id)

const playerIds = (teamPlayers || []).map(p => p.id)  // ✅ 安全にnullチェック

setPlayers(teamPlayers || [])

const { data: evals } = await supabase
  .from('player_evaluations')
  .select('*')
  .in('player_id', playerIds)

setEvaluations(evals || [])

      const { data: matches } = await supabase
        .from('match_analyses')
        .select('*, analysis_json')
        .eq('team_id', playerData.team_id)
        .order('match_date', { ascending: false })
        .limit(1)

      setLatestMatch(matches?.[0] || null)
    }

    fetchData()
  }, [router])

const latestDate = useMemo(() => {
  if (myEvaluations.length === 0) return null
  const dates = myEvaluations.map(e => e.recorded_at).filter(Boolean).map(d => dayjs(d))
  return dates.sort((a, b) => b.unix() - a.unix())[0]?.format('YYYY年M月D日')
}, [myEvaluations])


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

useEffect(() => {
  const fetchLatestVideo = async () => {
    if (!teamId || !latestMatch) return

const { data, error } = await supabase
  .from('videos')
  .select('id, youtube_url, created_at')
  .eq('team_id', teamId)
  .eq('match_date', latestMatch.match_date)
  .order('created_at', { ascending: false }) // ✅ 追加
  .limit(1)                                   // ✅ 追加
  .maybeSingle()

    if (error) {
      console.warn('❌ 動画取得失敗:', error)
      return
    }

    if (data?.youtube_url) {
      setLatestVideoUrl(data.youtube_url)
      setLatestVideoId(data.id)
    }
  }

  fetchLatestVideo()
}, [teamId, latestMatch])

  return (
    <main className={styles.container}>
 <header className={styles.header}>
  <h1 className={styles.headerTitle}>{player?.name || '選手'} さん</h1>

  <div className={styles.headerMenu}>
    <button onClick={() => setMenuOpen(!menuOpen)} className={styles.menuButton}>
      <Menu size={24} />
    </button>

    {menuOpen && (
      <div ref={dropdownRef} className={styles.dropdown}>
        <button onClick={() => router.push('/player/evaluation/view')}>選手データ詳細</button>
        <button onClick={() => router.push('/player/analysis/history')}>試合履歴</button>
        <button onClick={() => router.push('/player/videos/list')}>試合動画一覧</button>
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

      {latestMatch ? (
  <section className={styles.card}>
    <h2 className={styles.sectionTitle}>直近の試合</h2>

    <div className={styles.infoBlock}>
      <div className={styles.infoRow}>
        <span className={styles.label}>日付</span>
        <span>{latestMatch.match_date}</span>
      </div>
      <div className={styles.infoRow}>
        <span className={styles.label}>対戦相手</span>
        <span>{latestMatch.opponent}</span>
      </div>
      <div className={styles.infoRow}>
        <span className={styles.label}>場所</span>
        <span>{latestMatch.location}</span>
      </div>
      <div className={styles.infoRow}>
        <span className={styles.label}>天候</span>
        <span>{latestMatch.weather}</span>
      </div>
      <div className={`${styles.infoRow} ${styles.scoreRow}`}>
        <span className={styles.label}>スコア</span>
        <span>{latestMatch.score_for} - {latestMatch.score_against}</span>
      </div>
    </div>

    {/* 支配率ブロック */}
    {latestMatch.analysis_json && (
      <div className={styles.possessionBlock}>
        <div className={styles.infoRow}>
          <span className={styles.label}>支配率（全体）</span>
          <span>
            {(() => {
              const team = ((latestMatch.analysis_json.teamHold?.firstMin ?? 0) + (latestMatch.analysis_json.teamHold?.secondMin ?? 0)) * 60
                + (latestMatch.analysis_json.teamHold?.firstSec ?? 0) + (latestMatch.analysis_json.teamHold?.secondSec ?? 0)
              const opp = ((latestMatch.analysis_json.opponentHold?.firstMin ?? 0) + (latestMatch.analysis_json.opponentHold?.secondMin ?? 0)) * 60
                + (latestMatch.analysis_json.opponentHold?.firstSec ?? 0) + (latestMatch.analysis_json.opponentHold?.secondSec ?? 0)
              return team + opp > 0 ? `自 ${Math.round((team / (team + opp)) * 100)}% ／ 相手 ${Math.round((opp / (team + opp)) * 100)}%` : '-'
            })()}
          </span>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.label}>前半</span>
          <span>
            自 {(() => {
              const team = (latestMatch.analysis_json.teamHold?.firstMin ?? 0) * 60 + (latestMatch.analysis_json.teamHold?.firstSec ?? 0)
              const opp = (latestMatch.analysis_json.opponentHold?.firstMin ?? 0) * 60 + (latestMatch.analysis_json.opponentHold?.firstSec ?? 0)
              return team + opp > 0 ? Math.round((team / (team + opp)) * 100) + '%' : '-'
            })()} ／ 相手 {(() => {
              const team = (latestMatch.analysis_json.teamHold?.firstMin ?? 0) * 60 + (latestMatch.analysis_json.teamHold?.firstSec ?? 0)
              const opp = (latestMatch.analysis_json.opponentHold?.firstMin ?? 0) * 60 + (latestMatch.analysis_json.opponentHold?.firstSec ?? 0)
              return team + opp > 0 ? Math.round((opp / (team + opp)) * 100) + '%' : '-'
            })()}
          </span>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.label}>後半</span>
          <span>
            自 {(() => {
              const team = (latestMatch.analysis_json.teamHold?.secondMin ?? 0) * 60 + (latestMatch.analysis_json.teamHold?.secondSec ?? 0)
              const opp = (latestMatch.analysis_json.opponentHold?.secondMin ?? 0) * 60 + (latestMatch.analysis_json.opponentHold?.secondSec ?? 0)
              return team + opp > 0 ? Math.round((team / (team + opp)) * 100) + '%' : '-'
            })()} ／ 相手 {(() => {
              const team = (latestMatch.analysis_json.teamHold?.secondMin ?? 0) * 60 + (latestMatch.analysis_json.teamHold?.secondSec ?? 0)
              const opp = (latestMatch.analysis_json.opponentHold?.secondMin ?? 0) * 60 + (latestMatch.analysis_json.opponentHold?.secondSec ?? 0)
              return team + opp > 0 ? Math.round((opp / (team + opp)) * 100) + '%' : '-'
            })()}
          </span>
        </div>
      </div>
    )}

    <div className={styles.buttonArea}>
<button
  className={styles.detailButton}
  onClick={() => router.push(`/player/analysis/detail/${latestMatch.id}`)}
>
  詳細を見る →
</button>
    </div>
  </section>
) : (
  <p>試合データがまだ登録されていません。</p>
)}

<div className={styles.videoSection}>
  <h3>直近の試合動画</h3>
  <div className={styles.videoWrapper}>
    {latestVideoUrl ? (
      <iframe
        width="100%"
        height="315"
        src={`https://www.youtube.com/embed/${extractYoutubeId(latestVideoUrl)}`}
        frameBorder="0"
        allowFullScreen
      />
    ) : (
      <p style={{ textAlign: 'center', color: '#777' }}>動画はまだ登録されていません。</p>
    )}
  </div>

  {latestVideoId && (
    <div className={styles.buttonArea}>
      <button
        className={styles.detailButton}
        onClick={() => router.push(`/player/videos/${latestVideoId}`)}
      >
        動画の詳細を見る →
      </button>
    </div>
  )}
</div>

<section>
<h2 className={styles.sectionTitle}>
  チーム内トップ選手
  {topPerformersDate && (
    <span className={styles.dateNote}>（{topPerformersDate}時点）</span>
  )}
</h2>

  <div className={styles.card}>
    <table className={styles.topTable}>
      <thead>
        <tr><th>No</th><th>項目</th><th>選手名</th><th>数値</th></tr>
      </thead>
      <tbody>
        {topPerformers.map(item => (
          <tr key={item.key}>
            <td>{item.no}</td>
            <td>{item.label}</td>
            <td>{item.name}</td>
            <td>{item.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</section>

<section>
  <h2 className={styles.sectionTitle}>自分の最新評価（{latestDate || '未取得'}時点）</h2>
  <div className={styles.card}>
    <div className={styles.tableWrapper}>
      <table className={styles.playerTable}>
        <tbody>
          {visibleKeys.map((key) => (
            <tr key={key}>
              <td>{labelMap[key] || key}</td>
              <td>{String(latestEval?.[key] ?? '-')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
</section>
    </main>
  )
}
