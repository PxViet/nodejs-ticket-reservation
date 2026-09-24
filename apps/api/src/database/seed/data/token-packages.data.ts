export interface TokenPackageFixture {
  code: string;
  name: string;
  tokens: number;
  priceCents: number;
  sortOrder: number;
}

// DDR-024: the server-owned catalogue a top-up is priced from (BR-36). The
// larger packages carry bonus tokens, which is why the price is per package
// rather than per token.
export const TOKEN_PACKAGE_FIXTURES: TokenPackageFixture[] = [
  {
    code: 'STARTER_100',
    name: 'Starter',
    tokens: 100,
    priceCents: 500,
    sortOrder: 1,
  },
  {
    code: 'POPULAR_250',
    name: 'Popular',
    tokens: 250,
    priceCents: 1000,
    sortOrder: 2,
  },
  {
    code: 'VALUE_600',
    name: 'Best Value',
    tokens: 600,
    priceCents: 2000,
    sortOrder: 3,
  },
];
