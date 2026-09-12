import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../../entities/category.entity';
import { Product } from '../../entities/product.entity';

export interface MenuProduct {
  id: string;
  categoryId: number;
  name: string;
  description: string;
  price: number;
  available: boolean;
}

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async getMenu() {
    const [categories, products] = await Promise.all([
      this.categoriesRepository.find({ order: { sortOrder: 'ASC' } }),
      this.productsRepository.find({ order: { sortOrder: 'ASC' } }),
    ]);

    const items: MenuProduct[] = products.map((product) => ({
      id: product.id,
      categoryId: product.categoryId,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      available: product.available === true || product.available === 1,
    }));

    this.logger.log(`Menu served with ${items.length} products`);
    return {
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
      })),
      items,
    };
  }
}