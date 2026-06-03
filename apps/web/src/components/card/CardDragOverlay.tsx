import { CardFace } from './CardFace';
import type { Card } from '@questboard/shared';

interface CardDragOverlayProps {
  card: Card;
}

export function CardDragOverlay({ card }: CardDragOverlayProps) {
  return (
    <CardFace card={card} onClick={() => {}} isDragOverlay />
  );
}
