'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import styles from './page.module.css'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'

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
  const positionOrder = useMemo(() => ['GK', 'DF', 'MF', 'FW'], [])
  const [teamId, setTeamId] = useState<string | null>(null)

  const sortPlayers = useCallback((players: Player[]) => {
    return [...players].sort((a, b) => {
      const posA = positionOrder.indexOf(a.position)
      const posB = positionOrder.indexOf(b.position)
      const aNum = a.uniform_number ?? Infinity
      const bNum = b.uniform_number ?? Infinity

      return posA !== posB ? posA - posB : aNum - bNum
    })
  }, [positionOrder])

useEffect(() => {
  const fetchPlayers = async () => {
    if (!teamId) return // ✅ teamIdが取得されるまでは実行しない

    const { data, error } = await supabase
      .from('players')
      .select('id, name, position, birth_date, uniform_number, height, weight')
      .eq('team_id', teamId) // ✅ ここが追加ポイント！

    if (error) {
      console.error('取得エラー:', error)
    } else {
      const sorted = sortPlayers(data)
      setPlayers(sorted)
    }
  }

  fetchPlayers()
}, [sortPlayers, teamId]) // ✅ teamId が変わった時にも再取得

  const calculateAge = (birthDate: string) => {
    return dayjs().diff(dayjs(birthDate), 'year')
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

    console.log('📝 保存する内容:', editedPlayer)

    const updateData = { ...editedPlayer }

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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // ✅ 1. user_profiles に存在するなら「管理者」とみなす
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role === 'admin') {
      const selectedTeamId = localStorage.getItem('selectedTeamId')
      if (selectedTeamId) {
        setTeamId(selectedTeamId)
        setAuthorized(true)
      } else {
        router.push('/dashboard')
      }
      return
    }

    // ✅ 2. 管理者ではなかった場合（＝user_profiles に存在しない）→ コーチ扱いで teams を照合
    const { data: team } = await supabase
      .from('teams')
      .select('id')
      .eq('coach_user_id', user.id)
      .maybeSingle()

    if (team?.id) {
      setTeamId(team.id)
      setAuthorized(true)
    } else {
      router.push('/dashboard')
    }
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
