const axios = require("axios");
const { getTokens } = require("./mlAuth");

function findAttributeValue(attributes = [], attributeId) {
    const attr = attributes.find(function (attribute) {
        return attribute.id === attributeId;
    });

    return attr ? attr.value_name : null;
}

async function updateMercadoLibreStock(sellerSku) {
    try {
        const tokens = await getTokens();
        if (!tokens?.access_token) {
            return {
                ok: false,
                status: 401,
                seller_sku: sellerSku,
                message: "No hay un token de Mercado Libre guardado",
            };
        }

        const searchResponse = await axios.get(
            `https://api.mercadolibre.com/users/${process.env.USER_ID}/items/search?seller_sku=${sellerSku}`,
            {
                headers: {
                    Authorization: `Bearer ${tokens.access_token}`,
                },
            }
        );

        const results = searchResponse.data.results;

        if (!results || results.length === 0) {
            return {
                ok: false,
                status: 404,
                message: `El calzado con la clave ${sellerSku} no se está vendiendo en Mercado Libre`,
            };
        }

        const itemId = results[0];

        const itemResponse = await axios.get(
            `https://api.mercadolibre.com/items/${itemId}?include_attributes=all`,
            {
                headers: {
                    Authorization: `Bearer ${tokens.access_token}`,
                },
            }
        );

        const itemData = itemResponse.data;

        // OLD STRUCTURE: item with variations
        if (Array.isArray(itemData.variations) && itemData.variations.length > 0) {
            let variationToChange = null;

            for (const variation of itemData.variations) {
                const variationSellerSku = findAttributeValue(
                    variation.attributes || [],
                    "SELLER_SKU"
                );

                if (variationSellerSku === sellerSku) {
                    variationToChange = variation;
                    break;
                }
            }

            if (!variationToChange) {
                return {
                    ok: false,
                    status: 404,
                    message: `No se encontró la variación con seller_sku ${sellerSku}`,
                };
            }

            const currentQuantity = variationToChange.available_quantity || 0;

            if (currentQuantity === 0) {
                return {
                    ok: true,
                    status: 200,
                    message: "La cantidad ya es 0",
                    item_id: itemId,
                    variation_id: variationToChange.id,
                    seller_sku: sellerSku,
                    old_quantity: 0,
                    new_quantity: 0,
                };
            }

            const newQuantity = currentQuantity - 1;

            const data = {
                variations: itemData.variations.map(function (variation) {
                    if (variation.id === variationToChange.id) {
                        return {
                            id: variation.id,
                            available_quantity: newQuantity,
                        };
                    }

                    return {
                        id: variation.id,
                    };
                }),
            };

            await axios.put(
                `https://api.mercadolibre.com/items/${itemId}`,
                data,
                {
                    headers: {
                        Authorization: `Bearer ${tokens.access_token}`,
                    },
                }
            );

            return {
                ok: true,
                status: 200,
                message: "Quantity updated successfully (old structure)",
                item_id: itemId,
                variation_id: variationToChange.id,
                seller_sku: sellerSku,
                old_quantity: currentQuantity,
                new_quantity: newQuantity,
                updated_date: updatedDate,
            };


        }

        // NEW STRUCTURE: top-level seller_sku
        const topLevelSellerSku = findAttributeValue(
            itemData.attributes || [],
            "SELLER_SKU"
        );

        if (topLevelSellerSku !== sellerSku) {
            return {
                ok: false,
                status: 404,
                message: `No se encontró el item nuevo con seller_sku ${sellerSku}`,
            };
        }

        const currentQuantity = itemData.available_quantity || 0;

        if (currentQuantity === 0) {
            return {
                ok: true,
                status: 200,
                message: "La cantidad ya es 0",
                item_id: itemId,
                seller_sku: sellerSku,
                old_quantity: 0,
                new_quantity: 0,
            };
        }

        const newQuantity = currentQuantity - 1;

        await axios.put(
            `https://api.mercadolibre.com/items/${itemId}`,
            {
                available_quantity: newQuantity,
            },
            {
                headers: {
                    Authorization: `Bearer ${tokens.access_token}`,
                },
            }
        );

        return {
            ok: true,
            status: 200,
            message: "Quantity updated successfully (new structure)",
            item_id: itemId,
            seller_sku: sellerSku,
            old_quantity: currentQuantity,
            new_quantity: newQuantity,

        };
    } catch (error) {
        console.error(
            "update error:",
            error.response ? error.response.data : error.message
        );

        return {
            ok: false,
            status: 500,
            error: "An error occurred",
            details: error.response ? error.response.data : error.message,
        };
    }
}

module.exports = updateMercadoLibreStock;
