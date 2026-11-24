import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Edit3,
  Trash2,
  Zap,
  Wifi,
  Droplet,
  Tv,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api, { Bill, Account, Category } from '../services/api';

export interface BillWithVariable extends Bill {
  isVariable?: boolean;
  averageAmount?: number | null;
  minAmount?: number | null;
  maxAmount?: number | null;
  paymentHistory?: Array<{ id: string; amount: number; date: string; month: string }>;
}
import {
  Card,
  Button,
  Badge,
  Modal,
  ConfirmDialog,
  LoadingState,
  EmptyState,
  Skeleton,
  SkeletonCard,
  SkeletonMetric,
  AnimatedNumber,
} from '../components/ui';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function BillsPage() {
  const { user, addToast, refreshTrigger, triggerDataRefresh } = useAuth();

  const [bills, setBills] = useState<BillWithVariable[]>([]);
  const [summary, setSummary] = useState({
    monthlyRecurringCost: 0,
    yearlyRecurringCost: 0,
    upcomingCount: 0,
    overdueCount: 0,
    subscriptionCount: 0,
  });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterTab, setFilterTab] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Pay Settlement Modal State
  const [payModalBill, setPayModalBill] = useState<BillWithVariable | null>(null);
  const [actualPaidAmount, setActualPaidAmount] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paying, setPaying] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<BillWithVariable | null>(null);
  const [form, setForm] = useState({
    name: '',
    amount: '',
    frequency: 'MONTHLY',
    dueDate: new Date().toISOString().split('T')[0],
    accountId: '',
    categoryId: '',
    isSubscription: true,
    autoPay: true,
    isVariable: false,
    notes: '',
  });
  const [deleteTarget, setDeleteTarget] = useState<BillWithVariable | null>(null);

  const loadBills = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, aRes, cRes] = await Promise.all([
        api.get('/bills'),
        api.get('/accounts'),
        api.get('/categories'),
      ]);
      if (bRes.data.success) {
        setBills(bRes.data.bills || []);
        setSummary(bRes.data.summary || {});
      }
      setAccounts(aRes.data.accounts || []);
      setCategories((cRes.data.categories || []).filter((c: Category) => c.type === 'EXPENSE'));
    } catch (err) {
      console.error('Failed to load bills:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBills();
  }, [loadBills, refreshTrigger]);

  const openAddModal = (preset?: {
    name?: string;
    amount?: number;
    frequency?: string;
    isSubscription?: boolean;
    autoPay?: boolean;
    isVariable?: boolean;
  }) => {
    setEditingBill(null);
    const isVar =
      preset?.isVariable !== undefined
        ? preset.isVariable
        : (preset?.name || '').toLowerCase().includes('stelco') ||
          (preset?.name || '').toLowerCase().includes('mwsc') ||
          (preset?.name || '').toLowerCase().includes('water') ||
          (preset?.name || '').toLowerCase().includes('electricity');

    setForm({
      name: preset?.name || '',
      amount: preset?.amount ? String(preset.amount) : '',
      frequency: preset?.frequency || 'MONTHLY',
      dueDate: new Date().toISOString().split('T')[0],
      accountId: accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || '',
      categoryId: categories[0]?.id || '',
      isSubscription: preset?.isSubscription !== undefined ? preset.isSubscription : true,
      autoPay: preset?.autoPay !== undefined ? preset.autoPay : true,
      isVariable: isVar,
      notes: '',
    });
    setModalOpen(true);
  };

  const billTemplates = [
    {
      title: 'Dhiraagu / Ooredoo Internet',
      subtitle: 'MVR 850 / mo',
      badge: 'Utility',
      icon: Wifi,
      onClick: () =>
        openAddModal({
          name: 'Home Fibre Internet',
          amount: 850,
          frequency: 'MONTHLY',
          isSubscription: true,
          autoPay: true,
          isVariable: false,
        }),
    },
    {
      title: 'STELCO Electricity Bill',
      subtitle: 'MVR 1,200 / mo',
      badge: '⚡ Metered / Variable',
      icon: Zap,
      onClick: () =>
        openAddModal({
          name: 'STELCO Electricity',
          amount: 1200,
          frequency: 'MONTHLY',
          isSubscription: false,
          autoPay: false,
          isVariable: true,
        }),
    },
    {
      title: 'MWSC Water Supply',
      subtitle: 'MVR 350 / mo',
      badge: '⚡ Metered / Variable',
      icon: Droplet,
      onClick: () =>
        openAddModal({
          name: 'MWSC Water Bill',
          amount: 350,
          frequency: 'MONTHLY',
          isSubscription: false,
          autoPay: false,
          isVariable: true,
        }),
    },
    {
      title: 'Netflix / MediaNet',
      subtitle: 'MVR 250 / mo',
      badge: 'Entertainment',
      icon: Tv,
      onClick: () =>
        openAddModal({
          name: 'Netflix / Streaming',
          amount: 250,
          frequency: 'MONTHLY',
          isSubscription: true,
          autoPay: true,
          isVariable: false,
        }),
    },
  ];

  const openEditModal = (bill: BillWithVariable) => {
    setEditingBill(bill);
    const isVar = Boolean(bill.isVariable || (bill.notes || '').includes('[VARIABLE]'));
    setForm({
      name: bill.name,
      amount: String(bill.amount),
      frequency: bill.frequency,
      dueDate: new Date(bill.dueDate).toISOString().split('T')[0],
      accountId: bill.accountId || '',
      categoryId: bill.categoryId || '',
      isSubscription: bill.isSubscription,
      autoPay: bill.autoPay,
      isVariable: isVar,
      notes: (bill.notes || '').replace('[VARIABLE]', '').trim(),
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalNotes = form.notes || '';
      if (form.isVariable && !finalNotes.includes('[VARIABLE]')) {
        finalNotes = finalNotes ? `${finalNotes} [VARIABLE]` : '[VARIABLE]';
      } else if (!form.isVariable && finalNotes.includes('[VARIABLE]')) {
        finalNotes = finalNotes.replace('[VARIABLE]', '').trim();
      }

      const payload = {
        name: form.name,
        amount: parseFloat(form.amount),
        frequency: form.frequency,
        dueDate: form.dueDate,
        accountId: form.accountId || null,
        categoryId: form.categoryId || null,
        isSubscription: form.isSubscription,
        autoPay: form.autoPay,
        notes: finalNotes || null,
      };

      if (editingBill) {
        await api.put(`/bills/${editingBill.id}`, payload);
        addToast('Bill updated!', 'success');
      } else {
        await api.post('/bills', payload);
        addToast('Bill added!', 'success');
      }
      setModalOpen(false);
      triggerDataRefresh();
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to save bill.', 'error');
    }
  };

  const openPayModal = (bill: BillWithVariable) => {
    setPayModalBill(bill);
    setActualPaidAmount(String(bill.amount));
    setPaymentAccountId(bill.accountId || accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || '');
  };

  const handleConfirmPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalBill) return;
    setPaying(true);
    try {
      const parsedAmount = parseFloat(actualPaidAmount);
      await api.post(`/bills/${payModalBill.id}/pay`, {
        recordTransaction: true,
        paidAmount: parsedAmount > 0 ? parsedAmount : payModalBill.amount,
        accountId: paymentAccountId || payModalBill.accountId,
      });
      addToast(
        `${payModalBill.name} settled with MVR ${(parsedAmount || payModalBill.amount).toFixed(2)} & logged to transactions!`,
        'success'
      );
      setPayModalBill(null);
      triggerDataRefresh();
    } catch {
      addToast('Failed to settle bill payment.', 'error');
    } finally {
      setPaying(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/bills/${deleteTarget.id}`);
      addToast('Bill removed.', 'info');
      setDeleteTarget(null);
      triggerDataRefresh();
    } catch {
      addToast('Failed to delete bill.', 'error');
    }
  };

  const filteredBills = bills.filter((b) => {
    if (filterTab === 'UPCOMING') return b.status === 'UPCOMING';
    if (filterTab === 'OVERDUE') return b.status === 'OVERDUE';
    if (filterTab === 'PAID') return b.status === 'PAID';
    if (filterTab === 'SUBSCRIPTIONS') return b.isSubscription;
    return true;
  });

  const currency = user?.currency || 'MVR';
  const hide = user?.hideBalances;

  if (loading && bills.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-60" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
        <SkeletonMetric count={4} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} className="h-44 flex flex-col justify-between" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-display tracking-tight">
            Bills & Subscriptions
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Monitor fixed monthly commitments, upcoming due dates, and active streaming/software subscriptions.
          </p>
        </div>

        <Button size="sm" onClick={() => openAddModal()}>
          <Plus className="w-3.5 h-3.5" /> Add Bill / Subscription
        </Button>
      </div>

      {/* Overdue Warning Banner */}
      {summary.overdueCount > 0 && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-semibold text-white">
                Action Required: {summary.overdueCount} Overdue Bill(s)
              </p>
              <p className="text-xs text-zinc-400">
                Review overdue payments below and click "Mark as Paid" once settled.
              </p>
            </div>
          </div>
          <Button variant="danger" size="sm" onClick={() => setFilterTab('OVERDUE')}>
            View Overdue
          </Button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <Card className="p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-zinc-400">Monthly Burn</span>
          <p className="text-lg sm:text-xl font-bold text-white font-display tabular-nums mt-1 truncate">
            <AnimatedNumber value={summary.monthlyRecurringCost} currency={currency} hide={hide} />
          </p>
          <span className="text-[11px] text-zinc-500 mt-0.5 block truncate">Normalized monthly cost</span>
        </Card>

        <Card className="p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-zinc-400">Yearly Total</span>
          <p className="text-lg sm:text-xl font-bold text-indigo-400 font-display tabular-nums mt-1 truncate">
            <AnimatedNumber value={summary.yearlyRecurringCost} currency={currency} hide={hide} />
          </p>
          <span className="text-[11px] text-zinc-500 mt-0.5 block truncate">Annualized recurring</span>
        </Card>

        <Card className="p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-zinc-400">Active Plans</span>
          <p className="text-lg sm:text-xl font-bold text-sky-400 font-display tabular-nums mt-1 truncate">
            <AnimatedNumber value={summary.subscriptionCount} /> Active
          </p>
          <span className="text-[11px] text-zinc-500 mt-0.5 block truncate">Digital subscriptions</span>
        </Card>

        <Card className="p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-zinc-400">Upcoming & Overdue</span>
          <p className="text-lg sm:text-xl font-bold text-amber-400 font-display tabular-nums mt-1 truncate">
            <AnimatedNumber value={summary.upcomingCount} /> Due • <AnimatedNumber value={summary.overdueCount} /> Late
          </p>
          <span className="text-[11px] text-zinc-500 mt-0.5 block truncate">Next 30 days</span>
        </Card>
      </div>

      {/* Segmented Filter Control */}
      <div className="inline-flex p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] gap-1 overflow-x-auto no-scrollbar">
        {[
          { id: 'ALL', label: `All (${bills.length})` },
          { id: 'UPCOMING', label: `Upcoming (${summary.upcomingCount})` },
          { id: 'OVERDUE', label: `Overdue (${summary.overdueCount})` },
          { id: 'PAID', label: 'Paid' },
          { id: 'SUBSCRIPTIONS', label: 'Subscriptions' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setFilterTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 whitespace-nowrap cursor-pointer ${
              filterTab === t.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Bills List or Rich Empty State */}
      {filteredBills.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={filterTab === 'ALL' ? 'No recurring bills or subscriptions' : `No ${filterTab.toLowerCase()} bills found`}
          description={
            filterTab === 'ALL'
              ? 'Never miss an internet, utility, or subscription renewal by setting up your recurring payments.'
              : 'Clear your filters or add a new recurring payment schedule.'
          }
          templatesTitle={filterTab === 'ALL' ? 'Quick-add utility & subscription templates:' : undefined}
          templates={filterTab === 'ALL' ? billTemplates : undefined}
          action={
            <Button size="sm" onClick={() => openAddModal()}>
              <Plus className="w-4 h-4" /> Add Bill / Subscription
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {filteredBills.map((bill) => (
            <Card key={bill.id} className="flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-sm sm:text-base font-semibold text-white">{bill.name}</h3>
                      {bill.isVariable && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/25">
                          <Zap className="w-2.5 h-2.5" /> Variable
                        </span>
                      )}
                      {bill.autoPay && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          AutoPay
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {bill.category?.name || 'Utilities'} • {bill.account?.name || 'Primary'}
                    </p>
                  </div>

                  <Badge
                    variant={
                      bill.status === 'OVERDUE'
                        ? 'danger'
                        : bill.status === 'PAID'
                        ? 'success'
                        : 'warning'
                    }
                  >
                    {bill.status}
                  </Badge>
                </div>

                <div className="mt-4">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-xl sm:text-2xl font-bold text-white font-display tabular-nums">
                        <AnimatedNumber value={bill.amount} currency={currency} hide={hide} />
                        <span className="text-xs font-normal text-zinc-500 ml-1">
                          {bill.isVariable ? '(estimated)' : `/ ${bill.frequency.toLowerCase()}`}
                        </span>
                      </p>
                      {bill.isVariable && bill.averageAmount && (
                        <p className="text-[11px] text-amber-400/90 font-medium tabular-nums mt-0.5">
                          Avg: ~{formatCurrency(bill.averageAmount, currency, hide)}/mo
                          {bill.minAmount && bill.maxAmount && bill.minAmount !== bill.maxAmount ? (
                            <span className="text-zinc-500 font-normal ml-1">
                              ({formatCurrency(bill.minAmount, currency, hide)} - {formatCurrency(bill.maxAmount, currency, hide)})
                            </span>
                          ) : null}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-zinc-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      Due {formatDate(bill.dueDate, user?.dateFormat)}
                    </span>
                  </div>

                  {/* Metered / Fluctuating Payment History */}
                  {bill.paymentHistory && bill.paymentHistory.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-white/[0.04]">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
                        <span className="flex items-center gap-1 text-zinc-300 font-medium">
                          <TrendingUp className="w-3 h-3 text-amber-400" /> Recent Metered Payments
                        </span>
                        <span className="text-zinc-500">{bill.paymentHistory.length} recorded</span>
                      </div>
                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                        {bill.paymentHistory.slice(-4).map((h, idx) => (
                          <div
                            key={idx}
                            className="flex-1 min-w-[65px] px-2 py-1 rounded-lg bg-white/[0.03] border border-white/[0.05] text-center"
                          >
                            <span className="text-[9px] text-zinc-400 block uppercase tracking-wider">{h.month}</span>
                            <span className="text-[11px] font-bold text-white tabular-nums">
                              {formatCurrency(h.amount, currency, hide)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/[0.06]">
                {bill.status !== 'PAID' ? (
                  <Button
                    variant="emerald"
                    size="sm"
                    onClick={() => openPayModal(bill)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {bill.isVariable ? 'Settle Actual Bill' : 'Mark as Paid'}
                  </Button>
                ) : (
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Settled for cycle
                  </span>
                )}

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(bill)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.07] cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(bill)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Bill Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingBill ? 'Edit Bill / Subscription' : 'Add Bill or Subscription'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Service / Bill Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Netflix, Fiber Internet"
                className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="19.99"
                className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Frequency</label>
              <select
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#181C2C] border border-white/[0.1] text-xs text-white"
              >
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="BIWEEKLY">Biweekly</option>
                <option value="WEEKLY">Weekly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Next Due Date</label>
              <input
                type="date"
                required
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Payment Account</label>
              <select
                value={form.accountId}
                onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#181C2C] border border-white/[0.1] text-xs text-white"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}{a.isDefault ? ' ★ Default' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Category</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#181C2C] border border-white/[0.1] text-xs text-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Variable Utility Bill Checkbox Toggle */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-1.5">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isVariable}
                onChange={(e) => setForm({ ...form, isVariable: e.target.checked })}
                className="w-4 h-4 rounded text-amber-500 bg-white/[0.05] border-white/20 focus:ring-0 cursor-pointer"
              />
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Metered / Variable Utility Bill
              </span>
            </label>
            <p className="text-[11px] text-zinc-400 pl-6 leading-relaxed">
              Enable for bills with fluctuating monthly charges (like STELCO Electricity or MWSC Water). Faisaa will prompt you for the exact monthly bill amount upon settlement.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingBill ? 'Update Bill' : 'Save Bill'}</Button>
          </div>
        </form>
      </Modal>

      {/* Settle / Pay Bill with Exact Actual Amount Modal */}
      <Modal
        isOpen={Boolean(payModalBill)}
        onClose={() => setPayModalBill(null)}
        title={payModalBill ? `Settle ${payModalBill.name}` : 'Settle Bill'}
      >
        {payModalBill && (
          <form onSubmit={handleConfirmPay} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Bill Type</span>
                <Badge variant={payModalBill.isVariable ? 'warning' : 'default'}>
                  {payModalBill.isVariable ? '⚡ Metered / Variable Utility' : 'Fixed Subscription'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Estimated Baseline</span>
                <span className="text-white font-semibold tabular-nums">
                  {formatCurrency(payModalBill.amount, currency, hide)}
                </span>
              </div>
              {payModalBill.averageAmount && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">3-Month Rolling Average</span>
                  <span className="text-amber-400 font-semibold tabular-nums">
                    ~{formatCurrency(payModalBill.averageAmount, currency, hide)}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                This Month's Actual Bill Amount ({currency}) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={actualPaidAmount}
                  onChange={(e) => setActualPaidAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-3.5 pr-14 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-base font-bold text-white tabular-nums focus:outline-none focus:border-emerald-500/50"
                  autoFocus
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400">
                  {currency}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Enter the exact amount from this month's bill, SMS notification, or utility portal.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Paid From Account</label>
              <select
                value={paymentAccountId}
                onChange={(e) => setPaymentAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-indigo-500/50"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id} className="bg-[#111218] text-white">
                    {a.name} ({formatCurrency(Number(a.balance) || 0, a.currency || 'MVR', hide)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.06]">
              <Button type="button" variant="ghost" onClick={() => setPayModalBill(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="emerald" loading={paying}>
                <CheckCircle2 className="w-4 h-4" />
                Confirm Payment of {formatCurrency(parseFloat(actualPaidAmount) || 0, currency, hide)}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Bill"
        message={`Delete "${deleteTarget?.name || 'this bill'}" from your recurring bills?`}
      />
    </div>
  );
}
