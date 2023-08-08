import { Inter } from 'next/font/google'
import { Chat } from './chat'
import styles from './page.module.css'
import { Avatar } from './avatar'

const inter = Inter({ subsets: ['latin'] })

export default function Home() {
  return (
    <main className={styles.main}>
      <Chat />
    </main>
  )
}
