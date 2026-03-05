import { FileX } from 'lucide-react'

export function NearestHospital() {
  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="border-b border-border">
        <div className="px-4 py-3">
          <span className="text-sm font-medium text-foreground border-l-2 border-primary pl-2">
            En Yakin Hastane
          </span>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileX className="size-12 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground text-sm">Veri Yok</p>
      </div>
    </div>
  )
}
