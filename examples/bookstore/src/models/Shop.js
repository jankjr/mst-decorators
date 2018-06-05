import {
  model,
  getParent,
  flow,
  view,
  field,
  mutation,
} from '../mst-decorators';
import { getEnv, getSnapshot, applySnapshot } from 'mobx-state-tree';
import { values, when, reaction } from 'mobx';

import { BookStore, Book } from './Books';
import { CartStore } from './Cart';

@model
export class ShopStore {
  @field(() => BookStore)
  bookStore = {};

  @field(() => CartStore)
  cart = { entries: [] };

  @view
  get fetch() {
    return getEnv(this).fetch;
  }
  @view
  get alert() {
    return getEnv(this).alert;
  }
  @view(t => t.boolean)
  get isLoading() {
    return this.bookStore.isLoading;
  }

  @view(t => t.array(Book))
  get books() {
    return this.bookStore.books;
  }

  @view(t => t.array(Book))
  get sortedAvailableBooks() {
    return this.bookStore.sortedAvailableBooks;
  }

  @mutation
  afterCreate = () => {
    this.bookStore.loadBooks();
  };
}
