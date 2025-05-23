'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import styles from './page.module.css'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'

type Player = {
  id: string
  name: string
  position: string
  birth_date: string
  uniform_number: number | null
  height: number | null
  weight: number | null
}

export default function PlayerListPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editedPlayer, setEditedPlayer] = useState<Partial<Player>>({})
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .from('players')
        .select('id, name, position, birth_date, uniform_number, height, weight')

      if (error) {
        console.error('取得エラー:', error)
      } else {
        const sorted = sortPlayers(data)
        setPlayers(sorted)
      }
    }

    fetchPlayers()
  }, [])

  const calculateAge = (birthDate: string) => {
    return dayjs().diff(dayjs(birthDate), 'year')
  }

  const positionOrder = ['GK', 'DF', 'MF', 'FW']

const sortPlayers = (players: Player[]) => {
  return [...players].sort((a, b) => {
    const posA = positionOrder.indexOf(a.position)
    const posB = positionOrder.indexOf(b.position)
    const aNum = a.uniform_number ?? Infinity
    const bNum = b.uniform_number ?? Infinity

    return posA !== posB ? posA - posB : aNum - bNum
  })
}

  const startEdit = (player: Player) => {
    setEditingId(player.id)
    setEditedPlayer(player)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditedPlayer({})
  }

const handleSave = async () => {
  if (!editingId) return

  // ログで事前確認
  console.log('📝 保存する内容（before trim）:', editedPlayer)

  // idを除外したオブジェクトを作成
  const { id, ...updateData } = editedPlayer

  console.log('📤 Supabaseに送る内容:', updateData)

  const { data, error } = await supabase
    .from('players')
    .update(updateData)
    .eq('id', editingId)
    .select()

  if (error) {
    alert('保存に失敗しました')
    console.error('更新エラー:', error)
    return
  }

  console.log('✅ Supabase 更新成功:', data)

  setPlayers(prev =>
    prev.map(p => (p.id === editingId ? { ...p, ...updateData } as Player : p))
  )

  setEditingId(null)
  setEditedPlayer({})
}

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('本当に削除しますか？')
    if (!confirmed) return

    const { error } = await supabase.from('players').delete().eq('id', id)
    if (error) {
      alert('削除に失敗しました')
      console.error('削除エラー:', error)
    } else {
      setPlayers(players.filter(p => p.id !== id))
    }
  }

useEffect(() => {
  const checkAccess = async () => {
    const playerId = typeof window !== 'undefined' ? localStorage.getItem('playerId') : null
    const { data: { user }, error } = await supabase.auth.getUser()

    // ✅ 認証なし・playerId もなし → 弾く
    if (!user && !playerId) {
      router.push('/login')
      return
    }

    // ✅ 管理者チェック
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user?.id || '')
      .maybeSingle()

    if (profile?.role === 'admin') {
      setAuthorized(true)
      setRole('admin')
      return
    }

    // ✅ コーチチェック
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('coach_user_id', user?.id || '')
      .maybeSingle()

    if (team && !teamError) {
      setAuthorized(true)
      setRole('coach')
      return
    }

    // ✅ 選手チェック：localStorage に playerId がある場合も許可
    if (playerId) {
      setAuthorized(true)
      setRole('player')
      return
    }

    // ❌ どれにも該当しなければダッシュボードに戻す
    router.push('/dashboard')
  }

  checkAccess()
}, [router])


if (!authorized) {
  return <p style={{ padding: '2rem' }}>アクセス確認中...</p>
}


return (
  <main className={styles.container}>
    <h1 className={styles.heading}>選手一覧</h1>

    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>氏名</th>
            <th>背番号</th>
            <th>ポジション</th>
            <th>年齢</th>
            <th>身長</th>
            <th>体重</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr key={player.id}>
              <td>
                {editingId === player.id ? (
                  <input
                    value={editedPlayer.name || ''}
                    onChange={e =>
                      setEditedPlayer({ ...editedPlayer, name: e.target.value })
                    }
                  />
                ) : (
                  player.name
                )}
              </td>
              <td>
                {editingId === player.id ? (
                  <input
                    type="number"
                    value={editedPlayer.uniform_number ?? ''}
                    onChange={e => {
                      const input = e.target.value
                      setEditedPlayer(prev => ({
                        ...prev,
                        uniform_number: input === '' ? null : Number(input)
                      }))
                    }}
                  />
                ) : (
                  player.uniform_number
                )}
              </td>
              <td>
                {editingId === player.id ? (
                  <select
                    value={editedPlayer.position || ''}
                    onChange={e =>
                      setEditedPlayer({ ...editedPlayer, position: e.target.value })
                    }
                  >
                    <option value="">選択</option>
                    <option value="GK">GK</option>
                    <option value="DF">DF</option>
                    <option value="MF">MF</option>
                    <option value="FW">FW</option>
                  </select>
                ) : (
                  player.position
                )}
              </td>
              <td>{calculateAge(player.birth_date)}</td>
              <td>
                {editingId === player.id ? (
                  <input
                    type="number"
                    value={editedPlayer.height ?? ''}
                    onChange={e => {
                      const input = e.target.value
                      setEditedPlayer(prev => ({
                        ...prev,
                        height: input === '' ? null : Number(input)
                      }))
                    }}
                  />
                ) : (
                  `${player.height ?? '-'} cm`
                )}
              </td>
              <td>
                {editingId === player.id ? (
                  <input
                    type="number"
                    value={editedPlayer.weight ?? ''}
                    onChange={e => {
                      const input = e.target.value
                      setEditedPlayer(prev => ({
                        ...prev,
                        weight: input === '' ? null : Number(input)
                      }))
                    }}
                  />
                ) : (
                  `${player.weight ?? '-'} kg`
                )}
              </td>
              <td style={{ whiteSpace: 'nowrap' }}>
                {editingId === player.id ? (
                  <>
                    <button
                      className={`${styles.actionButton} ${styles.saveButton}`}
                      onClick={handleSave}
                    >
                      保存
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.cancelButton}`}
                      onClick={cancelEdit}
                    >
                      キャンセル
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className={`${styles.actionButton} ${styles.editButton}`}
                      onClick={() => startEdit(player)}
                    >
                      編集
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.deleteButton}`}
                      onClick={() => handleDelete(player.id)}
                    >
                      削除
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <button className={styles.backButton} onClick={() => router.push('/dashboard')}>
      ← ダッシュボードに戻る
    </button>
  </main>
)
}
