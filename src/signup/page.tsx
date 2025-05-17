'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import styles from './signup.module.css'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleSignup = async () => {
    setMessage('登録中...')

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })

    if (error || !data.user) {
      setMessage('サインアップに失敗しました')
      return
    }

    const { error: profileError } = await supabase.from('user_profiles').insert({
      id: data.user.id,
      role: 'admin'
    })

    if (profileError) {
      setMessage('ロール登録に失敗しました')
      return
    }

    setMessage('登録完了！')
    router.push('/dashboard')
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.heading}>管理者サインアップ</h1>
      <input
        className={styles.input}
        type="email"
        placeholder="メールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className={styles.input}
        type="password"
        placeholder="パスワード"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className={styles.button} onClick={handleSignup}>
        登録する
      </button>
      <p className={styles.message}>{message}</p>
    </main>
  )
}
