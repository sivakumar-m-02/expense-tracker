import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';

const PENDING_EXPENSES_KEY = 'PENDING_OFFLINE_EXPENSES';

const normalizeExpense = (expense) => ({
  ...expense,
  date: expense.date instanceof Date ? expense.date.toISOString() : expense.date,
  createdAt: expense.createdAt instanceof Date ? expense.createdAt.toISOString() : expense.createdAt,
});

export const getPendingOfflineExpenses = async () => {
  try {
    const raw = await AsyncStorage.getItem(PENDING_EXPENSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.log('OfflineExpenseSyncService getPendingOfflineExpenses error:', error);
    return [];
  }
};

const storePendingOfflineExpenses = async (items) => {
  try {
    await AsyncStorage.setItem(PENDING_EXPENSES_KEY, JSON.stringify(items));
    return items;
  } catch (error) {
    console.log('OfflineExpenseSyncService storePendingOfflineExpenses error:', error);
    return items;
  }
};

export const queueOfflineExpense = async (expense) => {
  try {
    const pending = await getPendingOfflineExpenses();
    const pendingExpense = {
      ...normalizeExpense(expense),
      id: `pending-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      type: 'expense',
      pending: true,
    };
    const next = [...pending, pendingExpense];
    await storePendingOfflineExpenses(next);
    return pendingExpense;
  } catch (error) {
    console.log('OfflineExpenseSyncService queueOfflineExpense error:', error);
    return null;
  }
};

export const removePendingOfflineExpense = async (id) => {
  try {
    const pending = await getPendingOfflineExpenses();
    const next = pending.filter((item) => item.id !== id);
    await storePendingOfflineExpenses(next);
    return next;
  } catch (error) {
    console.log('OfflineExpenseSyncService removePendingOfflineExpense error:', error);
    return [];
  }
};

export const syncPendingOfflineExpenses = async (userId) => {
  if (!userId) return [];

  try {
    const pending = await getPendingOfflineExpenses();
    if (!pending.length) return pending;

    const userRef = firestore().collection('users').doc(userId);
    const stillPending = [];

    for (const expense of pending) {
      const { id, pending: isPending, type, ...payload } = expense;
      try {
        await userRef.collection('expenses').add({
          ...payload,
          amount: Number(payload.amount),
          category: payload.category,
          subcategory: payload.subcategory ?? null,
          note: payload.note ?? null,
          date: payload.date ? new Date(payload.date) : new Date(),
          createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date(),
        });
      } catch (writeError) {
        stillPending.push(expense);
      }
    }

    await storePendingOfflineExpenses(stillPending);
    return stillPending;
  } catch (error) {
    console.log('OfflineExpenseSyncService syncPendingOfflineExpenses error:', error);
    return await getPendingOfflineExpenses();
  }
};
