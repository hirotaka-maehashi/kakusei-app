'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import styles from './page.module.css'

export default function AdminRegisterPage() {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleRegister = async () => {
    setMessage('登録中...')

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      setMessage('ユーザー情報の取得に失敗しました')
      return
    }

    const { error: insertError } = await supabase.from('user_profiles').insert({
      id: user.id,
      role: 'admin',
      name: name,
      created_at: new Date().toISOString()
    })

    if (insertError) {
      setMessage('登録に失敗しました')
      return
    }

    setMessage('登録完了！ログインページに移動します...')
    setTimeout(() => router.push('/login'), 1500)
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.heading}>管理者登録</h1>
      <input
        className={styles.input}
        type="text"
        placeholder="あなたの名前"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button className={styles.button} onClick={handleRegister}>
        登録する
      </button>
      <p className={styles.message}>{message}</p>
    </main>
  )
}
