import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  useReactFlow,
  Panel,
  Position,
  Handle,
} from '@xyflow/react';
import dagre from 'dagre';
import '@xyflow/react/dist/style.css';

// =====================================================
// KONFIGURATION
// =====================================================

const LANE_HEIGHT = 120;
const LANE_PADDING = 20;
const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;

const LANES = [
  { id: 'vorbereitung', label: 'Vorbereitung', color: '#e3f2fd' },
  { id: 'kochen', label: 'Kochen', color: '#fff3e0' },
  { id: 'backen', label: 'Backen', color: '#fce4ec' },
  { id: 'warten', label: 'Warten', color: '#f3e5f5' },
  { id: 'wuerzen', label: 'Würzen', color: '#e8f5e9' },
  { id: 'servieren', label: 'Servieren', color: '#ffebee', isFinal: true },
];

// =====================================================
// CUSTOM NODE COMPONENTS
// =====================================================

function RecipeStepNode({ id, data, selected }) {
  const lane = LANES.find(l => l.id === data.laneId);
  
  return (
    <div
      style={{
        padding: '10px',
        borderRadius: '8px',
        background: lane?.color || '#fff',
        border: selected ? '2px solid #2196f3' : '2px solid #ccc',
        minWidth: NODE_WIDTH,
        minHeight: NODE_HEIGHT,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <Handle type="target" position={Position.Left} id="left" />
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
        {data.title || 'Neuer Schritt'}
      </div>
      <div style={{ fontSize: '12px', color: '#666' }}>
        {LANES.find(l => l.id === data.laneId)?.label}
      </div>
      {data.duration && (
        <div style={{ fontSize: '11px', marginTop: '5px' }}>
          ⏱️ {data.duration} min
        </div>
      )}
      <Handle type="source" position={Position.Right} id="right" />
    </div>
  );
}

function ServierenNode({ selected }) {
  return (
    <div
      style={{
        padding: '15px',
        borderRadius: '50%',
        background: '#4caf50',
        color: 'white',
        width: 100,
        height: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        border: selected ? '3px solid #2196f3' : '3px solid #2e7d32',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
      }}
    >
      <Handle type="target" position={Position.Left} id="left" />
      Servieren
    </div>
  );
}

const nodeTypes = {
  recipeStep: RecipeStepNode,
  servieren: ServierenNode,
};

// =====================================================
// AUTO-LAYOUT MIT DAGRE
// =====================================================

const getLayoutedElements = (nodes, edges, direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, ranksep: 100, nodesep: 50 });

  // Nodes zu Dagre hinzufügen
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  });

  // Edges zu Dagre hinzufügen
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Layout berechnen
  dagre.layout(dagreGraph);

  // Positionen zurück zu React Flow Nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    // Y-Position basierend auf Lane
    const laneIndex = LANES.findIndex(l => l.id === node.data.laneId);
    const laneY = laneIndex * LANE_HEIGHT + LANE_PADDING;
    
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: laneY, // Feste Y-Position pro Lane!
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

// =====================================================
// VALIDIERUNG
// =====================================================

const validateAllPathsToServieren = (nodes, edges) => {
  const servierenNode = nodes.find(n => n.type === 'servieren');
  if (!servierenNode) return { valid: false, error: 'Kein Servieren-Node gefunden' };

  const startNodes = nodes.filter(n => 
    !edges.some(e => e.target === n.id) && n.type !== 'servieren'
  );

  const unreachableLanes = [];
  
  for (const startNode of startNodes) {
    const visited = new Set();
    const queue = [startNode.id];
    let foundServieren = false;
    
    while (queue.length > 0) {
      const current = queue.shift();
      if (current === servierenNode.id) {
        foundServieren = true;
        break;
      }
      
      if (visited.has(current)) continue;
      visited.add(current);
      
      const outgoing = edges
        .filter(e => e.source === current)
        .map(e => e.target);
      
      queue.push(...outgoing);
    }
    
    if (!foundServieren) {
      unreachableLanes.push(startNode.data.laneId);
    }
  }

  return {
    valid: unreachableLanes.length === 0,
    error: unreachableLanes.length > 0 
      ? `Lanes ohne Pfad zu Servieren: ${[...new Set(unreachableLanes)].join(', ')}` 
      : null
  };
};

// =====================================================
// HAUPTKOMPONENTE
// =====================================================

const initialNodes = [
  {
    id: 'step-1',
    type: 'recipeStep',
    position: { x: 0, y: 0 },
    data: { laneId: 'vorbereitung', title: 'Zutaten vorbereiten', duration: 10 },
  },
  {
    id: 'step-2',
    type: 'recipeStep',
    position: { x: 0, y: 0 },
    data: { laneId: 'kochen', title: 'Kochen', duration: 20 },
  },
  {
    id: 'step-3',
    type: 'recipeStep',
    position: { x: 0, y: 0 },
    data: { laneId: 'wuerzen', title: 'Abschmecken', duration: 5 },
  },
  {
    id: 'servieren',
    type: 'servieren',
    position: { x: 0, y: 0 },
    data: { laneId: 'servieren' },
  },
];

const initialEdges = [
  { id: 'e1-2', source: 'step-1', target: 'step-2', animated: true },
  { id: 'e2-3', source: 'step-2', target: 'step-3', animated: true },
  { id: 'e3-s', source: 'step-3', target: 'servieren', animated: true },
];

export default function RecipeFlowEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { fitView } = useReactFlow();

  // Auto-Layout bei Initialisierung
  useMemo(() => {
    const { nodes: layoutedNodes } = getLayoutedElements(initialNodes, initialEdges);
    setNodes(layoutedNodes);
  }, []);

  // Verbindung erstellen
  const onConnect = useCallback(
    (connection) => {
      const edge = { ...connection, animated: true };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges]
  );

  // Validierung
  const validation = useMemo(() => 
    validateAllPathsToServieren(nodes, edges), 
    [nodes, edges]
  );

  // Schritt hinzufügen
  const addStep = (laneId) => {
    const lane = LANES.find(l => l.id === laneId);
    const newId = `step-${Date.now()}`;
    
    // Finde letzten Schritt in dieser Lane
    const laneSteps = nodes.filter(n => n.data?.laneId === laneId && n.type === 'recipeStep');
    const lastStep = laneSteps[laneSteps.length - 1];
    
    const newNode = {
      id: newId,
      type: 'recipeStep',
      position: { 
        x: lastStep ? lastStep.position.x + 200 : 100,
        y: LANES.findIndex(l => l.id === laneId) * LANE_HEIGHT + LANE_PADDING 
      },
      data: { 
        laneId, 
        title: `Neuer ${lane.label}-Schritt`,
        duration: 0 
      },
    };

    setNodes((nds) => [...nds, newNode]);
  };

  // Auto-Layout ausführen
  const runAutoLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  }, [nodes, edges, setNodes, setEdges, fitView]);

  // Node Drag beenden - Lane-Wechsel erkennen
  const onNodeDragStop = useCallback((event, node) => {
    // Berechne neue Lane basierend auf Y-Position
    const laneIndex = Math.floor((node.position.y - LANE_PADDING + LANE_HEIGHT/2) / LANE_HEIGHT);
    const newLane = LANES[Math.max(0, Math.min(laneIndex, LANES.length - 1))];
    
    if (newLane && newLane.id !== node.data.laneId && node.type === 'recipeStep') {
      // Aktualisiere Lane
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === node.id) {
            return {
              ...n,
              data: { ...n.data, laneId: newLane.id },
              position: {
                ...n.position,
                y: LANES.findIndex(l => l.id === newLane.id) * LANE_HEIGHT + LANE_PADDING
              }
            };
          }
          return n;
        })
      );
    }
  }, [setNodes]);

  // Node löschen mit automatischer Reconnection
  const onNodesDelete = useCallback((deletedNodes) => {
    deletedNodes.forEach((deletedNode) => {
      // Finde eingehende und ausgehende Edges
      const incomingEdges = edges.filter(e => e.target === deletedNode.id);
      const outgoingEdges = edges.filter(e => e.source === deletedNode.id);
      
      // Lösche alle betroffenen Edges
      setEdges((eds) => eds.filter(
        e => e.source !== deletedNode.id && e.target !== deletedNode.id
      ));
      
      // Verbinde eingehende mit ausgehenden (Bridge)
      if (incomingEdges.length > 0 && outgoingEdges.length > 0) {
        const newEdges = [];
        incomingEdges.forEach((inEdge) => {
          outgoingEdges.forEach((outEdge) => {
            newEdges.push({
              id: `bridge-${inEdge.source}-${outEdge.target}`,
              source: inEdge.source,
              target: outEdge.target,
              animated: true,
            });
          });
        });
        
        setEdges((eds) => [...eds, ...newEdges]);
      }
    });
  }, [edges, setEdges]);

  // Validierung für Verbindungen
  const isValidConnection = useCallback((connection) => {
    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);
    
    // Servieren kann keine Quelle sein
    if (sourceNode?.type === 'servieren') return false;
    
    // Keine Selbstverbindungen
    if (connection.source === connection.target) return false;
    
    // Keine doppelten Edges
    const exists = edges.some(
      e => e.source === connection.source && e.target === connection.target
    );
    if (exists) return false;
    
    return true;
  }, [nodes, edges]);

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex' }}>
      {/* Lane Controls */}
      <div style={{ 
        width: '200px', 
        padding: '20px', 
        background: '#f5f5f5',
        borderRight: '1px solid #ddd'
      }}>
        <h3 style={{ marginTop: 0 }}>Arbeitsschritte</h3>
        {LANES.filter(l => !l.isFinal).map((lane) => (
          <button
            key={lane.id}
            onClick={() => addStep(lane.id)}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px',
              marginBottom: '10px',
              background: lane.color,
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            + {lane.label}
          </button>
        ))}
        
        <hr style={{ margin: '20px 0' }} />
        
        <button
          onClick={runAutoLayout}
          style={{
            width: '100%',
            padding: '10px',
            background: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          🔄 Auto-Layout
        </button>
        
        <div style={{ marginTop: '20px', fontSize: '12px' }}>
          <strong>Validierung:</strong>
          <div style={{ 
            color: validation.valid ? 'green' : 'red',
            marginTop: '5px'
          }}>
            {validation.valid ? '✓ Alle Pfade führen zu Servieren' : `✗ ${validation.error}`}
          </div>
        </div>
        
        <div style={{ marginTop: '20px', fontSize: '11px', color: '#666' }}>
          <strong>Tipp:</strong> Schritte können zwischen Lanes gezogen werden!
        </div>
      </div>

      {/* React Flow Canvas */}
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onNodesDelete={onNodesDelete}
          isValidConnection={isValidConnection}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode={['Backspace', 'Delete']}
        >
          <Background color="#E6E6E6" />
          <Controls />
          
          {/* Lane Hintergrund-Labels */}
          <Panel position="top-left" style={{ pointerEvents: 'none' }}>
            {LANES.map((lane, index) => (
              <div
                key={lane.id}
                style={{
                  position: 'absolute',
                  left: 10,
                  top: index * LANE_HEIGHT + LANE_PADDING,
                  background: lane.color,
                  padding: '5px 10px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  opacity: 0.7,
                  border: '1px solid #ccc',
                }}
              >
                {lane.label}
              </div>
            ))}
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
