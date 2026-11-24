import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  AlertCircle,
  CheckCircle2,
  PieChart as PieIcon,
  Coffee,
  ShoppingCart,
  Zap,
  ShoppingBag,
  Flame,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import api, { Budget, Category } from '../services/api';
import {
  Card,
  Button,
  Badge,
  ProgressBar,
  Modal,
  ConfirmDialog,
  EmptyState,
  Skeleton,
  SkeletonCard,
  SkeletonMetric,
  AnimatedNumber,
  AmbientHalo,
} from '../components/ui';
import { formatCurrency, DynamicIcon } from '../utils/formatters';

export interface BudgetWithMetrics extends Budget {
  name?: string;
  spent?: number;
  remaining?: number;
  percentage?: number;
  overAmount?: number;
  statusState?: string;
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function BudgetsPage() {
  const { user, addToast, refreshTrigger, triggerDataRefresh } = useAuth();

  const [budgets, setBudgets] = useState<BudgetWithMetrics[]>([]);
  const [summary, setSummary] = useState({
    totalBudgeted: 0,
    totalSpent: 0,
    totalRemaining: 0,
    overallPercentage: 0,
    overBudgetCount: 0,
    warningCount: 0,
  });
  const [history, setHistory] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetWithMetrics | null>(null);
  const [form, setForm] = useState({
    categoryId: '',
    amount: '',
    alertThreshold: '80',
  });
  const [deleteTarget, setDeleteTarget] = useState<BudgetWithMetrics | null>(null);

  const loadBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, cRes] = await Promise.all([
        api.get('/budgets'),
        api.get('/categories'),
      ]);
      if (bRes.data.success) {
        setBudgets(bRes.data.budgets || []);
        setSummary(bRes.data.summary || {});
        setHistory(bRes.data.history || []);
      }
      if (cRes.data.success) {
        setCategories((cRes.data.categories || []).filter((c: Category) => c.type === 'EXPENSE'));
      }
    } catch (err) {
      console.error('Error loading budgets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets, refreshTrigger]);

  const openAddModal = (preset?: { categoryName?: string; amount?: number; alertThreshold?: number }) => {
    setEditingBudget(null);
    let matchedCatId = categories[0]?.id || '';
    if (preset?.categoryName) {
      const match = categories.find((c) =>
        c.name.toLowerCase().includes(preset.categoryName!.toLowerCase())
      );
      if (match) matchedCatId = match.id;
    }
    setForm({
      categoryId: matchedCatId,
      amount: preset?.amount ? String(preset.amount) : '',
      alertThreshold: String(preset?.alertThreshold || 80),
    });
    setModalOpen(true);
  };

  const budgetTemplates = [
    {
      title: 'Dining & Cafes',
      subtitle: 'MVR 3,000 / mo',
      badge: '50/30/20 Rule',
      icon: Coffee,
      onClick: () => openAddModal({ categoryName: 'Food', amount: 3000, alertThreshold: 80 }),
    },
    {
      title: 'Groceries & Household',
      subtitle: 'MVR 4,500 / mo',
      badge: 'Essential',
      icon: ShoppingCart,
      onClick: () => openAddModal({ categoryName: 'Groceries', amount: 4500, alertThreshold: 85 }),
    },
    {
      title: 'Utilities & Internet',
      subtitle: 'MVR 2,000 / mo',
      badge: 'Fixed Cost',
      icon: Zap,
      onClick: () => openAddModal({ categoryName: 'Utilities', amount: 2000, alertThreshold: 90 }),
    },
    {
      title: 'Shopping & Leisure',
      subtitle: 'MVR 2,500 / mo',
      badge: 'Discretionary',
      icon: ShoppingBag,
      onClick: () => openAddModal({ categoryName: 'Shopping', amount: 2500, alertThreshold: 80 }),
    },
  ];

  const openEditModal = (budget: BudgetWithMetrics) => {
    setEditingBudget(budget);
    setForm({
      categoryId: budget.categoryId,
      amount: String(budget.amount),
      alertThreshold: String(budget.alertThreshold || 80),
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        categoryId: form.categoryId,
        amount: parseFloat(form.amount),
        alertThreshold: parseFloat(form.alertThreshold || '80'),
      };
      if (editingBudget) {
        await api.put(`/budgets/${editingBudget.id}`, payload);
        addToast('Monthly budget updated!', 'success');
      } else {
        await api.post('/budgets', payload);
        addToast('Monthly budget saved!', 'success');
      }
      setModalOpen(false);
      triggerDataRefresh();
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to save budget.', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/budgets/${deleteTarget.id}`);
      addToast('Budget deleted.', 'info');
      setDeleteTarget(null);
      triggerDataRefresh();
    } catch {
      addToast('Failed to delete budget.', 'error');
    }
  };

  const getStateBadge = (state?: string): { label: string; variant: 'danger' | 'warning' | 'success' | 'default'; color: string } => {
    switch (state) {
      case 'over_budget':
        return { label: 'Over Budget', variant: 'danger', color: '#F43F5E' };
      case 'near_limit':
        return { label: 'Near Limit', variant: 'warning', color: '#F97316' };
      case 'warning':
        return { label: 'Warning', variant: 'warning', color: '#F59E0B' };
      default:
        return { label: 'Normal', variant: 'success', color: '#10B981' };
    }
  };

  const currency = user?.currency || 'MVR';
  const hide = user?.hideBalances;

  if (loading && budgets.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-32 rounded-xl" />
          </div>
        </div>
        <SkeletonMetric count={3} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} className="h-44 flex flex-col justify-between" />
          ))}
        </div>
      </div>
    );
  }

  const today = new Date();
  const currentDay = Math.max(1, today.getDate());
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(0, daysInMonth - currentDay);

  const enhancedHistory = history.map((item, index) => {
    const isCurrentMonth = index === history.length - 1;
    if (!isCurrentMonth) {
      return {
        ...item,
        projectedPace: item.spent,
      };
    }
    const spentSoFar = Number(item.spent) || 0;
    const dailyVelocity = currentDay > 0 ? spentSoFar / currentDay : 0;
    const projectedTotal = Math.round(dailyVelocity * daysInMonth);
    return {
      ...item,
      projectedPace: projectedTotal,
      dailyVelocity: Math.round(dailyVelocity),
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            Monthly Budgets
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            Dynamic category limits automatically calculated from your monthly expenses.
          </p>
        </div>

        <Button size="sm" onClick={() => openAddModal()}>
          <Plus className="w-4 h-4" /> Set Monthly Budget
        </Button>
      </div>

      {/* Overall Budget Health Hero with Ambient Cashflow Halo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        <Card className="lg:col-span-5 p-4 sm:p-5 relative overflow-hidden">
          <AmbientHalo
            status={summary.overallPercentage < 85 ? 'positive' : summary.overallPercentage >= 100 ? 'negative' : 'neutral'}
            intensity="normal"
            position="top"
            className="h-full flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400">
                  Overall Budget Health
                </span>
                <Badge
                  variant={
                    summary.overallPercentage >= 100
                      ? 'danger'
                      : summary.overallPercentage >= 80
                      ? 'warning'
                      : 'success'
                  }
                >
                  <AnimatedNumber value={summary.overallPercentage} suffix="%" /> Used
                </Badge>
              </div>

              <div className="mt-4">
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display truncate tabular-nums">
                  <AnimatedNumber value={summary.totalSpent} currency={currency} hide={hide} />{' '}
                  <span className="text-sm sm:text-base font-normal text-zinc-400">
                    / <AnimatedNumber value={summary.totalBudgeted} currency={currency} hide={hide} />
                  </span>
                </p>
                <p className="text-xs text-zinc-400 mt-1 tabular-nums">
                  <AnimatedNumber value={summary.totalRemaining} currency={currency} hide={hide} /> remaining across{' '}
                  {budgets.length} budgeted categories
                </p>
              </div>

              <ProgressBar
                value={summary.overallPercentage}
                color={summary.overallPercentage >= 100 ? '#F43F5E' : '#6366F1'}
                height="h-2.5"
                className="mt-5"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-white/[0.06]">
              <div className="flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span className="text-zinc-300">
                  <strong className="text-white tabular-nums"><AnimatedNumber value={summary.overBudgetCount} /></strong> Over Budget
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-zinc-300">
                  <strong className="text-white tabular-nums"><AnimatedNumber value={Math.max(0, budgets.length - summary.overBudgetCount)} /></strong> Within Limit
                </span>
              </div>
            </div>
          </AmbientHalo>
        </Card>

        {/* Historical Budget Performance Chart with Burn Rate Trajectory Line */}
        <Card className="lg:col-span-7 min-w-0 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">
                  Historical Budget vs Actual Performance
                </h3>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Projected Trajectory
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Dotted trajectory forecasts month-end spend at current velocity ({daysRemaining} days remaining)
              </p>
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={enhancedHistory} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" stroke="#71717A" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717A" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(v: any, name: any) => {
                    const formatted = formatCurrency(Number(v) || 0, currency, hide);
                    if (name === 'Projected Burn Rate') {
                      return [formatted, 'Projected Trajectory'];
                    }
                    return [formatted, name];
                  }}
                  contentStyle={{
                    backgroundColor: '#111218',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="budgeted" name="Budgeted Limit" fill="#6366F1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spent" name="Actual Spent" fill="#EC4899" radius={[4, 4, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="projectedPace"
                  name="Projected Burn Rate"
                  stroke="#F59E0B"
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  dot={{ r: 4, fill: '#F59E0B', strokeWidth: 1.5, stroke: '#111218' }}
                  activeDot={{ r: 6, fill: '#F59E0B' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Category Budget Cards Grid */}
      {budgets.length === 0 ? (
        <EmptyState
          icon={PieIcon}
          title="No budgets configured for this month"
          description="Set monthly spending limits for categories like Food, Shopping, Transport, and Entertainment to control expenses."
          templatesTitle="Recommended monthly budget starters:"
          templates={budgetTemplates}
          action={
            <Button onClick={() => openAddModal()}>
              <Plus className="w-4 h-4" /> Create Custom Budget
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {budgets.map((b) => {
            const stateMeta = getStateBadge(b.statusState);
            const spent = Number(b.spent) || 0;
            const amount = Number(b.amount) || 1;
            const dailyPace = currentDay > 0 ? spent / currentDay : 0;
            const projectedTotal = Math.round(dailyPace * daysInMonth);
            const exhaustionDay = dailyPace > 0 ? Math.floor(amount / dailyPace) : daysInMonth + 1;
            const willExhaustEarly = spent < amount && projectedTotal > amount && exhaustionDay <= daysInMonth;

            return (
              <Card key={b.id} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{
                          backgroundColor: `${b.category?.color || '#6366F1'}20`,
                          color: b.category?.color || '#6366F1',
                        }}
                      >
                        <DynamicIcon name={b.category?.icon || 'tag'} className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">
                          {b.category?.name || b.name}
                        </h3>
                        <Badge variant={stateMeta.variant}>{stateMeta.label}</Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(b)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(b)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-xl font-bold tracking-tight text-white font-display tabular-nums">
                          <AnimatedNumber value={b.spent ?? 0} currency={currency} hide={hide} />
                        </span>
                        <span className="text-xs text-zinc-400 ml-1.5 tabular-nums">
                          of <AnimatedNumber value={b.amount} currency={currency} hide={hide} />
                        </span>
                      </div>
                      <span className="text-xs font-semibold tabular-nums" style={{ color: stateMeta.color }}>
                        <AnimatedNumber value={b.percentage ?? 0} suffix="%" />
                      </span>
                    </div>

                    <ProgressBar
                      value={b.percentage}
                      color={stateMeta.color}
                      height="h-2"
                      className="mt-2.5"
                    />

                    {/* Dotted projected burn rate velocity & exhaustion warning */}
                    {willExhaustEarly ? (
                      <div className="mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-xs text-amber-300">
                        <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                        <span className="font-medium">
                          At this pace, your {b.category?.name || b.name || 'budget'} will be exhausted on the {getOrdinal(exhaustionDay)}.
                        </span>
                      </div>
                    ) : spent > 0 && spent < amount ? (
                      <div className="mt-2.5 py-1 px-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-between text-[11px] text-zinc-400">
                        <span>Velocity: <strong className="text-zinc-200 tabular-nums">{formatCurrency(dailyPace, currency, hide)}/day</strong></span>
                        <span className="text-emerald-400/90 font-medium tabular-nums">Projected: {formatCurrency(projectedTotal, currency, hide)}</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-400 mt-4 pt-3 border-t border-white/[0.06]">
                  {(b.overAmount || 0) > 0 ? (
                    <span className="text-rose-400 font-semibold tabular-nums">
                      Over by {formatCurrency(b.overAmount, currency, hide)}
                    </span>
                  ) : (
                    <span>
                      Remaining:{' '}
                      <strong className="text-white tabular-nums">
                        {formatCurrency(b.remaining, currency, hide)}
                      </strong>
                    </span>
                  )}
                  <span className="text-[11px] text-zinc-500">Alert at {b.alertThreshold}%</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Budget Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingBudget ? 'Edit Monthly Budget' : 'Set Monthly Budget'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Expense Category</label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              disabled={Boolean(editingBudget)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-indigo-500/50"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#111218] text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Monthly Budget Limit</label>
              <input
                type="number"
                step="1"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="500"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-indigo-500/50 tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Alert Threshold (%)</label>
              <input
                type="number"
                min="10"
                max="100"
                value={form.alertThreshold}
                onChange={(e) => setForm({ ...form, alertThreshold: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-indigo-500/50 tabular-nums"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Budget</Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Budget"
        message={`Remove the monthly budget for "${deleteTarget?.category?.name || 'this category'}"?`}
      />
    </div>
  );
}
