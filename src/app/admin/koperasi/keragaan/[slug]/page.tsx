'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import NavbarAdmin from '@/components/NavbarAdmin'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function AdminKeragaanDetail() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  
  const [profil, setProfil] = useState<any>(null)
  const [keragaanList, setKeragaanList] = useState<any[]>([])
  const [metrikData, setMetrikData] = useState<any[]>([])
  const [filterTahunMetrik, setFilterTahunMetrik] = useState<string>('')
  
  const [filterTahunDok, setFilterTahunDok] = useState<string>('semua')
  const [filterPeriodeDok, setFilterPeriodeDok] = useState<string>('semua')

  useEffect(() => {
    if (metrikData && metrikData.length > 0 && !filterTahunMetrik) {
      const latest = metrikData.reduce((prev, current) => (prev.tahun_laporan > current.tahun_laporan) ? prev : current)
      setFilterTahunMetrik(latest.tahun_laporan.toString())
    }
  }, [metrikData])
  useEffect(() => {
    if (params?.slug) fetchKoperasiDetail(params.slug as string)
  }, [params])

  const fetchKoperasiDetail = async (slug: string) => {
    try {
      // 1. Ambil Profil Koperasi
      const { data: pData } = await supabase.from('profil_koperasi').select('*').eq('slug', slug).single()
      if (!pData) { router.push('/admin/koperasi'); return; }
      setProfil(pData)

      // 2. Ambil Dokumen Keragaan
      const { data: kerData } = await supabase.from('dokumen_keragaan').select('*').eq('koperasi_id', pData.id).not('file_path', 'ilike', '%laporan_keuangan%').order('uploaded_at', { ascending: false })
      if (kerData) setKeragaanList(kerData)

      // 4. Ambil Data Metrik Keragaan Lengkap
      const { data: mData } = await supabase.from('data_keragaan_metrik').select('*').eq('slug', slug)
      if (mData) setMetrikData(mData)

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }



  const updateStatusDokumen = async (tabel: string, id: string, statusBaru: string) => {
    try {
      const { error } = await supabase.from(tabel).update({ status_indikator: statusBaru }).eq('id', id)
      if (error) throw error
      toast.success("Status dokumen diperbarui!")
      fetchKoperasiDetail(profil.slug)
    } catch (err: any) {
      toast.error("Gagal memperbarui status: " + err.message)
    }
  }

  if (loading) return <div className="min-h-screen bg-slate-50 p-8 text-center font-bold">Memuat Detail Koperasi...</div>

  const selectedMetrik = metrikData?.find(m => m.tahun_laporan.toString() === filterTahunMetrik) || metrikData?.[0]
  const availableTahunMetrik = Array.from(new Set((metrikData || []).map(m => m.tahun_laporan.toString()))).sort((a,b) => b.localeCompare(a))

  const availableTahunDok = Array.from(new Set(keragaanList.map(d => new Date(d.uploaded_at).getFullYear().toString()))).sort((a,b) => b.localeCompare(a))
  const filteredKeragaanList = keragaanList.filter(doc => {
    const matchesTahun = filterTahunDok === 'semua' || new Date(doc.uploaded_at).getFullYear().toString() === filterTahunDok
    const matchesPeriode = filterPeriodeDok === 'semua' || doc.periode_laporan === filterPeriodeDok
    return matchesTahun && matchesPeriode
  })

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

  const chartData = processChartData(filteredKeragaanList)

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* HEADER PROFIL */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{profil?.nama_koperasi}</h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">NBH: {profil?.nomor_badan_hukum || 'Belum diatur'}</p>
          </div>
          <button onClick={() => router.push('/admin/keragaan')} className="text-sm font-bold text-indigo-600 hover:underline">Kembali ke Daftar</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* KOLOM KIRI: DAFTAR DOKUMEN KOPERASI */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* GRAFIK LAPORAN KERAGAAN */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-[400px]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Grafik Pelaporan Keragaan</h2>
                  <p className="text-sm text-slate-500">Frekuensi pelaporan keragaan berdasarkan klasifikasi tahun dan periode</p>
                </div>
                <div className="flex items-center gap-2">
                  <select 
                    value={filterTahunDok}
                    onChange={(e) => setFilterTahunDok(e.target.value)}
                    className="text-sm border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-indigo-500"
                  >
                    <option value="semua">Semua Tahun</option>
                    {availableTahunDok.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select 
                    value={filterPeriodeDok}
                    onChange={(e) => setFilterPeriodeDok(e.target.value)}
                    className="text-sm border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-indigo-500"
                  >
                    <option value="semua">Semua Periode</option>
                    <option value="bulanan">Bulanan</option>
                    <option value="triwulan">Trimester</option>
                    <option value="semesteran">Semesteran</option>
                    <option value="tahunan">Tahunan</option>
                  </select>
                </div>
              </div>
              
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={chartData.length > 0 ? chartData : [{ year: filterTahunDok !== 'semua' ? filterTahunDok : new Date().getFullYear().toString(), Bulanan: 0, Triwulan: 0, Semesteran: 0, Tahunan: 0, Lainnya: 0 }]} 
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

            {/* Data Lengkap Keragaan */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 mb-1">Data Metrik Keragaan (Tahun {selectedMetrik?.tahun_laporan || '-'})</h2>
                  <p className="text-sm text-slate-500">Ringkasan Laporan Tutup Buku (Sebagai Dasar Analisa)</p>
                </div>
                {availableTahunMetrik.length > 0 && (
                  <select 
                    value={filterTahunMetrik}
                    onChange={(e) => setFilterTahunMetrik(e.target.value)}
                    className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {availableTahunMetrik.map(t => <option key={t} value={t}>Tahun {t}</option>)}
                  </select>
                )}
              </div>
              
              {selectedMetrik ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium">Total Anggota</p>
                    <p className="text-lg font-black text-indigo-700">{selectedMetrik.ang_laki + selectedMetrik.ang_wanita}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium">Total Karyawan</p>
                    <p className="text-lg font-black text-indigo-700">{selectedMetrik.kary_laki + selectedMetrik.kary_wanita}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium">Total Manajer</p>
                    <p className="text-lg font-black text-indigo-700">{selectedMetrik.mgr_laki + selectedMetrik.mgr_wanita}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 border-2 border-dashed border-slate-100 rounded-lg mt-4">
                  <p className="text-slate-500 font-medium text-sm">Belum ada data metrik keragaan yang diisi untuk koperasi ini.</p>
                </div>
              )}
            </div>

            </div>
          </div>
        </div>
      </div>
  )
}