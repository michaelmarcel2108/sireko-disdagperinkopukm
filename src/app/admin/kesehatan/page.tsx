'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import NavbarAdmin from '@/components/NavbarAdmin'

export default function AdminKesehatan() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [koperasiList, setKoperasiList] = useState<any[]>([])
  
  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterKategori, setFilterKategori] = useState('semua')

  useEffect(() => {
    fetchData()
  }, [])

  // Debounce effect
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

      // 1. Ambil Semua Koperasi
      const { data: kops } = await supabase.from('profil_koperasi').select('*').order('created_at', { ascending: false })
      if (!kops) return

      // 2. Ambil Dokumen Kesehatan
      const { data: docKesehatan } = await supabase.from('dokumen_kesehatan').select('koperasi_id, status_indikator').order('uploaded_at', { ascending: false })

      // Gabungkan Data
      const combinedData = kops.map(kop => {
        const kesehatanMatch = docKesehatan?.find(d => d.koperasi_id === kop.id)

        return {
          ...kop,
          status_kesehatan: kesehatanMatch?.status_indikator || 'belum_ada',
        }
      })

      setKoperasiList(combinedData)
    } catch (err) {
      console.error("Gagal memuat data:", err)
    } finally {
      setLoading(false)
    }
  }

  const renderBadge = (status: string) => {
    if (status === 'belum_ada') return <span className="text-slate-400 text-[11px] italic">Belum Ada File</span>
    
    let colors = 'bg-slate-100 text-slate-600 border-slate-200'
    let label = status

    if (status === 'hijau') { colors = 'bg-green-100 text-green-800 border-green-200'; label = 'Terverifikasi' }
    if (status === 'biru') { colors = 'bg-blue-100 text-blue-800 border-blue-200'; label = 'Diproses' }
    if (status === 'merah') { colors = 'bg-red-100 text-red-800 border-red-200'; label = 'Belum Dicek' }

    return <span className={`px-2 py-1 rounded border text-[10px] font-bold uppercase shadow-sm ${colors}`}>{label}</span>
  }

  if (loading) return <div className="min-h-screen bg-slate-50 p-8 text-center text-slate-900 font-bold">Memuat Data...</div>

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Status Dokumen Kesehatan</h1>
          <p className="text-sm text-slate-500 mt-1">Daftar verifikasi dokumen kesehatan koperasi.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="w-full sm:w-1/2">
            <input 
              type="text" 
              placeholder="Cari nama koperasi..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="w-full sm:w-auto">
            <select 
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="semua">Semua Kategori</option>
              <option value="hijau">Terverifikasi</option>
              <option value="biru">Diproses</option>
              <option value="merah">Belum Dicek</option>
              <option value="belum_ada">Belum Ada File</option>
            </select>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-700 font-bold">
                <tr>
                  <th className="px-4 py-3 text-left">Nama Koperasi</th>
                  <th className="px-4 py-3 text-left">Nomor Badan Hukum</th>
                  <th className="px-4 py-3 text-center">Status Kesehatan</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {koperasiList
                  .filter((kop: any) => {
                    const matchesSearch = kop.nama_koperasi?.toLowerCase().includes(debouncedSearch.toLowerCase())
                    const matchesKategori = filterKategori === 'semua' || kop.status_kesehatan === filterKategori
                    return matchesSearch && matchesKategori
                  })
                  .map((kop: any) => (
                  <tr key={kop.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 font-semibold text-slate-900">{kop.nama_koperasi}</td>
                    <td className="px-4 py-4 text-slate-600">{kop.nomor_badan_hukum || '-'}</td>
                    <td className="px-4 py-4 text-center">{renderBadge(kop.status_kesehatan)}</td>
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
                {koperasiList.filter((kop: any) => {
                    const matchesSearch = kop.nama_koperasi?.toLowerCase().includes(debouncedSearch.toLowerCase())
                    const matchesKategori = filterKategori === 'semua' || kop.status_kesehatan === filterKategori
                    return matchesSearch && matchesKategori
                  }).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500 italic">Tidak ada data koperasi ditemukan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
