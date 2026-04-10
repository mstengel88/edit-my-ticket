const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <a href="/auth" className="text-sm text-primary underline underline-offset-4">
              Back to Sign In
            </a>
            <a href="/support" className="text-sm text-primary underline underline-offset-4">
              Support
            </a>
          </div>
        </div>

        <article className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <header className="mb-8 space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Privacy Policy
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Ticket Creator Privacy Policy
            </h1>
            <p className="text-sm text-muted-foreground">Effective date: April 10, 2026</p>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              This is a draft privacy policy for Ticket Creator. Replace bracketed placeholders and
              confirm the final data handling details with your legal or compliance owner before
              publishing to production or submitting to the App Store.
            </p>
          </header>

          <div className="space-y-8 text-sm leading-6 text-foreground sm:text-base">
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">1. Who we are</h2>
              <p>
                Ticket Creator is operated by <strong>[Your Company Name]</strong>. If you have
                questions about this policy, contact us at <strong>[support email]</strong> or
                visit <strong>[support URL]</strong>.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">2. Information we collect</h2>
              <p>Depending on how you use Ticket Creator, we may collect the following:</p>
              <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                <li>Account information such as name, email address, and sign-in credentials.</li>
                <li>Ticket and operational data such as customers, products, trucks, notes, and report content.</li>
                <li>Contact information entered by users, including customer names, email addresses, and addresses.</li>
                <li>Usage and diagnostic information needed to maintain reliability, security, and support.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">3. How we use information</h2>
              <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                <li>To provide ticket creation, editing, reporting, and email delivery features.</li>
                <li>To authenticate users and secure access to company data.</li>
                <li>To support customer service, troubleshoot issues, and improve the product.</li>
                <li>To comply with legal obligations and protect against misuse or fraud.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">4. Sharing of information</h2>
              <p>
                We do not sell personal information. We may share information with service providers
                that help us operate the app, such as hosting, authentication, database, email, and
                infrastructure vendors, only as needed to provide the service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">5. Data retention</h2>
              <p>
                We retain information for as long as needed to provide the service, meet contractual
                or legal requirements, resolve disputes, and enforce our agreements. Replace this
                section with your specific retention schedule if you have one.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">6. Security</h2>
              <p>
                We use reasonable administrative, technical, and organizational safeguards designed
                to protect information against unauthorized access, loss, misuse, or alteration.
                No method of transmission or storage is completely secure.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">7. Your choices and rights</h2>
              <p>You may have rights to access, correct, delete, or export your information, depending on your location.</p>
              <p>
                To make a privacy request, contact <strong>[privacy email]</strong>.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">8. Children’s privacy</h2>
              <p>
                Ticket Creator is not intended for children under 13, and we do not knowingly
                collect personal information from children.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">9. Changes to this policy</h2>
              <p>
                We may update this policy from time to time. When we do, we will update the
                effective date above.
              </p>
            </section>

            <section className="space-y-3 border-t pt-6">
              <h2 className="text-xl font-semibold">Publishing notes</h2>
              <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                <li>Replace all bracketed placeholders before publishing.</li>
                <li>Confirm whether analytics, logs, and email delivery are disclosed correctly.</li>
                <li>Use the final public URL from this page in App Store Connect.</li>
              </ul>
            </section>
          </div>
        </article>
      </div>
    </div>
  );
};

export default Privacy;
