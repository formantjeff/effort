import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-service'
import { createClient } from '@/lib/supabase-server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ graphId: string }> }
) {
  try {
    const { graphId } = await params
    const supabase = await createClient()

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns this graph
    const { data: graph, error: graphError } = await supabase
      .from('effort_graphs')
      .select('author_id')
      .eq('id', graphId)
      .single()

    if (graphError || !graph) {
      return NextResponse.json({ error: 'Graph not found' }, { status: 404 })
    }

    if (graph.author_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete chart images from storage
    const serviceSupabase = createServiceClient()
    const { data: files } = await serviceSupabase
      .storage
      .from('effort-charts')
      .list(user.id, {
        search: graphId
      })

    if (files && files.length > 0) {
      const filesToDelete = files.map(f => `${user.id}/${f.name}`)
      await serviceSupabase
        .storage
        .from('effort-charts')
        .remove(filesToDelete)
    }

    // Delete workstreams (cascades from graph deletion, but explicit for clarity)
    await supabase
      .from('workstreams')
      .delete()
      .eq('graph_id', graphId)

    // Delete shared_efforts
    await supabase
      .from('shared_efforts')
      .delete()
      .eq('graph_id', graphId)

    // Delete the graph
    const { error: deleteError } = await supabase
      .from('effort_graphs')
      .delete()
      .eq('id', graphId)

    if (deleteError) {
      console.error('Error deleting graph:', deleteError)
      return NextResponse.json({ error: 'Failed to delete effort' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/effort/[graphId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
