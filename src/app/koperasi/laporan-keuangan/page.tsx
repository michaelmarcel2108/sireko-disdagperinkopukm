'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import toast from 'react-hot-toast'

export default function KoperasiLaporanKeuangan() {
  const router = useRouter()
  const [profil, setProfil] = useState<any>(null)
  const [dokumenList, setDokumenList] = useState<any[]>([])
  
  const [fileLK, setFileLK] = useState<File | null>(null)
  const [tanggalLK, setTanggalLK] = useState(new Date().toISOString().split('T')[0])
  const [tahunLK, setTahunLK] = useState(new Date().getFullYear().toString())
  const [jenisPeriode, setJenisPeriode] = useState('tahunan')

  const [filterVerifikasi, setFilterVerifikasi] = useState('Semua')
  const [filterTanggal, setFilterTanggal] = useState('')
  const [filterKlasifikasi, setFilterKlasifikasi] = useState('Semua')

  const [formData, setFormData] = useState({
    asset: '',
    shu: '',
    volusaha: '',
    modalsendiri: '',
    modalluar: ''
  })

  const formatRp = (angka: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0)
  const handleInputChange = (field: string, value: string) => setFormData({ ...formData, [field]: value })

  const [isUploading, setIsUploading] = useState(false)
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
    const { data, error } = await supabase.from('dokumen_keragaan')
      .select('*')
      .eq('koperasi_id', id)
      .like('file_path', '%laporan_keuangan%')
      .order('uploaded_at', { ascending: false })
      
    if (error) {
      console.error("Gagal ambil dokumen:", error)
      return
    }
    
    if (data) {
      setDokumenList(data)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fileLK) {
      toast.error("Pilih file terlebih dahulu!")
      return
    }
    
    setIsUploading(true)

    try {
      // 1. Upload File ke Storage
      const fileExt = fileLK.name.split('.').pop()
      const fileName = `${profil.id}/laporan_keuangan-${tahunLK}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('berkas_sireko').upload(`keuangan/${fileName}`, fileLK)
      
      if (uploadError) {
        throw new Error("Gagal upload file ke storage.")
      }
      
      // 2. Dapatkan URL Public
      const { data: publicUrlData } = supabase.storage.from('berkas_sireko').getPublicUrl(`keuangan/${fileName}`)
      
      // 3. Masukkan ke Database
      const { error: insertError } = await supabase.from('dokumen_keragaan').insert({ 
        koperasi_id: profil.id, 
        jenis_laporan: jenisPeriode, // Gunakan jenis periode (bulanan/tahunan/dll)
        periode_laporan: tahunLK, 
        file_path: publicUrlData.publicUrl, 
        status_indikator: 'merah' // Status default: belum diverifikasi
      })

      if (insertError) throw insertError

      // 4. Masukkan data angka ke data_keragaan_metrik
      const parseNum = (val: any) => Number(String(val).replace(/[^0-9.-]/g, '')) || 0
      const { error: metrikError } = await supabase.from('data_keragaan_metrik').insert({
        nobh: profil.nomor_badan_hukum,
        slug: profil.slug,
        nmkop: profil.nama_koperasi,
        tahun_laporan: parseInt(tahunLK),
        tanggal_laporan: tanggalLK,
        asset: parseNum(formData.asset),
        shu: parseNum(formData.shu),
        volusaha: parseNum(formData.volusaha),
        modalsendiri: parseNum(formData.modalsendiri),
        modalluar: parseNum(formData.modalluar)
      })

      if (metrikError) {
        console.error("Gagal simpan metrik:", metrikError)
      }

      toast.success('Laporan Keuangan berhasil diunggah!')
      setFileLK(null)
      fetchDokumen(profil.id)
    } catch (error: any) { 
      toast.error(error.message) 
    } finally { 
      setIsUploading(false) 
    }
  }

  const handleDownloadTemplate = async () => {
    const { data } = supabase.storage
      .from('berkas_sireko')
      .getPublicUrl(`templates/Template_Laporan_Keuangan.xlsx`)
      
    if (data && data.publicUrl) {
      window.open(data.publicUrl, '_blank')
    } else {
      toast.error("Gagal mendapatkan link template.")
    }
  }

  if (loading) return <div className="min-h-screen bg-white p-8 text-center text-slate-900 font-bold">Memuat...</div>

  return (
    <div className="min-h-screen bg-white pb-12 font-sans antialiased text-slate-900">
      <div className="max-w-4xl mx-auto px-4 space-y-8 pt-8">
        
        <header>
          <h1 className="text-2xl font-bold text-slate-900">Laporan Keuangan</h1>
          <p className="text-sm text-slate-500 mt-1">Unggah laporan keuangan koperasi Anda.</p>
        </header>

        <div className="bg-slate-50 p-6 rounded-xl shadow-sm border border-slate-200 mt-6">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Upload Laporan Keuangan</h2>
            <p className="text-sm text-slate-600 mb-5 font-medium">Unduh template laporan keuangan, isi dengan lengkap, dan unggah kembali dalam format Excel (.xlsx / .xls).</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Kiri: Unduh Template */}
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-md font-bold text-slate-800 mb-3 border-b pb-2">Unduh Template</h3>
                  <p className="text-sm text-slate-600 mb-4">Gunakan template resmi dari Dinas Koperasi untuk menyusun Laporan Keuangan Anda.</p>
                </div>
                <button onClick={handleDownloadTemplate} className="w-full py-2.5 bg-indigo-50 text-indigo-700 font-bold rounded shadow-sm hover:bg-indigo-100 transition-colors border border-indigo-200">
                  Unduh Template (Excel)
                </button>
              </div>

              {/* Kanan: Upload File */}
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-md font-bold text-slate-800 mb-3 border-b pb-2">Unggah File & Input Angka</h3>
                  <form id="form-laporan-keuangan" onSubmit={handleUpload} className="space-y-4 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Tanggal Upload:</label>
                        <input type="date" value={tanggalLK} max={new Date().toISOString().split('T')[0]} onChange={(e) => setTanggalLK(e.target.value)} className="w-full rounded-md border border-slate-300 p-2 bg-slate-50 text-slate-900 font-medium focus:border-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Klasifikasi:</label>
                        <select value={jenisPeriode} onChange={(e) => setJenisPeriode(e.target.value)} className="w-full rounded-md border border-slate-300 p-2 bg-slate-50 text-slate-900 font-medium focus:border-indigo-500">
                          <option value="bulanan">Bulanan</option>
                          <option value="triwulan">Triwulan</option>
                          <option value="semesteran">Semester</option>
                          <option value="tahunan">Tahunan</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Tahun Laporan:</label>
                        <input type="number" min="2000" max={new Date().getFullYear()} value={tahunLK} onChange={(e) => setTahunLK(e.target.value)} className="w-full rounded-md border border-slate-300 p-2 bg-slate-50 text-slate-900 font-medium focus:border-indigo-500" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border border-slate-200 p-3 rounded-md bg-slate-50">
                      <div className="col-span-2 text-sm font-bold text-slate-800 border-b pb-1 mb-1">Data Keuangan (Rupiah)</div>
                      
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-700">Total Aset</label>
                        <input type="number" min="0" value={formData.asset} onChange={(e) => handleInputChange('asset', e.target.value)} placeholder="Contoh: 150000000" className="w-full p-1.5 border border-slate-300 rounded outline-none focus:border-indigo-500 text-sm" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-700">SHU</label>
                        <input type="number" value={formData.shu} onChange={(e) => handleInputChange('shu', e.target.value)} placeholder="Contoh: 25000000" className="w-full p-1.5 border border-slate-300 rounded outline-none focus:border-indigo-500 text-sm" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-700">Volume Usaha</label>
                        <input type="number" min="0" value={formData.volusaha} onChange={(e) => handleInputChange('volusaha', e.target.value)} placeholder="Contoh: 50000000" className="w-full p-1.5 border border-slate-300 rounded outline-none focus:border-indigo-500 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700">Modal Sendiri</label>
                        <input type="number" min="0" value={formData.modalsendiri} onChange={(e) => handleInputChange('modalsendiri', e.target.value)} className="w-full p-1.5 border border-slate-300 rounded outline-none focus:border-indigo-500 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700">Modal Luar</label>
                        <input type="number" min="0" value={formData.modalluar} onChange={(e) => handleInputChange('modalluar', e.target.value)} className="w-full p-1.5 border border-slate-300 rounded outline-none focus:border-indigo-500 text-sm" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Pilih File Excel Laporan Keuangan:</label>
                      <input type="file" accept=".xlsx, .xls" onChange={(e) => setFileLK(e.target.files?.[0] || null)} className="w-full text-sm text-slate-800 p-1.5 border border-slate-300 rounded bg-slate-50 shadow-sm" />
                    </div>
                  </form>
                </div>
                <button type="submit" form="form-laporan-keuangan" disabled={isUploading || !fileLK} className="w-full py-2.5 bg-teal-600 text-white font-bold rounded shadow-md hover:bg-teal-700 disabled:bg-slate-400 transition-colors mt-4">
                  {isUploading ? "Mengunggah..." : "Simpan Angka & Upload Laporan"}
                </button>
              </div>
            </div>
        </div>

        {/* RIWAYAT */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-md font-bold text-slate-800 uppercase mb-4 tracking-wider">Riwayat Unggah Laporan Keuangan</h2>
          
          {/* FILTER RIWAYAT */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-600 mb-1">Status Verifikasi</label>
              <select value={filterVerifikasi} onChange={(e) => setFilterVerifikasi(e.target.value)} className="w-full rounded border border-slate-300 p-1.5 text-sm bg-white">
                <option value="Semua">Semua Status</option>
                <option value="hijau">Sudah Diverifikasi (Hijau)</option>
                <option value="biru">Sedang Diproses (Biru)</option>
                <option value="merah">Belum Dicek (Merah)</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-600 mb-1">Klasifikasi</label>
              <select value={filterKlasifikasi} onChange={(e) => setFilterKlasifikasi(e.target.value)} className="w-full rounded border border-slate-300 p-1.5 text-sm bg-white">
                <option value="Semua">Semua Klasifikasi</option>
                <option value="bulanan">Bulanan</option>
                <option value="triwulan">Triwulan</option>
                <option value="semesteran">Semester</option>
                <option value="tahunan">Tahunan</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-600 mb-1">Tanggal Upload Spesifik</label>
              <input type="date" value={filterTanggal} onChange={(e) => setFilterTanggal(e.target.value)} className="w-full rounded border border-slate-300 p-1.5 text-sm bg-white" />
            </div>
          </div>

          {dokumenList.filter((doc: any) => {
            let matches = true;
            if (filterVerifikasi !== 'Semua' && doc.status_indikator !== filterVerifikasi) matches = false;
            if (filterKlasifikasi !== 'Semua' && doc.jenis_laporan !== filterKlasifikasi) matches = false;
            if (filterTanggal && new Date(doc.uploaded_at).toISOString().split('T')[0] !== filterTanggal) matches = false;
            return matches;
          }).length === 0 ? <p className="text-sm text-slate-500 italic font-medium py-4 text-center">Belum ada laporan keuangan yang sesuai kriteria.</p> : (
            <div className="space-y-3">
              {dokumenList.filter((doc: any) => {
                let matches = true;
                if (filterVerifikasi !== 'Semua' && doc.status_indikator !== filterVerifikasi) matches = false;
                if (filterKlasifikasi !== 'Semua' && doc.jenis_laporan !== filterKlasifikasi) matches = false;
                if (filterTanggal && new Date(doc.uploaded_at).toISOString().split('T')[0] !== filterTanggal) matches = false;
                return matches;
              }).map((doc: any) => (
                <div key={doc.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 border border-slate-200 rounded-lg bg-slate-50 hover:border-indigo-200 transition-colors gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-900 text-md capitalize">Laporan {doc.jenis_laporan} Tahun {doc.periode_laporan}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase ${
                        doc.status_indikator === 'hijau' ? 'bg-emerald-500' :
                        doc.status_indikator === 'biru' ? 'bg-blue-500' :
                        doc.status_indikator === 'kuning' ? 'bg-yellow-500' : 'bg-rose-500'
                      }`}>
                        {doc.status_indikator === 'hijau' ? 'Terverifikasi' : doc.status_indikator === 'biru' ? 'Diproses' : 'Belum Dicek'}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-600">Tanggal Upload: <span className="font-bold text-slate-800">{new Date(doc.uploaded_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
                  </div>
                  <div className="flex items-center gap-4">
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
