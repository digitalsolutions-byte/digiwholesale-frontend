export const getProductDisplayImage = (
  product, 
  selectedColorHex
) => {
  if (!product) return "/placeholder-product.png";
  const colors = Array.isArray(product.colors) ? product.colors : [];
  if (selectedColorHex) {
    const matched = colors.find((c) => c?.color?.toLowerCase() === selectedColorHex.toLowerCase());
    if (matched?.productColorImage) return matched.productColorImage;
  }
  const firstWithImage = colors.find((c) => Boolean(c?.productColorImage));
  if (firstWithImage?.productColorImage) return firstWithImage.productColorImage;
  if (product.image) return product.image;
  return "/placeholder-product.png";
};
