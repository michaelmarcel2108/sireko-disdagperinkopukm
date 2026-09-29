'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import NavbarAdmin from '@/components/NavbarAdmin'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function AdminKeragaan() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [koperasiList, setKoperasiList] = useState<any[]>([])
  
  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterKategori, setFilterKategori] = useState('semua')
  const [filterPeriode, setFilterPeriode] = useState('semua')
  const [filterTahun, setFilterTahun] = useState('semua')

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

      // 2. Ambil Dokumen Keragaan
      const { data: docKeragaan } = await supabase.from('dokumen_keragaan').select('koperasi_id, status_indikator, periode_laporan').order('uploaded_at', { ascending: false })

      // Gabungkan Data (Simpan semua dokumen untuk difilter nanti)
      const combinedData = kops.map(kop => {
        return {
          ...kop,
          dokumen_keragaan: docKeragaan?.filter(d => d.koperasi_id === kop.id) || [],
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

  const allDocs = koperasiList.flatMap(kop => kop.dokumen_keragaan || [])
  const availableYears = Array.from(new Set(allDocs.map(d => new Date(d.uploaded_at).getFullYear().toString()))).sort((a,b) => b.localeCompare(a))

  const processChartData = (docs: any[]) => {
    const grouped = docs.reduce((acc: any, doc: any) => {
      const year = new Date(doc.uploaded_at).getFullYear().toString()
      let period = (doc.periode_laporan || 'Lainnya').toLowerCase()
      if (period.includes('tri') || period.includes('trimester')) period = 'Triwulan'
      else if (period.includes('semester')) period = 'Semesteran'
      else if (period.includes('bulan')) period = 'Bulanan'
      else if (period.includes('tahun')) period = 'Tahunan'
      else period = 'Lainnya'
      
      if (!acc[year]) acc[year] = { year, Bulanan: 0, Triwulan: 0, Semesteran: 0, Tahunan: 0, Lainnya: 0 }
      acc[year][period] = (acc[year][period] || 0) + 1
      return acc
    }, {} as any)
    
    return Object.values(grouped).sort((a: any, b: any) => a.year.localeCompare(b.year))
  }

  const filteredDocsByYear = filterTahun === 'semua' ? allDocs : allDocs.filter(d => new Date(d.uploaded_at).getFullYear().toString() === filterTahun)
  const chartData = processChartData(filteredDocsByYear)

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Status Dokumen Keragaan</h1>
          <p className="text-sm text-slate-500 mt-1">Daftar verifikasi dokumen keragaan koperasi.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-[400px]">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-800">Laporan Keragaan (Seluruh Koperasi)</h2>
            <p className="text-sm text-slate-500">Frekuensi pelaporan keragaan berdasarkan klasifikasi tahun dan periode</p>
          </div>
          
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={chartData.length > 0 ? chartData : [{ year: filterTahun !== 'semua' ? filterTahun : new Date().getFullYear().toString(), Bulanan: 0, Triwulan: 0, Semesteran: 0, Tahunan: 0, Lainnya: 0 }]} 
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '12px'}} />
                <Bar dataKey="Bulanan" name="Bulanan" stackId="a" fill="#60a5fa" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Triwulan" name="Tri Semester" stackId="a" fill="#34d399" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Semesteran" name="Semesteran" stackId="a" fill="#fbbf24" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Tahunan" name="Tahunan" stackId="a" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Lainnya" name="Lainnya" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
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
          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
            <select 
              value={filterTahun}
              onChange={(e) => setFilterTahun(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="semua">Semua Tahun</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select 
              value={filterPeriode}
              onChange={(e) => setFilterPeriode(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="semua">Semua Periode</option>
              <option value="bulanan">Bulanan</option>
              <option value="triwulan">Trimester</option>
              <option value="semesteran">Semesteran</option>
              <option value="tahunan">Tahunan</option>
            </select>
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
                  <th className="px-4 py-3 text-center">Status Keragaan</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {koperasiList
                  .map((kop: any) => {
                    let targetDoc = null;
                    let docs = kop.dokumen_keragaan || [];
                    if (filterTahun !== 'semua') {
                      docs = docs.filter((d: any) => new Date(d.uploaded_at).getFullYear().toString() === filterTahun);
                    }
                    if (filterPeriode === 'semua') {
                      targetDoc = docs[0];
                    } else {
                      targetDoc = docs.find((d: any) => d.periode_laporan === filterPeriode);
                    }
                    return {
                      ...kop,
                      status_keragaan_computed: targetDoc?.status_indikator || 'belum_ada'
                    }
                  })
                  .filter((kop: any) => {
                    const matchesSearch = kop.nama_koperasi?.toLowerCase().includes(debouncedSearch.toLowerCase())
                    const matchesKategori = filterKategori === 'semua' || kop.status_keragaan_computed === filterKategori
                    return matchesSearch && matchesKategori
                  })
                  .map((kop: any) => (
                  <tr key={kop.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 font-semibold text-slate-900">{kop.nama_koperasi}</td>
                    <td className="px-4 py-4 text-slate-600">{kop.nomor_badan_hukum || '-'}</td>
                    <td className="px-4 py-4 text-center">{renderBadge(kop.status_keragaan_computed)}</td>
                    <td className="px-4 py-4 text-right">
                      <button 
                        onClick={() => router.push(`/admin/koperasi/keragaan/${kop.slug}`)}
                        className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded hover:bg-indigo-600 hover:text-white transition-colors"
                      >
                        Lihat Detail
                      </button>
                    </td>
                  </tr>
                ))}
                {koperasiList.map((kop: any) => {
                    let targetDoc = null;
                    let docs = kop.dokumen_keragaan || [];
                    if (filterTahun !== 'semua') {
                      docs = docs.filter((d: any) => new Date(d.uploaded_at).getFullYear().toString() === filterTahun);
                    }
                    if (filterPeriode === 'semua') {
                      targetDoc = docs[0];
                    } else {
                      targetDoc = docs.find((d: any) => d.periode_laporan === filterPeriode);
                    }
                    return {
                      ...kop,
                      status_keragaan_computed: targetDoc?.status_indikator || 'belum_ada'
                    }
                  }).filter((kop: any) => {
                    const matchesSearch = kop.nama_koperasi?.toLowerCase().includes(debouncedSearch.toLowerCase())
                    const matchesKategori = filterKategori === 'semua' || kop.status_keragaan_computed === filterKategori
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
