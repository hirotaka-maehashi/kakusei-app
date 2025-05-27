'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

export default function TeamCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      // セッションの復元
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData.session

      // ✅ 認証チェック
      if (!session || !session.user) {
        console.warn('❌ セッションなし → /team/login に戻します')
        router.push('/team/login')
        return
      }

      // ✅ 認証OK → チーム登録ページへ進む
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
