import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Product } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Badge } from '../ui/badge';

interface ProductDetailProps {
  product: Product;
}

export function ProductDetail({ product }: ProductDetailProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {product.name}
          <Badge variant={product.isActive ? 'default' : 'secondary'}>
            {product.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">SKU</p>
            <p className="mt-1 font-mono font-medium">{product.sku}</p>
          </div>
          {product.barcode && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Barcode</p>
              <p className="mt-1 font-mono">{product.barcode}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer</p>
            <p className="mt-1">{product.customer?.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Unit Value</p>
            <p className="mt-1 font-medium">{formatCurrency(product.unitValue)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Damage Reports</p>
            <p className="mt-1 font-medium">{product._count?.damages ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Added</p>
            <p className="mt-1">{formatDate(product.createdAt)}</p>
          </div>
          {product.description && (
            <div className="col-span-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</p>
              <p className="mt-1">{product.description}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
