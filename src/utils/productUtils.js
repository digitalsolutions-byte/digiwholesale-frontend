export const getProductDisplayImage = (
  product, 
  selectedColorHex
) => {
  if (!product) return "/placeholder-product.png";
  const colors = Array.isArray(product.colors) ? product.colors : [];
  // 1. If a specific color is selected by user
  if (selectedColorHex) {
    const matched = colors.find((c) => c?.color?.toLowerCase() === selectedColorHex.toLowerCase());
    if (matched?.productColorImage) return matched.productColorImage;
  }
  // 2. Find first color that has a valid image
  const firstWithImage = colors.find((c) => Boolean(c?.productColorImage));
  if (firstWithImage?.productColorImage) return firstWithImage.productColorImage;
  // Fallback for legacy products that still have top-level image
  if (product.image) return product.image;
  // 3. Fallback to placeholder
  return "/placeholder-product.png";
};
