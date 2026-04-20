import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { RFValue } from 'react-native-responsive-fontsize';
import firestore from '@react-native-firebase/firestore';
import { useTransactions } from '../context/TransactionContext';
import AppPromptModal from '../components/AppPromptModal';
import useAppModal from '../hooks/useAppModal';

const COLOR_OPTIONS = [
  { name: 'Blue', value: '#1976D2' },
  { name: 'Green', value: '#388E3C' },
  { name: 'Slate Gray', value: '#455A64' },
  { name: 'Coral', value: '#FF7043' },
  { name: 'Purple', value: '#8E24AA' },
  { name: 'Teal', value: '#26C6DA' },
  { name: 'Charcoal', value: '#37474F' },
  { name: 'Steel Blue', value: '#4682B4' },
];

const ProfileScreen = () => {
  const user = auth().currentUser;
  const { budget, setBudget, primaryColor, setPrimaryColor } = useTransactions();
  const { showModal, modalProps } = useAppModal();

  const [editMode, setEditMode] = useState(false);
  const [budgetInput, setBudgetInput] = useState(budget ? String(budget) : '');
  const [saving, setSaving] = useState(false);
  const [colorModalVisible, setColorModalVisible] = useState(false);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const handleSaveBudget = async () => {
    if (!user) return;

    const val = Number(budgetInput);
    if (!budgetInput || isNaN(val) || val <= 0) {
      showModal({
        type: 'warning',
        title: 'Invalid Budget',
        message: 'Please enter a valid positive number for your budget.',
      });
      return;
    }

    setSaving(true);
    try {
      await firestore().collection('users').doc(user.uid).set({ budget: val }, { merge: true });
      setBudget(val);
      setEditMode(false);
      showModal({
        type: 'success',
        title: 'Budget Updated',
        message: 'Your monthly budget has been saved.',
      });
    } catch (error) {
      showModal({
        type: 'error',
        title: 'Error',
        message: 'Failed to save budget. Please try again.',
      });
    }
    setSaving(false);
  };

  const handleSelectColor = async (color) => {
    if (!user) return;
    setColorModalVisible(false);

    try {
      await firestore().collection('users').doc(user.uid).set({ primaryColor: color }, { merge: true });
      setPrimaryColor(color);
      showModal({
        type: 'success',
        title: 'Theme Updated',
        message: 'Your theme color has been updated.',
      });
    } catch (error) {
      showModal({
        type: 'error',
        title: 'Error',
        message: 'Failed to save color. Please try again.',
      });
    }
  };

  return (
    <>
      <SafeAreaView style={styles.container} edges={["top", "right", "left"]}>
        <LinearGradient colors={[primaryColor, primaryColor]} style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user?.displayName || user?.email)}</Text>
          </View>
          <Text style={styles.userName}>{user?.displayName || 'No Name'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>
        </LinearGradient>

        <View style={styles.infoCard}>
          <Icon name="person-outline" size={22} color={primaryColor} />
          <Text style={styles.infoText}>{user?.displayName || 'Not set'}</Text>
        </View>

        <View style={styles.infoCard}>
          <Icon name="mail-outline" size={22} color={primaryColor} />
          <Text style={styles.infoText}>{user?.email || 'Not available'}</Text>
        </View>

        <View style={styles.infoCard}>
          <Icon name="wallet-outline" size={22} color={primaryColor} />
          {!editMode ? (
            <View style={styles.budgetRow}>
              <Text style={styles.infoText}>Monthly Budget: \u20B9{budget || 0}</Text>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => {
                  setEditMode(true);
                  setBudgetInput(String(budget || ''));
                }}
              >
                <Icon name="create-outline" size={20} color={primaryColor} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.budgetEditRow}>
              <TextInput
                style={styles.budgetInputInline}
                value={budgetInput}
                onChangeText={setBudgetInput}
                keyboardType="numeric"
                placeholder="Enter budget"
                placeholderTextColor="#999"
              />
              <TouchableOpacity
                style={[styles.iconCircle, { backgroundColor: primaryColor }]}
                onPress={handleSaveBudget}
                disabled={saving}
              >
                <Icon name="checkmark" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconCircle, { backgroundColor: '#E53935' }]}
                onPress={() => setEditMode(false)}
              >
                <Icon name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.infoCard}>
          <Icon name="color-palette-outline" size={22} color={primaryColor} />
          <TouchableOpacity style={styles.colorRow} onPress={() => setColorModalVisible(true)}>
            <Text style={styles.infoText}>Theme Color</Text>
            <View style={[styles.colorPreview, { backgroundColor: primaryColor }]} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: primaryColor }]}
          onPress={() => auth().signOut()}
        >
          <Icon name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <Modal visible={colorModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Choose Theme Color</Text>
              <FlatList
                data={COLOR_OPTIONS}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.colorOption} onPress={() => handleSelectColor(item.value)}>
                    <View style={[styles.colorCircle, { backgroundColor: item.value }]} />
                    <Text style={styles.colorName}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity style={styles.modalClose} onPress={() => setColorModalVisible(false)}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>

      <AppPromptModal {...modalProps} />
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9', alignItems: 'center' },
  header: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
    elevation: 5,
  },
  avatar: {
    backgroundColor: '#fff',
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 4,
  },
  avatarText: {
    fontSize: RFValue(31),
    fontWeight: 'bold',
    color: '#37474F',
  },
  userName: { fontSize: RFValue(21), fontWeight: 'bold', color: '#fff' },
  userEmail: { fontSize: RFValue(15), color: '#fce8d5', marginTop: 4 },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    width: '90%',
    padding: 16,
    borderRadius: 16,
    marginVertical: 8,
    elevation: 3,
  },
  infoText: {
    fontSize: RFValue(15),
    marginLeft: 12,
    color: '#333',
    fontWeight: '500',
  },

  budgetRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    backgroundColor: '#fff',
    borderRadius: 50,
    padding: 8,
    elevation: 3,
  },
  budgetEditRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  budgetInputInline: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: RFValue(14),
    backgroundColor: '#fafafa',
    marginRight: 10,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    marginLeft: 6,
  },

  colorRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  colorPreview: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ddd',
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginTop: 40,
    elevation: 4,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: RFValue(17),
    fontWeight: 'bold',
    marginLeft: 10,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    width: '85%',
    borderRadius: 20,
    padding: 20,
    elevation: 6,
  },
  modalTitle: {
    fontSize: RFValue(17),
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  colorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  colorCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 12,
  },
  colorName: { fontSize: RFValue(14), fontWeight: '500', color: '#333' },
  modalClose: {
    marginTop: 20,
    backgroundColor: '#333',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
});

export default ProfileScreen;
