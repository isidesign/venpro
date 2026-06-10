export const STORAGE_KEYS = {
  products: 'venpro_products',
  sales: 'venpro_sales',
  transactions: 'venpro_transactions',
  config: 'venpro_config',
  industry: 'venpro_industry',
  ownerProfileName: 'ownerProfileName',
  ownerProfileImage: 'ownerProfileImage',
  ownerProfileEmail: 'ownerProfileEmail',
} as const;

export function clearVenproLocalData() {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem('venpro_invite_code');
  localStorage.removeItem('venpro_business_structure');
  localStorage.removeItem('venpro_employees');
}
