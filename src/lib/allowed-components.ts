import type { FigmaNode } from "@/lib/figma-api";

type FigmaFileLike = {
  document: FigmaNode;
  components?: Record<string, { key: string; name: string }>;
  componentSets?: Record<string, { key: string; name: string }>;
};

function findPageByName(root: FigmaNode, pageName: string): FigmaNode | null {
  if (!root.children) return null;

  for (const child of root.children) {
    if (child.type === "CANVAS" && child.name === pageName) {
      return child;
    }
  }

  return null;
}

function walk(node: FigmaNode, visit: (node: FigmaNode) => void): void {
  visit(node);
  if (!node.children) return;
  for (const child of node.children) {
    walk(child, visit);
  }
}

export function extractAllowedComponentKeys(
  file: FigmaFileLike,
  pageName: string
): { pageFound: boolean; keys: string[] } {
  const page = findPageByName(file.document, pageName);

  if (!page) {
    return {
      pageFound: false,
      keys: []
    };
  }

  const keys = new Set<string>();

  walk(page, (node) => {
    if ((node.type === "COMPONENT" || node.type === "COMPONENT_SET") && node.key) {
      keys.add(node.key);
      return;
    }

    if (node.type === "INSTANCE" && node.componentId && file.components?.[node.componentId]?.key) {
      keys.add(file.components[node.componentId].key);
    }
  });

  return {
    pageFound: true,
    keys: [...keys]
  };
}