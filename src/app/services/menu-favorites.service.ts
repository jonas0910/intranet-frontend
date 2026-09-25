import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface FavoriteMenu {
  route: string;
  nombre: string;
  icon: string;
  moduleId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class MenuFavoritesService {
  private favoritesKey = 'menu_favorites';
  private favoritesSubject = new BehaviorSubject<FavoriteMenu[]>([]);
  public favorites$ = this.favoritesSubject.asObservable();

  constructor() {
    this.loadFavorites();
  }

  private loadFavorites(): void {
    const stored = localStorage.getItem(this.favoritesKey);
    if (stored) {
      try {
        const favorites = JSON.parse(stored);
        this.favoritesSubject.next(favorites);
      } catch (error) {
        console.error('Error cargando favoritos:', error);
        this.favoritesSubject.next([]);
      }
    }
  }

  getFavorites(): FavoriteMenu[] {
    return this.favoritesSubject.value;
  }

  toggleFavorite(menu: FavoriteMenu): void {
    const favorites = this.getFavorites();
    const index = favorites.findIndex(f => f.route === menu.route);
    
    if (index > -1) {
      // Remover de favoritos
      favorites.splice(index, 1);
    } else {
      // Agregar a favoritos
      favorites.push(menu);
    }
    
    localStorage.setItem(this.favoritesKey, JSON.stringify(favorites));
    this.favoritesSubject.next(favorites);
  }

  isFavorite(route: string): boolean {
    return this.getFavorites().some(f => f.route === route);
  }

  clearFavorites(): void {
    localStorage.removeItem(this.favoritesKey);
    this.favoritesSubject.next([]);
  }
}



