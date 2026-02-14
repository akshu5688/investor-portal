export default function InfoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 font-sans dark:bg-black">
      <main className="w-full max-w-3xl rounded-3xl bg-white px-8 py-10 shadow-sm dark:bg-zinc-950">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
          About this project
        </p>
        <h1 className="mb-4 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Investor document hub in one secure place
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          This portal is designed to give you a simple, safe space to store all
          of your investor documents in one account and share them quickly when
          you need to. Instead of sending files one by one, you can upload them
          here once and reuse them whenever you apply or need to share with
          partners.
        </p>

        <section className="mb-6 space-y-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            How it works
          </h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
            <li>Create an account using your email and password.</li>
            <li>Log in and go to your dashboard.</li>
            <li>
              Use the upload area on the dashboard to add KYC documents,
              agreements, statements, and other files.
            </li>
            <li>
              Your files are stored in secure cloud storage powered by
              Supabase.
            </li>
            <li>
              When you need to send them, you can share them together from this
              single place instead of attaching each file manually.
            </li>
          </ol>
        </section>

        <section className="mb-6 space-y-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            What you should upload
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
            <li>Identity documents (passport, ID card, driving licence).</li>
            <li>Address proofs (utility bill, bank statement).</li>
            <li>Investment agreements and contracts.</li>
            <li>KYC / compliance forms and certificates.</li>
          </ul>
        </section>

        <section className="mb-6 space-y-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            What you should not upload
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
            <li>Plain text passwords or PIN codes.</li>
            <li>Credit / debit card numbers.</li>
            <li>One-time codes or sensitive security answers.</li>
            <li>Anything you would not normally store in a secure archive.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Next steps
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            To get started, create an account, log in, and go to your dashboard.
            You will see an upload area with a file selector and an upload
            button. Choose your documents, upload them once, and you will have
            them ready to share whenever you need.
          </p>
        </section>
      </main>
    </div>
  );
}

