import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Radius } from '@theme/radius';
import { Spacing } from '@theme/spacing';

interface ScreenErrorBoundaryProps {
  children: React.ReactNode;
  screenName?: string;
}

interface ScreenErrorBoundaryState {
  error: Error | null;
  resetCounter: number;
}

export class ScreenErrorBoundary extends React.Component<
  ScreenErrorBoundaryProps,
  ScreenErrorBoundaryState
> {
  state: ScreenErrorBoundaryState = {
    error: null,
    resetCounter: 0,
  };

  static getDerivedStateFromError(error: Error): ScreenErrorBoundaryState {
    return {
      error,
      resetCounter: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (__DEV__) {
      console.error('[ScreenErrorBoundary] screen crashed:', {
        screenName: this.props.screenName ?? 'Unknown',
        error,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  private handleRetry = () => {
    this.setState(currentState => ({
      error: null,
      resetCounter: currentState.resetCounter + 1,
    }));
  };

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Ionicons name="alert-circle-outline" size={56} color={Colors.error} />
          <Text style={styles.title}>Không thể tải màn hình {this.props.screenName ?? 'này'}</Text>
          <Text style={styles.message}>
            Đã có lỗi xảy ra trong quá trình hiển thị. Vui lòng thử lại.
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry} activeOpacity={0.85}>
            <Text style={styles.buttonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return <React.Fragment key={this.state.resetCounter}>{this.props.children}</React.Fragment>;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[6],
    backgroundColor: Colors.background,
  },
  title: {
    marginTop: Spacing[4],
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  message: {
    marginTop: Spacing[2],
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  button: {
    marginTop: Spacing[5],
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  buttonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.onPrimary,
  },
});
