#!/usr/bin/env bash
# ============================================================
# ShowConnect – Setup Script
# Voer uit vanuit de ShowConnect map: bash setup.sh
# ============================================================
set -e

echo ""
echo "🎬  ShowConnect Setup"
echo "================================================="
echo ""

# 1. Controleer Node.js versie
NODE_VERSION=$(node -v 2>/dev/null || echo "niet gevonden")
echo "▶ Node.js versie: $NODE_VERSION"
if [[ "$NODE_VERSION" == "niet gevonden" ]]; then
  echo "❌  Node.js niet gevonden. Installeer Node.js 18+ via https://nodejs.org"
  exit 1
fi

# 2. .env.local aanmaken als het niet bestaat
if [ ! -f ".env.local" ]; then
  echo ""
  echo "▶ .env.local aanmaken vanuit .env.example..."
  cp .env.example .env.local
  echo ""
  echo "⚠️  ACTIE VEREIST:"
  echo "   Open .env.local en vul je Supabase credentials in:"
  echo "   - NEXT_PUBLIC_SUPABASE_URL"
  echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
  echo ""
else
  echo "▶ .env.local bestaat al — goed!"
fi

# 3. Dependencies installeren
echo ""
echo "▶ npm dependencies installeren..."
npm install

echo ""
echo "================================================="
echo "✅  Setup voltooid!"
echo ""
echo "VOLGENDE STAPPEN:"
echo ""
echo "  1. Vul je Supabase credentials in .env.local"
echo ""
echo "  2. Voer het database schema uit:"
echo "     Supabase Dashboard → SQL Editor → New Query"
echo "     Kopieer en plak: supabase/migrations/001_initial_schema.sql"
echo ""
echo "  3. Zet auth in via Supabase Dashboard:"
echo "     Authentication → URL Configuration:"
echo "     Site URL: http://localhost:3000"
echo "     Redirect URL: http://localhost:3000/auth/callback"
echo ""
echo "  4. Start de development server:"
echo "     npm run dev"
echo ""
echo "  🎉 Ga naar http://localhost:3000"
echo ""
