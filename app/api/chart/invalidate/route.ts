import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Invalidate cached chart images when workstreams are updated
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { graphId } = await request.json()

    if (!graphId) {
      return NextResponse.json({ error: 'graphId required' }, { status: 400 })
    }

    // Verify user owns this graph
    const { data: graph } = await supabase
      .from('effort_graphs')
      .select('author_id')
      .eq('id', graphId)
      .single()

    if (!graph || graph.author_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Delete cached chart images (both themes)
    const filesToDelete = [
      `${user.id}/${graphId}-dark.png`,
      `${user.id}/${graphId}-light.png`,
    ]

    for (const file of filesToDelete) {
      await supabase.storage.from('effort-charts').remove([file])
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error invalidating cache:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
