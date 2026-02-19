declare module "dagre" {
  interface GraphOptions {
    rankdir?: string;
  }

  interface NodeOptions {
    width: number;
    height: number;
  }

  interface NodePosition {
    x: number;
    y: number;
  }

  interface Graph {
    setGraph(options: GraphOptions): void;
    setDefaultEdgeLabel(labelFn: () => Record<string, unknown>): void;
    setNode(id: string, options: NodeOptions): void;
    setEdge(source: string, target: string): void;
    node(id: string): NodePosition;
  }

  function graphlib(): { Graph: new () => Graph };

  const dagre: {
    graphlib: { Graph: new () => Graph };
    layout: (g: Graph) => void;
  };

  export default dagre;
  export { graphlib, Graph };
}
