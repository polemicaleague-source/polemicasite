import { supabase } from '../lib/supabase'

export interface NewsItem {
  id: string
  giornata: number
  data: string | null
  posizione: number | null
  titolo: string
  corpo: string | null
}

export async function getNews(giornata?: number): Promise<NewsItem[]> {
  let query = supabase
    .from('news')
    .select('id, giornata, data, posizione, titolo, corpo')
    .order('giornata', { ascending: false })
    .order('posizione', { ascending: true })

  if (giornata !== undefined) {
    query = query.eq('giornata', giornata)
  }

  const { data, error } = await query
  if (error) throw error
  return data as NewsItem[]
}

export interface ManifestoArticle {
  id: string
  articolo: string
  nome_articolo: string
  corpo: string | null
}

export async function getManifesto(): Promise<ManifestoArticle[]> {
  const { data, error } = await supabase
    .from('manifesto')
    .select('id, articolo, nome_articolo, corpo')
    .order('articolo')

  if (error) throw error
  return data as ManifestoArticle[]
}
