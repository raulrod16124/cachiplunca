import {
  searchWorkspacesByName,
  WORKSPACE_SEARCH_RESULT_LIMIT,
} from '../../../../presentation/hooks/use-workspace-search';
import { UserId, WorkspaceId } from '../../../../domain/shared';
import { Workspace } from '../../../../domain/workspace';

function workspace(name: string): Workspace {
  return Workspace.create({
    id: WorkspaceId.create(name.toLocaleLowerCase().replace(/\s+/g, '-')),
    name,
    createdBy: UserId.create('user-1'),
  });
}

describe('searchWorkspacesByName', () => {
  const workspaces = [workspace('Roadmap Q4'), workspace('Retrospectiva'), workspace('Equipo')];

  it('matches by name case and accent-insensitively', () => {
    expect(searchWorkspacesByName(workspaces, 'roadmap').map((entry) => entry.name)).toEqual([
      'Roadmap Q4',
    ]);
    expect(searchWorkspacesByName(workspaces, 'RETROSPECTÍVA').map((entry) => entry.name)).toEqual([
      'Retrospectiva',
    ]);
  });

  it('returns no results for empty queries', () => {
    expect(searchWorkspacesByName(workspaces, '')).toEqual([]);
  });

  it('respects the result limit', () => {
    expect(searchWorkspacesByName(workspaces, 'e', 2)).toHaveLength(2);
    expect(searchWorkspacesByName(workspaces, 'e', 0)).toEqual([]);
  });

  it('uses a bounded default limit', () => {
    const many = Array.from({ length: WORKSPACE_SEARCH_RESULT_LIMIT + 3 }, (_, index) =>
      workspace(`Plan ${index}`),
    );

    expect(searchWorkspacesByName(many, 'plan')).toHaveLength(WORKSPACE_SEARCH_RESULT_LIMIT);
  });
});
