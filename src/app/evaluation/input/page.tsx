'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './page.module.css'

type EvaluationForm = {
  distance_km?: number
  sprint_total_m?: number
  sprint_count?: number
  sprint_avg_m?: number
  max_speed_kmh?: number
  accelerations?: number
  sprint_20m_sec?: number
  sprint_50m_sec?: number
  yoyo_count?: number
  long_jump_cm?: number
  side_step_count?: number
  vertical_jump_cm?: number
  triple_jump_cm?: number
  step_50s_count?: number
  sit_ups_30s?: number
  pelvis_posture?: string
  leg_shape?: string
  foot_arch?: string
  fingertip_floor_cm?: number
  heel_buttock_cm?: number
  thomas_test?: string
  slr_deg?: number
  shin_pain?: string
  heel_pain?: string
  pain_custom?: string
  height_cm?: number
  weight_kg?: number
  bmi?: number
  body_fat_pct?: number
}

export default function EvaluationInputPage() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  type Player = { id: string; name: string }
  const [players, setPlayers] = useState<Player[]>([])
  const [playerId, setPlayerId] = useState('')
  const [recordedAt, setRecordedAt] = useState('')
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState<EvaluationForm>({})


  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        router.push('/dashboard')
        return
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (profile && profile.role === 'admin') {
        setRole('admin')
      } else {
        const { data: team, error: teamError } = await supabase
          .from('teams')
          .select('id')
          .eq('coach_user_id', user.id)
          .maybeSingle()

        if (team && !teamError) {
          setRole('coach')
        } else {
          router.push('/dashboard')
          return
        }
      }

      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, name')
        .order('name', { ascending: true })

      if (!playersError && playersData) {
        setPlayers(playersData)
      }
    }

    checkAuth()
    console.log('🧪 role (for lint):', role)
  }, [router, role])

  const handleChange = (field: string, value: string | number) => {
    const updated = { ...formData, [field]: value }

const height = parseFloat(field === 'height_cm' ? String(value) : String(updated.height_cm))
const weight = parseFloat(field === 'weight_kg' ? String(value) : String(updated.weight_kg))

if (height > 0 && weight > 0) {
  const heightM = height / 100
  updated.bmi = parseFloat((weight / (heightM * heightM)).toFixed(2))
}

    setFormData(updated)
  }

const handleSave = async () => {
  if (!playerId || !recordedAt) {
    setMessage('選手と日付は必須です')
    return
  }

  // ✅ Supabaseに渡すpayloadは型を保証
  const payload: EvaluationForm & {
    player_id: string
    recorded_at: string
  } = {
    player_id: playerId,
    recorded_at: recordedAt,
    ...formData,
  }

  // ✅ insertは必ず配列で渡す
  const { error } = await supabase
    .from('player_evaluations')
    .insert([payload])

  if (error) {
    console.error('❌ 保存エラー:', error)
    console.log('🧪 送信内容:', payload)
    setMessage('保存に失敗しました')
  } else {
    setMessage('✅ 登録しました')
    setFormData({})
  }
}

  return (
    <main className={styles.container}>
      <h1 className={styles.pageTitle}>選手データ入力</h1>

      <div className={styles.section}>
        <label>選手</label>
        <select value={playerId} onChange={e => setPlayerId(e.target.value)}>
          <option value="">-- 選択してください --</option>
          {players.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <label>測定日</label>
        <input type="date" value={recordedAt} onChange={e => setRecordedAt(e.target.value)} />
      </div>

      <div className={styles.section}>
        <h2>フィジカル</h2>
        <label>走行距離(km)</label>
        <input type="number" step="0.01" onChange={e => handleChange('distance_km', e.target.value)} />

        <label>スプリント総距離(m)</label>
        <input type="number" onChange={e => handleChange('sprint_total_m', e.target.value)} />

        <label>スプリント回数</label>
        <input type="number" onChange={e => handleChange('sprint_count', e.target.value)} />

        <label>スプリント1回平均(m)</label>
        <input type="number" step="0.01" onChange={e => handleChange('sprint_avg_m', e.target.value)} />

        <label>最大速度(km/h)</label>
        <input type="number" step="0.1" onChange={e => handleChange('max_speed_kmh', e.target.value)} />

        <label>加速回数</label>
        <input type="number" onChange={e => handleChange('accelerations', e.target.value)} />

        <label>20M走(秒)</label>
        <input type="number" step="0.01" onChange={e => handleChange('sprint_20m_sec', e.target.value)} />

        <label>50M走(秒)</label>
        <input type="number" step="0.01" onChange={e => handleChange('sprint_50m_sec', e.target.value)} />

        <label>YoYo（持久力）回</label>
        <input type="number" onChange={e => handleChange('yoyo_count', e.target.value)} />

        <label>立ち幅跳び(cm)</label>
        <input type="number" onChange={e => handleChange('long_jump_cm', e.target.value)} />

        <label>反復横跳び(回)</label>
        <input type="number" onChange={e => handleChange('side_step_count', e.target.value)} />

        <label>垂直跳び(cm)</label>
        <input type="number" onChange={e => handleChange('vertical_jump_cm', e.target.value)} />

        <label>三段跳び(cm)</label>
        <input type="number" onChange={e => handleChange('triple_jump_cm', e.target.value)} />

        <label>ステップ50秒(回)</label>
        <input type="number" onChange={e => handleChange('step_50s_count', e.target.value)} />

        <label>シットアップ（30秒）回</label>
        <input type="number" onChange={e => handleChange('sit_ups_30s', e.target.value)} />
      </div>

<div className={styles.section}>
  <h2>メディカル</h2>

  {/* ▶ 姿勢 */}
  <div className={styles.card}>
    <h3 className={styles.subheading}>姿勢</h3>

    <label>骨盤（前傾／後傾／正常）</label>
    <select onChange={e => handleChange('pelvis_posture', e.target.value)}>
      <option value="">選択してください</option>
      <option value="前傾">前傾</option>
      <option value="後傾">後傾</option>
      <option value="正常">正常</option>
    </select>

    <label>下肢（O脚／X脚／正常）</label>
    <select onChange={e => handleChange('leg_shape', e.target.value)}>
      <option value="">選択してください</option>
      <option value="O脚">O脚</option>
      <option value="X脚">X脚</option>
      <option value="正常">正常</option>
    </select>

    <label>足（扁平足／ハイアーチ／正常）</label>
    <select onChange={e => handleChange('foot_arch', e.target.value)}>
      <option value="">選択してください</option>
      <option value="扁平足">扁平足</option>
      <option value="ハイアーチ">ハイアーチ</option>
      <option value="正常">正常</option>
    </select>
  </div>

  {/* ▶ 柔軟性 */}
  <div className={styles.card}>
    <h3 className={styles.subheading}>柔軟性</h3>

    <label>指床間距離(cm)</label>
    <input type="number" onChange={e => handleChange('fingertip_floor_cm', e.target.value)} />

    <label>踵臀間距離(cm)</label>
    <input type="number" onChange={e => handleChange('heel_buttock_cm', e.target.value)} />

    <label>トーマステスト（＋／−）</label>
    <select onChange={e => handleChange('thomas_test', e.target.value)}>
      <option value="">選択してください</option>
      <option value="+">＋</option>
      <option value="-">−</option>
    </select>

    <label>SLR（°）</label>
    <input type="number" onChange={e => handleChange('slr_deg', e.target.value)} />
  </div>

  {/* ▶ 成長痛チェック */}
  <div className={styles.card}>
    <h3 className={styles.subheading}>成長痛チェック</h3>

    <label>脛骨粗面の圧痛（＋／−）</label>
    <select onChange={e => handleChange('shin_pain', e.target.value)}>
      <option value="">選択してください</option>
      <option value="+">＋</option>
      <option value="-">−</option>
    </select>

    <label>踵骨隆起の圧痛（＋／−）</label>
    <select onChange={e => handleChange('heel_pain', e.target.value)}>
      <option value="">選択してください</option>
      <option value="+">＋</option>
      <option value="-">−</option>
    </select>
  </div>

  {/* ▶ その他 */}
  <div className={styles.card}>
    <h3 className={styles.subheading}>痛みの有無</h3>
    <label>自由入力</label>
    <textarea rows={3} onChange={e => handleChange('pain_custom', e.target.value)} />
  </div>
</div>


      <div className={styles.section}>
        <h2>体格</h2>
<label>身長(cm)</label>
<input
  type="number"
  onChange={e => handleChange('height_cm', parseFloat(e.target.value))}
/>

<label>体重(kg)</label>
<input
  type="number"
  onChange={e => handleChange('weight_kg', parseFloat(e.target.value))}
/>


<label>BMI</label>
<input type="number" value={formData.bmi || ''} readOnly />


        <label>体脂肪率(%)</label>
        <input type="number" step="0.1" onChange={e => handleChange('body_fat_pct', e.target.value)} />
      </div>

<div className={styles.buttonGroup}>
  <button className={styles.myButton} onClick={handleSave}>保存する</button>

  {message && <p className={styles.message}>{message}</p>}

  <p className={styles.linkText}>
    <a onClick={() => router.push('/dashboard')}>← ダッシュボードに戻る</a>
  </p>
</div>

    </main>
  )
}
