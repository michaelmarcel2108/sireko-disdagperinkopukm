import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Fungsi untuk membuat slug otomatis
const createUniqueSlug = async (nama: string) => {
  let baseSlug = (nama || 'koperasi')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

  let slug = baseSlug
  let counter = 1
  let isUnique = false

  while (!isUnique) {
    const { data } = await supabaseAdmin
      .from('profil_koperasi')
      .select('slug')
      .eq('slug', slug)
      .single()

    if (!data) {
      isUnique = true
    } else {
      slug = `${baseSlug}-${counter}`
      counter++
    }
  }
  return slug
}

export async function POST(req: Request) {
  try {
    const { nama_koperasi, email, password } = await req.json()

    if (!nama_koperasi || !email || !password) {
      return NextResponse.json({ error: "Nama, email, dan password wajib diisi." }, { status: 400 })
    }

    // 1. Buat User di Auth dengan role = 'koperasi'
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'koperasi' }
    })

    if (authError) {
      throw new Error("Gagal membuat kredensial login: " + authError.message)
    }

    const userId = authData.user.id

    // 2. Generate Slug Unik
    const slug = await createUniqueSlug(nama_koperasi)

    // 3. Masukkan ke profil_koperasi
    const { error: profilError } = await supabaseAdmin
      .from('profil_koperasi')
      .insert({
        user_id: userId,
        nama_koperasi: nama_koperasi,
        slug: slug
      })

    if (profilError) {
      // Rollback auth user jika profil gagal dibuat
      await supabaseAdmin.auth.admin.deleteUser(userId)
      throw new Error("Gagal membuat profil koperasi: " + profilError.message)
    }

    return NextResponse.json({ status: "sukses", message: "Koperasi berhasil ditambahkan." })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
