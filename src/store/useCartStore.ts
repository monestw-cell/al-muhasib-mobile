import { create } from 'zustand';
import { Product } from '../services/products.service';
import { CartItem } from '../services/sales.service';
import { Customer } from '../services/customers.service';

interface CartState {
  items: CartItem[];
  customer: Customer | null;
  discountCents: number;
  
  addItem: (product: Product) => boolean;
  removeItem: (productId: number) => void;
  decreaseItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number, maxStock?: number) => boolean;
  setDiscount: (cents: number) => void;
  setCustomer: (customer: Customer | null) => void;
  clearCart: () => void;

  getSubtotal: () => number;
  getTotal: () => number;
  getItemsCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customer: {
    id: 1,
    name: 'عميل نقدي (افتراضي)',
    credit_limit_cents: 0,
    current_balance_cents: 0,
    active: 1,
  },
  discountCents: 0,

  addItem: (product) => {
    if (product.stock_quantity <= 0) {
      return false;
    }
    const current = get().items.find(i => i.product_id === product.id);
    if (current && current.quantity >= product.stock_quantity) {
      return false;
    }

    set(state => {
      const existing = state.items.find(i => i.product_id === product.id);
      if (existing) {
        return {
          items: state.items.map(i =>
            i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return {
        items: [
          ...state.items,
          {
            product_id: product.id,
            barcode: product.barcode,
            name: product.name,
            unit_price_cents: product.sale_price_cents,
            quantity: 1,
            discount_cents: 0,
          },
        ],
      };
    });
    return true;
  },

  removeItem: (productId) => {
    set(state => ({
      items: state.items.filter(i => i.product_id !== productId),
    }));
  },

  decreaseItem: (productId) => {
    set(state => {
      const existing = state.items.find(i => i.product_id === productId);
      if (existing && existing.quantity > 1) {
        return {
          items: state.items.map(i =>
            i.product_id === productId ? { ...i, quantity: i.quantity - 1 } : i
          ),
        };
      }
      return {
        items: state.items.filter(i => i.product_id !== productId),
      };
    });
  },

  updateQuantity: (productId, quantity, maxStock) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return true;
    }
    if (maxStock !== undefined && quantity > maxStock) {
      return false;
    }
    set(state => ({
      items: state.items.map(i =>
        i.product_id === productId ? { ...i, quantity } : i
      ),
    }));
    return true;
  },

  setDiscount: (cents) => set({ discountCents: cents }),
  setCustomer: (customer) => set({ customer }),
  
  clearCart: () => set({
    items: [],
    discountCents: 0,
  }),

  getSubtotal: () => {
    return get().items.reduce((sum, item) => sum + (item.unit_price_cents * item.quantity), 0);
  },

  getTotal: () => {
    const subtotal = get().getSubtotal();
    return Math.max(0, subtotal - get().discountCents);
  },

  getItemsCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },
}));
