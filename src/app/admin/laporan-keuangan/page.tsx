'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import toast from 'react-hot-toast'

export default function AdminLaporanKeuangan() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [koperasiList, setKoperasiList] = useState<any[]>([])
  
  // State for Upload Template
  const [fileTemplate, setFileTemplate] = useState<File | null>(null)
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false)

  // Search and Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return; }

      // Get Koperasi
      const { data: kops } = await supabase.from('profil_koperasi').select('*').order('created_at', { ascending: false })
      if (!kops) return

      // Get Laporan Keuangan
      const { data: docKeuangan } = await supabase.from('dokumen_keragaan').select('*').like('file_path', '%laporan_keuangan%').order('uploaded_at', { ascending: false })

      const combinedData = kops.map(kop => {
        return {
          ...kop,
          dokumen_keuangan: docKeuangan?.filter(d => d.koperasi_id === kop.id) || [],
        }
      })

      setKoperasiList(combinedData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fileTemplate) {
      toast.error("Pilih file template Excel terlebih dahulu!")
      return
    }

    setIsUploadingTemplate(true)

    try {
      const filename = `Template_Laporan_Keuangan.xlsx`
      
      const formData = new FormData()
      formData.append('file', fileTemplate)
      formData.append('filename', filename)

      const response = await fetch('/api/upload-template', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Gagal mengunggah template.')
      }

      toast.success(`Template berhasil diunggah!`)
      setFileTemplate(null)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsUploadingTemplate(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-slate-50 p-8 text-center text-slate-900 font-bold">Memuat Data...</div>

  return (
    <main className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-slate-900">Laporan Keuangan Koperasi</h1>
          <p className="text-sm text-slate-500 mt-1">Daftar laporan keuangan yang diunggah oleh koperasi dan pengaturan template.</p>
        </header>

        {/* SECTION UPLOAD TEMPLATE */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Upload Template Laporan Keuangan</h2>
          <p className="text-sm text-slate-600 mb-4 font-medium">
            Unggah file Excel sebagai template Laporan Keuangan untuk diunduh oleh koperasi.
          </p>

          <form onSubmit={handleUploadTemplate} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Pilih File Excel (.xlsx)</label>
              <input 
                type="file" 
                accept=".xlsx, .xls"
                onChange={(e) => setFileTemplate(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-800 p-2 border border-slate-300 rounded-md bg-slate-50 shadow-sm focus:border-indigo-500 focus:bg-white"
              />
            </div>
            <button 
              type="submit" 
              disabled={isUploadingTemplate || !fileTemplate}
              className="px-6 py-2 bg-teal-600 text-white font-bold rounded-lg shadow hover:bg-teal-700 disabled:bg-slate-400 transition-colors"
            >
              {isUploadingTemplate ? 'Mengunggah...' : 'Upload Template'}
            </button>
          </form>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="w-full sm:w-1/2">
            <input
              type="text"
              placeholder="Cari nama koperasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-700 font-bold">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left">Nama Koperasi</th>
                  <th scope="col" className="px-4 py-3 text-left">Nomor Badan Hukum</th>
                  <th scope="col" className="px-4 py-3 text-center">Jumlah Laporan</th>
                  <th scope="col" className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {koperasiList
                  .filter((kop: any) => kop.nama_koperasi?.toLowerCase().includes(debouncedSearch.toLowerCase()))
                  .map((kop: any) => (
                    <tr key={kop.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 font-semibold text-slate-900">{kop.nama_koperasi}</td>
                      <td className="px-4 py-4 text-slate-600">{kop.nomor_badan_hukum || '-'}</td>
                      <td className="px-4 py-4 text-center">
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full font-bold text-xs">{kop.dokumen_keuangan.length} File</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => router.push(`/admin/${kop.slug}`)}
                          className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded hover:bg-indigo-600 hover:text-white transition-colors"
                        >
                          Lihat Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                {koperasiList.filter((kop: any) => kop.nama_koperasi?.toLowerCase().includes(debouncedSearch.toLowerCase())).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500 italic">Tidak ada data ditemukan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
