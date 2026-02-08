#!/bin/bash

# ============================================================================
# STRIPE WEBHOOK FIX VERIFICATION SCRIPT
# ============================================================================
# Local testing to verify subscription unlock fixes
# Run this BEFORE deploying to production
# ============================================================================

set -e

echo "=================================="
echo "Stripe Webhook Fix Verification"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}ERROR: .env.local not found${NC}"
    echo "Please create .env.local with Stripe and Supabase keys"
    exit 1
fi

echo -e "${YELLOW}Step 1: Checking environment variables...${NC}"
if grep -q "STRIPE_SECRET_KEY" .env.local; then
    echo -e "${GREEN}✓ STRIPE_SECRET_KEY found${NC}"
else
    echo -e "${RED}✗ STRIPE_SECRET_KEY not found${NC}"
    exit 1
fi

if grep -q "STRIPE_WEBHOOK_SECRET" .env.local; then
    echo -e "${GREEN}✓ STRIPE_WEBHOOK_SECRET found${NC}"
else
    echo -e "${RED}✗ STRIPE_WEBHOOK_SECRET not found${NC}"
    exit 1
fi

if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local; then
    echo -e "${GREEN}✓ NEXT_PUBLIC_SUPABASE_URL found${NC}"
else
    echo -e "${RED}✗ NEXT_PUBLIC_SUPABASE_URL not found${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Building project...${NC}"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 3: Checking for old table references...${NC}"
# Search for any remaining references to deprecated 'subscriptions' table
if grep -r "\.from(['\"]subscriptions['\"])" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules"; then
    echo -e "${RED}✗ Found references to deprecated 'subscriptions' table${NC}"
    exit 1
else
    echo -e "${GREEN}✓ No references to deprecated 'subscriptions' table found${NC}"
fi

echo ""
echo -e "${YELLOW}Step 4: Verifying billing_status table references...${NC}"
if grep -r "\.from(['\"]billing_status['\"])" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | head -5; then
    echo -e "${GREEN}✓ Found correct 'billing_status' table references${NC}"
else
    echo -e "${RED}✗ No references to 'billing_status' table found${NC}"
fi

echo ""
echo -e "${YELLOW}Step 5: Verifying webhook handler fixes...${NC}"
if grep -q "customer.subscription.updated" src/app/api/stripe/webhook/route.ts; then
    echo -e "${GREEN}✓ Webhook handles customer.subscription.updated${NC}"
else
    echo -e "${RED}✗ Missing customer.subscription.updated handler${NC}"
    exit 1
fi

if grep -q "customer.subscription.deleted" src/app/api/stripe/webhook/route.ts; then
    echo -e "${GREEN}✓ Webhook handles customer.subscription.deleted${NC}"
else
    echo -e "${RED}✗ Missing customer.subscription.deleted handler${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 6: Verifying database helper functions...${NC}"
if grep -q "const { data: billingData" src/lib/supabase/db.ts; then
    echo -e "${GREEN}✓ Database helpers updated to use billing_status${NC}"
else
    echo -e "${RED}✗ Database helpers may not be updated${NC}"
fi

echo ""
echo "=================================="
echo -e "${GREEN}All verification checks passed!${NC}"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Start dev server: npm run dev"
echo "2. In another terminal: stripe listen --forward-to localhost:3000/api/stripe/webhook"
echo "3. Test Stripe checkout with test card: 4242 4242 4242 4242"
echo "4. Verify Supabase: billing_status.status should be 'active'"
echo "5. Try accessing /editor route - should not be redirected"
echo ""

