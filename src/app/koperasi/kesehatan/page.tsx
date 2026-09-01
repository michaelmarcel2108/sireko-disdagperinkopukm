'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import toast from 'react-hot-toast'

export default function KesehatanKoperasi() {
  const router = useRouter()
  const [profil, setProfil] = useState<any>(null)
  const [dokumenList, setDokumenList] = useState<any[]>([])
  const [statusUmum, setStatusUmum] = useState('merah')
  
  // State untuk Kertas Kerja
  const [kategoriKUK, setKategoriKUK] = useState('KUK1_2')
  const [jenisKoperasi, setJenisKoperasi] = useState('KSP')
  const [fileKertas, setFileKertas] = useState<File | null>(null)
  const [tanggalKertas, setTanggalKertas] = useState(new Date().toISOString().split('T')[0])
  
  // State untuk Surat Pernyataan
  const [fileSurat, setFileSurat] = useState<File | null>(null)
  const [tanggalSurat, setTanggalSurat] = useState(new Date().toISOString().split('T')[0])

  const [isUploading, setIsUploading] = useState(false)
  const [uploadType, setUploadType] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUserAndFetchData()
  }, [])

  const checkUserAndFetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return; }

      const { data: pData } = await supabase.from('profil_koperasi').select('*').eq('user_id', user.id).single()

      if (pData) {
        setProfil(pData)
        fetchDokumen(pData.id)
      }
    } catch (err) {
      console.error("Gagal memuat data:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchDokumen = async (id: string) => {
    const { data, error } = await supabase.from('dokumen_kesehatan').select('*').eq('koperasi_id', id).order('uploaded_at', { ascending: false })
    if (error) {
      console.error("Gagal ambil dokumen:", error)
      return
    }
    
    if (data) {
      setDokumenList(data)
      
      // Kalkulasi Status Kesehatan Umum
      if (data.length === 0) {
        setStatusUmum('merah')
      } else {
        const statuses = data.map(d => d.status_indikator)
        if (statuses.includes('merah')) setStatusUmum('merah')
        else if (statuses.includes('biru')) setStatusUmum('biru')
        else setStatusUmum('hijau')
      }
    }
  }

  const handleUpload = async (e: React.FormEvent, jenis: string, fileToUpload: File | null, tanggal: string, resetFile: any) => {
    e.preventDefault()
    if (!fileToUpload) {
      toast.error("Pilih file terlebih dahulu!")
      return
    }
    
    setIsUploading(true)
    setUploadType(jenis)

    try {
      // 1. Upload File ke Storage
      const fileExt = fileToUpload.name.split('.').pop()
      const fileName = `${profil.id}/${jenis}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('berkas_sireko').upload(`kesehatan/${fileName}`, fileToUpload)
      
      if (uploadError) {
        console.error("Error Storage:", uploadError)
        throw new Error("Gagal upload file ke storage.")
      }
      
      // 2. Dapatkan URL Public
      const { data: publicUrlData } = supabase.storage.from('berkas_sireko').getPublicUrl(`kesehatan/${fileName}`)
      
      // 3. Masukkan ke Database
      const { error: insertError } = await supabase.from('dokumen_kesehatan').insert({ 
        koperasi_id: profil.id, 
        jenis_dokumen: jenis, 
        tanggal_input: tanggal,
        file_path: publicUrlData.publicUrl, 
        status_indikator: 'merah' 
      })

      if (insertError) throw insertError

      toast.success('Dokumen Kesehatan berhasil diunggah!')
      resetFile(null)
      fetchDokumen(profil.id)
    } catch (error: any) { 
      console.error("CRITICAL ERROR:", error)
      toast.error(error.message) 
    } finally { 
      setIsUploading(false) 
      setUploadType('')
    }
  }

  const handleDownloadTemplate = async () => {
    const filename = `${kategoriKUK}_${jenisKoperasi}.xlsx`
    
    const { data } = supabase.storage
      .from('berkas_sireko')
      .getPublicUrl(`templates/${filename}`)
      
    if (data && data.publicUrl) {
      // Buka URL Supabase di tab baru
      window.open(data.publicUrl, '_blank')
      toast.success(`Mengunduh template: ${filename}`)
    } else {
      toast.error("Gagal mendapatkan link template.")
    }
  }

  const renderBadge = (status: string) => {
    const colors: any = { 
      merah: 'bg-red-100 text-red-800 border-red-200', 
      biru: 'bg-blue-100 text-blue-800 border-blue-200', 
      hijau: 'bg-green-100 text-green-800 border-green-200' 
    }
    const labels: any = { merah: 'Belum Diperiksa', biru: 'Sedang Diproses', hijau: 'Terverifikasi' }
    return <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase ${colors[status] || colors.merah}`}>{labels[status] || status}</span>
  }

  const getFormatName = (kode: string) => {
    const formatNames: any = {
      kertas_kerja: 'Kertas Kerja Verifikasi Mandiri',
      surat_pernyataan: 'Surat Pernyataan Verifikasi Mandiri',
      lembar_kerja_ods: 'Lembar Kerja ODS',
      verifikasi_mandiri: 'Verifikasi Mandiri'
    }
    return formatNames[kode] || kode.replace('_', ' ')
  }

  if (loading) return <div className="min-h-screen bg-white p-8 text-center text-slate-900 font-bold">Memuat...</div>

  return (
    <div className="min-h-screen bg-white pb-12 font-sans antialiased text-slate-900">
      <div className="max-w-4xl mx-auto px-4 space-y-8 pt-8">
        
        {/* 1. PANEL STATUS KESEHATAN UMUM */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Status Kesehatan Keseluruhan</h2>
            <p className="text-sm text-slate-700 font-medium">Ini adalah status gabungan dari semua dokumen kesehatan yang Anda unggah.</p>
          </div>
          <div className="flex-shrink-0">
            {statusUmum === 'merah' && <span className="px-4 py-2 bg-red-100 text-red-800 border border-red-200 rounded-lg font-bold shadow-sm">Belum Dicek</span>}
            {statusUmum === 'biru' && <span className="px-4 py-2 bg-blue-100 text-blue-800 border border-blue-200 rounded-lg font-bold shadow-sm">Diproses</span>}
            {statusUmum === 'hijau' && <span className="px-4 py-2 bg-green-100 text-green-800 border border-green-200 rounded-lg font-bold shadow-sm">Terverifikasi</span>}
          </div>
        </div>

        {/* 2. BOX 1: KERTAS KERJA VERIFIKASI MANDIRI */}
        <div className="bg-slate-50 p-6 rounded-xl shadow-sm border border-slate-200 mt-6">
            <h2 className="text-lg font-bold text-slate-900 mb-2">1. Kertas Kerja Verifikasi Mandiri</h2>
            <p className="text-sm text-slate-600 mb-5 font-medium">Unduh template yang sesuai, isi dengan lengkap, dan unggah kembali dalam format Excel (.xlsx / .xls).</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Kiri: Unduh Template */}
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-md font-bold text-slate-800 mb-3 border-b pb-2">Unduh Template</h3>
                  <div className="space-y-4 mb-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Kategori KUK:</label>
                      <select value={kategoriKUK} onChange={(e) => setKategoriKUK(e.target.value)} className="w-full rounded-md border border-slate-300 p-2 bg-slate-50 text-slate-900 font-medium focus:border-indigo-500">
                        <option value="KUK1_2">KUK 1 & 2</option>
                        <option value="KUK3">KUK 3</option>
                        <option value="KUK4">KUK 4</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Jenis Koperasi:</label>
                      <select value={jenisKoperasi} onChange={(e) => setJenisKoperasi(e.target.value)} className="w-full rounded-md border border-slate-300 p-2 bg-slate-50 text-slate-900 font-medium focus:border-indigo-500">
                        <option value="KSP">Koperasi Simpan Pinjam</option>
                        <option value="Koperasi_Desa">Koperasi Desa / Sektor Riil</option>
                      </select>
                    </div>
                  </div>
                </div>
                <button onClick={handleDownloadTemplate} className="w-full py-2.5 bg-indigo-50 text-indigo-700 font-bold rounded shadow-sm hover:bg-indigo-100 transition-colors border border-indigo-200">
                  Unduh Template (Excel)
                </button>
              </div>

              {/* Kanan: Upload File */}
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-md font-bold text-slate-800 mb-3 border-b pb-2">Unggah File</h3>
                  <form id="form-kertas-kerja" onSubmit={(e) => handleUpload(e, 'kertas_kerja', fileKertas, tanggalKertas, setFileKertas)} className="space-y-4 mb-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Tanggal Input:</label>
                      <input type="date" value={tanggalKertas} max={new Date().toISOString().split('T')[0]} onChange={(e) => setTanggalKertas(e.target.value)} className="w-full rounded-md border border-slate-300 p-2 bg-slate-50 text-slate-900 font-medium focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Pilih File Excel:</label>
                      <input type="file" accept=".xlsx, .xls" onChange={(e) => setFileKertas(e.target.files?.[0] || null)} className="w-full text-sm text-slate-800 p-1.5 border border-slate-300 rounded bg-slate-50 shadow-sm" />
                    </div>
                  </form>
                </div>
                <button type="submit" form="form-kertas-kerja" disabled={isUploading || !fileKertas} className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded shadow-md hover:bg-indigo-700 disabled:bg-slate-400 transition-colors">
                  {isUploading && uploadType === 'kertas_kerja' ? "Mengunggah..." : "Upload Kertas Kerja"}
                </button>
              </div>
            </div>
        </div>

        {/* 3. BOX 2: SURAT PERNYATAAN VERIFIKASI MANDIRI */}
        <div className="bg-slate-50 p-6 rounded-xl shadow-sm border border-slate-200 mt-6">
            <h2 className="text-lg font-bold text-slate-900 mb-2">2. Surat Pernyataan Verifikasi Mandiri</h2>
            <p className="text-sm text-slate-600 mb-5 font-medium">Unggah Surat Pernyataan Verifikasi Mandiri (Excel / PDF).</p>
            
            <form onSubmit={(e) => handleUpload(e, 'surat_pernyataan', fileSurat, tanggalSurat, setFileSurat)} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Tanggal Input:</label>
                <input type="date" value={tanggalSurat} max={new Date().toISOString().split('T')[0]} onChange={(e) => setTanggalSurat(e.target.value)} className="w-full rounded-md border border-slate-300 p-2 bg-white text-slate-900 font-medium shadow-sm focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Pilih File:</label>
                <input type="file" accept=".pdf, .xlsx, .xls" onChange={(e) => setFileSurat(e.target.files?.[0] || null)} className="w-full text-sm text-slate-800 p-1.5 border border-slate-300 rounded bg-white shadow-sm" />
              </div>
              <div className="md:col-span-1">
                <button type="submit" disabled={isUploading || !fileSurat} className="w-full px-4 py-2.5 bg-indigo-600 text-white font-bold rounded shadow-md hover:bg-indigo-700 disabled:bg-slate-400 transition-colors">
                  {isUploading && uploadType === 'surat_pernyataan' ? "Mengunggah..." : "Upload Surat Pernyataan"}
                </button>
              </div>
            </form>
        </div>

        {/* 4. RIWAYAT DOKUMEN KESEHATAN */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-md font-bold text-slate-800 uppercase mb-4 tracking-wider">Riwayat Unggah Terakhir</h2>
          {dokumenList.length === 0 ? <p className="text-sm text-slate-500 italic font-medium py-4 text-center">Belum ada dokumen kesehatan yang diunggah.</p> : (
            <div className="space-y-3">
              {dokumenList.map((doc: any) => (
                <div key={doc.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 border border-slate-200 rounded-lg bg-slate-50 hover:border-indigo-200 transition-colors gap-4">
                  <div>
                    <p className="font-bold text-slate-900 capitalize text-md">{getFormatName(doc.jenis_dokumen)}</p>
                    <p className="text-xs font-medium text-slate-600 mt-1">Tanggal Input: <span className="font-bold text-slate-800">{new Date(doc.tanggal_input).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
                  </div>
                  <div className="flex items-center gap-4">
                    {renderBadge(doc.status_indikator)}
                    <a href={doc.file_path} target="_blank" className="text-indigo-600 font-bold text-sm hover:underline border-l border-slate-300 pl-4">Lihat Berkas</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}