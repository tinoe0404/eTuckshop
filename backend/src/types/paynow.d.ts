declare module 'paynow' {
    // 👇 1. Define the interfaces first
    export interface Payment {
      add(title: string, amount: number): void;
      // Add other methods if needed
    }
  
    export interface InitResponse {
      success: boolean;
      redirectUrl?: string;
      pollUrl?: string;
      instructions?: string;
      error?: string;
    }
  
    export interface StatusResponse {
      status: string;
      reference: string;
      amount: number;
      paynowReference: string;
      pollUrl: string;
    }
  
    // 👇 2. Export the main class as DEFAULT
    export default class Paynow {
      constructor(integrationId: number | string, integrationKey: string);
  
      resultUrl: string;
      returnUrl: string;
  
      createPayment(reference: string, authEmail?: string): Payment;
      send(payment: Payment): Promise<InitResponse>;
      pollTransaction(pollUrl: string): Promise<StatusResponse>;
    }
  }