'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

export default function TeamCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      // セッションの復元
      await supabase.auth.getSession()
      await supabase.auth.getUser()

      // 無条件でチーム登録ページへ遷移
      router.push('/team/register')
    }

    handleCallback()
  }, [router])

  return (
    <main style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>認証確認中...</h1>
    </main>
  )
}
