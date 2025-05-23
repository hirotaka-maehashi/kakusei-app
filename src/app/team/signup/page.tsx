'use client'

import { useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import styles from './page.module.css'

export default function TeamSignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')

  const handleSignup = async () => {
    setMessage('登録中...')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL}/team/callback`
      }
    })

    if (error || !data.user) {
      setMessage('サインアップに失敗しました')
      return
    }

    setMessage('登録完了！確認メールをご確認ください')
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.heading}>チームアカウント作成</h1>

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

      <button className={styles.button} onClick={handleSignup}>
        登録する
      </button>

      <p className={styles.message}>{message}</p>
    </main>
  )
}