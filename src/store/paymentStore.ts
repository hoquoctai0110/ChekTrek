import { create } from 'zustand';
import { PaymentMethodType, PaymentTransaction } from '@/types';

interface PaymentState {
  selectedMethod: PaymentMethodType | null;
  transactions: PaymentTransaction[];
  isLoading: boolean;

  setSelectedMethod: (method: PaymentMethodType) => void;
  addTransaction: (tx: PaymentTransaction) => void;
  clearMethod: () => void;
}

export const usePaymentStore = create<PaymentState>(set => ({
  selectedMethod: null,
  transactions: [],
  isLoading: false,

  setSelectedMethod: method => set({ selectedMethod: method }),

  addTransaction: tx =>
    set(state => ({ transactions: [tx, ...state.transactions] })),

  clearMethod: () => set({ selectedMethod: null }),
}));

