'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import NavbarAdmin from '@/components/NavbarAdmin'
import toast from 'react-hot-toast'

export default function AdminDetailKoperasi() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  
  const [profil, setProfil] = useState<any>(null)
  const [keragaanList, setKeragaanList] = useState<any[]>([])
  const [kesehatanList, setKesehatanList] = useState<any[]>([])
  const [verifData, setVerifData] = useState<any>(null)
  const [metrikData, setMetrikData] = useState<any>(null)

  // State Form Verifikasi
  const [statusVerif, setStatusVerif] = useState('menunggu')
  const [catatan, setCatatan] = useState('')
  const [suratFile, setSuratFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isObservasi, setIsObservasi] = useState(false)

  useEffect(() => {
    if (params?.slug) fetchKoperasiDetail(params.slug as string)
  }, [params])

  const fetchKoperasiDetail = async (slug: string) => {
    try {
      // 1. Ambil Profil Koperasi
      const { data: pData } = await supabase.from('profil_koperasi').select('*').eq('slug', slug).single()
      if (!pData) { router.push('/admin/koperasi'); return; }
      setProfil(pData)

      // 2. Ambil Dokumen Keragaan & Kesehatan
      const { data: kerData } = await supabase.from('dokumen_keragaan').select('*').eq('koperasi_id', pData.id).order('uploaded_at', { ascending: false })
      const { data: kesData } = await supabase.from('dokumen_kesehatan').select('*').eq('koperasi_id', pData.id).order('uploaded_at', { ascending: false })
      if (kerData) setKeragaanList(kerData)
      if (kesData) setKesehatanList(kesData)

      // 3. Ambil Status Verifikasi Terakhir
      const { data: vData } = await supabase.from('verifikasi_dinas').select('*').eq('koperasi_id', pData.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (vData) {
        setVerifData(vData)
        setStatusVerif(vData.status)
        setCatatan(vData.catatan || '')
      }

      // 4. Ambil Data Metrik Keragaan Lengkap
      const { data: mData } = await supabase.from('data_keragaan_metrik').select('*').eq('slug', slug).single()
      if (mData) setMetrikData(mData)

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifikasiSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profil) return
    setIsSubmitting(true)

    try {
      let publicUrl = verifData?.surat_verifikasi_url || null

      // Jika Admin mengunggah file Surat baru
      if (suratFile) {
        const fileName = `${profil.id}/Surat-Dinas-${Date.now()}.pdf`
        const { error: uploadError } = await supabase.storage.from('berkas_sireko').upload(`verifikasi/${fileName}`, suratFile)
        
        if (uploadError) throw new Error("Gagal mengunggah file surat ke storage: " + uploadError.message)
        
        const { data: urlData } = supabase.storage.from('berkas_sireko').getPublicUrl(`verifikasi/${fileName}`)
        publicUrl = urlData.publicUrl
      }

      // Simpan ke tabel verifikasi_dinas
      const { error } = await supabase.from('verifikasi_dinas').insert({
        koperasi_id: profil.id,
        status: statusVerif,
        catatan: catatan,
        surat_verifikasi_url: publicUrl
      })

      if (error) throw error
      toast.success('Verifikasi dan Validasi berhasil disimpan!')
      setSuratFile(null)
      fetchKoperasiDetail(profil.slug) // Refresh data

    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
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

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* HEADER PROFIL */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{profil?.nama_koperasi}</h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">NBH: {profil?.nomor_badan_hukum || 'Belum diatur'}</p>
          </div>
          <button onClick={() => router.push('/admin/koperasi')} className="text-sm font-bold text-indigo-600 hover:underline">Kembali ke Daftar</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* KOLOM KIRI: DAFTAR DOKUMEN KOPERASI */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Data Lengkap Keragaan */}
            {metrikData && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-800 mb-1">Data Metrik Keragaan (Tahun {metrikData.tahun_laporan})</h2>
                <p className="text-sm text-slate-500 mb-4 border-b border-slate-100 pb-2">Ringkasan Laporan Tutup Buku (Sebagai Dasar Analisa)</p>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium">Total Anggota</p>
                    <p className="text-lg font-black text-indigo-700">{metrikData.ang_laki + metrikData.ang_wanita}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium">Total Karyawan</p>
                    <p className="text-lg font-black text-indigo-700">{metrikData.kary_laki + metrikData.kary_wanita}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium">Total Manajer</p>
                    <p className="text-lg font-black text-indigo-700">{metrikData.mgr_laki + metrikData.mgr_wanita}</p>
                  </div>
                  
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium">Total Aset</p>
                    <p className="text-base font-bold text-slate-800">Rp {metrikData.asset?.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium">Volume Usaha</p>
                    <p className="text-base font-bold text-slate-800">Rp {metrikData.volusaha?.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium">SHU</p>
                    <p className="text-base font-bold text-emerald-600">Rp {metrikData.shu?.toLocaleString('id-ID')}</p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium">Modal Sendiri</p>
                    <p className="text-base font-bold text-slate-800">Rp {metrikData.modalsendiri?.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium">Modal Luar</p>
                    <p className="text-base font-bold text-slate-800">Rp {metrikData.modalluar?.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Dokumen Keragaan */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Laporan Keragaan (CSV/Metrik)</h2>
              <div className="space-y-3">
                {keragaanList.map(doc => (
                  <div key={doc.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 border border-slate-100 bg-slate-50 rounded-lg gap-3">
                    <div>
                      <p className="font-bold text-sm text-slate-800 capitalize">Laporan {doc.jenis_laporan?.replace('_', ' ')} <span className="text-xs text-indigo-600 ml-1">({doc.periode_laporan || 'bulanan'})</span></p>
                      <p className="text-xs text-slate-500">{new Date(doc.uploaded_at).toLocaleDateString('id-ID')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <a 
                        href={doc.file_path} 
                        target="_blank" 
                        onClick={() => {
                          if(doc.status_indikator !== 'hijau') updateStatusDokumen('dokumen_keragaan', doc.id, 'hijau');
                        }}
                        className="text-xs font-bold text-indigo-600 hover:underline"
                      >
                        Lihat CSV
                      </a>
                      <select 
                        value={doc.status_indikator} 
                        onChange={(e) => updateStatusDokumen('dokumen_keragaan', doc.id, e.target.value)}
                        className="text-xs border border-slate-300 rounded p-1 font-bold bg-white"
                      >
                        <option value="merah">Belum Dicek</option>
                        <option value="biru">Diproses</option>
                        <option value="hijau">Terverifikasi</option>
                      </select>
                    </div>
                  </div>
                ))}
                {keragaanList.length === 0 && <p className="text-sm text-slate-400 italic">Belum ada dokumen keragaan.</p>}
              </div>
            </div>

            {/* Dokumen Kesehatan */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Laporan Kesehatan (PDF)</h2>
              <div className="space-y-3">
                {kesehatanList.map(doc => (
                  <div key={doc.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 border border-slate-100 bg-slate-50 rounded-lg gap-3">
                    <div>
                      <p className="font-bold text-sm text-slate-800 capitalize">{doc.jenis_dokumen?.replace(/_/g, ' ')} <span className="text-xs text-indigo-600 ml-1">({doc.periode_laporan || 'bulanan'})</span></p>
                      <p className="text-xs text-slate-500">{new Date(doc.uploaded_at).toLocaleDateString('id-ID')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <a 
                        href={doc.file_path} 
                        target="_blank" 
                        onClick={() => {
                          if(doc.status_indikator !== 'hijau') updateStatusDokumen('dokumen_kesehatan', doc.id, 'hijau');
                        }}
                        className="text-xs font-bold text-indigo-600 hover:underline"
                      >
                        Buka PDF
                      </a>
                      <select 
                        value={doc.status_indikator} 
                        onChange={(e) => updateStatusDokumen('dokumen_kesehatan', doc.id, e.target.value)}
                        className="text-xs border border-slate-300 rounded p-1 font-bold bg-white"
                      >
                        <option value="merah">Belum Dicek</option>
                        <option value="biru">Diproses</option>
                        <option value="hijau">Terverifikasi</option>
                      </select>
                    </div>
                  </div>
                ))}
                {kesehatanList.length === 0 && <p className="text-sm text-slate-400 italic">Belum ada dokumen kesehatan.</p>}
              </div>
            </div>

          </div>

          {/* KOLOM KANAN: PANEL UPLOAD VERIFIKASI DINAS */}
          <div className="lg:col-span-1">
           <div className="sticky top-24 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Verifikasi dan Validasi</h2>
              
              <form onSubmit={handleVerifikasiSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Status Verifikasi</label>
                  <select 
                    value={statusVerif} 
                    onChange={(e) => setStatusVerif(e.target.value)} 
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-md font-bold focus:border-indigo-500 shadow-sm"
                  >
                    <option value="menunggu">Menunggu / Diproses</option>
                    <option value="disetujui">Disetujui (Terverifikasi)</option>
                    <option value="ditolak">Ditolak / Revisi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Catatan Dinas (Opsional)</label>
                  <textarea 
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    rows={3}
                    placeholder="Berikan catatan atau instruksi revisi..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-md text-sm focus:border-indigo-500 shadow-sm"
                  />
                </div>

                <div className="border-t border-slate-200 pt-4 mt-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Upload Surat Verifikasi (.pdf)</label>
                  <p className="text-xs text-slate-500 mb-2">Unggah surat resmi dari dinas yang menyatakan status koperasi ini.</p>
                  <input 
                    type="file" 
                    accept=".pdf"
                    onChange={(e) => setSuratFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-slate-700 p-1.5 border border-slate-300 rounded bg-white shadow-sm" 
                  />
                  
                  {verifData?.surat_verifikasi_url && !suratFile && (
                    <p className="text-xs mt-2 text-indigo-600 font-bold">
                      &#10003; Surat sudah pernah diunggah. <a href={verifData.surat_verifikasi_url} target="_blank" className="underline">Lihat File</a>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <input 
                    type="checkbox" 
                    id="observasi" 
                    checked={isObservasi}
                    onChange={(e) => setIsObservasi(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="observasi" className="text-sm font-bold text-slate-700">
                    Sudah Observasi Lapangan
                  </label>
                </div>
                {statusVerif === 'disetujui' && !isObservasi && (
                  <p className="text-xs text-red-600 font-bold mt-1">* Status Disetujui memerlukan Observasi Lapangan.</p>
                )}

                <button 
                  type="submit" 
                  disabled={isSubmitting || (statusVerif === 'disetujui' && !isObservasi)}
                  className="w-full py-2.5 mt-2 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan & Publikasikan Surat'}
                </button>
              </form>
            </div>

            {/* PANEL PENETAPAN */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-2">Penetapan</h2>
              <p className="text-sm text-slate-500 mb-4">Sertifikat Kesehatan Koperasi.</p>
              
              {verifData?.status === 'disetujui' ? (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-center">
                  <p className="text-sm text-green-800 font-bold mb-3">Koperasi telah Terverifikasi dan Sertifikat dapat diterbitkan.</p>
                  <button 
                    onClick={() => toast.success('Sertifikat siap diunduh (Fitur PDF sedang dikembangkan)')}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded shadow hover:bg-green-700 transition-colors w-full"
                  >
                    Unduh Sertifikat
                  </button>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-center">
                  <p className="text-sm text-slate-500 italic">Sertifikat belum dapat diterbitkan. Koperasi harus dalam status Terverifikasi (Disetujui).</p>
                </div>
              )}
            </div>
           </div>
          </div>

        </div>
      </div>
    </div>
  )
}