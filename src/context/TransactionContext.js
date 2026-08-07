import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { AppState } from "react-native";
import NetInfo from '@react-native-community/netinfo';
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import {
  getPendingOfflineExpenses,
  syncPendingOfflineExpenses,
  removePendingOfflineExpense,
} from "../services/offlineExpenseSyncService";

const TransactionContext = createContext();

export const useTransactions = () => useContext(TransactionContext);

const mergeExpenses = (remoteExpenses = [], pendingExpenses = []) => {
  const pendingItems = pendingExpenses.map((item) => ({
    ...item,
    date: item.date ? new Date(item.date) : new Date(),
    type: 'expense',
    pending: true,
  }));
  return [...remoteExpenses, ...pendingItems].sort((a, b) => new Date(b.date) - new Date(a.date));
};

export const TransactionProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [remoteExpenses, setRemoteExpenses] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [pendingOfflineExpenses, setPendingOfflineExpenses] = useState([]);
  const [error, setError] = useState(null);
  const [globalBudget, setGlobalBudget] = useState(0);
  const [cashbookBudget, setCashbookBudget] = useState(0);
  const [selectedCashbookId, setSelectedCashbookId] = useState(null);
  const [selectedCashbookName, setSelectedCashbookName] = useState(null);
  const [primaryColor, setPrimaryColor] = useState("#37474F");

  const budget = selectedCashbookId ? cashbookBudget : globalBudget;
  const setBudget = useCallback(
    (val) => {
      if (selectedCashbookId) setCashbookBudget(val);
      else setGlobalBudget(val);
    },
    [selectedCashbookId]
  );
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [statisticsCashbookIds, setStatisticsCashbookIds] = useState([]);
  const [statisticsCashbookNames, setStatisticsCashbookNames] = useState([]);
  const [isStatisticsSelectionActive, setIsStatisticsSelectionActive] = useState(false);

  useEffect(() => {
    setExpenses(mergeExpenses(remoteExpenses, pendingOfflineExpenses));
  }, [remoteExpenses, pendingOfflineExpenses]);

  const loadPendingExpenses = useCallback(async () => {
    try {
      const pending = await getPendingOfflineExpenses();
      setPendingOfflineExpenses(pending);
    } catch (e) {
      console.log('TransactionContext loadPendingExpenses error:', e);
    }
  }, []);

  const syncPendingWhenAvailable = useCallback(async (user) => {
    if (!user) return;
    try {
      const stillPending = await syncPendingOfflineExpenses(user.uid);
      setPendingOfflineExpenses(stillPending);
    } catch (e) {
      console.log('TransactionContext syncPendingWhenAvailable error:', e);
    }
  }, []);

  useEffect(() => {
    loadPendingExpenses();
  }, [loadPendingExpenses]);

  useEffect(() => {
    let unsubProfile = null;
    let unsubA = null;
    let unsubB = null;
    let firstLoadA = true;
    let firstLoadB = true;

    const unsubscribeAuth = auth().onAuthStateChanged((user) => {
      unsubA?.();
      unsubB?.();
      unsubProfile?.();

      if (!user) {
        setRemoteExpenses([]);
        setIncomes([]);
        setGlobalBudget(0);
        setCashbookBudget(0);
        setSelectedCashbookId(null);
        setSelectedCashbookName(null);
        setStatisticsCashbookIds([]);
        setStatisticsCashbookNames([]);
        setIsStatisticsSelectionActive(false);
        setPrimaryColor("#37474F");
        setLoading(false);
        return;
      }

      setError(null);
      setLoading(true);

      const userRef = firestore().collection("users").doc(user.uid);
      unsubProfile = userRef.onSnapshot(
        (doc) => {
          const data = doc.data();
          setGlobalBudget(data?.budget ?? 0);
          setPrimaryColor(data?.primaryColor ?? "#37474F");
        },
        (e) => {
          setError("Failed to load profile. Please try again later.");
          setLoading(false);
          console.log("TransactionContext profile error:", e);
        }
      );

      const expensesRef = userRef.collection("expenses").orderBy("date", "desc");
      const incomeRef = userRef.collection("income").orderBy("date", "desc");

      firstLoadA = true;
      firstLoadB = true;

      unsubA = expensesRef.onSnapshot(
        (qs) => {
          const list = [];
          qs.forEach((doc) => list.push({ id: doc.id, ...doc.data(), type: "expense" }));
          setRemoteExpenses(list);
          if (firstLoadA) {
            firstLoadA = false;
            if (!firstLoadB) setLoading(false);
          }
        },
        (e) => {
          setError("Failed to load expenses. Please try again later.");
          setLoading(false);
          console.log("TransactionContext expenses error:", e);
        }
      );

      unsubB = incomeRef.onSnapshot(
        (qs) => {
          const list = [];
          qs.forEach((doc) => list.push({ id: doc.id, ...doc.data(), type: "income" }));
          setIncomes(list);
          if (firstLoadB) {
            firstLoadB = false;
            if (!firstLoadA) setLoading(false);
          }
        },
        (e) => {
          setError("Failed to load income. Please try again later.");
          setLoading(false);
          console.log("TransactionContext income error:", e);
        }
      );

      syncPendingWhenAvailable(user);
    });

    return () => {
      unsubA?.();
      unsubB?.();
      unsubProfile?.();
      unsubscribeAuth?.();
    };
  }, [syncPendingWhenAvailable]);

  useEffect(() => {
    const user = auth().currentUser;
    if (!user || !selectedCashbookId) return undefined;

    return firestore()
      .collection("users")
      .doc(user.uid)
      .collection("cashbooks")
      .doc(selectedCashbookId)
      .onSnapshot(
        (doc) => {
          const data = doc.data();
          setCashbookBudget(data?.budget ?? 0);
          setSelectedCashbookName(data?.name ?? null);
        },
        (e) => {
          console.log("TransactionContext selected cashbook error:", e);
        }
      );
  }, [selectedCashbookId]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = state.isConnected && state.isInternetReachable !== false;
      if (isOnline) {
        const user = auth().currentUser;
        if (user) {
          syncPendingWhenAvailable(user);
        }
      }
    });

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        const user = auth().currentUser;
        if (user) {
          syncPendingWhenAvailable(user);
        }
      }
    });

    return () => {
      unsubscribe();
      subscription.remove();
    };
  }, [syncPendingWhenAvailable]);

  // Manual refresh function
  const refreshTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = auth().currentUser;
      if (!user) {
        setRemoteExpenses([]);
        setIncomes([]);
        setLoading(false);
        return;
      }
      const userRef = firestore().collection("users").doc(user.uid);
      const expensesSnap = await userRef.collection("expenses").orderBy("date", "desc").get();
      const expensesList = expensesSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: "expense" }));
      setRemoteExpenses(expensesList);
      const incomeSnap = await userRef.collection("income").orderBy("date", "desc").get();
      const incomeList = incomeSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: "income" }));
      setIncomes(incomeList);
      await loadPendingExpenses();
    } catch (e) {
      setError("Failed to refresh transactions. Please try again later.");
      console.log("TransactionContext manual refresh error:", e);
    }
    setLoading(false);
  }, [loadPendingExpenses]);

  const removeLocalPendingExpense = useCallback(async (id) => {
    try {
      const stillPending = await removePendingOfflineExpense(id);
      setPendingOfflineExpenses(stillPending);
    } catch (e) {
      console.log('TransactionContext removeLocalPendingExpense error:', e);
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      expenses,
      incomes,
      loading,
      error,
      budget,
      setBudget,
      selectedCashbookId,
      setSelectedCashbookId,
      selectedCashbookName,
      primaryColor,
      setPrimaryColor,
      selectedMonth,
      setSelectedMonth,
      selectedYear,
      setSelectedYear,
      statisticsCashbookIds,
      setStatisticsCashbookIds,
      statisticsCashbookNames,
      setStatisticsCashbookNames,
      isStatisticsSelectionActive,
      setIsStatisticsSelectionActive,
      refreshTransactions,
      removeLocalPendingExpense,
    }),
    [
      expenses,
      incomes,
      loading,
      error,
      budget,
      setBudget,
      selectedCashbookId,
      selectedCashbookName,
      primaryColor,
      selectedMonth,
      selectedYear,
      statisticsCashbookIds,
      statisticsCashbookNames,
      isStatisticsSelectionActive,
      refreshTransactions,
      removeLocalPendingExpense,
    ],
  );

  return (
    <TransactionContext.Provider value={contextValue}>
      {children}
    </TransactionContext.Provider>
  );
};
