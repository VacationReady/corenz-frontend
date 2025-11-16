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

  forest.forEach((tree: OrgNode, index: number) => {
    const measured = measureNode(tree, config, 0);
    measuredForest.push(measured);
    maxDepth = Math.max(maxDepth, measured.depth);
    forestWidth += measured.width;
    if (index < forest.length - 1) {
      forestWidth += config.rootSpacing;
    }
  });

  return { measuredForest, maxDepth, forestWidth };
};

// Measure a single node and its subtree
const measureNode = (
  node: OrgNode,
  config: LayoutConfig,
  depth: number,
): MeasuredOrgNode => {
  // Recursively measure all children
  const children = node.children.map((child: OrgNode) =>
    measureNode(child, config, depth + 1),
  );

  // Calculate depth (maximum depth among all children)
  const maxChildDepth = children.length > 0
    ? Math.max(...children.map((child: MeasuredOrgNode) => child.depth))
    : depth;

  // Calculate width needed for this subtree
  let width: number;
  if (children.length === 0) {
    // Leaf node - just the node width
    width = config.nodeWidth;
  } else if (children.length === 1) {
    // Single child - use child's width (child will be centered below)
    width = Math.max(config.nodeWidth, children[0].width);
  } else {
    // Multiple children - sum of children widths plus spacing between them
    const totalChildWidth = children.reduce(
      (sum: number, child: MeasuredOrgNode) => sum + child.width,
      0,
    );
    const spacingWidth = (children.length - 1) * config.horizontalSpacing;
    width = Math.max(config.nodeWidth, totalChildWidth + spacingWidth);
  }

  return {
    node,
    width,
    depth: maxChildDepth,
    children,
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
  // Center the current node within its allocated width
  const nodeX = x + (measuredNode.width - config.nodeWidth) / 2;
  positions.set(measuredNode.node.id, { x: nodeX, y });

  if (measuredNode.children.length === 0) {
    return;
  }

  // Calculate the Y position for children
  const childY = y + config.nodeHeight + config.verticalSpacing;

  if (measuredNode.children.length === 1) {
    // Single child - center it below the parent
    const child = measuredNode.children[0];
    const childX = x + (measuredNode.width - child.width) / 2;
    assignMeasuredPositions(child, config, childX, childY, positions);
  } else {
    // Multiple children - distribute them horizontally
    const totalChildWidth = measuredNode.children.reduce(
      (sum: number, child: MeasuredOrgNode) => sum + child.width,
      0,
    );
    const totalSpacing = (measuredNode.children.length - 1) * config.horizontalSpacing;
    const totalWidth = totalChildWidth + totalSpacing;
    
    // Start X position to center all children under the parent
    let currentX = x + (measuredNode.width - totalWidth) / 2;

    measuredNode.children.forEach((child: MeasuredOrgNode, index: number) => {
      assignMeasuredPositions(child, config, currentX, childY, positions);
      currentX += child.width;
      if (index < measuredNode.children.length - 1) {
        currentX += config.horizontalSpacing;
      }
    });
  }
};
