import { DiamondPackage, Order } from '../types';

export function formatPkr(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK')}`;
}

export function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-PK', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function triggerCsvDownload(filename: string, rows: string[][]): void {
  const escapeCell = (cell: string) => {
    const str = String(cell ?? '');
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvContent = rows.map((r) => r.map(escapeCell).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportOrdersCsv(orders: Order[]): void {
  const header = [
    'Order ID',
    'Created At',
    'Player UID',
    'Player Nickname',
    'Region',
    'Package',
    'Base Diamonds',
    'Bonus Diamonds',
    'Amount (PKR)',
    'Discount (PKR)',
    'Payment Method',
    'Payment Account',
    'Transaction Ref',
    'Customer Email',
    'Status',
  ];
  const rows = orders.map((o) => [
    o.id,
    o.createdAt,
    o.playerUid,
    o.playerNickname,
    o.playerRegion,
    o.packageTitle,
    String(o.diamonds),
    String(o.bonusDiamonds),
    String(o.amountPkr),
    String(o.discountPkr),
    o.paymentMethod.toUpperCase(),
    o.paymentAccount,
    o.transactionRef,
    o.customerEmail,
    o.status.toUpperCase(),
  ]);
  triggerCsvDownload(`muhammad-topup-orders-${new Date().toISOString().slice(0, 10)}.csv`, [
    header,
    ...rows,
  ]);
}

export function exportPackagesCsv(packages: DiamondPackage[]): void {
  const header = [
    'Package ID',
    'Title',
    'Category',
    'Base Diamonds',
    'Bonus Diamonds',
    'Price (PKR)',
    'Original Price (PKR)',
    'Discount (%)',
    'Offer Label',
    'Stock Status',
  ];
  const rows = packages.map((p) => [
    p.id,
    p.title,
    p.category,
    String(p.diamonds),
    String(p.bonusDiamonds),
    String(p.pricePkr),
    p.originalPricePkr ? String(p.originalPricePkr) : '',
    p.discountPercent ? String(p.discountPercent) : '',
    p.offerLabel || '',
    p.stockStatus,
  ]);
  triggerCsvDownload(`muhammad-topup-inventory-${new Date().toISOString().slice(0, 10)}.csv`, [
    header,
    ...rows,
  ]);
}
