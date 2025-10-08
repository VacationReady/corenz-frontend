/**
 * Utility functions for org chart tree operations
 */

interface OrgEmployee {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  jobRoleId: string | null;
  department: string | null;
  departmentId: string | null;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  profileImageUrl: string | null;
  managerUserId: string | null;
  managerName: string | null;
  permissionProfileName?: string | null;
}

interface OrgNode extends OrgEmployee {
  children: OrgNode[];
  isMatch?: boolean;
}

type LayoutConfig = {
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  rootSpacing: number;
  verticalSpacing: number;
};

type MeasuredOrgNode = {
  node: OrgNode;
  width: number;
  depth: number;
  children: MeasuredOrgNode[];
};

// Count total nodes in a tree
export const countNodes = (nodes: OrgNode[]): number => {
  return nodes.reduce((total: number, node: OrgNode) => {
    return total + 1 + countNodes(node.children);
  }, 0);
};

// Flatten a tree into an array
export const flattenTree = (nodes: OrgNode[]): OrgNode[] => {
  return nodes.flatMap((node: OrgNode) => [node, ...flattenTree(node.children)]);
};

// Measure the dimensions of an org forest
export const measureOrgForest = (
  forest: OrgNode[],
  config: LayoutConfig,
): { measuredForest: MeasuredOrgNode[]; maxDepth: number; forestWidth: number } => {
  const measuredForest: MeasuredOrgNode[] = [];
  let maxDepth = 0;
  let forestWidth = 0;

  forest.forEach((tree: OrgNode) => {
    const measured = measureNode(tree, config, 0);
    measuredForest.push(measured);
    maxDepth = Math.max(maxDepth, measured.depth);
    forestWidth += measured.width;
  });

  return { measuredForest, maxDepth, forestWidth };
};

// Measure a single node and its subtree
const measureNode = (
  node: OrgNode,
  config: LayoutConfig,
  depth: number,
): MeasuredOrgNode => {
  const children = node.children.map((child: OrgNode) =>
    measureNode(child, config, depth + 1),
  );

  const childWidth = children.reduce((sum: number, child: MeasuredOrgNode) => sum + child.width, 0);
  const childDepth = children.length > 0
    ? Math.max(...children.map((child: MeasuredOrgNode) => child.depth))
    : 0;

  const width = Math.max(
    config.nodeWidth,
    children.length > 0
      ? childWidth + (children.length - 1) * config.horizontalSpacing
      : config.nodeWidth,
  );

  const nodeDepth = depth + childDepth;

  return {
    node,
    width,
    depth: nodeDepth,
    children: children,
  };
};

// Assign positions to nodes in a measured tree
export const assignMeasuredPositions = (
  measuredNode: MeasuredOrgNode,
  config: LayoutConfig,
  x: number,
  y: number,
  positions: Map<string, { x: number; y: number }>,
): void => {
  positions.set(measuredNode.node.id, { x, y });

  if (measuredNode.children.length === 0) {
    return;
  }

  const totalChildWidth = measuredNode.children.reduce(
    (sum: number, child: MeasuredOrgNode) => sum + child.width,
    0,
  );

  let currentX = x + (measuredNode.width - totalChildWidth) / 2;

  measuredNode.children.forEach((child: MeasuredOrgNode) => {
    assignMeasuredPositions(child, config, currentX, y + config.verticalSpacing, positions);
    currentX += child.width;
  });
};
