import { Repository } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { MenuService } from './menu.service';
import { Category } from '../../entities/category.entity';
import { Product } from '../../entities/product.entity';

function makeService(categories: Category[], products: Product[]): MenuService {
  const categoriesRepository = {
    find: vi.fn().mockResolvedValue(categories),
  } as unknown as Repository<Category>;
  const productsRepository = {
    find: vi.fn().mockResolvedValue(products),
  } as unknown as Repository<Product>;
  return new MenuService(categoriesRepository, productsRepository);
}

describe('MenuService', () => {
  it('returns categories and items with numeric prices', async () => {
    const service = makeService(
      [{ id: 1, name: 'Bebidas', sortOrder: 1 }],
      [
        {
          id: 'cola-500ml',
          categoryId: 1,
          name: 'Cola',
          description: '',
          price: '7.50',
          available: true,
          sortOrder: 1,
        } as Product,
      ],
    );

    const menu = await service.getMenu();

    expect(menu.categories).toEqual([{ id: 1, name: 'Bebidas' }]);
    expect(menu.items).toEqual([
      {
        id: 'cola-500ml',
        categoryId: 1,
        name: 'Cola',
        description: '',
        price: 7.5,
        available: true,
      },
    ]);
  });

  it('treats available as boolean or 1/0', async () => {
    const service = makeService([], [
      { id: 'p1', categoryId: 1, name: 'A', description: '', price: '1.00', available: 1, sortOrder: 1 } as Product,
      { id: 'p2', categoryId: 1, name: 'B', description: '', price: '2.00', available: 0, sortOrder: 2 } as Product,
    ]);

    const menu = await service.getMenu();

    expect(menu.items[0].available).toBe(true);
    expect(menu.items[1].available).toBe(false);
  });

  it('returns empty menu when there are no products', async () => {
    const service = makeService([], []);
    const menu = await service.getMenu();

    expect(menu.categories).toEqual([]);
    expect(menu.items).toEqual([]);
  });
});
