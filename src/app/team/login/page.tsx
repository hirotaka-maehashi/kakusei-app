'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import styles from './page.module.css'

export default function TeamLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleLogin = async () => {
    setMessage('ログイン中...')
    console.log('📩 チームログイン処理開始')

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) {
      console.error('❌ ログインエラー:', loginError.message)
      setMessage('ログインに失敗しました')
      return
    }

    // 少し待ってセッション確定
    await new Promise((res) => setTimeout(res, 300))

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('❌ ユーザー取得失敗:', userError?.message)
      setMessage('ユーザー情報の取得に失敗しました')
      return
    }

    // チーム情報の有無確認（coach_user_id 経由）
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('coach_user_id', user.id)
      .maybeSingle()

    if (teamError) {
      console.error('❌ チーム取得エラー:', teamError.message)
      setMessage('チーム情報の取得に失敗しました')
      return
    }

    if (!teamData) {
      console.warn('⚠️ チーム未登録 → /team/register へ')
      router.push('/team/register')
      return
    }

    console.log('✅ チーム確認成功 → /dashboard へ遷移')
    router.push('/dashboard')
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.heading}>チームログイン</h1>

      <input
        className={styles.input}
        type="email"
        placeholder="メールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <div className={styles.passwordWrapper}>
        <input
          className={styles.input}
          type={showPassword ? 'text' : 'password'}
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="button"
          className={styles.eyeButton}
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? (
            // Eye-off icon
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5.33 0-9.8-3.46-11-8 0-1.17.38-2.27 1-3.2M1 1l22 22" />
            </svg>
          ) : (
            // Eye icon
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M1 12C1 12 5 5 12 5s11 7 11 7-4 7-11 7S1 12 1 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>

      <button className={styles.button} onClick={handleLogin}>
        ログインする
      </button>

      <p className={styles.message}>{message}</p>
    </main>
  )
}