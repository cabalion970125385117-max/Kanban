import client from './client';
import type { Card } from '@questboard/shared';
import type { CreateCardInput, UpdateCardInput, MoveCardInput, ListCardsQuery } from '@questboard/shared';

export interface CardsResponse {
  cards: Card[];
  total: number;
  page: number;
  limit: number;
}

export async function getCards(boardId: string, query?: Partial<ListCardsQuery>): Promise<CardsResponse> {
  const res = await client.get<CardsResponse>(`/boards/${boardId}/cards`, { params: query });
  return res.data;
}

export async function createCard(boardId: string, data: CreateCardInput): Promise<Card> {
  const res = await client.post<Card>(`/boards/${boardId}/cards`, data);
  return res.data;
}

export async function getCard(cardId: string): Promise<Card> {
  const res = await client.get<Card>(`/cards/${cardId}`);
  return res.data;
}

export async function updateCard(cardId: string, data: UpdateCardInput): Promise<Card> {
  const res = await client.put<Card>(`/cards/${cardId}`, data);
  return res.data;
}

export async function deleteCard(cardId: string): Promise<void> {
  await client.delete(`/cards/${cardId}`);
}

export async function moveCard(cardId: string, data: MoveCardInput): Promise<Card> {
  const res = await client.post<Card>(`/cards/${cardId}/move`, data);
  return res.data;
}
