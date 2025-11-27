export function formatPrice(price: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  }
  
  export function formatDate(date: string): string {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  }
  
  export function getStockLevelColor(level: "LOW" | "MEDIUM" | "HIGH"): string {
    switch (level) {
      case "LOW":
        return "text-red-600 bg-red-50";
      case "MEDIUM":
        return "text-yellow-600 bg-yellow-50";
      case "HIGH":
        return "text-green-600 bg-green-50";
    }
  }
  
  export function getStockLevelText(stock: number): "LOW" | "MEDIUM" | "HIGH" {
    if (stock <= 5) return "LOW";
    if (stock <= 15) return "MEDIUM";
    return "HIGH";
  }