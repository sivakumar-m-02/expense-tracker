import React, {useEffect, useMemo, useState} from 'react';
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
  const [selectedCashbookId, setSelectedCashbookId] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const {
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
  }, [cashbooks, selectedCashbookId]);

  useEffect(() => {
    const selectedCashbook = cashbooks.find(cashbook => cashbook.id === selectedCashbookId);
    setStatisticsCashbookIds(selectedCashbookId ? [selectedCashbookId] : cashbooks.map(cashbook => cashbook.id));
    setStatisticsCashbookNames(selectedCashbook ? [selectedCashbook.name] : ['All CashBooks']);
    setIsStatisticsSelectionActive(true);
  }, [
    cashbookIdsKey,
    cashbooks,
    selectedCashbookId,
    setIsStatisticsSelectionActive,
    setStatisticsCashbookIds,
    setStatisticsCashbookNames,
  ]);

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
        const cashbookIds = selectedCashbookId
          ? [selectedCashbookId]
          : cashbooks.map(cashbook => cashbook.id);
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
  }, [cashbookIdsKey, cashbooks, selectedCashbookId]);

  const cashbookOptions = useMemo(
    () => [
      {label: 'All CashBooks', value: 'all'},
      ...cashbooks.map(cashbook => ({
        label: cashbook.name || 'Untitled CashBook',
        value: cashbook.id,
      })),
    ],
    [cashbooks],
  );

  return (
    <HomeScreen
      overrideExpenses={expenses}
      overrideIncomes={incomes}
      overrideLoading={loading}
      cashbookOptions={cashbookOptions}
      selectedCashbookId={selectedCashbookId}
      onCashbookChange={id => setSelectedCashbookId(id === 'all' ? null : id)}
      onManageCashbooks={() => navigation.navigate('CashBooks')}
      onViewTransactions={() =>
        navigation.navigate('ListExpenses', {
          cashbookScope: true,
          cashbookIds: selectedCashbookId ? [selectedCashbookId] : cashbooks.map(cashbook => cashbook.id),
          cashbookNames: selectedCashbookId
            ? [cashbooks.find(cashbook => cashbook.id === selectedCashbookId)?.name || 'CashBook']
            : ['All CashBooks'],
        })
      }
      showCashbookSelector
      hideActions={false}
    />
  );
};

export default StatisticsScreen;
