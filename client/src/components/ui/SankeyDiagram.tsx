import React, { useState, useMemo } from 'react';
import { formatCurrency, DynamicIcon } from '../../utils/formatters';
import { InstitutionLogo } from './InstitutionLogo';

export interface SankeyNode {
  id: string;
  name: string;
  amount: number;
  color?: string;
  institution?: string | null;
  icon?: string;
  type?: 'income' | 'account' | 'expense' | 'savings';
}

export interface SankeyFlow {
  sourceId: string;
  targetId: string;
  amount: number;
}

export interface SankeyDiagramProps {
  incomeNodes: SankeyNode[];
  accountNodes: SankeyNode[];
  expenseNodes: SankeyNode[];
  savingsNodes?: SankeyNode[];
  flows?: SankeyFlow[];
  currency?: string;
  hide?: boolean;
  className?: string;
}

interface LayoutNode extends SankeyNode {
  x: number;
  y: number;
  width: number;
  height: number;
  percentage: number;
  column: number;
}

interface LayoutRibbon {
  id: string;
  sourceId: string;
  targetId: string;
  sourceName: string;
  targetName: string;
  sourceColor: string;
  targetColor: string;
  amount: number;
  path: string;
}

export const SankeyDiagram: React.FC<SankeyDiagramProps> = ({
  incomeNodes,
  accountNodes,
  expenseNodes,
  savingsNodes = [],
  flows,
  currency = 'MVR',
  hide = false,
  className = '',
}) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredRibbonId, setHoveredRibbonId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    title: string;
    subtitle: string;
    amount: number;
    pct: number;
  } | null>(null);

  // Compute Layout Geometry
  const { layoutNodes, layoutRibbons, totalFlow } = useMemo(() => {
    // 1. Prepare Columns
    const col0: SankeyNode[] = incomeNodes.filter((n) => n.amount > 0);
    const col1: SankeyNode[] = accountNodes.filter((n) => n.amount > 0);
    const col2: SankeyNode[] = [
      ...expenseNodes.filter((n) => n.amount > 0),
      ...savingsNodes.filter((n) => n.amount > 0),
    ];

    // If any column is empty, provide synthesized single baseline node
    const safeCol0 =
      col0.length > 0
        ? col0
        : [{ id: 'inc-default', name: 'Primary Income', amount: 10000, color: '#10B981', type: 'income' as const }];
    const safeCol1 =
      col1.length > 0
        ? col1
        : [{ id: 'acc-default', name: 'Main Account', amount: 10000, color: '#6366F1', type: 'account' as const }];
    const safeCol2 =
      col2.length > 0
        ? col2
        : [{ id: 'exp-default', name: 'Expenses & Savings', amount: 10000, color: '#F43F5E', type: 'expense' as const }];

    const totalIncome = safeCol0.reduce((s, n) => s + n.amount, 0);
    const totalAccounts = safeCol1.reduce((s, n) => s + n.amount, 0);
    const totalOutflows = safeCol2.reduce((s, n) => s + n.amount, 0);
    const flowBase = Math.max(totalIncome, totalAccounts, totalOutflows, 1);

    // Canvas dimensions
    const svgWidth = 980;
    const svgHeight = 440;
    const paddingTop = 36;
    const paddingBottom = 20;
    const availableHeight = svgHeight - paddingTop - paddingBottom;
    const nodeWidth = 145;

    const colX = [30, 415, 805];

    // Build layout nodes column by column
    const columns = [safeCol0, safeCol1, safeCol2];
    const nodes: LayoutNode[] = [];

    columns.forEach((colItems, colIdx) => {
      const colTotal = colItems.reduce((s, item) => s + item.amount, 0) || 1;
      const count = colItems.length;
      const spacing = count > 1 ? Math.min(18, (availableHeight * 0.25) / (count - 1)) : 0;
      const totalSpacing = spacing * (count - 1);
      const heightForNodes = availableHeight - totalSpacing;

      let currentY = paddingTop;
      colItems.forEach((item) => {
        const itemRatio = item.amount / colTotal;
        const calculatedHeight = Math.max(34, Math.round(itemRatio * heightForNodes));
        const percentage = Number(((item.amount / flowBase) * 100).toFixed(1));

        nodes.push({
          ...item,
          x: colX[colIdx],
          y: currentY,
          width: nodeWidth,
          height: calculatedHeight,
          percentage,
          column: colIdx,
          color:
            item.color ||
            (colIdx === 0 ? '#10B981' : colIdx === 1 ? '#6366F1' : item.type === 'savings' ? '#38BDF8' : '#EC4899'),
        });

        currentY += calculatedHeight + spacing;
      });
    });

    // Generate Ribbons connecting Col 0 -> Col 1, and Col 1 -> Col 2
    const ribbons: LayoutRibbon[] = [];

    // Helper to generate bezier ribbon path
    const makeRibbonPath = (
      x0: number,
      y0: number,
      h0: number,
      x1: number,
      y1: number,
      h1: number
    ) => {
      const curvature = 0.5;
      const cx0 = x0 + (x1 - x0) * curvature;
      const cx1 = x1 - (x1 - x0) * curvature;
      return `M ${x0} ${y0} C ${cx0} ${y0}, ${cx1} ${y1}, ${x1} ${y1} L ${x1} ${y1 + h1} C ${cx1} ${y1 + h1}, ${cx0} ${y0 + h0}, ${x0} ${y0 + h0} Z`;
    };

    const col0Nodes = nodes.filter((n) => n.column === 0);
    const col1Nodes = nodes.filter((n) => n.column === 1);
    const col2Nodes = nodes.filter((n) => n.column === 2);

    // Flow 0: Income -> Accounts
    // Distribute proportionally across accounts based on relative weights
    const totalCol1Amount = col1Nodes.reduce((s, n) => s + n.amount, 0) || 1;
    const col0SourceOffsets = new Map<string, number>();
    const col1TargetOffsets0 = new Map<string, number>();
    col0Nodes.forEach((n) => col0SourceOffsets.set(n.id, 0));
    col1Nodes.forEach((n) => col1TargetOffsets0.set(n.id, 0));

    col0Nodes.forEach((src) => {
      col1Nodes.forEach((tgt) => {
        const flowRatio = (tgt.amount / totalCol1Amount);
        const flowAmt = src.amount * flowRatio;
        if (flowAmt <= 0) return;

        const srcH = Math.max(1.5, (flowAmt / (src.amount || 1)) * src.height);
        const tgtH = Math.max(1.5, (flowAmt / (tgt.amount || 1)) * (tgt.height * 0.5));

        const srcYOffset = col0SourceOffsets.get(src.id) || 0;
        const tgtYOffset = col1TargetOffsets0.get(tgt.id) || 0;

        const x0 = src.x + src.width;
        const y0 = src.y + srcYOffset;
        const x1 = tgt.x;
        const y1 = tgt.y + tgtYOffset;

        col0SourceOffsets.set(src.id, srcYOffset + srcH);
        col1TargetOffsets0.set(tgt.id, tgtYOffset + tgtH);

        ribbons.push({
          id: `flow-${src.id}-${tgt.id}`,
          sourceId: src.id,
          targetId: tgt.id,
          sourceName: src.name,
          targetName: tgt.name,
          sourceColor: src.color || '#10B981',
          targetColor: tgt.color || '#6366F1',
          amount: flowAmt,
          path: makeRibbonPath(x0, y0, srcH, x1, y1, tgtH),
        });
      });
    });

    // Flow 1: Accounts -> Destinations (Expenses & Savings)
    const totalCol2Amount = col2Nodes.reduce((s, n) => s + n.amount, 0) || 1;
    const col1SourceOffsets = new Map<string, number>();
    const col2TargetOffsets = new Map<string, number>();
    col1Nodes.forEach((n) => col1SourceOffsets.set(n.id, 0));
    col2Nodes.forEach((n) => col2TargetOffsets.set(n.id, 0));

    col1Nodes.forEach((src) => {
      col2Nodes.forEach((tgt) => {
        const flowRatio = tgt.amount / totalCol2Amount;
        const flowAmt = src.amount * flowRatio;
        if (flowAmt <= 0) return;

        const srcH = Math.max(1.5, (flowAmt / (src.amount || 1)) * src.height);
        const tgtH = Math.max(1.5, (flowAmt / (tgt.amount || 1)) * tgt.height);

        const srcYOffset = col1SourceOffsets.get(src.id) || 0;
        const tgtYOffset = col2TargetOffsets.get(tgt.id) || 0;

        const x0 = src.x + src.width;
        const y0 = src.y + srcYOffset;
        const x1 = tgt.x;
        const y1 = tgt.y + tgtYOffset;

        col1SourceOffsets.set(src.id, srcYOffset + srcH);
        col2TargetOffsets.set(tgt.id, tgtYOffset + tgtH);

        ribbons.push({
          id: `flow-${src.id}-${tgt.id}`,
          sourceId: src.id,
          targetId: tgt.id,
          sourceName: src.name,
          targetName: tgt.name,
          sourceColor: src.color || '#6366F1',
          targetColor: tgt.color || '#F43F5E',
          amount: flowAmt,
          path: makeRibbonPath(x0, y0, srcH, x1, y1, tgtH),
        });
      });
    });

    return { layoutNodes: nodes, layoutRibbons: ribbons, totalFlow: flowBase };
  }, [incomeNodes, accountNodes, expenseNodes, savingsNodes]);

  return (
    <div className={`relative w-full rounded-2xl bg-[#0D0E15]/90 border border-white/[0.08] p-4 sm:p-6 overflow-hidden ${className}`}>
      {/* Header & Flow Column Labels */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-white font-display tracking-tight">
              Sankey Cashflow Stream (Money Flow)
            </h3>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              Live Allocation
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Trace where every Rufiyaa originates, through your accounts, to spending & savings goals.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Income Sources
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400" /> Accounts & Wallets
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400" /> Outflows & Goals
          </span>
        </div>
      </div>

      {/* Sankey Column Stage Titles */}
      <div className="grid grid-cols-3 text-center text-xs font-semibold tracking-wider uppercase text-zinc-500 mb-2 px-2">
        <div className="text-left text-emerald-400/90 flex items-center gap-1.5 pl-2">
          <span>1. Income Sources</span>
        </div>
        <div className="text-center text-indigo-400/90 flex items-center justify-center gap-1.5">
          <span>2. Deposit Accounts</span>
        </div>
        <div className="text-right text-rose-400/90 flex items-center justify-end gap-1.5 pr-2">
          <span>3. Categories & Goals</span>
        </div>
      </div>

      {/* Interactive Responsive SVG Surface */}
      <div className="relative w-full overflow-x-auto no-scrollbar">
        <svg
          viewBox="0 0 980 440"
          className="w-full h-auto min-w-[720px] select-none"
          onMouseLeave={() => {
            setHoveredNodeId(null);
            setHoveredRibbonId(null);
            setTooltip(null);
          }}
        >
          <defs>
            {layoutRibbons.map((r, i) => (
              <linearGradient
                key={r.id}
                id={`sankey-grad-${i}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor={r.sourceColor} stopOpacity={0.8} />
                <stop offset="100%" stopColor={r.targetColor} stopOpacity={0.8} />
              </linearGradient>
            ))}
            <filter id="nodeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Ribbons / Flows */}
          <g className="ribbons">
            {layoutRibbons.map((ribbon, i) => {
              const isDirectlyHovered = hoveredRibbonId === ribbon.id;
              const isConnectedToHoveredNode =
                hoveredNodeId === ribbon.sourceId || hoveredNodeId === ribbon.targetId;
              const isDimmed =
                (hoveredNodeId && !isConnectedToHoveredNode) ||
                (hoveredRibbonId && !isDirectlyHovered);

              const opacity = isDirectlyHovered
                ? 0.75
                : isConnectedToHoveredNode
                ? 0.6
                : isDimmed
                ? 0.08
                : 0.28;

              return (
                <path
                  key={ribbon.id}
                  d={ribbon.path}
                  fill={`url(#sankey-grad-${i})`}
                  fillOpacity={opacity}
                  stroke={isDirectlyHovered ? '#FFFFFF' : 'none'}
                  strokeWidth={isDirectlyHovered ? 1 : 0}
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={(e) => {
                    setHoveredRibbonId(ribbon.id);
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({
                      x: e.clientX,
                      y: e.clientY,
                      title: `${ribbon.sourceName} ⟶ ${ribbon.targetName}`,
                      subtitle: 'Direct Cashflow Link',
                      amount: ribbon.amount,
                      pct: Number(((ribbon.amount / totalFlow) * 100).toFixed(1)),
                    });
                  }}
                  onMouseMove={(e) => {
                    if (hoveredRibbonId === ribbon.id) {
                      setTooltip((prev) =>
                        prev ? { ...prev, x: e.clientX, y: e.clientY } : null
                      );
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredRibbonId(null);
                    setTooltip(null);
                  }}
                />
              );
            })}
          </g>

          {/* Nodes */}
          <g className="nodes">
            {layoutNodes.map((node) => {
              const isHovered = hoveredNodeId === node.id;
              const isDimmed = hoveredNodeId && hoveredNodeId !== node.id;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-pointer transition-transform duration-150"
                  onMouseEnter={(e) => {
                    setHoveredNodeId(node.id);
                    setTooltip({
                      x: e.clientX,
                      y: e.clientY,
                      title: node.name,
                      subtitle:
                        node.column === 0
                          ? 'Income Source'
                          : node.column === 1
                          ? 'Account / Balance Store'
                          : node.type === 'savings'
                          ? 'Savings Allocation'
                          : 'Spending Category',
                      amount: node.amount,
                      pct: node.percentage,
                    });
                  }}
                  onMouseMove={(e) => {
                    if (hoveredNodeId === node.id) {
                      setTooltip((prev) =>
                        prev ? { ...prev, x: e.clientX, y: e.clientY } : null
                      );
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredNodeId(null);
                    setTooltip(null);
                  }}
                >
                  {/* Node Background Rectangle */}
                  <rect
                    width={node.width}
                    height={node.height}
                    rx={8}
                    ry={8}
                    fill="#151722"
                    stroke={isHovered ? node.color : 'rgba(255,255,255,0.1)'}
                    strokeWidth={isHovered ? 2 : 1}
                    filter="url(#nodeGlow)"
                    opacity={isDimmed ? 0.35 : 1}
                    className="transition-all duration-200"
                  />

                  {/* Colored Left Accent Bar */}
                  <rect
                    x={0}
                    y={0}
                    width={4.5}
                    height={node.height}
                    rx={2}
                    fill={node.color}
                    opacity={isDimmed ? 0.35 : 1}
                  />

                  {/* Node Label Text Content */}
                  <foreignObject
                    x={8}
                    y={0}
                    width={node.width - 12}
                    height={node.height}
                    className="overflow-hidden pointer-events-none"
                  >
                    <div className="h-full flex items-center justify-between gap-1.5 px-1 py-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {node.institution ? (
                          <InstitutionLogo
                            institution={node.institution}
                            accountName={node.name}
                            size="xs"
                            className="shrink-0"
                          />
                        ) : node.icon ? (
                          <div
                            className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${node.color}25`, color: node.color }}
                          >
                            <DynamicIcon name={node.icon} className="w-2.5 h-2.5" />
                          </div>
                        ) : (
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: node.color }}
                          />
                        )}
                        <span className="text-[11px] font-semibold text-white truncate leading-tight">
                          {node.name}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold text-zinc-300 tabular-nums block leading-tight">
                          {formatCurrency(node.amount, currency, hide)}
                        </span>
                        <span className="text-[9px] text-zinc-500 tabular-nums block leading-tight">
                          {node.percentage}%
                        </span>
                      </div>
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Floating Tooltip */}
        {tooltip && (
          <div
            className="fixed z-50 pointer-events-none bg-[#111218]/95 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-2xl text-xs -translate-x-1/2 -translate-y-full mb-2 min-w-[180px] max-w-[280px]"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-1.5 mb-1.5">
              <span className="font-semibold text-white truncate">{tooltip.title}</span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                {tooltip.pct}%
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">{tooltip.subtitle}</p>
            <p className="text-sm font-bold text-white font-display mt-1 tabular-nums">
              {formatCurrency(tooltip.amount, currency, hide)}
            </p>
          </div>
        )}
      </div>

      {/* Footer Insight Note */}
      <div className="mt-4 pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
        <span>
          Total System Flow: <strong className="text-white tabular-nums">{formatCurrency(totalFlow, currency, hide)}</strong>
        </span>
        <span className="text-zinc-500 text-[11px]">
          Hover ribbons or nodes to isolate specific financial pathways
        </span>
      </div>
    </div>
  );
};
export default SankeyDiagram;
