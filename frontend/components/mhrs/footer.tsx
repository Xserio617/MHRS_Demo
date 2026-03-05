import Link from 'next/link'

export function MHRSFooter() {
  return (
    <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border bg-card">
      <div className="flex items-center justify-center gap-1 flex-wrap mb-1">
        <Link href="#" className="text-primary hover:underline">Sikca Sorulan Sorular</Link>
        <span>|</span>
        <Link href="#" className="text-primary hover:underline">Soru Gorus ve Onerileriniz</Link>
        <span>|</span>
        <Link href="#" className="text-primary hover:underline">Aydinlatma Metni</Link>
        <span>|</span>
        <Link href="#" className="text-primary hover:underline">NeyimVar?</Link>
      </div>
      <p>
        <span className="text-primary font-medium">T.C. Saglik Bakanligi</span>
        {' '}Copyright 2020 Tum Haklari Saklidir.
      </p>
    </footer>
  )
}
