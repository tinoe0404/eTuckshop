// ============================================================
// src/services/chatbot.service.ts
// ============================================================
import { prisma } from "../utils/db";
import {
  ChatSession,
  getSession,
  setSession,
  createNewSession,
  deleteSession,
} from "../utils/chatSession";
import { MESSAGES } from "../utils/chatMessages";
import { generateQRCode, QRPayload } from "../utils/qrCode";

// ==========================================
// MAIN MESSAGE HANDLER
// ==========================================
export const handleIncomingMessage = async (
  phoneNumber: string,
  message: string
): Promise<string> => {
  try {
    const input = message.trim().toLowerCase();
    
    // Get or create session
    let session = await getSession(phoneNumber);
    if (!session) {
      session = createNewSession();
      await setSession(phoneNumber, session);
    }

    // Global commands
    if (input === "menu" || input === "home") {
      if (session.isLoggedIn) {
        session.step = "MAIN_MENU";
        await setSession(phoneNumber, session);
        return MESSAGES.MAIN_MENU(session.userName || "Customer");
      } else {
        session.step = "WELCOME";
        await setSession(phoneNumber, session);
        return MESSAGES.WELCOME;
      }
    }

    if (input === "help") {
      return MESSAGES.HELP;
    }

    // Route to appropriate handler based on step
    switch (session.step) {
      case "WELCOME":
        return handleWelcome(phoneNumber, input, session);
      case "REGISTER_NAME":
        return handleRegisterName(phoneNumber, message, session);
      case "REGISTER_EMAIL":
        return handleRegisterEmail(phoneNumber, message, session);
      case "REGISTER_PASSWORD":
        return handleRegisterPassword(phoneNumber, message, session);
      case "LOGIN_EMAIL":
        return handleLoginEmail(phoneNumber, message, session);
      case "LOGIN_PASSWORD":
        return handleLoginPassword(phoneNumber, message, session);
      case "MAIN_MENU":
        return handleMainMenu(phoneNumber, input, session);
      case "BROWSE_CATEGORIES":
        return handleBrowseCategories(phoneNumber, input, session);
      case "BROWSE_PRODUCTS":
        return handleBrowseProducts(phoneNumber, input, session);
      case "PRODUCT_DETAIL":
        return handleProductDetail(phoneNumber, input, session);
      case "ADD_QUANTITY":
        return handleAddQuantity(phoneNumber, input, session);
      case "VIEW_CART":
        return handleViewCart(phoneNumber, input, session);
      case "CHECKOUT_PAYMENT":
        return handleCheckoutPayment(phoneNumber, input, session);
      case "MY_ORDERS":
        return handleMyOrders(phoneNumber, input, session);
      case "TRACK_ORDER":
        return handleTrackOrder(phoneNumber, message, session);
      default:
        session.step = "WELCOME";
        await setSession(phoneNumber, session);
        return MESSAGES.WELCOME;
    }
  } catch (error) {
    console.error("❌ Chatbot error:", error);
    return MESSAGES.ERROR;
  }
};


// WELCOME HANDLER
// ==========================================
const handleWelcome = async (
  phoneNumber: string,
  input: string,
  session: ChatSession
): Promise<string> => {
  if (input === "1") {
    session.step = "REGISTER_NAME";
    await setSession(phoneNumber, session);
    return MESSAGES.REGISTER_NAME;
  } else if (input === "2") {
    session.step = "LOGIN_EMAIL";
    await setSession(phoneNumber, session);
    return MESSAGES.LOGIN_EMAIL;
  } else if (input === "hi" || input === "hello" || input === "start") {
    return MESSAGES.WELCOME;
  }
  return MESSAGES.WELCOME;
};

// ==========================================
// REGISTRATION HANDLERS
// ==========================================
const handleRegisterName = async (
    phoneNumber: string,
    input: string,
    session: ChatSession
  ): Promise<string> => {
    if (input.length < 2) {
      return "Please enter a valid name (at least 2 characters).";
    }
    session.tempName = input;
    session.step = "REGISTER_EMAIL";
    await setSession(phoneNumber, session);
    return MESSAGES.REGISTER_EMAIL;
  };

// ==========================================
// LOGIN HANDLERS
// ==========================================
const handleLoginEmail = async (
    phoneNumber: string,
    input: string,
    session: ChatSession
  ): Promise<string> => {
    session.tempEmail = input;
    session.step = "LOGIN_PASSWORD";
    await setSession(phoneNumber, session);
    return MESSAGES.LOGIN_PASSWORD;
  };
  
const handleLoginPassword = async (
phoneNumber: string,
input: string,
session: ChatSession
): Promise<string> => {
const user = await prisma.user.findUnique({
    where: { email: session.tempEmail },
});

if (!user) {
    session.step = "WELCOME";
    await setSession(phoneNumber, session);
    return MESSAGES.LOGIN_FAILED;
}

const validPassword = await Bun.password.verify(input, user.password);
if (!validPassword) {
    session.step = "WELCOME";
    await setSession(phoneNumber, session);
    return MESSAGES.LOGIN_FAILED;
}

// Ensure user has a cart
const cart = await prisma.cart.findUnique({ where: { userId: user.id } });
if (!cart) {
    await prisma.cart.create({ data: { userId: user.id } });
}

// Update session
session.isLoggedIn = true;
session.userId = user.id;
session.userName = user.name;
session.userEmail = user.email;
session.step = "MAIN_MENU";
session.tempEmail = undefined;
await setSession(phoneNumber, session);

return MESSAGES.LOGIN_SUCCESS(user.name) + "\n\n" + MESSAGES.MAIN_MENU(user.name);
};

// ==========================================
// MAIN MENU HANDLER
// ==========================================
const handleMainMenu = async (
    phoneNumber: string,
    input: string,
    session: ChatSession
  ): Promise<string> => {
    switch (input) {
      case "1": // Browse Products
        session.step = "BROWSE_CATEGORIES";
        await setSession(phoneNumber, session);
        return await showCategories();
  
      case "2": // View Cart
        session.step = "VIEW_CART";
        await setSession(phoneNumber, session);
        return await showCart(session.userId!);
  
      case "3": // Checkout
        const cart = await prisma.cart.findUnique({
          where: { userId: session.userId },
          include: { items: true },
        });
        if (!cart || cart.items.length === 0) {
          return MESSAGES.CART_EMPTY;
        }
        session.step = "CHECKOUT_PAYMENT";
        await setSession(phoneNumber, session);
        const total = await getCartTotal(session.userId!);
        return MESSAGES.CHECKOUT_PAYMENT(total);
  
      case "4": // My Orders
        session.step = "MY_ORDERS";
        await setSession(phoneNumber, session);
        return await showOrders(session.userId!);
  
      case "5": // Track Order
        session.step = "TRACK_ORDER";
        await setSession(phoneNumber, session);
        return MESSAGES.TRACK_ORDER;
  
      case "6": // Logout
        await deleteSession(phoneNumber);
        return MESSAGES.LOGOUT;
  
      case "0": // Help
        return MESSAGES.HELP;
  
      default:
        return MESSAGES.MAIN_MENU(session.userName || "Customer");
    }
  };

// ==========================================
// BROWSE CATEGORIES HANDLER
// ==========================================
const handleBrowseCategories = async (
    phoneNumber: string,
    input: string,
    session: ChatSession
  ): Promise<string> => {
    if (input === "0") {
      session.step = "MAIN_MENU";
      await setSession(phoneNumber, session);
      return MESSAGES.MAIN_MENU(session.userName || "Customer");
    }
  
    const categories = await prisma.category.findMany({ orderBy: { id: "asc" } });
    const index = parseInt(input) - 1;
  
    if (isNaN(index) || index < 0 || index >= categories.length) {
      return MESSAGES.INVALID_INPUT;
    }
  
    session.selectedCategoryId = categories[index].id;
    session.step = "BROWSE_PRODUCTS";
    await setSession(phoneNumber, session);
  
    return await showProducts(categories[index].id, categories[index].name);
  };

// ==========================================
// BROWSE PRODUCTS HANDLER
// ==========================================
const handleBrowseProducts = async (
  phoneNumber: string,
  input: string,
  session: ChatSession
): Promise<string> => {
  if (input === "0") {
    session.step = "BROWSE_CATEGORIES";
    await setSession(phoneNumber, session);
    return await showCategories();
  }

  const products = await prisma.product.findMany({
    where: { categoryId: session.selectedCategoryId },
    orderBy: { id: "asc" },
  });

  const index = parseInt(input) - 1;
  if (isNaN(index) || index < 0 || index >= products.length) {
    return MESSAGES.INVALID_INPUT;
  }

  session.selectedProductId = products[index].id;
  session.step = "PRODUCT_DETAIL";
  await setSession(phoneNumber, session);

  return MESSAGES.PRODUCT_DETAIL(products[index]);
};

// ==========================================
// PRODUCT DETAIL HANDLER
// ==========================================
const handleProductDetail = async (
    phoneNumber: string,
    input: string,
    session: ChatSession
  ): Promise<string> => {
    if (input === "0") {
      session.step = "BROWSE_PRODUCTS";
      await setSession(phoneNumber, session);
      const category = await prisma.category.findUnique({
        where: { id: session.selectedCategoryId },
      });
      return await showProducts(session.selectedCategoryId!, category?.name || "Products");
    }
  
    if (input === "1") {
      const product = await prisma.product.findUnique({
        where: { id: session.selectedProductId },
      });
      if (!product || product.stock <= 0) {
        return "❌ Sorry, this product is out of stock.";
      }
      session.step = "ADD_QUANTITY";
      await setSession(phoneNumber, session);
      return MESSAGES.ADD_QUANTITY(product.name);
    }
  
    return MESSAGES.INVALID_INPUT;
  };
  
// ==========================================
// ADD QUANTITY HANDLER
// ==========================================
const handleAddQuantity = async (
    phoneNumber: string,
    input: string,
    session: ChatSession
  ): Promise<string> => {
    if (input === "0") {
      session.step = "PRODUCT_DETAIL";
      await setSession(phoneNumber, session);
      const product = await prisma.product.findUnique({
        where: { id: session.selectedProductId },
      });
      return MESSAGES.PRODUCT_DETAIL(product!);
    }
  
    const quantity = parseInt(input);
    if (isNaN(quantity) || quantity < 1 || quantity > 10) {
      return "Please enter a valid quantity (1-10).";
    }
  
    const product = await prisma.product.findUnique({
      where: { id: session.selectedProductId },
    });
  
    if (!product || product.stock < quantity) {
      return `❌ Sorry, only ${product?.stock || 0} available.`;
    }
  
    // Add to cart
    const cart = await prisma.cart.findUnique({ where: { userId: session.userId } });
    
    const existingItem = await prisma.cartItem.findFirst({
      where: { cartId: cart!.id, productId: product.id },
    });
  
    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId: cart!.id, productId: product.id, quantity },
      });
    }
  
    session.step = "MAIN_MENU";
    await setSession(phoneNumber, session);
  
    return MESSAGES.ADDED_TO_CART(product.name, quantity) + "\n\n" + MESSAGES.MAIN_MENU(session.userName!);
  };

// ==========================================
// HELPER FUNCTIONS
// ==========================================
const showCategories = async (): Promise<string> => {
    const categories = await prisma.category.findMany({ orderBy: { id: "asc" } });
    return MESSAGES.CATEGORIES(categories);
  };
  
const showProducts = async (categoryId: number, categoryName: string): Promise<string> => {
const products = await prisma.product.findMany({
    where: { categoryId },
    orderBy: { id: "asc" },
});
return MESSAGES.PRODUCTS(categoryName, products);
};

const showCart = async (userId: number): Promise<string> => {
const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: { product: true } } },
});

if (!cart || cart.items.length === 0) {
    return MESSAGES.CART_EMPTY;
}

const items = cart.items.map((item) => ({
    name: item.product.name,
    quantity: item.quantity,
    subtotal: item.product.price * item.quantity,
}));

const total = items.reduce((sum, item) => sum + item.subtotal, 0);
return MESSAGES.CART(items, total);
};

const getCartTotal = async (userId: number): Promise<number> => {
const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: { product: true } } },
});
if (!cart) return 0;
return cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
};

const showOrders = async (userId: number): Promise<string> => {
const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
});

const formattedOrders = orders.map((o) => ({
    orderNumber: o.orderNumber,
    total: o.totalAmount,
    status: o.status,
    date: o.createdAt.toLocaleDateString(),
}));

return MESSAGES.MY_ORDERS(formattedOrders);
};
// ==========================================
// VIEW CART HANDLER
// ==========================================
const handleViewCart = async (
  phoneNumber: string,
  input: string,
  session: ChatSession
): Promise<string> => {
  if (input === "0") {
    session.step = "MAIN_MENU";
    await setSession(phoneNumber, session);
    return MESSAGES.MAIN_MENU(session.userName || "Customer");
  }

  if (input === "1") {
    // Checkout
    const cart = await prisma.cart.findUnique({
      where: { userId: session.userId },
      include: { items: true },
    });
    if (!cart || cart.items.length === 0) {
      return MESSAGES.CART_EMPTY;
    }
    session.step = "CHECKOUT_PAYMENT";
    await setSession(phoneNumber, session);
    const total = await getCartTotal(session.userId!);
    return MESSAGES.CHECKOUT_PAYMENT(total);
  }

  if (input === "2") {
    // Clear cart
    const cart = await prisma.cart.findUnique({ where: { userId: session.userId } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    session.step = "MAIN_MENU";
    await setSession(phoneNumber, session);
    return "🗑️ Cart cleared!\n\n" + MESSAGES.MAIN_MENU(session.userName!);
  }

  return await showCart(session.userId!);
};

// ==========================================
// CHECKOUT PAYMENT HANDLER
// ==========================================
const handleCheckoutPayment = async (
  phoneNumber: string,
  input: string,
  session: ChatSession
): Promise<string> => {
  if (input === "0") {
    session.step = "MAIN_MENU";
    await setSession(phoneNumber, session);
    return MESSAGES.MAIN_MENU(session.userName || "Customer");
  }

  const paymentType = input === "1" ? "CASH" : input === "2" ? "PAYNOW" : null;
  if (!paymentType) {
    return MESSAGES.INVALID_INPUT;
  }

  // Get cart
  const cart = await prisma.cart.findUnique({
    where: { userId: session.userId },
    include: { items: { include: { product: true } } },
  });

  if (!cart || cart.items.length === 0) {
    session.step = "MAIN_MENU";
    await setSession(phoneNumber, session);
    return MESSAGES.CART_EMPTY;
  }

  // Validate stock
  for (const item of cart.items) {
    if (item.product.stock < item.quantity) {
      return `❌ Sorry, *${item.product.name}* only has ${item.product.stock} in stock. Please update your cart.`;
    }
  }

  // Calculate total
  const totalAmount = cart.items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  // Generate order number
  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // Create order with transaction
  const order = await prisma.$transaction(async (tx) => {
    // Create order
    const newOrder = await tx.order.create({
      data: {
        orderNumber,
        userId: session.userId!,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        paymentType,
        status: "PENDING",
        orderItems: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            subtotal: parseFloat((item.product.price * item.quantity).toFixed(2)),
          })),
        },
      },
      include: {
        user: { select: { name: true, email: true } },
        orderItems: { include: { product: true } },
      },
    });

    // Reduce stock
    for (const item of cart.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    // Clear cart
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return newOrder;
  });

  session.pendingOrderId = order.id;

  if (paymentType === "CASH") {
    // Generate Cash QR (1 minute expiry)
    const expiresAt = new Date(Date.now() + 60 * 1000);
    
    const qrPayload: QRPayload = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentType: "CASH",
      paymentStatus: "PENDING",
      customer: { name: order.user.name, email: order.user.email },
      orderSummary: {
        items: order.orderItems.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          subtotal: item.subtotal,
        })),
        totalItems: order.orderItems.reduce((sum, item) => sum + item.quantity, 0),
        totalAmount: order.totalAmount,
      },
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    };

    const qrCode = await generateQRCode(qrPayload);

    // Save QR
    await prisma.paymentQR.create({
      data: {
        orderId: order.id,
        qrCode,
        qrData: JSON.stringify(qrPayload),
        paymentType: "CASH",
        expiresAt,
      },
    });

    session.step = "MAIN_MENU";
    await setSession(phoneNumber, session);

    // Return order confirmation + QR data (will be sent as media)
    return JSON.stringify({
      type: "CASH_ORDER",
      message: MESSAGES.ORDER_CREATED_CASH(order.orderNumber, order.totalAmount),
      qrMessage: MESSAGES.QR_CODE_CASH(order.orderNumber),
      qrCode,
      orderNumber: order.orderNumber,
    });

  } else {
    // PayNow - Generate payment link
    const paymentRef = `PAY-${order.orderNumber}-${Date.now().toString(36).toUpperCase()}`;
    const baseUrl = process.env.WEBHOOK_BASE_URL || "http://localhost:5000";
    const paymentUrl = `${baseUrl}/api/orders/pay/paynow/process/${order.id}?ref=${paymentRef}`;

    // Save payment reference
    await prisma.paymentQR.create({
      data: {
        orderId: order.id,
        qrCode: "",
        qrData: paymentRef,
        paymentType: "PAYNOW",
      },
    });

    session.step = "MAIN_MENU";
    await setSession(phoneNumber, session);

    return MESSAGES.ORDER_CREATED_PAYNOW(order.orderNumber, order.totalAmount, paymentUrl);
  }
};



// Export for use in controller
export { showCart, getCartTotal };
  
