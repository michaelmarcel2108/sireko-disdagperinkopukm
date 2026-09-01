import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const filename = formData.get('filename') as string

    if (!file || !filename) {
      return NextResponse.json({ error: "File atau filename tidak ditemukan." }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()

    const { error: uploadError } = await supabaseAdmin.storage
      .from('berkas_sireko')
      .upload(`templates/${filename}`, arrayBuffer, {
        upsert: true,
        contentType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

    if (uploadError) {
      throw new Error(uploadError.message)
    }

    return NextResponse.json({ status: "sukses" })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
