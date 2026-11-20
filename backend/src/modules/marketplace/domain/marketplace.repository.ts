export interface StoreSummary {
  readonly store_id: number;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly logo_url: string | null;
  readonly banner_url: string | null;
  readonly city: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly status: 'active' | 'suspended' | 'pending';
  readonly rating_average: number;
  readonly rating_count: number;
  readonly sales_count: number;
  readonly response_rate_pct: number;
  readonly is_verified: boolean;
  readonly products_count: number;
  readonly created_at: string;
}

export interface ProductQuestionRecord {
  readonly question_id: number;
  readonly product_id: number;
  readonly product_name?: string | undefined;
  readonly product_slug?: string | undefined;
  readonly store_id: number;
  readonly customer_name: string;
  readonly question_text: string;
  readonly answer_text: string | null;
  readonly answered_at: string | null;
  readonly status: 'pending' | 'answered' | 'hidden';
  readonly created_at: string;
}

export interface ProductReviewRecord {
  readonly review_id: number;
  readonly product_id: number;
  readonly product_name?: string | undefined;
  readonly store_id: number;
  readonly order_id: number;
  readonly reviewer_name: string;
  readonly product_rating: number;
  readonly seller_rating: number;
  readonly title: string | null;
  readonly comment: string;
  readonly seller_reply: string | null;
  readonly seller_replied_at: string | null;
  readonly is_verified_purchase: boolean;
  readonly created_at: string;
}

export interface OrderMessageRecord {
  readonly message_id: number;
  readonly order_id: number;
  readonly store_id: number;
  readonly sender_role: 'buyer' | 'seller';
  readonly sender_name: string;
  readonly message_text: string;
  readonly is_read: boolean;
  readonly created_at: string;
}

export interface RegisterStoreTxInput {
  readonly owner_name: string;
  readonly owner_email: string;
  readonly password_hash: string;
  readonly store_name: string;
  readonly store_slug: string;
  readonly description: string | null;
  readonly city: string;
  readonly phone: string;
  readonly logo_url: string | null;
}

export interface MarketplaceRepositoryPort {
  listPublicStores(): Promise<StoreSummary[]>;
  getPublicStoreBySlug(slug: string): Promise<StoreSummary | null>;
  getStoreById(storeId: number): Promise<StoreSummary | null>;
  findUserEmailExists(email: string): Promise<boolean>;
  findStoreSlugExists(slug: string): Promise<boolean>;
  registerStoreOwner(input: RegisterStoreTxInput): Promise<{
    user: { user_id: number; full_name: string; email: string; role: 'admin'; store_id: number };
    store: StoreSummary;
  }>;
  updateStore(
    storeId: number,
    input: {
      name: string;
      description: string | null;
      city: string | null;
      phone: string | null;
      email: string | null;
      logo_url: string | null;
      banner_url: string | null;
    },
  ): Promise<StoreSummary | null>;

  // Q&A
  getProductStoreId(productId: number): Promise<number | null>;
  listProductQuestions(productId: number): Promise<ProductQuestionRecord[]>;
  createProductQuestion(input: {
    product_id: number;
    store_id: number;
    user_id: number | null;
    customer_name: string;
    customer_email: string | null;
    question_text: string;
  }): Promise<ProductQuestionRecord>;
  listStoreQuestions(storeId: number | null, status?: string): Promise<ProductQuestionRecord[]>;
  answerQuestion(
    questionId: number,
    storeId: number | null,
    answeredBy: number,
    answerText: string,
  ): Promise<ProductQuestionRecord | null>;

  // Reviews
  listProductReviews(productId: number): Promise<ProductReviewRecord[]>;
  createVerifiedReview(input: {
    product_id: number;
    order_number: string;
    contact: string;
    product_rating: number;
    seller_rating: number;
    title: string | null;
    comment: string;
  }): Promise<ProductReviewRecord>;
  listStoreReviews(storeId: number | null): Promise<ProductReviewRecord[]>;
  replyToReview(
    reviewId: number,
    storeId: number | null,
    sellerReply: string,
  ): Promise<ProductReviewRecord | null>;

  // Order Messaging
  verifyBuyerOrderAccess(
    orderNumber: string,
    contact: string,
  ): Promise<{ order_id: number; store_id: number; customer_name: string } | null>;
  verifySellerOrderAccess(orderId: number, storeId: number | null): Promise<{ order_id: number; store_id: number } | null>;
  listOrderMessages(orderId: number): Promise<OrderMessageRecord[]>;
  createOrderMessage(input: {
    order_id: number;
    store_id: number;
    sender_role: 'buyer' | 'seller';
    sender_name: string;
    sender_user_id: number | null;
    message_text: string;
  }): Promise<OrderMessageRecord>;

  listCustomerOrdersByEmail(email: string): Promise<
    Array<{
      order_id: number;
      order_number: string;
      order_status: string;
      total_amount: number;
      currency: string;
      store_name: string;
      created_at: string;
      items: Array<{ product_id: number; product_name: string; quantity: number }>;
    }>
  >;
}
