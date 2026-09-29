'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import NavbarAdmin from '@/components/NavbarAdmin'
import toast from 'react-hot-toast'

export default function PengaturanAdmin() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  // State Form Koperasi
  const [namaKoperasi, setNamaKoperasi] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmittingKoperasi, setIsSubmittingKoperasi] = useState(false)

  // State Form Template
  const [kategoriKUK, setKategoriKUK] = useState('KUK1_2')
  const [jenisKoperasi, setJenisKoperasi] = useState('KSP')
  const [fileTemplate, setFileTemplate] = useState<File | null>(null)
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false)

  // State Form Template Umum
  const [jenisTemplateUmum, setJenisTemplateUmum] = useState('Template_Laporan_Keuangan.xlsx')
  const [fileTemplateUmum, setFileTemplateUmum] = useState<File | null>(null)
  const [isUploadingUmum, setIsUploadingUmum] = useState(false)

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setLoading(false)
    } catch (err) {
      console.error(err)
    }
  }

  const handleTambahKoperasi = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingKoperasi(true)

    if (password.length < 6) {
      toast.error('Password minimal 6 karakter.')
      setIsSubmittingKoperasi(false)
      return
    }

    try {
      const response = await fetch('/api/tambah-koperasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama_koperasi: namaKoperasi, email, password })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Gagal menambahkan koperasi.')
      }

      toast.success(result.message)
      setNamaKoperasi('')
      setEmail('')
      setPassword('')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmittingKoperasi(false)
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
      const filename = `${kategoriKUK}_${jenisKoperasi}.xlsx`
      
      const formData = new FormData()
      formData.append('file', fileTemplate)
      formData.append('filename', filename)

      const response = await fetch('/api/upload-template', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Gagal mengunggah template.')
      }

      toast.success(`Template ${filename} berhasil diunggah!`)
      setFileTemplate(null)
    } catch (err: any) {
      console.error(err)
      toast.error("Gagal mengunggah template: " + err.message)
    } finally {
      setIsUploadingTemplate(false)
    }
  }

  const handleUploadTemplateUmum = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fileTemplateUmum) {
      toast.error("Pilih file template terlebih dahulu!")
      return
    }

    setIsUploadingUmum(true)

    try {
      const formData = new FormData()
      formData.append('file', fileTemplateUmum)
      
      // Because users might upload pdf or docx, let's keep the extension from the dropdown value as the expected standard,
      // but if the uploaded file has a different extension, we might want to replace it.
      // However, the dropdown values have extensions hardcoded. We will just use the hardcoded filename.
      const filename = jenisTemplateUmum
      formData.append('filename', filename)

      const response = await fetch('/api/upload-template', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Gagal mengunggah template.')
      }

      toast.success(`Template ${filename} berhasil diunggah!`)
      setFileTemplateUmum(null)
    } catch (err: any) {
      console.error(err)
      toast.error("Gagal mengunggah template: " + err.message)
    } finally {
      setIsUploadingUmum(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-slate-50 p-8 text-center text-slate-900 font-bold">Memuat...</div>

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pengaturan & Sistem</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola pembuatan akun baru dan perbarui template dokumen sistem.</p>
        </div>

        {/* SECTION 1: TAMBAH KOPERASI BARU */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Pendaftaran Koperasi Baru</h2>
          <p className="text-sm text-slate-600 mb-6 font-medium">
            Daftarkan koperasi secara manual ke dalam sistem SIREKO. Akun yang dibuat di sini dapat langsung digunakan untuk login.
          </p>

          <form onSubmit={handleTambahKoperasi} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nama Koperasi</label>
                <input 
                  type="text" 
                  required
                  value={namaKoperasi}
                  onChange={(e) => setNamaKoperasi(e.target.value)}
                  className="w-full rounded-md border border-slate-300 p-2.5 bg-slate-50 text-slate-900 font-medium focus:border-indigo-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Email Login</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-slate-300 p-2.5 bg-slate-50 text-slate-900 font-medium focus:border-indigo-500 focus:bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
              <input 
                type="text" 
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2.5 bg-slate-50 text-slate-900 font-medium focus:border-indigo-500 focus:bg-white"
              />
            </div>
            
            <div className="pt-2">
              <button 
                type="submit" 
                disabled={isSubmittingKoperasi}
                className="w-full sm:w-auto px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700 disabled:bg-slate-400 transition-colors"
              >
                {isSubmittingKoperasi ? 'Memproses...' : 'Daftarkan Koperasi'}
              </button>
            </div>
          </form>
        </div>

        {/* SECTION 2: UPLOAD TEMPLATE KERTAS KERJA */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Upload Template Kertas Kerja</h2>
          <p className="text-sm text-slate-600 mb-6 font-medium">
            Unggah dan perbarui template Kertas Kerja Verifikasi Mandiri. Jika file sudah ada, proses ini akan menimpanya.
          </p>

          <form onSubmit={handleUploadTemplate} className="space-y-4">
            <div className="mb-4 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
              <p className="text-xs text-indigo-800 font-medium">
                <strong>Klasifikasi KUK (Berdasarkan Total Modal/Aset):</strong><br/>
                • KUK 1 & 2: s.d Rp 15 Miliar<br/>
                • KUK 3: &gt; Rp 15 Miliar s.d Rp 40 Miliar<br/>
                • KUK 4: &gt; Rp 40 Miliar
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Kategori KUK:</label>
                <select value={kategoriKUK} onChange={(e) => setKategoriKUK(e.target.value)} className="w-full rounded-md border border-slate-300 p-2.5 bg-slate-50 text-slate-900 font-medium focus:border-indigo-500">
                  <option value="KUK1_2">KUK 1 & 2</option>
                  <option value="KUK3">KUK 3</option>
                  <option value="KUK4">KUK 4</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Jenis Koperasi:</label>
                <select value={jenisKoperasi} onChange={(e) => setJenisKoperasi(e.target.value)} className="w-full rounded-md border border-slate-300 p-2.5 bg-slate-50 text-slate-900 font-medium focus:border-indigo-500">
                  <option value="KSP">Koperasi Simpan Pinjam</option>
                  <option value="Koperasi_Konsumen">Koperasi Konsumen</option>
                  <option value="Koperasi_Produsen">Koperasi Produsen</option>
                  <option value="Koperasi_Pemasaran">Koperasi Pemasaran</option>
                  <option value="Koperasi_Jasa">Koperasi Jasa</option>
                  <option value="Koperasi_Desa_Kelurahan_Merah_Putih">Koperasi Desa/Kelurahan Merah Putih</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Pilih File Excel (.xlsx)</label>
              <input 
                type="file" 
                accept=".xlsx, .xls"
                onChange={(e) => setFileTemplate(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-800 p-2 border border-slate-300 rounded-md bg-slate-50 shadow-sm focus:border-indigo-500 focus:bg-white"
              />
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={isUploadingTemplate || !fileTemplate}
                className="w-full sm:w-auto px-8 py-2.5 bg-teal-600 text-white font-bold rounded-lg shadow hover:bg-teal-700 disabled:bg-slate-400 transition-colors"
              >
                {isUploadingTemplate ? 'Mengunggah...' : 'Upload & Perbarui Template'}
              </button>
            </div>
          </form>
        </div>

        {/* SECTION 3: UPLOAD TEMPLATE UMUM */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Upload Template Umum</h2>
          <p className="text-sm text-slate-600 mb-6 font-medium">
            Unggah dan perbarui template umum seperti Laporan Keuangan, Keragaan CSV, Surat Pernyataan Verifikasi Mandiri, atau Lampiran RAT.
          </p>

          <form onSubmit={handleUploadTemplateUmum} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Pilih Jenis Template:</label>
              <select value={jenisTemplateUmum} onChange={(e) => setJenisTemplateUmum(e.target.value)} className="w-full rounded-md border border-slate-300 p-2.5 bg-slate-50 text-slate-900 font-medium focus:border-indigo-500">
                <option value="Template_Laporan_Keuangan.xlsx">Template Laporan Keuangan (.xlsx/.xls)</option>
                <option value="Template_Laporan_Keragaan.csv">Template Laporan Keragaan (.csv)</option>
                <option value="Template_Surat_Pernyataan_Verifikasi.docx">Template Surat Pernyataan Verifikasi Mandiri (.docx/.pdf)</option>
                <option value="Template_Lampiran_RAT.docx">Template Lampiran Bahan-Bahan Ringkas RAT (.docx/.pdf)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Pilih File</label>
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv, .docx, .pdf"
                onChange={(e) => setFileTemplateUmum(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-800 p-2 border border-slate-300 rounded-md bg-slate-50 shadow-sm focus:border-indigo-500 focus:bg-white"
              />
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={isUploadingUmum || !fileTemplateUmum}
                className="w-full sm:w-auto px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700 disabled:bg-slate-400 transition-colors"
              >
                {isUploadingUmum ? 'Mengunggah...' : 'Upload & Perbarui Template Umum'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  )
}
