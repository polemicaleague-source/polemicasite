// Shared types for Edge Functions

export interface ClassificaRow {
  id: string;
  nome: string;
  presenze: number;
  gol_totali: number;
  assist_totali: number;
  media_voto: number | null;
  gcp: number | null;
  plus_minus: number;
}

export interface PlayerTrendRow {
  player_id: string;
  giornata: number;
  data: string;
  er: number | null;
  voto: number | null;
  gol: number;
  assist: number;
  risultato: string;
  differenza_reti: number;
}

export interface Rivalry {
  id: string;
  player1_id: string;
  player2_id: string;
  player1_nome: string;
  player2_nome: string;
  tag: string | null;
  partite_insieme: number;
  vittorie_insieme: number;
  sconfitte_insieme: number;
  partite_contro: number;
  vittorie_g1: number;
  vittorie_g2: number;
  totale_partite: number;
}

export type ClassificaType = "gcp" | "voto" | "marcatori";
