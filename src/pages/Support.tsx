import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Support = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <a href="/auth" className="text-sm text-primary underline underline-offset-4">
            Back to Sign In
          </a>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href="/privacy">Privacy Policy</a>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/40">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Support
              </p>
              <CardTitle className="text-3xl">Ticket Creator Support</CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-6">
                This is a draft support page you can publish for App Store Connect. Replace the
                placeholder contact details before launch.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 p-6 sm:p-8">
              <section className="space-y-3">
                <h2 className="text-xl font-semibold">How to get help</h2>
                <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                  For help with account access, ticket workflows, reporting, or data corrections,
                  contact the Ticket Creator support team.
                </p>
                <div className="rounded-xl border bg-background p-4">
                  <p><strong>Email:</strong> [support email]</p>
                  <p><strong>Support URL:</strong> [public support site URL]</p>
                  <p><strong>Business hours:</strong> [support hours and timezone]</p>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-semibold">What to include in a support request</h2>
                <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground sm:text-base">
                  <li>Your company name and user email</li>
                  <li>The device type and iOS version</li>
                  <li>A short description of the problem</li>
                  <li>The affected ticket, report, customer, or product if relevant</li>
                  <li>Screenshots or screen recordings when available</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-semibold">Common support topics</h2>
                <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground sm:text-base">
                  <li>Unable to sign in or reset password</li>
                  <li>Ticket values not saving correctly</li>
                  <li>Email delivery or report delivery problems</li>
                  <li>Customer or product record corrections</li>
                  <li>Printing or layout issues on iPhone or iPad</li>
                </ul>
              </section>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">App Store Connect Notes</CardTitle>
                <CardDescription>
                  Use this page as the public Support URL for App Store Connect after you publish it.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Suggested final support URL:</p>
                <div className="rounded-lg border bg-background px-3 py-2 font-mono text-xs text-foreground">
                  https://[your-domain]/support
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Before Publishing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Replace the placeholder support email and URL.</p>
                <p>Confirm support hours and response expectations.</p>
                <p>Make sure the page stays publicly accessible without sign-in.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
