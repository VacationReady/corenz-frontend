/**
 * Auto-layout functionality using dagre
 * Automatically positions nodes in a hierarchical layout
 */

import dagre from "dagre";
import { Node, Edge, Position } from "reactflow";

const nodeWidth = 200;
const nodeHeight = 80;

export interface LayoutOptions {
  direction?: "TB" | "LR" | "BT" | "RL";
  nodeSpacing?: number;
  rankSpacing?: number;
}

/**
 * Apply automatic layout to nodes and edges using dagre
 */
export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } {
  const {
    direction = "TB",
    nodeSpacing = 50,
    rankSpacing = 100,
  } = options;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Configure layout
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: nodeSpacing,
    ranksep: rankSpacing,
    marginx: 20,
    marginy: 20,
  });

  // Add nodes to graph
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { 
      width: nodeWidth, 
      height: nodeHeight,
    });
  });

  // Add edges to graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Apply calculated positions to nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    // Calculate source and target positions based on direction
    let targetPosition: Position = Position.Top;
    let sourcePosition: Position = Position.Bottom;

    switch (direction) {
      case "LR":
        sourcePosition = Position.Right;
        targetPosition = Position.Left;
        break;
      case "RL":
        sourcePosition = Position.Left;
        targetPosition = Position.Right;
        break;
      case "BT":
        sourcePosition = Position.Top;
        targetPosition = Position.Bottom;
        break;
      default: // TB
        sourcePosition = Position.Bottom;
        targetPosition = Position.Top;
    }

    return {
      ...node,
      targetPosition,
      sourcePosition,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  // Update edges with animation
  const layoutedEdges = edges.map((edge) => ({
    ...edge,
    animated: true,
  }));

  return {
    nodes: layoutedNodes,
    edges: layoutedEdges,
  };
}

/**
 * Center the viewport on the nodes
 */
export function getCenterPosition(nodes: Node[]): { x: number; y: number; zoom: number } {
  if (nodes.length === 0) {
    return { x: 0, y: 0, zoom: 1 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  nodes.forEach((node) => {
    const x = node.position.x;
    const y = node.position.y;
    
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + nodeWidth > maxX) maxX = x + nodeWidth;
    if (y + nodeHeight > maxY) maxY = y + nodeHeight;
  });

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  
  // Calculate zoom to fit all nodes
  const width = maxX - minX;
  const height = maxY - minY;
  const maxDimension = Math.max(width, height);
  
  let zoom = 1;
  if (maxDimension > 800) {
    zoom = 800 / maxDimension;
  }

  return { x: centerX, y: centerY, zoom };
}

/**
 * Arrange nodes in a grid pattern
 */
export function getGridLayout(
  nodes: Node[],
  columns: number = 3,
  spacing: number = 50
): Node[] {
  return nodes.map((node, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    
    return {
      ...node,
      position: {
        x: col * (nodeWidth + spacing),
        y: row * (nodeHeight + spacing),
      },
    };
  });
}

/**
 * Arrange nodes in a circular pattern
 */
export function getCircularLayout(
  nodes: Node[],
  radius: number = 300
): Node[] {
  const angleStep = (2 * Math.PI) / nodes.length;
  
  return nodes.map((node, index) => {
    const angle = index * angleStep - Math.PI / 2; // Start from top
    
    return {
      ...node,
      position: {
        x: radius * Math.cos(angle) + radius,
        y: radius * Math.sin(angle) + radius,
      },
    };
  });
}

/**
 * Optimize edge routing to minimize crossings
 */
export function optimizeEdgeRouting(
  nodes: Node[],
  edges: Edge[]
): Edge[] {
  // Create a map of node positions
  const nodePositions = new Map<string, { x: number; y: number }>();
  nodes.forEach((node) => {
    nodePositions.set(node.id, {
      x: node.position.x + nodeWidth / 2,
      y: node.position.y + nodeHeight / 2,
    });
  });

  return edges.map((edge) => {
    const sourcePos = nodePositions.get(edge.source);
    const targetPos = nodePositions.get(edge.target);
    
    if (!sourcePos || !targetPos) return edge;
    
    // Calculate if edge should be straight or curved
    const dx = Math.abs(targetPos.x - sourcePos.x);
    const dy = Math.abs(targetPos.y - sourcePos.y);
    
    if (dx < 50 && dy > 200) {
      // Vertical edge - use straight
      return {
        ...edge,
        type: "straight",
      };
    } else if (dy < 50 && dx > 200) {
      // Horizontal edge - use straight
      return {
        ...edge,
        type: "straight",
      };
    } else {
      // Use smooth step for better routing
      return {
        ...edge,
        type: "smoothstep",
      };
    }
  });
}

/**
 * Detect and highlight cycles in the workflow
 */
export function detectCycles(edges: Edge[]): Set<string> {
  const graph = new Map<string, Set<string>>();
  const cycleEdges = new Set<string>();
  
  // Build adjacency list
  edges.forEach((edge) => {
    if (!graph.has(edge.source)) {
      graph.set(edge.source, new Set());
    }
    graph.get(edge.source)!.add(edge.target);
  });
  
  // DFS to detect cycles
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  
  function dfs(node: string, path: string[] = []): boolean {
    visited.add(node);
    recursionStack.add(node);
    
    const neighbors = graph.get(node) || new Set();
    
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor, [...path, node])) {
          // Mark edge as part of cycle
          const edge = edges.find(e => e.source === node && e.target === neighbor);
          if (edge) cycleEdges.add(edge.id);
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle
        const edge = edges.find(e => e.source === node && e.target === neighbor);
        if (edge) cycleEdges.add(edge.id);
        return true;
      }
    }
    
    recursionStack.delete(node);
    return false;
  }
  
  // Check all nodes
  graph.forEach((_, node) => {
    if (!visited.has(node)) {
      dfs(node);
    }
  });
  
  return cycleEdges;
}

/**
 * Group nodes by type and arrange them in lanes
 */
export function getLaneLayout(
  nodes: Node[],
  edges: Edge[]
): { nodes: Node[]; edges: Edge[] } {
  // Group nodes by type
  const groups: Record<string, Node[]> = {
    trigger: [],
    condition: [],
    action: [],
    other: [],
  };
  
  nodes.forEach((node) => {
    const type = node.type || "other";
    if (type in groups) {
      groups[type].push(node);
    } else {
      groups.other.push(node);
    }
  });
  
  // Arrange in horizontal lanes
  let yOffset = 0;
  const laneSpacing = 150;
  const nodeSpacing = nodeWidth + 50;
  
  const layoutedNodes: Node[] = [];
  
  ["trigger", "condition", "action", "other"].forEach((type) => {
    const laneNodes = groups[type];
    if (laneNodes.length === 0) return;
    
    laneNodes.forEach((node, index) => {
      layoutedNodes.push({
        ...node,
        position: {
          x: index * nodeSpacing,
          y: yOffset,
        },
      });
    });
    
    yOffset += laneSpacing;
  });
  
  return {
    nodes: layoutedNodes,
    edges,
  };
}
