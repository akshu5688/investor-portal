export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans dark:bg-black">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900">
              IP
            </div>
            <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Investor Portal
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="px-4 py-2 text-sm font-medium text-zinc-700 transition hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
            >
              Log in
            </a>
            <a
              href="/signup"
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              Sign up
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section with Big Heading */}
      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h1 className="mb-6 text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-6xl md:text-7xl">
          All your investor documents in one place – upload once, share anytime.
        </h1>
        <p className="mb-8 text-xl text-zinc-600 dark:text-zinc-400">
          Store KYC forms, agreements, and certificates securely. Send them all
          together with one click instead of attaching files one by one.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="/signup"
            className="rounded-lg bg-blue-600 px-8 py-3 text-base font-medium text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Get started
          </a>
          <a
            href="#how-it-works"
            className="rounded-lg border border-zinc-300 bg-white px-8 py-3 text-base font-medium text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Learn more
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-zinc-200 bg-zinc-50 py-16 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            How it works
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-zinc-900">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-xl font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                1
              </div>
              <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Create your account
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Sign up with your email and password. Verify your email to
                protect your account.
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-zinc-900">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-xl font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                2
              </div>
              <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Upload your documents
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Add KYC forms, ID proofs, agreements, and certificates to your
                secure dashboard.
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-zinc-900">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-xl font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                3
              </div>
              <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Share with one click
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Send all your documents together via email instead of attaching
                each file manually.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What to Upload Section */}
      <section id="how-it-works" className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-8 text-center text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            What you can upload
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <h3 className="mb-3 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                ✓ Recommended
              </h3>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li>• Identity documents (passport, ID card)</li>
                <li>• Address proofs (utility bills, bank statements)</li>
                <li>• Investment agreements and contracts</li>
                <li>• KYC / compliance forms and certificates</li>
              </ul>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <h3 className="mb-3 text-lg font-semibold text-red-600 dark:text-red-400">
                ✗ Do not upload
              </h3>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li>• Plain text passwords or PIN codes</li>
                <li>• Credit / debit card numbers</li>
                <li>• One-time codes or security answers</li>
                <li>• Unsecured sensitive information</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-zinc-200 bg-zinc-50 py-16 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Ready to get started?
          </h2>
          <p className="mb-8 text-lg text-zinc-600 dark:text-zinc-400">
            Create your account in seconds and start organizing your investor
            documents today.
          </p>
          <a
            href="/signup"
            className="inline-block rounded-lg bg-blue-600 px-8 py-3 text-base font-medium text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Sign up now
          </a>
        </div>
      </section>
    </div>
  );
}
