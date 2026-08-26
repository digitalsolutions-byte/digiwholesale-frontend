/**
 * Glass.js
 * 
 * Domain Entity representing an eyeglass / sunglass frame.
 */

export class Glass {
    constructor({
        id,
        name,
        brand = '',
        sku = '',
        category = 'FRAME', // FRAME | SUNGLASS
        shape = 'RECTANGLE', // RECTANGLE | ROUND | CAT_EYE | AVIATOR | SQUARE | GEOMETRIC
        frameColor = '#1A1A1A',
        lensColor = 'rgba(0, 0, 0, 0.15)',
        imageUrl = '',
        svg = '',
        aspectRatio = 2.4,
        frameWidthMm = 140,
        bridgeWidthMm = 18,
        price = 0,
        tags = [],
    }) {
        this.id = id;
        this.name = name;
        this.brand = brand;
        this.sku = sku;
        this.category = category;
        this.shape = shape;
        this.frameColor = frameColor;
        this.lensColor = lensColor;
        this.imageUrl = imageUrl;
        this.svg = svg;
        this.aspectRatio = aspectRatio;
        this.frameWidthMm = frameWidthMm;
        this.bridgeWidthMm = bridgeWidthMm;
        this.price = price;
        this.tags = tags;
    }
}
