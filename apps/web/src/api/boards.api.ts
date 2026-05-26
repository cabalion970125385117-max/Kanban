import client from './client';
import type { Board, BoardMember, Column, Label } from '@questboard/shared';
import type { CreateBoardInput, UpdateBoardInput, AddBoardMemberInput, CreateColumnInput, UpdateColumnInput, CreateLabelInput, UpdateLabelInput } from '@questboard/shared';

export async function getBoards(): Promise<Board[]> {
  const res = await client.get<Board[]>('/boards');
  return res.data;
}

export async function createBoard(data: CreateBoardInput): Promise<Board> {
  const res = await client.post<Board>('/boards', data);
  return res.data;
}

export async function getBoard(boardId: string): Promise<Board> {
  const res = await client.get<Board>(`/boards/${boardId}`);
  return res.data;
}

export async function updateBoard(boardId: string, data: UpdateBoardInput): Promise<Board> {
  const res = await client.put<Board>(`/boards/${boardId}`, data);
  return res.data;
}

export async function deleteBoard(boardId: string): Promise<void> {
  await client.delete(`/boards/${boardId}`);
}

export async function getBoardMembers(boardId: string): Promise<BoardMember[]> {
  const res = await client.get<BoardMember[]>(`/boards/${boardId}/members`);
  return res.data;
}

export async function addBoardMember(boardId: string, data: AddBoardMemberInput): Promise<void> {
  await client.post(`/boards/${boardId}/members`, data);
}

export async function removeBoardMember(boardId: string, userId: string): Promise<void> {
  await client.delete(`/boards/${boardId}/members/${userId}`);
}

export async function getColumns(boardId: string): Promise<Column[]> {
  const res = await client.get<Column[]>(`/boards/${boardId}/columns`);
  return res.data;
}

export async function createColumn(boardId: string, data: CreateColumnInput): Promise<Column> {
  const res = await client.post<Column>(`/boards/${boardId}/columns`, data);
  return res.data;
}

export async function updateColumn(boardId: string, columnId: string, data: UpdateColumnInput): Promise<Column> {
  const res = await client.put<Column>(`/boards/${boardId}/columns/${columnId}`, data);
  return res.data;
}

export async function deleteColumn(boardId: string, columnId: string): Promise<void> {
  await client.delete(`/boards/${boardId}/columns/${columnId}`);
}

export async function reorderColumns(boardId: string, order: string[]): Promise<void> {
  await client.post(`/boards/${boardId}/columns/reorder`, { order });
}

export async function getLabels(boardId: string): Promise<Label[]> {
  const res = await client.get<Label[]>(`/boards/${boardId}/labels`);
  return res.data;
}

export async function createLabel(boardId: string, data: CreateLabelInput): Promise<Label> {
  const res = await client.post<Label>(`/boards/${boardId}/labels`, data);
  return res.data;
}

export async function updateLabel(boardId: string, labelId: string, data: UpdateLabelInput): Promise<Label> {
  const res = await client.put<Label>(`/boards/${boardId}/labels/${labelId}`, data);
  return res.data;
}

export async function deleteLabel(boardId: string, labelId: string): Promise<void> {
  await client.delete(`/boards/${boardId}/labels/${labelId}`);
}
