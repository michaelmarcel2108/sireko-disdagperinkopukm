'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function AdminKoperasiSummary() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  
  const [profil, setProfil] = useState<any>(null)
  
  const [chartKeragaan, setChartKeragaan] = useState<any[]>([])
  const [chartKesehatan, setChartKesehatan] = useState<any[]>([])
  const [chartKeuangan, setChartKeuangan] = useState<any[]>([])

  useEffect(() => {
    if (params?.slug) fetchKoperasiSummary(params.slug as string)
  }, [params])

  const processChartData = (docs: any[]) => {
    const grouped = docs.reduce((acc, doc) => {
      const year = new Date(doc.uploaded_at).getFullYear().toString()
      let period = (doc.periode_laporan || 'Lainnya').toLowerCase()
      // Normalize period names
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

  const fetchKoperasiSummary = async (slug: string) => {
    try {
      const { data: pData } = await supabase.from('profil_koperasi').select('*').eq('slug', slug).single()
      if (!pData) { router.push('/admin/koperasi'); return; }
      setProfil(pData)

      // 1. Dokumen Keragaan & Keuangan
      const { data: kerData } = await supabase.from('dokumen_keragaan').select('*').eq('koperasi_id', pData.id)
      
      if (kerData) {
        // Asumsi: yang mengandung 'laporan_keuangan' di file_path adalah Keuangan, sisanya Keragaan
        const docsKeuangan = kerData.filter(d => d.file_path && d.file_path.toLowerCase().includes('laporan_keuangan'))
        const docsKeragaan = kerData.filter(d => !d.file_path || !d.file_path.toLowerCase().includes('laporan_keuangan'))
        
        setChartKeragaan(processChartData(docsKeragaan))
        setChartKeuangan(processChartData(docsKeuangan))
      }

      // 2. Dokumen Kesehatan
      const { data: kesData } = await supabase.from('dokumen_kesehatan').select('*').eq('koperasi_id', pData.id)
      if (kesData) {
        setChartKesehatan(processChartData(kesData))
      }

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const renderCustomBarChart = (data: any[], title: string, description: string, detailRoute: string) => {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-[400px]">
        <div className="mb-6 flex justify-between items-start gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{title}</h2>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
          <button 
            onClick={() => router.push(detailRoute)}
            className="shrink-0 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white text-xs font-bold rounded-lg transition-colors border border-indigo-200"
          >
            Lihat Detail
          </button>
        </div>
        
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data.length > 0 ? data : [{ year: new Date().getFullYear().toString(), Bulanan: 0, Triwulan: 0, Semesteran: 0, Tahunan: 0, Lainnya: 0 }]} 
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
    )
  }

  if (loading) return <div className="min-h-screen bg-slate-50 p-8 text-center font-bold">Memuat Ringkasan...</div>

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* HEADER PROFIL */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900">{profil?.nama_koperasi}</h1>
              <span className="px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold bg-indigo-50 text-indigo-700 rounded-full">
                Ringkasan Koperasi
              </span>
            </div>
            <p className="text-sm text-slate-500 font-medium">NBH: {profil?.nomor_badan_hukum || 'Belum diatur'}</p>
          </div>
          <button 
            onClick={() => router.push('/admin/koperasi')} 
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg transition-colors"
          >
            Kembali ke Daftar
          </button>
        </div>

        {/* STATISTIK CHART */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {renderCustomBarChart(
            chartKeragaan, 
            "Laporan Keragaan", 
            "Frekuensi pelaporan keragaan berdasarkan klasifikasi tahun dan periode",
            `/admin/koperasi/keragaan/${profil?.slug}`
          )}
          
          {renderCustomBarChart(
            chartKesehatan, 
            "Laporan Kesehatan", 
            "Frekuensi pelaporan kesehatan berdasarkan klasifikasi tahun dan periode",
            `/admin/koperasi/kesehatan/${profil?.slug}`
          )}
          
          {renderCustomBarChart(
            chartKeuangan, 
            "Laporan Keuangan", 
            "Frekuensi pelaporan keuangan berdasarkan klasifikasi tahun dan periode",
            `/admin/koperasi/laporan-keuangan/${profil?.slug}`
          )}
        </div>

      </div>
    </div>
  )
}
