'use client'

import styles from './page.module.css'

export default function Home() {
  return (
    <div className={styles.page}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.overlay}>
          <h1 className={styles.title}>自分を、超えろ。</h1>
          <p className={styles.subtitle}>すべてのプレーが、成長のデータになる。</p>
          <a href="#cta" className={styles.ctaButton}>今すぐ無料相談</a>
        </div>
      </section>

      {/* 地域課題セクション */}
      <section className={styles.blockWhite}>
        <div className={styles.container}>
          <h2>地域育成の課題</h2>
          <p>
            少子化・指導者不足・観戦機会の減少。<br />
            「頑張っても見てもらえない」環境を変えなければなりません。
          </p>
        </div>
      </section>

      {/* 現場課題セクション */}
      <section className={styles.blockGray}>
        <div className={styles.container}>
          <h2>育成現場の限界</h2>
          <p>
            練習も試合も記録が残らない。<br />
            指導も感覚頼りでは、子どもたちの変化を捉えきれません。
          </p>
        </div>
      </section>

      {/* 解決策セクション */}
      <section className={styles.blockWhite}>
        <div className={styles.container}>
          <h2>映像 × GPS × データ</h2>
          <p>
            プレーデータを数値で見える化。<br />
            走行距離、スプリント、最大速度、心拍数まで自動記録。
          </p>
        </div>
      </section>

      {/* 信頼性セクション */}
      <section className={styles.blockNavy}>
        <div className={styles.container}>
          <h2>JFA × Veo</h2>
          <p>
            日本サッカー協会もVeoと連携し、育成の未来に本気で挑んでいます。<br />
            私たちもその一翼を担います。
          </p>
        </div>
      </section>

      {/* CTAセクション */}
      <section className={styles.blockCTA} id="cta">
        <div className={styles.container}>
          <h2>まずは、無料で相談してみませんか？</h2>
          <p>最小単位：1選手から。最短：当日スタート可能です。</p>
          <a href="https://forms.gle/your-form" className={styles.ctaButtonLarge}>無料相談フォームへ</a>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>© 2025 SPORTS DATA PROJECT</p>
      </footer>
    </div>
  )
}
