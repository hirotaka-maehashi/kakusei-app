'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import styles from './page.module.css'

export default function PlayerRegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [authorized, setAuthorized] = useState(false)

  const [form, setForm] = useState({
    name: '',
    team_name: '',
    uniform_number: '',
    position: '',
    birth_date: '',
    height: '',
    weight: '',
    login_id: '',
    password: '',
    confirmPassword: '',
  })

  const [message, setMessage] = useState('')

useEffect(() => {
  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // ✅ 念のためプレイヤーIDは除去
    localStorage.removeItem('playerId')

    // ✅ まず user_profiles.role で管理者判定
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role === 'admin') {
      setAuthorized(true)
      return
    }

    // ✅ 次に teams.coach_user_id でコーチ判定
    const { data: team } = await supabase
      .from('teams')
      .select('id')
      .eq('coach_user_id', user.id)
      .maybeSingle()

    if (team) {
      setAuthorized(true)
      return
    }

    // ❌ どちらでもなければ弾く
    router.push('/dashboard')
  }

  checkAuth()
}, [router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (form.password !== form.confirmPassword) {
      setMessage('パスワードが一致しません')
      return
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!user || userError) {
      setMessage('ログイン情報が取得できませんでした')
      return
    }

    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('coach_user_id', user.id)
      .single()

    if (teamError || !teamData) {
      console.error('チーム取得エラー:', teamError)
      setMessage('チーム情報の取得に失敗しました')
      return
    }

    const teamId = teamData.id
    const hashedPassword = await bcrypt.hash(form.password, 10)

    const playerData = {
      name: form.name,
      team_id: teamId,
      uniform_number: Number(form.uniform_number),
      position: form.position,
      birth_date: form.birth_date,
      height: Number(form.height),
      weight: Number(form.weight),
      login_id: form.login_id,
      password_hash: hashedPassword,
      user_id: null,
    }

    console.log('📦 登録送信データ:', playerData)

    const { error } = await supabase.from('players').insert(playerData)

    if (error) {
      console.error('❌ 登録エラー:', error.message)
      setMessage('登録に失敗しました')
    } else {
      setMessage('✅ 登録が完了しました')
      setTimeout(() => router.push('/admin/players/list'), 1000)
    }
  }

  if (!authorized) return <p className={styles.message}>読み込み中...</p>

  return (
    <main className={styles.container}>
      <h1 className={styles.heading}>選手登録</h1>
      <form onSubmit={handleSubmit}>
        <input className={styles.input} name="name" placeholder="氏名" value={form.name} onChange={handleChange} required />
        <input className={styles.input} name="uniform_number" type="number" placeholder="背番号" value={form.uniform_number} onChange={handleChange} required />
        <select className={styles.input} name="position" value={form.position} onChange={handleChange} required>
          <option value="">ポジションを選択</option>
          <option value="GK">GK（ゴールキーパー）</option>
          <option value="DF">DF（ディフェンダー）</option>
          <option value="MF">MF（ミッドフィルダー）</option>
          <option value="FW">FW（フォワード）</option>
          </select><label className={styles.label}>生年月日を入力してください
          <input
           className={styles.input}name="birth_date"type="date"value={form.birth_date}onChange={handleChange}required
           />
          </label>
        <input className={styles.input} name="height" type="number" placeholder="身長(cm)" value={form.height} onChange={handleChange} required />
        <input className={styles.input} name="weight" type="number" placeholder="体重(kg)" value={form.weight} onChange={handleChange} required />
        <input className={styles.input} name="login_id" placeholder="ログインID" value={form.login_id} onChange={handleChange} required />

        <div className={styles.passwordWrapper}>
          <input className={styles.input} name="password" type={showPassword ? 'text' : 'password'} placeholder="パスワード" value={form.password} onChange={handleChange} required />
          <button type="button" className={styles.eyeButton} onClick={() => setShowPassword(!showPassword)}>表示切替</button>
        </div>

        <div className={styles.passwordWrapper}>
          <input className={styles.input} name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="パスワード（確認）" value={form.confirmPassword} onChange={handleChange} required />
          <button type="button" className={styles.eyeButton} onClick={() => setShowConfirmPassword(!showConfirmPassword)}>表示切替</button>
        </div>

        <button className={styles.button} type="submit">登録する</button>
      </form>

      <button className={styles.backButton} onClick={() => router.push('/dashboard')}>
        ← ダッシュボードに戻る
      </button>

      {message && <p className={styles.message}>{message}</p>}
    </main>
  )
}
