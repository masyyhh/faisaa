import type { Request, Response, NextFunction } from 'express';
import prisma from '../prisma/client.js';
import { billSchema } from '../validators/schemas.js';

function normalizeMonthlyEquivalent(amount: number, frequency: string): number {
  switch (frequency) {
    case 'WEEKLY':
      return amount * (52 / 12);
    case 'BIWEEKLY':
      return amount * (26 / 12);
    case 'MONTHLY':
      return amount;
    case 'QUARTERLY':
      return amount / 3;
    case 'YEARLY':
      return amount / 12;
    default:
      return amount;
  }
}

export async function getBills(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const now = new Date();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [bills, pastBillPayments] = await Promise.all([
      prisma.bill.findMany({
        where: { userId },
        orderBy: { dueDate: 'asc' },
        include: {
          account: { select: { id: true, name: true, type: true, color: true } },
          category: { select: { id: true, name: true, type: true, icon: true, color: true } },
        },
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          type: 'EXPENSE',
          date: { gte: sixMonthsAgo },
          OR: [
            { isRecurring: true },
            { description: { contains: 'Bill payment' } },
          ],
        },
        select: {
          id: true,
          amount: true,
          payee: true,
          description: true,
          date: true,
        },
        orderBy: { date: 'asc' },
      }),
    ]);

    const enriched = bills.map((bill) => {
      const due = new Date(bill.dueDate);
      const diffDays = Math.ceil((due.getTime() - now.getTime()) / 86400000);
      let computedStatus = bill.status;
      if (bill.status === 'UPCOMING' && diffDays < 0) {
        computedStatus = 'OVERDUE';
      }
      const monthlyEquivalent = Number(normalizeMonthlyEquivalent(bill.amount, bill.frequency).toFixed(2));

      // Match payment history for this bill
      const billKeywords = [bill.name.toLowerCase()];
      if (bill.name.toLowerCase().includes('stelco')) billKeywords.push('stelco');
      if (bill.name.toLowerCase().includes('mwsc')) billKeywords.push('mwsc');
      if (bill.name.toLowerCase().includes('dhiraagu')) billKeywords.push('dhiraagu');
      if (bill.name.toLowerCase().includes('ooredoo')) billKeywords.push('ooredoo');

      const matches = pastBillPayments.filter((t) => {
        const p = (t.payee || '').toLowerCase();
        const d = (t.description || '').toLowerCase();
        return billKeywords.some((kw) => p.includes(kw) || d.includes(kw));
      });

      const paymentHistory = matches.map((m) => {
        const dt = new Date(m.date);
        return {
          id: m.id,
          amount: m.amount,
          date: m.date,
          month: dt.toLocaleString('en-US', { month: 'short' }),
        };
      });

      const averageAmount =
        paymentHistory.length > 0
          ? Number((paymentHistory.reduce((s, h) => s + h.amount, 0) / paymentHistory.length).toFixed(2))
          : null;
      const minAmount =
        paymentHistory.length > 0 ? Math.min(...paymentHistory.map((h) => h.amount)) : null;
      const maxAmount =
        paymentHistory.length > 0 ? Math.max(...paymentHistory.map((h) => h.amount)) : null;

      const isVariableExplicit = (bill.notes || '').includes('[VARIABLE]');
      const isVariableGuessed =
        !bill.isSubscription ||
        bill.name.toLowerCase().includes('electricity') ||
        bill.name.toLowerCase().includes('stelco') ||
        bill.name.toLowerCase().includes('mwsc') ||
        bill.name.toLowerCase().includes('water') ||
        bill.name.toLowerCase().includes('utility');
      const isVariable = isVariableExplicit || isVariableGuessed;

      return {
        ...bill,
        status: computedStatus,
        daysUntilDue: diffDays,
        monthlyEquivalent,
        yearlyEquivalent: Number((monthlyEquivalent * 12).toFixed(2)),
        isVariable,
        averageAmount,
        minAmount,
        maxAmount,
        paymentHistory,
      };
    });

    const activeBills = enriched.filter((b) => b.status !== 'PAUSED');
    const monthlyRecurringCost = Number(
      activeBills.reduce((s, b) => s + b.monthlyEquivalent, 0).toFixed(2)
    );
    const yearlyRecurringCost = Number((monthlyRecurringCost * 12).toFixed(2));

    res.json({
      success: true,
      bills: enriched,
      summary: {
        monthlyRecurringCost,
        yearlyRecurringCost,
        upcomingCount: enriched.filter((b) => b.status === 'UPCOMING').length,
        overdueCount: enriched.filter((b) => b.status === 'OVERDUE').length,
        paidCount: enriched.filter((b) => b.status === 'PAID').length,
        subscriptionCount: enriched.filter((b) => b.isSubscription && b.status !== 'PAUSED').length,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createBill(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const parsed = billSchema.parse(req.body);

    if (parsed.accountId) {
      const acc = await prisma.account.findFirst({ where: { id: parsed.accountId, userId } });
      if (!acc) {
        res.status(403).json({
          success: false,
          message: 'Selected account not found or unauthorized.',
        });
        return;
      }
    }

    if (parsed.categoryId) {
      const cat = await prisma.category.findFirst({ where: { id: parsed.categoryId, userId } });
      if (!cat) {
        res.status(403).json({
          success: false,
          message: 'Selected category not found or unauthorized.',
        });
        return;
      }
    }

    const dueDate = new Date(parsed.dueDate);

    const created = await prisma.bill.create({
      data: {
        userId: req.user!.id,
        accountId: parsed.accountId || null,
        categoryId: parsed.categoryId || null,
        name: parsed.name,
        amount: parsed.amount,
        frequency: parsed.frequency,
        dueDate,
        dueDay: parsed.dueDay || dueDate.getDate(),
        status: parsed.status || 'UPCOMING',
        isSubscription: parsed.isSubscription !== undefined ? parsed.isSubscription : true,
        autoPay: Boolean(parsed.autoPay),
        website: parsed.website || null,
        notes: parsed.notes || null,
      },
      include: { account: true, category: true },
    });

    res.status(201).json({
      success: true,
      bill: created,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateBill(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const existing = await prisma.bill.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Bill not found.',
      });
      return;
    }

    const parsed = billSchema.partial().parse(req.body);

    if (parsed.accountId) {
      const account = await prisma.account.findFirst({
        where: { id: parsed.accountId, userId: req.user!.id },
      });
      if (!account) {
        res.status(403).json({
          success: false,
          message: 'Selected account not found or unauthorized.',
        });
        return;
      }
    }

    if (parsed.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: parsed.categoryId, userId: req.user!.id },
      });
      if (!category) {
        res.status(403).json({
          success: false,
          message: 'Selected category not found or unauthorized.',
        });
        return;
      }
    }

    const updated = await prisma.bill.update({
      where: { id },
      data: {
        ...(parsed.accountId !== undefined ? { accountId: parsed.accountId || null } : {}),
        ...(parsed.categoryId !== undefined ? { categoryId: parsed.categoryId || null } : {}),
        ...(parsed.name ? { name: parsed.name } : {}),
        ...(parsed.amount !== undefined ? { amount: parsed.amount } : {}),
        ...(parsed.frequency ? { frequency: parsed.frequency } : {}),
        ...(parsed.dueDate ? { dueDate: new Date(parsed.dueDate) } : {}),
        ...(parsed.dueDay !== undefined ? { dueDay: parsed.dueDay } : {}),
        ...(parsed.status ? { status: parsed.status } : {}),
        ...(parsed.isSubscription !== undefined ? { isSubscription: parsed.isSubscription } : {}),
        ...(parsed.autoPay !== undefined ? { autoPay: parsed.autoPay } : {}),
        ...(parsed.website !== undefined ? { website: parsed.website } : {}),
        ...(parsed.notes !== undefined ? { notes: parsed.notes } : {}),
      },
      include: { account: true, category: true },
    });

    res.json({
      success: true,
      bill: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function payBill(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { recordTransaction = true, paidAmount, accountId: customAccountId } = req.body;

    const existing = await prisma.bill.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Bill not found.',
      });
      return;
    }

    const actualAmount =
      paidAmount !== undefined && Number(paidAmount) > 0 ? Number(paidAmount) : existing.amount;
    const accountToUse = customAccountId || existing.accountId;

    // Calculate next due date based on frequency
    const nextDue = new Date(existing.dueDate);
    if (existing.frequency === 'WEEKLY') nextDue.setDate(nextDue.getDate() + 7);
    else if (existing.frequency === 'BIWEEKLY') nextDue.setDate(nextDue.getDate() + 14);
    else if (existing.frequency === 'QUARTERLY') nextDue.setMonth(nextDue.getMonth() + 3);
    else if (existing.frequency === 'YEARLY') nextDue.setFullYear(nextDue.getFullYear() + 1);
    else nextDue.setMonth(nextDue.getMonth() + 1);

    const updated = await prisma.$transaction(async (tx) => {
      if (recordTransaction && accountToUse) {
        const account = await tx.account.findUnique({
          where: { id: accountToUse },
        });

        await tx.account.update({
          where: { id: accountToUse },
          data: { balance: { decrement: actualAmount } },
        });

        await tx.transaction.create({
          data: {
            userId: req.user!.id,
            accountId: accountToUse,
            categoryId: existing.categoryId,
            type: 'EXPENSE',
            amount: actualAmount,
            currency: account?.currency || 'MVR',
            payee: existing.name,
            description: `Bill payment: ${existing.name}`,
            date: new Date(),
            isRecurring: true,
          },
        });
      }

      return tx.bill.update({
        where: { id },
        data: {
          status: 'UPCOMING',
          lastPaidDate: new Date(),
          dueDate: nextDue,
        },
        include: { account: true, category: true },
      });
    });

    res.json({
      success: true,
      message: `${existing.name} settled with payment of MVR ${actualAmount.toFixed(2)}.`,
      bill: updated,
      paidAmount: actualAmount,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteBill(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const existing = await prisma.bill.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Bill not found.',
      });
      return;
    }

    await prisma.bill.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Bill deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
}
