import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';

interface AuthInputProps extends TextInputProps {
  label: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const AuthInput = React.forwardRef<TextInput, AuthInputProps>(
  ({ label, error, leftIcon, rightIcon, style, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    return (
      <View style={styles.wrapper}>
        <Text style={styles.label}>{label}</Text>
        <View
          style={[
            styles.inputContainer,
            isFocused && styles.inputContainerFocused,
            !!error && styles.inputContainerError,
          ]}
        >
          {leftIcon && <View style={styles.leftIconWrapper}>{leftIcon}</View>}
          <TextInput
            ref={ref}
            style={[styles.input, leftIcon ? styles.inputWithLeft : null, rightIcon ? styles.inputWithRight : null, style]}
            placeholderTextColor={Colors.onSurfaceVariant}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />
          {rightIcon && <View style={styles.rightIconWrapper}>{rightIcon}</View>}
        </View>
        {!!error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }
);

AuthInput.displayName = 'AuthInput';

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing[1],
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.onSurface,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    minHeight: 52,
  },
  inputContainerFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceContainerLow,
  },
  inputContainerError: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.onSurface,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  inputWithLeft: {
    paddingLeft: Spacing[2],
  },
  inputWithRight: {
    paddingRight: Spacing[2],
  },
  leftIconWrapper: {
    paddingLeft: Spacing[3],
  },
  rightIconWrapper: {
    paddingRight: Spacing[3],
  },
  errorText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.error,
    marginTop: 2,
  },
});
