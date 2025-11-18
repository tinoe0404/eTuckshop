export const getStockLevel = (stock: number): "LOW" | "MEDIUM" | "HIGH" => {
    if (stock <= 5) return "LOW";
    if (stock <= 15) return "MEDIUM";
    return "HIGH";
  };
  