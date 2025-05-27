'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import styles from './page.module.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

 const handleLogin = async () => {
  setMessage('ログイン中...')
  console.log('📩 ログイン処理開始')

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    console.error('❌ 認証エラー:', error.message)
    setMessage('ログインに失敗しました')
    return
  }

  // セッション書き込みの猶予
  await new Promise((res) => setTimeout(res, 300))

  // ユーザー情報を取得
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    setMessage('ユーザー取得に失敗しました')
    return
  }

  // user_profiles を取得して role に応じて遷移
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    console.error('❌ プロフィール取得エラー:', profileError?.message)
    setMessage('ユーザープロフィールの取得に失敗しました')
    return
  }

  console.log('✅ 認証成功 / ロール:', profile.role)

  // ✅ ログイン時にまずplayerIdをクリア（全ロール共通）
  localStorage.removeItem('playerId')

  if (profile.role === 'admin') {
    router.push('/dashboard')
  } else if (profile.role === 'player') {
    // ✅ 選手のIDをlocalStorageに保存（将来的にsupabase.user.idが選手と紐づいている前提）
    localStorage.setItem('playerId', user.id)
    router.push('/player/home') // 選手用トップページへ
  } else {
    setMessage('不明なユーザー種別です')
  }
}

  return (
    <main className={styles.container}>
      <h1 className={styles.heading}>管理者用ログイン</h1>

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
