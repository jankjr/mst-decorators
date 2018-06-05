import { getEnv, getSnapshot, applySnapshot } from 'mobx-state-tree';
import { values, when, reaction } from 'mobx';

import {
  model,
  getParent,
  flow,
  view,
  field,
  mutation,
} from '../mst-decorators';

import { ShopStore } from './Shop';

@model
export class Book {
  @field.nullable(t => t.identifier())
  id;

  @field(t => t.string)
  name = '';

  @field(t => t.string)
  author = '';

  @field(t => t.number)
  price = 0;

  @field(t => t.boolean)
  isAvailable = true;
}

function sortBooks(books) {
  return books.filter(b => b.isAvailable).sort((a, b) => {
    if (a.name > b.name) return 1;
    if (a.name === b.name) return 0;
    return -1;
  });
}

@model
export class BookStore {
  @field(t => t.map(Book))
  books = {};

  @field(t => t.boolean)
  isLoading = true;

  @view(t => ShopStore)
  get shop() {
    return getParent(this);
  }

  @view(t => t.array(Book))
  get sortedAvailableBooks() {
    return sortBooks(values(this.books));
  }

  @mutation
  markLoading = isLoading => {
    this.isLoading = isLoading;
  };

  @mutation
  updateBooks = json => {
    values(this.books).forEach(book => {
      book.isAvailable = false;
    });

    json.forEach(bookJson => {
      this.books.put(bookJson);
      this.books.get(bookJson.id).isAvailable = true;
    });
  };

  @mutation
  loadBooks = flow(function* loadBooks() {
    try {
      const json = yield this.shop.fetch('/books.json');
      this.updateBooks(json);
      this.markLoading(false);
    } catch (err) {
      console.error('Failed to load books ', err);
    }
  });
}
