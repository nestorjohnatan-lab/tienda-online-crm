import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../shared/domain/app-error.js';
import { env } from '../../../shared/infrastructure/config/env.js';
import type { AuthRepositoryPort } from '../../auth/domain/auth.repository.js';
import type { MarketplaceRepositoryPort } from '../domain/marketplace.repository.js';

const ALLOWED_IMAGE_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
};

const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

export class MarketplaceService {
  constructor(
    private readonly repo: MarketplaceRepositoryPort,
    private readonly authRepo: AuthRepositoryPort,
  ) {}

  listPublicStores() {
    return this.repo.listPublicStores();
  }

  async getPublicStoreBySlug(slug: string) {
    const store = await this.repo.getPublicStoreBySlug(slug);
    if (!store) throw new NotFoundError('Tienda no encontrada');
    return store;
  }

  async registerStore(params: {
    owner_name: string;
    owner_email: string;
    password: string;
    store_name: string;
    store_slug?: string;
    description: string | null;
    city: string;
    phone: string;
    logo_url: string | null;
    userAgent: string | null;
    ipAddress: string | null;
  }) {
    const emailTaken = await this.repo.findUserEmailExists(params.owner_email);
    if (emailTaken) {
      throw new ConflictError('Ya existe una cuenta registrada con ese correo electrónico', 'EMAIL_ALREADY_EXISTS');
    }

    const baseSlug = this.slugify(params.store_slug?.trim() || params.store_name);
    if (!baseSlug) {
      throw new ValidationError('El nombre de la tienda debe contener caracteres válidos');
    }

    let finalSlug = baseSlug;
    if (await this.repo.findStoreSlugExists(finalSlug)) {
      finalSlug = `${baseSlug}-${crypto.randomBytes(2).toString('hex')}`;
    }

    const passwordHash = await argon2.hash(params.password, { type: argon2.argon2id });
    const { user, store } = await this.repo.registerStoreOwner({
      owner_name: params.owner_name.trim(),
      owner_email: params.owner_email.trim(),
      password_hash: passwordHash,
      store_name: params.store_name.trim(),
      store_slug: finalSlug,
      description: params.description?.trim() || null,
      city: params.city.trim(),
      phone: params.phone.trim(),
      logo_url: params.logo_url?.trim() || null,
    });

    const accessToken = jwt.sign(
      {
        sub: String(user.user_id),
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        store_id: user.store_id,
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_TTL_SECONDS },
    );

    const refreshToken = crypto.randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 86400 * 1000);
    await this.authRepo.saveRefreshToken({
      userId: user.user_id,
      tokenHash: crypto.createHash('sha256').update(refreshToken).digest('hex'),
      expiresAt,
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in_seconds: env.JWT_ACCESS_TTL_SECONDS,
      user,
      store,
    };
  }

  async getMyStore(storeId: number | null) {
    if (storeId === null) {
      return {
        is_platform_admin: true,
        store: await this.repo.getStoreById(1),
        stores: await this.repo.listPublicStores(),
      };
    }
    const store = await this.repo.getStoreById(storeId);
    if (!store) throw new NotFoundError('Tienda no encontrada');
    return {
      is_platform_admin: false,
      store,
      stores: [store],
    };
  }

  async updateMyStore(
    storeId: number | null,
    input: {
      name: string;
      description: string | null;
      city: string | null;
      phone: string | null;
      email: string | null;
      logo_url: string | null;
      banner_url: string | null;
    },
  ) {
    const targetStoreId = storeId ?? 1;
    const updated = await this.repo.updateStore(targetStoreId, input);
    if (!updated) throw new NotFoundError('Tienda no encontrada');
    return updated;
  }

  // Q&A
  async listProductQuestions(productId: number) {
    const storeId = await this.repo.getProductStoreId(productId);
    if (storeId === null) throw new NotFoundError('Producto no encontrado');
    return this.repo.listProductQuestions(productId);
  }

  async askProductQuestion(input: {
    product_id: number;
    user_id?: number | null;
    customer_name: string;
    customer_email: string | null;
    question_text: string;
  }) {
    const storeId = await this.repo.getProductStoreId(input.product_id);
    if (storeId === null) throw new NotFoundError('Producto no encontrado');
    return this.repo.createProductQuestion({
      product_id: input.product_id,
      store_id: storeId,
      user_id: input.user_id ?? null,
      customer_name: input.customer_name.trim(),
      customer_email: input.customer_email?.trim() || null,
      question_text: input.question_text.trim(),
    });
  }

  listCustomerOrders(email: string) {
    return this.repo.listCustomerOrdersByEmail(email);
  }

  listStoreQuestions(storeId: number | null, status?: string) {
    return this.repo.listStoreQuestions(storeId, status);
  }

  async answerQuestion(
    questionId: number,
    storeId: number | null,
    answeredBy: number,
    answerText: string,
  ) {
    const updated = await this.repo.answerQuestion(questionId, storeId, answeredBy, answerText.trim());
    if (!updated) throw new NotFoundError('Pregunta no encontrada para esta tienda');
    return updated;
  }

  // Reviews
  async listProductReviews(productId: number) {
    const storeId = await this.repo.getProductStoreId(productId);
    if (storeId === null) throw new NotFoundError('Producto no encontrado');
    return this.repo.listProductReviews(productId);
  }

  createVerifiedReview(input: {
    product_id: number;
    order_number: string;
    contact: string;
    product_rating: number;
    seller_rating: number;
    title: string | null;
    comment: string;
  }) {
    return this.repo.createVerifiedReview({
      ...input,
      title: input.title?.trim() || null,
      comment: input.comment.trim(),
    });
  }

  listStoreReviews(storeId: number | null) {
    return this.repo.listStoreReviews(storeId);
  }

  async replyToReview(reviewId: number, storeId: number | null, sellerReply: string) {
    const updated = await this.repo.replyToReview(reviewId, storeId, sellerReply.trim());
    if (!updated) throw new NotFoundError('Reseña no encontrada para esta tienda');
    return updated;
  }

  // Order Private Messaging
  async listBuyerOrderMessages(orderNumber: string, contact: string) {
    const access = await this.repo.verifyBuyerOrderAccess(orderNumber, contact);
    if (!access) throw new NotFoundError('Pedido no encontrado');
    return {
      order_id: access.order_id,
      store_id: access.store_id,
      customer_name: access.customer_name,
      messages: await this.repo.listOrderMessages(access.order_id),
    };
  }

  async sendBuyerOrderMessage(input: {
    order_number: string;
    contact: string;
    message_text: string;
  }) {
    const access = await this.repo.verifyBuyerOrderAccess(input.order_number, input.contact);
    if (!access) throw new NotFoundError('Pedido no encontrado');
    return this.repo.createOrderMessage({
      order_id: access.order_id,
      store_id: access.store_id,
      sender_role: 'buyer',
      sender_name: access.customer_name,
      sender_user_id: null,
      message_text: input.message_text.trim(),
    });
  }

  async listSellerOrderMessages(orderId: number, storeId: number | null) {
    const access = await this.repo.verifySellerOrderAccess(orderId, storeId);
    if (!access) throw new ForbiddenError('Pedido no pertenece a tu tienda o no existe');
    return this.repo.listOrderMessages(orderId);
  }

  async sendSellerOrderMessage(input: {
    order_id: number;
    store_id: number | null;
    user_id: number;
    sender_name: string;
    message_text: string;
  }) {
    const access = await this.repo.verifySellerOrderAccess(input.order_id, input.store_id);
    if (!access) throw new ForbiddenError('Pedido no pertenece a tu tienda o no existe');
    return this.repo.createOrderMessage({
      order_id: access.order_id,
      store_id: access.store_id,
      sender_role: 'seller',
      sender_name: input.sender_name,
      sender_user_id: input.user_id,
      message_text: input.message_text.trim(),
    });
  }

  // Image Uploads
  async saveUploadedImageDataUrl(dataUrl: string): Promise<{ url: string }> {
    const match = /^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl.trim());
    if (!match) {
      throw new ValidationError('Formato de imagen inválido. Usa PNG, JPG o WebP en base64.');
    }
    const mime = match[1]!;
    const ext = ALLOWED_IMAGE_MIME[mime];
    if (!ext) {
      throw new ValidationError('Tipo MIME no permitido.');
    }

    const buffer = Buffer.from(match[2]!, 'base64');
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_UPLOAD_BYTES) {
      throw new ValidationError('La imagen debe pesar máximo 3 MB.');
    }

    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });
    const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    await fs.writeFile(path.join(uploadsDir, filename), buffer);

    return { url: `/media/uploads/${filename}` };
  }

  private slugify(input: string): string {
    return input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);
  }
}
