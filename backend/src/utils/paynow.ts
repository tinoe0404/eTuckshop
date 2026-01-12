import Paynow from "paynow";

// Make PayNow optional for development (use test mode if credentials not provided)
let paynow: any = null;

try {
  paynow = new Paynow(
    parseInt(process.env.PAYNOW_INTEGRATION_ID || "0"),
    process.env.PAYNOW_INTEGRATION_KEY || ""
  );

  paynow.resultUrl = `${process.env.BACKEND_URL}/api/webhooks/paynow/update`;
  paynow.returnUrl = `${process.env.CLIENT_URL}/orders/success`;
} catch (error) {
  console.warn('⚠️ PayNow initialization failed - using test mode. This is OK for development.');
  console.warn('To enable PayNow, set PAYNOW_INTEGRATION_ID and PAYNOW_INTEGRATION_KEY in .env');
}

export const generatePaynowLink = async (
  email: string,
  amount: number,
  orderReference: string
): Promise<string | null> => {
  if (!paynow) {
    console.warn('PayNow not configured - returning test payment URL');
    return `/orders/payment/test?ref=${orderReference}`;
  }

  try {
    const payment = paynow.createPayment(orderReference, email);
    payment.add("Order Payment", amount);

    const response = await paynow.send(payment);

    if (response.success) {
      return response.redirectUrl || null;
    } else {
      console.error("Paynow Error:", response.error);
      return null;
    }
  } catch (error) {
    console.error("Paynow Exception:", error);
    return null;
  }
};