import { create } from 'zustand'
import { friendlyError } from '../lib/errors'
import { supabase } from '../lib/supabase'
import type { CompareRow, Friend } from '../lib/types'

type Status = 'idle' | 'loading' | 'ready' | 'error'

interface FriendsState {
  status: Status
  error: string | null
  friends: Friend[]
  load: () => Promise<void>
  /** Returns 'sent', or 'accepted' when they had already asked you. */
  send: (username: string) => Promise<'sent' | 'accepted'>
  respond: (id: string, accept: boolean) => Promise<void>
  /** Cancel a sent request or unfriend. */
  remove: (id: string) => Promise<void>
  reset: () => void
}

let loadSeq = 0

export const useFriends = create<FriendsState>((set, get) => ({
  status: 'idle',
  error: null,
  friends: [],

  load: async () => {
    const seq = ++loadSeq
    if (get().status !== 'ready') set({ status: 'loading', error: null })
    const { data, error } = await supabase.rpc('list_friends')
    if (seq !== loadSeq) return
    if (error) set({ status: 'error', error: friendlyError(error) })
    else set({ status: 'ready', error: null, friends: data as Friend[] })
  },

  send: async (username) => {
    const { data, error } = await supabase.rpc('send_friend_request', { p_username: username })
    if (error) throw new Error(friendlyError(error))
    await get().load()
    return data as 'sent' | 'accepted'
  },

  respond: async (id, accept) => {
    const { error } = await supabase.rpc('respond_friend_request', { p_id: id, p_accept: accept })
    if (error) throw new Error(friendlyError(error))
    await get().load()
  },

  remove: async (id) => {
    const { error } = await supabase.from('friendships').delete().eq('id', id)
    if (error) throw new Error(friendlyError(error))
    set({ friends: get().friends.filter((f) => f.id !== id) })
  },

  reset: () => {
    loadSeq++
    set({ status: 'idle', error: null, friends: [] })
  },
}))

export async function fetchComparison(friendId: string, from: string, to: string): Promise<CompareRow[]> {
  let tz = 'UTC'
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    /* keep UTC */
  }
  const { data, error } = await supabase.rpc('compare_progress', { p_friend: friendId, p_from: from, p_to: to, p_tz: tz })
  if (error) throw new Error(friendlyError(error))
  return data as CompareRow[]
}
