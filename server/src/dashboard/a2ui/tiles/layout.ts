import type { Json } from '../../../ag-ui.ts';
import {
  card,
  column,
  image,
  row,
  text,
  weighted,
  type Component,
  type TextVariant,
  type TileView,
} from '../protocol.ts';

export type Fragment = { root: string; components: Component[] };

export type Photo = { imageUrl: string; title: string; subtitle: string };

const PHOTO_WEIGHT = 1;
const CAPTION_WEIGHT = 3;

export function toParagraph(id: string, content: string): Fragment {
  const paragraph = text(id, content);
  return { root: id, components: [paragraph] };
}

function toTableRow(
  id: string,
  values: string[],
  variant: TextVariant,
  weights: number[],
): Fragment {
  const cells = values.map((value, index) => {
    const cell = text(`${id}-c${index}`, value, variant);
    return weighted(cell, weights[index] ?? 1);
  });
  const cellIds = cells.map((cell) => cell.id);
  const line = row(id, cellIds);
  return { root: id, components: [line, ...cells] };
}

export function toTable(
  id: string,
  headers: string[],
  rows: string[][],
  weights: number[] = [],
): Fragment {
  const header = toTableRow(`${id}-h`, headers, 'h5', weights);
  const lines = rows.map((values, index) =>
    toTableRow(`${id}-r${index}`, values, 'body', weights),
  );
  const all = [header, ...lines];
  const lineIds = all.map((line) => line.root);
  const table = column(id, lineIds);
  const components = all.flatMap((line) => line.components);
  return { root: id, components: [table, ...components] };
}

function toPhotoRow(id: string, photo: Photo): Fragment {
  const pictureId = `${id}-photo`;
  const captionId = `${id}-caption`;
  const titleId = `${id}-title`;
  const subtitleId = `${id}-subtitle`;

  const picture = image(pictureId, photo.imageUrl, photo.title);
  const title = text(titleId, photo.title, 'h4');
  const subtitle = text(subtitleId, photo.subtitle);
  const caption = column(captionId, [titleId, subtitleId]);
  const line = row(id, [pictureId, captionId], 'center');

  const weightedPicture = weighted(picture, PHOTO_WEIGHT);
  const weightedCaption = weighted(caption, CAPTION_WEIGHT);
  return { root: id, components: [line, weightedPicture, weightedCaption, title, subtitle] };
}

export function toPhotoList(id: string, photos: Photo[]): Fragment {
  const rows = photos.map((photo, index) => toPhotoRow(`${id}-p${index}`, photo));
  const rowIds = rows.map((entry) => entry.root);
  const list = column(id, rowIds);
  const components = rows.flatMap((entry) => entry.components);
  return { root: id, components: [list, ...components] };
}

export function toTile(
  id: string,
  title: string,
  fragments: Fragment[],
  data: Json | null = null,
): TileView {
  const titleId = `${id}-title`;
  const bodyId = `${id}-body`;
  const heading = text(titleId, title, 'h3');
  const roots = fragments.map((fragment) => fragment.root);
  const body = column(bodyId, [titleId, ...roots]);
  const frame = card(id, bodyId);
  const components = fragments.flatMap((fragment) => fragment.components);
  return { root: id, components: [frame, body, heading, ...components], data };
}
