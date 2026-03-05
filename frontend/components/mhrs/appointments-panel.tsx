"use client"

import { CalendarCheck } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'

export function AppointmentsPanel() {
  return (
    <div className="bg-card rounded-lg border border-border">
      <Tabs defaultValue="randevularim">
        <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start p-0 h-auto">
          <TabsTrigger
            value="randevularim"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 text-sm"
          >
            Randevularim
          </TabsTrigger>
          <TabsTrigger
            value="gecmis"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 text-sm"
          >
            Gecmis Randevularim
          </TabsTrigger>
        </TabsList>

        <TabsContent value="randevularim" className="p-8">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="size-16 bg-muted rounded-lg flex items-center justify-center mb-4">
              <CalendarCheck className="size-8 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium text-base">Aktif Randevunuz Yok</p>
          </div>
        </TabsContent>

        <TabsContent value="gecmis" className="p-8">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="size-16 bg-muted rounded-lg flex items-center justify-center mb-4">
              <CalendarCheck className="size-8 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium text-base">Gecmis Randevunuz Yok</p>
          </div>
        </TabsContent>
      </Tabs>

      <div className="border-t border-border">
        <Button variant="ghost" className="w-full text-muted-foreground text-sm py-3 h-auto rounded-none">
          Tumunu Goster
        </Button>
      </div>
    </div>
  )
}
