'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleAuth = async () => {
      // ハッシュに含まれるアクセストークンをもとにセッションを復元
      await supabase.auth.getSession()

      // セッションが復元されたら login へリダイレクト
      router.push('/login')
    }

    handleAuth()
  }, [router])

  return (
    <main style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>認証確認中...</h1>
    </main>
  )
}
