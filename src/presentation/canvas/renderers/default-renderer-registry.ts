import { ConnectorRenderer } from './connector-renderer';
import type { ElementRendererRegistry } from './element-renderer';
import { FrameRenderer } from './frame-renderer';
import { LinkRenderer } from './link-renderer';
import { NoteRenderer } from './note-renderer';
import { TaskRenderer } from './task-renderer';
import { TextRenderer } from './text-renderer';

export const defaultRendererRegistry: ElementRendererRegistry = {
  text: TextRenderer,
  note: NoteRenderer,
  task: TaskRenderer,
  frame: FrameRenderer,
  connector: ConnectorRenderer,
  link: LinkRenderer,
};
