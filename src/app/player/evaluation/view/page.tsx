'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import styles from './page.module.css'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

type Player = { id: string; name: string }
type EvaluationRecord = { recorded_at: string; [key: string]: string | number }
type AvgData = Record<string, string>
type BenchmarkData = Record<string, number>

export default function EvaluationViewPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([])
  const [avgData, setAvgData] = useState<AvgData>({})
  const [latestData, setLatestData] = useState<EvaluationRecord>({} as EvaluationRecord)
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData>({})
  const [selectedCategory, setSelectedCategory] = useState('')
  const [categoryValue, setCategoryValue] = useState('')
  const [selectedGender, setSelectedGender] = useState('')
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userTeamId, setUserTeamId] = useState<string | null>(null)

const fetchPlayers = useCallback(async () => {
  console.log('🔥 fetchPlayers 実行:', { role, userId, userTeamId })
  if (!role || !userId) return

  if (role === 'admin') {
    if (!userTeamId) {
      console.warn('❌ 管理者の team_id が未設定')
      router.push('/dashboard')
      return
    }

    const { data, error } = await supabase
      .from('players')
      .select('id, name, team_id')
      .eq('team_id', userTeamId)

    if (error || !data) return

    setPlayers(data)
    setSelectedPlayerId(data[0]?.id || '')
    return
  }

  // コーチ・選手
  if (!userTeamId) return

  const { data, error } = await supabase
    .from('players')
    .select('id, name, team_id')
    .eq('team_id', userTeamId)

  if (error || !data) return

  setPlayers(data)

  if (role === 'player') {
    setSelectedPlayerId(userId)
  } else {
    setSelectedPlayerId(data[0]?.id || '')
  }
}, [role, userId, userTeamId, router])

useEffect(() => {
  const fetchUserInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const localPlayerId =
      typeof window !== 'undefined' ? localStorage.getItem('playerId') : null

    // ✅ 選手：認証していないけどlocalStorageにIDがある
    if (localPlayerId) {
      const { data: player } = await supabase
        .from('players')
        .select('team_id')
        .eq('id', localPlayerId)
        .maybeSingle()

      if (player?.team_id) {
        setRole('player')
        setUserId(localPlayerId)
        setUserTeamId(player.team_id)
        console.log('👟 選手ログイン（非認証）:', {
          playerId: localPlayerId,
          teamId: player.team_id,
        })
        return
      }
    }

    // 🔐 認証済みユーザー（admin / coach）
    if (!user) {
      console.warn('❌ 非認証かつ playerId も未設定 → ロール不明')
      return
    }

    const userId = user.id
    setUserId(userId)

    // 🧢 コーチ判定
    const { data: team } = await supabase
      .from('teams')
      .select('id')
      .eq('coach_user_id', userId)
      .maybeSingle()

    if (team?.id) {
      setRole('coach')
      setUserTeamId(team.id)
      console.log('🧢 コーチログイン:', { userId, teamId: team.id })
      return
    }

    // 🛡 管理者判定
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (profile?.role === 'admin') {
      setRole('admin')
      console.log('🛡 管理者ログイン:', userId)
      return
    }

    console.warn('❌ ロールを特定できませんでした')
  }

  fetchUserInfo()
}, [])

useEffect(() => {
  if (role && userId) {
    fetchPlayers()
  }
}, [role, userId, userTeamId, fetchPlayers]) // ✅ ← ここが修正ポイント

useEffect(() => {
  const fetchBenchmark = async (cat: string, gender: string) => {
    const { data, error } = await supabase
      .from('benchmarks')
      .select('key, value')
      .eq('category', cat)
      .eq('gender', gender)
      .in('type', ['physical', 'body'])

    if (error) {
      console.error('❌ benchmarks取得エラー:', error)
      setBenchmarkData({})
      return
    }

    const map: Record<string, number> = {}
data?.forEach((row: { key: string; value: number }) => {
  map[row.key] = row.value
})

    setBenchmarkData(map)
  }

  // ✅ 選手がカテゴリーを選んだときに即 fetch を発火
  if (categoryValue && selectedGender) {
    fetchBenchmark(categoryValue, selectedGender)
  }
}, [categoryValue, selectedGender])

const fetchEvaluations = useCallback(async () => {
  console.log('🟢 fetchEvaluations 実行:', { role, userId, selectedPlayerId })
  if (!role || !userId) {
    console.warn('⛔️ ロールまたはユーザーIDが未定義のため中断:', { role, userId })
    return
  }

  const playerIdToFetch = role === 'player' ? userId : selectedPlayerId
  if (!playerIdToFetch) {
    console.warn('⛔️ playerIdToFetch が未定義のため中断')
    return
  }

  const { data, error } = await supabase
    .from('player_evaluations')
    .select('*')
    .eq('player_id', playerIdToFetch)
    .order('recorded_at', { ascending: false })

  if (error) {
    console.error('❌ データ取得エラー:', error)
    return
  }

  if (data && data.length > 0) {
    setEvaluations(data)
    setLatestData(data[0])

    const keys = [
      'distance_km', 'sprint_total_m', 'sprint_count', 'sprint_avg_m',
      'max_speed_kmh', 'accelerations', 'sprint_20m_sec', 'sprint_50m_sec',
      'yoyo_count', 'long_jump_cm', 'side_step_count', 'vertical_jump_cm',
      'triple_jump_cm', 'step_50s_count', 'sit_ups_30s',
      'pelvis_posture', 'leg_shape', 'foot_arch',
      'fingertip_floor_cm', 'heel_buttock_cm', 'thomas_test', 'slr_deg',
      'squat_form', 'shin_pain', 'heel_pain', 'pain_custom',
      'height_cm', 'weight_kg', 'bmi', 'body_fat_pct'
    ]

    const avg = Object.fromEntries(
      keys.map(k => {
        const vals = data.map(d => parseFloat(d[k])).filter(v => !isNaN(v))
        const total = vals.reduce((sum, v) => sum + v, 0)
        return [k, vals.length ? (total / vals.length).toFixed(1) : '-']
      })
    )

    setAvgData(avg)
  } else {
    setEvaluations([])
    setAvgData({})
  }
}, [role, userId, selectedPlayerId]) // ✅ 依存追加！

useEffect(() => {
  if (!selectedPlayerId) return
  fetchEvaluations()
}, [selectedPlayerId, fetchEvaluations]) // ✅ 完全対応

  const labelMap: Record<string, string> = {
    // フィジカル
    distance_km: '走行距離(km)',
    sprint_total_m: 'スプリント総距離(m)',
    sprint_count: 'スプリント回数',
    sprint_avg_m: 'スプリント平均距離(m)',
    max_speed_kmh: '最大速度(km/h)',
    accelerations: '加速回数',
    sprint_20m_sec: '20M走(秒)',
    sprint_50m_sec: '50M走(秒)',
    yoyo_count: 'YoYo回数',
    long_jump_cm: '立ち幅跳び(cm)',
    side_step_count: '反復横跳び(回)',
    vertical_jump_cm: '垂直跳び(cm)',
    triple_jump_cm: '三段跳び(cm)',
    step_50s_count: 'ステップ50秒(回)',
    sit_ups_30s: 'シットアップ30秒(回)',

    // メディカル
    pelvis_posture: '骨盤の傾き',
    leg_shape: '下肢アライメント',
    foot_arch: '足のアーチ',
    fingertip_floor_cm: '指床間距離(cm)',
    heel_buttock_cm: '踵臀間距離(cm)',
    thomas_test: 'トーマステスト',
    slr_deg: 'SLR角度(°)',
    squat_form: '片足スクワットタイプ',
    shin_pain: '脛骨圧痛',
    heel_pain: '踵圧痛',
    pain_custom: '痛みの自由入力',

    // 体格
    height_cm: '身長(cm)',
    weight_kg: '体重(kg)',
    bmi: 'BMI',
    body_fat_pct: '体脂肪率(%)'
  }

const sections = [
  {
    title: '試合分析データ',
    keys: [
      'distance_km',
      'sprint_total_m',
      'sprint_count',
      'sprint_avg_m',
      'max_speed_kmh',
      'accelerations'
    ]
  },
  {
    title: 'フィジカル',
    keys: [
      'sprint_20m_sec', 'sprint_50m_sec', 'yoyo_count',
      'long_jump_cm', 'side_step_count', 'vertical_jump_cm',
      'triple_jump_cm', 'step_50s_count', 'sit_ups_30s'
    ]
  },
  {
    title: 'メディカル',
    keys: [
      'pelvis_posture', 'leg_shape', 'foot_arch',
      'fingertip_floor_cm', 'heel_buttock_cm', 'thomas_test', 'slr_deg',
      'squat_form', 'shin_pain', 'heel_pain', 'pain_custom'
    ]
  },
  {
    title: '体格',
    keys: ['height_cm', 'weight_kg', 'bmi', 'body_fat_pct']
  }
]


const diffThresholds: Record<string, Record<string, Record<string, { good: number; try: number }>>> = {
  u12: {
    male: {
      distance_km: { good: 1.0, try: -1.0 },
      sprint_total_m: { good: 50.0, try: -50.0 },
      sprint_count: { good: 2.0, try: -2.0 },
      sprint_avg_m: { good: 0.5, try: -0.5 },
      max_speed_kmh: { good: 1.0, try: -1.0 },
      accelerations: { good: 2.0, try: -2.0 },
      sprint_20m_sec: { good: 0.2, try: -0.2 },
      sprint_50m_sec: { good: 0.3, try: -0.3 },
      yoyo_count: { good: 10.0, try: -10.0 },
      long_jump_cm: { good: 5.0, try: -5.0 },
      side_step_count: { good: 3.0, try: -3.0 },
      vertical_jump_cm: { good: 3.0, try: -3.0 },
      triple_jump_cm: { good: 5.0, try: -5.0 },
      step_50s_count: { good: 5.0, try: -5.0 },
      sit_ups_30s: { good: 2.0, try: -2.0 },
      height_cm: { good: 2.0, try: -2.0 },
      weight_kg: { good: 2.0, try: -2.0 },
      bmi: { good: 0.5, try: -0.5 },
      body_fat_pct: { good: 1.0, try: -1.0 },
    },
    female: {
      distance_km: { good: 1.0, try: -1.0 },
      sprint_total_m: { good: 50.0, try: -50.0 },
      sprint_count: { good: 2.0, try: -2.0 },
      sprint_avg_m: { good: 0.5, try: -0.5 },
      max_speed_kmh: { good: 1.0, try: -1.0 },
      accelerations: { good: 2.0, try: -2.0 },
      sprint_20m_sec: { good: 0.2, try: -0.2 },
      sprint_50m_sec: { good: 0.3, try: -0.3 },
      yoyo_count: { good: 10.0, try: -10.0 },
      long_jump_cm: { good: 5.0, try: -5.0 },
      side_step_count: { good: 3.0, try: -3.0 },
      vertical_jump_cm: { good: 3.0, try: -3.0 },
      triple_jump_cm: { good: 5.0, try: -5.0 },
      step_50s_count: { good: 5.0, try: -5.0 },
      sit_ups_30s: { good: 2.0, try: -2.0 },
      height_cm: { good: 2.0, try: -2.0 },
      weight_kg: { good: 2.0, try: -2.0 },
      bmi: { good: 0.5, try: -0.5 },
      body_fat_pct: { good: 1.0, try: -1.0 },
    },
  },
  u15: {
    male: {
      distance_km: { good: 0.8, try: -0.8 },
      sprint_total_m: { good: 40.0, try: -40.0 },
      sprint_count: { good: 1.6, try: -1.6 },
      sprint_avg_m: { good: 0.4, try: -0.4 },
      max_speed_kmh: { good: 0.8, try: -0.8 },
      accelerations: { good: 1.6, try: -1.6 },
      sprint_20m_sec: { good: 0.16, try: -0.16 },
      sprint_50m_sec: { good: 0.24, try: -0.24 },
      yoyo_count: { good: 8.0, try: -8.0 },
      long_jump_cm: { good: 4.0, try: -4.0 },
      side_step_count: { good: 2.4, try: -2.4 },
      vertical_jump_cm: { good: 2.4, try: -2.4 },
      triple_jump_cm: { good: 4.0, try: -4.0 },
      step_50s_count: { good: 4.0, try: -4.0 },
      sit_ups_30s: { good: 1.6, try: -1.6 },
      height_cm: { good: 1.6, try: -1.6 },
      weight_kg: { good: 1.6, try: -1.6 },
      bmi: { good: 0.4, try: -0.4 },
      body_fat_pct: { good: 0.8, try: -0.8 },
    },
    female: {
      distance_km: { good: 0.8, try: -0.8 },
      sprint_total_m: { good: 40.0, try: -40.0 },
      sprint_count: { good: 1.6, try: -1.6 },
      sprint_avg_m: { good: 0.4, try: -0.4 },
      max_speed_kmh: { good: 0.8, try: -0.8 },
      accelerations: { good: 1.6, try: -1.6 },
      sprint_20m_sec: { good: 0.16, try: -0.16 },
      sprint_50m_sec: { good: 0.24, try: -0.24 },
      yoyo_count: { good: 8.0, try: -8.0 },
      long_jump_cm: { good: 4.0, try: -4.0 },
      side_step_count: { good: 2.4, try: -2.4 },
      vertical_jump_cm: { good: 2.4, try: -2.4 },
      triple_jump_cm: { good: 4.0, try: -4.0 },
      step_50s_count: { good: 4.0, try: -4.0 },
      sit_ups_30s: { good: 1.6, try: -1.6 },
      height_cm: { good: 1.6, try: -1.6 },
      weight_kg: { good: 1.6, try: -1.6 },
      bmi: { good: 0.4, try: -0.4 },
      body_fat_pct: { good: 0.8, try: -0.8 },
    },
  },
  u18: {
    male: {
      distance_km: { good: 0.6, try: -0.6 },
      sprint_total_m: { good: 30.0, try: -30.0 },
      sprint_count: { good: 1.2, try: -1.2 },
      sprint_avg_m: { good: 0.3, try: -0.3 },
      max_speed_kmh: { good: 0.6, try: -0.6 },
      accelerations: { good: 1.2, try: -1.2 },
      sprint_20m_sec: { good: 0.12, try: -0.12 },
      sprint_50m_sec: { good: 0.18, try: -0.18 },
      yoyo_count: { good: 6.0, try: -6.0 },
      long_jump_cm: { good: 3.0, try: -3.0 },
      side_step_count: { good: 1.8, try: -1.8 },
      vertical_jump_cm: { good: 1.8, try: -1.8 },
      triple_jump_cm: { good: 3.0, try: -3.0 },
      step_50s_count: { good: 3.0, try: -3.0 },
      sit_ups_30s: { good: 1.2, try: -1.2 },
      height_cm: { good: 1.2, try: -1.2 },
      weight_kg: { good: 1.2, try: -1.2 },
      bmi: { good: 0.3, try: -0.3 },
      body_fat_pct: { good: 0.6, try: -0.6 },
    },
    female: {
      distance_km: { good: 0.6, try: -0.6 },
      sprint_total_m: { good: 30.0, try: -30.0 },
      sprint_count: { good: 1.2, try: -1.2 },
      sprint_avg_m: { good: 0.3, try: -0.3 },
      max_speed_kmh: { good: 0.6, try: -0.6 },
      accelerations: { good: 1.2, try: -1.2 },
      sprint_20m_sec: { good: 0.12, try: -0.12 },
      sprint_50m_sec: { good: 0.18, try: -0.18 },
      yoyo_count: { good: 6.0, try: -6.0 },
      long_jump_cm: { good: 3.0, try: -3.0 },
      side_step_count: { good: 1.8, try: -1.8 },
      vertical_jump_cm: { good: 1.8, try: -1.8 },
      triple_jump_cm: { good: 3.0, try: -3.0 },
      step_50s_count: { good: 3.0, try: -3.0 },
      sit_ups_30s: { good: 1.2, try: -1.2 },
      height_cm: { good: 1.2, try: -1.2 },
      weight_kg: { good: 1.2, try: -1.2 },
      bmi: { good: 0.3, try: -0.3 },
      body_fat_pct: { good: 0.6, try: -0.6 },
    },
  },
  pro: {
    male: {
      distance_km: { good: 0.5, try: -0.5 },
      sprint_total_m: { good: 25.0, try: -25.0 },
      sprint_count: { good: 1.0, try: -1.0 },
      sprint_avg_m: { good: 0.25, try: -0.25 },
      max_speed_kmh: { good: 0.5, try: -0.5 },
      accelerations: { good: 1.0, try: -1.0 },
      sprint_20m_sec: { good: 0.1, try: -0.1 },
      sprint_50m_sec: { good: 0.15, try: -0.15 },
      yoyo_count: { good: 5.0, try: -5.0 },
      long_jump_cm: { good: 2.5, try: -2.5 },
      side_step_count: { good: 1.5, try: -1.5 },
      vertical_jump_cm: { good: 1.5, try: -1.5 },
      triple_jump_cm: { good: 2.5, try: -2.5 },
      step_50s_count: { good: 2.5, try: -2.5 },
      sit_ups_30s: { good: 1.0, try: -1.0 },
      height_cm: { good: 1.0, try: -1.0 },
      weight_kg: { good: 1.0, try: -1.0 },
      bmi: { good: 0.25, try: -0.25 },
      body_fat_pct: { good: 0.5, try: -0.5 },
    },
    female: {
      distance_km: { good: 0.5, try: -0.5 },
      sprint_total_m: { good: 25.0, try: -25.0 },
      sprint_count: { good: 1.0, try: -1.0 },
      sprint_avg_m: { good: 0.25, try: -0.25 },
      max_speed_kmh: { good: 0.5, try: -0.5 },
      accelerations: { good: 1.0, try: -1.0 },
      sprint_20m_sec: { good: 0.1, try: -0.1 },
      sprint_50m_sec: { good: 0.15, try: -0.15 },
      yoyo_count: { good: 5.0, try: -5.0 },
      long_jump_cm: { good: 2.5, try: -2.5 },
      side_step_count: { good: 1.5, try: -1.5 },
      vertical_jump_cm: { good: 1.5, try: -1.5 },
      triple_jump_cm: { good: 2.5, try: -2.5 },
      step_50s_count: { good: 2.5, try: -2.5 },
      sit_ups_30s: { good: 1.0, try: -1.0 },
      height_cm: { good: 1.0, try: -1.0 },
      weight_kg: { good: 1.0, try: -1.0 },
      bmi: { good: 0.25, try: -0.25 },
      body_fat_pct: { good: 0.5, try: -0.5 },
    },
  },
  world: {
    male: {
      distance_km: { good: 0.4, try: -0.4 },
      sprint_total_m: { good: 20.0, try: -20.0 },
      sprint_count: { good: 0.8, try: -0.8 },
      sprint_avg_m: { good: 0.2, try: -0.2 },
      max_speed_kmh: { good: 0.4, try: -0.4 },
      accelerations: { good: 0.8, try: -0.8 },
      sprint_20m_sec: { good: 0.08, try: -0.08 },
      sprint_50m_sec: { good: 0.12, try: -0.12 },
      yoyo_count: { good: 4.0, try: -4.0 },
      long_jump_cm: { good: 2.0, try: -2.0 },
      side_step_count: { good: 1.2, try: -1.2 },
      vertical_jump_cm: { good: 1.2, try: -1.2 },
      triple_jump_cm: { good: 2.0, try: -2.0 },
      step_50s_count: { good: 2.0, try: -2.0 },
      sit_ups_30s: { good: 0.8, try: -0.8 },
      height_cm: { good: 0.8, try: -0.8 },
      weight_kg: { good: 0.8, try: -0.8 },
      bmi: { good: 0.2, try: -0.2 },
      body_fat_pct: { good: 0.4, try: -0.4 },
    },
    female: {
      distance_km: { good: 0.4, try: -0.4 },
      sprint_total_m: { good: 20.0, try: -20.0 },
      sprint_count: { good: 0.8, try: -0.8 },
      sprint_avg_m: { good: 0.2, try: -0.2 },
      max_speed_kmh: { good: 0.4, try: -0.4 },
      accelerations: { good: 0.8, try: -0.8 },
      sprint_20m_sec: { good: 0.08, try: -0.08 },
      sprint_50m_sec: { good: 0.12, try: -0.12 },
      yoyo_count: { good: 4.0, try: -4.0 },
      long_jump_cm: { good: 2.0, try: -2.0 },
      side_step_count: { good: 1.2, try: -1.2 },
      vertical_jump_cm: { good: 1.2, try: -1.2 },
      triple_jump_cm: { good: 2.0, try: -2.0 },
      step_50s_count: { good: 2.0, try: -2.0 },
      sit_ups_30s: { good: 0.8, try: -0.8 },
      height_cm: { good: 0.8, try: -0.8 },
      weight_kg: { good: 0.8, try: -0.8 },
      bmi: { good: 0.2, try: -0.2 },
      body_fat_pct: { good: 0.4, try: -0.4 },
    },
  },
};

function getEvaluationLabel(
  diff: number,
  thresholds: { good: number; try: number }
): 'Good' | 'Ave' | 'Try' {
  if (diff >= thresholds.good) return 'Good'
  if (diff <= thresholds.try) return 'Try'
  return 'Ave'
}

const getDiff = (key: string) => {
  const latestVal = parseFloat(String(latestData?.[key]))
const benchVal = parseFloat(String(benchmarkData?.[key]))
  if (!isNaN(latestVal) && !isNaN(benchVal)) {
    const diff = (latestVal - benchVal).toFixed(1)
    return diff === '0.0' ? '±0.0' : (parseFloat(diff) > 0 ? `+${diff}` : diff)
  }
  return '-'
}

const getRawDiff = (key: string): number | null => {
  const latestVal = parseFloat(String(latestData?.[key]))
const benchVal = parseFloat(String(benchmarkData?.[key]))
  if (!isNaN(latestVal) && !isNaN(benchVal)) {
    return parseFloat((latestVal - benchVal).toFixed(1))
  }
  return null
}

console.log('📦 benchmarkData:', benchmarkData)
console.log('🟢 keys:', Object.keys(benchmarkData))
console.log('🐛 selectedPlayerId:', selectedPlayerId)

if (!selectedPlayerId) {
  return (
    <main className={styles.container}>
      <h1 className={styles.pageTitle}>評価データの確認</h1>

      {players.length > 0 ? (
        <>
          <div className={styles.selector}>
            <label>選手を選択:</label>
            <select
              value={selectedPlayerId}
              onChange={e => setSelectedPlayerId(e.target.value)}
            >
              <option value="">--選択してください--</option>
              {players.map(player => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </div>

          <p style={{ padding: '1rem', color: 'gray' }}>
            評価データを確認するには、選手を選択してください。
          </p>
        </>
      ) : (
        <>
          <p style={{ padding: '1rem', color: 'gray' }}>
            現在、あなたの選手データが見つかりません。
          </p>
          <button
            onClick={() => router.push('/player/dashboard')}
            className={styles.backButton}
          >
            ← ダッシュボードに戻る
          </button>
        </>
      )}
    </main>
  )
}

return (
  <main className={styles.container}>
    <h1 className={styles.pageTitle}>評価データの確認</h1>

<div className={styles.selector}>
  <label>比較基準カテゴリー:</label>
  <select
    value={selectedCategory}
    onChange={e => {
      const value = e.target.value
      setSelectedCategory(value)

      const categoryMap: Record<string, { categoryValue: string; gender: string }> = {
        'U-12男子': { categoryValue: 'u12', gender: 'male' },
        'U-12女子': { categoryValue: 'u12', gender: 'female' },
        'U-15男子': { categoryValue: 'u15', gender: 'male' },
        'U-15女子': { categoryValue: 'u15', gender: 'female' },
        'U-18男子': { categoryValue: 'u18', gender: 'male' },
        'U-18女子': { categoryValue: 'u18', gender: 'female' },
        'プロ男子': { categoryValue: 'pro', gender: 'male' },
        'プロ女子': { categoryValue: 'pro', gender: 'female' },
        '世界男子': { categoryValue: 'world', gender: 'male' },
        '世界女子': { categoryValue: 'world', gender: 'female' }
      }

      const mapping = categoryMap[value]
      if (mapping) {
        setCategoryValue(mapping.categoryValue)
        setSelectedGender(mapping.gender)
        console.log('✅ 分解結果:', mapping.categoryValue, mapping.gender)
      } else {
        setCategoryValue('')
        setSelectedGender('')
        console.log('⚠️ 分解失敗')
      }
    }}
  >
    <option value="">--選択してください--</option>
    <option value="U-12男子">U-12男子</option>
    <option value="U-12女子">U-12女子</option>
    <option value="U-15男子">U-15男子</option>
    <option value="U-15女子">U-15女子</option>
    <option value="U-18男子">U-18男子</option>
    <option value="U-18女子">U-18女子</option>
    <option value="プロ男子">プロ男子</option>
    <option value="プロ女子">プロ女子</option>
    <option value="世界男子">世界男子</option>
    <option value="世界女子">世界女子</option>
  </select>
</div>

 {latestData && (
<>
<div className={styles.card}>
<h2 className={styles.cardTitle}>
  平均値と直近の比較<br />
  <span className={styles.cardTitleSub}>（{latestData.recorded_at} 時点）</span>
</h2>
</div>

{sections.map(section => (
  <div key={section.title} className={styles.card}>
    <h3 className={styles.cardSubtitle}>{section.title}</h3>
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>項目</th>
            <th>平均</th>
            <th>直近</th>
            <th>基準</th>
            <th>差分</th>
            <th>評価</th>
          </tr>
        </thead>
        <tbody>

{section.keys.map(key => {
  // 保護条件：categoryValue または selectedGender が未定義なら return
  if (!categoryValue || !selectedGender) {
    return (
      <tr key={key}>
        <td>{labelMap[key] || key}</td>
        <td>{avgData[key] ?? '-'}</td>
        <td>{latestData?.[key] ?? '-'}</td>
        <td>{benchmarkData?.[key] ?? '-'}</td>
        <td>{getDiff(key)}</td>
        <td>-</td>
      </tr>
    )
  }

  const rawDiff = getRawDiff(key)
  const thresholds = diffThresholds[categoryValue]?.[selectedGender]?.[key]
  const label = rawDiff !== null && thresholds ? getEvaluationLabel(rawDiff, thresholds) : '-'

  return (
    <tr key={key}>
      <td>{labelMap[key] || key}</td>
      <td>{avgData[key] ?? '-'}</td>
      <td>{latestData?.[key] ?? '-'}</td>
      <td>{benchmarkData?.[key] ?? '-'}</td>
      <td>{getDiff(key)}</td>
      <td>
        <span className={`${styles.label} ${styles[label.toLowerCase()]}`}>
          {label}
        </span>
      </td>
    </tr>
  )
})}
        </tbody>
      </table>
    </div>
  </div>
))}

<div className={styles.card}>
  <h3 className={styles.cardSubtitle}>過去の評価データ</h3>
  <div className={styles.tableWrapper}>
    <table className={styles.table}>
      <thead>
        <tr>
          <th>記録日</th>
          {Object.keys(labelMap).map(key => (
            <th key={`head-${key}`}>{labelMap[key]}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {evaluations.map((record) => (
          <tr key={`${record.recorded_at}-${record.id}`}>
            <td>{record.recorded_at}</td>
            {Object.keys(labelMap).map((key) => (
              <td key={`cell-${record.id}-${key}`}>
                {record[key] ?? '-'}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
      </>
    )}
<button
  onClick={() => router.push('/player/dashboard')}
  className={styles.backButton}
>
  ← ダッシュボードに戻る
</button>
</main>
)
}