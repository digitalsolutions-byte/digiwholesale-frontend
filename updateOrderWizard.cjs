const fs = require('fs');
const path = 'd:/DigiBySR/Wholesale-MVP/src/pages/OrderWizard.jsx';

let content = fs.readFileSync(path, 'utf8');

// The prefix is `renderProductDetails = () => (` which we want to change to `... = () => { ... }`
const searchTarget = '    const renderProductDetails = () => (\n        <FieldArray name="products">';

const replacement = `    const renderProductDetails = () => {
        const arrayName = activeProductTab === 'lens' ? 'lensProducts' : 'frameProducts';
        const currentProducts = formik.values[arrayName] || [];

        return (
            <div className="flex flex-col">
                {/* Nav Menu Tabs */}
                <div className="flex space-x-8 border-b border-gray-200 mb-6 px-4">
                    <button
                        type="button"
                        onClick={() => { setActiveProductTab('lens'); setActiveProductIndex(0); setExpandedProductIndices([]); }}
                        className={\`py-3 px-2 text-sm font-bold uppercase tracking-widest border-b-2 transition-colors \${activeProductTab === 'lens' ? 'border-erp-accent text-erp-accent' : 'border-transparent text-gray-400 hover:text-gray-600'}\`}
                    >
                        Lens
                    </button>
                    <button
                        type="button"
                        onClick={() => { setActiveProductTab('frame'); setActiveProductIndex(0); setExpandedProductIndices([]); }}
                        className={\`py-3 px-2 text-sm font-bold uppercase tracking-widest border-b-2 transition-colors \${activeProductTab === 'frame' ? 'border-erp-accent text-erp-accent' : 'border-transparent text-gray-400 hover:text-gray-600'}\`}
                    >
                        Frame
                    </button>
                </div>
                <FieldArray name={arrayName}>`;

content = content.replace(searchTarget, replacement);

// We need to replace all `formik.values.products` with `currentProducts` from the start of renderProductDetails to the end.
const splitContent = content.split('const renderProductDetails = () => {');
if (splitContent.length === 2) {
    let topPart = splitContent[0];
    let bottomPart = 'const renderProductDetails = () => {' + splitContent[1];

    bottomPart = bottomPart.replace(/formik\.values\.products\.map/g, 'currentProducts.map');
    bottomPart = bottomPart.replace(/formik\.values\.products\.length/g, 'currentProducts.length');
    bottomPart = bottomPart.replace(/formik\.setFieldValue\('products'/g, 'formik.setFieldValue(arrayName');
    bottomPart = bottomPart.replace(/formik\.values\.products\.filter/g, 'currentProducts.filter');
    bottomPart = bottomPart.replace(/formik\.values\.products\[activeProductIndex\]/g, 'currentProducts[activeProductIndex]');
    bottomPart = bottomPart.replace(/formik\.values\.products\.reduce/g, 'currentProducts.reduce');
    bottomPart = bottomPart.replace(/formik\.values\.products\.forEach/g, 'currentProducts.forEach');
    bottomPart = bottomPart.replace(/formik\.values\.products/g, 'currentProducts');
    bottomPart = bottomPart.replace(/name=\{\`products\.\$\{index\}/g, 'name={`\\${arrayName}.\\${index}');
    
    // Fix closing tag
    bottomPart = bottomPart.replace(
        '</FieldArray>\n    );',
        '</FieldArray>\n            </div>\n        );\n    };'
    );

    content = topPart + bottomPart;
}

// 12. Fix backend mapping in useEffect
const oldEffect = `                        // Handle multiple products if backend provides them, otherwise map root level to first product
                        let products = [];
                        if (order.products && order.products.length > 0) {
                            products = order.products.map(prod => {
                                const prodMapped = {
                                    ...productTemplate,
                                    scan: prod.scan || '',`;

const newEffect = `                        // Handle multiple products if backend provides them, otherwise map root level to first product
                        let lensProducts = [];
                        let frameProducts = [];
                        if (order.products && order.products.length > 0) {
                            order.products.forEach(prod => {
                                const prodMapped = {
                                    ...productTemplate,
                                    scan: prod.scan || '',`;

content = content.replace(oldEffect, newEffect);

const oldEffectEnd = `                                };
                                return prodMapped;
                            });
                        } else {
                            products = [{ ...productTemplate }];
                        }
                        mappedValues.products = products;`;

const newEffectEnd = `                                };
                                
                                const categoryName = (prod.category?.name || '').toUpperCase();
                                if (categoryName.includes('LENS') || categoryName.includes('CONTACT')) {
                                    lensProducts.push(prodMapped);
                                } else {
                                    frameProducts.push(prodMapped);
                                }
                            });
                        }
                        
                        if (lensProducts.length === 0) lensProducts = [{ ...productTemplate }];
                        if (frameProducts.length === 0) frameProducts = [{ ...productTemplate }];
                        
                        mappedValues.lensProducts = lensProducts;
                        mappedValues.frameProducts = frameProducts;`;

content = content.replace(oldEffectEnd, newEffectEnd);

fs.writeFileSync(path, content, 'utf8');
console.log('Script executed successfully!');
