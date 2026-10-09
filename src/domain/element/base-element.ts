import { ElementId } from '../shared/value-objects/element-id';
import { Position } from '../shared/value-objects/position';
import { Size } from '../shared/value-objects/size';
import { UserId } from '../shared/value-objects/user-id';
import { WorkspaceId } from '../shared/value-objects/workspace-id';
import type { ElementType } from './element-types';

export interface BaseElementProps {
  readonly id: ElementId;
  readonly workspaceId: WorkspaceId;
  readonly type: ElementType;
  readonly position: Position;
  readonly size: Size;
  readonly rotation: number;
  readonly createdBy: UserId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export abstract class BaseElement {
  readonly id: ElementId;
  readonly workspaceId: WorkspaceId;
  readonly type: ElementType;
  readonly position: Position;
  readonly size: Size;
  readonly rotation: number;
  readonly createdBy: UserId;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  protected constructor(props: BaseElementProps) {
    this.id = props.id;
    this.workspaceId = props.workspaceId;
    this.type = props.type;
    this.position = props.position;
    this.size = props.size;
    this.rotation = props.rotation;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
