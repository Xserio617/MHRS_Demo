import { CheckCircle2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function LoginHistory() {
  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <CheckCircle2 className="size-5 text-primary" />
        <span className="text-sm font-medium text-foreground">Son Giris Bilgilerim</span>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-center">Islem Tarihi</TableHead>
            <TableHead className="text-center">Giris Durumu</TableHead>
            <TableHead className="text-center">Giris Tipi</TableHead>
            <TableHead className="text-center">Islem Kanali</TableHead>
            <TableHead className="text-center">IP Adresi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="text-center text-muted-foreground" colSpan={5}>
              Veri bulunamadi
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}
