'use client'

import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './page.module.css'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

type Shot = {
  zone: string
  number: string
  result: string
  xg: string
  period: '前半' | '後半' | ''
  minute: string
}


type Hold = {
  firstMin: number
  firstSec: number
  secondMin: number
  secondSec: number
}

type MatchAnalysis = {
  id: string
  opponent: string
  match_date: string
  location: string
  weather: string
  score_for: number
  score_against: number
  analysis_json: {
    shots: Shot[]
    opponentShots: Shot[]
    teamHold: Hold
    opponentHold: Hold
    periodTime?: {
      firstHalf: number
      secondHalf: number
    }
  }
}

const thStyle = {
  padding: '8px',
  background: '#f0f0f0',
  fontWeight: 'bold',
  textAlign: 'center' as const,
}

const tdStyle = {
  padding: '8px',
  textAlign: 'center' as const,
}


export default function MatchDetailPage() {
  const { id } = useParams()
  const [match, setMatch] = useState<MatchAnalysis | null>(null)
  const router = useRouter()
  const [editingShotIndex, setEditingShotIndex] = useState<number | null>(null)
  const [editShot, setEditShot] = useState<Shot | null>(null)
  const [editingOpponentIndex, setEditingOpponentIndex] = useState<number | null>(null)
  const [editOpponentShot, setEditOpponentShot] = useState<Shot | null>(null)
  

  useEffect(() => {
    const fetchMatch = async () => {
      const { data, error } = await supabase
        .from('match_analyses')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (!error && data) {
        setMatch(data)
      } else {
        console.error('❌ 試合データ取得失敗:', error)
      }
    }

    if (id) fetchMatch()
  }, [id])

  if (!match) return <main className={styles.container}>読み込み中...</main>

  const { shots = [], opponentShots = [], teamHold, opponentHold } = match.analysis_json || {}
  const zoneStats = generateZoneStats(shots)
  const xgaZoneStats = generateZoneStats(opponentShots)

  const totalXg = shots.reduce((sum, s) => sum + parseFloat(s.xg || '0'), 0)
  const totalXga = opponentShots.reduce((sum, s) => sum + parseFloat(s.xg || '0'), 0)

  const goals = shots.filter(s => s.result === '1').length
  const goalsAgainst = opponentShots.filter(s => s.result === '1').length

  const xgFirst = shots
    .filter(s => s.period === '前半')
    .reduce((sum, s) => sum + parseFloat(s.xg || '0'), 0)

  const xgSecond = shots
    .filter(s => s.period === '後半')
    .reduce((sum, s) => sum + parseFloat(s.xg || '0'), 0)

  const xgaFirst = opponentShots
    .filter(s => s.period === '前半')
    .reduce((sum, s) => sum + parseFloat(s.xg || '0'), 0)

  const xgaSecond = opponentShots
    .filter(s => s.period === '後半')
    .reduce((sum, s) => sum + parseFloat(s.xg || '0'), 0)

  const teamFirst = teamHold?.firstMin * 60 + teamHold?.firstSec || 0
  const teamSecond = teamHold?.secondMin * 60 + teamHold?.secondSec || 0
  const oppFirst = opponentHold?.firstMin * 60 + opponentHold?.firstSec || 0
  const oppSecond = opponentHold?.secondMin * 60 + opponentHold?.secondSec || 0

  const totalTeam = teamFirst + teamSecond
  const totalOpp = oppFirst + oppSecond
  const totalHold = totalTeam + totalOpp

  const scoringEfficiency = totalXg > 0 ? Math.round((goals / totalXg) * 100) : 0
 // ✅ 守備効率（期待値比）＝ xGA に対する失点数
const defendingEfficiency = totalXga > 0
  ? Math.round((goalsAgainst / totalXga) * 100)
  : 0

// ✅ 相手の決定率（失点率）＝相手シュートに対する失点割合
const concedeRate = opponentShots.length > 0
  ? Math.round((goalsAgainst / opponentShots.length) * 100)
  : 0

  const scoringComment =
    scoringEfficiency >= 120 ? '決定力が非常に高い試合' :
    scoringEfficiency >= 80 ? 'チャンスをしっかり活かした試合' :
    '決定機を逃した場面が目立つ試合'

  const defendingComment =
    defendingEfficiency <= 80 ? '堅い守備を見せた' :
    defendingEfficiency <= 120 ? '守備は妥当な内容' :
    '相手に決定機を多く許した試合'

  const xgByTimeZone: Record<string, number> = {
  '0-15': 0, '16-30': 0, '31-45': 0,
  '46-60': 0, '61-75': 0, '76-90': 0, '未入力': 0
}
shots.forEach(s => {
  const min = parseInt(s.minute || '')
  const val = parseFloat(s.xg || '0')
  if (isNaN(min)) xgByTimeZone['未入力'] += val
  else if (min <= 15) xgByTimeZone['0-15'] += val
  else if (min <= 30) xgByTimeZone['16-30'] += val
  else if (min <= 45) xgByTimeZone['31-45'] += val
  else if (min <= 60) xgByTimeZone['46-60'] += val
  else if (min <= 75) xgByTimeZone['61-75'] += val
  else xgByTimeZone['76-90'] += val
})

const xgaByTimeZone: Record<string, number> = {
  '0-15': 0, '16-30': 0, '31-45': 0,
  '46-60': 0, '61-75': 0, '76-90': 0, '未入力': 0
}
opponentShots.forEach(s => {
  const min = parseInt(s.minute || '')
  const val = parseFloat(s.xg || '0')
  if (isNaN(min)) xgaByTimeZone['未入力'] += val
  else if (min <= 15) xgaByTimeZone['0-15'] += val
  else if (min <= 30) xgaByTimeZone['16-30'] += val
  else if (min <= 45) xgaByTimeZone['31-45'] += val
  else if (min <= 60) xgaByTimeZone['46-60'] += val
  else if (min <= 75) xgaByTimeZone['61-75'] += val
  else xgaByTimeZone['76-90'] += val
})

// 背番号ごとのシュート数
const shotByNumber: Record<string, number> = {}
shots.forEach(s => {
  const num = s.number || '未入力'
  shotByNumber[num] = (shotByNumber[num] || 0) + 1
})

// ゴール決定率（ゴール数 ÷ 総シュート数）
const shotCount = shots.length
const decisionRate = shotCount > 0 ? Math.round((goals / shotCount) * 100) : 0

// 前後半の得点
const goalsFirst = shots.filter(s => s.period === '前半' && s.result === '1').length
const goalsSecond = shots.filter(s => s.period === '後半' && s.result === '1').length

// 前後半のシュート数
const shotsFirst = shots.filter(s => s.period === '前半').length
const shotsSecond = shots.filter(s => s.period === '後半').length

// ゴール数（背番号別）
const goalsByNumber: Record<string, number> = {}
shots.forEach(s => {
  const num = s.number || '未入力'
  if (s.result === '1') {
    goalsByNumber[num] = (goalsByNumber[num] || 0) + 1
  }
})

const xgByNumber: Record<string, number> = {}
shots.forEach(s => {
  const num = s.number || '未入力'
  const xg = parseFloat(s.xg || '0')
  xgByNumber[num] = (xgByNumber[num] || 0) + xg
})

const xgaByNumber: Record<string, number> = {}
opponentShots.forEach(s => {
  const num = s.number || '未入力'
  const xga = parseFloat(s.xg || '0')
  xgaByNumber[num] = (xgaByNumber[num] || 0) + xga
})

// 前後半ごとの決定率（得点 ÷ シュート数）
const decisionRateFirst = shotsFirst > 0 ? Math.round((goalsFirst / shotsFirst) * 100) : 0
const decisionRateSecond = shotsSecond > 0 ? Math.round((goalsSecond / shotsSecond) * 100) : 0

// 相手の前後半ごとの失点（＝相手のゴール数）
const goalsAgainstFirst = opponentShots.filter(s => s.period === '前半' && s.result === '1').length
const goalsAgainstSecond = opponentShots.filter(s => s.period === '後半' && s.result === '1').length

// 相手の前後半ごとのシュート数
const opponentShotsFirst = opponentShots.filter(s => s.period === '前半').length
const opponentShotsSecond = opponentShots.filter(s => s.period === '後半').length

// 相手の前後半 決定率（失点 ÷ 相手シュート数）
const defendRateFirst = opponentShotsFirst > 0 ? Math.round((goalsAgainstFirst / opponentShotsFirst) * 100) : 0
const defendRateSecond = opponentShotsSecond > 0 ? Math.round((goalsAgainstSecond / opponentShotsSecond) * 100) : 0

// 相手：背番号ごとのシュート数
const opponentShotsByNumber: Record<string, number> = {}
const opponentGoalsByNumber: Record<string, number> = {}

const opponentShotsWithTime: string[] = []

opponentShots.forEach(s => {
  const num = s.number || '未入力'
  opponentShotsByNumber[num] = (opponentShotsByNumber[num] || 0) + 1

  if (s.result === '1') {
    opponentGoalsByNumber[num] = (opponentGoalsByNumber[num] || 0) + 1
  }

  // ✅ 背番号が空でも minute があれば表示する（+45補正はしない）
  if (s.minute !== undefined && s.minute !== '') {
    const periodLabel = s.period || '前半'
    const minuteInPeriod = s.minute
    const numberDisplay = s.number ? `#${s.number}` : '#未入力'
    opponentShotsWithTime.push(`${numberDisplay}（${periodLabel}${minuteInPeriod}分）`)
  }
})

type ZoneStat = {
  count: number
  totalXg: number
  goals: number
}

function generateZoneStats(shots: Shot[]): Record<string, ZoneStat> {
  const zoneStats: Record<string, ZoneStat> = {}

  shots.forEach(s => {
    const zone = s.zone || '未入力'
    const xg = parseFloat(s.xg || '0')
    const isGoal = s.result === '1'

    if (!zoneStats[zone]) {
      zoneStats[zone] = { count: 0, totalXg: 0, goals: 0 }
    }

    zoneStats[zone].count += 1
    zoneStats[zone].totalXg += xg
    if (isGoal) zoneStats[zone].goals += 1
  })

  return zoneStats
}

const handleEditStart = (index: number, shot: Shot) => {
  setEditingShotIndex(index)
  setEditShot({ ...shot })
}

const handleSaveEdit = async (index: number) => {
  if (!editShot) return

  console.log('✅ 保存直前の zone:', editShot.zone)

  // 入力チェック（undefined や 空文字 対策）
  const raw = parseInt(editShot.minute ?? '')
  if (isNaN(raw)) {
    alert('時間（分）を正しく入力してください')
    return
  }
  
const adjustedMinute = raw

  // データを構造ごと上書き（minuteを明示）
  const updatedShots = [...shots]
  updatedShots[index] = {
  zone: String(editShot.zone ?? ''), // ✅ ここを明示的に文字列にして確実に保存
  number: editShot.number ?? '',
  result: editShot.result ?? '',
  xg: editShot.xg ?? '',
  period: editShot.period ?? '',
  minute: String(adjustedMinute),
}

  console.log('💾 保存内容（最終）:', updatedShots[index])

  const { error } = await supabase
    .from('match_analyses')
    .update({
      analysis_json: {
        ...match?.analysis_json,
        shots: updatedShots,
      },
    })
    .eq('id', match?.id)

  if (error) {
    alert('❌ 保存失敗')
    console.error(error)
    return
  }

  setMatch(prev =>
    prev
      ? {
          ...prev,
          analysis_json: {
            ...prev.analysis_json,
            shots: updatedShots,
          },
        }
      : null
  )
  setEditingShotIndex(null)
  setEditShot(null)
}

const handleDelete = async (index: number) => {
  const ok = confirm('このシュートを削除しますか？')
  if (!ok) return

  const updatedShots = [...shots]
  updatedShots.splice(index, 1)

  const { error } = await supabase
    .from('match_analyses')
    .update({
      analysis_json: {
        ...match?.analysis_json,
        shots: updatedShots
      }
    })
    .eq('id', match?.id)

  if (error) {
    alert('❌ 削除失敗')
    console.error(error)
    return
  }

  setMatch(prev =>
    prev
      ? {
          ...prev,
          analysis_json: {
            ...prev.analysis_json,
            shots: updatedShots
          }
        }
      : null
  )
}

const handleOpponentEditStart = (index: number, shot: Shot) => {
  setEditingOpponentIndex(index)
  setEditOpponentShot({ ...shot })
}

const handleOpponentSaveEdit = async (index: number) => {
  if (!editOpponentShot) return

  // 🔍 minute を安全に parse（undefinedや空でも対応）
  const rawMinute = parseInt(editOpponentShot.minute ?? '')
  if (isNaN(rawMinute)) {
    alert('時間（分）を正しく入力してください')
    return
  }

  // ⏱️ 後半なら +45、前半はそのまま
  const adjustedMinute =
    editOpponentShot.period === '後半'
      ? String(rawMinute + 45)
      : String(rawMinute)

  const updatedShots = [...opponentShots]
  updatedShots[index] = {
    ...editOpponentShot,
    minute: adjustedMinute,
  }

  console.log('💾 相手シュート保存内容:', updatedShots[index])

  const { error } = await supabase
    .from('match_analyses')
    .update({
      analysis_json: {
        ...match?.analysis_json,
        opponentShots: updatedShots,
      },
    })
    .eq('id', match?.id)

  if (error) {
    alert('❌ 保存失敗')
    console.error(error)
    return
  }

  setMatch(prev =>
    prev
      ? {
          ...prev,
          analysis_json: {
            ...prev.analysis_json,
            opponentShots: updatedShots,
          },
        }
      : null
  )

  setEditingOpponentIndex(null)
  setEditOpponentShot(null)
}

const handleOpponentDelete = async (index: number) => {
  const ok = confirm('このシュートを削除しますか？')
  if (!ok) return

  const updated = [...opponentShots]
  updated.splice(index, 1)

  const { error } = await supabase
    .from('match_analyses')
    .update({
      analysis_json: {
        ...match?.analysis_json,
        opponentShots: updated
      }
    })
    .eq('id', match?.id)

  if (error) {
    alert('❌ 削除失敗')
    return
  }

  setMatch(prev =>
    prev
      ? {
          ...prev,
          analysis_json: {
            ...prev.analysis_json,
            opponentShots: updated
          }
        }
      : null
  )
}

  return (
    <main className={styles.container}>
      <h1 className={styles.heading}>試合詳細</h1>

      <div className={styles.section}>
        <p><strong>日付：</strong>{match.match_date}</p>
        <p><strong>対戦相手：</strong>{match.opponent}</p>
        <p><strong>場所：</strong>{match.location}</p>
        <p><strong>天候：</strong>{match.weather}</p>
        <p><strong>スコア：</strong>{match.score_for} - {match.score_against}</p>
      </div>

      <div className={styles.section}>
        <h2>ボール支配率</h2>
        <p><strong>前半：</strong>自 {teamFirst + oppFirst > 0 ? Math.round((teamFirst / (teamFirst + oppFirst)) * 100) : '-'}% ／ 相手 {teamFirst + oppFirst > 0 ? Math.round((oppFirst / (teamFirst + oppFirst)) * 100) : '-'}%</p>
        <p><strong>後半：</strong>自 {teamSecond + oppSecond > 0 ? Math.round((teamSecond / (teamSecond + oppSecond)) * 100) : '-'}% ／ 相手 {teamSecond + oppSecond > 0 ? Math.round((oppSecond / (teamSecond + oppSecond)) * 100) : '-'}%</p>
        <p><strong>合計：</strong>自 {totalHold > 0 ? Math.round((totalTeam / totalHold) * 100) : '-'}% ／ 相手 {totalHold > 0 ? Math.round((totalOpp / totalHold) * 100) : '-'}%</p>
      </div>

<div className={styles.section}>
  <h2>合計データ</h2>

  {/* 🟥 自チーム */}
<h3>自チーム</h3>

<div className={styles.cardRow}>
  <div className={styles.statCard}>
    <span>合計 得点</span>
    <strong>{goals} 点</strong>
  </div>
  <div className={styles.statCard}>
    <span>合計 シュート数</span>
    <strong>{shots.length} 本</strong>
  </div>
  <div className={styles.statCard}>
    <span>ゴール決定率</span>
    <strong>{decisionRate}%</strong>
  </div>
</div>
<div className={styles.cardRow}>
  <div className={styles.statCard}>
    <span>得点（前半 / 後半）</span>
    <strong>{goalsFirst} / {goalsSecond} 点</strong>
  </div>
  <div className={styles.statCard}>
    <span>シュート数（前半 / 後半）</span>
    <strong>{shotsFirst} / {shotsSecond} 本</strong>
  </div>
  <div className={styles.statCard}>
    <span>前半 決定率</span>
    <strong>{decisionRateFirst}%</strong>
  </div>
  <div className={styles.statCard}>
    <span>後半 決定率</span>
    <strong>{decisionRateSecond}%</strong>
  </div>
</div>

<div className={styles.cardRow}>
  <div className={styles.statCard} style={{ overflowX: 'auto' }}>
    <h3 style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
      背番号別：xG
    </h3>
    <table style={{ minWidth: '700px', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #ccc' }}>
          <th style={thStyle}>背番号</th>
          <th style={thStyle}>シュート数</th>
          <th style={thStyle}>得点</th>
          <th style={thStyle}>xG合計</th>
          <th style={thStyle}>決定率</th>
          <th style={thStyle}>効率（得点÷xG）</th>
        </tr>
      </thead>
      <tbody>
        {Object.keys(shotByNumber).map(num => {
          const shots = shotByNumber[num]
          const goals = goalsByNumber[num] || 0
          const xg = xgByNumber?.[num] || 0
          const decisionRate = shots > 0 ? Math.round((goals / shots) * 100) : 0
          const efficiency = xg > 0 ? Math.round((goals / xg) * 100) : 0
          return (
            <tr key={num} style={{ borderBottom: '1px solid #eee' }}>
              <td style={tdStyle}>#{num}</td>
              <td style={tdStyle}>{shots}</td>
              <td style={tdStyle}>{goals}</td>
              <td style={tdStyle}>{xg.toFixed(2)}</td>
              <td style={tdStyle}>{decisionRate}%</td>
              <td style={tdStyle}>{efficiency}%</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  </div>
</div>

{/* ▶ 下段：期待値ベースのxG分析 */}
<div className={styles.cardRow} style={{ marginTop: '1.5rem' }}>
  <div className={styles.statCard}>
    <span>総xG</span>
    <strong>{totalXg.toFixed(2)}</strong>
  </div>
  <div className={styles.statCard}>
    <span>前半 xG</span>
    <strong>{xgFirst.toFixed(2)}</strong>
  </div>
  <div className={styles.statCard}>
    <span>後半 xG</span>
    <strong>{xgSecond.toFixed(2)}</strong>
  </div>
</div>

<p style={{ marginTop: '0.5rem' }}>
  得点効率（期待値比）：{scoringEfficiency}%
  {scoringEfficiency >= 120 && (
    <span className={`${styles.analysisBadge} ${styles.good}`}>GOOD</span>
  )}
  {scoringEfficiency < 80 && (
    <span className={`${styles.analysisBadge} ${styles.bad}`}>BAD</span>
  )}
  {scoringEfficiency >= 80 && scoringEfficiency < 120 && (
    <span className={`${styles.analysisBadge} ${styles.avg}`}>AVG</span>
  )}
</p>
<p>{scoringComment}</p>

<h4 style={{ marginTop: '1rem' }}>時間帯別 xG</h4>
<table className={styles.timeZoneTable}>
  <tbody>
    {Object.entries(xgByTimeZone).map(([zone, val]) => (
      <tr key={zone}>
        <td>{zone} 分</td>
        <td>{val.toFixed(2)}</td>
      </tr>
    ))}
  </tbody>
</table>

<h4 style={{ marginTop: '2rem', fontWeight: 'bold' }}>
  ゾーン別：xG
</h4>

<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
  <thead>
    <tr style={{ borderBottom: '1px solid #ccc' }}>
      <th style={thStyle}>ゾーン</th>
      <th style={thStyle}>シュート数</th>
      <th style={thStyle}>xG合計</th>
      <th style={thStyle}>得点</th>
      <th style={thStyle}>決定率</th>
    </tr>
  </thead>
  <tbody>
    {Object.entries(zoneStats).map(([zone, stat]) => {
      const efficiencyPercent =
        stat.totalXg > 0 ? Math.round((stat.goals / stat.totalXg) * 100) : 0

      return (
        <tr key={zone} style={{ borderBottom: '1px solid #eee' }}>
          <td style={tdStyle}>{zone}</td>
          <td style={tdStyle}>{stat.count}</td>
          <td style={tdStyle}>{stat.totalXg.toFixed(2)}</td>
          <td style={tdStyle}>{stat.goals}</td>
          <td style={tdStyle}>{efficiencyPercent}%</td>
        </tr>
      )
    })}
  </tbody>
</table>

  {/* 🟦 相手チーム */}
<h3 style={{ marginTop: '2rem' }}>相手チーム</h3>

<div className={styles.cardRow}>
  <div className={styles.statCard}>
    <span>合計 失点</span>
    <strong>{goalsAgainst} 点</strong>
  </div>
  <div className={styles.statCard}>
    <span>合計 相手シュート数</span>
    <strong>{opponentShots.length} 本</strong>
  </div>
  <div className={styles.statCard}>
  <span>失点率（相手決定率）</span>
  <strong>{concedeRate}%</strong>
</div>
</div>
<div className={styles.cardRow}>
  <div className={styles.statCard}>
    <span>失点（前半 / 後半）</span>
    <strong>{goalsAgainstFirst} / {goalsAgainstSecond} 点</strong>
  </div>
  <div className={styles.statCard}>
    <span>相手シュート数（前半 / 後半）</span>
    <strong>{opponentShotsFirst} / {opponentShotsSecond} 本</strong>
  </div>
  <div className={styles.statCard}>
    <span>前半 失点率</span>
    <strong>{defendRateFirst}%</strong>
  </div>
  <div className={styles.statCard}>
    <span>後半 失点率</span>
    <strong>{defendRateSecond}%</strong>
  </div>
</div>

<div className={styles.cardRow}>
  <div className={styles.statCard} style={{ overflowX: 'auto' }}>
    <h3 style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
      相手チーム：xGA
    </h3>
    <table style={{ minWidth: '700px', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #ccc' }}>
          <th style={thStyle}>背番号</th>
          <th style={thStyle}>シュート数</th>
          <th style={thStyle}>失点</th>
          <th style={thStyle}>xGA合計</th>
          <th style={thStyle}>決定率</th>
          <th style={thStyle}>効率（失点÷xGA）</th>
        </tr>
      </thead>
      <tbody>
        {Object.keys(opponentShotsByNumber).map(num => {
          const shots = opponentShotsByNumber[num]
          const goals = opponentGoalsByNumber[num] || 0
          const xga = xgaByNumber?.[num] || 0
          const decisionRate = shots > 0 ? Math.round((goals / shots) * 100) : 0
          const efficiency = xga > 0 ? Math.round((goals / xga) * 100) : 0
          return (
            <tr key={num} style={{ borderBottom: '1px solid #eee' }}>
              <td style={tdStyle}>#{num}</td>
              <td style={tdStyle}>{shots}</td>
              <td style={tdStyle}>{goals}</td>
              <td style={tdStyle}>{xga.toFixed(2)}</td>
              <td style={tdStyle}>{decisionRate}%</td>
              <td style={tdStyle}>{efficiency}%</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  </div>
</div>

<div className={styles.cardRow}>
  <div className={styles.statCard}>
    <span>総xGA</span>
    <strong>{totalXga.toFixed(2)}</strong>
  </div>
  <div className={styles.statCard}>
    <span>前半 xGA</span>
    <strong>{xgaFirst.toFixed(2)}</strong>
  </div>
  <div className={styles.statCard}>
    <span>後半 xGA</span>
    <strong>{xgaSecond.toFixed(2)}</strong>
  </div>
</div>

<p style={{ marginTop: '0.5rem' }}>
  守備効率（期待値比）：{defendingEfficiency}%
  {defendingEfficiency <= 80 && (
    <span className={`${styles.analysisBadge} ${styles.good}`}>GOOD</span>
  )}
  {defendingEfficiency > 120 && (
    <span className={`${styles.analysisBadge} ${styles.bad}`}>BAD</span>
  )}
  {defendingEfficiency > 80 && defendingEfficiency <= 120 && (
    <span className={`${styles.analysisBadge} ${styles.avg}`}>AVG</span>
  )}
</p>
<p>{defendingComment}</p>

<h4 style={{ marginTop: '1rem' }}>時間帯別 xGA</h4>
<table className={styles.timeZoneTable}>
  <tbody>
    {Object.entries(xgaByTimeZone).map(([zone, val]) => (
      <tr key={zone}>
        <td>{zone} 分</td>
        <td>{val.toFixed(2)}</td>
      </tr>
    ))}
  </tbody>
</table>
</div>

<h4 style={{ marginTop: '2rem', fontWeight: 'bold' }}>
 ゾーン別：xGA
</h4>
<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
  <thead>
    <tr style={{ borderBottom: '1px solid #ccc' }}>
      <th style={thStyle}>ゾーン</th>
      <th style={thStyle}>シュート数</th>
      <th style={thStyle}>xGA合計</th>
      <th style={thStyle}>失点数</th>
      <th style={thStyle}>決定率</th>
    </tr>
  </thead>
<tbody>
  {Object.entries(xgaZoneStats).map(([zone, stat]) => {
    const efficiencyPercent =
      stat.totalXg > 0 ? Math.round((stat.goals / stat.totalXg) * 100) : 0

    return (
      <tr key={zone} style={{ borderBottom: '1px solid #eee' }}>
        <td style={tdStyle}>{zone}</td>
        <td style={tdStyle}>{stat.count}</td>
        <td style={tdStyle}>{stat.totalXg.toFixed(2)}</td>
        <td style={tdStyle}>{stat.goals}</td>
        <td style={tdStyle}>{efficiencyPercent}%</td>
      </tr>
    )
  })}
</tbody>
</table>

<div className={styles.section}>
  <h2>シュート記録（相手チーム）</h2>

  {opponentShots.map((s: Shot, i: number) => (
    <div key={i} className={styles.shotCard}>
      {editingOpponentIndex === i ? (
        <div className={styles.editForm}>
          <label>背番号:</label>
          <input
            type="text"
            value={editOpponentShot?.number || ''}
            onChange={(e) =>
              setEditOpponentShot(prev => prev ? { ...prev, number: e.target.value } : null)
            }
          />

          <label>ゾーン:</label>
          <input
            type="text"
            value={editOpponentShot?.zone || ''}
            onChange={(e) =>
              setEditOpponentShot(prev => prev ? { ...prev, zone: e.target.value } : null)
            }
          />

          <label>時間帯:</label>
          <select
            value={editOpponentShot?.period || ''}
            onChange={(e) =>
              setEditOpponentShot(prev => prev ? { ...prev, period: e.target.value as '前半' | '後半' } : null)
            }
          >
            <option value="">選択</option>
            <option value="前半">前半</option>
            <option value="後半">後半</option>
          </select>

          <label>時間（分）:</label>
          <input
            type="number"
            value={editOpponentShot?.minute || ''}
            onChange={(e) =>
              setEditOpponentShot(prev => prev ? { ...prev, minute: e.target.value } : null)
            }
          />

          <label>xGA:</label>
          <input
            type="number"
            step="0.01"
            value={editOpponentShot?.xg || ''}
            onChange={(e) =>
              setEditOpponentShot(prev => prev ? { ...prev, xg: e.target.value } : null)
            }
          />

          <label>結果:</label>
          <select
            value={editOpponentShot?.result || ''}
            onChange={(e) =>
              setEditOpponentShot(prev => prev ? { ...prev, result: e.target.value } : null)
            }
          >
            <option value="">選択</option>
            <option value="1">○（失点）</option>
            <option value="0">×（防いだ）</option>
          </select>

          <div className={styles.editButtons}>
            <button onClick={() => handleOpponentSaveEdit(i)}>保存</button>
            <button onClick={() => setEditingOpponentIndex(null)}>キャンセル</button>
          </div>
        </div>
      ) : (
        <>
          <p><strong>相手シュート {i + 1}</strong></p>
          <p>時間帯：{s.period}</p>
          <p>時間：{s.minute ? `${s.minute}分` : '未入力'}</p>
          <p>ゾーン：{s.zone}</p>
          <p>背番号：{s.number}</p>
          <p>xGA：{parseFloat(s.xg || '0').toFixed(2)}（失点確率 {(parseFloat(s.xg || '0') * 100).toFixed(0)}%）</p>
          <p>結果：
            <span className={`${styles.resultBadge} ${s.result === '0' ? styles.save : styles.noSave}`}>
              {s.result === '0' ? 'SAVE' : 'NO SAVE'}
            </span>
          </p>
          <div className={styles.editButtons}>
            <button onClick={() => handleOpponentEditStart(i, s)}>編集</button>
            <button onClick={() => handleOpponentDelete(i)}>削除</button>
          </div>
        </>
      )}
    </div>
  ))}
</div>

<div className={styles.buttonRow}>
  <button
    className={`${styles.backButton} ${styles.primaryButton}`}
    onClick={() => {
      const playerId = localStorage.getItem('playerId')
      router.push(playerId ? '/player/dashboard' : '/dashboard')
    }}
  >
    ダッシュボードに戻る
  </button>

  <button
    className={`${styles.backButton} ${styles.secondaryButton}`}
    onClick={() => {
      const playerId = localStorage.getItem('playerId')
      router.push(playerId ? '/player/analysis/history' : '/analysis/history')
    }}
  >
    試合履歴に戻る
  </button>
</div>

    </main>
  )
}