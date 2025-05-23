'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleAuth = async () => {
      // セッション復元（ここで復元されることでその後の認証に影響）
      await supabase.auth.getSession()
      await supabase.auth.getUser() // 一応呼ぶだけ呼んでおく

      // 無条件で管理者登録ページへ
      router.push('/admin/register')
    }

    handleAuth()
  }, [router])

  return (
    <main style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>認証確認中...</h1>
    </main>
  )
}
