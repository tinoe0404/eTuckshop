export const MESSAGES = {
    WELCOME: `👋 *Welcome to eTuckshop!*
  
  Your one-stop shop for all your needs.
  
  Are you a new or returning customer?
  
  1️⃣ Register (New Customer)
  2️⃣ Login (Returning Customer)
  
  _Reply with 1 or 2_`,
  
    MAIN_MENU: (name: string) => `👋 *Hello, ${name}!*
  
  What would you like to do today?
  
  1️⃣ 🛍️ Browse Products
  2️⃣ 🛒 View Cart
  3️⃣ 💳 Checkout
  4️⃣ 📦 My Orders
  5️⃣ 🔍 Track Order
  6️⃣ 🚪 Logout
  0️⃣ ❓ Help
  
  _Reply with a number_`,
  
    REGISTER_NAME: `📝 *Registration*
  
  Please enter your *full name*:`,
  
    REGISTER_EMAIL: `📧 Now enter your *email address*:`,
  
    REGISTER_PASSWORD: `🔐 Create a *password* (min 6 characters):`,
  
    REGISTER_SUCCESS: (name: string) => `✅ *Registration Successful!*
  
  Welcome to eTuckshop, ${name}! 🎉
  
  You are now logged in.`,
  
    LOGIN_EMAIL: `🔐 *Login*
  
  Please enter your *email address*:`,
  
    LOGIN_PASSWORD: `🔑 Now enter your *password*:`,
  
    LOGIN_SUCCESS: (name: string) => `✅ *Login Successful!*
  
  Welcome back, ${name}! 🎉`,
  
    LOGIN_FAILED: `❌ *Login Failed*
  
  Invalid email or password. Please try again.
  
  1️⃣ Try Again
  2️⃣ Register New Account
  0️⃣ Back to Start`,
  
    CATEGORIES: (categories: Array<{ id: number; name: string }>) => {
      let msg = `🏷️ *Product Categories*\n\n`;
      categories.forEach((cat, index) => {
        msg += `${index + 1}️⃣ ${cat.name}\n`;
      });
      msg += `\n0️⃣ Back to Menu\n\n_Reply with a number_`;
      return msg;
    },
  
    PRODUCTS: (categoryName: string, products: Array<{ id: number; name: string; price: number; stock: number }>) => {
      let msg = `📦 *${categoryName}*\n\n`;
      if (products.length === 0) {
        msg += `No products available.\n`;
      } else {
        products.forEach((prod, index) => {
          const stockStatus = prod.stock > 0 ? "✅" : "❌";
          msg += `${index + 1}️⃣ *${prod.name}*\n   💰 $${prod.price.toFixed(2)} ${stockStatus}\n\n`;
        });
      }
      msg += `0️⃣ Back to Categories\n\n_Reply with a number to view details_`;
      return msg;
    },
  
    PRODUCT_DETAIL: (product: { name: string; description: string; price: number; stock: number }) => `
  📦 *${product.name}*
  
  ${product.description || "No description available."}
  
  💰 *Price:* $${product.price.toFixed(2)}
  📊 *Stock:* ${product.stock > 0 ? `${product.stock} available` : "Out of stock"}
  
  1️⃣ Add to Cart
  0️⃣ Back to Products
  
  _Reply with a number_`,
  
    ADD_QUANTITY: (productName: string) => `🛒 *Add to Cart*
  
  Product: *${productName}*
  
  How many would you like to add?
  
  _Reply with a number (1-10)_
  _or 0 to cancel_`,
  
    ADDED_TO_CART: (productName: string, quantity: number) => `✅ *Added to Cart!*
  
  ${quantity}x ${productName}
  
  1️⃣ Continue Shopping
  2️⃣ View Cart
  3️⃣ Checkout
  
  _Reply with a number_`,
  
    CART_EMPTY: `🛒 *Your Cart is Empty*
  
  Browse our products to add items!
  
  1️⃣ Browse Products
  0️⃣ Back to Menu`,
  
    CART: (items: Array<{ name: string; quantity: number; subtotal: number }>, total: number) => {
      let msg = `🛒 *Your Cart*\n\n`;
      items.forEach((item, index) => {
        msg += `${index + 1}. *${item.name}*\n   Qty: ${item.quantity} | $${item.subtotal.toFixed(2)}\n\n`;
      });
      msg += `━━━━━━━━━━━━━━━\n`;
      msg += `💰 *Total: $${total.toFixed(2)}*\n\n`;
      msg += `1️⃣ Checkout\n`;
      msg += `2️⃣ Clear Cart\n`;
      msg += `0️⃣ Back to Menu\n\n`;
      msg += `_Reply with a number_`;
      return msg;
    },
  
    CHECKOUT_PAYMENT: (total: number) => `💳 *Checkout*
  
  Total: *$${total.toFixed(2)}*
  
  Select payment method:
  
  1️⃣ 💵 Cash (Pay at Counter)
  2️⃣ 💳 PayNow (Pay Online)
  0️⃣ Cancel
  
  _Reply with a number_`,
  
    ORDER_CREATED_CASH: (orderNumber: string, total: number) => `✅ *Order Created!*
  
  📋 Order: *${orderNumber}*
  💰 Total: *$${total.toFixed(2)}*
  💵 Payment: *Cash*
  
  Your QR code will be generated.
  Show it at the counter within *1 minute*.
  
  _Generating QR code..._`,
  
    ORDER_CREATED_PAYNOW: (orderNumber: string, total: number, paymentUrl: string) => `✅ *Order Created!*
  
  📋 Order: *${orderNumber}*
  💰 Total: *$${total.toFixed(2)}*
  💳 Payment: *PayNow*
  
  Click the link below to complete payment:
  ${paymentUrl}
  
  After payment, you'll receive your pickup QR code.`,
  
    QR_CODE_CASH: (orderNumber: string) => `🎫 *Your Pickup QR Code*
  
  Order: *${orderNumber}*
  ⏰ *Expires in 1 minute!*
  
  Show this QR code at the counter to collect your order.`,
  
    QR_CODE_PAYNOW: (orderNumber: string) => `🎫 *Payment Successful!*
  
  Order: *${orderNumber}*
  ✅ *PAID*
  
  Show this QR code at the counter to collect your order.
  _(QR expires when order is completed)_`,
  
    MY_ORDERS: (orders: Array<{ orderNumber: string; total: number; status: string; date: string }>) => {
      let msg = `📦 *My Orders*\n\n`;
      if (orders.length === 0) {
        msg += `No orders yet.\n`;
      } else {
        orders.slice(0, 5).forEach((order, index) => {
          const statusEmoji = {
            PENDING: "⏳",
            PAID: "💳",
            COMPLETED: "✅",
            CANCELLED: "❌",
          }[order.status] || "❓";
          msg += `${index + 1}. *${order.orderNumber}*\n`;
          msg += `   ${statusEmoji} ${order.status} | $${order.total.toFixed(2)}\n`;
          msg += `   📅 ${order.date}\n\n`;
        });
      }
      msg += `0️⃣ Back to Menu\n\n`;
      msg += `_Reply with order number (1-5) to view details_`;
      return msg;
    },
  
    TRACK_ORDER: `🔍 *Track Order*
  
  Please enter your *Order Number*:
  _(e.g., ORD-ABC123-XYZ)_
  
  0️⃣ Back to Menu`,
  
    ORDER_STATUS: (order: { orderNumber: string; status: string; total: number; items: number }) => `
  📦 *Order Status*
  
  📋 Order: *${order.orderNumber}*
  📊 Status: *${order.status}*
  🛍️ Items: ${order.items}
  💰 Total: $${order.total.toFixed(2)}
  
  0️⃣ Back to Menu`,
  
    HELP: `❓ *Help*
  
  *Commands:*
  • Type *menu* - Go to main menu
  • Type *cart* - View your cart
  • Type *orders* - View your orders
  • Type *help* - Show this help
  
  *Need assistance?*
  Contact us at support@etuckshop.com
  
  0️⃣ Back to Menu`,
  
    INVALID_INPUT: `❌ Invalid input. Please try again or type *menu* to start over.`,
  
    ERROR: `❌ Something went wrong. Please type *menu* to start over.`,
  
    LOGOUT: `👋 *Logged Out*
  
  Thank you for shopping with us!
  
  Type *hi* to start again.`,
  };