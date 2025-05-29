'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import styles from './page.module.css'

export default function TeamRegisterPage() {
  const [teamName, setTeamName] = useState('')
  const [selectedTrainerId, setSelectedTrainerId] = useState('')
  const [trainers, setTrainers] = useState<{ id: string; name: string }[]>([])
  const [message, setMessage] = useState('')
  const router = useRouter()

  // ✅ 認証チェック
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

  // ✅ 管理者（トレーナー）一覧を取得
  useEffect(() => {
    const fetchTrainers = async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, name')
        .eq('role', 'admin')

      if (error) {
        console.error('❌ トレーナー一覧取得失敗:', error)
      } else {
        setTrainers(data)
      }
    }

    fetchTrainers()
  }, [])

  const handleRegister = async () => {
    if (!teamName) {
      setMessage('チーム名を入力してください')
      return
    }

    if (!selectedTrainerId) {
      setMessage('トレーナー（管理者）を選択してください')
      return
    }

    setMessage('登録中...')

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('❌ ユーザー取得失敗:', userError)
      setMessage('ログイン情報の取得に失敗しました')
      return
    }

    console.log('✅ ログインユーザーID（監督/コーチ）:', user.id)

    // ✅ チーム登録：監督/コーチは作成者、トレーナーは trainer_id として保存
    const { error: teamError } = await supabase.from('teams').insert({
      name: teamName,
      coach_user_id: user.id,
      trainer_id: selectedTrainerId,
      created_at: new Date().toISOString()
    })

    if (teamError) {
      console.error('❌ チーム登録失敗:', teamError)
      setMessage('チーム登録に失敗しました')
      return
    }

    setMessage('登録完了！ログイン画面に移動します...')
    setTimeout(() => router.push('/team/login'), 1500)
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.heading}>チーム情報の登録</h1>

      <input
        className={styles.input}
        type="text"
        placeholder="チーム名（例：〇〇サッカークラブ）"
        value={teamName}
        onChange={(e) => setTeamName(e.target.value)}
      />

      <select
        className={styles.select}
        value={selectedTrainerId}
        onChange={(e) => setSelectedTrainerId(e.target.value)}
      >
        <option value="">-- 担当トレーナー（管理者）を選択 --</option>
        {trainers.map(trainer => (
          <option key={trainer.id} value={trainer.id}>
            {trainer.name}
          </option>
        ))}
      </select>

      <button className={styles.button} onClick={handleRegister}>
        登録する
      </button>

      <p className={styles.message}>{message}</p>
    </main>
  )
}
