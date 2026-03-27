import type { FigmaNode } from "@/lib/figma-api";

type FigmaFileLike = {
  document: FigmaNode;
  components?: Record<string, { key: string; name: string }>;
  componentSets?: Record<string, { key: string; name: string }>;
};

function findPageByName(root: FigmaNode, pageName: string): FigmaNode | null {
  if (!root.children) {
    return null;
  }

  for (const child of root.children) {
    if (child.type === "CANVAS" && child.name === pageName) {
      return child;
    }
  }

  return null;
}

function walk(node: FigmaNode, visit: (node: FigmaNode) => void): void {
  visit(node);

  if (!node.children) {
    return;
  }

  for (const child of node.children) {
    walk(child, visit);
  }
}

function normalizeSignaturePart(value: string): string {
  return value.trim();
}

function buildVariantSignatureFromNode(node: FigmaNode): string {
  const maybeNode = node as FigmaNode & {
    componentProperties?: Record<
      string,
      {
        type?: string;
        value?: string | boolean;
      }
    > | null;
  };

  const componentProperties = maybeNode.componentProperties;

  if (!componentProperties || typeof componentProperties !== "object") {
    return "";
  }

  const keys = Object.keys(componentProperties).sort();

  if (keys.length === 0) {
    return "";
  }

  const parts: string[] = [];

  for (const key of keys) {
    const property = componentProperties[key];

    if (!property || typeof property !== "object") {
      continue;
    }

    const value =
      "value" in property &&
      (typeof property.value === "string" ||
        typeof property.value === "boolean")
        ? String(property.value)
        : "";

    parts.push(key + "=" + value);
  }

  if (parts.length === 0) {
    return "";
  }

  return "::" + parts.join("|");
}

function buildLegacySignatureForComponentLike(
  componentName: string,
  componentSetName: string | null,
  variantSuffix: string
): string {
  if (componentSetName) {
    return (
      normalizeSignaturePart(componentSetName) +
      "::" +
      normalizeSignaturePart(componentName) +
      variantSuffix
    );
  }

  return normalizeSignaturePart(componentName);
}

function findComponentSetNameForComponentNode(
  root: FigmaNode,
  componentNodeId: string
): string | null {
  let foundComponentSetName: string | null = null;

  walk(root, (node) => {
    if (foundComponentSetName) {
      return;
    }

    if (!node.children || node.children.length === 0) {
      return;
    }

    const hasTargetChild = node.children.some((child) => child.id === componentNodeId);

    if (!hasTargetChild) {
      return;
    }

    if (node.type === "COMPONENT_SET") {
      foundComponentSetName = node.name;
    }
  });

  return foundComponentSetName;
}

function buildLegacySignatureFromComponentNode(
  root: FigmaNode,
  node: FigmaNode
): string | null {
  if (node.type !== "COMPONENT") {
    return null;
  }

  const componentSetName = findComponentSetNameForComponentNode(root, node.id);
  const variantSuffix = buildVariantSignatureFromNode(node);

  return buildLegacySignatureForComponentLike(
    node.name,
    componentSetName,
    variantSuffix
  );
}

function buildLegacySignatureFromInstanceNode(
  file: FigmaFileLike,
  node: FigmaNode
): string | null {
  if (node.type !== "INSTANCE") {
    return null;
  }

  if (!node.componentId) {
    return null;
  }

  const componentMeta = file.components ? file.components[node.componentId] : null;

  if (!componentMeta) {
    return null;
  }

  let componentSetName: string | null = null;

  if (file.document) {
    componentSetName = findComponentSetNameForComponentNode(
      file.document,
      node.componentId
    );
  }

  const variantSuffix = buildVariantSignatureFromNode(node);

  return buildLegacySignatureForComponentLike(
    componentMeta.name,
    componentSetName,
    variantSuffix
  );
}

export function extractAllowedComponents(
  file: FigmaFileLike,
  pageName: string
): { pageFound: boolean; keys: string[]; signatures: string[] } {
  const page = findPageByName(file.document, pageName);

  if (!page) {
    return {
      pageFound: false,
      keys: [],
      signatures: []
    };
  }

  const keys = new Set<string>();
  const signatures = new Set<string>();

  walk(page, (node) => {
    if ((node.type === "COMPONENT" || node.type === "COMPONENT_SET") && node.key) {
      keys.add(node.key);
    }

    if (
      node.type === "INSTANCE" &&
      node.componentId &&
      file.components &&
      file.components[node.componentId] &&
      file.components[node.componentId].key
    ) {
      keys.add(file.components[node.componentId].key);
    }

    if (node.type === "COMPONENT") {
      const signature = buildLegacySignatureFromComponentNode(file.document, node);

      if (signature) {
        signatures.add(signature);
      }

      return;
    }

    if (node.type === "INSTANCE") {
      const signature = buildLegacySignatureFromInstanceNode(file, node);

      if (signature) {
        signatures.add(signature);
      }
    }
  });

  return {
    pageFound: true,
    keys: [...keys],
    signatures: [...signatures]
  };
}