'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase' // 必要に応じてパス調整
import { Menu } from 'lucide-react'
import styles from './page.module.css'

const xgMap = {
  '1': 0.6,
  '2': 0.6,
  '3': 0.35,
  '4': 0.35,
  '5': 0.25,
  '6': 0.25,
  '7': 0.1,
  '8': 0.1,
  '9': 0.03,
  '10': 0.02,
  '11': 0.02,
}

type ShotRecord = {
  zone: string
  number: string
  result: string
  xg: string
  period: '前半' | '後半' | ''
}

export default function AnalysisPage() {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [teamName, setTeamName] = useState<string>('チーム名未設定')
  const [role, setRole] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [authorized, setAuthorized] = useState(false)

  const [matchInfo, setMatchInfo] = useState({
    date: '',
    time: '',
    opponent: '',
    location: '',
    weather: '',
    scoreFor: '',
    scoreAgainst: '',
    notes: '',
  })

  const removeShot = (index: number) => {
  const updated = [...shots]
  updated.splice(index, 1)
  setShots(updated)
}

const [shots, setShots] = useState<ShotRecord[]>([
  { zone: '', number: '', result: '', xg: '', period: '' }
])

  const [periodTime, setPeriodTime] = useState({
  firstMin: 0, firstSec: 0,
  secondMin: 0, secondSec: 0
})

  const [teamHold, setTeamHold] = useState({
  firstMin: 0, firstSec: 0,
  secondMin: 0, secondSec: 0
})

const [opponentHold, setOpponentHold] = useState({
  firstMin: 0, firstSec: 0,
  secondMin: 0, secondSec: 0
})

const [opponentShots, setOpponentShots] = useState<ShotRecord[]>([
  { zone: '', number: '', result: '', xg: '', period: '' }
])

const handleLogout = async (currentRole: string | null) => {
  await supabase.auth.signOut()

  if (currentRole === 'admin') {
    router.push('/login')
  } else if (currentRole === 'coach') {
    router.push('/team/login')
  } else {
    router.push('/login')
  }
}

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

  // ✅ チーム名取得（ダッシュボードと統一）
  useEffect(() => {
    const fetchTeamName = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        return
      }

      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('name')
        .eq('coach_user_id', user.id)
        .maybeSingle()

      if (teamError || !team) {
        console.warn('❌ チーム名の取得失敗')
        setTeamName('チーム名未設定')
        return
      }

      setTeamName(team.name)
    }

    fetchTeamName()
  }, [router])

const totalXg = shots.reduce((sum, shot) => sum + (parseFloat(shot.xg) || 0), 0)
const goalsTotal = shots.filter(s => s.result === '1').length
const efficiency = totalXg > 0 ? Math.round((goalsTotal / totalXg) * 100) : 0
console.log('得点効率（仮）：', efficiency)

useEffect(() => {
  const periodFirst = periodTime.firstMin * 60 + periodTime.firstSec
  const periodSecond = periodTime.secondMin * 60 + periodTime.secondSec

  const teamFirst = teamHold.firstMin * 60 + teamHold.firstSec
  const oppFirst = opponentHold.firstMin * 60 + opponentHold.firstSec

  const teamSecond = teamHold.secondMin * 60 + teamHold.secondSec
  const oppSecond = opponentHold.secondMin * 60 + opponentHold.secondSec

  const blankFirst = Math.max(0, periodFirst - (teamFirst + oppFirst))
  const blankSecond = Math.max(0, periodSecond - (teamSecond + oppSecond))

  // ✅ ここにログ出力を追加
  console.log('空白（前半）:', blankFirst)
  console.log('空白（後半）:', blankSecond)

}, [periodTime, teamHold, opponentHold])

const updateShot = (index: number, key: keyof ShotRecord, value: string) => {
  const updated = [...shots]

  if (key === 'period') {
    updated[index].period = value as '前半' | '後半' | ''
  } else {
    updated[index][key] = value
  }

  if (key === 'zone') {
    const xg = xgMap[value as keyof typeof xgMap] || ''
    updated[index].xg = xg.toString()
  }

  setShots(updated)
}

const addShot = () => {
  setShots([...shots, { zone: '', number: '', result: '', xg: '', period: '' }])
}

const updateOpponentShot = (index: number, key: keyof ShotRecord, value: string) => {
  const updated = [...opponentShots]

  if (key === 'period') {
    updated[index].period = value as '前半' | '後半' | ''
  } else {
    updated[index][key] = value
  }

  if (key === 'zone') {
    const xg = xgMap[value as keyof typeof xgMap] || ''
    updated[index].xg = xg.toString()
  }

  setOpponentShots(updated)
}

const addOpponentShot = () => {
  setOpponentShots([...opponentShots, { zone: '', number: '', result: '', xg: '', period: '' }])
}

const removeOpponentShot = (index: number) => {
  const updated = [...opponentShots]
  updated.splice(index, 1)
  setOpponentShots(updated)
}

const handleSave = async () => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    alert('ログインが必要です')
    return
  }

  console.log('✅ ログイン中のユーザーID:', user.id) // ← ①ここ

  // ✅ coach_user_id（= user.id）から team_id を取得
  const { data: teamData, error: teamError } = await supabase
    .from('teams')
    .select('id')
    .eq('coach_user_id', user.id)
    .maybeSingle()

  console.log('🧩 取得した teamData:', teamData)      // ← ②ここ
  console.log('🧩 保存に使う team_id:', teamData?.id) // ← ③ここ

  if (teamError || !teamData) {
    console.error('❌ チーム取得失敗:', teamError)
    alert('チーム情報の取得に失敗しました')
    return
  }

  // ✅ 正しい team_id を使って match_analyses に保存
  const { error } = await supabase.from('match_analyses').insert([
    {
      team_id: teamData.id,
      match_date: matchInfo.date,
      opponent: matchInfo.opponent,
      location: matchInfo.location,
      weather: matchInfo.weather,
      score_for: parseInt(matchInfo.scoreFor),
      score_against: parseInt(matchInfo.scoreAgainst),
      notes: matchInfo.notes,
      analysis_json: {
        shots,
        opponentShots,
        teamHold,
        opponentHold,
        periodTime
      }
    }
  ])

  if (error) {
    console.error('❌ 保存失敗:', error)
    alert('保存に失敗しました')
  } else {
    alert('✅ 試合データを保存しました')
    router.push('/analysis/history')
  }
}

useEffect(() => {
  const el = document.querySelector('main')
  if (!el) {
    console.warn('⚠️ mainタグが見つかりません')
    return
  }

  console.log('📐 scrollHeight:', el.scrollHeight)
  console.log('📐 clientHeight:', el.clientHeight)
  console.log('📦 スクロールできる？', el.scrollHeight > el.clientHeight)
}, [])

useEffect(() => {
  const checkAccess = async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (!user || error) {
      router.push('/login')
      return
    }

    // ✅ まず user_profiles を確認（admin 判定）
    const { data: profile,} = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role === 'admin') {
      setAuthorized(true)
      setRole('admin')
      return
    }

    // ✅ 次に teams を確認（coach 判定）
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('coach_user_id', user.id)
      .maybeSingle()

    if (team && !teamError) {
      setAuthorized(true)
      setRole('coach')
      setTeamName(team.name)
      return
    }

    // ✅ 最後に playerId が存在すれば player 扱い
    const playerId = typeof window !== 'undefined' ? localStorage.getItem('playerId') : null
    if (playerId) {
      setAuthorized(true)
      setRole('player')
      return
    }

    // ❌ どれにも当てはまらなければ弾く
    router.push('/dashboard')
  }

  checkAccess()
}, [router])


if (!authorized) return <p style={{ padding: '2rem' }}>アクセス確認中...</p>

return (
  <>
    <header className={styles.header}>
      <h1 className={styles.headerTitle}>{teamName}</h1>

      <div className={styles.headerMenu}>
        <button onClick={() => setMenuOpen(!menuOpen)} className={styles.menuButton}>
          <Menu size={24} />
        </button>
{menuOpen && (
  <div ref={menuRef} className={styles.dropdown}>
    <button onClick={() => router.push('/dashboard')}>ダッシュボード</button>
    <button onClick={() => { setMenuOpen(false); router.push('/admin/players/list') }}>選手一覧</button>
    <button onClick={() => router.push('/evaluation/input')}>選手データ入力</button>
    <button onClick={() => router.push('/evaluation/view')}>選手データ表示</button>
    <button onClick={() => { setMenuOpen(false); router.push('/analysis/history') }}>試合履歴</button>
    <button onClick={() => { setMenuOpen(false); handleLogout(role) }}>ログアウト</button>
  </div>
)}
      </div>
    </header>

    <main className={styles.container}>
      <h1 className={styles.pageTitle}>試合分析</h1>

      <section className={styles.section}>
        <h2>① 試合基本情報</h2>
        <input type="date" value={matchInfo.date} onChange={e => setMatchInfo({ ...matchInfo, date: e.target.value })} />
        <input type="time" value={matchInfo.time} onChange={e => setMatchInfo({ ...matchInfo, time: e.target.value })} />
        <input type="text" placeholder="対戦相手" value={matchInfo.opponent} onChange={e => setMatchInfo({ ...matchInfo, opponent: e.target.value })} />
        <input type="text" placeholder="場所" value={matchInfo.location} onChange={e => setMatchInfo({ ...matchInfo, location: e.target.value })} />
        <select value={matchInfo.weather} onChange={e => setMatchInfo({ ...matchInfo, weather: e.target.value })}>
          <option value="">天候を選択</option>
          <option value="晴れ">晴れ</option>
          <option value="曇り">曇り</option>
          <option value="雨">雨</option>
          <option value="雪">雪</option>
        </select>
        <input type="number" placeholder="自チーム得点" value={matchInfo.scoreFor} onChange={e => setMatchInfo({ ...matchInfo, scoreFor: e.target.value })} />
        <input type="number" placeholder="相手チーム得点" value={matchInfo.scoreAgainst} onChange={e => setMatchInfo({ ...matchInfo, scoreAgainst: e.target.value })} />
        <textarea placeholder="備考" value={matchInfo.notes} onChange={e => setMatchInfo({ ...matchInfo, notes: e.target.value })} />
      </section>

      <section className={styles.section}>
        <h2>② 試合時間・支配率</h2>
        <div>
          <label>前半 試合時間：</label>
          <input
            type="number"
            placeholder="分"
            onChange={e => setPeriodTime(p => ({ ...p, firstMin: Number(e.target.value) }))}
          />
          <input
            type="number"
            placeholder="秒"
            onChange={e => setPeriodTime(p => ({ ...p, firstSec: Number(e.target.value) }))}
          />
        </div>
        <div>
          <label>後半 試合時間：</label>
          <input
            type="number"
            placeholder="分"
            onChange={e => setPeriodTime(p => ({ ...p, secondMin: Number(e.target.value) }))}
          />
          <input
            type="number"
            placeholder="秒"
            onChange={e => setPeriodTime(p => ({ ...p, secondSec: Number(e.target.value) }))}
          />
        </div>

<p>保持時間（分・秒）を記入してください</p>
<div>
  <label>前半 自チーム保持：</label>
  <input
    type="number"
    placeholder="分"
    onChange={e => setTeamHold(p => ({ ...p, firstMin: Number(e.target.value) }))}
  />
  <input
    type="number"
    placeholder="秒"
    onChange={e => setTeamHold(p => ({ ...p, firstSec: Number(e.target.value) }))}
  />
</div>

<div>
  <label>前半 相手チーム保持：</label>
  <input
    type="number"
    placeholder="分"
    onChange={e => setOpponentHold(p => ({ ...p, firstMin: Number(e.target.value) }))}
  />
  <input
    type="number"
    placeholder="秒"
    onChange={e => setOpponentHold(p => ({ ...p, firstSec: Number(e.target.value) }))}
  />
</div>

<div>
  <label>後半 自チーム保持：</label>
  <input
    type="number"
    placeholder="分"
    onChange={e => setTeamHold(p => ({ ...p, secondMin: Number(e.target.value) }))}
  />
  <input
    type="number"
    placeholder="秒"
    onChange={e => setTeamHold(p => ({ ...p, secondSec: Number(e.target.value) }))}
  />
</div>

<div>
  <label>後半 相手チーム保持：</label>
  <input
    type="number"
    placeholder="分"
    onChange={e => setOpponentHold(p => ({ ...p, secondMin: Number(e.target.value) }))}
  />
  <input
    type="number"
    placeholder="秒"
    onChange={e => setOpponentHold(p => ({ ...p, secondSec: Number(e.target.value) }))}
  />
</div>
</section>

<section className={styles.section}>
  <h2>③ 自チームのシュート記録（xG）</h2>

  {shots.map((shot, i) => (
    <div key={i} className={styles.shotCard}>
      <div className={styles.shotCardHeader}>
        <strong>シュート {i + 1}</strong>
        <button onClick={() => removeShot(i)} className={styles.deleteButton}>削除</button>
      </div>

<label>時間帯:</label>
<select
  value={shot.period}
  onChange={e => updateShot(i, 'period', e.target.value as '前半' | '後半' | '')}
>
  <option value="">選択</option>
  <option value="前半">前半</option>
  <option value="後半">後半</option>
</select>

<label>ゾーン:</label>
<select
  value={shot.zone}
  onChange={e => updateShot(i, 'zone', e.target.value)}
>
  <option value="">選択</option>
  {[...Array(11)].map((_, i) => (
    <option key={i + 1} value={(i + 1).toString()}>{i + 1}</option>
  ))}
</select>

      <label>背番号:</label>
      <input
        type="text"
        value={shot.number}
        onChange={e => updateShot(i, 'number', e.target.value)}
      />

<label>得点:</label>
<select value={shot.result} onChange={e => updateShot(i, 'result', e.target.value)}>
  <option value="">選択</option>
  <option value="1">○（得点）</option>
  <option value="0">×（未達）</option>
</select>

      <label>xG:</label>
      <input
        type="number"
        step="0.01"
        value={shot.xg}
        onChange={e => updateShot(i, 'xg', e.target.value)}
      />
    </div>
  ))}

  <button className={styles.myButton} onClick={addShot}>＋ シュート追加</button>
</section>

<section className={styles.section}>
  <h2>④ 相手チームのシュート記録（xGA）</h2>

  {opponentShots.map((shot, i) => (
    <div key={i} className={styles.shotCard}>
      <div className={styles.shotCardHeader}>
        <strong>シュート {i + 1}</strong>
        <button onClick={() => removeOpponentShot(i)} className={styles.deleteButton}>削除</button>
      </div>

<label>時間帯:</label>
<select
  value={shot.period}
  onChange={e => updateOpponentShot(i, 'period', e.target.value as '前半' | '後半' | '')}
>
  <option value="">選択</option>
  <option value="前半">前半</option>
  <option value="後半">後半</option>
</select>

<label>ゾーン:</label>
<select
  value={shot.zone || ''}
  onChange={e => updateOpponentShot(i, 'zone', e.target.value)}
>
  <option value="">選択</option>
  {[...Array(11)].map((_, i) => (
    <option key={i + 1} value={(i + 1).toString()}>{i + 1}</option>
  ))}
</select>

      <label>（任意）背番号:</label>
      <input
        type="text"
        placeholder="例: 9"
        value={shot.number}
        onChange={e => updateOpponentShot(i, 'number', e.target.value)}
      />

<label>得点:</label>
<select
  value={shot.result}
  onChange={e => updateOpponentShot(i, 'result', e.target.value)}
>
  <option value="">選択</option>
  <option value="1">○（得点）</option>
  <option value="0">×（未達）</option>
</select>

      <label>xG（被xG）:</label>
      <input
        type="number"
        step="0.01"
        value={shot.xg}
        onChange={e => updateOpponentShot(i, 'xg', e.target.value)}
      />
    </div>
  ))}

  <button className={styles.myButton} onClick={addOpponentShot}>＋ シュート追加</button>
</section>

<section className={styles.section}>
  <h2>⑤ 結果まとめ・評価</h2>

  {(() => {
    const teamFirst = teamHold.firstMin * 60 + teamHold.firstSec
    const teamSecond = teamHold.secondMin * 60 + teamHold.secondSec
    const teamTotal = teamFirst + teamSecond

    const oppFirst = opponentHold.firstMin * 60 + opponentHold.firstSec
    const oppSecond = opponentHold.secondMin * 60 + opponentHold.secondSec
    const oppTotal = oppFirst + oppSecond

    const totalHold = teamTotal + oppTotal

    // ✅ periodベースでxGを集計
    const xgFirst = shots
      .filter(s => s.period === '前半')
      .reduce((sum, s) => sum + parseFloat(s.xg || '0'), 0)

    const xgSecond = shots
      .filter(s => s.period === '後半')
      .reduce((sum, s) => sum + parseFloat(s.xg || '0'), 0)

    const totalXg = xgFirst + xgSecond

    const xgaFirst = opponentShots
      .filter(s => s.period === '前半')
      .reduce((sum, s) => sum + parseFloat(s.xg || '0'), 0)

    const xgaSecond = opponentShots
      .filter(s => s.period === '後半')
      .reduce((sum, s) => sum + parseFloat(s.xg || '0'), 0)

    const totalXga = xgaFirst + xgaSecond

const goalsTotal = shots.filter(s => s.result === '1').length
const goalsAgainstTotal = opponentShots.filter(s => s.result === '1').length
const efficiency = totalXg > 0 ? Math.round((goalsTotal / totalXg) * 100) : 0
const defenseEfficiency = totalXga > 0
  ? Math.round((goalsAgainstTotal / totalXga) * 100)
  : 0

    return (
      <>
        <h3>【前半】</h3>
        <p>支配率：{teamFirst + oppFirst > 0
          ? `自 ${Math.round((teamFirst / (teamFirst + oppFirst)) * 100)}% / 相手 ${Math.round((oppFirst / (teamFirst + oppFirst)) * 100)}%`
          : '入力待ち'}
        </p>
        <p>xG（自チーム）：{xgFirst.toFixed(2)}</p>
        <p>xGA（被xG）：{xgaFirst.toFixed(2)}</p>

        <h3>【後半】</h3>
        <p>支配率：{teamSecond + oppSecond > 0
          ? `自 ${Math.round((teamSecond / (teamSecond + oppSecond)) * 100)}% / 相手 ${Math.round((oppSecond / (teamSecond + oppSecond)) * 100)}%`
          : '入力待ち'}
        </p>
        <p>xG（自チーム）：{xgSecond.toFixed(2)}</p>
        <p>xGA（被xG）：{xgaSecond.toFixed(2)}</p>

<h3>【自チーム 合計データ】</h3>

<p>支配率：{totalHold > 0
  ? `自 ${Math.round((teamTotal / totalHold) * 100)}% / 相手 ${Math.round((oppTotal / totalHold) * 100)}%`
  : '入力待ち'}
</p>

<p>xG（期待値）：{totalXg.toFixed(2)}</p>
<p>得点数：{goalsTotal}</p>
<p>得点効率：{efficiency}%</p>

<p>
  試合評価：{
    efficiency >= 120
      ? '決定力が非常に高い試合でした'
      : efficiency >= 80
      ? 'おおむねチャンスを活かせた試合'
      : '決定機を活かしきれなかった試合'
  }
</p>

<h4 style={{ marginTop: '1rem' }}>【シュートごとの分析】</h4>
{shots.map((s, i) => (
  <div
    key={i}
    style={{
      marginBottom: '1rem',
      padding: '0.75rem',
      border: '1px solid #ccc',
      borderRadius: '6px',
      backgroundColor: '#f9f9f9'
    }}
  >
    <p>シュート {i + 1}</p>
    <p>背番号：{s.number || '未入力'}</p>
    <p>ゾーン：{s.zone || '未入力'}</p>
    <p>xG：{parseFloat(s.xg || '0').toFixed(2)}</p>
    <p>得点：{s.result === '1' ? '○（得点）' : s.result === '0' ? '×（未達）' : '未選択'}</p>
    <p>
      期待に応えたか？：
      {s.result === '1'
        ? <span style={{ color: 'green' }}>○（決定機を決めた）</span>
        : s.result === '0'
          ? <span style={{ color: 'red' }}>×（逃した）</span>
          : '評価待ち'}
    </p>
  </div>
))}

<h3>【相手チーム 合計データ】</h3>

<p>xG（被xG）：{totalXga.toFixed(2)}</p>
<p>失点数：{goalsAgainstTotal}</p>
<p>守備効率（失点 ÷ 被xG）：{defenseEfficiency}%</p>

<p>
  守備評価：{
    defenseEfficiency <= 80
      ? '非常に堅い守備を見せた'
      : defenseEfficiency <= 120
      ? '妥当な守備結果'
      : '相手に決定機を与えすぎた'
  }
</p>

<h4 style={{ marginTop: '1rem' }}>【相手シュートごとの守備対応】</h4>
{opponentShots.map((s, i) => (
  <div
    key={i}
    style={{
      marginBottom: '1rem',
      padding: '0.75rem',
      border: '1px solid #ccc',
      borderRadius: '6px',
      backgroundColor: '#f4f4f4'
    }}
  >
    <p>シュート {i + 1}</p>
    <p>背番号：{s.number || '未入力'}</p>
    <p>ゾーン：{s.zone || '未入力'}</p>
    <p>xG（被xG）：{parseFloat(s.xg || '0').toFixed(2)}</p>
    <p>失点：{s.result === '1' ? '○（失点）' : s.result === '0' ? '×（防いだ）' : '未選択'}</p>
    <p>
      守備貢献度：{
        s.result === '0'
          ? <span style={{ color: 'green' }}>✅ 決定機を防いだ</span>
          : s.result === '1'
            ? <span style={{ color: 'red' }}>❌ 失点を許した</span>
            : '評価待ち'
      }
    </p>
  </div>
))}
      </>
    )
  })()}
</section>

<button className={styles.myButton} onClick={handleSave}>
この内容で保存する
</button>

    </main>
  </>
)
}
