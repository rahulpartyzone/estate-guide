import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NewsCreateDto, NewsUpdateDto } from './dtos';

@Injectable()
export class NewsService {
  constructor(private readonly prisma: PrismaService) {}

  private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async makeUniqueSlug(title: string, excludeId?: string) {
    const base = this.slugify(title) || `news-${Date.now()}`;
    let candidate = base;
    let i = 1;
    while (true) {
      const found = await this.prisma.newsArticle.findUnique({ where: { slug: candidate } });
      if (!found || (excludeId && found.id === excludeId)) return candidate;
      i += 1;
      candidate = `${base}-${i}`;
    }
  }

  listPublic() {
    return this.prisma.newsArticle.findMany({
      where: { published: true },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getPublicBySlug(slug: string) {
    const article = await this.prisma.newsArticle.findFirst({ where: { slug, published: true } });
    if (!article) throw new NotFoundException('News article not found');
    return article;
  }

  listAdmin() {
    return this.prisma.newsArticle.findMany({
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(dto: NewsCreateDto) {
    const slug = await this.makeUniqueSlug(dto.title);
    return this.prisma.newsArticle.create({
      data: {
        title: dto.title.trim(),
        slug,
        excerpt: dto.excerpt.trim(),
        content: dto.content.trim(),
        imageUrl: dto.imageUrl?.trim() || null,
        category: dto.category?.trim() || null,
        authorName: dto.authorName?.trim() || null,
        sourceUrl: dto.sourceUrl?.trim() || null,
        tags: (dto.tags || []).map((t) => t.trim()).filter(Boolean),
        published: dto.published ?? false,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : (dto.published ? new Date() : null),
        seoTitle: dto.seoTitle?.trim() || null,
        seoDescription: dto.seoDescription?.trim() || null,
      },
    });
  }

  async update(id: string, dto: NewsUpdateDto) {
    const existing = await this.prisma.newsArticle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('News article not found');
    const slug = dto.title?.trim() && dto.title.trim() !== existing.title ? await this.makeUniqueSlug(dto.title, id) : existing.slug;

    return this.prisma.newsArticle.update({
      where: { id },
      data: {
        title: dto.title.trim(),
        slug,
        excerpt: dto.excerpt.trim(),
        content: dto.content.trim(),
        imageUrl: dto.imageUrl?.trim() || null,
        category: dto.category?.trim() || null,
        authorName: dto.authorName?.trim() || null,
        sourceUrl: dto.sourceUrl?.trim() || null,
        tags: (dto.tags || []).map((t) => t.trim()).filter(Boolean),
        published: dto.published ?? existing.published,
        publishedAt: dto.publishedAt
          ? new Date(dto.publishedAt)
          : ((dto.published ?? existing.published) && !existing.publishedAt ? new Date() : existing.publishedAt),
        seoTitle: dto.seoTitle?.trim() || null,
        seoDescription: dto.seoDescription?.trim() || null,
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.newsArticle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('News article not found');
    await this.prisma.newsArticle.delete({ where: { id } });
  }

  async publish(id: string, published: boolean) {
    const existing = await this.prisma.newsArticle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('News article not found');
    return this.prisma.newsArticle.update({
      where: { id },
      data: {
        published,
        publishedAt: published ? (existing.publishedAt || new Date()) : existing.publishedAt,
      },
    });
  }
}
