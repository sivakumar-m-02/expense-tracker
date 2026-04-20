import React, { createContext, useContext, useEffect, useState } from "react";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

const TransactionContext = createContext();

export const useTransactions = () => useContext(TransactionContext);


export const TransactionProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [error, setError] = useState(null);
  const [budget, setBudget] = useState(0);
  const [primaryColor, setPrimaryColor] = useState("#37474F");
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  useEffect(() => {
    let unsubProfile = null;
    let unsubA = null;
    let unsubB = null;
    let firstLoadA = true;
    let firstLoadB = true;

    const unsubscribeAuth = auth().onAuthStateChanged((user) => {
      // Clean up previous listeners
      unsubA?.();
      unsubB?.();
      unsubProfile?.();

      if (!user) {
        setExpenses([]);
        setIncomes([]);
        setBudget(0);
        setPrimaryColor("#37474F");
        setLoading(false);
        return;
      }

      setError(null);
      setLoading(true);

      // Fetch budget from user profile
      const userRef = firestore().collection("users").doc(user.uid);
      unsubProfile = userRef.onSnapshot(
        (doc) => {
          const data = doc.data();
          setBudget(data?.budget ?? 0);
          setPrimaryColor(data?.primaryColor ?? "#37474F");
        },
        (e) => {
          setError("Failed to load profile. Please try again later.");
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
          setExpenses(list);
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
    });

    return () => {
      unsubA?.();
      unsubB?.();
      unsubProfile?.();
      unsubscribeAuth?.();
    };
  }, []);

  // Manual refresh function
  const refreshTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = auth().currentUser;
      if (!user) {
        setExpenses([]);
        setIncomes([]);
        setLoading(false);
        return;
      }
      const userRef = firestore().collection("users").doc(user.uid);
      // Expenses
      const expensesSnap = await userRef.collection("expenses").orderBy("date", "desc").get();
      const expensesList = expensesSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: "expense" }));
      setExpenses(expensesList);
      // Income
      const incomeSnap = await userRef.collection("income").orderBy("date", "desc").get();
      const incomeList = incomeSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: "income" }));
      setIncomes(incomeList);
    } catch (e) {
      setError("Failed to refresh transactions. Please try again later.");
      console.log("TransactionContext manual refresh error:", e);
    }
    setLoading(false);
  };

  return (
  <TransactionContext.Provider value={{ expenses, incomes, loading, error, budget, setBudget, primaryColor, setPrimaryColor, selectedMonth, setSelectedMonth, selectedYear, setSelectedYear, refreshTransactions }}>
      {children}
    </TransactionContext.Provider>
  );
};
