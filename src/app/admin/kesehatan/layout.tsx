import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Status Dokumen Kesehatan | Admin SIREKO',
  description: 'Daftar verifikasi dan status dokumen kesehatan koperasi. Kelola indikator kesehatan koperasi secara efisien di SIREKO.',
}

export default function KesehatanLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
