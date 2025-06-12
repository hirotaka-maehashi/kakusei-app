'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import styles from './page.module.css'
import { Menu } from 'lucide-react'
import dayjs from 'dayjs'

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

// ✅ typeはすべてここ（関数の外）にまとめる
type MatchAnalysis = {
  id: string
  match_date: string
  opponent: string
  score_for: number
  score_against: number
  location: string
  weather: string
  analysis_json: {
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
    // 他に含まれる可能性がある要素（例: shots）もここに追加可
  }
}

type Player = {
  id: string
  name: string
  uniform_number: number | null
  position: string | null
  birth_date: string | null
}

type Evaluation = {
  player_id: string
  recorded_at: string
  [key: string]: string | number | null
}

type Team = {
  id: string
  name: string
}

const calculateAge = (birthDate: string): number => {
  return dayjs().diff(dayjs(birthDate), 'year')
}

export default function DashboardPage() {
  const [role, setRole] = useState<string | null>(null)
  const [teamName, setTeamName] = useState<string | null>(null)
  const [adminName, setAdminName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)
  const [latestMatch, setLatestMatch] = useState<MatchAnalysis | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [playerEvaluations, setPlayerEvaluations] = useState<Evaluation[]>([])
  const [teamList, setTeamList] = useState<Team[]>([])
  const [latestVideoUrl, setLatestVideoUrl] = useState<string | null>(null)
  const [latestVideoId, setLatestVideoId] = useState<string | null>(null)

  const handleLogout = async () => {
    await supabase.auth.signOut()

    if (role === 'admin') {
      router.push('/login')
    } else if (role === 'coach') {
      router.push('/team/login')
    } else {
      router.push('/login')
    }
  }

  const latestDate = useMemo(() => {
    if (playerEvaluations.length === 0) return null

    const dates = playerEvaluations
      .map(e => e.recorded_at)
      .filter(Boolean)
      .map(d => dayjs(d))

    const latest = dates.sort((a, b) => b.unix() - a.unix())[0]
    return latest?.format('YYYY年M月D日')
  }, [playerEvaluations])

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

const labelMap = useMemo(() => ({
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

  const topPerformers = useMemo(() => {
    const nameMap = Object.fromEntries(players.map(p => [p.id, p.name]))
    const keys = [...highIsBetter, ...lowIsBetter]

    return keys.map((key, index) => {
      const valid = playerEvaluations.filter(e => !isNaN(parseFloat(String(e[key] ?? ''))))
      const sorted = valid.sort((a, b) => {
      const aVal = parseFloat(String(a[key] ?? ''))
      const bVal = parseFloat(String(b[key] ?? ''))

        return highIsBetter.includes(key)
          ? bVal - aVal
          : aVal - bVal
      })

      const top = sorted[0]
      return {
        no: index + 1,
        key,
        label: (labelMap as Record<string, string>)[key] || key,
        value: top?.[key] ?? '-',
        name: nameMap[top?.player_id] ?? '不明'
      }
    })
  }, [playerEvaluations, players, highIsBetter, lowIsBetter, labelMap])

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
  const fetchPlayers = async (teamId: string) => {
    const { data, error } = await supabase
      .from('players')
      .select('id, name, uniform_number, position, birth_date') // ✅ カラム追加
      .eq('team_id', teamId)

    if (!error && data) {
      setPlayers(data)
      console.log('📦 players:', data)
    } else {
      console.warn('⚠️ players取得失敗:', error)
    }
  }

  if (teamId) {
    console.log('🧪 teamId:', teamId)
    fetchPlayers(teamId)
  }
}, [teamId])

useEffect(() => {
  const fetchDashboardData = async () => {
    const playerId = typeof window !== 'undefined' ? localStorage.getItem('playerId') : null
    console.log('🧪 playerId (from localStorage):', playerId)

    const { data: { user }, error } = await supabase.auth.getUser()
    console.log('🧪 Supabase auth.getUser:', user)

    // ✅ 認証もplayerIdもない → 強制リダイレクト
    if (!playerId && (error || !user)) {
      console.warn('❌ 認証なし: user も playerId も存在しない → /login にリダイレクト')
      router.push('/player/login')
      return
    }

    let matched = false

    // ✅ 管理者チェック
    if (user) {
      const { data: profile,} = await supabase
        .from('user_profiles')
        .select('role, name, last_selected_team_id')
        .eq('id', user.id)
        .maybeSingle()

      console.log('🧾 user_profiles:', profile)

      if (profile?.role === 'admin') {
        console.log('✅ 管理者としてログイン')
        setRole('admin')
        setAdminName(profile.name || null)
        matched = true

        const { data: teams, error: teamError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('trainer_id', user.id)

        if (teams) {
          setTeamList(teams)
          if (profile.last_selected_team_id) {
            setTeamId(profile.last_selected_team_id)
          }
        } else {
          console.warn('⚠️ チーム一覧取得失敗:', teamError)
        }
        setLoading(false)
        return 
      }

      // ✅ コーチチェック
      const { data: team,} = await supabase
        .from('teams')
        .select('id, name')
        .eq('coach_user_id', user.id)
        .maybeSingle()

      if (team?.id && team?.name) {
        console.log('✅ コーチとしてログイン:', team.name)
        setRole('coach')
        setTeamName(team.name)
        setTeamId(team.id)
        matched = true

        const { data: recentList, error: matchError } = await supabase
          .from('match_analyses')
          .select('*, analysis_json')
          .eq('coach_user_id', user.id)
          .order('match_date', { ascending: false })
          .limit(1)

        if (recentList && recentList.length > 0) {
          setLatestMatch(recentList[0])
        } else if (matchError) {
          console.warn('⚠️ コーチの試合データ取得失敗:', matchError)
        }
        setLoading(false)
        return // ✅ コーチはここで終了
      }
    }

    // ✅ 選手チェック（userがいなくてもplayerIdがあれば通す）
if (playerId && !matched) {
  console.log('✅ 選手としてログイン (playerId):', playerId)
  setRole('player')
  setTeamName('自チームの試合')
  matched = true

  // ✅ 選手の team_id を Supabase から取得
  const { data: playerData, error: playerError } = await supabase
    .from('players')
    .select('id, name, team_id') 
    .eq('id', playerId)
    .maybeSingle()

  if (playerError) {
    console.warn('❌ players テーブル取得エラー:', playerError)
  }

  if (playerData?.team_id) {
    console.log('✅ 選手の team_id:', playerData.team_id)
    setTeamId(playerData.team_id)

   // ✅ ここで自分自身だけを players に設定（これが差し込みポイント）
    setPlayers([{
      id: playerData.id,
      name: playerData.name,
      uniform_number: null,
      position: null,
      birth_date: null,
    }]) 
  } else {
    console.warn('❌ 選手の team_id が取得できませんでした')
  }
   setLoading(false)
   return // ✅ 選手はここで終了
}

// ❌ どのロールにも該当しない場合はリダイレクト
// すべてのロールに該当しなかった場合（安全対策）
    router.push('/player/login')
  }

  fetchDashboardData()
}, [router])


useEffect(() => {
  const fetchLatestMatchByTeam = async () => {
    if (!teamId) return

    const { data, error } = await supabase
      .from('match_analyses')
      .select('*, analysis_json')
      .eq('team_id', teamId)
      .order('match_date', { ascending: false })
      .limit(1)

    if (!error && data && data.length > 0) {
      setLatestMatch(data[0])
    } else {
      console.warn('⚠️ 試合データ取得失敗:', error)
      setLatestMatch(null)
    }
  }

  fetchLatestMatchByTeam()
}, [teamId])

useEffect(() => {
  if (role === 'admin' && !teamId) {
    setLatestMatch(null)
    setPlayers([])
    setPlayerEvaluations([])
  }
}, [role, teamId])


 useEffect(() => {
  const fetchEvaluations = async () => {
    if (!teamId || (!players.length && role !== 'player')) return

    let evaluations = null
    let error = null

    if (role === 'player') {
      const playerId = typeof window !== 'undefined' ? localStorage.getItem('playerId') : null

      if (!playerId) {
        console.warn('❌ playerId が取得できません')
        return
      }

      const res = await supabase
        .from('player_evaluations')
        .select('*')
        .eq('player_id', playerId)

      evaluations = res.data
      error = res.error
    } else {
      const playerIds = players.map(p => p.id)

      const res = await supabase
        .from('player_evaluations')
        .select('*')
        .in('player_id', playerIds)

      evaluations = res.data
      error = res.error
    }

    if (!error && evaluations) {
      setPlayerEvaluations(evaluations)
      console.log('✅ 評価データ:', evaluations)
    } else {
      console.warn('⚠️ 評価データ取得失敗:', error)
    }
  }

  fetchEvaluations()
}, [teamId, players, role])

// 修正済みの useEffect
useEffect(() => {
  const fetchLatestVideo = async () => {
    if (!teamId || !latestMatch) return

    const { data, error } = await supabase
      .from('videos')
      .select('id, youtube_url')
      .eq('team_id', teamId)
      .eq('match_date', latestMatch.match_date)
      .maybeSingle()

    if (error) {
      console.warn('❌ 試合動画の取得に失敗:', error)
    }

    if (data?.youtube_url) {
      setLatestVideoUrl(data.youtube_url)
      setLatestVideoId(data.id) // ✅ IDも保存
    }
  }

  fetchLatestVideo()
}, [teamId, latestMatch])

  if (loading) return <p style={{ padding: '2rem' }}>読み込み中...</p>

  console.log('🕒 最新評価日:', latestDate)
  console.log('📦 playerEvaluations:', playerEvaluations)

  
return (
  <>
<header className={styles.header}>
  <div className={styles.headerLeft}>
    <span className={styles.siteTitle}>
      {role === 'admin' && adminName}
      {role === 'coach' && teamName}
    </span>
  </div>

  <div className={styles.headerRight}>
    <span className={styles.roleLabel}>
      {role === 'admin' ? '管理者' : role === 'coach' ? 'コーチ' : role === 'player' ? '選手' : '不明'}
    </span>

    <button onClick={() => setMenuOpen(!menuOpen)} className={styles.menuButton}>
      <Menu size={20} />
    </button>

    {menuOpen && (
      <div ref={menuRef} className={styles.dropdown}>
        <button onClick={() => { setMenuOpen(false); router.push('/admin/players/list') }}>選手一覧</button>
        <button onClick={() => router.push('/evaluation/input')}>選手データ入力</button>
        <button onClick={() => router.push('/evaluation/view')}>選手データ表示</button>
        <button onClick={() => { setMenuOpen(false); router.push('/analysis/input') }}>試合分析入力</button>
        <button onClick={() => { setMenuOpen(false); router.push('/analysis/history') }}>試合履歴</button>
        <button onClick={() => router.push('/admin/videos/list')}>試合動画一覧</button> 
        <button onClick={() => { setMenuOpen(false); handleLogout() }}>ログアウト</button>
      </div>
    )}
  </div>
</header>


{role === 'admin' && teamList.length > 0 && (
  <div className={styles.teamSelector}>
    <label>チームを選択：</label>
 <select
  value={teamId || ''}
  onChange={async (e) => {
    const selectedId = e.target.value
    setTeamId(selectedId)

    localStorage.setItem('selectedTeamId', selectedId)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.warn('ユーザー取得失敗:', userError)
      return
    }

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ last_selected_team_id: selectedId })
      .eq('id', user.id)

    if (updateError) {
      console.warn('チームIDの保存に失敗:', updateError)
    } else {
      console.log('✅ チームIDを保存しました:', selectedId)
    }
  }}
>
  <option value="">選択してください</option>
  {teamList.map(team => (
    <option key={team.id} value={team.id}>
      {team.name}
    </option>
  ))}
</select>
  </div>
)}

<main className={styles.container}>
  <h2 className={styles.pageTitle}>直近の試合</h2>

  {latestMatch ? (
    <div className={styles.card}>
      {/* 基本情報ブロック */}
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
                  + (latestMatch.analysis_json.teamHold?.firstSec ?? 0) + (latestMatch.analysis_json.teamHold?.secondSec ?? 0);
                const opp = ((latestMatch.analysis_json.opponentHold?.firstMin ?? 0) + (latestMatch.analysis_json.opponentHold?.secondMin ?? 0)) * 60
                  + (latestMatch.analysis_json.opponentHold?.firstSec ?? 0) + (latestMatch.analysis_json.opponentHold?.secondSec ?? 0);
                return team + opp > 0 ? `自 ${Math.round((team / (team + opp)) * 100)}% ／ 相手 ${Math.round((opp / (team + opp)) * 100)}%` : '-';
              })()}
            </span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.label}>前半</span>
            <span>
              自 {(() => {
                const team = (latestMatch.analysis_json.teamHold?.firstMin ?? 0) * 60 + (latestMatch.analysis_json.teamHold?.firstSec ?? 0);
                const opp = (latestMatch.analysis_json.opponentHold?.firstMin ?? 0) * 60 + (latestMatch.analysis_json.opponentHold?.firstSec ?? 0);
                return team + opp > 0 ? Math.round((team / (team + opp)) * 100) + '%' : '-';
              })()} ／ 相手 {(() => {
                const team = (latestMatch.analysis_json.teamHold?.firstMin ?? 0) * 60 + (latestMatch.analysis_json.teamHold?.firstSec ?? 0);
                const opp = (latestMatch.analysis_json.opponentHold?.firstMin ?? 0) * 60 + (latestMatch.analysis_json.opponentHold?.firstSec ?? 0);
                return team + opp > 0 ? Math.round((opp / (team + opp)) * 100) + '%' : '-';
              })()}
            </span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.label}>後半</span>
            <span>
              自 {(() => {
                const team = (latestMatch.analysis_json.teamHold?.secondMin ?? 0) * 60 + (latestMatch.analysis_json.teamHold?.secondSec ?? 0);
                const opp = (latestMatch.analysis_json.opponentHold?.secondMin ?? 0) * 60 + (latestMatch.analysis_json.opponentHold?.secondSec ?? 0);
                return team + opp > 0 ? Math.round((team / (team + opp)) * 100) + '%' : '-';
              })()} ／ 相手 {(() => {
                const team = (latestMatch.analysis_json.teamHold?.secondMin ?? 0) * 60 + (latestMatch.analysis_json.teamHold?.secondSec ?? 0);
                const opp = (latestMatch.analysis_json.opponentHold?.secondMin ?? 0) * 60 + (latestMatch.analysis_json.opponentHold?.secondSec ?? 0);
                return team + opp > 0 ? Math.round((opp / (team + opp)) * 100) + '%' : '-';
              })()}
            </span>
          </div>
        </div>
      )}

      {/* 詳細ボタン */}
      <div className={styles.buttonArea}>
        <button
          className={styles.detailButton}
          onClick={() => router.push(`/analysis/detail/${latestMatch.id}`)}
        >
          詳細を見る →
        </button>
      </div>
    </div>
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

  {/* ✅ ボタンを条件付きで表示 */}
  {latestVideoId && (
    <div className={styles.buttonArea}>
      <button
        className={styles.detailButton}
        onClick={() => router.push(`/admin/videos/${latestVideoId}`)}
      >
        動画の詳細を見る →
      </button>
    </div>
  )}
</div>

<h2 className={styles.sectionTitle}>チーム内トップ選手{latestDate && (<span style={{ fontSize: '0.9rem', fontWeight: 'normal', marginLeft: '0.5rem' }}>（{latestDate}時点）</span>)}</h2>
<table className={styles.topTable}>
  <thead>
    <tr>
      <th>No</th>
      <th>項目</th>
      <th>選手名</th>
      <th>数値</th>
    </tr>
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

{/* 選手一覧セクション */}
{role !== 'player' && (
  <section className={styles.playerSection}>
    <div className={styles.sectionHeader}>
      <h2 className={styles.pageTitle}>登録選手一覧</h2>
      <button className={styles.newPlayerButton} onClick={() => router.push('/admin/players/new')}>
        ＋ 新規選手登録
      </button>
    </div>

    <table className={styles.table}>
      <thead>
        <tr>
          <th>氏名</th>
          <th>背番号</th>
          <th>ポジション</th>
          <th>年齢</th>
        </tr>
      </thead>
      <tbody>
        {players.length > 0 ? (
          [...players]
            .sort((a, b) => {
              const positionOrder: Record<'GK' | 'DF' | 'MF' | 'FW', number> = {
                GK: 1,
                DF: 2,
                MF: 3,
                FW: 4
              }

              const posA = positionOrder[a.position as 'GK' | 'DF' | 'MF' | 'FW'] ?? 99
              const posB = positionOrder[b.position as 'GK' | 'DF' | 'MF' | 'FW'] ?? 99

              if (posA !== posB) return posA - posB

              const numA = a.uniform_number ?? 999
              const numB = b.uniform_number ?? 999

              return numA - numB
            })
            .map(player => (
              <tr key={player.id}>
                <td>{player.name}</td>
                <td>{player.uniform_number}</td>
                <td>{player.position}</td>
                <td>{player.birth_date ? calculateAge(player.birth_date) : '-'}</td>
              </tr>
            ))
        ) : (
          <tr>
            <td colSpan={4}>選手データがまだありません。</td>
          </tr>
        )}
      </tbody>
    </table>
  </section>
)}
</main>
  </>
)
}