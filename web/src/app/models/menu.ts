export interface Category {
  id: number;
  name: string;
}

export interface MenuProduct {
  id: string;
  categoryId: number;
  name: string;
  description: string;
  price: number;
  available: boolean;
}

export interface Menu {
  categories: Category[];
  items: MenuProduct[];
}