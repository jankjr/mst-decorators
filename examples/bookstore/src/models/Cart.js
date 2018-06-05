import { values, when, reaction } from 'mobx';
import { getSnapshot, applySnapshot } from 'mobx-state-tree';

import {
  model,
  getParent,
  flow,
  view,
  field,
  mutation,
} from '../mst-decorators';
import { Book } from './Books';
import { ShopStore } from './Shop';

@model
export class CartEntry {
  @field(t => t.number)
  quantity = 0;

  @field.nullable(t => t.reference(Book))
  book = null;

  @view(t => t.number)
  get price() {
    return this.book.price * this.quantity;
  }

  @view(t => t.boolean)
  get isValidBook() {
    return this.book.isAvailable;
  }

  @mutation
  increaseQuantity = number => {
    this.quantity += number;
  };

  @mutation
  setQuantity = number => {
    this.quantity = number;
  };
}

@model
export class CartStore {
  @field(t => t.array(CartEntry))
  entries = [];

  @view(t => ShopStore)
  get shop() {
    return getParent(this);
  }

  @view(t => t.number)
  get subTotal() {
    return this.entries.reduce((sum, e) => sum + e.price, 0);
  }

  @view(t => t.boolean)
  get hasDiscount() {
    return this.subTotal >= 100;
  }

  @view(t => t.number)
  get discount() {
    return this.subTotal * (this.hasDiscount ? 0.1 : 0);
  }

  @view(t => t.number)
  get total() {
    return this.subTotal - this.discount;
  }

  @view(t => t.boolean)
  get canCheckout() {
    return (
      this.entries.length > 0 &&
      this.entries.every(entry => entry.quantity > 0 && entry.isValidBook)
    );
  }

  @mutation
  afterAttach = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      when(
        () => !this.shop.isLoading,
        () => {
          this.readFromLocalStorage();
          reaction(
            () => getSnapshot(this),
            json => {
              window.localStorage.setItem('cart', JSON.stringify(json));
            },
          );
        },
      );
    }
  };

  @mutation
  addBook = (book, quantity = 1, notify = true) => {
    let entry = this.entries.find(e => e.book === book);
    if (!entry) {
      this.entries.push({ book });
      entry = this.entries[this.entries.length - 1];
    }
    entry.increaseQuantity(quantity);
    if (notify) this.shop.alert('Added to cart');
  };

  @mutation
  checkout = () => {
    const { total } = this;
    this.clear();
    this.shop.alert(`Bought books for ${total} € !`);
  };

  @mutation
  clear = () => {
    this.entries.clear();
  };

  @mutation
  readFromLocalStorage = () => {
    const cartData = window.localStorage.getItem('cart');
    if (cartData) applySnapshot(this, JSON.parse(cartData));
  };
}
