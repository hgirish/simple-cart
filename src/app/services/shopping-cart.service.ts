import { Injectable } from '@angular/core';
import { Product } from '../models/product.model';
import { ShoppingCart } from '../models/shopping-cart.model';
import { CartItem } from '../models/cart-item.model';
import { DeliveryOption } from '../models/delivery-option.model';
import { Observer } from 'rxjs/Observer';
import { StorageService } from './storage.service';
import { ProductsService } from './products.service';

const CART_KEY = 'cart';

@Injectable()
export class ShoppingCartService {
  private storage: Storage;
  private products: Product[];
  private deliveryOptions: DeliveryOption[];
  private subscribers: Array<Observer<ShoppingCart>> = new Array<
    Observer<ShoppingCart>
  >();

  constructor(
    private storageService: StorageService,
    private productsService: ProductsService
  ) {
    this.storage = this.storageService.get();
    this.productsService
      .all()
      .subscribe(products => (this.products = products));
  }

  public addItem(product: Product, quantity: number): void {
    const cart = this.retrieve();
    let item = cart.items.find(p => p.productId === product.id);
    if (item === undefined) {
      item = new CartItem();
      item.productId = product.id;
      cart.items.push(item);
    }

    item.quantity += quantity;
    cart.items = cart.items.filter(cartItem => cartItem.quantity > 0);
    if (cart.items.length === 0) {
      cart.deliveryOptionId = undefined;
    }

    this.calculateCart(cart);
    this.save(cart);
    this.dispatch(cart);
  }

  private save(cart: ShoppingCart): void {
    this.storage.setItem(CART_KEY, JSON.stringify(cart));
  }

  private dispatch(cart: ShoppingCart): void {
    this.subscribers.forEach(sub => {
      try {
        sub.next(cart);
      } catch (e) {
        console.error(e);
        // we want all subscribers to get the update even if one errors.
      }
    });
  }

  private calculateCart(cart: ShoppingCart): void {
    cart.itemsTotal = cart.items
      .map(
        item =>
          item.quantity * this.products.find(p => p.id === item.productId).price
      )
      .reduce((prev, current) => prev + current, 0);

    cart.deliveryTotal = cart.deliveryOptionId
      ? this.deliveryOptions.find(x => x.id === cart.deliveryOptionId).price
      : 0;

    cart.grossTotal = cart.itemsTotal + cart.deliveryTotal;
  }

  private retrieve(): ShoppingCart {
    console.log(`retrieve is called `);
    const cart = new ShoppingCart();
    const storedCart = this.storage.getItem(CART_KEY);
    if (storedCart) {
      cart.updateFrom(JSON.parse(storedCart));
    }
    return cart;
  }
}
