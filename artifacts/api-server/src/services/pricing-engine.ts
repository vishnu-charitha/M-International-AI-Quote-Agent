export interface PricingRequest {
  partNumber: string;
  quantity: number;
  basePrice: number;
  currency: string;
  condition: string;
  isDemoData?: boolean;
}

export interface PricingResponse {
  unitPrice: number;
  subtotal: number;
  discount: number;
  tax: number;
  shippingHandling: number;
  grandTotal: number;
  currency: string;
}

export function calculatePricing(req: PricingRequest): PricingResponse {
  let unitPrice = req.basePrice;
  
  // Adjust price based on condition (simulated business logic)
  if (req.condition === "OH") {
    unitPrice = unitPrice * 0.8; // Overhauled is 80% of NE
  } else if (req.condition === "SV") {
    unitPrice = unitPrice * 0.6; // Serviceable is 60% of NE
  } else if (req.condition === "AR") {
    unitPrice = unitPrice * 0.4; // As Removed is 40% of NE
  }

  // Calculate base values
  const subtotal = unitPrice * req.quantity;
  
  // Discount (e.g. 5% if quantity >= 5)
  const discount = req.quantity >= 5 ? subtotal * 0.05 : 0;
  
  // Tax (e.g. 8.5% standard simulated)
  const tax = (subtotal - discount) * 0.085;
  
  // Shipping & Handling (flat rate $50 + $10 per unit)
  const shippingHandling = 50 + (req.quantity * 10);
  
  const grandTotal = subtotal - discount + tax + shippingHandling;

  return {
    unitPrice: parseFloat(unitPrice.toFixed(2)),
    subtotal: parseFloat(subtotal.toFixed(2)),
    discount: parseFloat(discount.toFixed(2)),
    tax: parseFloat(tax.toFixed(2)),
    shippingHandling: parseFloat(shippingHandling.toFixed(2)),
    grandTotal: parseFloat(grandTotal.toFixed(2)),
    currency: req.currency,
  };
}
