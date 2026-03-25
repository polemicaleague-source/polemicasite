import { supabase } from '../lib/supabase'
import type { Player } from '../lib/schemas'

export async function getPlayers(): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('id, nome, er, tratto, tenore_fisico, base_rating, last_er, delta_rating, player_roles(ruolo, ordine)')
    .order('nome')

  if (error) throw error
  return data as Player[]
}

export async function getPlayer(id: string): Promise<Player> {
  const { data, error } = await supabase
    .from('players')
    .select('id, nome, er, tratto, tenore_fisico, base_rating, last_er, delta_rating, player_roles(ruolo, ordine)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Player
}
