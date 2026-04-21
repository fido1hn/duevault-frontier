"use client";

import { useMerchantProfile } from "@/components/merchant-profile-gate";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
  return <SettingsContent />;
}

function SettingsContent() {
  const { profile } = useMerchantProfile();

  return (
      <div className="mx-auto flex max-w-4xl flex-col gap-8 p-6 md:p-8">
        <header>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your business profile and privacy rails.
          </p>
        </header>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 border border-border bg-card">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="payment">Payment Rails</TabsTrigger>
            <TabsTrigger value="privacy">Privacy Controls</TabsTrigger>
          </TabsList>

          <div className="mt-8">
            <TabsContent value="general" className="m-0 flex flex-col gap-6">
              <Card className="border-card-border shadow-sm">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">Business Profile</CardTitle>
                  <CardDescription>
                    Information displayed on your invoices and checkout pages.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label>Business Name</Label>
                      <Input defaultValue={profile.businessName} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Contact Email</Label>
                      <Input defaultValue={profile.contactEmail} type="email" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Business Address</Label>
                    <Input defaultValue={profile.businessAddress} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Default Notes</Label>
                    <Input defaultValue={profile.defaultNotes} />
                  </div>
                  <Button className="w-fit">Save Changes</Button>
                </CardContent>
              </Card>

              <Card className="border-card-border shadow-sm">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">
                    Notification Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-6">
                    <div>
                      <Label className="text-base">Invoice Viewed</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive an email when a client opens your checkout link.
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-6">
                    <div>
                      <Label className="text-base">Payment Detected</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive an email when a stealth payment hits the network.
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payment" className="m-0 flex flex-col gap-6">
              <Card className="border-card-border shadow-sm">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">Configured Networks</CardTitle>
                  <CardDescription>
                    Configure which blockchains you accept payments on.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div>
                      <h3 className="font-medium text-primary">Solana (USDC)</h3>
                      <p className="mt-1 font-mono text-sm text-muted-foreground">
                        Wallet: {profile.walletAddress}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4 opacity-50">
                    <div>
                      <h3 className="font-medium">Ethereum (USDC)</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Not configured</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Connect Wallet
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="privacy" className="m-0 flex flex-col gap-6">
              <Card className="border-card-border shadow-sm">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">
                    Umbra Protocol Integration
                  </CardTitle>
                  <CardDescription>Manage your stealth address settings.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                  <div className="flex items-center justify-between gap-6">
                    <div>
                      <Label className="text-base">Enable Stealth Settlement</Label>
                      <p className="text-sm text-muted-foreground">
                        Route all incoming payments through stealth addresses.
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex flex-col gap-2 border-t border-border pt-4">
                    <Label>Public Key (Used to generate stealth addresses)</Label>
                    <Input
                      defaultValue={profile.walletAddress}
                      readOnly
                      className="bg-muted/20 font-mono text-xs text-muted-foreground"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
  );
}
