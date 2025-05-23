'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './page.module.css'
import bcrypt from 'bcryptjs'

export default function PlayerLoginPage() {
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async () => {
    setError('')

    if (!loginId || !password) {
      setError('ログインIDとパスワードを入力してください')
      return
    }

    console.log('🟡 入力された loginId:', loginId)

    const { data: player, error: fetchError } = await supabase
      .from('players')
      .select('id, login_id, password_hash')
      .eq('login_id', loginId)
      .maybeSingle()

    console.log('📦 Supabaseから取得した player:', player)
    console.log('⚠️ Supabaseからの fetchError:', fetchError)

    if (fetchError) {
      console.error('❌ fetchエラー:', fetchError)
      setError('接続エラーが発生しました')
      return
    }

    if (!player) {
      console.warn('⚠️ 該当する選手が見つかりません')
      setError('ログインIDが無効です')
      return
    }

    if (!player.password_hash) {
      console.warn('⚠️ パスワードが未設定です')
      setError('パスワード未設定です。管理者に連絡してください')
      return
    }

    console.log('🔐 比較するハッシュ:', player.password_hash)
    console.log('🔐 入力されたパスワード:', password)

    const match = await bcrypt.compare(password, player.password_hash)

    console.log('🔐 パスワード照合結果:', match)

    if (!match) {
      setError('パスワードが正しくありません')
      return
    }
    
    localStorage.setItem('playerId', player.id)
    console.log('✅ ログイン成功 → ダッシュボードへ遷移')
    router.push('/dashboard')
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>選手ログイン</h1>

      <div className={styles.formGroup}>
        <label>ログインID</label>
        <input
          type="text"
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          className={styles.input}
        />
      </div>

      <div className={styles.formGroup}>
        <label>パスワード</label>
        <div className={styles.passwordWrapper}>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
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
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <button onClick={handleLogin} className={styles.button}>
        ログイン
      </button>
    </main>
  )
}
