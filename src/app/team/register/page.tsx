'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import styles from './page.module.css'

export default function TeamRegisterPage() {
  const [teamName, setTeamName] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  // ✅ 認証チェック（ページ表示直後に実行）
  useEffect(() => {
    const checkSession = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData.session

      if (!session || !session.user) {
        console.warn('❌ 未ログイン → /team/login に遷移')
        router.push('/team/login')
      }
    }

    checkSession()
  }, [router])

  const handleRegister = async () => {
    setMessage('登録中...')

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('❌ ユーザー取得失敗:', userError)
      setMessage('ログイン情報の取得に失敗しました')
      return
    }

    console.log('✅ ユーザーID:', user.id)

    // チーム登録
    const { error: teamError } = await supabase.from('teams').insert({
      name: teamName,
      coach_user_id: user.id,
      created_at: new Date().toISOString()
    })

    if (teamError) {
      console.error('❌ チーム登録失敗:', teamError)
      setMessage('チーム登録に失敗しました')
      return
    }

    // 登録したチーム情報を再取得（coach_user_idで検索）
    const { data: teamData, error: fetchError } = await supabase
      .from('teams')
      .select('id')
      .eq('coach_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    const team = teamData?.[0]

    if (fetchError || !team) {
      console.error('❌ チーム情報取得失敗:', fetchError)
      setMessage('チーム情報の取得に失敗しました')
      return
    }

    console.log('✅ チーム登録成功:', team)

    setMessage('登録完了！ログイン画面に移動します...')
    setTimeout(() => router.push('/team/login'), 1500)
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.heading}>チーム情報の登録</h1>
      <input
        className={styles.input}
        type="text"
        placeholder="チーム名（例：南中サッカー部）"
        value={teamName}
        onChange={(e) => setTeamName(e.target.value)}
      />
      <button className={styles.button} onClick={handleRegister}>
        登録する
      </button>
      <p className={styles.message}>{message}</p>
    </main>
  )
}