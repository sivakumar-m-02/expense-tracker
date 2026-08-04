import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { RFValue } from 'react-native-responsive-fontsize';

// Lightweight, reusable tag input used by both Cash In and Cash Out forms.
// Caps the number of tags at `maxTags` (default 2) and matches the existing
// pill/chip styling already used across the app.
const TagInput = ({ tags = [], onChange, accentColor = '#00C9A7', maxTags = 2, placeholder = 'Add a tag' }) => {
  const [text, setText] = useState('');
  const atLimit = tags.length >= maxTags;

  const addTag = () => {
    const trimmed = text.trim();
    if (!trimmed || atLimit) return;
    if (tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) { setText(''); return; }
    onChange([...tags, trimmed]);
    setText('');
  };

  const removeTag = (tag) => {
    onChange(tags.filter((t) => t !== tag));
  };

  return (
    <View>
      {tags.length > 0 && (
        <View style={styles.chipRow}>
          {tags.map((tag) => (
            <View key={tag} style={[styles.chip, { borderColor: `${accentColor}40`, backgroundColor: `${accentColor}14` }]}>
              <Text style={[styles.chipText, { color: accentColor }]} numberOfLines={1}>{tag}</Text>
              <TouchableOpacity onPress={() => removeTag(tag)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Icon name="close" size={12} color={accentColor} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {!atLimit && (
        <View style={[styles.inputRow, { borderColor: 'rgba(255,255,255,0.1)' }]}>
          <Icon name="pricetag-outline" size={16} color="rgba(255,255,255,0.35)" style={{ marginRight: 8 }} />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={`${placeholder} (${tags.length}/${maxTags})`}
            placeholderTextColor="rgba(255,255,255,0.28)"
            style={styles.input}
            onSubmitEditing={addTag}
            returnKeyType="done"
          />
          {text.trim().length > 0 && (
            <TouchableOpacity onPress={addTag} style={[styles.addBtn, { backgroundColor: `${accentColor}22` }]}>
              <Icon name="add" size={16} color={accentColor} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

export default TagInput;

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12,
    borderWidth: 1, maxWidth: '100%',
  },
  chipText: { fontSize: RFValue(12), fontWeight: '700', maxWidth: 160 },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 11,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  input: { flex: 1, fontSize: RFValue(13), color: '#fff', padding: 0 },
  addBtn: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
});