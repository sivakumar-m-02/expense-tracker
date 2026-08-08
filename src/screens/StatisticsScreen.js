import React, {useCallback, useEffect, useMemo, useState} from 'react';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {useNavigation} from '@react-navigation/native';
import HomeScreen from './HomeScreen';
import {useTransactions} from '../context/TransactionContext';

// Statistics deliberately delegates presentation to HomeScreen. This keeps
// the dashboard visuals and calculations in one place while changing only the
// CashBook-scoped data supplied to them.
const StatisticsScreen = () => {
  const navigation = useNavigation();
  const [cashbooks, setCashbooks] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const {
    selectedCashbookId,
    setSelectedCashbookId,
    statisticsCashbookIds,
    statisticsCashbookNames,
    setStatisticsCashbookIds,
    setStatisticsCashbookNames,
    setIsStatisticsSelectionActive,
  } = useTransactions();

  useEffect(() => {
    const user = auth().currentUser;
    if (!user) {
      setCashbooks([]);
      return undefined;
    }

    return firestore()
      .collection('users')
      .doc(user.uid)
      .collection('cashbooks')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snapshot =>
          setCashbooks(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}))),
        error => console.log('StatisticsScreen cashbooks error:', error),
      );
  }, []);

  const cashbookIdsKey = useMemo(
    () => cashbooks.map(cashbook => cashbook.id).join(','),
    [cashbooks],
  );

  useEffect(() => {
    if (selectedCashbookId && !cashbooks.some(cashbook => cashbook.id === selectedCashbookId)) {
      setSelectedCashbookId(null);
    }
  }, [cashbooks, selectedCashbookId, setSelectedCashbookId]);

  // Selecting a single CashBook makes it the report scope.
  useEffect(() => {
    if (!selectedCashbookId) return;
    const selectedCashbook = cashbooks.find(cashbook => cashbook.id === selectedCashbookId);
    setStatisticsCashbookIds([selectedCashbookId]);
    setStatisticsCashbookNames([selectedCashbook?.name || 'CashBook']);
    setIsStatisticsSelectionActive(true);
  }, [
    selectedCashbookId,
    cashbooks,
    setStatisticsCashbookIds,
    setStatisticsCashbookNames,
    setIsStatisticsSelectionActive,
  ]);

  // When no scope has been chosen yet (e.g. first visit), default to all
  // CashBooks. A scope set elsewhere (e.g. multi-select from the CashBook
  // list) is preserved.
  useEffect(() => {
    if (cashbooks.length === 0 || statisticsCashbookIds.length > 0) return;
    setStatisticsCashbookIds(cashbooks.map(cashbook => cashbook.id));
    setStatisticsCashbookNames(['All CashBooks']);
    setIsStatisticsSelectionActive(true);
  }, [
    cashbookIdsKey,
    cashbooks,
    statisticsCashbookIds.length,
    setStatisticsCashbookIds,
    setStatisticsCashbookNames,
    setIsStatisticsSelectionActive,
  ]);

  const scopeKey = useMemo(
    () => statisticsCashbookIds.join(','),
    [statisticsCashbookIds],
  );

  useEffect(() => {
    let cancelled = false;

    const loadTransactions = async () => {
      const user = auth().currentUser;
      if (!user) {
        if (!cancelled) {
          setExpenses([]);
          setIncomes([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const cashbookIds = statisticsCashbookIds;
        const snapshots = await Promise.all(
          cashbookIds.map(id =>
            firestore()
              .collection('users')
              .doc(user.uid)
              .collection('cashbooks')
              .doc(id)
              .collection('transactions')
              .get(),
          ),
        );

        const nextExpenses = [];
        const nextIncomes = [];
        snapshots.forEach(snapshot => {
          snapshot.forEach(doc => {
            const transaction = {id: doc.id, ...doc.data()};
            if (transaction.type === 'income') nextIncomes.push(transaction);
            else nextExpenses.push(transaction);
          });
        });

        if (!cancelled) {
          setExpenses(nextExpenses);
          setIncomes(nextIncomes);
        }
      } catch (error) {
        console.log('StatisticsScreen transactions error:', error);
        if (!cancelled) {
          setExpenses([]);
          setIncomes([]);
        }
      }

      if (!cancelled) setLoading(false);
    };

    loadTransactions();
    return () => {
      cancelled = true;
    };
  }, [scopeKey, statisticsCashbookIds]);

  // Plain list of real CashBooks for the MultiSelect. No synthetic
  // "All"/"multi" entries are needed any more — MultiSelect shows its own
  // selection count, and selecting every CashBook is treated as "All".
  const cashbookOptions = useMemo(
    () => cashbooks.map(cashbook => ({label: cashbook.name || 'Untitled CashBook', value: cashbook.id})),
    [cashbooks],
  );

  // The scope reported back to the rest of the app (Reports, List) always
  // comes from statisticsCashbookIds/-Names, so the MultiSelect's value is
  // just that same array — reusing the existing multi-cashbook report
  // calculations instead of introducing new business logic.
  const selectedCashbookIds = statisticsCashbookIds;

  const handleCashbookChange = useCallback((selectedIds = []) => {
    if (selectedIds.length === 0 || selectedIds.length === cashbooks.length) {
      // Nothing selected, or everything selected — both mean "All CashBooks".
      setSelectedCashbookId(null);
      setStatisticsCashbookIds(cashbooks.map(cashbook => cashbook.id));
      setStatisticsCashbookNames(['All CashBooks']);
      setIsStatisticsSelectionActive(true);
    } else if (selectedIds.length === 1) {
      // Reuse the existing single-CashBook effect above (also keeps budget
      // scoping on Profile in sync, which is keyed off selectedCashbookId).
      setSelectedCashbookId(selectedIds[0]);
    } else {
      setSelectedCashbookId(null);
      const names = cashbooks
        .filter(cashbook => selectedIds.includes(cashbook.id))
        .map(cashbook => cashbook.name || 'Untitled CashBook');
      setStatisticsCashbookIds(selectedIds);
      setStatisticsCashbookNames(names);
      setIsStatisticsSelectionActive(true);
    }
  }, [
    cashbooks,
    setSelectedCashbookId,
    setStatisticsCashbookIds,
    setStatisticsCashbookNames,
    setIsStatisticsSelectionActive,
  ]);

  const handleViewTransactions = useCallback(() => {
    navigation.navigate('ListExpenses', {
      cashbookScope: true,
      cashbookIds: statisticsCashbookIds,
      cashbookNames: statisticsCashbookNames,
    });
  }, [navigation, statisticsCashbookIds, statisticsCashbookNames]);

  return (
    <HomeScreen
      overrideExpenses={expenses}
      overrideIncomes={incomes}
      overrideLoading={loading}
      cashbookOptions={cashbookOptions}
      selectedCashbookIds={selectedCashbookIds}
      selectedCashbookNames={statisticsCashbookNames}
      onCashbookChange={handleCashbookChange}
      onViewTransactions={handleViewTransactions}
      showCashbookSelector
      hideActions={false}
    />
  );
};

export default StatisticsScreen;
