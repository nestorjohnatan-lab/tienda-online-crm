import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import type { StoreProductSummary } from '../api/contracts';

export interface CartLine {
  readonly product: StoreProductSummary;
  readonly quantity: number;
  readonly selected: boolean;
}

interface CartState {
  readonly lines: readonly CartLine[];
  readonly saved: readonly StoreProductSummary[];
}

type Action =
  | { type: 'add'; product: StoreProductSummary }
  | { type: 'setQty'; productId: number; quantity: number }
  | { type: 'remove'; productId: number }
  | { type: 'toggleSelect'; productId: number }
  | { type: 'toggleAll'; selected: boolean }
  | { type: 'saveForLater'; productId: number }
  | { type: 'moveToCart'; productId: number }
  | { type: 'removeSaved'; productId: number }
  | { type: 'clearSelected' };

const STORAGE_KEY = 'autofrio_cart_v2';
export const FREE_SHIPPING_THRESHOLD = 150;

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case 'add': {
      const existing = state.lines.find((l) => l.product.product_id === action.product.product_id);
      const lines = existing
        ? state.lines.map((l) =>
            l === existing && l.quantity < action.product.stock_quantity
              ? { ...l, quantity: l.quantity + 1, selected: true }
              : l,
          )
        : [...state.lines, { product: action.product, quantity: 1, selected: true }];
      return {
        lines,
        saved: state.saved.filter((p) => p.product_id !== action.product.product_id),
      };
    }
    case 'setQty': {
      if (action.quantity <= 0) {
        return { ...state, lines: state.lines.filter((l) => l.product.product_id !== action.productId) };
      }
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.product.product_id === action.productId
            ? { ...l, quantity: Math.min(action.quantity, Math.max(1, l.product.stock_quantity)) }
            : l,
        ),
      };
    }
    case 'remove':
      return { ...state, lines: state.lines.filter((l) => l.product.product_id !== action.productId) };
    case 'toggleSelect':
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.product.product_id === action.productId ? { ...l, selected: !l.selected } : l,
        ),
      };
    case 'toggleAll':
      return {
        ...state,
        lines: state.lines.map((l) => ({ ...l, selected: action.selected })),
      };
    case 'saveForLater': {
      const line = state.lines.find((l) => l.product.product_id === action.productId);
      if (!line) return state;
      const alreadySaved = state.saved.some((p) => p.product_id === action.productId);
      return {
        lines: state.lines.filter((l) => l.product.product_id !== action.productId),
        saved: alreadySaved ? state.saved : [line.product, ...state.saved],
      };
    }
    case 'moveToCart': {
      const prod = state.saved.find((p) => p.product_id === action.productId);
      if (!prod) return state;
      const existing = state.lines.find((l) => l.product.product_id === action.productId);
      return {
        lines: existing
          ? state.lines.map((l) => (l === existing ? { ...l, selected: true } : l))
          : [...state.lines, { product: prod, quantity: 1, selected: true }],
        saved: state.saved.filter((p) => p.product_id !== action.productId),
      };
    }
    case 'removeSaved':
      return { ...state, saved: state.saved.filter((p) => p.product_id !== action.productId) };
    case 'clearSelected':
      return { ...state, lines: state.lines.filter((l) => !l.selected) };
  }
}

function load(): CartState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { lines: [], saved: [] };
    const parsed = JSON.parse(raw) as Partial<CartState>;
    return {
      lines: Array.isArray(parsed.lines) ? parsed.lines : [],
      saved: Array.isArray(parsed.saved) ? parsed.saved : [],
    };
  } catch {
    return { lines: [], saved: [] };
  }
}

interface CartContextValue {
  readonly lines: readonly CartLine[];
  readonly saved: readonly StoreProductSummary[];
  readonly selectedLines: readonly CartLine[];
  readonly count: number;
  readonly selectedCount: number;
  readonly total: number;
  readonly selectedTotal: number;
  readonly allSelected: boolean;
  readonly open: boolean;
  setOpen(open: boolean): void;
  add(product: StoreProductSummary): void;
  setQty(productId: number, quantity: number): void;
  remove(productId: number): void;
  toggleSelect(productId: number): void;
  toggleAll(selected: boolean): void;
  saveForLater(productId: number): void;
  moveToCart(productId: number): void;
  removeSaved(productId: number): void;
  clearSelected(): void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo<CartContextValue>(() => {
    const selectedLines = state.lines.filter((l) => l.selected);
    const count = state.lines.reduce((s, l) => s + l.quantity, 0);
    const selectedCount = selectedLines.reduce((s, l) => s + l.quantity, 0);
    const total = state.lines.reduce((s, l) => s + l.quantity * l.product.price, 0);
    const selectedTotal = selectedLines.reduce((s, l) => s + l.quantity * l.product.price, 0);
    const allSelected = state.lines.length > 0 && selectedLines.length === state.lines.length;

    return {
      lines: state.lines,
      saved: state.saved,
      selectedLines,
      count,
      selectedCount,
      total,
      selectedTotal,
      allSelected,
      open,
      setOpen,
      add: (product) => {
        dispatch({ type: 'add', product });
        setOpen(true);
      },
      setQty: (productId, quantity) => dispatch({ type: 'setQty', productId, quantity }),
      remove: (productId) => dispatch({ type: 'remove', productId }),
      toggleSelect: (productId) => dispatch({ type: 'toggleSelect', productId }),
      toggleAll: (selected) => dispatch({ type: 'toggleAll', selected }),
      saveForLater: (productId) => dispatch({ type: 'saveForLater', productId }),
      moveToCart: (productId) => dispatch({ type: 'moveToCart', productId }),
      removeSaved: (productId) => dispatch({ type: 'removeSaved', productId }),
      clearSelected: () => dispatch({ type: 'clearSelected' }),
    };
  }, [state, open]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
  return ctx;
}
