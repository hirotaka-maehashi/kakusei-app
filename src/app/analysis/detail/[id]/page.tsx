'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './page.module.css'
import { useRouter } from 'next/navigation'

export default function MatchDetailPage() {
  const { id } = useParams()
  const [match, setMatch] = useState<any>(null)
  const router = useRouter()


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

  const { shots = [], opponentShots = [], teamHold, opponentHold, periodTime } = match.analysis_json || {}

  const totalXg = shots.reduce((sum: number, s: any) => sum + parseFloat(s.xg || '0'), 0)
  const totalXga = opponentShots.reduce((sum: number, s: any) => sum + parseFloat(s.xg || '0'), 0)

  const goals = shots.filter((s: any) => s.result === '1').length
const goalsAgainst = opponentShots.filter((s: any) => s.result === '1').length

const xgFirst = shots
  .filter((s: any) => s.period === '前半')
  .reduce((sum: number, s: any) => sum + parseFloat(s.xg || '0'), 0)

const xgSecond = shots
  .filter((s: any) => s.period === '後半')
  .reduce((sum: number, s: any) => sum + parseFloat(s.xg || '0'), 0)

const xgaFirst = opponentShots
  .filter((s: any) => s.period === '前半')
  .reduce((sum: number, s: any) => sum + parseFloat(s.xg || '0'), 0)

const xgaSecond = opponentShots
  .filter((s: any) => s.period === '後半')
  .reduce((sum: number, s: any) => sum + parseFloat(s.xg || '0'), 0)


  const teamFirst = teamHold?.firstMin * 60 + teamHold?.firstSec || 0
  const teamSecond = teamHold?.secondMin * 60 + teamHold?.secondSec || 0
  const oppFirst = opponentHold?.firstMin * 60 + opponentHold?.firstSec || 0
  const oppSecond = opponentHold?.secondMin * 60 + opponentHold?.secondSec || 0

  const totalTeam = teamFirst + teamSecond
  const totalOpp = oppFirst + oppSecond
  const totalHold = totalTeam + totalOpp

  const scoringEfficiency = totalXg > 0 ? Math.round((goals / totalXg) * 100) : 0
const defendingEfficiency = totalXga > 0 ? Math.round((goalsAgainst / totalXga) * 100) : 0

const scoringComment =
  scoringEfficiency >= 120 ? '決定力が非常に高い試合' :
  scoringEfficiency >= 80 ? 'チャンスをしっかり活かした試合' :
  '決定機を逃した場面が目立つ試合'

const defendingComment =
  defendingEfficiency <= 80 ? '堅い守備を見せた' :
  defendingEfficiency <= 120 ? '守備は妥当な内容' :
  '相手に決定機を多く許した試合'

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
        <h2>支配率</h2>
        <p><strong>前半：</strong>自 {teamFirst + oppFirst > 0 ? Math.round((teamFirst / (teamFirst + oppFirst)) * 100) : '-'}% ／ 相手 {teamFirst + oppFirst > 0 ? Math.round((oppFirst / (teamFirst + oppFirst)) * 100) : '-'}%</p>
        <p><strong>後半：</strong>自 {teamSecond + oppSecond > 0 ? Math.round((teamSecond / (teamSecond + oppSecond)) * 100) : '-'}% ／ 相手 {teamSecond + oppSecond > 0 ? Math.round((oppSecond / (teamSecond + oppSecond)) * 100) : '-'}%</p>
        <p><strong>合計：</strong>自 {totalHold > 0 ? Math.round((totalTeam / totalHold) * 100) : '-'}% ／ 相手 {totalHold > 0 ? Math.round((totalOpp / totalHold) * 100) : '-'}%</p>
      </div>

      <div className={styles.section}>
        <h2>シュート記録（自チーム）</h2>
{shots.map((s: any, i: number) => (
  <div key={i} className={styles.shotCard}>
    <p><strong>シュート {i + 1}</strong></p>
    <p>時間帯：{s.period}</p>
    <p>ゾーン：{s.zone}</p>
    <p>背番号：{s.number}</p>
    <p>xG：{parseFloat(s.xg || '0').toFixed(2)}（ゴール期待度 {(parseFloat(s.xg || '0') * 100).toFixed(0)}%）</p>
    <p>結果：<span className={`${styles.resultBadge} ${s.result === '1' ? styles.goal : styles.noGoal}`}>{s.result === '1' ? 'GOAL' : 'NO GOAL'}</span></p>
  </div>
))}

      </div>

      <div className={styles.section}>
        <h2>シュート記録（相手チーム）</h2>
{opponentShots.map((s: any, i: number) => (
<div key={i} className={styles.shotCard}>
  <p><strong>相手シュート {i + 1}</strong></p>
  <p>時間帯：{s.period}</p>
  <p>ゾーン：{s.zone}</p>
  <p>背番号：{s.number}</p>
  <p> xGA：{parseFloat(s.xg || '0').toFixed(2)}（失点確率 {(parseFloat(s.xg || '0') * 100).toFixed(0)}%）</p>
  <p>結果：<span className={`${styles.resultBadge} ${s.result === '0' ? styles.save : styles.noSave}`}>{s.result === '0' ? 'SAVE' : 'NO SAVE'}</span></p>
</div>

))}

      </div>

<div className={styles.section}>
  <h2>合計データ</h2>

  <div className={styles.statRow}>
    <p><strong>総xG：</strong>{totalXg.toFixed(2)}</p>
    <p><strong>得点：</strong>{goals}</p>
  </div>

  <p>
    得点効率：{scoringEfficiency}%
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

  <div className={styles.statRow} style={{ marginTop: '1rem' }}>
    <p><strong>総xGA：</strong>{totalXga.toFixed(2)}</p>
    <p><strong>失点：</strong>{goalsAgainst}</p>
  </div>

  <p>
    守備効率：{defendingEfficiency}%
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
</div>

<div className={styles.buttonRow}>
  <button className={`${styles.backButton} ${styles.primaryButton}`} onClick={() => router.push('/dashboard')}>
    ダッシュボードに戻る
  </button>
  <button className={`${styles.backButton} ${styles.secondaryButton}`} onClick={() => router.push('/analysis/history')}>
    試合履歴に戻る
  </button>
</div>

    </main>
  )
}