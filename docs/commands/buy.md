# Buy Gift

Create a Shopify cart and open checkout for a gift product. Works with products from `/gift` recommendations.

## Usage
After /gift recommends products, user says "I'll take #1" or names a product.

## Instructions

You already have the product info from the `/gift` conversation. Use the Shopify variant ID if available, otherwise fall back to the original store URL.

### If you have the Shopify variant ID (from the /gift API response):

$BASH
VARIANT_ID="REPLACE_WITH_VARIANT_ID"
CART=$(curl -s -X POST "https://$SHOPIFY_STORE_DOMAIN/api/2025-01/graphql.json" \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Storefront-Access-Token: $SHOPIFY_STOREFRONT_TOKEN" \
  -d "{\"query\":\"mutation { cartCreate(input: { lines: [{ merchandiseId: \\\"${VARIANT_ID}\\\", quantity: 1 }] }) { cart { checkoutUrl cost { totalAmount { amount currencyCode } } } userErrors { message } } }\"}")

URL=$(echo "$CART" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['data']['cartCreate']['cart']['checkoutUrl'])" 2>/dev/null)
TOTAL=$(echo "$CART" | python3 -c "import json,sys; d=json.load(sys.stdin); c=d['data']['cartCreate']['cart']['cost']['totalAmount']; print(f\"{c['amount']} {c['currencyCode']}\")" 2>/dev/null)

if [ -n "$URL" ] && [ "$URL" != "None" ]; then
  echo "CHECKOUT_READY"
  echo "Total: $TOTAL"
  echo "URL: $URL"
  open "$URL"
else
  echo "CHECKOUT_FAILED"
  echo "$CART"
fi
$ENDBASH

### If no Shopify variant ID (product not synced):

$BASH
open "REPLACE_WITH_BUY_URL"
echo "Opened original store page."
$ENDBASH

### After running:

Tell the user:
- "Checkout is open in your browser! [Product name] for $[price]."
- "Complete the payment there. It's a Shopify checkout -- safe and standard."
- If dev store: "Note: this is still in test mode. Use card number 1 for a test purchase, or 4242 4242 4242 4242."
- If product opened on original store: "This product isn't in our checkout yet, so I've opened the original store for you."
