import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {useNavigation} from '@react-navigation/native';
import HomeScreen from './HomeScreen';
import {useTransactions} from '../context/TransactionContext';

const StatisticsScreen = () => {
  const navigation = useNavigation();
  const [cashbooks, setCashbooks] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);
  const {
    statisticsCashbookIds,
    statisticsCashbookNames,
    setStatisticsCashbookIds,
    setStatisticsCashbookNames,
    setIsStatisticsSelectionActive,
    setSelectedCashbookId,
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
    if (statisticsCashbookIds.length === 0) return;
    const validIds = new Set(cashbooks.map(cashbook => cashbook.id));
    const nextIds = statisticsCashbookIds.filter(id => validIds.has(id));
    if (nextIds.length !== statisticsCashbookIds.length) {
      setStatisticsCashbookIds(nextIds.length > 0 ? nextIds : cashbooks.map(c => c.id));
    }
  }, [cashbooks, cashbookIdsKey, statisticsCashbookIds, setStatisticsCashbookIds]);

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
    if (statisticsCashbookIds.length === 0) return undefined;

    const user = auth().currentUser;
    if (!user) {
      setExpenses([]);
      setIncomes([]);
      setLoading(false);
      return undefined;
    }

    if (!initialLoadDone.current) {
      setLoading(true);
    }

    let cancelled = false;
    const txByCashbook = new Map();

    const publishMerged = () => {
      const nextExpenses = [];
      const nextIncomes = [];
      txByCashbook.forEach((snapshot) => {
        snapshot.forEach((doc) => {
          const transaction = {id: doc.id, ...doc.data()};
          if (transaction.type === 'income') nextIncomes.push(transaction);
          else nextExpenses.push(transaction);
        });
      });
      if (!cancelled) {
        setExpenses(nextExpenses);
        setIncomes(nextIncomes);
        initialLoadDone.current = true;
        setLoading(false);
      }
    };

    const unsubs = statisticsCashbookIds.map((id) =>
      firestore()
        .collection('users')
        .doc(user.uid)
        .collection('cashbooks')
        .doc(id)
        .collection('transactions')
        .onSnapshot(
          (snapshot) => {
            txByCashbook.set(id, snapshot);
            publishMerged();
          },
          (error) => console.log('StatisticsScreen transactions error:', error),
        ),
    );

    return () => {
      cancelled = true;
      unsubs.forEach((unsub) => unsub());
    };
  }, [scopeKey, statisticsCashbookIds]);

  const cashbookMultiSelectData = useMemo(
    () => cashbooks.map(cashbook => ({
      label: cashbook.name || 'Untitled CashBook',
      value: cashbook.id,
    })),
    [cashbooks],
  );

  const selectedCashbookIds = useMemo(() => {
    if (statisticsCashbookIds.length > 0) return statisticsCashbookIds;
    return cashbooks.map(cashbook => cashbook.id);
  }, [statisticsCashbookIds, cashbooks]);

  const handleCashbookMultiChange = useCallback((ids) => {
    const allIds = cashbooks.map(cashbook => cashbook.id);
    const isAll = ids.length === allIds.length && allIds.every(id => ids.includes(id));

    setSelectedCashbookId(ids.length === 1 ? ids[0] : null);
    setStatisticsCashbookIds(ids);
    if (isAll) {
      setStatisticsCashbookNames(['All CashBooks']);
    } else {
      setStatisticsCashbookNames(
        cashbooks.filter(cashbook => ids.includes(cashbook.id)).map(cashbook => cashbook.name || 'CashBook'),
      );
    }
    setIsStatisticsSelectionActive(true);
  }, [
    cashbooks,
    setIsStatisticsSelectionActive,
    setSelectedCashbookId,
    setStatisticsCashbookIds,
    setStatisticsCashbookNames,
  ]);

  const handleViewTransactions = useCallback(() => {
    navigation.navigate('ListExpenses', {
      cashbookScope: true,
      cashbookIds: statisticsCashbookIds,
      cashbookNames: statisticsCashbookNames,
    });
  }, [navigation, statisticsCashbookIds, statisticsCashbookNames]);

  const handleDateRangeNavigate = useCallback((startDate, endDate) => {
    navigation.navigate('ListExpenses', {
      cashbookScope: true,
      cashbookIds: statisticsCashbookIds,
      cashbookNames: statisticsCashbookNames,
      dateRangeStart: startDate,
      dateRangeEnd: endDate,
    });
  }, [navigation, statisticsCashbookIds, statisticsCashbookNames]);

  return (
    <HomeScreen
      overrideExpenses={expenses}
      overrideIncomes={incomes}
      overrideLoading={loading}
      cashbookMultiSelectData={cashbookMultiSelectData}
      selectedCashbookIds={selectedCashbookIds}
      onCashbookMultiChange={handleCashbookMultiChange}
      onViewTransactions={handleViewTransactions}
      onDateRangeNavigate={handleDateRangeNavigate}
      showCashbookSelector
      hideActions={false}
    />
  );
};

export default StatisticsScreen;
