import '../styles/globals.css'
import Sidebar from '../components/Sidebar'

export const metadata = {
  title: 'CoreNZ HR',
  description: 'HR platform for NZ businesses',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex h-screen bg-gray-100">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </body>
    </html>
  )
}
